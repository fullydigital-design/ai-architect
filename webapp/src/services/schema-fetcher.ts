/**
 * Schema Fetcher — fetches Python source from a ComfyUI custom node pack's
 * GitHub repo, sends it to the AI for parsing, and caches the resulting
 * structured node schemas in localStorage.
 *
 * Multi-strategy GitHub fetching (browser-safe):
 *   Strategy 1: GitHub Contents API (directory listing, CORS-friendly)
 *   Strategy 2: Direct raw.githubusercontent.com probing (no CORS, no rate limit)
 *   Strategy 3: GitHub Tree API (recursive, may hit CORS/rate limits)
 *
 * Supports optional GitHub Personal Access Token (PAT) for 5,000 req/hr
 * vs 60 req/hr unauthenticated.
 */

import type { CompactNodeSchema } from '../data/custom-node-schemas';
import type { ProviderSettings } from '../types/comfyui';
import { callAI, getMaxOutputTokens, getModelContextWindow } from './ai-provider';
import {
  SCHEMA_PARSER_SYSTEM_PROMPT,
  buildSchemaParserUserMessage,
} from '../data/ai-schema-parser-prompt';

// ---- Types ------------------------------------------------------------------

export interface LearnedPackSchemas {
  packId: string;
  packTitle: string;
  schemas: CompactNodeSchema[];
  learnedAt: number;
  sourceFiles: string[];
  nodeCount: number;
}

export interface LearnProgress {
  stage: 'fetching-tree' | 'fetching-files' | 'parsing' | 'done' | 'error';
  detail: string;
  filesFound?: number;
  filesFetched?: number;
}

// ---- Constants --------------------------------------------------------------

const CACHE_KEY = 'comfyui-architect-learned-schemas';
const MAX_FILES_TO_FETCH = 12;
const SOURCE_CHARS_PER_TOKEN = 4;

/**
 * Build GitHub API headers, optionally with a PAT for auth.
 * NOTE: We intentionally omit User-Agent — it's a forbidden header in browsers
 * and setting it can cause CORS preflight failures on some platforms.
 */
function ghHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    h['Authorization'] = `token ${token}`;
  }
  return h;
}

// Files that commonly contain node definitions (ordered by priority)
const NODE_FILE_PATTERNS = [
  /nodes[_.].*\.py$/i,
  /node[_.].*\.py$/i,
  /__init__\.py$/,
  /.*_nodes?\.py$/i,
  /.*nodes?_.*\.py$/i,
  /comfy_.*\.py$/i,
  /custom_.*\.py$/i,
];

// Files to always skip
const SKIP_PATTERNS = [
  /test/i,
  /example/i,
  /demo/i,
  /__pycache__/,
  /\.github/,
  /docs?\//i,
  /setup\.py$/,
  /requirements/,
  /install/i,
  /README/i,
  /LICENSE/i,
  /\.md$/,
  /\.txt$/,
  /\.json$/,
  /\.yaml$/,
  /\.yml$/,
  /\.toml$/,
  /\.cfg$/,
  /\.ini$/,
  /\.sh$/,
  /\.bat$/,
  /\.ps1$/,
];

// Well-known file paths to probe when APIs fail (covers most ComfyUI packs)
const COMMON_NODE_PATHS = [
  '__init__.py',
  'nodes.py',
  'node.py',
  'nodes/__init__.py',
  'nodes/nodes.py',
  'py/__init__.py',
  'py/nodes.py',
  'src/nodes.py',
  'src/__init__.py',
  'custom_nodes.py',
  'node_mappings.py',
  'modules/nodes.py',
  'modules/__init__.py',
  'impact_pack.py',
  'impact/nodes.py',
  'nodes_core.py',
  'nodes_main.py',
  'main_nodes.py',
];

// ---- GitHub API helpers -----------------------------------------------------

interface FileInfo {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

/**
 * Parse owner/repo from a GitHub URL.
 */
function parseGitHubUrl(reference: string): { owner: string; repo: string } | null {
  const match = reference.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}

/**
 * Detect the default branch of a repo.
 * Tries GitHub API first (most accurate), then probes raw.githubusercontent.com
 * with common filenames that ComfyUI packs almost always have.
 */
async function detectDefaultBranch(
  owner: string,
  repo: string,
  token?: string,
): Promise<string> {
  // Try the GitHub REST API (most accurate, tells us default_branch directly)
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: ghHeaders(token) },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.default_branch) return data.default_branch;
    }
  } catch {
    // API failed — fall back to probing
  }

  // Probe raw.githubusercontent.com with common branch names.
  // Check for files that virtually ALL repos have — __init__.py for ComfyUI packs,
  // then README.md, then .gitignore.
  const probeFiles = ['__init__.py', 'README.md', '.gitignore', 'requirements.txt', 'pyproject.toml'];
  for (const branch of ['main', 'master', 'dev']) {
    for (const file of probeFiles) {
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`,
          { method: 'HEAD' }, // HEAD is faster — we only need to know if it exists
        );
        if (res.ok) {
          console.log(`[Learn Nodes] Detected branch '${branch}' via ${file}`);
          return branch;
        }
      } catch {
        // continue
      }
    }
  }

  return 'main'; // last resort default
}

// ---- Strategy 1: GitHub Contents API ----------------------------------------

/**
 * List files in a directory using the GitHub Contents API.
 */
async function listContentsAPI(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token?: string,
): Promise<FileInfo[]> {
  const url = path
    ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`;

  const res = await fetch(url, { headers: ghHeaders(token) });
  if (!res.ok) throw new Error(`Contents API ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Not a directory');

  return data.map((item: any) => ({
    path: item.path,
    type: item.type === 'dir' ? 'dir' as const : 'file' as const,
    size: item.size,
  }));
}

/**
 * Recursively list all files using the Contents API.
 * Limits depth to avoid excessive API calls.
 */
async function fetchFileTreeViaContents(
  owner: string,
  repo: string,
  branch: string,
  token?: string,
): Promise<FileInfo[]> {
  const allFiles: FileInfo[] = [];
  const dirsToExplore: string[] = [''];
  let apiCalls = 0;
  const MAX_API_CALLS = token ? 15 : 8; // more calls if authenticated

  while (dirsToExplore.length > 0 && apiCalls < MAX_API_CALLS) {
    const dir = dirsToExplore.shift()!;
    apiCalls++;

    try {
      const items = await listContentsAPI(owner, repo, dir, branch, token);

      for (const item of items) {
        if (item.type === 'file') {
          allFiles.push(item);
        } else if (item.type === 'dir') {
          // Only explore directories that might contain nodes
          const dirName = item.path.split('/').pop() || '';
          const skipDir = /^(test|example|demo|docs?|\.github|__pycache__|web|js|css|assets|images?|models?|workflows?|scripts?)$/i.test(dirName);
          if (!skipDir) {
            dirsToExplore.push(item.path);
          }
        }
      }
    } catch {
      // Directory listing failed — skip
    }
  }

  return allFiles;
}

// ---- Strategy 2: Direct raw file probing ------------------------------------

/**
 * Probe well-known file paths directly via raw.githubusercontent.com.
 * No CORS issues, no rate limit. Works without any auth.
 */
async function probeCommonFiles(
  owner: string,
  repo: string,
  branch: string,
): Promise<Array<{ path: string; content: string }>> {
  const results: Array<{ path: string; content: string }> = [];

  // Fetch files in parallel batches of 4
  for (let i = 0; i < COMMON_NODE_PATHS.length; i += 4) {
    const batch = COMMON_NODE_PATHS.slice(i, i + 4);
    const promises = batch.map(async (filePath) => {
      try {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        const res = await fetch(url);
        if (res.ok) {
          const content = await res.text();
          // Only keep Python files that look like they contain node definitions
          if (content.includes('INPUT_TYPES') || content.includes('NODE_CLASS_MAPPINGS')) {
            return { path: filePath, content };
          }
        }
      } catch {
        // file doesn't exist
      }
      return null;
    });

    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      if (r) results.push(r);
    }

    // If we already found good files, stop probing
    if (results.length >= 3) break;
  }

  return results;
}

// ---- Strategy 3: GitHub Tree API --------------------------------------------

/**
 * Fetch the full file tree of a GitHub repo (recursive, single API call).
 */
async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string,
): Promise<FileInfo[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: ghHeaders(token) },
  );

  if (!res.ok) {
    throw new Error(`Tree API ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.tree || []).map((item: any) => ({
    path: item.path,
    type: item.type === 'tree' ? 'dir' as const : 'file' as const,
    size: item.size,
  }));
}

// ---- Import-following for probed files --------------------------------------

/**
 * Extract local import targets from Python source.
 * Handles patterns like:
 *   from .module import Foo
 *   from .subpkg.module import Foo
 *   from . import module
 *   import module  (relative, within the same package)
 *
 * Returns a deduplicated list of .py file paths to probe.
 */
function extractImportTargets(
  content: string,
  filePath: string,
): string[] {
  const targets = new Set<string>();
  const dirPrefix = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';

  // from .foo import ...  /  from .foo.bar import ...
  const fromDot = /^\s*from\s+\.([\w.]+)\s+import/gm;
  let m;
  while ((m = fromDot.exec(content)) !== null) {
    const parts = m[1].split('.');
    // "from .nodes import X" → "nodes.py" or "nodes/__init__.py"
    targets.add(dirPrefix + parts.join('/') + '.py');
    targets.add(dirPrefix + parts.join('/') + '/__init__.py');
  }

  // from . import foo, bar
  const fromDotImport = /^\s*from\s+\.\s+import\s+(.+)/gm;
  while ((m = fromDotImport.exec(content)) !== null) {
    const names = m[1].split(',').map(n => n.trim().split(/\s+/)[0]);
    for (const name of names) {
      if (name && /^\w+$/.test(name)) {
        targets.add(dirPrefix + name + '.py');
      }
    }
  }

  // Direct references in NODE_CLASS_MAPPINGS values can hint at module names
  // e.g., NODE_CLASS_MAPPINGS = { ... } followed by imports
  // Also catch: from pack_name.sub import ... (absolute within the package)
  const fromAbsolute = /^\s*from\s+([\w]+(?:\.[\w]+)*)\s+import/gm;
  while ((m = fromAbsolute.exec(content)) !== null) {
    const parts = m[1].split('.');
    // Only follow short paths (likely same package)
    if (parts.length <= 3) {
      targets.add(parts.join('/') + '.py');
      targets.add(parts.join('/') + '/__init__.py');
      // Also try just the last segment (common: "from impact.nodes import ..." → "nodes.py")
      if (parts.length >= 2) {
        targets.add(dirPrefix + parts.slice(1).join('/') + '.py');
      }
    }
  }

  return [...targets];
}

/**
 * Follow imports from already-fetched files to discover additional source files.
 * Probes the derived paths via raw.githubusercontent.com (no API cost).
 */
async function followImports(
  existingFiles: Array<{ path: string; content: string }>,
  owner: string,
  repo: string,
  branch: string,
): Promise<Array<{ path: string; content: string }>> {
  const existingPaths = new Set(existingFiles.map(f => f.path));
  const toProbe = new Set<string>();

  // Extract import targets from all existing files
  for (const file of existingFiles) {
    const targets = extractImportTargets(file.content, file.path);
    for (const t of targets) {
      if (!existingPaths.has(t)) {
        toProbe.add(t);
      }
    }
  }

  if (toProbe.size === 0) return [];

  console.log('[Learn Nodes] Following imports — probing', toProbe.size, 'additional paths:', [...toProbe]);

  const additionalFiles: Array<{ path: string; content: string }> = [];
  const probePaths = [...toProbe].slice(0, 20); // cap to avoid excessive probing

  // Probe in parallel batches of 4
  for (let i = 0; i < probePaths.length; i += 4) {
    const batch = probePaths.slice(i, i + 4);
    const results = await Promise.all(
      batch.map(async (filePath) => {
        try {
          const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
          const res = await fetch(url);
          if (res.ok) {
            const content = await res.text();
            // Check it looks like Python with node definitions
            if (content.includes('INPUT_TYPES') || content.includes('RETURN_TYPES') || content.includes('CATEGORY')) {
              return { path: filePath, content };
            }
          }
        } catch { /* skip */ }
        return null;
      })
    );
    for (const r of results) {
      if (r) additionalFiles.push(r);
    }
  }

  console.log('[Learn Nodes] Import-following found', additionalFiles.length, 'additional files:', additionalFiles.map(f => f.path));
  return additionalFiles;
}

// ---- Orchestrated file discovery --------------------------------------------

/**
 * Multi-strategy file discovery. Tries in order:
 *   1. Direct raw file probing (no CORS, no rate limit — most browser-reliable)
 *   2. GitHub Contents API (directory listing, needs CORS + may be rate-limited)
 *   3. GitHub Tree API (recursive, needs CORS + may be rate-limited)
 *
 * Returns discovered file paths (for 2 & 3) or already-fetched contents (for 1).
 */
async function discoverFiles(
  owner: string,
  repo: string,
  branch: string,
  token: string | undefined,
  report: (p: LearnProgress) => void,
): Promise<{ fileInfos?: FileInfo[]; prefetchedFiles?: Array<{ path: string; content: string }> }> {
  // Strategy 1: Direct probing (most reliable in browser — no CORS, no rate limit)
  report({ stage: 'fetching-tree', detail: `Probing common node file paths (no rate limit)...` });
  try {
    const files = await probeCommonFiles(owner, repo, branch);
    if (files.length > 0) {
      console.log(`[Learn Nodes] Strategy 1 (probe) found ${files.length} files`);
      return { prefetchedFiles: files };
    }
  } catch (e: any) {
    console.warn('Direct probing failed:', e.message);
  }

  // Strategy 2: Contents API (needs GitHub API, may be rate-limited without token)
  report({ stage: 'fetching-tree', detail: `Scanning repo via Contents API${token ? ' (authenticated)' : ''}...` });
  try {
    const files = await fetchFileTreeViaContents(owner, repo, branch, token);
    if (files.length > 0) {
      console.log(`[Learn Nodes] Strategy 2 (Contents API) found ${files.length} files`);
      return { fileInfos: files };
    }
  } catch (e: any) {
    console.warn('Contents API failed:', e.message);
  }

  // Strategy 3: Tree API (single call but needs auth for large repos)
  report({ stage: 'fetching-tree', detail: `Trying Tree API${token ? ' (authenticated)' : ''}...` });
  try {
    const files = await fetchRepoTree(owner, repo, branch, token);
    if (files.length > 0) {
      console.log(`[Learn Nodes] Strategy 3 (Tree API) found ${files.length} files`);
      return { fileInfos: files };
    }
  } catch (e: any) {
    console.warn('Tree API failed:', e.message);
  }

  throw new Error(
    `Could not find any files in ${owner}/${repo} (branch: ${branch}). ` +
    (token
      ? 'Check that the repo URL is correct and your GitHub token has access.'
      : 'The GitHub API may be rate-limited (60 req/hr without a token). Add a GitHub token in the Keys tab, or try again later.')
  );
}

// ---- Fetch raw file content -------------------------------------------------

/**
 * Fetch raw file content from GitHub.
 * raw.githubusercontent.com doesn't need auth and has no rate limit.
 */
async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not fetch ${filePath}: ${res.status}`);
  }
  return await res.text();
}

// ---- File identification heuristics -----------------------------------------

/**
 * Score a Python file based on how likely it is to contain node definitions.
 * Higher score = more likely.
 */
function scoreFile(path: string): number {
  if (!path.endsWith('.py')) return -1;

  for (const skip of SKIP_PATTERNS) {
    if (skip.test(path)) return -1;
  }

  let score = 0;

  for (let i = 0; i < NODE_FILE_PATTERNS.length; i++) {
    if (NODE_FILE_PATTERNS[i].test(path)) {
      score += 10 - i;
    }
  }

  const depth = path.split('/').length - 1;
  if (depth === 0) score += 5;
  else if (depth === 1) score += 3;
  else if (depth === 2) score += 1;

  if (path.endsWith('__init__.py')) score += 4;
  if (score === 0) score = 1;

  return score;
}

/**
 * From a file tree, identify the Python files most likely to contain
 * node definitions. Returns them sorted by relevance.
 */
function identifyNodeFiles(files: FileInfo[]): FileInfo[] {
  const scored = files
    .filter(item => item.type === 'file')
    .map(item => ({ item, score: scoreFile(item.path) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, MAX_FILES_TO_FETCH).map(s => s.item);
}

/**
 * Filter to only files that actually contain node-definition patterns.
 * Tiered: files with 2+ patterns first, then files with 1 pattern.
 */
function filterRelevantFiles(
  files: Array<{ path: string; content: string }>,
): Array<{ path: string; content: string }> {
  const patterns = [
    /INPUT_TYPES/,
    /NODE_CLASS_MAPPINGS/,
    /RETURN_TYPES/,
    /CATEGORY\s*=/,
    /FUNCTION\s*=/,
  ];

  const scored = files.map(f => {
    const matchCount = patterns.filter(p => p.test(f.content)).length;
    return { file: f, matchCount };
  });

  // Accept any file with at least 1 node-related pattern
  const relevant = scored
    .filter(s => s.matchCount >= 1)
    .sort((a, b) => b.matchCount - a.matchCount)
    .map(s => s.file);

  return relevant;
}

/**
 * Truncate source files to fit within token budget.
 * Prioritizes files with more node definitions.
 */
function truncateToTokenBudget(
  files: Array<{ path: string; content: string }>,
  modelId: string,
): Array<{ path: string; content: string }> {
  const contextWindow = getModelContextWindow(modelId);
  const outputBudget = getMaxOutputTokens(modelId);
  const inputBudgetTokens = Math.max(1, contextWindow - outputBudget);
  const maxSourceChars = inputBudgetTokens * SOURCE_CHARS_PER_TOKEN;

  const sorted = [...files].sort((a, b) => {
    const countA = (a.content.match(/INPUT_TYPES/g) || []).length;
    const countB = (b.content.match(/INPUT_TYPES/g) || []).length;
    return countB - countA;
  });

  const result: Array<{ path: string; content: string }> = [];
  let totalChars = 0;

  for (const file of sorted) {
    if (totalChars + file.content.length > maxSourceChars) {
      const remaining = maxSourceChars - totalChars;
      if (remaining > 2000) {
        result.push({ path: file.path, content: file.content.substring(0, remaining) + '\n# ... truncated ...' });
        totalChars += remaining;
      }
      break;
    }
    result.push(file);
    totalChars += file.content.length;
  }

  return result;
}

// ---- AI Parsing -------------------------------------------------------------

/**
 * Try to extract an array from a parsed JSON value.
 * Handles: direct array, or wrapper objects like {"nodes": [...]}, {"schemas": [...]}, etc.
 */
function extractArrayFromParsed(parsed: any): any[] | null {
  if (Array.isArray(parsed)) return parsed;

  // Handle wrapper objects — look for the first array-valued property
  if (parsed && typeof parsed === 'object') {
    // Check common wrapper keys first
    for (const key of ['nodes', 'schemas', 'node_schemas', 'results', 'data', 'definitions']) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
    // Fallback: first array property
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
  }

  return null;
}

/**
 * Parse the AI's response into an array of CompactNodeSchema.
 */
function parseAISchemaResponse(response: string): CompactNodeSchema[] {
  console.log('[Schema Parser] Raw AI response length:', response.length);
  console.log('[Schema Parser] Response preview:', response.substring(0, 500));

  const trimmed = response.trim();

  // Track the best valid parse — even if it yielded 0 schemas.
  // This lets us distinguish "AI returned []" from "response wasn't JSON at all".
  let parsedSuccessfully = false;

  // Strategy 1: Try direct JSON parse
  try {
    const parsed = JSON.parse(trimmed);
    const arr = extractArrayFromParsed(parsed);
    if (arr) {
      parsedSuccessfully = true;
      const schemas = validateSchemas(arr);
      console.log('[Schema Parser] Strategy 1 (direct JSON): parsed', arr.length, 'items →', schemas.length, 'valid schemas');
      if (schemas.length > 0) return schemas;
    }
  } catch { /* not direct JSON */ }

  // Strategy 2: Extract from markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockRegex = /```(?:json|jsonc)?\s*\n?([\s\S]*?)\n?\s*```/g;
  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const arr = extractArrayFromParsed(parsed);
      if (arr) {
        parsedSuccessfully = true;
        const schemas = validateSchemas(arr);
        console.log('[Schema Parser] Strategy 2 (code block): parsed', arr.length, 'items →', schemas.length, 'valid schemas');
        if (schemas.length > 0) return schemas;
      }
    } catch { /* invalid JSON in this block */ }
  }

  // Strategy 3: Find the outermost JSON array using bracket matching
  const startIdx = trimmed.indexOf('[');
  if (startIdx !== -1) {
    // Find the matching closing bracket
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < trimmed.length; i++) {
      if (trimmed[i] === '[') depth++;
      else if (trimmed[i] === ']') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (endIdx !== -1) {
      try {
        const parsed = JSON.parse(trimmed.substring(startIdx, endIdx + 1));
        if (Array.isArray(parsed)) {
          parsedSuccessfully = true;
          const schemas = validateSchemas(parsed);
          console.log('[Schema Parser] Strategy 3 (bracket match): parsed', parsed.length, 'items →', schemas.length, 'valid schemas');
          if (schemas.length > 0) return schemas;
        }
      } catch { /* no valid JSON array */ }
    }
  }

  // Strategy 4: Find a JSON object that wraps an array
  const objStart = trimmed.indexOf('{');
  if (objStart !== -1) {
    let depth = 0;
    let endIdx = -1;
    for (let i = objStart; i < trimmed.length; i++) {
      if (trimmed[i] === '{') depth++;
      else if (trimmed[i] === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (endIdx !== -1) {
      try {
        const parsed = JSON.parse(trimmed.substring(objStart, endIdx + 1));
        const arr = extractArrayFromParsed(parsed);
        if (arr) {
          parsedSuccessfully = true;
          const schemas = validateSchemas(arr);
          console.log('[Schema Parser] Strategy 4 (wrapper object): parsed', arr.length, 'items →', schemas.length, 'valid schemas');
          if (schemas.length > 0) return schemas;
        }
      } catch { /* no valid JSON object */ }
    }
  }

  // If we parsed valid JSON but got 0 schemas, return empty array.
  // The caller has a better diagnostic message for this case.
  if (parsedSuccessfully) {
    console.warn('[Schema Parser] Parsed valid JSON but 0 schemas passed validation.');
    return [];
  }

  // Truly failed to parse — the response wasn't valid JSON at all
  console.error('[Schema Parser] All parsing strategies failed. Full response:', response);
  throw new Error(
    `Could not parse AI response as node schemas. Response starts with: "${response.substring(0, 150)}..."`
  );
}

/**
 * Validate and clean up parsed schemas.
 * Lenient: only requires class_type. inputs/outputs default to empty arrays.
 */
function validateSchemas(raw: any[]): CompactNodeSchema[] {
  return raw
    .filter(item => {
      if (!item || typeof item !== 'object') return false;
      // Must have a class_type string
      if (typeof item.class_type !== 'string' || !item.class_type.trim()) return false;
      // inputs and outputs should be arrays or absent (we'll default to [])
      if (item.inputs !== undefined && !Array.isArray(item.inputs)) return false;
      if (item.outputs !== undefined && !Array.isArray(item.outputs)) return false;
      return true;
    })
    .map(item => ({
      class_type: item.class_type.trim(),
      display: item.display || item.display_name || item.class_type.trim(),
      category: item.category || 'unknown',
      inputs: (Array.isArray(item.inputs) ? item.inputs : []).map((inp: any) => ({
        name: inp.name || 'unnamed',
        type: inp.type || 'STRING',
        mode: (['w', 'c', 'cw'].includes(inp.mode) ? inp.mode : inferInputMode(inp.type || 'STRING')) as 'w' | 'c' | 'cw',
        ...(inp.required === false ? { required: false } : {}),
        ...(inp.default !== undefined ? { default: inp.default } : {}),
        ...(Array.isArray(inp.options) && inp.options.length > 0 ? { options: inp.options } : {}),
        ...(inp.min !== undefined ? { min: inp.min } : {}),
        ...(inp.max !== undefined ? { max: inp.max } : {}),
      })),
      outputs: (Array.isArray(item.outputs) ? item.outputs : []).map((out: any, idx: number) => ({
        name: out.name || `output_${idx}`,
        type: out.type || 'STRING',
        slot: typeof out.slot === 'number' ? out.slot : idx,
      })),
    }));
}

/**
 * Infer input mode from type if the AI didn't provide one.
 * Complex ComfyUI types are connections; basic types are widgets.
 */
function inferInputMode(type: string): 'w' | 'c' | 'cw' {
  const connectionTypes = new Set([
    'IMAGE', 'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT',
    'MASK', 'CONTROL_NET', 'CLIP_VISION', 'CLIP_VISION_OUTPUT',
    'STYLE_MODEL', 'GLIGEN', 'UPSCALE_MODEL', 'SIGMAS', 'NOISE',
    'SAMPLER', 'GUIDER', 'PHOTOMAKER', 'IPADAPTER', 'INSIGHTFACE',
    'BBOX_DETECTOR', 'SAM_MODEL', 'SEGS', 'AUDIO', 'VIDEO',
  ]);
  const upper = type.toUpperCase();
  if (connectionTypes.has(upper)) return 'c';
  if (['INT', 'FLOAT', 'STRING', 'BOOLEAN', 'COMBO'].includes(upper)) return 'w';
  // Unknown types are likely connections
  return upper === upper ? 'c' : 'w'; // ALL_CAPS = likely a connection type
}

// ---- Cache Layer ------------------------------------------------------------

interface SchemaCache {
  [packId: string]: LearnedPackSchemas;
}

function readSchemaCache(): SchemaCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt */ }
  return {};
}

function writeSchemaCache(cache: SchemaCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* full or disabled */ }
}

export function getLearnedSchemas(packId: string): LearnedPackSchemas | null {
  const cache = readSchemaCache();
  return cache[packId] || null;
}

export function getLearnedPackIds(): Set<string> {
  const cache = readSchemaCache();
  return new Set(Object.keys(cache));
}

export function getAllLearnedSchemas(): LearnedPackSchemas[] {
  const cache = readSchemaCache();
  return Object.values(cache);
}

export function clearLearnedSchemas(packId: string): void {
  const cache = readSchemaCache();
  delete cache[packId];
  writeSchemaCache(cache);
}

export function clearAllLearnedSchemas(): void {
  localStorage.removeItem(CACHE_KEY);
}

// ---- Main Public API --------------------------------------------------------

/**
 * Learn the node schemas for a custom node pack by:
 *   1. Fetching the Python source from GitHub (multi-strategy)
 *   2. Sending it to the AI for structured parsing
 *   3. Caching the result locally
 *
 * Uses `settings.githubToken` (if set) for authenticated GitHub API calls
 * (5,000 req/hr instead of 60 req/hr).
 */
export async function learnPackSchemas(
  packId: string,
  packTitle: string,
  reference: string,
  settings: ProviderSettings,
  onProgress?: (progress: LearnProgress) => void,
): Promise<LearnedPackSchemas> {
  const report = (p: LearnProgress) => onProgress?.(p);
  const ghToken = settings.githubToken?.trim() || undefined;

  // 1. Parse GitHub URL
  const repo = parseGitHubUrl(reference);
  if (!repo) {
    throw new Error(`Invalid GitHub URL: ${reference}`);
  }

  // 2. Detect default branch
  report({ stage: 'fetching-tree', detail: `Detecting default branch for ${repo.owner}/${repo.repo}...` });
  const branch = await detectDefaultBranch(repo.owner, repo.repo, ghToken);

  // 3. Discover files using multi-strategy approach
  const discovery = await discoverFiles(repo.owner, repo.repo, branch, ghToken, report);

  let fileContents: Array<{ path: string; content: string }>;

  if (discovery.prefetchedFiles) {
    // Strategy 2 already fetched the contents
    fileContents = discovery.prefetchedFiles;
    report({
      stage: 'fetching-files',
      detail: `Found ${fileContents.length} node files via direct probing`,
      filesFound: fileContents.length,
      filesFetched: fileContents.length,
    });
  } else if (discovery.fileInfos) {
    // Strategy 1 or 3 gave us file paths — now fetch contents
    const candidates = identifyNodeFiles(discovery.fileInfos);
    if (candidates.length === 0) {
      throw new Error('No Python files found in the repository');
    }

    report({
      stage: 'fetching-files',
      detail: `Found ${candidates.length} candidate files, fetching...`,
      filesFound: candidates.length,
      filesFetched: 0,
    });

    fileContents = [];
    for (let i = 0; i < candidates.length; i++) {
      try {
        const content = await fetchRawFile(repo.owner, repo.repo, branch, candidates[i].path);
        fileContents.push({ path: candidates[i].path, content });
        report({
          stage: 'fetching-files',
          detail: `Fetched ${candidates[i].path}`,
          filesFound: candidates.length,
          filesFetched: i + 1,
        });
      } catch {
        // Skip files we can't fetch
      }
    }
  } else {
    throw new Error('No files discovered from the repository');
  }

  if (fileContents.length === 0) {
    throw new Error('Could not fetch any Python files from the repository');
  }

  // 4. Follow imports to discover additional files
  report({ stage: 'fetching-files', detail: 'Following imports to find node implementation files...' });
  const additionalFiles = await followImports(fileContents, repo.owner, repo.repo, branch);
  if (additionalFiles.length > 0) {
    fileContents.push(...additionalFiles);
    report({
      stage: 'fetching-files',
      detail: `Import-following found ${additionalFiles.length} additional files`,
      filesFound: fileContents.length,
      filesFetched: fileContents.length,
    });
  }

  // 5. Filter to files that actually contain node definitions
  const relevantFiles = filterRelevantFiles(fileContents);
  console.log('[Learn Nodes] Total fetched files:', fileContents.length,
    '| Paths:', fileContents.map(f => f.path));
  console.log('[Learn Nodes] Relevant files (contain node patterns):',
    relevantFiles.length, '| Paths:', relevantFiles.map(f => f.path));

  if (relevantFiles.length === 0) {
    console.warn('[Learn Nodes] No files matched node-definition patterns. Falling back to init/__init__.py or first 3 files.');
    const initFile = fileContents.find(f => f.path.endsWith('__init__.py'));
    if (initFile) {
      relevantFiles.push(initFile);
    } else {
      relevantFiles.push(...fileContents.slice(0, 3));
    }
  }

  // 6. Truncate to token budget
  const truncated = truncateToTokenBudget(relevantFiles, settings.selectedModel);
  const totalChars = truncated.reduce((s, f) => s + f.content.length, 0);

  report({
    stage: 'parsing',
    detail: `Sending ${truncated.length} files to AI for parsing (~${Math.round(totalChars / 4)} tokens)...`,
  });

  console.log('[Learn Nodes] Sending to AI:', truncated.map(f => `${f.path} (${f.content.length} chars)`));

  // 7. Call AI to parse
  const userMessage = buildSchemaParserUserMessage(packTitle, truncated);

  let aiResponse: string;
  try {
    const aiResult = await callAI({
      settings,
      messages: [{ role: 'user', content: userMessage }],
      systemPromptOverride: SCHEMA_PARSER_SYSTEM_PROMPT,
    });
    aiResponse = aiResult.text;
  } catch (aiError: any) {
    // Provide a user-friendly error for network failures
    const msg = aiError?.message || String(aiError);
    if (msg === 'Failed to fetch' || aiError instanceof TypeError) {
      const provider = settings.selectedModel.startsWith('claude') ? 'Anthropic'
        : settings.selectedModel.startsWith('gpt') ? 'OpenAI'
        : settings.selectedModel.startsWith('gemini') ? 'Google'
        : 'your AI provider';
      throw new Error(
        `Network error calling ${provider} API. This usually means:\n` +
        `• The API endpoint is blocked by your browser, a VPN, or a firewall\n` +
        `• CORS is being blocked (try a different provider)\n` +
        `• The API key or model ID is invalid\n` +
        `Model: ${settings.selectedModel}`
      );
    }
    throw aiError; // re-throw other errors as-is
  }

  if (!aiResponse || !aiResponse.trim()) {
    throw new Error('AI returned an empty response. The model may not support this task or the API key may be invalid.');
  }

  // 8. Parse the AI response
  const schemas = parseAISchemaResponse(aiResponse);

  if (schemas.length === 0) {
    // Provide a diagnostic error with what the AI actually returned
    const preview = aiResponse.substring(0, 300).replace(/\n/g, ' ');
    const fileList = truncated.map(f => f.path).join(', ');
    console.error('[Learn Nodes] 0 valid schemas after parsing. AI response preview:', preview);
    console.error('[Learn Nodes] Files that were sent to AI:', fileList);
    throw new Error(
      `AI returned 0 node schemas from ${truncated.length} file(s): ${fileList}. ` +
      `The files may only contain imports/re-exports without actual INPUT_TYPES definitions, ` +
      `or the AI model struggled with the parsing task. Try a different/larger model or re-learn.`
    );
  }

  // 9. Cache the result
  const learned: LearnedPackSchemas = {
    packId,
    packTitle,
    schemas,
    learnedAt: Date.now(),
    sourceFiles: truncated.map(f => f.path),
    nodeCount: schemas.length,
  };

  const cache = readSchemaCache();
  cache[packId] = learned;
  writeSchemaCache(cache);

  report({
    stage: 'done',
    detail: `Learned ${schemas.length} node schemas from ${truncated.length} files`,
  });

  return learned;
}

export function estimateLearnCost(): string {
  return '~$0.01-0.05';
}

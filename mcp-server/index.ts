#!/usr/bin/env node
/**
 * ComfyUI Workflow Architect — MCP Server
 *
 * Exposes ComfyUI operations as MCP tools callable by any MCP-compatible AI client.
 *
 * Architecture:
 *   MCP Client  --stdio-->  This MCP Server  --HTTP-->  ComfyUI (localhost:8188)
 *                                              --HTTP-->  Architect App (localhost:5173) [optional]
 *
 * Setup:
 *   cd mcp-server && npm install && npm run build
 *   Configure .mcp.json in the project root
 *   Restart your MCP client
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { existsSync, promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Configuration ────────────────────────────────────────────────────────────

type PathConfig = Record<string, string>;

function loadPathConfig(): { config: PathConfig; loadedFrom: string | null } {
  const thisFile = fileURLToPath(import.meta.url);
  const configPaths = [
    path.resolve(path.dirname(thisFile), '..', 'comfyui-paths.config.json'),
    path.resolve(path.dirname(thisFile), '..', '..', 'comfyui-paths.config.json'),
    path.resolve(process.cwd(), '..', 'comfyui-paths.config.json'),
    path.resolve(process.cwd(), 'comfyui-paths.config.json'),
  ];
  const uniquePaths = Array.from(new Set(configPaths));

  for (const configPath of uniquePaths) {
    if (!existsSync(configPath)) {
      continue;
    }

    try {
      const raw = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const config: PathConfig = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
          config[key] = value;
        }
      }

      console.error(`[MCP] Loaded path config from ${configPath}`);
      return { config, loadedFrom: configPath };
    } catch (error) {
      console.error(`[MCP] Failed to parse ${configPath}:`, error);
    }
  }

  console.error('[MCP] No comfyui-paths.config.json found, using env vars only');
  return { config: {}, loadedFrom: null };
}

const { config: pathConfig, loadedFrom: pathConfigLoadedFrom } = loadPathConfig();

function getPath(envKey: string, configKey: string, fallback: string): string {
  const envValue = process.env[envKey];
  if (typeof envValue === 'string' && envValue.trim().length > 0) {
    return envValue;
  }

  const configValue = pathConfig[configKey];
  if (typeof configValue === 'string' && configValue.trim().length > 0) {
    return configValue;
  }

  return fallback;
}

const COMFY_BASE_URL = getPath('COMFY_BASE_URL', 'comfyui_api_url', process.env.COMFYUI_URL || 'http://127.0.0.1:8188');
const COMFYUI_URL = COMFY_BASE_URL;
const COMFY_ROOT = getPath('COMFY_ROOT', 'comfyui_root', 'C:\\_AI\\_test_fresh_all_AI\\ComfyUI');
const CUSTOM_NODES_DIR = getPath('CUSTOM_NODES_DIR', 'custom_nodes_dir', path.join(COMFY_ROOT, 'custom_nodes'));
const OUTPUT_DIR = getPath('OUTPUT_DIR', 'output_dir', path.join(COMFY_ROOT, 'output'));
const MODELS_DIR = getPath('MODELS_DIR', 'models_dir', 'C:\\_AI\\_test_fresh_all_AI\\models');
const PYTHON_EXE = getPath('PYTHON_EXE', 'python_exe', 'C:\\_AI\\_test_fresh_all_AI\\python_embed\\python.exe');
const WEBAPP_DIR = getPath('WEBAPP_DIR', 'webapp_dir', 'C:\\_AI\\fullydigital\\webapp');
const ARCHITECT_URL = process.env.ARCHITECT_URL || 'http://127.0.0.1:5173';
const TIMEOUT_MS = 15000;
const DEFAULT_CUSTOM_NODES_DIR = CUSTOM_NODES_DIR;

// ── Helper: Fetch with timeout ───────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithCustomTimeout(
  url: string,
  timeoutMs: number,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// ── Helper: JSON response ────────────────────────────────────────────────────

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function jsonResult(data: unknown) {
  return textResult(JSON.stringify(data, null, 2));
}

function errorResult(msg: string) {
  return textResult(`ERROR: ${msg}`);
}

// ── Known connection types (from comfyui-backend.ts) ─────────────────────────

const CONNECTION_TYPES = new Set([
  'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE', 'MASK',
  'CONTROL_NET', 'CLIP_VISION', 'CLIP_VISION_OUTPUT', 'STYLE_MODEL',
  'SIGMAS', 'SAMPLER', 'NOISE', 'GUIDER', 'AUDIO', 'WEBCAM',
]);

// ── Model architecture detection (from comfyui-backend.ts) ───────────────────

const ARCH_PATTERNS: [RegExp, string][] = [
  [/flux[_-]?1.*schnell/i, 'FLUX Schnell'],
  [/flux/i, 'FLUX'],
  [/sd[_-]?3/i, 'SD 3'],
  [/sdxl.*turbo|turbo.*sdxl/i, 'SDXL Turbo'],
  [/pony/i, 'Pony'],
  [/sdxl|sd[_-]?xl/i, 'SDXL'],
  [/sd[_-]?1[._-]?5|v1[._-]?5/i, 'SD 1.5'],
  [/pixart/i, 'PixArt'],
  [/kolors/i, 'Kolors'],
  [/hunyuan/i, 'Hunyuan'],
];

function detectArch(filename: string): string {
  for (const [re, arch] of ARCH_PATTERNS) {
    if (re.test(filename)) return arch;
  }
  return 'Unknown';
}

// ── Model loader map (from comfyui-backend.ts) ──────────────────────────────

const MODEL_LOADERS: Record<string, { input: string; category: string }[]> = {
  CheckpointLoaderSimple: [{ input: 'ckpt_name', category: 'checkpoints' }],
  LoraLoader:             [{ input: 'lora_name', category: 'loras' }],
  VAELoader:              [{ input: 'vae_name', category: 'vaes' }],
  ControlNetLoader:       [{ input: 'control_net_name', category: 'controlnets' }],
  CLIPLoader:             [{ input: 'clip_name', category: 'clip' }],
  UpscaleModelLoader:     [{ input: 'model_name', category: 'upscale_models' }],
  UNETLoader:             [{ input: 'unet_name', category: 'checkpoints' }],
};

const BUILT_IN_NODE_TYPES = new Set([
  'KSampler', 'KSamplerAdvanced', 'CheckpointLoaderSimple', 'CLIPTextEncode',
  'CLIPSetLastLayer', 'VAEDecode', 'VAEEncode', 'VAELoader', 'EmptyLatentImage',
  'LatentUpscale', 'LatentUpscaleBy', 'SaveImage', 'PreviewImage', 'LoadImage',
  'LoadImageMask', 'ImageScale', 'ImageScaleBy', 'LoraLoader', 'ControlNetLoader',
  'ControlNetApply', 'ControlNetApplyAdvanced', 'UNETLoader', 'CLIPLoader',
  'DualCLIPLoader', 'FreeU', 'FreeU_V2', 'UpscaleModelLoader', 'Note',
  'PrimitiveNode', 'Reroute', 'RepeatLatentBatch', 'LatentFromBatch',
  'LatentComposite', 'ImagePadForOutpaint', 'InpaintModelConditioning',
  'SetLatentNoiseMask', 'ImageUpscaleWithModel', 'ConditioningCombine',
  'ConditioningSetArea', 'ConditioningSetMask',
]);

const SUGGESTED_PACKS: Record<string, string> = {
  'IPAdapter': 'ComfyUI_IPAdapter_plus',
  'IPAdapterApply': 'ComfyUI_IPAdapter_plus',
  'AIO_Preprocessor': 'comfyui_controlnet_aux',
  'DepthAnythingV2Preprocessor': 'comfyui_controlnet_aux',
  'OpenposePreprocessor': 'comfyui_controlnet_aux',
  'SAMLoader': 'comfyui-segment-anything',
  'UltimateSDUpscale': 'ComfyUI_UltimateSDUpscale',
  'DetailerForEach': 'ComfyUI-Impact-Pack',
  'FaceDetailer': 'ComfyUI-Impact-Pack',
  'ReActorFaceSwap': 'comfyui-reactor-node',
  'FluxGuidance': 'x-flux-comfyui',
  'easy kSampler': 'ComfyUI-Easy-Use',
  'easy fullLoader': 'ComfyUI-Easy-Use',
  'Efficient Loader': 'efficiency-nodes-comfyui',
  'WAS_Image_Filters': 'was-node-suite-comfyui',
};

// ── Cache for /object_info (fetched once, reused) ────────────────────────────

let objectInfoCache: Record<string, any> | null = null;
let objectInfoTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getObjectInfo(forceRefresh = false): Promise<Record<string, any>> {
  if (objectInfoCache && !forceRefresh && (Date.now() - objectInfoTimestamp) < CACHE_TTL_MS) {
    return objectInfoCache;
  }
  const res = await fetchWithTimeout(`${COMFYUI_URL}/object_info`);
  if (!res.ok) throw new Error(`/object_info returned ${res.status}`);
  objectInfoCache = await res.json();
  objectInfoTimestamp = Date.now();
  return objectInfoCache!;
}

// ── Parse a single node's schema from /object_info ──────────────────────────

function parseNodeSchema(classType: string, raw: any) {
  const inputs: any[] = [];

  const parseInputGroup = (spec: Record<string, any> | undefined, required: boolean) => {
    if (!spec) return;
    for (const [name, config] of Object.entries(spec)) {
      if (!Array.isArray(config) || config.length === 0) continue;
      const first = config[0];
      const meta = config[1] || {};

      if (Array.isArray(first)) {
        inputs.push({ name, type: 'COMBO', required, options: first.slice(0, 30), default: meta.default });
      } else if (typeof first === 'string') {
        const isConn = CONNECTION_TYPES.has(first.toUpperCase());
        inputs.push({
          name, type: first, required, isConnection: isConn,
          ...(meta.default !== undefined && { default: meta.default }),
          ...(meta.min !== undefined && { min: meta.min }),
          ...(meta.max !== undefined && { max: meta.max }),
          ...(meta.tooltip && { tooltip: meta.tooltip }),
        });
      }
    }
  };

  parseInputGroup(raw.input?.required, true);
  parseInputGroup(raw.input?.optional, false);

  const outputs = (raw.output || []).map((type: string, idx: number) => ({
    name: raw.output_name?.[idx] || type,
    type,
    slot: idx,
  }));

  return {
    class_type: classType,
    display_name: raw.display_name || classType,
    category: raw.category || 'uncategorized',
    description: raw.description || '',
    output_node: raw.output_node || false,
    inputs,
    outputs,
  };
}

interface InstalledNodePack {
  folderName: string;
  displayName: string;
  nodeClasses: string[];
  description: string;
  version?: string;
  installedAt: string;
  hasRequirements: boolean;
  repoUrl?: string;
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractNodeClassesFromNodeListJson(raw: unknown): string[] {
  const out = new Set<string>();
  const addMaybe = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      out.add(value.trim());
    }
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        addMaybe(item);
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        addMaybe(obj.class_type);
        addMaybe(obj.type);
        addMaybe(obj.name);
      }
    }
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const maybeArrays = [obj.nodes, obj.node_list, obj.classes];
    for (const maybe of maybeArrays) {
      if (Array.isArray(maybe)) {
        for (const item of maybe) {
          if (typeof item === 'string') {
            addMaybe(item);
          } else if (item && typeof item === 'object') {
            const value = item as Record<string, unknown>;
            addMaybe(value.class_type);
            addMaybe(value.type);
            addMaybe(value.name);
          }
        }
      }
    }
    if (out.size === 0) {
      for (const key of Object.keys(obj)) {
        if (key !== 'nodes' && key !== 'node_list' && key !== 'classes') {
          addMaybe(key);
        }
      }
    }
  }

  return Array.from(out);
}

function extractStringDictKeys(body: string, result: Set<string>): void {
  const keyRegex = /['"]([^'"]+)['"]\s*:/g;
  let m: RegExpExecArray | null = null;
  while ((m = keyRegex.exec(body)) !== null) {
    if (m[1].trim()) result.add(m[1].trim());
  }
}

function extractBracedBlock(content: string, startIndex: number): string {
  let depth = 0;
  let i = startIndex;
  while (i < content.length) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return content.slice(startIndex, i + 1);
    }
    i++;
  }
  return '';
}

function extractNodeClassesFromPyContent(content: string): string[] {
  const result = new Set<string>();

  // Pattern 1: *_CLASS_MAPPINGS = { ... } or NODE_CLASS_MAPPINGS = { ... }
  // Uses brace-counting to handle nested structures (fixes Crystools, essentials submodules)
  const mappingDictRegex = /\b\w*(?:CLASS|NODE)_MAPPINGS\s*=\s*\{/g;
  let m1: RegExpExecArray | null = null;
  while ((m1 = mappingDictRegex.exec(content)) !== null) {
    const braceStart = content.indexOf('{', m1.index + m1[0].length - 1);
    if (braceStart !== -1) {
      const block = extractBracedBlock(content, braceStart);
      extractStringDictKeys(block, result);
    }
  }

  // Pattern 2: NODE_CLASS_MAPPINGS["ClassName"] = ...
  const subscriptRegex = /(?:NODE_CLASS_MAPPINGS|NODE_CONFIG)\s*\[\s*['"]([^'"]+)['"]\s*\]/g;
  let m2: RegExpExecArray | null = null;
  while ((m2 = subscriptRegex.exec(content)) !== null) {
    if (m2[1].trim()) result.add(m2[1].trim());
  }

  // Pattern 3: NODE_CLASS_MAPPINGS.update({"ClassName": ...})
  const updateRegex = /\w+(?:_CLASS_MAPPINGS|_NODE_MAPPINGS)\.update\s*\(\s*\{/g;
  let m3: RegExpExecArray | null = null;
  while ((m3 = updateRegex.exec(content)) !== null) {
    const braceStart = content.indexOf('{', m3.index + m3[0].length - 1);
    if (braceStart !== -1) {
      const block = extractBracedBlock(content, braceStart);
      extractStringDictKeys(block, result);
    }
  }

  // Pattern 4: NODE_CONFIG = { "NodeName": { ... }, ... } (KJNodes-style)
  const nodeConfigRegex = /\bNODE_CONFIG\s*=\s*\{/g;
  let m4: RegExpExecArray | null = null;
  while ((m4 = nodeConfigRegex.exec(content)) !== null) {
    const braceStart = content.indexOf('{', m4.index + m4[0].length - 1);
    if (braceStart !== -1) {
      const block = extractBracedBlock(content, braceStart);
      extractStringDictKeys(block, result);
    }
  }

  return Array.from(result);
}

// Pattern 5: NAME = "string" class attributes (indented, string literal)
function extractNameAttributes(content: string): string[] {
  const result = new Set<string>();
  const nameAttrRegex = /^\s{2,8}NAME\s*=\s*['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null = null;
  while ((m = nameAttrRegex.exec(content)) !== null) {
    if (m[1].trim()) result.add(m[1].trim());
  }
  return Array.from(result);
}

// Pattern 6: enum _NAME values (Crystools-style)
// e.g. CBOOLEAN_NAME = 'Primitive boolean [Crystools]'
function extractEnumNameValues(content: string): string[] {
  const result = new Set<string>();
  // Only match keys ending in _NAME (not _DESC, _TYPE, etc.)
  const enumNameRegex = /^\s*\w+_NAME\s*=\s*['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null = null;
  while ((m = enumNameRegex.exec(content)) !== null) {
    if (m[1].trim()) result.add(m[1].trim());
  }
  return Array.from(result);
}

// Pattern 7: NAME = get_name("X") (rgthree-style) - requires namespace string
function extractGetNameCalls(content: string, namespace: string): string[] {
  const result = new Set<string>();
  // Matches: NAME = get_name("X"), NODE_NAME = get_name('X'), _NODE_NAME = get_name("X")
  const getNameRegex = /\bNAME\s*=\s*get_name\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null = null;
  while ((m = getNameRegex.exec(content)) !== null) {
    result.add(`${m[1].trim()} (${namespace})`);
  }
  return Array.from(result);
}

function extractNodeClassesFromInitPy(content: string): string[] {
  return extractNodeClassesFromPyContent(content);
}

async function extractNodeClassesFromSubmodules(packPath: string): Promise<string[]> {
  const result = new Set<string>();

  // Detect get_name namespace (rgthree-style): look for NAMESPACE = '...' in constants files
  let getNameNamespace = '';
  for (const candidate of ['constants.py', 'py/constants.py', 'nodes/constants.py']) {
    const content = await safeReadFile(path.join(packPath, candidate));
    if (content) {
      const nsMatch = content.match(/^NAMESPACE\s*=\s*['"]([^'"]+)['"]/m);
      if (nsMatch) { getNameNamespace = nsMatch[1]; break; }
    }
  }

  async function scanDir(dir: string, depth: number): Promise<void> {
    if (depth > 3) return;
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === '__pycache__' || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('.py') && entry.name !== '__init__.py') {
        const content = await safeReadFile(fullPath);
        if (!content) continue;

        // Standard: *_CLASS_MAPPINGS or NODE_CONFIG
        if (content.includes('_CLASS_MAPPINGS') || content.includes('NODE_CONFIG')) {
          for (const cls of extractNodeClassesFromPyContent(content)) result.add(cls);
        }

        // rgthree-style: NAME = get_name("X") with known namespace
        if (getNameNamespace && content.includes('get_name(')) {
          for (const cls of extractGetNameCalls(content, getNameNamespace)) result.add(cls);
        }

        // Crystools-style: enum _NAME = "value" entries
        if (content.includes('_NAME') && content.includes('Enum')) {
          for (const cls of extractEnumNameValues(content)) result.add(cls);
        }

        // String literal NAME = "..." class attributes
        if (content.includes('NAME')) {
          for (const cls of extractNameAttributes(content)) result.add(cls);
        }
      }
    }
  }

  await scanDir(packPath, 0);
  return Array.from(result);
}

function extractReadmeDescription(content: string): string {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('![')) continue;
    return trimmed;
  }
  return '';
}

function extractRepoUrl(content: string): string | undefined {
  const match = content.match(/https?:\/\/github\.com\/[^\s)"]+/i);
  return match?.[0];
}

function extractVersionFromPyproject(content: string): string | undefined {
  const match = content.match(/^\s*version\s*=\s*["']([^"']+)["']/m);
  return match?.[1];
}

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function scanInstalledNodePacks(customNodesDir: string): Promise<InstalledNodePack[]> {
  const entries = await fs.readdir(customNodesDir, { withFileTypes: true });
  const packs: InstalledNodePack[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === '__pycache__') continue;
    if (entry.name.startsWith('..')) continue;

    const folderName = entry.name;
    const packPath = path.join(customNodesDir, folderName);
    const displayName = titleCase(folderName);

    let nodeClasses: string[] = [];
    const nodeListRaw = await safeReadFile(path.join(packPath, 'node_list.json'));
    if (nodeListRaw) {
      try {
        nodeClasses = extractNodeClassesFromNodeListJson(JSON.parse(nodeListRaw));
      } catch {
        nodeClasses = [];
      }
    }

    if (nodeClasses.length === 0) {
      const initContent = await safeReadFile(path.join(packPath, '__init__.py'));
      if (initContent) {
        nodeClasses = extractNodeClassesFromInitPy(initContent);
      }
    }

    // Fallback: recursively scan all .py submodules for dynamic registrations
    if (nodeClasses.length === 0) {
      nodeClasses = await extractNodeClassesFromSubmodules(packPath);
    }

    const files = await fs.readdir(packPath).catch(() => [] as string[]);
    const readmeFile = files.find((f) => /^readme(\..+)?$/i.test(f));
    const readmeContent = readmeFile ? await safeReadFile(path.join(packPath, readmeFile)) : null;
    const pyprojectContent = await safeReadFile(path.join(packPath, 'pyproject.toml'));
    const stats = await fs.stat(packPath);

    const hasRequirements = files.some((f) => /^requirements.*\.txt$/i.test(f));
    const installedAt = (stats.birthtime ?? stats.ctime).toISOString();

    const pack: InstalledNodePack = {
      folderName,
      displayName,
      nodeClasses: Array.from(new Set(nodeClasses)).sort((a, b) => a.localeCompare(b)),
      description: readmeContent ? extractReadmeDescription(readmeContent) : '',
      installedAt,
      hasRequirements,
    };

    const version = pyprojectContent ? extractVersionFromPyproject(pyprojectContent) : undefined;
    if (version) {
      pack.version = version;
    }

    const repoUrl = readmeContent ? extractRepoUrl(readmeContent) : undefined;
    if (repoUrl) {
      pack.repoUrl = repoUrl;
    }

    packs.push(pack);
  }

  return packs.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function extractWorkflowNodeTypes(workflow: unknown): string[] {
  const out = new Set<string>();
  if (!workflow || typeof workflow !== 'object') {
    return [];
  }

  const asObject = workflow as Record<string, unknown>;
  if (Array.isArray(asObject.nodes)) {
    for (const node of asObject.nodes) {
      if (node && typeof node === 'object') {
        const type = (node as Record<string, unknown>).type;
        if (typeof type === 'string' && type.trim()) {
          out.add(type.trim());
        }
      }
    }
    return Array.from(out);
  }

  for (const value of Object.values(asObject)) {
    if (value && typeof value === 'object') {
      const classType = (value as Record<string, unknown>).class_type;
      if (typeof classType === 'string' && classType.trim()) {
        out.add(classType.trim());
      }
    }
  }

  return Array.from(out);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MCP Server Setup
// ═══════════════════════════════════════════════════════════════════════════════

const server = new McpServer({
  name: 'comfyui-architect',
  version: '1.0.0',
});

// ── Tool: get_comfyui_status ─────────────────────────────────────────────────

server.tool(
  'get_comfyui_status',
  'Get ComfyUI system status: GPU info, version, queue length, running status',
  {},
  async () => {
    try {
      const [statsRes, queueRes] = await Promise.all([
        fetchWithTimeout(`${COMFYUI_URL}/system_stats`),
        fetchWithTimeout(`${COMFYUI_URL}/queue`),
      ]);

      const stats = statsRes.ok ? await statsRes.json() : null;
      const queue = queueRes.ok ? await queueRes.json() : null;

      const gpu = stats?.devices?.[0];
      const result: any = {
        connected: true,
        comfyui_url: COMFYUI_URL,
      };

      if (stats?.system) {
        result.version = stats.system.comfyui_version || stats.system.version;
        result.python = stats.system.python_version;
      }
      if (gpu) {
        result.gpu = gpu.name;
        result.vram_total_gb = gpu.vram_total ? (gpu.vram_total / 1e9).toFixed(1) : undefined;
        result.vram_free_gb = gpu.vram_free ? (gpu.vram_free / 1e9).toFixed(1) : undefined;
      }
      if (queue) {
        result.queue_pending = queue.queue_pending?.length ?? 0;
        result.queue_running = queue.queue_running?.length ?? 0;
      }

      return jsonResult(result);
    } catch (err: any) {
      return errorResult(`Cannot reach ComfyUI at ${COMFYUI_URL}: ${err.message}`);
    }
  },
);

// ── Tool: get_node_types ─────────────────────────────────────────────────────

server.tool(
  'get_node_types',
  'Search/list available ComfyUI node types. Returns class names grouped by category. Use query to filter.',
  {
    query: z.string().optional().describe('Filter nodes by name/category (case-insensitive). Leave empty to get all categories.'),
    limit: z.number().optional().default(50).describe('Max results to return (default 50)'),
  },
  async ({ query, limit }) => {
    try {
      const info = await getObjectInfo();
      const entries = Object.entries(info);
      const maxResults = limit ?? 50;

      if (!query) {
        // Return category summary
        const cats: Record<string, string[]> = {};
        for (const [name, data] of entries) {
          const cat = (data as any).category?.split('/')[0] || 'uncategorized';
          if (!cats[cat]) cats[cat] = [];
          cats[cat].push(name);
        }
        const summary = Object.entries(cats)
          .sort(([, a], [, b]) => b.length - a.length)
          .map(([cat, nodes]) => `${cat} (${nodes.length}): ${nodes.slice(0, 8).join(', ')}${nodes.length > 8 ? ` ...+${nodes.length - 8}` : ''}`);
        return textResult(`${entries.length} total node types\n\n${summary.join('\n')}`);
      }

      // Filter by query
      const q = query.toLowerCase();
      const matches = entries.filter(([name, data]) => {
        const d = data as any;
        return name.toLowerCase().includes(q)
          || (d.display_name || '').toLowerCase().includes(q)
          || (d.category || '').toLowerCase().includes(q)
          || (d.description || '').toLowerCase().includes(q);
      }).slice(0, maxResults);

      if (matches.length === 0) {
        return textResult(`No nodes matching "${query}". Try a broader search.`);
      }

      const lines = matches.map(([name, data]) => {
        const d = data as any;
        const display = d.display_name !== name ? ` ("${d.display_name}")` : '';
        return `${name}${display} — ${d.category || 'uncategorized'}`;
      });
      return textResult(`${matches.length} node(s) matching "${query}":\n\n${lines.join('\n')}`);
    } catch (err: any) {
      return errorResult(`Failed to fetch node types: ${err.message}`);
    }
  },
);

// ── Tool: get_node_info ──────────────────────────────────────────────────────

server.tool(
  'get_node_info',
  'Get detailed schema for a specific ComfyUI node type: all inputs (with types, defaults, options), outputs, and metadata.',
  {
    class_type: z.string().describe('The node class type name (e.g. "KSampler", "CheckpointLoaderSimple")'),
  },
  async ({ class_type }) => {
    try {
      const info = await getObjectInfo();
      const raw = info[class_type];
      if (!raw) {
        // Try case-insensitive search
        const match = Object.keys(info).find(k => k.toLowerCase() === class_type.toLowerCase());
        if (match) {
          return jsonResult(parseNodeSchema(match, info[match]));
        }
        return errorResult(`Node type "${class_type}" not found. Use get_node_types to search.`);
      }
      return jsonResult(parseNodeSchema(class_type, raw));
    } catch (err: any) {
      return errorResult(`Failed to get node info: ${err.message}`);
    }
  },
);

// ── Tool: get_installed_models ───────────────────────────────────────────────

server.tool(
  'get_installed_models',
  'List all models installed on the ComfyUI instance: checkpoints, LoRAs, VAEs, ControlNets, etc. with architecture detection.',
  {
    category: z.string().optional().describe('Filter by category: checkpoints, loras, vaes, controlnets, clip, upscale_models'),
  },
  async ({ category }) => {
    try {
      const info = await getObjectInfo();
      const models: Record<string, { files: string[]; architectures: Record<string, string> }> = {};

      for (const [classType, raw] of Object.entries(info)) {
        const loaders = MODEL_LOADERS[classType];
        if (!loaders) continue;

        for (const loader of loaders) {
          const inputSpec = (raw as any).input?.required?.[loader.input];
          if (Array.isArray(inputSpec) && Array.isArray(inputSpec[0])) {
            const files = inputSpec[0] as string[];
            if (!models[loader.category]) {
              models[loader.category] = { files: [], architectures: {} };
            }
            for (const f of files) {
              if (!models[loader.category].files.includes(f)) {
                models[loader.category].files.push(f);
                if (loader.category === 'checkpoints' || loader.category === 'loras') {
                  models[loader.category].architectures[f] = detectArch(f);
                }
              }
            }
          }
        }
      }

      if (category) {
        const cat = models[category];
        if (!cat) return textResult(`No models found in category "${category}". Available: ${Object.keys(models).join(', ')}`);
        const lines = cat.files.map(f => {
          const arch = cat.architectures[f];
          return arch && arch !== 'Unknown' ? `${f}  [${arch}]` : f;
        });
        return textResult(`${category} (${cat.files.length}):\n${lines.join('\n')}`);
      }

      // Return summary
      const summary = Object.entries(models).map(([cat, data]) => {
        const sample = data.files.slice(0, 5).join(', ');
        const more = data.files.length > 5 ? ` ...+${data.files.length - 5}` : '';
        return `${cat} (${data.files.length}): ${sample}${more}`;
      });
      return textResult(`Installed models:\n\n${summary.join('\n')}`);
    } catch (err: any) {
      return errorResult(`Failed to get models: ${err.message}`);
    }
  },
);

// ── Tool: validate_workflow ──────────────────────────────────────────────────

server.tool(
  'validate_workflow',
  'Validate workflow node types against built-in ComfyUI and installed custom nodes.',
  {
    workflow: z.any().describe('ComfyUI workflow object in API format or App format'),
    customNodesDir: z.string().optional().default(DEFAULT_CUSTOM_NODES_DIR),
  },
  async ({ workflow, customNodesDir }) => {
    try {
      const nodeTypes = extractWorkflowNodeTypes(workflow).sort((a, b) => a.localeCompare(b));
      const packs = await scanInstalledNodePacks(customNodesDir ?? DEFAULT_CUSTOM_NODES_DIR);
      const installedMap = new Map<string, string>();

      for (const pack of packs) {
        for (const nodeClass of pack.nodeClasses) {
          if (!installedMap.has(nodeClass)) {
            installedMap.set(nodeClass, pack.folderName);
          }
        }
      }

      const results = nodeTypes.map((nodeType) => {
        if (BUILT_IN_NODE_TYPES.has(nodeType)) {
          return { nodeType, status: 'built-in' as const };
        }

        const providedBy = installedMap.get(nodeType);
        if (providedBy) {
          return { nodeType, status: 'installed' as const, providedBy };
        }

        const suggestedPack = SUGGESTED_PACKS[nodeType];
        return {
          nodeType,
          status: 'missing' as const,
          ...(suggestedPack ? { suggestedPack } : {}),
        };
      });

      const missingNodes = results.filter((result) => result.status === 'missing').length;
      const validNodes = results.length - missingNodes;

      return jsonResult({
        totalNodes: nodeTypes.length,
        validNodes,
        missingNodes,
        installedPackCount: packs.length,
        scannedAt: new Date().toISOString(),
        results,
      });
    } catch (err: any) {
      return errorResult(`Validation failed: ${err?.message || 'Unknown error'}`);
    }
  },
);

// Tool: get_comfyui_history

server.tool(
  'get_comfyui_history',
  'Fetch ComfyUI history entries sorted by newest first.',
  {
    maxItems: z.number().optional().default(50),
    comfyApiBase: z.string().optional().default(COMFY_BASE_URL),
  },
  async ({ maxItems, comfyApiBase }) => {
    try {
      const base = (comfyApiBase ?? COMFY_BASE_URL).replace(/\/+$/, '');
      const res = await fetchWithTimeout(`${base}/history`);
      if (!res.ok) {
        return jsonResult({ error: 'ComfyUI offline', entries: [] });
      }

      const raw = await res.json() as Record<string, any>;
      const entries = Object.entries(raw)
        .map(([promptId, entry]) => {
          const outputs: Array<{ filename: string; subfolder: string; type: string }> = [];
          for (const nodeOut of Object.values((entry?.outputs ?? {}) as Record<string, any>)) {
            const images = Array.isArray(nodeOut?.images) ? nodeOut.images : [];
            for (const image of images) {
              outputs.push({
                filename: String(image?.filename ?? ''),
                subfolder: String(image?.subfolder ?? ''),
                type: String(image?.type ?? 'output'),
              });
            }
          }

          const statusRaw = entry?.status?.status_str;
          const status = statusRaw === 'success' || statusRaw === 'error' ? statusRaw : 'unknown';

          let workflowSnapshot: Record<string, unknown> | undefined;
          if (Array.isArray(entry?.prompt) && entry.prompt[2] && typeof entry.prompt[2] === 'object') {
            workflowSnapshot = entry.prompt[2] as Record<string, unknown>;
          }

          return {
            promptId,
            number: typeof entry?.number === 'number' ? entry.number : 0,
            status,
            outputs,
            ...(workflowSnapshot ? { workflowSnapshot } : {}),
          };
        })
        .sort((a, b) => b.number - a.number)
        .slice(0, maxItems ?? 50);

      return jsonResult(entries);
    } catch {
      return jsonResult({ error: 'ComfyUI offline', entries: [] });
    }
  },
);

server.tool(
  'check_paths',
  'Verify all configured ComfyUI paths exist and API is reachable.',
  {},
  async () => {
    const checks: string[] = [];
    const pathChecks: Record<string, string> = {
      'ComfyUI Root': COMFY_ROOT,
      'Custom Nodes': CUSTOM_NODES_DIR || path.join(COMFY_ROOT, 'custom_nodes'),
      'Models': MODELS_DIR || path.join(COMFY_ROOT, 'models'),
      'Output': OUTPUT_DIR || path.join(COMFY_ROOT, 'output'),
      'Python': PYTHON_EXE,
      'Webapp': WEBAPP_DIR,
    };

    for (const [label, targetPath] of Object.entries(pathChecks)) {
      if (!targetPath) {
        checks.push(`MISSING ${label}: (empty)`);
        continue;
      }
      const found = existsSync(targetPath);
      checks.push(`${found ? 'OK' : 'MISSING'} ${label}: ${targetPath}`);
    }

    try {
      const response = await fetchWithTimeout(`${COMFY_BASE_URL}/system_stats`);
      if (response.ok) {
        const data = await response.json();
        const gpu = data?.devices?.[0]?.name || 'GPU detected';
        checks.push(`OK API: ${COMFY_BASE_URL} (${gpu})`);
      } else {
        checks.push(`FAIL API: ${COMFY_BASE_URL} (HTTP ${response.status})`);
      }
    } catch (error: any) {
      checks.push(`FAIL API: ${COMFY_BASE_URL} (${error?.message || 'Unknown error'})`);
    }

    checks.push('');
    checks.push(`Config file: ${pathConfigLoadedFrom ?? 'not found (env vars only)'}`);
    checks.push('To change paths, edit comfyui-paths.config.json and restart the MCP server.');

    return textResult(checks.join('\n'));
  },
);

// Tool: scan_installed_nodes

server.tool(
  'scan_installed_nodes',
  'Scan ComfyUI custom_nodes and return installed node pack metadata.',
  {
    customNodesDir: z.string().optional().default(DEFAULT_CUSTOM_NODES_DIR),
  },
  async ({ customNodesDir }) => {
    try {
      const packs = await scanInstalledNodePacks(customNodesDir ?? DEFAULT_CUSTOM_NODES_DIR);
      return jsonResult(packs);
    } catch (err: any) {
      return errorResult(`Failed to scan installed nodes: ${err?.message || 'Unknown error'}`);
    }
  },
);
server.tool(
  'execute_workflow',
  'Execute a ComfyUI workflow. Submits to /prompt and waits for completion. Returns output image URLs.',
  {
    workflow_json: z.string().describe('The workflow JSON in API format ({ "nodeId": { class_type, inputs } }) or graph format ({ nodes, links })'),
  },
  async ({ workflow_json }) => {
    try {
      let apiWorkflow: Record<string, any>;

      const parsed = JSON.parse(workflow_json);

      // Detect format: graph format has .nodes array, API format has string keys with class_type
      if (parsed.nodes && Array.isArray(parsed.nodes)) {
        // Graph format — need to convert to API format
        apiWorkflow = convertGraphToAPI(parsed, await getObjectInfo());
      } else {
        // Already in API format
        apiWorkflow = parsed;
      }

      const clientId = `mcp-${Date.now().toString(36)}`;

      // Submit prompt
      const res = await fetchWithTimeout(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: apiWorkflow, client_id: clientId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return errorResult(`Execution failed: ${JSON.stringify(errData)}`);
      }

      const { prompt_id } = await res.json();

      // Poll for completion (simple polling instead of WebSocket for MCP)
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;

        const historyRes = await fetchWithTimeout(`${COMFYUI_URL}/history/${prompt_id}`);
        if (!historyRes.ok) continue;

        const history = await historyRes.json();
        const entry = history[prompt_id];

        if (!entry) continue;

        if (entry.status?.status_str === 'error') {
          return errorResult(`Execution error: ${JSON.stringify(entry.status.messages || 'Unknown error')}`);
        }

        if (entry.outputs && Object.keys(entry.outputs).length > 0) {
          // Collect images
          const images: string[] = [];
          for (const [nodeId, output] of Object.entries(entry.outputs as Record<string, any>)) {
            if (output.images) {
              for (const img of output.images) {
                const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`;
                images.push(`Node ${nodeId}: ${img.filename} → ${url}`);
              }
            }
          }

          return textResult(
            `Execution complete! Prompt ID: ${prompt_id}\n` +
            `Duration: ~${attempts}s\n` +
            (images.length > 0
              ? `\nOutput images:\n${images.join('\n')}`
              : '\nNo images in output (workflow may not have output nodes).')
          );
        }
      }

      return textResult(`Execution timed out after ${maxAttempts}s. Prompt ID: ${prompt_id}. Check ComfyUI console.`);
    } catch (err: any) {
      return errorResult(`Execution failed: ${err.message}`);
    }
  },
);

// ── Tool: interrupt_execution ────────────────────────────────────────────────

server.tool(
  'interrupt_execution',
  'Interrupt/cancel the currently running ComfyUI workflow execution.',
  {},
  async () => {
    try {
      await fetchWithTimeout(`${COMFYUI_URL}/interrupt`, { method: 'POST' });
      return textResult('Execution interrupted.');
    } catch (err: any) {
      return errorResult(`Failed to interrupt: ${err.message}`);
    }
  },
);

// ── Tool: get_queue ──────────────────────────────────────────────────────────

server.tool(
  'get_queue',
  'Get the current ComfyUI execution queue (pending and running prompts).',
  {},
  async () => {
    try {
      const res = await fetchWithTimeout(`${COMFYUI_URL}/queue`);
      if (!res.ok) return errorResult(`Queue request failed: ${res.status}`);
      const data = await res.json();
      return textResult(
        `Queue: ${data.queue_running?.length ?? 0} running, ${data.queue_pending?.length ?? 0} pending`
      );
    } catch (err: any) {
      return errorResult(`Failed to get queue: ${err.message}`);
    }
  },
);

// ── Tool: clear_queue ────────────────────────────────────────────────────────

server.tool(
  'clear_queue',
  'Clear all pending items from the ComfyUI execution queue.',
  {},
  async () => {
    try {
      await fetchWithTimeout(`${COMFYUI_URL}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      });
      return textResult('Queue cleared.');
    } catch (err: any) {
      return errorResult(`Failed to clear queue: ${err.message}`);
    }
  },
);

// ── Tool: view_history ───────────────────────────────────────────────────────

server.tool(
  'view_history',
  'View recent ComfyUI execution history with output image URLs.',
  {
    max_entries: z.number().optional().default(5).describe('Max history entries to return'),
  },
  async ({ max_entries }) => {
    try {
      const res = await fetchWithTimeout(`${COMFYUI_URL}/history`);
      if (!res.ok) return errorResult(`History request failed: ${res.status}`);
      const data = await res.json();
      const entries = Object.entries(data).slice(-(max_entries ?? 5));

      if (entries.length === 0) return textResult('No execution history.');

      const lines = entries.map(([pid, entry]: [string, any]) => {
        const status = entry.status?.status_str || 'unknown';
        const images: string[] = [];
        if (entry.outputs) {
          for (const [nid, out] of Object.entries(entry.outputs as Record<string, any>)) {
            if (out.images) {
              for (const img of out.images) {
                images.push(`${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&type=${encodeURIComponent(img.type || 'output')}`);
              }
            }
          }
        }
        return `[${status}] ${pid.slice(0, 8)}...${images.length > 0 ? `\n  Images: ${images.join(', ')}` : ''}`;
      });

      return textResult(`Recent history (${entries.length}):\n\n${lines.join('\n\n')}`);
    } catch (err: any) {
      return errorResult(`Failed to get history: ${err.message}`);
    }
  },
);

// ── Helper: Convert graph format to API format ──────────────────────────────


// Tool: install_custom_node

server.tool(
  'install_custom_node',
  'Install, update, or uninstall a custom node pack through ComfyUI-Manager.',
  {
    action: z.enum(['install', 'update', 'uninstall']).describe('Action to perform'),
    git_url: z.string().describe('GitHub URL of the custom node pack'),
  },
  async ({ action, git_url }) => {
    try {
      const queueCheck = await fetchWithCustomTimeout(`${COMFYUI_URL}/manager/queue`, 5000);
      if (!queueCheck.ok) {
        return errorResult('ComfyUI-Manager is not installed or not responding. Install it from: https://github.com/ltdrdata/ComfyUI-Manager');
      }
    } catch {
      return errorResult('ComfyUI-Manager is not installed or not responding. Install it from: https://github.com/ltdrdata/ComfyUI-Manager');
    }

    const endpointByAction: Record<'install' | 'update' | 'uninstall', string> = {
      install: '/customnode/install',
      update: '/customnode/update',
      uninstall: '/customnode/uninstall',
    };

    const endpoint = endpointByAction[action];
    const payload = {
      selected: [{
        files: [git_url],
        install_type: 'git-clone',
        title: '',
        description: '',
        author: '',
        reference: git_url,
      }],
    };

    try {
      const res = await fetchWithTimeout(`${COMFYUI_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return errorResult(`ComfyUI-Manager ${action} failed (${res.status}). ${body}`.trim());
      }

      return textResult(
        `Custom node ${action} queued successfully.\n` +
        `URL: ${git_url}\n` +
        `Note: ComfyUI restart may be required after install/uninstall.`
      );
    } catch (err: any) {
      return errorResult(`Failed to ${action} custom node: ${err?.message || 'Unknown error'}`);
    }
  },
);

// Tool: search_models

server.tool(
  'search_models',
  'Search models from CivitAI and HuggingFace.',
  {
    query: z.string().describe('Search query (e.g. "SDXL realistic", "FLUX lora anime")'),
    source: z.enum(['civitai', 'huggingface', 'both']).optional().default('both').describe('Which model hub to search'),
    model_type: z.string().optional().describe('Filter: Checkpoint, LORA, TextualInversion, VAE, ControlNet, Upscaler'),
    limit: z.number().optional().default(10).describe('Max results per source'),
  },
  async ({ query, source, model_type, limit }) => {
    const max = limit ?? 10;
    const selectedSource = source ?? 'both';

    const lines: string[] = [];
    const sourceErrors: string[] = [];

    if (selectedSource === 'civitai' || selectedSource === 'both') {
      try {
        const p = new URLSearchParams({
          query,
          limit: String(max),
          sort: 'Most Downloaded',
        });
        if (model_type) {
          p.set('types', model_type);
        }

        const res = await fetchWithTimeout(`https://civitai.com/api/v1/models?${p.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { items?: any[] };
        const items = Array.isArray(data.items) ? data.items : [];

        lines.push(`CivitAI results (${items.length}):`);
        for (const item of items) {
          const latest = Array.isArray(item.modelVersions) ? item.modelVersions[0] : undefined;
          const file = Array.isArray(latest?.files) ? latest.files[0] : undefined;
          const preview = Array.isArray(latest?.images) ? latest.images[0] : undefined;
          const fileSizeGb = typeof file?.sizeKB === 'number' ? (file.sizeKB / 1024 / 1024).toFixed(2) : undefined;
          lines.push(
            `- ${item.name || 'Unknown'} | ${item.type || 'Unknown'} | by ${item.creator?.username || 'Unknown'} | ` +
            `downloads: ${item.stats?.downloadCount ?? 0} | rating: ${item.stats?.rating ?? 'n/a'} | ` +
            `version: ${latest?.name || 'n/a'} (${latest?.baseModel || 'n/a'}) | ` +
            `file: ${file?.name || 'n/a'}${fileSizeGb ? ` (${fileSizeGb} GB)` : ''} | ` +
            `download: ${file?.downloadUrl || latest?.downloadUrl || 'n/a'} | ` +
            `preview: ${preview?.url || 'n/a'} | ` +
            `page: https://civitai.com/models/${item.id}`
          );
        }
      } catch (err: any) {
        sourceErrors.push(`CivitAI failed: ${err?.message || 'Unknown error'}`);
      }
    }

    if (selectedSource === 'huggingface' || selectedSource === 'both') {
      try {
        const p = new URLSearchParams({
          search: query,
          limit: String(max),
          sort: 'downloads',
          direction: '-1',
        });
        if (model_type === 'Checkpoint' || model_type === 'LORA') {
          p.set('filter', 'diffusers');
        }

        const res = await fetchWithTimeout(`https://huggingface.co/api/models?${p.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = await res.json() as any[];

        lines.push(`HuggingFace results (${Array.isArray(items) ? items.length : 0}):`);
        for (const item of (Array.isArray(items) ? items : [])) {
          lines.push(
            `- ${item.modelId || 'Unknown'} | by ${item.author || 'Unknown'} | ` +
            `downloads: ${item.downloads ?? 0} | likes: ${item.likes ?? 0} | ` +
            `tags: ${Array.isArray(item.tags) ? item.tags.slice(0, 8).join(', ') : 'n/a'} | ` +
            `page: https://huggingface.co/${item.modelId || ''}`
          );
        }
      } catch (err: any) {
        sourceErrors.push(`HuggingFace failed: ${err?.message || 'Unknown error'}`);
      }
    }

    if (lines.length === 0) {
      return errorResult(`Model search failed.\n${sourceErrors.join('\n')}`);
    }

    return textResult(
      [
        `Model search query: "${query}"`,
        `Source: ${selectedSource}`,
        `Limit per source: ${max}`,
        model_type ? `Model type filter: ${model_type}` : '',
        '',
        ...lines,
        sourceErrors.length > 0 ? `\nPartial errors:\n${sourceErrors.map((e) => `- ${e}`).join('\n')}` : '',
      ].filter(Boolean).join('\n')
    );
  },
);

// Tool: batch_execute

server.tool(
  'batch_execute',
  'Execute multiple workflow variants in sequence. Queues each variant and returns all results. Useful for parameter sweeps.',
  {
    workflows: z.array(z.object({
      label: z.string().describe('Human-readable label for this variant'),
      workflow_json: z.string().describe('The workflow JSON (API or graph format)'),
    })).describe('Array of workflow variants to execute'),
    delay_between_ms: z.number().optional().default(500).describe('Delay between queue submissions (ms)'),
  },
  async ({ workflows, delay_between_ms }) => {
    try {
      if (!Array.isArray(workflows) || workflows.length === 0) {
        return errorResult('No workflows provided.');
      }

      const delayMs = Math.max(0, delay_between_ms ?? 500);
      const clientId = `mcp-batch-${Date.now().toString(36)}`;
      const queued: Array<{ label: string; promptId: string }> = [];

      for (const variant of workflows) {
        let parsed: any;
        try {
          parsed = JSON.parse(variant.workflow_json);
        } catch (err: any) {
          return errorResult(`Invalid JSON for variant "${variant.label}": ${err?.message || 'Parse error'}`);
        }

        let apiWorkflow: Record<string, any>;
        if (parsed?.nodes && Array.isArray(parsed.nodes)) {
          apiWorkflow = convertGraphToAPI(parsed, await getObjectInfo());
        } else {
          apiWorkflow = parsed;
        }

        const submitRes = await fetchWithTimeout(`${COMFYUI_URL}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: apiWorkflow,
            client_id: clientId,
          }),
        });

        if (!submitRes.ok) {
          const errText = await submitRes.text().catch(() => '');
          return errorResult(`Failed to queue variant "${variant.label}" (${submitRes.status}). ${errText}`.trim());
        }

        const submitData = await submitRes.json();
        const promptId = String(submitData?.prompt_id || '');
        if (!promptId) {
          return errorResult(`ComfyUI did not return prompt_id for variant "${variant.label}".`);
        }

        queued.push({ label: variant.label, promptId });

        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      const startedAt = Date.now();
      const timeoutMs = 300_000; // 5 minutes total
      const pollIntervalMs = 2000;
      const pending = new Map<string, { label: string }>();
      const results = new Map<string, {
        label: string;
        status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
        images: string[];
        message?: string;
      }>();

      for (const q of queued) {
        pending.set(q.promptId, { label: q.label });
      }

      while (pending.size > 0 && (Date.now() - startedAt) < timeoutMs) {
        const promptIds = Array.from(pending.keys());

        for (const promptId of promptIds) {
          const pendingItem = pending.get(promptId);
          if (!pendingItem) continue;

          try {
            const historyRes = await fetchWithTimeout(`${COMFYUI_URL}/history/${promptId}`);
            if (!historyRes.ok) {
              continue;
            }

            const historyData = await historyRes.json();
            const entry = historyData?.[promptId];
            if (!entry) {
              continue;
            }

            const statusRaw = entry?.status?.status_str;
            if (statusRaw === 'error') {
              const messages = entry?.status?.messages;
              results.set(promptId, {
                label: pendingItem.label,
                status: 'ERROR',
                images: [],
                message: typeof messages === 'string' ? messages : JSON.stringify(messages ?? 'Unknown error'),
              });
              pending.delete(promptId);
              continue;
            }

            if (entry?.outputs && Object.keys(entry.outputs).length > 0) {
              const images: string[] = [];
              for (const [nodeId, output] of Object.entries(entry.outputs as Record<string, any>)) {
                if (!Array.isArray((output as any)?.images)) continue;
                for (const img of (output as any).images) {
                  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`;
                  images.push(`Node ${nodeId}: ${url}`);
                }
              }

              results.set(promptId, {
                label: pendingItem.label,
                status: 'SUCCESS',
                images,
              });
              pending.delete(promptId);
            }
          } catch {
            // Keep polling remaining variants.
          }
        }

        if (pending.size > 0) {
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
      }

      for (const [promptId, pendingItem] of pending.entries()) {
        results.set(promptId, {
          label: pendingItem.label,
          status: 'TIMEOUT',
          images: [],
          message: 'Timed out waiting for completion.',
        });
      }

      const summaryLines: string[] = [];
      const successCount = Array.from(results.values()).filter((r) => r.status === 'SUCCESS').length;
      summaryLines.push(`Batch execution complete: ${successCount}/${queued.length} succeeded`);
      summaryLines.push('');

      for (const queuedItem of queued) {
        const result = results.get(queuedItem.promptId);
        if (!result) {
          summaryLines.push(`Variant (${queuedItem.label}): ERROR - Missing result`);
          continue;
        }

        if (result.status === 'SUCCESS') {
          summaryLines.push(`Variant (${queuedItem.label}): SUCCESS - ${result.images.length} images`);
          for (const imageLine of result.images) {
            summaryLines.push(`  Image: ${imageLine.replace(/^Node \d+:\s*/, '')}`);
          }
        } else if (result.status === 'TIMEOUT') {
          summaryLines.push(`Variant (${queuedItem.label}): ERROR - ${result.message || 'Timed out'}`);
        } else {
          summaryLines.push(`Variant (${queuedItem.label}): ERROR - ${result.message || 'Unknown error'}`);
        }
      }

      return textResult(summaryLines.join('\n'));
    } catch (err: any) {
      return errorResult(`Batch execution failed: ${err?.message || 'Unknown error'}`);
    }
  },
);

function convertGraphToAPI(workflow: any, objectInfo: Record<string, any>): Record<string, any> {
  const api: Record<string, any> = {};

  for (const node of workflow.nodes) {
    const inputs: Record<string, any> = {};
    const rawInfo = objectInfo[node.type];

    // Map widget values by name using schema
    if (node.widgets_values && rawInfo) {
      const widgetInputs: { name: string }[] = [];
      const parseGroup = (spec: Record<string, any> | undefined) => {
        if (!spec) return;
        for (const [name, config] of Object.entries(spec)) {
          if (!Array.isArray(config) || config.length === 0) continue;
          const first = config[0];
          if (Array.isArray(first)) {
            widgetInputs.push({ name }); // COMBO
          } else if (typeof first === 'string' && !CONNECTION_TYPES.has(first.toUpperCase())) {
            widgetInputs.push({ name }); // Widget type
          }
        }
      };
      parseGroup(rawInfo.input?.required);
      parseGroup(rawInfo.input?.optional);

      widgetInputs.forEach((w, idx) => {
        if (idx < node.widgets_values.length && node.widgets_values[idx] !== undefined) {
          inputs[w.name] = node.widgets_values[idx];
        }
      });
    }

    // Map connection inputs from links
    for (const link of workflow.links) {
      const [, srcNode, srcSlot, tgtNode, tgtSlot] = link;
      if (tgtNode === node.id) {
        const inputDef = node.inputs?.[tgtSlot];
        if (inputDef?.name) {
          inputs[inputDef.name] = [String(srcNode), srcSlot];
        }
      }
    }

    api[String(node.id)] = {
      class_type: node.type,
      inputs,
    };
  }

  return api;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Start the server
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server is now running and listening on stdio
}

main().catch((err) => {
  console.error('MCP Server failed to start:', err);
  process.exit(1);
});



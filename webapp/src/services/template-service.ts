/**
 * Phase 10H - Template Manager Service
 * Fetches, analyzes, caches, and serves ComfyUI workflow templates
 * from multiple sources (official CDN, local folder, user-saved).
 */

import { extractWorkflowMetadata } from './workflow-metadata-extractor';
import type { WorkflowNoteMetadata } from './workflow-note-injector';

// ============================================================
// TYPES
// ============================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  fullDescription?: string;
  source: TemplateSource;
  category: TemplateCategory;
  tags: string[];
  thumbnail?: string;
  workflow: any;
  metadata?: WorkflowNoteMetadata;
  nodeCount: number;
  modelCount: number;
  ecosystem?: string;
  pipelineType?: string;
  createdAt?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export type TemplateSource = 'official' | 'local' | 'saved' | 'community';

export type TemplateCategory =
  | 'all'
  | 'getting-started'
  | 'image'
  | 'video'
  | 'audio'
  | '3d'
  | 'llm'
  | 'upscaling'
  | 'inpainting'
  | 'controlnet'
  | 'face'
  | 'style'
  | 'utility'
  | 'advanced';

export interface TemplateFilter {
  search: string;
  category: TemplateCategory;
  source: TemplateSource | 'all';
  ecosystem: string | 'all';
  difficulty: string | 'all';
  sortBy: 'name' | 'nodeCount' | 'newest' | 'difficulty';
}

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  all: 'All Templates',
  'getting-started': 'Getting Started',
  image: 'Image Generation',
  video: 'Video / Animation',
  audio: 'Audio',
  '3d': '3D Models',
  llm: 'LLM / Text',
  upscaling: 'Upscaling',
  inpainting: 'Inpainting',
  controlnet: 'ControlNet',
  face: 'Face Enhancement',
  style: 'Style Transfer',
  utility: 'Utility',
  advanced: 'Advanced',
};

export { CATEGORY_LABELS };

const STORAGE_KEY_SAVED = 'fdp-saved-templates';
const STORAGE_KEY_CACHE = 'fdp-template-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================================
// IN-MEMORY CACHE
// ============================================================

let templateCache: WorkflowTemplate[] = [];
let lastFetchTime = 0;

// ============================================================
// MAIN API
// ============================================================

export async function getAllTemplates(forceRefresh = false): Promise<WorkflowTemplate[]> {
  const now = Date.now();

  if (!forceRefresh && templateCache.length > 0 && (now - lastFetchTime) < CACHE_TTL_MS) {
    return templateCache;
  }

  if (!forceRefresh && templateCache.length === 0) {
    const stored = loadCachedTemplates();
    if (stored.length > 0) {
      templateCache = stored;
    }
  }

  const [official, local, saved] = await Promise.allSettled([
    fetchOfficialTemplates(),
    fetchLocalTemplates(),
    Promise.resolve(getSavedTemplates()),
  ]);

  const allTemplates: WorkflowTemplate[] = [];
  if (official.status === 'fulfilled') allTemplates.push(...official.value);
  if (local.status === 'fulfilled') allTemplates.push(...local.value);
  if (saved.status === 'fulfilled') allTemplates.push(...saved.value);

  if (allTemplates.filter((template) => template.source !== 'saved').length === 0) {
    allTemplates.push(...getBundledStarterTemplates());
  }

  if (!forceRefresh && templateCache.length > 0) {
    allTemplates.push(...templateCache);
  }

  const seen = new Set<string>();
  const deduped = allTemplates.filter((template) => {
    if (seen.has(template.id)) return false;
    seen.add(template.id);
    return true;
  });

  templateCache = deduped;
  lastFetchTime = now;
  saveCachedTemplates(deduped);

  return deduped;
}

export function filterTemplates(
  templates: WorkflowTemplate[],
  filter: TemplateFilter,
): WorkflowTemplate[] {
  let result = [...templates];

  if (filter.search.trim()) {
    const query = filter.search.toLowerCase().trim();
    result = result.filter((template) => (
      template.name.toLowerCase().includes(query)
      || template.description.toLowerCase().includes(query)
      || template.tags.some((tag) => tag.toLowerCase().includes(query))
      || (template.ecosystem || '').toLowerCase().includes(query)
      || (template.pipelineType || '').toLowerCase().includes(query)
    ));
  }

  if (filter.category !== 'all') {
    result = result.filter((template) => template.category === filter.category);
  }

  if (filter.source !== 'all') {
    result = result.filter((template) => template.source === filter.source);
  }

  if (filter.ecosystem !== 'all') {
    result = result.filter((template) => template.ecosystem === filter.ecosystem);
  }

  if (filter.difficulty !== 'all') {
    result = result.filter((template) => template.difficulty === filter.difficulty);
  }

  switch (filter.sortBy) {
    case 'name':
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'nodeCount':
      result.sort((a, b) => a.nodeCount - b.nodeCount);
      break;
    case 'difficulty': {
      const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      result.sort((a, b) => (
        (diffOrder[a.difficulty || 'intermediate'] || 1)
        - (diffOrder[b.difficulty || 'intermediate'] || 1)
      ));
      break;
    }
    case 'newest':
      result.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      break;
  }

  return result;
}

export function saveAsTemplate(
  workflow: any,
  name: string,
  category: TemplateCategory = 'utility',
): WorkflowTemplate {
  const template = analyzeWorkflow(workflow, name, 'saved');
  template.category = category;
  template.createdAt = new Date().toISOString();

  const saved = getSavedTemplates();
  const existingIndex = saved.findIndex((entry) => entry.id === template.id);
  if (existingIndex !== -1) {
    saved[existingIndex] = template;
  } else {
    saved.push(template);
  }

  localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(saved));

  const cacheIndex = templateCache.findIndex((entry) => entry.id === template.id);
  if (cacheIndex !== -1) {
    templateCache[cacheIndex] = template;
  } else {
    templateCache.push(template);
  }

  return template;
}

export function deleteSavedTemplate(templateId: string): void {
  const saved = getSavedTemplates().filter((template) => template.id !== templateId);
  localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(saved));
  templateCache = templateCache.filter((template) => template.id !== templateId);
}

export function getAvailableEcosystems(templates: WorkflowTemplate[]): string[] {
  const ecosystems = new Set<string>();
  for (const template of templates) {
    if (template.ecosystem) ecosystems.add(template.ecosystem);
  }
  return Array.from(ecosystems).sort();
}

// ============================================================
// TEMPLATE SOURCES
// ============================================================

async function fetchOfficialTemplates(): Promise<WorkflowTemplate[]> {
  try {
    const urls = [
      'https://comfyui-templates.pages.dev/api/templates',
      'https://comfyui-templates.pages.dev/templates.json',
    ];

    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url, 10000);
        if (!response.ok) continue;
        const data = await response.json();
        const templates = await parseOfficialTemplateResponse(data);
        if (templates.length > 0) {
          console.info(`[TemplateManager] Loaded ${templates.length} official templates from CDN`);
          return templates;
        }
      } catch {
        // Try next URL
      }
    }

    console.info('[TemplateManager] Official template CDN not available - using local/bundled templates');
    return [];
  } catch (err) {
    console.warn('[TemplateManager] Failed to fetch official templates:', err);
    return [];
  }
}

async function parseOfficialTemplateResponse(data: any): Promise<WorkflowTemplate[]> {
  const templates: WorkflowTemplate[] = [];
  const items = Array.isArray(data)
    ? data
    : (Array.isArray(data?.templates) ? data.templates : (Array.isArray(data?.items) ? data.items : []));

  for (const item of items) {
    try {
      const workflow = await resolveWorkflowFromItem(item);
      if (!workflow) continue;

      const name = String(item?.name || item?.title || 'Untitled Template');
      const template = analyzeWorkflow(workflow, name, 'official');

      if (typeof item?.description === 'string' && item.description.trim()) {
        template.description = item.description.trim();
      }
      if (typeof item?.thumbnail === 'string') {
        template.thumbnail = item.thumbnail;
      }
      if (typeof item?.category === 'string') {
        template.category = mapCategory(item.category);
      }
      if (Array.isArray(item?.tags)) {
        template.tags = item.tags.map(String);
      } else if (typeof item?.tags === 'string') {
        template.tags = [item.tags];
      }
      if (item?.difficulty === 'beginner' || item?.difficulty === 'intermediate' || item?.difficulty === 'advanced') {
        template.difficulty = item.difficulty;
      }

      templates.push(template);
    } catch (err) {
      console.warn('[TemplateManager] Failed to parse official template item:', err);
    }
  }

  return templates;
}

async function resolveWorkflowFromItem(item: any): Promise<any | null> {
  if (item?.workflow) return item.workflow;
  if (item?.data) return item.data;
  if (item?.json) return item.json;

  const urlCandidate = item?.workflow_url || item?.url || item?.json_url;
  if (typeof urlCandidate !== 'string' || !urlCandidate.trim()) return null;

  try {
    const response = await fetchWithTimeout(urlCandidate, 10000);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchLocalTemplates(): Promise<WorkflowTemplate[]> {
  const templates: WorkflowTemplate[] = [];
  const paths = [
    '/comfyui-proxy/userdata/workflows',
    '/comfyui-proxy/api/templates',
  ];

  for (const path of paths) {
    try {
      const response = await fetchWithTimeout(path, 5000);
      if (!response.ok) continue;
      const data = await response.json();
      if (!Array.isArray(data)) continue;

      for (const entry of data) {
        const filename = typeof entry === 'string'
          ? entry
          : String(entry?.name || entry?.filename || '');
        if (!filename || !filename.endsWith('.json')) continue;

        try {
          const workflowResponse = await fetchWithTimeout(`${path}/${encodeURIComponent(filename)}`, 5000);
          if (!workflowResponse.ok) continue;
          const workflow = await workflowResponse.json();
          const name = filename.replace(/\.json$/i, '').replace(/[_-]/g, ' ');
          templates.push(analyzeWorkflow(workflow, name, 'local'));
        } catch {
          // Skip individual workflow load errors
        }
      }

      if (templates.length > 0) {
        console.info(`[TemplateManager] Loaded ${templates.length} local templates from ${path}`);
        break;
      }
    } catch {
      // Try next path
    }
  }

  return templates;
}

function getSavedTemplates(): WorkflowTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as WorkflowTemplate[] : [];
  } catch {
    return [];
  }
}

// ============================================================
// WORKFLOW ANALYSIS (leverages 10G)
// ============================================================

function analyzeWorkflow(
  workflow: any,
  name: string,
  source: TemplateSource,
): WorkflowTemplate {
  let metadata: WorkflowNoteMetadata | undefined;
  try {
    metadata = extractWorkflowMetadata(workflow, name);
  } catch {
    // Keep fallback metadata empty.
  }

  const nodeCount = metadata?.stats.totalNodes || countNodes(workflow);
  const modelCount = metadata?.models.length || 0;
  const category = inferCategory(metadata);
  const tags = inferTags(metadata, workflow);
  const difficulty = inferDifficulty(nodeCount, metadata);
  const ecosystem = detectEcosystemFromMetadata(metadata);
  const pipelineType = detectPipelineTypeFromMetadata(metadata);

  const id = `${source}-${generateHash(name + JSON.stringify(workflow).slice(0, 300))}`;

  return {
    id,
    name,
    description: metadata?.description?.split('\n')[0] || `Workflow with ${nodeCount} nodes`,
    fullDescription: metadata?.description || '',
    source,
    category,
    tags,
    workflow,
    metadata,
    nodeCount,
    modelCount,
    ecosystem,
    pipelineType,
    difficulty,
  };
}

function countNodes(workflow: any): number {
  if (Array.isArray(workflow?.nodes)) return workflow.nodes.length;
  if (!workflow || typeof workflow !== 'object') return 0;
  return Object.keys(workflow).filter((key) => /^\d+$/.test(key)).length;
}

function inferCategory(metadata: WorkflowNoteMetadata | undefined): TemplateCategory {
  const text = (metadata?.description || '').toLowerCase();
  const packText = (metadata?.customPacks || []).map((pack) => pack.packName.toLowerCase()).join(' ');
  const nodeText = (metadata?.customPacks || []).flatMap((pack) => pack.nodeTypes).join(' ').toLowerCase();
  const haystack = `${text} ${packText} ${nodeText}`;

  if (/video|animation|animatediff|wan|svd/.test(haystack)) return 'video';
  if (/audio|sound|music/.test(haystack)) return 'audio';
  if (/3d|mesh|point.cloud/.test(haystack)) return '3d';
  if (/llm|language|qwen|text.gen/.test(haystack)) return 'llm';
  if (/upscal/.test(haystack)) return 'upscaling';
  if (/inpaint/.test(haystack)) return 'inpainting';
  if (/controlnet/.test(haystack)) return 'controlnet';
  if (/face|facedetail|reactor/.test(haystack)) return 'face';
  if (/style|ipadapter|reference/.test(haystack)) return 'style';
  if ((metadata?.stats.totalNodes || 0) <= 8) return 'getting-started';
  return 'image';
}

function inferTags(metadata: WorkflowNoteMetadata | undefined, workflow: any): string[] {
  const tags: string[] = [];

  const ecosystem = detectEcosystemFromMetadata(metadata);
  if (ecosystem) tags.push(ecosystem);

  const pipeline = detectPipelineTypeFromMetadata(metadata);
  if (pipeline) {
    tags.push(...pipeline.split('+').map((part) => part.trim()).filter(Boolean));
  }

  const modelTypes = new Set((metadata?.models || []).map((model) => model.type));
  for (const modelType of modelTypes) {
    if (modelType && modelType !== 'Other') tags.push(modelType);
  }

  for (const pack of metadata?.customPacks || []) {
    if (pack.packName !== 'ComfyUI Core' && pack.packName !== 'Core / Unknown' && pack.packName !== 'Unknown') {
      tags.push(pack.packName);
    }
  }

  if (tags.length === 0) {
    const nodeCount = countNodes(workflow);
    if (nodeCount <= 8) tags.push('beginner');
  }

  return Array.from(new Set(tags)).slice(0, 12);
}

function inferDifficulty(
  nodeCount: number,
  metadata: WorkflowNoteMetadata | undefined,
): 'beginner' | 'intermediate' | 'advanced' {
  const customPackCount = (metadata?.customPacks || []).filter((pack) => (
    pack.packName !== 'ComfyUI Core'
    && pack.packName !== 'Core / Unknown'
    && pack.packName !== 'Unknown'
  )).length;

  if (nodeCount <= 8 && customPackCount === 0) return 'beginner';
  if (nodeCount <= 15 && customPackCount <= 2) return 'intermediate';
  return 'advanced';
}

function detectEcosystemFromMetadata(metadata: WorkflowNoteMetadata | undefined): string {
  const description = metadata?.description || '';
  const match = description.match(/This is a(?:n)?\s+([^\n]+?)\s+(?:text-to-image|img2img|image processing|video generation|workflow)/i);
  if (!match) {
    const simpler = description.match(/This is a(?:n)?\s+([A-Za-z0-9 ._-]+)\s+workflow/i);
    return simpler?.[1]?.trim() || '';
  }
  return match[1].trim();
}

function detectPipelineTypeFromMetadata(metadata: WorkflowNoteMetadata | undefined): string {
  const description = metadata?.description || '';
  const pipelineLine = description.split('\n').find((line) => line.startsWith('Pipeline:'));
  if (pipelineLine) {
    return pipelineLine.replace('Pipeline:', '').trim();
  }
  const summary = description.split('\n')[0] || '';
  const match = summary.match(/workflow with .*$/i);
  return match ? match[0].replace(/workflow with .*$/i, '').trim() : '';
}

// ============================================================
// BUNDLED STARTER TEMPLATES
// ============================================================

function getBundledStarterTemplates(): WorkflowTemplate[] {
  return [
    analyzeWorkflow(createSimpleTxt2ImgWorkflow(), 'Simple Text to Image (SDXL)', 'official'),
    analyzeWorkflow(createSimpleImg2ImgWorkflow(), 'Simple Image to Image', 'official'),
    analyzeWorkflow(createHiResFixWorkflow(), 'Text to Image + HiRes Upscale', 'official'),
  ];
}

function createSimpleTxt2ImgWorkflow(): any {
  return {
    last_node_id: 7,
    last_link_id: 9,
    nodes: [
      {
        id: 1, type: 'CheckpointLoaderSimple', pos: [0, 200], size: [300, 100], flags: {}, order: 0, mode: 0,
        outputs: [
          { name: 'MODEL', type: 'MODEL', links: [4] },
          { name: 'CLIP', type: 'CLIP', links: [1, 2] },
          { name: 'VAE', type: 'VAE', links: [5] },
        ],
        widgets_values: [''],
        properties: {},
      },
      {
        id: 2, type: 'CLIPTextEncode', title: 'Positive Prompt', pos: [350, 100], size: [300, 130], flags: {}, order: 1, mode: 0,
        inputs: [{ name: 'clip', type: 'CLIP', link: 1 }],
        outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [3] }],
        widgets_values: ['a beautiful landscape, golden hour, photorealistic, detailed'],
        properties: {},
      },
      {
        id: 3, type: 'CLIPTextEncode', title: 'Negative Prompt', pos: [350, 300], size: [300, 130], flags: {}, order: 2, mode: 0,
        inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
        outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [6] }],
        widgets_values: ['low quality, blurry, watermark, text, deformed'],
        properties: {},
      },
      {
        id: 4, type: 'EmptyLatentImage', pos: [350, 500], size: [250, 100], flags: {}, order: 3, mode: 0,
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [7] }],
        widgets_values: [1024, 1024, 1],
        properties: {},
      },
      {
        id: 5, type: 'KSampler', pos: [700, 200], size: [300, 200], flags: {}, order: 4, mode: 0,
        inputs: [
          { name: 'model', type: 'MODEL', link: 4 },
          { name: 'positive', type: 'CONDITIONING', link: 3 },
          { name: 'negative', type: 'CONDITIONING', link: 6 },
          { name: 'latent_image', type: 'LATENT', link: 7 },
        ],
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [8] }],
        widgets_values: [0, 'randomize', 25, 7, 'dpmpp_2m', 'karras', 1],
        properties: {},
      },
      {
        id: 6, type: 'VAEDecode', pos: [1050, 200], size: [200, 80], flags: {}, order: 5, mode: 0,
        inputs: [
          { name: 'samples', type: 'LATENT', link: 8 },
          { name: 'vae', type: 'VAE', link: 5 },
        ],
        outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [9] }],
        properties: {},
      },
      {
        id: 7, type: 'SaveImage', pos: [1300, 200], size: [300, 250], flags: {}, order: 6, mode: 0,
        inputs: [{ name: 'images', type: 'IMAGE', link: 9 }],
        widgets_values: ['ComfyUI_output'],
        properties: {},
      },
    ],
    links: [
      [1, 1, 1, 2, 0, 'CLIP'],
      [2, 1, 1, 3, 0, 'CLIP'],
      [3, 2, 0, 5, 1, 'CONDITIONING'],
      [4, 1, 0, 5, 0, 'MODEL'],
      [5, 1, 2, 6, 1, 'VAE'],
      [6, 3, 0, 5, 2, 'CONDITIONING'],
      [7, 4, 0, 5, 3, 'LATENT'],
      [8, 5, 0, 6, 0, 'LATENT'],
      [9, 6, 0, 7, 0, 'IMAGE'],
    ],
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };
}

function createSimpleImg2ImgWorkflow(): any {
  return {
    last_node_id: 8,
    last_link_id: 11,
    nodes: [
      {
        id: 1, type: 'CheckpointLoaderSimple', pos: [0, 200], size: [300, 100], flags: {}, order: 0, mode: 0,
        outputs: [
          { name: 'MODEL', type: 'MODEL', links: [1] },
          { name: 'CLIP', type: 'CLIP', links: [2, 3] },
          { name: 'VAE', type: 'VAE', links: [4, 7] },
        ],
        widgets_values: [''],
        properties: {},
      },
      {
        id: 2, type: 'CLIPTextEncode', title: 'Positive Prompt', pos: [350, 100], size: [300, 130], flags: {}, order: 1, mode: 0,
        inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
        outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [5] }],
        widgets_values: ['enhance this image, high quality, detailed, sharp'],
        properties: {},
      },
      {
        id: 3, type: 'CLIPTextEncode', title: 'Negative Prompt', pos: [350, 300], size: [300, 130], flags: {}, order: 2, mode: 0,
        inputs: [{ name: 'clip', type: 'CLIP', link: 3 }],
        outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [6] }],
        widgets_values: ['low quality, blurry, artifacts'],
        properties: {},
      },
      {
        id: 4, type: 'LoadImage', pos: [0, 450], size: [300, 300], flags: {}, order: 3, mode: 0,
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', links: [8] },
          { name: 'MASK', type: 'MASK', links: [] },
        ],
        widgets_values: [''],
        properties: {},
      },
      {
        id: 5, type: 'VAEEncode', pos: [350, 500], size: [200, 80], flags: {}, order: 4, mode: 0,
        inputs: [
          { name: 'pixels', type: 'IMAGE', link: 8 },
          { name: 'vae', type: 'VAE', link: 4 },
        ],
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [9] }],
        properties: {},
      },
      {
        id: 6, type: 'KSampler', pos: [700, 200], size: [300, 200], flags: {}, order: 5, mode: 0,
        inputs: [
          { name: 'model', type: 'MODEL', link: 1 },
          { name: 'positive', type: 'CONDITIONING', link: 5 },
          { name: 'negative', type: 'CONDITIONING', link: 6 },
          { name: 'latent_image', type: 'LATENT', link: 9 },
        ],
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [10] }],
        widgets_values: [0, 'randomize', 20, 7, 'dpmpp_2m', 'karras', 0.6],
        properties: {},
      },
      {
        id: 7, type: 'VAEDecode', pos: [1050, 200], size: [200, 80], flags: {}, order: 6, mode: 0,
        inputs: [
          { name: 'samples', type: 'LATENT', link: 10 },
          { name: 'vae', type: 'VAE', link: 7 },
        ],
        outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [11] }],
        properties: {},
      },
      {
        id: 8, type: 'SaveImage', pos: [1300, 200], size: [300, 250], flags: {}, order: 7, mode: 0,
        inputs: [{ name: 'images', type: 'IMAGE', link: 11 }],
        widgets_values: ['img2img_output'],
        properties: {},
      },
    ],
    links: [
      [1, 1, 0, 6, 0, 'MODEL'],
      [2, 1, 1, 2, 0, 'CLIP'],
      [3, 1, 1, 3, 0, 'CLIP'],
      [4, 1, 2, 5, 1, 'VAE'],
      [5, 2, 0, 6, 1, 'CONDITIONING'],
      [6, 3, 0, 6, 2, 'CONDITIONING'],
      [7, 1, 2, 7, 1, 'VAE'],
      [8, 4, 0, 5, 0, 'IMAGE'],
      [9, 5, 0, 6, 3, 'LATENT'],
      [10, 6, 0, 7, 0, 'LATENT'],
      [11, 7, 0, 8, 0, 'IMAGE'],
    ],
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };
}

function createHiResFixWorkflow(): any {
  return {
    last_node_id: 9,
    last_link_id: 14,
    nodes: [
      {
        id: 1, type: 'CheckpointLoaderSimple', pos: [0, 200], size: [300, 100], flags: {}, order: 0, mode: 0,
        outputs: [
          { name: 'MODEL', type: 'MODEL', links: [1, 10] },
          { name: 'CLIP', type: 'CLIP', links: [2, 3] },
          { name: 'VAE', type: 'VAE', links: [7] },
        ],
        widgets_values: [''],
        properties: {},
      },
      {
        id: 2, type: 'CLIPTextEncode', title: 'Positive Prompt', pos: [350, 100], size: [300, 130], flags: {}, order: 1, mode: 0,
        inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
        outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [4, 11] }],
        widgets_values: ['a stunning portrait, cinematic lighting, 8k, highly detailed'],
        properties: {},
      },
      {
        id: 3, type: 'CLIPTextEncode', title: 'Negative Prompt', pos: [350, 300], size: [300, 130], flags: {}, order: 2, mode: 0,
        inputs: [{ name: 'clip', type: 'CLIP', link: 3 }],
        outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [5, 12] }],
        widgets_values: ['ugly, blurry, low quality, watermark, deformed'],
        properties: {},
      },
      {
        id: 4, type: 'EmptyLatentImage', pos: [350, 500], size: [250, 100], flags: {}, order: 3, mode: 0,
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [6] }],
        widgets_values: [768, 768, 1],
        properties: {},
      },
      {
        id: 5, type: 'KSampler', title: 'Base Sampler', pos: [700, 200], size: [300, 200], flags: {}, order: 4, mode: 0,
        inputs: [
          { name: 'model', type: 'MODEL', link: 1 },
          { name: 'positive', type: 'CONDITIONING', link: 4 },
          { name: 'negative', type: 'CONDITIONING', link: 5 },
          { name: 'latent_image', type: 'LATENT', link: 6 },
        ],
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [8] }],
        widgets_values: [0, 'randomize', 25, 7, 'dpmpp_2m', 'karras', 1],
        properties: {},
      },
      {
        id: 6, type: 'LatentUpscale', title: 'Upscale Latent (1.5x)', pos: [1050, 200], size: [250, 130], flags: {}, order: 5, mode: 0,
        inputs: [{ name: 'samples', type: 'LATENT', link: 8 }],
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [9] }],
        widgets_values: ['nearest-exact', 1152, 1152, 'disabled'],
        properties: {},
      },
      {
        id: 7, type: 'KSampler', title: 'HiRes Refine Sampler', pos: [1350, 200], size: [300, 200], flags: {}, order: 6, mode: 0,
        inputs: [
          { name: 'model', type: 'MODEL', link: 10 },
          { name: 'positive', type: 'CONDITIONING', link: 11 },
          { name: 'negative', type: 'CONDITIONING', link: 12 },
          { name: 'latent_image', type: 'LATENT', link: 9 },
        ],
        outputs: [{ name: 'LATENT', type: 'LATENT', links: [13] }],
        widgets_values: [0, 'randomize', 12, 7, 'dpmpp_2m', 'karras', 0.45],
        properties: {},
      },
      {
        id: 8, type: 'VAEDecode', pos: [1700, 200], size: [200, 80], flags: {}, order: 7, mode: 0,
        inputs: [
          { name: 'samples', type: 'LATENT', link: 13 },
          { name: 'vae', type: 'VAE', link: 7 },
        ],
        outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [14] }],
        properties: {},
      },
      {
        id: 9, type: 'SaveImage', pos: [1950, 200], size: [300, 250], flags: {}, order: 8, mode: 0,
        inputs: [{ name: 'images', type: 'IMAGE', link: 14 }],
        widgets_values: ['hires_output'],
        properties: {},
      },
    ],
    links: [
      [1, 1, 0, 5, 0, 'MODEL'],
      [2, 1, 1, 2, 0, 'CLIP'],
      [3, 1, 1, 3, 0, 'CLIP'],
      [4, 2, 0, 5, 1, 'CONDITIONING'],
      [5, 3, 0, 5, 2, 'CONDITIONING'],
      [6, 4, 0, 5, 3, 'LATENT'],
      [7, 1, 2, 8, 1, 'VAE'],
      [8, 5, 0, 6, 0, 'LATENT'],
      [9, 6, 0, 7, 3, 'LATENT'],
      [10, 1, 0, 7, 0, 'MODEL'],
      [11, 2, 0, 7, 1, 'CONDITIONING'],
      [12, 3, 0, 7, 2, 'CONDITIONING'],
      [13, 7, 0, 8, 0, 'LATENT'],
      [14, 8, 0, 9, 0, 'IMAGE'],
    ],
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };
}

// ============================================================
// HELPERS
// ============================================================

function generateHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input.charCodeAt(index);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function mapCategory(raw: string): TemplateCategory {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('start') || lower.includes('basic')) return 'getting-started';
  if (lower.includes('video') || lower.includes('anim')) return 'video';
  if (lower.includes('audio')) return 'audio';
  if (lower.includes('3d')) return '3d';
  if (lower.includes('llm') || lower.includes('text')) return 'llm';
  if (lower.includes('upscal')) return 'upscaling';
  if (lower.includes('inpaint')) return 'inpainting';
  if (lower.includes('control')) return 'controlnet';
  if (lower.includes('face')) return 'face';
  if (lower.includes('style')) return 'style';
  if (lower.includes('util')) return 'utility';
  if (lower.includes('advanc')) return 'advanced';
  return 'image';
}

function saveCachedTemplates(templates: WorkflowTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify({
      timestamp: Date.now(),
      templates,
    }));
  } catch {
    // Ignore storage quota errors.
  }
}

function loadCachedTemplates(): WorkflowTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CACHE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if ((Date.now() - Number(parsed?.timestamp || 0)) > CACHE_TTL_MS) return [];
    return Array.isArray(parsed?.templates) ? parsed.templates as WorkflowTemplate[] : [];
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * ComfyUI Backend Connection Service
 *
 * Connects to a local ComfyUI instance to:
 *  - Fetch live node schemas via /object_info (Tier 0 — highest fidelity)
 *  - Extract installed model filenames (checkpoints, LoRAs, VAEs, etc.)
 *  - Provide a live node registry that the AI system prompt can reference
 *
 * Storage: localStorage['comfyui-architect-live-nodes']
 */

import type { NodeInput, NodeOutput, ComfyUIWorkflow } from '../types/comfyui';
import { NODE_REGISTRY } from '../data/node-registry';
import { getCachedObjectInfo, getObjectInfo } from './comfyui-object-info-cache';
import { resolveComfyUIBaseUrl } from './api-config';

// Frontend-only LiteGraph nodes that do not exist as backend class_type handlers.
const FRONTEND_ONLY_NODE_TYPES = new Set([
  'Note',
  'Reroute',
  'PrimitiveNode',
]);

// ── Types ────────────────────────────────────────────────────────────────────

export interface LiveNodeSchema {
  class_type: string;
  display_name: string;
  category: string;
  description: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  /** Whether this is an output node (e.g. SaveImage, PreviewImage) */
  output_node: boolean;
}

export interface InstalledModels {
  checkpoints: string[];
  loras: string[];
  vaes: string[];
  controlnets: string[];
  clip: string[];
  clip_vision: string[];
  upscale_models: string[];
  embeddings: string[];
  unet: string[];
  diffusion_models: string[];
  text_encoders: string[];
  hypernetworks: string[];
  latent_upscale_models: string[];
  animatediff_models: string[];
  animatediff_motion_lora: string[];
  audio_encoders: string[];
  configs: string[];
  model_patches: string[];
  vae_approx: string[];
  llm: string[];
  /** Other model categories discovered dynamically */
  [key: string]: string[];
}

export interface LiveNodeCache {
  url: string;
  timestamp: number;
  nodeCount: number;
  nodes: Record<string, LiveNodeSchema>;
  models: InstalledModels;
  /** Node class names grouped by category (for compact prompt injection) */
  categorySummary: Record<string, string[]>;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  systemInfo?: {
    comfyuiVersion?: string;
    pythonVersion?: string;
    gpuName?: string;
    vramTotal?: number;
    vramFree?: number;
  };
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'comfyui-architect-live-nodes';
const MODEL_INVENTORY_KEY = 'comfyui-architect-model-inventory';
const MANAGER_NODE_LIST_CACHE_KEY = 'comfyui-manager-node-list';
const MANAGER_NODE_MAP_CACHE_KEY = 'comfyui-manager-node-map';
const CONNECTION_TIMEOUT = 8000;
let rawObjectInfo: Record<string, any> | null = null;
let inMemoryLiveNodeCache: LiveNodeCache | null = null;

const KNOWN_MODEL_FOLDERS = [
  'checkpoints', 'loras', 'vae', 'controlnet', 'clip', 'clip_vision',
  'upscale_models', 'embeddings', 'hypernetworks', 'diffusion_models',
  'text_encoders', 'unet', 'gligen', 'style_models',
  'diffusers', 'photomaker', 'ipadapter', 'instantid',
  'animatediff_models', 'animatediff_motion_lora',
  'audio_encoders', 'latent_upscale_models', 'configs',
  'model_patches', 'vae_approx', 'LLM',
] as const;

const MODEL_FOLDER_CATEGORY_MAP: Record<string, string> = {
  checkpoints: 'checkpoints',
  loras: 'loras',
  vae: 'vaes',
  controlnet: 'controlnets',
  clip: 'clip',
  clip_vision: 'clip_vision',
  upscale_models: 'upscale_models',
  embeddings: 'embeddings',
  unet: 'unet',
  diffusion_models: 'diffusion_models',
  text_encoders: 'text_encoders',
  hypernetworks: 'hypernetworks',
  latent_upscale_models: 'latent_upscale_models',
  animatediff_models: 'animatediff_models',
  animatediff_motion_lora: 'animatediff_motion_lora',
  audio_encoders: 'audio_encoders',
  configs: 'configs',
  model_patches: 'model_patches',
  vae_approx: 'vae_approx',
  LLM: 'llm',
  gligen: 'gligen',
  style_models: 'style_models',
  diffusers: 'diffusers',
  photomaker: 'photomaker',
  ipadapter: 'ipadapter',
  instantid: 'instantid',
};

/**
 * Detects whether the current page is served over HTTPS and the target URL is HTTP.
 * Browsers block these "mixed content" requests silently with a "Failed to fetch" error.
 */
export function detectMixedContent(targetUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  const pageIsSecure = window.location.protocol === 'https:';
  const normalized = targetUrl.trim().toLowerCase();
  const targetIsRelative = normalized.startsWith('/');
  if (targetIsRelative) return false;
  const targetIsInsecure = normalized.startsWith('http://') || (!normalized.startsWith('https://'));
  return pageIsSecure && targetIsInsecure;
}

/**
 * Returns a user-friendly error string when mixed content is detected.
 */
function getMixedContentError(): string {
  return (
    'HTTPS \u2192 HTTP blocked by browser (Mixed Content).\n' +
    'Your site is served over HTTPS but ComfyUI runs on HTTP.\n' +
    'Fix: Use a free HTTPS tunnel (one command, no signup):\n' +
    '  cloudflared tunnel --url http://localhost:8188\n' +
    'Then paste the https:// URL it gives you.\n' +
    'See the tunnel guide in ComfyUI Backend settings for details.'
  );
}

export function createEmptyInstalledModels(): InstalledModels {
  return {
    checkpoints: [],
    loras: [],
    vaes: [],
    controlnets: [],
    clip: [],
    clip_vision: [],
    upscale_models: [],
    embeddings: [],
    unet: [],
    diffusion_models: [],
    text_encoders: [],
    hypernetworks: [],
    latent_upscale_models: [],
    animatediff_models: [],
    animatediff_motion_lora: [],
    audio_encoders: [],
    configs: [],
    model_patches: [],
    vae_approx: [],
    llm: [],
  };
}

function mapFolderToCategory(folder: string): string {
  return MODEL_FOLDER_CATEGORY_MAP[folder] || folder;
}

// Known ComfyUI types that are always connection inputs (never widgets)
const CONNECTION_TYPES = new Set([
  'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE', 'MASK',
  'CONTROL_NET', 'CLIP_VISION', 'CLIP_VISION_OUTPUT', 'STYLE_MODEL',
  'GLIGEN', 'UPSCALE_MODEL', 'SIGMAS', 'SAMPLER', 'NOISE', 'GUIDER',
  'TAESD', 'PHOTOMAKER', 'IPADAPTER', 'INSIGHTFACE', 'BBOX_DETECTOR',
  'SAM_MODEL', 'SEGM_DETECTOR', 'SEGS', 'DETAILER_PIPE', 'BASIC_PIPE',
  'REGIONAL_PROMPTS', 'HOOKS', 'AUDIO', 'WEBCAM', 'UPSCALER', 'PK_HOOK',
  'SCHEDULER_FUNC', 'DETAILER_HOOK', 'PIPE_LINE', 'MESH', 'CAMERA', 'TRAJECTORY',
]);

const PRIMITIVE_WIDGET_TYPES = new Set(['INT', 'FLOAT', 'STRING', 'BOOLEAN', 'COMBO', 'NUMBER', 'STRING_MULTILINE']);

function isUpperConnectionLikeType(type: string): boolean {
  return /^[A-Z][A-Z0-9_*]+$/.test(type) && !PRIMITIVE_WIDGET_TYPES.has(type);
}

function isConnectionTypeName(type: string): boolean {
  const normalized = String(type || '').toUpperCase();
  if (!normalized) return false;
  return CONNECTION_TYPES.has(normalized) || normalized.includes('*') || isUpperConnectionLikeType(normalized);
}

// Fallback widget-name map for nodes that may not expose stable input ordering.
// Keep this tiny and targeted to avoid accidental mis-mapping.
const WIDGET_INPUT_NAME_FALLBACK: Record<string, string[]> = {
  UpscaleModelLoader: ['model_name'],
};

// Loader nodes whose combo options contain model filenames
const MODEL_LOADER_MAP: Record<string, { input: string; category: keyof InstalledModels }[]> = {
  'CheckpointLoaderSimple': [{ input: 'ckpt_name', category: 'checkpoints' }],
  'CheckpointLoader':       [{ input: 'ckpt_name', category: 'checkpoints' }],
  'LoraLoader':             [{ input: 'lora_name', category: 'loras' }],
  'LoraLoaderModelOnly':    [{ input: 'lora_name', category: 'loras' }],
  'VAELoader':              [{ input: 'vae_name', category: 'vaes' }],
  'ControlNetLoader':       [{ input: 'control_net_name', category: 'controlnets' }],
  'CLIPLoader':             [{ input: 'clip_name', category: 'clip' }],
  'DualCLIPLoader':         [{ input: 'clip_name1', category: 'clip' }, { input: 'clip_name2', category: 'clip' }],
  'CLIPVisionLoader':       [{ input: 'clip_name', category: 'clip_vision' }],
  'UpscaleModelLoader':     [{ input: 'model_name', category: 'upscale_models' }],
  'UNETLoader':             [{ input: 'unet_name', category: 'diffusion_models' }],
  // Phase 3: Expanded model extraction for custom nodes
  'IPAdapterModelLoader':   [{ input: 'ipadapter_file', category: 'ipadapter' }],
  'InstantIDModelLoader':   [{ input: 'instantid_file', category: 'instantid' }],
  'ControlNetLoaderAdvanced': [{ input: 'control_net_name', category: 'controlnets' }],
  'DiffControlNetLoader':   [{ input: 'model', category: 'controlnets' }],
  'StyleModelLoader':       [{ input: 'style_model_name', category: 'style_models' }],
  'GLIGENLoader':           [{ input: 'gligen_name', category: 'gligen' }],
  'unCLIPCheckpointLoader': [{ input: 'ckpt_name', category: 'checkpoints' }],
  'PhotoMakerLoader':       [{ input: 'photomaker_model_name', category: 'photomaker' }],
  'LoraLoaderBlockWeight':  [{ input: 'lora_name', category: 'loras' }],
};

async function fetchModelsInFolder(baseUrl: string, folder: string): Promise<string[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${baseUrl}/models/${folder}`, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data)) return null;
    return data.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mergeModelLists(base: InstalledModels, category: string, files: string[]): void {
  if (!Array.isArray(files) || files.length === 0) return;
  const existing = new Set(base[category] || []);
  for (const file of files) {
    if (typeof file === 'string' && file.trim().length > 0) existing.add(file);
  }
  base[category] = [...existing].sort((a, b) => a.localeCompare(b));
}

export function cacheModelInventory(models: InstalledModels): void {
  try {
    localStorage.setItem(MODEL_INVENTORY_KEY, JSON.stringify({
      timestamp: Date.now(),
      models,
    }));
  } catch {
    // localStorage best effort
  }
}

export function getCachedModelInventory(): InstalledModels | null {
  try {
    const raw = localStorage.getItem(MODEL_INVENTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { models?: InstalledModels };
    if (!parsed?.models || typeof parsed.models !== 'object') return null;
    return parsed.models;
  } catch {
    return null;
  }
}

function getCachedModelInventoryMeta(): { timestamp: number; models: InstalledModels } | null {
  try {
    const raw = localStorage.getItem(MODEL_INVENTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp?: number; models?: InstalledModels };
    if (!parsed?.models || typeof parsed.models !== 'object') return null;
    return {
      timestamp: Number(parsed.timestamp || 0),
      models: parsed.models,
    };
  } catch {
    return null;
  }
}

export async function fetchFullModelInventory(
  baseUrl: string,
  objectInfoModels?: InstalledModels,
): Promise<InstalledModels> {
  const merged: InstalledModels = {
    ...createEmptyInstalledModels(),
    ...(objectInfoModels || {}),
  };

  const folderResults = await Promise.allSettled(
    KNOWN_MODEL_FOLDERS.map(async (folder) => ({
      folder,
      files: await fetchModelsInFolder(baseUrl, folder),
    })),
  );

  for (const result of folderResults) {
    if (result.status !== 'fulfilled' || !result.value.files) continue;
    const category = mapFolderToCategory(result.value.folder);
    mergeModelLists(merged, category, result.value.files);
  }

  return merged;
}

// ── Connection Test ──────────────────────────────────────────────────────────

export async function testConnection(url: string): Promise<ConnectionTestResult> {
  const baseUrl = normalizeUrl(url);

  // Early check: mixed content will always fail
  if (detectMixedContent(baseUrl)) {
    return {
      success: false,
      error: getMixedContentError(),
    };
  }

  try {
    // Test with /system_stats which is lightweight
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);

    const response = await fetch(`${baseUrl}/system_stats`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    const system = data?.system;
    const devices = data?.devices;
    const gpu = devices?.[0];

    return {
      success: true,
      systemInfo: {
        comfyuiVersion: system?.comfyui_version || system?.version,
        pythonVersion: system?.python_version,
        gpuName: gpu?.name,
        vramTotal: gpu?.vram_total,
        vramFree: gpu?.vram_free,
      },
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Connection timed out (8s). Is ComfyUI running?' };
    }
    // CORS or network error
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      // Double-check mixed content (in case detection missed edge case)
      if (detectMixedContent(baseUrl)) {
        return { success: false, error: getMixedContentError() };
      }
      return {
        success: false,
        error: 'Cannot reach ComfyUI. Check that:\n• ComfyUI is running\n• Started with --enable-cors-header "*"\n• Started with --listen 0.0.0.0 if on a different machine',
      };
    }
    return { success: false, error: err.message || 'Unknown error' };
  }
}

// ── Fetch & Parse /object_info ───────────────────────────────────────────────

export async function fetchAndCacheObjectInfo(url: string): Promise<LiveNodeCache> {
  const baseUrl = normalizeUrl(url);

  // Early check: mixed content will always fail
  if (detectMixedContent(baseUrl)) {
    throw new Error(getMixedContentError());
  }

  const raw = await getObjectInfo(baseUrl, true) as Record<string, RawObjectInfoNode>;
  setRawObjectInfo(raw as Record<string, any>);
  const cache = parseObjectInfo(raw, baseUrl);
  // Always keep an in-memory copy so UI can function even if localStorage is full.
  inMemoryLiveNodeCache = cache;
  try {
    const fullInventory = await fetchFullModelInventory(baseUrl, cache.models);
    cache.models = fullInventory;
    cacheModelInventory(fullInventory);
  } catch {
    cacheModelInventory(cache.models);
  }

  // Save to localStorage — strip COMBO options arrays to reduce payload size.
  // Model filenames are already captured in cache.models; options are redundant in storage.
  // The in-memory cache (inMemoryLiveNodeCache) retains full options for UI use.
  try {
    const cacheToStore = { ...cache, nodes: stripComboOptions(cache.nodes) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheToStore));
  } catch (e) {
    console.warn('Failed to cache live node schemas (localStorage full?):', e);
  }

  return cache;
}

function stripComboOptions(nodes: Record<string, LiveNodeSchema>): Record<string, LiveNodeSchema> {
  const stripped: Record<string, LiveNodeSchema> = {};
  for (const [classType, schema] of Object.entries(nodes)) {
    stripped[classType] = {
      ...schema,
      inputs: schema.inputs.map((input) =>
        input.type === 'COMBO' ? { ...input, options: [] } : input
      ),
    };
  }
  return stripped;
}

export function getRawObjectInfo(): Record<string, any> | null {
  return rawObjectInfo ?? getCachedObjectInfo();
}

export function setRawObjectInfo(data: Record<string, any>): void {
  rawObjectInfo = data;
}

// ── Raw ComfyUI /object_info types ───────────────────────────────────────────

interface RawObjectInfoNode {
  input: {
    required?: Record<string, any>;
    optional?: Record<string, any>;
    hidden?: Record<string, any>;
  };
  output: string[];
  output_is_list: boolean[];
  output_name: string[];
  name: string;
  display_name: string;
  description: string;
  category: string;
  output_node: boolean;
}

// ── Parser ─────────────────────────────────────────────────────────────────

function parseObjectInfo(raw: Record<string, RawObjectInfoNode>, url: string): LiveNodeCache {
  const nodes: Record<string, LiveNodeSchema> = {};
  const categorySummary: Record<string, string[]> = {};
  const models: InstalledModels = createEmptyInstalledModels();

  for (const [classType, info] of Object.entries(raw)) {
    if (!info || typeof info !== 'object') continue;

    // Parse inputs
    const inputs: NodeInput[] = [];
    const parseInputs = (spec: Record<string, any> | undefined, isRequired: boolean) => {
      if (!spec) return;
      for (const [name, config] of Object.entries(spec)) {
        if (!Array.isArray(config) || config.length === 0) continue;
        const input = parseInputSpec(name, config, isRequired);
        if (input) inputs.push(input);
      }
    };

    parseInputs(info.input?.required, true);
    parseInputs(info.input?.optional, false);

    // Parse outputs
    const outputs: NodeOutput[] = (info.output || []).map((type: string, idx: number) => ({
      name: info.output_name?.[idx] || type,
      type,
      slotIndex: idx,
    }));

    nodes[classType] = {
      class_type: classType,
      display_name: info.display_name || classType,
      category: info.category || 'uncategorized',
      description: info.description || '',
      inputs,
      outputs,
      output_node: info.output_node || false,
    };

    // Category summary
    const cat = info.category || 'uncategorized';
    const topCat = cat.split('/')[0];
    if (!categorySummary[topCat]) categorySummary[topCat] = [];
    categorySummary[topCat].push(classType);

    // Extract model filenames from known loader nodes
    const loaderSpecs = MODEL_LOADER_MAP[classType];
    if (loaderSpecs) {
      for (const loaderSpec of loaderSpecs) {
        const inputSpec = info.input?.required?.[loaderSpec.input];
        if (Array.isArray(inputSpec) && Array.isArray(inputSpec[0])) {
          const filenames = inputSpec[0] as string[];
          models[loaderSpec.category] = [
            ...new Set([...(models[loaderSpec.category] || []), ...filenames]),
          ];
        }
      }
    }
  }

  // Try to extract embeddings from prompt encoding nodes
  for (const [classType, info] of Object.entries(raw)) {
    if (!classType.toLowerCase().includes('embedding')) continue;
    for (const [name, config] of Object.entries(info.input?.required || {})) {
      if (Array.isArray(config) && Array.isArray(config[0]) && name.toLowerCase().includes('embedding')) {
        models.embeddings = [...new Set([...models.embeddings, ...config[0]])];
      }
    }
  }

  return {
    url,
    timestamp: Date.now(),
    nodeCount: Object.keys(nodes).length,
    nodes,
    models,
    categorySummary,
  };
}

function parseInputSpec(name: string, config: any[], isRequired: boolean): NodeInput | null {
  // Hidden inputs (like "unique_id") — skip
  if (name === 'unique_id' || name === 'extra_pnginfo' || name === 'prompt') {
    // These are hidden system inputs, skip unless they look like real inputs
    // Actually, we'll still include them but mark as not required
  }

  const first = config[0];
  const meta = config[1] || {};

  // Case 1: Combo/dropdown — first element is an array of options
  if (Array.isArray(first)) {
    // Some custom nodes expose connection types as single-option arrays, e.g. ["UPSCALER"].
    if (first.length === 1 && typeof first[0] === 'string') {
      const possibleConnectionType = first[0].toUpperCase();
      if (isConnectionTypeName(possibleConnectionType)) {
        const input: NodeInput = {
          name,
          type: possibleConnectionType,
          isRequired,
          isWidget: false,
        };
        if (meta.tooltip) input.tooltip = meta.tooltip;
        return input;
      }
    }

    const input: NodeInput = {
      name,
      type: 'COMBO',
      isRequired,
      isWidget: true,
      options: first.map(String),
      default: meta.default,
      tooltip: meta.tooltip,
    };
    if (meta.control_after_generate === true) input.hasControlAfterGenerateWidget = true;
    if (meta.image_upload === true || meta.upload === true) input.hasUploadWidget = true;
    return input;
  }

  // Case 2: Type string (e.g. "MODEL", "INT", "FLOAT", "STRING", "BOOLEAN")
  if (typeof first === 'string') {
    const type = first.toUpperCase();
    const isConnection = isConnectionTypeName(type);
    const isWidget = !isConnection;

    const input: NodeInput = {
      name,
      type: first, // Keep original casing
      isRequired,
      isWidget: isConnection ? false : isWidget,
    };

    // Widget metadata
    if (meta.default !== undefined) input.default = meta.default;
    if (meta.min !== undefined) input.min = meta.min;
    if (meta.max !== undefined) input.max = meta.max;
    if (meta.tooltip) input.tooltip = meta.tooltip;
    if (meta.control_after_generate === true) input.hasControlAfterGenerateWidget = true;
    if (meta.image_upload === true || meta.upload === true) input.hasUploadWidget = true;
    if (meta.multiline !== undefined) {
      input.type = meta.multiline ? 'STRING_MULTILINE' : 'STRING';
    }

    return input;
  }

  return null;
}

// ── Cache Access ─────────────────────────────────────────────────────────────

export function getLiveNodeCache(): LiveNodeCache | null {
  if (inMemoryLiveNodeCache) return inMemoryLiveNodeCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveNodeCache;
    inMemoryLiveNodeCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLiveNodeCache(): void {
  inMemoryLiveNodeCache = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(MODEL_INVENTORY_KEY);
}

/**
 * Get a specific node's live schema by class_type.
 */
export function getLiveNodeSchema(classType: string): LiveNodeSchema | null {
  const cache = getLiveNodeCache();
  return cache?.nodes[classType] ?? null;
}

/**
 * Get live schemas for multiple class types (batch lookup).
 */
export function getLiveNodeSchemas(classTypes: string[]): LiveNodeSchema[] {
  const cache = getLiveNodeCache();
  if (!cache) return [];
  return classTypes.map(ct => cache.nodes[ct]).filter(Boolean) as LiveNodeSchema[];
}

/**
 * Get all installed model filenames.
 */
export function getInstalledModels(): InstalledModels | null {
  const cache = getLiveNodeCache();
  const inventory = getCachedModelInventoryMeta();
  if (inventory && cache?.timestamp && inventory.timestamp >= cache.timestamp) {
    return inventory.models;
  }
  if (cache?.models) return cache.models;
  return inventory?.models ?? null;
}

/**
 * Check if a live cache exists and how old it is.
 */
export function getCacheStatus(): { exists: boolean; nodeCount: number; ageMinutes: number; url: string } | null {
  const cache = getLiveNodeCache();
  if (!cache) return null;
  return {
    exists: true,
    nodeCount: cache.nodeCount,
    ageMinutes: Math.round((Date.now() - cache.timestamp) / 60000),
    url: cache.url,
  };
}

// ── Prompt Builders ──────────────────────────────────────────────────────────

/**
 * Build a compact "installed models" section for the system prompt.
 * Lists actual filenames so the AI uses real installed models.
 */
export function buildInstalledModelsPrompt(): string {
  const models = getInstalledModels();
  if (!models) return '';

  const sections: string[] = [];

  const addSection = (label: string, files: string[], maxShow: number = 15) => {
    if (files.length === 0) return;
    const shown = files.slice(0, maxShow);
    let s = `  ${label}: ${shown.map(f => `"${f}"`).join(', ')}`;
    if (files.length > maxShow) s += ` ... +${files.length - maxShow} more`;
    sections.push(s);
  };

  addSection('Checkpoints', models.checkpoints, 10);
  addSection('LoRAs', models.loras, 12);
  addSection('VAEs', models.vaes, 8);
  addSection('ControlNets', models.controlnets, 8);
  addSection('CLIP', models.clip, 6);
  addSection('CLIP Vision', models.clip_vision, 4);
  addSection('Upscale Models', models.upscale_models, 6);
  addSection('Embeddings', models.embeddings, 8);

  // Phase 3: Additional categories from expanded loader map
  if (models.ipadapter?.length) addSection('IP-Adapter', models.ipadapter, 6);
  if (models.instantid?.length) addSection('InstantID', models.instantid, 4);
  if (models.style_models?.length) addSection('Style Models', models.style_models, 4);
  if (models.gligen?.length) addSection('GLIGEN', models.gligen, 4);
  if (models.photomaker?.length) addSection('PhotoMaker', models.photomaker, 4);

  if (sections.length === 0) return '';

  return `\n### Installed Models (from user's ComfyUI)\nIMPORTANT: Use these EXACT filenames instead of generic defaults — they are confirmed installed on the user's system.\n${sections.join('\n')}\n`;
}

interface CachedRegistryPackSummary {
  id: string;
  title: string;
  nodeNames: string[];
}

interface CachedRegistryPackRaw {
  id?: string;
  title?: string;
  reference?: string;
  repository?: string;
  url?: string;
  nodenames?: unknown;
  node_names?: unknown;
  nodes?: unknown;
}

function slugifyPackTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeRegistryReference(reference: string): string {
  return reference.replace(/\.git$/i, '').replace(/\/+$/, '').trim().toLowerCase();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function readCachedManagerPayload<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: unknown } | unknown;
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return (parsed as { data?: T }).data ?? null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

function extractCachedPackList(payload: unknown): CachedRegistryPackRaw[] {
  if (Array.isArray(payload)) return payload as CachedRegistryPackRaw[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.custom_nodes)) return obj.custom_nodes as CachedRegistryPackRaw[];
  if (Array.isArray(obj.nodes)) return obj.nodes as CachedRegistryPackRaw[];
  if (Array.isArray(obj.data)) return obj.data as CachedRegistryPackRaw[];
  return [];
}

function buildCachedRegistryNodeMap(payload: unknown): Map<string, string[]> {
  const nodeMap = new Map<string, string[]>();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return nodeMap;

  for (const [url, value] of Object.entries(payload as Record<string, unknown>)) {
    const flattened: string[] = [];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (Array.isArray(item)) {
          flattened.push(...item.map((entry) => String(entry || '').trim()).filter(Boolean));
        } else if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed) flattened.push(trimmed);
        }
      }
    }
    const deduped = uniqueStrings(flattened);
    if (deduped.length === 0) continue;

    const raw = String(url || '').trim();
    const normalized = normalizeRegistryReference(raw);
    const variants = [
      raw,
      normalized,
      raw.replace(/\/tree\/main.*$/i, ''),
      raw.replace(/\/blob\/main.*$/i, ''),
      normalizeRegistryReference(raw.replace(/\/tree\/main.*$/i, '').replace(/\/blob\/main.*$/i, '')),
    ].filter((entry) => String(entry || '').trim().length > 0);

    for (const variant of variants) {
      nodeMap.set(String(variant), deduped);
    }
  }

  return nodeMap;
}

function getCachedPackNodeNames(pack: CachedRegistryPackRaw, nodeMap: Map<string, string[]>): string[] {
  const reference = String(pack.reference ?? pack.repository ?? pack.url ?? '').trim();
  const rawNames = uniqueStrings([
    ...toStringArray(pack.nodenames),
    ...toStringArray(pack.node_names),
    ...toStringArray(pack.nodes),
  ]);
  if (!reference) return rawNames;

  const normalized = normalizeRegistryReference(reference);
  const noTreeMain = reference.replace(/\/tree\/main.*$/i, '').replace(/\/blob\/main.*$/i, '');
  const candidates = [
    reference,
    normalized,
    noTreeMain,
    normalizeRegistryReference(noTreeMain),
  ];

  for (const key of candidates) {
    const mapped = nodeMap.get(key);
    if (mapped && mapped.length > 0) {
      return uniqueStrings([...mapped, ...rawNames]);
    }
  }

  return rawNames;
}

/**
 * Synchronously reads cached ComfyUI-Manager registry packs from localStorage.
 * Returns only lightweight fields needed for prompt conditioning.
 */
export function getCachedCustomRegistryPackSummaries(): CachedRegistryPackSummary[] {
  const listPayload = readCachedManagerPayload<unknown>(MANAGER_NODE_LIST_CACHE_KEY);
  if (!listPayload) return [];
  const list = extractCachedPackList(listPayload);
  if (list.length === 0) return [];

  const mapPayload = readCachedManagerPayload<unknown>(MANAGER_NODE_MAP_CACHE_KEY);
  const nodeMap = buildCachedRegistryNodeMap(mapPayload);

  const seenIds = new Set<string>();
  const summaries: CachedRegistryPackSummary[] = [];

  for (const pack of list) {
    const title = String(pack.title || '').trim();
    if (!title) continue;
    const nodeNames = getCachedPackNodeNames(pack, nodeMap);
    if (nodeNames.length === 0) continue;

    let id = String(pack.id || '').trim();
    if (!id) id = slugifyPackTitle(title);
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    summaries.push({
      id,
      title,
      nodeNames,
    });
  }

  return summaries.sort((a, b) => a.title.localeCompare(b.title));
}

function detectInstalledCustomPacksFromLiveCache(cache: LiveNodeCache): string[] {
  const registryPacks = getCachedCustomRegistryPackSummaries();
  if (registryPacks.length === 0) return [];

  const liveNodeTypes = new Set(Object.keys(cache.nodes));
  const titles = new Set<string>();
  for (const pack of registryPacks) {
    if (pack.nodeNames.some((nodeName) => liveNodeTypes.has(nodeName))) {
      titles.add(pack.title);
    }
  }
  return [...titles].sort((a, b) => a.localeCompare(b));
}

interface NodeAvailabilitySummaryOptions {
  loadedPackTitles?: string[];
  loadedNodeCount?: number;
  schemaMode?: 'full' | 'compact' | 'off';
}

/**
 * Build a compact node availability summary for the system prompt.
 * Groups all available node class names by top-level category.
 */
export function buildNodeAvailabilitySummary(options: NodeAvailabilitySummaryOptions = {}): string {
  const cache = getLiveNodeCache();
  if (!cache) return '';

  const cats = Object.entries(cache.categorySummary)
    .sort(([, a], [, b]) => b.length - a.length);

  if (cats.length === 0) return '';

  // Only include the summary line and top categories
  let summary = `\n### Live Node Registry (${cache.nodeCount} nodes synced from ComfyUI)\n`;
  summary += `Available node categories: `;
  summary += cats.map(([cat, nodes]) => `${cat} (${nodes.length})`).join(', ');
  summary += '\n';

  const installedPacks = detectInstalledCustomPacksFromLiveCache(cache);
  if (installedPacks.length > 0) {
    const loadedSet = new Set((options.loadedPackTitles || []).map((title) => title.toLowerCase().trim()));
    const loadedInstalled = installedPacks.filter((title) => loadedSet.has(title.toLowerCase().trim()));
    const unloadedInstalled = installedPacks.filter((title) => !loadedSet.has(title.toLowerCase().trim()));

    if (loadedInstalled.length > 0) {
      summary += '\nInstalled packs WITH schemas loaded in Schema Drawer:\n';
      summary += loadedInstalled.map((packTitle) => `- ${packTitle}`).join('\n');
      if (typeof options.loadedNodeCount === 'number' && options.loadedNodeCount >= 0) {
        summary += `\nLoaded live schema nodes: ${options.loadedNodeCount}`;
      }
      summary += '\n';
    }

    if (unloadedInstalled.length > 0) {
      summary += '\nInstalled packs WITHOUT schemas loaded (name-only awareness):\n';
      summary += unloadedInstalled.map((packTitle) => `- ${packTitle}`).join('\n');
      summary += '\nIf precise node specs are needed, tell the user to enable the pack in Schema Drawer.\n';
    }

    if (options.schemaMode === 'off') {
      summary += '\nSchema Drawer mode is OFF; no live schemas are injected.\n';
    }

    summary += '\nDO NOT tell the user to install any of the installed packs listed above.\n';
  }

  return summary;
}

interface SchemaDrawerSectionOptions {
  mode: 'full' | 'compact' | 'off';
  nodeToPackTitle?: Map<string, string> | Record<string, string>;
  log?: boolean;
}

function resolvePackTitleForNode(
  classType: string,
  mapping?: Map<string, string> | Record<string, string>,
): string {
  if (!mapping) return 'ComfyUI Core / Other';
  if (mapping instanceof Map) {
    return mapping.get(classType) || 'ComfyUI Core / Other';
  }
  return mapping[classType] || 'ComfyUI Core / Other';
}

function formatLiveNodeForPromptFull(schema: LiveNodeSchema): string {
  const lines: string[] = [];
  let header = `### ${schema.class_type}`;
  if (schema.display_name && schema.display_name !== schema.class_type) {
    header += ` ("${schema.display_name}")`;
  }
  lines.push(header);
  lines.push(`Category: ${schema.category || 'uncategorized'}`);
  if (schema.description) lines.push(`Description: ${schema.description}`);
  lines.push('Inputs:');

  if (!schema.inputs || schema.inputs.length === 0) {
    lines.push('  - (none)');
  } else {
    for (const input of schema.inputs) {
      const parts: string[] = [];
      parts.push(`  - ${input.name}: ${input.type}`);
      parts.push(input.isWidget ? '(widget)' : '(connection)');
      if (input.isRequired) parts.push('[required]');
      else parts.push('[optional]');
      if (input.options && input.options.length > 0) {
        parts.push(`[options: ${input.options.join(', ')}]`);
      }
      if (input.default !== undefined) {
        parts.push(`[default: ${JSON.stringify(input.default)}]`);
      }
      if (input.min !== undefined || input.max !== undefined) {
        parts.push(`[range: ${input.min ?? ''}..${input.max ?? ''}]`);
      }
      lines.push(parts.join(' '));
    }
  }

  lines.push('Outputs:');
  if (!schema.outputs || schema.outputs.length === 0) {
    lines.push('  - (none)');
  } else {
    for (const output of schema.outputs) {
      lines.push(`  - slot ${output.slotIndex}: ${output.name} (${output.type})`);
    }
  }

  return `${lines.join('\n')}\n\n`;
}

/**
 * Build a prompt section with live schemas selected in the Schema Drawer.
 * This is the source-of-truth section for explicitly loaded node schemas.
 */
export function buildSchemaDrawerSection(
  selectedNodes: Record<string, LiveNodeSchema>,
  options: SchemaDrawerSectionOptions,
): string {
  const shouldLog = options.log !== false;
  if (options.mode === 'off') {
    if (shouldLog) {
      console.log('[SchemaDrawer] Injected 0 node schemas from 0 packs (mode=off)');
    }
    return '';
  }

  const entries = Object.entries(selectedNodes || {});
  if (entries.length === 0) {
    if (shouldLog) {
      console.log('[SchemaDrawer] Injected 0 node schemas from 0 packs (empty selection)');
    }
    return '';
  }

  const grouped = new Map<string, LiveNodeSchema[]>();
  for (const [classType, schema] of entries) {
    const packTitle = resolvePackTitleForNode(classType, options.nodeToPackTitle);
    const bucket = grouped.get(packTitle) || [];
    bucket.push(schema);
    grouped.set(packTitle, bucket);
  }

  const sortedGroups = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let section = '\n## Live Node Schemas (Schema Drawer Selection)\n\n';
  section += 'These are exact schemas from /object_info. Use them for precise inputs, outputs, widgets, and valid values.\n\n';

  let totalNodes = 0;
  for (const [packTitle, schemas] of sortedGroups) {
    const sortedSchemas = [...schemas].sort((a, b) => a.class_type.localeCompare(b.class_type));
    section += `### ${packTitle} (${sortedSchemas.length} nodes)\n\n`;
    for (const schema of sortedSchemas) {
      section += options.mode === 'full'
        ? formatLiveNodeForPromptFull(schema)
        : formatLiveNodeForPrompt(schema);
      totalNodes += 1;
    }
  }

  const approxTokens = Math.ceil(section.length / 4);
  if (shouldLog) {
    console.log(
      `[SchemaDrawer] Injected ${totalNodes} node schemas from ${sortedGroups.length} packs (${section.length} chars, ~${approxTokens} tokens, mode=${options.mode})`,
    );
  }

  return section;
}

/**
 * Format a single live node schema into the prompt format used by pack-suggester.
 * This matches the format of `custom-node-schemas.ts` so Tier 0 injection
 * is seamless.
 */
export function formatLiveNodeForPrompt(schema: LiveNodeSchema): string {
  let s = `  ${schema.class_type}`;
  if (schema.display_name !== schema.class_type) {
    s += ` ("${schema.display_name}")`;
  }
  s += '\n';

  const inputs = schema.inputs || [];
  const outputs = schema.outputs || [];

  // Connection inputs
  const connInputs = inputs.filter(i => !i.isWidget);
  if (connInputs.length > 0) {
    s += '    Inputs: ' + connInputs.map(i => {
      let desc = `${i.name}:${i.type}`;
      if (!i.isRequired) desc += '?';
      return desc;
    }).join(', ') + '\n';
  }

  // Widget inputs (compact)
  const widgets = inputs.filter(i => i.isWidget);
  if (widgets.length > 0) {
    const widgetDescs = widgets.map(i => {
      let desc = `${i.name}:${i.type}`;
      if (i.options && i.options.length > 0) desc += `[${i.options.join('|')}]`;
      if (i.min !== undefined) desc += `,min=${i.min}`;
      if (i.max !== undefined) desc += `,max=${i.max}`;
      if (i.default !== undefined) desc += `,default=${JSON.stringify(i.default)}`;
      return desc;
    });
    s += '    Widgets: ' + widgetDescs.join(', ') + '\n';
    s += `    WidgetOrder: [${widgets.map((input) => input.name).join(', ')}]\n`;
  }

  // Outputs
  if (outputs.length > 0) {
    s += '    Outputs: ' + outputs.map(o => `${o.name}:${o.type}`).join(', ') + '\n';
  }

  return s;
}

// ── Phase 3: Model Architecture Detection ─────────────────────��──────────────

export type ModelArchitecture =
  | 'SD 1.5' | 'SD 2.x' | 'SDXL' | 'SDXL Turbo' | 'SD 3'
  | 'FLUX' | 'FLUX Schnell' | 'Pony' | 'Cascade'
  | 'PixArt' | 'Kolors' | 'Hunyuan' | 'AuraFlow'
  | 'ZImage'
  | 'Unknown';

export interface ModelIntelligence {
  architecture: ModelArchitecture;
  resolution?: string;
  cfgRange?: string;
  description?: string;
  subcategory?: string;
}

/** Heuristic rules: [pattern, architecture]. First match wins. */
const ARCH_PATTERNS: [RegExp, ModelArchitecture][] = [
  [/z[_-]?image|zimage/i, 'ZImage'],
  [/flux[_-]?1.*schnell/i, 'FLUX Schnell'],
  [/flux/i, 'FLUX'],
  [/sd[_-]?3/i, 'SD 3'],
  [/sdxl.*turbo|turbo.*sdxl/i, 'SDXL Turbo'],
  [/cascade|wurstchen/i, 'Cascade'],
  [/pony/i, 'Pony'],
  [/sdxl|sd[_-]?xl|stable[_-]?diffusion[_-]?xl/i, 'SDXL'],
  [/sd[_-]?2|v2[_-]1|768[_-]v/i, 'SD 2.x'],
  [/pixart/i, 'PixArt'],
  [/kolors/i, 'Kolors'],
  [/hunyuan/i, 'Hunyuan'],
  [/aura[_-]?flow/i, 'AuraFlow'],
  [/sd[_-]?1[._-]?5|v1[._-]?5|sd15|dreamshaper|deliberate|realistic[_-]?vision|cyberrealistic|majicmix|counterfeit|anything[_-]?v|abyssorange/i, 'SD 1.5'],
];

/**
 * Detect the likely model architecture from a filename.
 */
export function detectModelArchitecture(filename: string): ModelArchitecture {
  for (const [pattern, arch] of ARCH_PATTERNS) {
    if (pattern.test(filename)) return arch;
  }
  return 'Unknown';
}

const ARCH_RESOLUTIONS: Partial<Record<ModelArchitecture, string>> = {
  'SD 1.5': '512x512',
  'SD 2.x': '768x768',
  'SDXL': '1024x1024',
  'SDXL Turbo': '512x512 (fast)',
  'SD 3': '1024x1024',
  'FLUX': '1024x1024 (or higher)',
  'FLUX Schnell': '1024x1024 (1-4 steps)',
  'Cascade': '1024x1024',
  'PixArt': '1024x1024',
  'Kolors': '1024x1024',
  'Hunyuan': '1024x1024',
  'Pony': '1024x1024 (SDXL-based)',
  ZImage: '1024x1024+',
};

const ARCH_CFG_RANGES: Partial<Record<ModelArchitecture, string>> = {
  'SD 1.5': '7-12',
  'SD 2.x': '7-12',
  'SDXL': '5-9',
  'SDXL Turbo': '1-2',
  'SD 3': '4-7',
  'FLUX': '1-4',
  'FLUX Schnell': '1',
  'Cascade': '4-8',
  Pony: '5-9',
};

function detectUpscalerIntelligence(filename: string): ModelIntelligence {
  const patterns: Array<[RegExp, string, string]> = [
    [/animesharp.*v4.*rcan|rcan.*animesharp/i, '2x anime upscaler (RCAN, fast)', 'anime'],
    [/4x.*animesharp/i, '4x anime upscaler (sharp)', 'anime'],
    [/2x.*animesharp/i, '2x anime upscaler (sharp)', 'anime'],
    [/aniscale/i, '2x anime upscaler (Omni)', 'anime'],
    [/realesrgan.*x4plus.*anime/i, '4x anime upscaler (RealESRGAN)', 'anime'],
    [/realesrgan.*x4/i, '4x real-photo upscaler (RealESRGAN)', 'photo'],
    [/realesrgan.*x2/i, '2x real-photo upscaler (RealESRGAN)', 'photo'],
    [/esrgan/i, 'ESRGAN upscaler', 'general'],
    [/4x.*ultrasharp.*v2|ultrasharp.*v2/i, '4x sharp detail upscaler v2', 'general'],
    [/4x.*ultrasharp|ultrasharp.*4x|kim.*ultrasharp/i, '4x sharp detail upscaler', 'general'],
    [/nomos2.*hq.*dat2|dat2.*nomos/i, '4x high-quality upscaler (DAT2, transformer)', 'general'],
    [/realwebphoto.*dat2/i, '4x web photo upscaler (DAT2)', 'photo'],
    [/nomos.*span|span.*nomos/i, '2x upscaler (SPAN, lightweight)', 'general'],
    [/liveaction.*span|span.*liveaction/i, '2x live-action upscaler (SPAN)', 'photo'],
    [/hat[_-]?l.*sr/i, 'HAT-L upscaler (hybrid attention, 4x, high quality)', 'general'],
    [/swinir/i, 'SwinIR upscaler (transformer-based)', 'general'],
    [/hat[_-]/i, 'HAT upscaler (hybrid attention)', 'general'],
    [/nmkd[_-]siax/i, 'NMKD-Siax upscaler', 'general'],
    [/span/i, 'SPAN upscaler (lightweight)', 'general'],
    [/dat2?/i, 'DAT upscaler (transformer)', 'general'],
    [/4x/i, '4x upscaler', 'general'],
    [/2x/i, '2x upscaler', 'general'],
    [/8x/i, '8x upscaler', 'general'],
  ];
  for (const [pattern, description, subcategory] of patterns) {
    if (pattern.test(filename)) return { architecture: 'Unknown', description, subcategory };
  }
  return { architecture: 'Unknown', description: 'Upscale model' };
}

function detectVaeIntelligence(filename: string): ModelIntelligence {
  const patterns: Array<[RegExp, ModelArchitecture, string]> = [
    [/sdxl|xl[_-]vae/i, 'SDXL', 'SDXL-specific VAE'],
    [/flux|ae\.safetensors/i, 'FLUX', 'FLUX VAE'],
    [/sd[_-]?3/i, 'SD 3', 'SD 3 VAE'],
    [/kl-f8-anime/i, 'SD 1.5', 'SD 1.5 anime VAE'],
    [/vae-ft-mse/i, 'SD 1.5', 'SD 1.5 MSE VAE'],
    [/vae-ft-ema/i, 'SD 1.5', 'SD 1.5 EMA VAE'],
    [/taesd/i, 'Unknown', 'Tiny AutoEncoder (preview)'],
    [/consistency|lcm/i, 'Unknown', 'LCM/Consistency VAE'],
  ];
  for (const [pattern, architecture, description] of patterns) {
    if (pattern.test(filename)) return { architecture, description };
  }
  return { architecture: 'Unknown', description: 'VAE decoder/encoder' };
}

function detectControlNetIntelligence(filename: string): ModelIntelligence {
  let architecture: ModelArchitecture = 'Unknown';
  if (/sdxl|xl/i.test(filename)) architecture = 'SDXL';
  else if (/sd15|sd[_-]?1/i.test(filename)) architecture = 'SD 1.5';
  else if (/flux/i.test(filename)) architecture = 'FLUX';

  const kinds: Array<[RegExp, string]> = [
    [/canny/i, 'canny edge detection'],
    [/depth|midas|zoe/i, 'depth map'],
    [/openpose|pose/i, 'pose estimation'],
    [/scribble|sketch/i, 'scribble/sketch'],
    [/lineart|line[_-]?art/i, 'line art'],
    [/softedge|hed|pidinet/i, 'soft edge'],
    [/normal/i, 'normal map'],
    [/seg|segment/i, 'segmentation'],
    [/shuffle/i, 'shuffle (style transfer)'],
    [/tile/i, 'tile (detail enhancement)'],
    [/inpaint/i, 'inpainting'],
    [/ip[_-]?adapter|ipadapter/i, 'IP-Adapter (image prompt)'],
    [/instant[_-]?id/i, 'InstantID (face)'],
    [/qr/i, 'QR code'],
  ];
  let subcategory = 'unknown';
  let label = 'ControlNet model';
  for (const [pattern, kind] of kinds) {
    if (pattern.test(filename)) {
      subcategory = kind;
      label = `ControlNet: ${kind}`;
      break;
    }
  }

  return {
    architecture,
    description: `${label} (${architecture})`,
    subcategory,
  };
}

function detectClipIntelligence(filename: string): ModelIntelligence {
  const patterns: Array<[RegExp, ModelArchitecture, string]> = [
    [/qwen.*3.*4b|qwen3.*4b/i, 'ZImage', 'Qwen 3 4B text encoder (ZImage)'],
    [/qwen/i, 'Unknown', 'Qwen text encoder'],
    [/t5.*xxl|t5-xxl/i, 'FLUX', 'T5-XXL text encoder (FLUX/SD3)'],
    [/clip.*bigg|bigg.*clip/i, 'SDXL', 'CLIP-bigG (SDXL second encoder)'],
    [/clip.*vit.*large.*14/i, 'SD 1.5', 'CLIP ViT-L/14 text encoder'],
    [/clip.*vit.*h/i, 'SDXL', 'CLIP ViT-H text encoder'],
    [/open.*clip/i, 'Unknown', 'OpenCLIP text encoder'],
    [/flux/i, 'FLUX', 'FLUX text encoder'],
    [/sd3|sd[_-]?3/i, 'SD 3', 'SD 3 text encoder'],
  ];
  for (const [pattern, architecture, description] of patterns) {
    if (pattern.test(filename)) return { architecture, description };
  }
  return { architecture: 'Unknown', description: 'Text encoder' };
}

function detectEmbeddingIntelligence(filename: string): ModelIntelligence {
  let architecture: ModelArchitecture = 'Unknown';
  if (/sdxl|xl/i.test(filename)) architecture = 'SDXL';
  else if (/sd15|v1|1\.5/i.test(filename)) architecture = 'SD 1.5';

  if (/bad.*quality|easyneg|ng_deepneg|bad.*hand|verybadimagenegative/i.test(filename)) {
    return { architecture, description: 'Negative embedding (quality control)' };
  }
  return { architecture, description: 'Textual inversion embedding' };
}

function detectDiffusionModelIntelligence(filename: string): ModelIntelligence {
  const architecture = detectModelArchitecture(filename);
  const description = architecture === 'ZImage'
    ? 'ZImage diffusion model (UNet)'
    : `${architecture} diffusion model (UNet)`;
  return {
    architecture,
    description,
    resolution: ARCH_RESOLUTIONS[architecture],
    cfgRange: ARCH_CFG_RANGES[architecture],
  };
}

export function getModelIntelligence(filename: string, category: string): ModelIntelligence {
  const normalized = String(filename || '').toLowerCase();
  switch (category) {
    case 'checkpoints': {
      const architecture = detectModelArchitecture(filename);
      return {
        architecture,
        description: `${architecture} checkpoint`,
        resolution: ARCH_RESOLUTIONS[architecture],
        cfgRange: ARCH_CFG_RANGES[architecture],
      };
    }
    case 'loras': {
      const architecture = detectModelArchitecture(filename);
      return { architecture, description: `${architecture} LoRA` };
    }
    case 'vaes':
      return detectVaeIntelligence(normalized);
    case 'upscale_models':
    case 'latent_upscale_models':
      return detectUpscalerIntelligence(normalized);
    case 'controlnets':
      return detectControlNetIntelligence(normalized);
    case 'clip':
    case 'text_encoders':
      return detectClipIntelligence(normalized);
    case 'clip_vision':
      return { architecture: 'Unknown', description: 'CLIP vision encoder' };
    case 'embeddings':
      return detectEmbeddingIntelligence(normalized);
    case 'unet':
    case 'diffusion_models':
      return detectDiffusionModelIntelligence(normalized);
    default:
      return { architecture: detectModelArchitecture(filename) };
  }
}

export interface ModelInfo {
  filename: string;
  category: string;
  architecture: ModelArchitecture;
  categoryLabel: string;
  description?: string;
  resolution?: string;
  cfgRange?: string;
  subcategory?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  checkpoints: 'Checkpoints',
  loras: 'LoRAs',
  vaes: 'VAEs',
  controlnets: 'ControlNets',
  clip: 'CLIP',
  clip_vision: 'CLIP Vision',
  upscale_models: 'Upscale Models',
  embeddings: 'Embeddings',
  ipadapter: 'IP-Adapter',
  instantid: 'InstantID',
  style_models: 'Style Models',
  gligen: 'GLIGEN',
  photomaker: 'PhotoMaker',
  unet: 'UNets',
  diffusion_models: 'Diffusion Models',
  text_encoders: 'Text Encoders',
  hypernetworks: 'Hypernetworks',
  latent_upscale_models: 'Latent Upscale Models',
  animatediff_models: 'AnimateDiff Models',
  animatediff_motion_lora: 'AnimateDiff Motion LoRAs',
  audio_encoders: 'Audio Encoders',
  configs: 'Configs',
  model_patches: 'Model Patches',
  vae_approx: 'VAE Approx',
  llm: 'LLM',
  diffusers: 'Diffusers',
};

export function getModelCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

export function getKnownModelCategories(): string[] {
  const categories = new Set<string>(Object.values(MODEL_FOLDER_CATEGORY_MAP));
  categories.add('checkpoints');
  categories.add('loras');
  categories.add('vaes');
  categories.add('controlnets');
  categories.add('clip');
  categories.add('clip_vision');
  categories.add('upscale_models');
  categories.add('embeddings');
  return [...categories].sort((a, b) => a.localeCompare(b));
}

/**
 * Get all installed models with architecture detection, suitable for the UI.
 */
export function getInstalledModelsWithInfo(): ModelInfo[] {
  const models = getInstalledModels();
  if (!models) return [];

  const result: ModelInfo[] = [];
  for (const [category, filenames] of Object.entries(models)) {
    if (!Array.isArray(filenames) || filenames.length === 0) continue;
    const label = getModelCategoryLabel(category);
    for (const filename of filenames) {
      const intelligence = getModelIntelligence(filename, category);
      result.push({
        filename,
        category,
        architecture: intelligence.architecture,
        categoryLabel: label,
        description: intelligence.description,
        resolution: intelligence.resolution,
        cfgRange: intelligence.cfgRange,
        subcategory: intelligence.subcategory,
      });
    }
  }
  return result;
}

/**
 * Get a summary of model counts by category for quick display.
 */
export function getModelCategorySummary(): { category: string; label: string; count: number }[] {
  const models = getInstalledModels();
  if (!models) return [];
  return Object.entries(models)
    .filter(([, files]) => Array.isArray(files) && files.length > 0)
    .map(([cat, files]) => ({
      category: cat,
      label: getModelCategoryLabel(cat),
      count: files.length,
    }))
    .sort((a, b) => b.count - a.count);
}

// ── Phase 3: Model Validation ────────────────────────────────────────────────

export interface ModelValidationResult {
  found: { nodeId: number; nodeType: string; inputName: string; filename: string; category: string }[];
  missing: { nodeId: number; nodeType: string; inputName: string; filename: string; category: string }[];
}

function modelBasename(filepath: string): string {
  const normalized = filepath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return (parts[parts.length - 1] || normalized).toLowerCase();
}

function normalizeModelPath(value: string): string {
  return String(value || '').replace(/\\/g, '/').trim().toLowerCase();
}

function isModelInstalled(filename: string, allInstalled: Set<string>): boolean {
  const normalizedFilename = normalizeModelPath(filename);
  if (!normalizedFilename) return false;

  // Exact and case-insensitive exact.
  for (const installed of allInstalled) {
    const normalizedInstalled = normalizeModelPath(installed);
    if (!normalizedInstalled) continue;
    if (normalizedInstalled === normalizedFilename) return true;
  }

  // Basename match.
  const filenameBasename = modelBasename(normalizedFilename);
  for (const installed of allInstalled) {
    const normalizedInstalled = normalizeModelPath(installed);
    if (!normalizedInstalled) continue;
    if (modelBasename(normalizedInstalled) === filenameBasename) return true;
  }

  // Suffix match (handles prefixed paths in either source).
  for (const installed of allInstalled) {
    const normalizedInstalled = normalizeModelPath(installed);
    if (!normalizedInstalled) continue;
    if (
      normalizedInstalled.endsWith(normalizedFilename)
      || normalizedFilename.endsWith(normalizedInstalled)
    ) {
      return true;
    }
  }

  return false;
}

function collectInstalledModelFilenames(): Set<string> {
  const allInstalled = new Set<string>();

  // Source 1: merged installed model inventory.
  const models = getInstalledModels();
  if (models) {
    for (const files of Object.values(models)) {
      if (!Array.isArray(files)) continue;
      for (const file of files) {
        if (typeof file === 'string' && file.trim().length > 0) {
          allInstalled.add(file.trim());
        }
      }
    }
  }

  // Source 2: /object_info dropdown options from known loader inputs.
  const liveCache = getLiveNodeCache();
  if (liveCache?.nodes) {
    for (const [nodeType, specs] of Object.entries(MODEL_LOADER_MAP)) {
      const schema = liveCache.nodes[nodeType];
      if (!schema || !Array.isArray(specs)) continue;
      for (const spec of specs) {
        const input = schema.inputs.find((i) => i.name === spec.input);
        if (!input?.options || !Array.isArray(input.options)) continue;
        for (const option of input.options) {
          if (typeof option === 'string' && option.trim().length > 0) {
            allInstalled.add(option.trim());
          }
        }
      }
    }
  }

  return allInstalled;
}

/**
 * Validate all model file references in a workflow against the installed models list.
 */
export function validateModelReferences(workflow: { nodes: Array<{ id: number; type: string; widgets_values?: any[] }> }): ModelValidationResult {
  const allInstalled = collectInstalledModelFilenames();
  if (allInstalled.size === 0) return { found: [], missing: [] };

  const result: ModelValidationResult = { found: [], missing: [] };

  for (const node of workflow.nodes) {
    const loaderSpecs = MODEL_LOADER_MAP[node.type];
    if (!loaderSpecs || !node.widgets_values) continue;

    // Get schema for widget name mapping
    const schema = getLiveNodeSchema(node.type);
    if (!schema) continue;

    const widgetInputs = schema.inputs.filter(i => i.isWidget);

    for (const spec of loaderSpecs) {
      const widgetIdx = widgetInputs.findIndex(i => i.name === spec.input);
      if (widgetIdx === -1) continue;

      // Simple positional index for widgets_values
      // Note: control_after_generate values may shift indices, but for model
      // filenames (always first widget in loaders) this is reliable
      if (widgetIdx >= node.widgets_values.length) continue;
      const filename = node.widgets_values[widgetIdx];
      if (typeof filename !== 'string' || !filename.trim()) continue;
      const normalizedFilename = filename.trim();

      const entry = {
        nodeId: node.id,
        nodeType: node.type,
        inputName: spec.input,
        filename: normalizedFilename,
        category: spec.category as string,
      };

      if (isModelInstalled(normalizedFilename, allInstalled)) {
        result.found.push(entry);
      } else {
        result.missing.push(entry);
      }
    }
  }

  return result;
}

// ── Graph → API Conversion ───────────────────────────────────────────────────

/**
 * Convert a ComfyUI graph/UI format workflow into the API format
 * expected by ComfyUI's /prompt endpoint.
 *
 * API format is: { "nodeId": { class_type, inputs: { ... } } }
 * where connection inputs are [sourceNodeId, sourceSlot] tuples.
 *
 * Uses live node cache (if available) for better widget-name mapping,
 * falling back to the static NODE_REGISTRY.
 */
export function convertGraphToAPI(workflow: ComfyUIWorkflow): Record<string, any> {
  const apiWorkflow: Record<string, any> = {};
  const cache = getLiveNodeCache();

  for (const node of workflow.nodes) {
    if (FRONTEND_ONLY_NODE_TYPES.has(node.type)) {
      // Frontend-only nodes are not executable on ComfyUI backend.
      continue;
    }

    const inputs: Record<string, any> = {};

    // Determine widget/connection inputs from live cache or static registry.
    const liveSchema = cache?.nodes[node.type];
    const staticSchema = NODE_REGISTRY.get(node.type);
    const resolvedSchema = liveSchema || staticSchema;
    const schemaInputs = resolvedSchema ? (resolvedSchema.inputs || []) : [];
    const hasExactSchema = Boolean(resolvedSchema);

    const widgetInputs = schemaInputs.filter((input) => input.isWidget);
    const schemaConnectionInputs = schemaInputs.filter((input) => !input.isWidget);
    const widgetCountExpectation = getWidgetValueCountExpectation(widgetInputs);
    const expectedWidgetValueCount = widgetCountExpectation.baseCount;
    const expectedWidgetValueCountWithCompanions = widgetCountExpectation.withCompanions;

    // If graph input metadata is missing, fall back to schema connection names.
    const connectionInputs = (node.inputs && node.inputs.length > 0)
      ? node.inputs
      : schemaConnectionInputs.map((input) => ({
        name: input.name,
        type: input.type,
        link: null,
      }));
    const connectionInputNames = new Set<string>(
      schemaConnectionInputs
        .map((input) => input.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0),
    );
    for (const input of connectionInputs) {
      const name = input?.name;
      if (typeof name !== 'string' || name.length === 0) continue;
      if (isGraphConnectionInputDefinition(input)) {
        connectionInputNames.add(name);
      }
    }

    // Map widget values by name and coerce known primitive types.
    if (node.widgets_values && node.widgets_values.length > 0) {
      if (!hasExactSchema) {
        const nodeInputDefs = node.inputs || [];
        node.widgets_values.forEach((val, idx) => {
          if (val === undefined) return;
          const inputDef = nodeInputDefs[idx];
          inputs[inputDef?.name || `widget_${idx}`] = val;
        });
        console.log(`[WidgetMap] ${node.type}: no exact schema, positional fallback with ${node.widgets_values.length} values`);
      } else {
        const valueCount = node.widgets_values.length;
        const matchesBaseCount = expectedWidgetValueCount > 0 && valueCount === expectedWidgetValueCount;
        const matchesCompanionCount = widgetCountExpectation.companionCount > 0
          && valueCount === expectedWidgetValueCountWithCompanions;

        if (expectedWidgetValueCount > 0 && !matchesBaseCount && !matchesCompanionCount) {
          console.warn(
            `[WidgetMap] ${node.type} (node ${node.id}): values count ${valueCount} `
            + `!== expected ${expectedWidgetValueCount}`
            + `${widgetCountExpectation.companionCount > 0 ? ` (or ${expectedWidgetValueCountWithCompanions} with companions)` : ''} `
            + '- skipping stale positional mapping',
          );

          const namedWidgetInputs = buildWidgetInputsFromNamedNodeInputs(node, connectionInputNames);
          if (Object.keys(namedWidgetInputs).length > 0) {
            Object.assign(inputs, namedWidgetInputs);
          }
          applyRequiredWidgetDefaults(widgetInputs, inputs);
        } else {
          if (matchesCompanionCount) {
            console.debug(
              `[WidgetMap] ${node.type} (node ${node.id}): ${widgetCountExpectation.companionCount} companion widget(s) detected, mapping normally`,
            );
          }
          const rawMappedInputs = mapWidgetValuesFromRawObjectInfo(node.type, node.widgets_values, connectionInputNames);
          if (Object.keys(rawMappedInputs).length > 0) {
            Object.assign(inputs, rawMappedInputs);
          } else if (widgetInputs.length > 0) {
            mapWidgetValuesFromSchema(widgetInputs, node.widgets_values, inputs);
          }
        }
      }
    } else if ((!node.widgets_values || node.widgets_values.length === 0) && widgetInputs.length > 0) {
      // Preserve required widget defaults when widgets_values is missing.
      applyRequiredWidgetDefaults(widgetInputs, inputs);
    }

    // Map connection inputs from links.
    for (const link of workflow.links) {
      const [, srcNode, srcSlot, tgtNode, tgtSlot] = link;
      if (tgtNode === node.id) {
        const tgtInputName = connectionInputs?.[tgtSlot]?.name;
        if (tgtInputName) {
          inputs[tgtInputName] = [String(srcNode), Number(srcSlot)];
        }
      }
    }

    apiWorkflow[String(node.id)] = {
      class_type: node.type,
      inputs,
    };
  }

  return apiWorkflow;
}

function mapWidgetValuesFromSchema(
  widgetInputs: NodeInput[],
  widgetValues: any[],
  targetInputs: Record<string, any>,
): void {
  let widgetIndex = 0;
  for (const input of widgetInputs) {
    if (widgetIndex < widgetValues.length && widgetValues[widgetIndex] !== undefined) {
      targetInputs[input.name] = coerceWidgetValue(widgetValues[widgetIndex], input);
    } else if (input.isRequired && input.default !== undefined) {
      targetInputs[input.name] = coerceWidgetValue(input.default, input);
    }

    widgetIndex += 1;
    if (expectsSchemaCompanionWidget(input)) {
      widgetIndex += 1;
    }
  }
}

function getWidgetValueCountExpectation(widgetInputs: NodeInput[]): {
  baseCount: number;
  companionCount: number;
  withCompanions: number;
} {
  let baseCount = 0;
  let companionCount = 0;
  for (const input of widgetInputs) {
    baseCount += 1;
    if (expectsSchemaCompanionWidget(input)) {
      companionCount += 1;
    }
  }
  return {
    baseCount,
    companionCount,
    withCompanions: baseCount + companionCount,
  };
}

function expectsSchemaCompanionWidget(input: NodeInput): boolean {
  const name = String(input.name || '').trim().toLowerCase();
  const normalizedType = String(input.type || '').toUpperCase().replace(/_MULTILINE$/, '');
  const seedCompanion = normalizedType === 'INT' && name.includes('seed');
  return seedCompanion || input.hasControlAfterGenerateWidget === true || input.hasUploadWidget === true;
}

function buildWidgetInputsFromNamedNodeInputs(
  node: any,
  connectionInputNames: Set<string>,
): Record<string, any> {
  const rawInputs = node?.inputs;
  if (!rawInputs || typeof rawInputs !== 'object' || Array.isArray(rawInputs)) return {};

  const named: Record<string, any> = {};
  for (const [name, value] of Object.entries(rawInputs)) {
    if (connectionInputNames.has(name)) continue;
    if (Array.isArray(value) && value.length === 2 && (typeof value[0] === 'string' || typeof value[0] === 'number') && typeof value[1] === 'number') {
      continue;
    }
    named[name] = value;
  }
  return named;
}

function applyRequiredWidgetDefaults(
  widgetInputs: NodeInput[],
  targetInputs: Record<string, any>,
): void {
  for (const input of widgetInputs) {
    if (targetInputs[input.name] !== undefined) continue;
    if (input.isRequired && input.default !== undefined) {
      targetInputs[input.name] = coerceWidgetValue(input.default, input);
    }
  }
}

function mapWidgetValuesFromRawObjectInfo(
  classType: string,
  widgetValues: any[],
  connectionInputNames: Set<string>,
): Record<string, any> {
  const rawInfo = getRawObjectInfo();
  const nodeInfo = rawInfo?.[classType];
  if (!nodeInfo || !widgetValues || widgetValues.length === 0) {
    return {};
  }

  const widgetInputNames: string[] = [];
  const inputConfigs: Record<string, any> = {};

  const collectWidgetInputs = (spec: Record<string, any> | undefined): void => {
    if (!spec) return;
    for (const [name, config] of Object.entries(spec)) {
      inputConfigs[name] = config;
      if (connectionInputNames.has(name)) continue;
      if (isRawConnectionInput(config)) continue;
      widgetInputNames.push(name);
    }
  };

  collectWidgetInputs(nodeInfo.input?.required);
  collectWidgetInputs(nodeInfo.input?.optional);

  if (widgetInputNames.length === 0 && widgetValues.length > 0) {
    const fallbackNames = WIDGET_INPUT_NAME_FALLBACK[classType] || [];
    for (const fallbackName of fallbackNames) {
      if (!connectionInputNames.has(fallbackName)) {
        widgetInputNames.push(fallbackName);
      }
    }
  }

  const mapped: Record<string, any> = {};
  let widgetIndex = 0;
  for (const inputName of widgetInputNames) {
    const config = inputConfigs[inputName];

    if (widgetIndex < widgetValues.length && widgetValues[widgetIndex] !== undefined) {
      mapped[inputName] = coerceRawWidgetValue(widgetValues[widgetIndex], config);
    } else {
      const meta = getRawInputMeta(config);
      if (meta.default !== undefined) {
        mapped[inputName] = coerceRawWidgetValue(meta.default, config);
      }
    }

    widgetIndex += 1;
    if (hasRawCompanionWidget(inputName, config)) {
      widgetIndex += 1;
    }
  }

  console.log(
    `[WidgetMap] ${classType}: values=[${widgetValues.map((v) => JSON.stringify(v)).join(', ')}] -> mapped=${JSON.stringify(mapped)}`,
  );

  return mapped;
}

function isGraphConnectionInputDefinition(input: any): boolean {
  if (!input || typeof input !== 'object') return false;
  const type = String(input.type || '').toUpperCase();
  if (!type) return typeof input.link === 'number';
  if (type === 'COMBO' || type === 'INT' || type === 'FLOAT' || type === 'BOOLEAN' || type === 'STRING') {
    return false;
  }
  return isConnectionTypeName(type);
}

function isRawConnectionInput(config: any): boolean {
  if (!Array.isArray(config) || config.length === 0) return false;
  const typeSpec = config[0];
  if (Array.isArray(typeSpec)) return false; // Combo/list widget
  if (typeof typeSpec !== 'string') return false;

  const type = typeSpec.toUpperCase();
  if (PRIMITIVE_WIDGET_TYPES.has(type)) return false;
  return isConnectionTypeName(type);
}

function hasRawCompanionWidget(inputName: string, config: any): boolean {
  const meta = getRawInputMeta(config);
  const rawType = Array.isArray(config) && typeof config[0] === 'string'
    ? config[0].toUpperCase().replace(/_MULTILINE$/, '')
    : '';
  const seedCompanion = rawType === 'INT' && String(inputName || '').trim().toLowerCase().includes('seed');
  return seedCompanion || meta.control_after_generate === true || meta.image_upload === true || meta.upload === true;
}

function getRawInputMeta(config: any): Record<string, any> {
  if (Array.isArray(config) && config.length > 1 && typeof config[1] === 'object' && config[1] !== null) {
    return config[1];
  }
  return {};
}

function coerceRawWidgetValue(value: any, config: any): any {
  if (!Array.isArray(config) || config.length === 0) {
    return coerceUnknownWidgetValue(value);
  }

  const typeSpec = config[0];
  if (Array.isArray(typeSpec)) {
    if (typeof value !== 'string') return value;
    const options = typeSpec.map(String);
    const matched = normalizeOptionValue(value, options);
    return matched ?? value;
  }

  if (typeof typeSpec === 'string') {
    const normalizedType = typeSpec.toUpperCase().replace(/_MULTILINE$/, '');

    if (normalizedType === 'INT') {
      if (typeof value === 'number') return Math.trunc(value);
      if (typeof value === 'string') {
        const parsed = Number.parseInt(value.trim(), 10);
        return Number.isNaN(parsed) ? value : parsed;
      }
      return value;
    }

    if (normalizedType === 'FLOAT' || normalizedType === 'NUMBER') {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.trim());
        return Number.isNaN(parsed) ? value : parsed;
      }
      return value;
    }

    if (normalizedType === 'BOOLEAN') {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const boolValue = value.trim().toLowerCase();
        if (boolValue === 'true' || boolValue === '1') return true;
        if (boolValue === 'false' || boolValue === '0') return false;
      }
      return value;
    }
  }

  return coerceUnknownWidgetValue(value);
}

function coerceUnknownWidgetValue(value: any): any {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  if (/^-?\d+$/.test(trimmed)) {
    const asInt = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(asInt)) return asInt;
  }

  if (/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(trimmed)) {
    const asFloat = Number.parseFloat(trimmed);
    if (!Number.isNaN(asFloat)) return asFloat;
  }

  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;

  return value;
}

function coerceWidgetValue(value: any, input: NodeInput): any {
  if (Array.isArray(value)) return value;

  const normalizedType = (input.type || '').toUpperCase().replace(/_MULTILINE$/, '');

  if (normalizedType === 'INT') {
    if (typeof value === 'number') return Math.trunc(value);
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value.trim(), 10);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }

  if (normalizedType === 'FLOAT' || normalizedType === 'NUMBER') {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.trim());
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }

  if (normalizedType === 'BOOLEAN') {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const boolValue = value.trim().toLowerCase();
      if (boolValue === 'true' || boolValue === '1') return true;
      if (boolValue === 'false' || boolValue === '0') return false;
    }
    return value;
  }

  if (input.options && input.options.length > 0 && typeof value === 'string') {
    const matched = normalizeOptionValue(value, input.options);
    return matched ?? value;
  }

  return value;
}

function normalizeOptionValue(value: string, options: string[]): string | null {
  if (options.includes(value)) return value;

  const trimmed = value.trim();
  if (options.includes(trimmed)) return trimmed;

  const lowerMatch = options.find((option) => option.toLowerCase() === trimmed.toLowerCase());
  if (lowerMatch) return lowerMatch;

  const canonicalValue = canonicalizeOption(trimmed);
  const canonicalMatch = options.find((option) => canonicalizeOption(option) === canonicalValue);
  return canonicalMatch ?? null;
}

function canonicalizeOption(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, '_');
}

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Resolve the ComfyUI base URL for API calls.
 * - Keeps relative proxy paths (for example "/comfyui-proxy") unchanged.
 * - Normalizes direct URLs and aligns localhost hostnames to the current page host.
 */
export function resolveComfyUrl(url: string): string {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');

  // Keep relative proxy paths untouched so dev/proxy routing keeps working.
  if (trimmed.startsWith('/')) return trimmed;

  let normalized = resolveComfyUIBaseUrl(trimmed).trim().replace(/\/+$/, '');
  if (!normalized) normalized = 'http://127.0.0.1:8188';
  if (normalized.startsWith('/')) return normalized;

  if (typeof window === 'undefined') return normalized;

  try {
    const parsed = new URL(normalized);
    const pageHost = window.location.hostname;
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
    if (localHosts.has(parsed.hostname) && localHosts.has(pageHost)) {
      parsed.hostname = pageHost;
    }
    return parsed.origin;
  } catch {
    return normalized;
  }
}

function normalizeUrl(url: string): string {
  return resolveComfyUrl(url);
}


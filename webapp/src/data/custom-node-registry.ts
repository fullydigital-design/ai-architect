/**
 * Custom Node Registry — fetches and caches the ComfyUI-Manager's
 * curated node-pack list and extension-node-map from GitHub.
 *
 * Data sources (public, no auth required):
 *   - custom-node-list.json  : pack metadata (title, author, description, stars, etc.)
 *   - extension-node-map.json: maps each GitHub URL -> array of node class names
 *
 * Cached in localStorage with a 24-hour TTL.
 */

import { getLiveNodeCache, type LiveNodeCache } from '../services/comfyui-backend';
import {
  getCachedInstalledPacks,
  getManagerNodeList,
  type InstalledPackInfo,
  type ManagerNode,
} from '../app/services/comfyui-manager-service';
import { getNodeToPackMapping, type NodeToPackMapping } from '../app/services/node-pack-mapper';
import { NODE_REGISTRY } from './node-registry';

// ---- Types ----------------------------------------------------------------

export interface CustomNodePackInfo {
  id: string;               // kebab-cased slug derived from title
  title: string;
  author: string;
  description: string;
  reference: string;        // GitHub URL
  installType: string;      // "git-clone" | "copy" | "unzip" | etc.
  stars: number;
  lastUpdate: string;
  nodeNames: string[];      // individual ComfyUI node class names from extension-node-map
  nodeCount: number;
  installCommand: string;   // generated git clone or comfy-cli command
}

/** Raw shape of each entry in custom-node-list.json */
interface RawNodePack {
  author?: string;
  title?: string;
  reference?: string;
  files?: string[];
  install_type?: string;
  description?: string;
  stars?: number;
  last_update?: string;
  state?: string;
  installed?: boolean | string;
  is_installed?: boolean | string;
  nodenames?: string[];
  node_names?: string[];
  nodes?: string[];
}

interface FetchRegistryOptions {
  comfyuiUrl?: string;
}

// ---- Constants -------------------------------------------------------------

const CUSTOM_NODE_LIST_URL =
  'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/custom-node-list.json';
const EXTENSION_NODE_MAP_URL =
  'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/extension-node-map.json';

const CACHE_KEY_LIST = 'comfyui-manager-node-list';
const CACHE_KEY_MAP = 'comfyui-manager-node-map';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const CORE_NODE_TYPES = new Set([
  // Loaders
  'CheckpointLoaderSimple', 'CheckpointLoader', 'DiffusersLoader',
  'VAELoader', 'LoraLoader', 'LoraLoaderModelOnly',
  'CLIPLoader', 'DualCLIPLoader', 'TripleCLIPLoader', 'CLIPVisionLoader',
  'ControlNetLoader', 'ControlNetLoaderAdvanced', 'DiffControlNetLoader',
  'StyleModelLoader', 'GLIGENLoader', 'UpscaleModelLoader',
  'UNETLoader', 'HypernetworkLoader', 'unCLIPCheckpointLoader',
  // Conditioning
  'CLIPTextEncode', 'CLIPTextEncodeSDXL', 'CLIPTextEncodeSDXLRefiner',
  'CLIPSetLastLayer', 'CLIPVisionEncode',
  'ConditioningCombine', 'ConditioningSetArea', 'ConditioningSetAreaPercentage',
  'ConditioningSetMask', 'ConditioningAverage', 'ConditioningConcat',
  'ConditioningZeroOut', 'ConditioningSetTimestepRange',
  'ControlNetApply', 'ControlNetApplyAdvanced',
  'StyleModelApply', 'GLIGENTextBoxApply',
  'unCLIPConditioning',
  // Sampling
  'KSampler', 'KSamplerAdvanced', 'SamplerCustom', 'SamplerCustomAdvanced',
  'BasicScheduler', 'KarrasScheduler', 'ExponentialScheduler',
  'PolyexponentialScheduler', 'VPScheduler', 'BetaSamplingScheduler',
  'SplitSigmas', 'SplitSigmasDenoise', 'FlipSigmas',
  'CFGGuider', 'DualCFGGuider', 'DisableNoise', 'AddNoise',
  'RandomNoise', 'SamplerEulerAncestral', 'SamplerEuler',
  'SamplerDPM_2', 'SamplerDPMAdaptative', 'SamplerLMS',
  'SamplerDPMPP_2M', 'SamplerDPMPP_2M_SDE', 'SamplerDPMPP_3M_SDE',
  'SamplerDPMPP_SDE', 'SamplerDPM_Fast', 'SamplerDDIM',
  'SamplerLCMUpscale', 'SamplerLCM',
  'BasicGuider', 'ModelSamplingDiscrete', 'ModelSamplingContinuousEDM',
  'ModelSamplingContinuousV', 'ModelSamplingStableCascade', 'ModelSamplingAuraFlow',
  'ModelSamplingFlux', 'FluxGuidance', 'SkipLayerGuidance',
  // Latent
  'EmptyLatentImage', 'LatentUpscale', 'LatentUpscaleBy',
  'LatentComposite', 'LatentBlend', 'LatentCrop',
  'LatentFlip', 'LatentRotate', 'RepeatLatentBatch',
  'LatentFromBatch', 'RebatchLatents', 'SetLatentNoiseMask',
  'VAEEncodeForInpaint', 'VAEDecode', 'VAEEncode',
  'VAEDecodeTiled', 'VAEEncodeTiled',
  'InpaintModelConditioning', 'InpaintFill',
  'EmptySD3LatentImage', 'EmptyMochiLatentVideo', 'EmptyHunyuanLatentVideo',
  'EmptyCogVideoXLatentVideo', 'EmptyLTXVLatentVideo',
  // Image
  'LoadImage', 'SaveImage', 'PreviewImage', 'PreviewAnimation',
  'ImageScale', 'ImageScaleBy', 'ImageScaleToTotalPixels',
  'ImageUpscaleWithModel', 'ImageInvert', 'ImageBatch', 'ImagePadForOutpaint',
  'ImageCrop', 'ImageComposite', 'ImageBlend', 'ImageBlur', 'ImageSharpen',
  'ImageColorMatch', 'ImageFromBatch', 'RebatchImages',
  'ImageToMask', 'MaskToImage', 'LoadImageMask',
  'ImageQuantize', 'ImageDither', 'JoinImageWithAlpha', 'SplitImageWithAlpha',
  // Mask
  'GrowMask', 'InvertMask', 'CropMask', 'FillMaskedArea',
  'MaskComposite', 'FeatherMask', 'ImageCompositeMasked',
  'SolidMask', 'AddMiDaS', 'ThresholdMask',
  // Utility / Primitives
  'Note', 'Reroute', 'PrimitiveNode', 'SaveAnimatedWEBP', 'SaveAnimatedPNG',
  'ConditioningSetAreaStrength', 'CLIPMergeSimple', 'CLIPMergeSubtract',
  'CLIPMergeAdd', 'ModelMergeSimple', 'ModelMergeSubtract', 'ModelMergeAdd',
  'ModelMergeBlocks', 'ModelMergeSD1', 'ModelMergeSDXL', 'ModelMergeFlux1',
  'ModelMergeSD35Large', 'StableCascade_StageB', 'StableCascade_StageC',
  'StableCascade_SuperResolutionControlnet', 'StableCascade_EmptyLatentImage',
  'Latent2RGBPreview', 'VideoLinearCFGGuidance',
  // GLIGEN / misc
  'SD3CLIPLoader', 'CLIPTextEncodeSD3', 'CLIPTextEncodeHunyuanDiT',
  'HyperTile', 'PerturbedAttentionGuidance', 'SelfAttentionGuidance',
  'RescaleCFG', 'LatentAdd', 'LatentMultiply', 'LatentInterpolate',
  'UNETLoaderGGUF', 'CLIPLoaderGGUF', 'DualCLIPLoaderGGUF',
]);

const CORE_CATEGORIES = new Set([
  'sampling',
  'conditioning',
  'latent',
  'image',
  'mask',
  'loaders',
  'advanced',
  '_for_testing',
  'utils',
  'audio',
  'video_models',
  'model_patches',
  'sd_upscale',
  'controlnet',
  'gligen',
  'inpaint',
  'experimental',
]);

// ---- Helpers ---------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildInstallCommand(reference: string, installType: string): string {
  if (!reference) return '';
  // Extract repo name for comfy-cli style command
  const match = reference.match(/github\.com\/[^/]+\/([^/]+)/);
  const repoName = match ? match[1] : '';
  if (installType === 'git-clone' && repoName) {
    return `comfy node install ${repoName.toLowerCase()}`;
  }
  return `git clone ${reference}`;
}

function normalizeReference(reference: string): string {
  return reference.replace(/\.git$/i, '').replace(/\/+$/, '').trim().toLowerCase();
}

function uniqueNodeNames(nodeNames: string[]): string[] {
  return [...new Set(nodeNames.map((name) => name.trim()).filter(Boolean))];
}

function getRawPackNodeNames(pack: Partial<RawNodePack>): string[] {
  return uniqueNodeNames([
    ...(pack.nodenames ?? []),
    ...(pack.node_names ?? []),
    ...(pack.nodes ?? []),
  ]);
}

function isInstalledState(value: unknown, state: unknown, installedFlag: unknown): boolean {
  const text = String(value ?? '').toLowerCase();
  const stateText = String(state ?? '').toLowerCase();
  const flagText = String(installedFlag ?? '').toLowerCase();
  return text === 'true'
    || text === 'installed'
    || text === 'enabled'
    || text === 'update'
    || stateText === 'enabled'
    || stateText === 'disabled'
    || stateText === 'update'
    || flagText === 'true'
    || flagText === 'installed'
    || flagText === 'enabled'
    || flagText === 'update'
    || value === true
    || installedFlag === true;
}

// ---- Cache layer -----------------------------------------------------------

interface CachedData<T> {
  timestamp: number;
  data: T;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached: CachedData<T> = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const payload: CachedData<T> = { timestamp: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // localStorage full or disabled — silently skip
  }
}

// ---- Fetch -----------------------------------------------------------------

async function fetchJSON<T>(url: string, cacheKey: string, retries = 2): Promise<T> {
  // Try cache first
  const cached = readCache<T>(cacheKey);
  if (cached) return cached;

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        cache: 'no-cache',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as T;
      writeCache(cacheKey, data);
      return data;
    } catch (err: any) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastErr ?? new Error(`Failed to fetch ${url}`);
}

// ---- Public API ------------------------------------------------------------

let _registryPromise: Promise<CustomNodePackInfo[]> | null = null;

function parseRawNodePackList(payload: unknown): RawNodePack[] {
  if (Array.isArray(payload)) return payload as RawNodePack[];
  if (!payload || typeof payload !== 'object') return [];

  const objectPayload = payload as Record<string, unknown>;
  if (Array.isArray(objectPayload.custom_nodes)) return objectPayload.custom_nodes as RawNodePack[];
  if (Array.isArray(objectPayload.nodes)) return objectPayload.nodes as RawNodePack[];
  if (Array.isArray(objectPayload.data)) return objectPayload.data as RawNodePack[];
  if (Array.isArray(objectPayload.value)) return objectPayload.value as RawNodePack[];
  if (objectPayload.value && typeof objectPayload.value === 'object') {
    const nested = objectPayload.value as Record<string, unknown>;
    if (Array.isArray(nested.custom_nodes)) return nested.custom_nodes as RawNodePack[];
    if (Array.isArray(nested.nodes)) return nested.nodes as RawNodePack[];
    if (Array.isArray(nested.data)) return nested.data as RawNodePack[];
  }

  if (objectPayload.node_packs && typeof objectPayload.node_packs === 'object') {
    const entries = Object.entries(objectPayload.node_packs as Record<string, unknown>);
    return entries.map(([id, info]) => {
      const packInfo = (info && typeof info === 'object') ? info as Record<string, unknown> : {};
      const fallbackReference = String(packInfo.reference ?? packInfo.repository ?? packInfo.url ?? id);
      return {
        title: String(packInfo.title ?? id),
        author: String(packInfo.author ?? 'Unknown'),
        reference: fallbackReference,
        install_type: String(packInfo.install_type ?? 'git-clone'),
        description: String(packInfo.description ?? ''),
        stars: typeof packInfo.stars === 'number' ? packInfo.stars : Number(packInfo.stars ?? 0) || 0,
        last_update: typeof packInfo.last_update === 'string' ? packInfo.last_update : '',
        nodenames: Array.isArray(packInfo.nodenames) ? (packInfo.nodenames as string[]) : undefined,
        node_names: Array.isArray(packInfo.node_names) ? (packInfo.node_names as string[]) : undefined,
        nodes: Array.isArray(packInfo.nodes) ? (packInfo.nodes as string[]) : undefined,
      };
    });
  }

  return [];
}

function buildPacksFromRawList(
  rawList: RawNodePack[],
  mapData: Record<string, string[][] | string[]>,
): CustomNodePackInfo[] {
  const nodesByUrl = new Map<string, string[]>();
  for (const [url, val] of Object.entries(mapData)) {
    const flat: string[] = [];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (Array.isArray(item)) flat.push(...item);
        else if (typeof item === 'string') flat.push(item);
      }
    }
    const normalised = url.replace(/\.git$/i, '').replace(/\/$/, '');
    nodesByUrl.set(url, flat);
    if (normalised !== url && !nodesByUrl.has(normalised)) {
      nodesByUrl.set(normalised, flat);
    }

    const variants = [
      url.replace(/\/tree\/main.*$/i, ''),
      url.replace(/\/blob\/main.*$/i, ''),
      url.toLowerCase().replace(/\.git$/i, '').replace(/\/$/, ''),
    ];
    for (const v of variants) {
      if (v && v !== url && !nodesByUrl.has(v)) {
        nodesByUrl.set(v, flat);
      }
    }
  }

  const seenIds = new Map<string, number>();
  function uniqueId(base: string): string {
    const count = seenIds.get(base) || 0;
    seenIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  }

  const packs: CustomNodePackInfo[] = rawList
    .filter((r) => r.title && r.reference)
    .map((raw) => {
      const ref = (raw.reference || '').replace(/\.git$/i, '').replace(/\/$/, '');
      const refLower = ref.toLowerCase();
      const refNoTreeMain = ref
        .replace(/\/tree\/main.*$/i, '')
        .replace(/\/blob\/main.*$/i, '');
      const nodeNames =
        nodesByUrl.get(ref) ||
        nodesByUrl.get(raw.reference || '') ||
        nodesByUrl.get(refLower) ||
        nodesByUrl.get(refNoTreeMain) ||
        nodesByUrl.get(refNoTreeMain.toLowerCase()) ||
        getRawPackNodeNames(raw);
      const normalizedNodeNames = uniqueNodeNames(nodeNames);
      const baseSlug = slugify(raw.title || '');
      return {
        id: uniqueId(baseSlug),
        title: raw.title || 'Unknown',
        author: raw.author || 'Unknown',
        description: raw.description || '',
        reference: raw.reference || '',
        installType: raw.install_type || 'git-clone',
        stars: raw.stars ?? 0,
        lastUpdate: raw.last_update || '',
        nodeNames: normalizedNodeNames,
        nodeCount: normalizedNodeNames.length,
        installCommand: buildInstallCommand(raw.reference || '', raw.install_type || 'git-clone'),
      };
    });

  packs.sort((a, b) => b.stars - a.stars);
  return packs;
}

function mappingKey(value: string): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function collectManagerNodeIdentityKeys(node: ManagerNode): Set<string> {
  const keys = new Set<string>();

  const add = (value: string) => {
    const key = mappingKey(value);
    if (key) keys.add(key);
    const noPrefix = mappingKey(String(value || '').replace(/^comfyui[-_]?/i, ''));
    if (noPrefix) keys.add(noPrefix);
  };

  add(node.id || '');
  add(node.title || '');
  for (const value of [node.reference, node.repository, node.url]) {
    const raw = String(value || '').trim();
    if (!raw) continue;
    add(raw);
    const repo = raw.replace(/\.git$/i, '').replace(/\/+$/, '').split('/').pop() || raw;
    add(repo);
  }

  return keys;
}

function getMappedNodeNamesForManagerNode(
  node: ManagerNode,
  mapping: NodeToPackMapping | null,
): string[] {
  if (!mapping) return [];
  const names = new Set<string>();
  const candidatePackIds = new Set<string>();
  const identityKeys = collectManagerNodeIdentityKeys(node);

  const directId = String(node.id || '').trim();
  if (directId && mapping.packToNodeClasses.has(directId)) candidatePackIds.add(directId);

  for (const reference of [node.reference, node.repository, node.url]) {
    const normalized = normalizeReference(String(reference || ''));
    if (!normalized) continue;
    const packInfo = mapping.repoToPack.get(normalized);
    if (packInfo?.id) candidatePackIds.add(packInfo.id);
  }

  for (const packId of candidatePackIds) {
    const mapped = mapping.packToNodeClasses.get(packId);
    if (!mapped) continue;
    for (const nodeName of mapped) names.add(nodeName);
  }

  if (names.size === 0) {
    for (const [packId, mapped] of mapping.packToNodeClasses.entries()) {
      const packKeys = new Set<string>([
        mappingKey(packId),
        mappingKey(packId.replace(/^comfyui[-_]?/i, '')),
      ]);
      const match = [...packKeys].some((key) => key && identityKeys.has(key));
      if (!match) continue;
      for (const nodeName of mapped) names.add(nodeName);
    }
  }

  return [...names];
}

function toRegistryPackFromManagerNode(node: ManagerNode, mappedNodeNames: string[] = []): CustomNodePackInfo | null {
  const reference = String(node.reference || node.repository || node.url || '').trim();
  const title = String(node.title || node.id || '').trim();
  if (!reference || !title) return null;

  const nodeNames = uniqueNodeNames([
    ...(node.nodenames ?? []),
    ...(node.node_names ?? []),
    ...(node.nodes ?? []),
    ...mappedNodeNames,
  ]);

  const raw = node as unknown as Record<string, unknown>;
  const stars = typeof raw.stars === 'number'
    ? raw.stars
    : typeof raw.stars === 'string'
      ? Number(raw.stars) || 0
      : 0;

  return {
    id: slugify(title),
    title,
    author: String(node.author ?? 'Unknown'),
    description: String(node.description ?? ''),
    reference,
    installType: String(node.install_type ?? 'git-clone'),
    stars,
    lastUpdate: typeof raw.last_update === 'string' ? raw.last_update : '',
    nodeNames,
    nodeCount: nodeNames.length,
    installCommand: buildInstallCommand(reference, String(node.install_type ?? 'git-clone')),
  };
}

function mergeRegistryPacks(primary: CustomNodePackInfo[], secondary: CustomNodePackInfo[]): CustomNodePackInfo[] {
  const merged = new Map<string, CustomNodePackInfo>();

  const upsert = (pack: CustomNodePackInfo) => {
    const refKey = normalizeReference(pack.reference || '');
    const titleKey = slugify(pack.title || '');
    const key = refKey || titleKey || pack.id;
    if (!key) return;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, pack);
      return;
    }

    const nodeNames = uniqueNodeNames([...existing.nodeNames, ...pack.nodeNames]);
    merged.set(key, {
      ...existing,
      ...pack,
      id: existing.id || pack.id,
      nodeNames,
      nodeCount: nodeNames.length,
      installCommand: existing.installCommand || pack.installCommand,
      stars: Math.max(existing.stars || 0, pack.stars || 0),
    });
  };

  primary.forEach(upsert);
  secondary.forEach(upsert);

  return [...merged.values()].sort((a, b) => b.stars - a.stars || a.title.localeCompare(b.title));
}

async function fetchManagerRegistry(comfyuiUrl?: string): Promise<CustomNodePackInfo[]> {
  try {
    const [managerNodes, mapping] = await Promise.all([
      getManagerNodeList(comfyuiUrl || '', false),
      getNodeToPackMapping(false).catch(() => null),
    ]);

    const packs = managerNodes
      .map((node) => {
        const mappedNodeNames = getMappedNodeNamesForManagerNode(node, mapping);
        return toRegistryPackFromManagerNode(node, mappedNodeNames);
      })
      .filter((pack): pack is CustomNodePackInfo => pack !== null);
    const deduped = mergeRegistryPacks(packs, []);
    console.log(`[CustomNodeRegistry] Manager source: ${deduped.length} pack(s)`);
    return deduped;
  } catch (error) {
    console.warn('[CustomNodeRegistry] Manager source failed:', error);
    return [];
  }
}

/**
 * Fetches the custom-node registry from GitHub, with a ComfyUI-Manager API fallback.
 * Results are cached in localStorage for 24 h and in-memory for the session.
 *
 * Returns a flat array of `CustomNodePackInfo` objects sorted by stars (desc).
 */
export async function fetchCustomNodeRegistry(options?: FetchRegistryOptions): Promise<CustomNodePackInfo[]> {
  if (_registryPromise) return _registryPromise;

  _registryPromise = (async () => {
    const managerPacksPromise = fetchManagerRegistry(options?.comfyuiUrl);
    try {
      const [listData, mapData, managerPacks] = await Promise.all([
        fetchJSON<unknown>(
          CUSTOM_NODE_LIST_URL,
          CACHE_KEY_LIST,
        ),
        fetchJSON<Record<string, string[][] | string[]>>(
          EXTENSION_NODE_MAP_URL,
          CACHE_KEY_MAP,
        ).catch(() => ({})),
        managerPacksPromise,
      ]);

      // Normalise the list — might be { custom_nodes: [...] } or a plain array
      const rawList = parseRawNodePackList(listData);
      const githubPacks = buildPacksFromRawList(rawList, mapData || {});
      const merged = mergeRegistryPacks(githubPacks, managerPacks);
      console.log(
        `[CustomNodeRegistry] GitHub source: ${githubPacks.length} pack(s), merged total: ${merged.length}`,
      );

      if (merged.length > 0) return merged;
      return managerPacks;
    } catch (err) {
      const managerPacks = await managerPacksPromise;
      if (managerPacks.length > 0) {
        console.warn('[CustomNodeRegistry] Falling back to manager-only registry');
        return managerPacks;
      }
      _registryPromise = null;
      throw err;
    }
  })();

  return _registryPromise;
}

/**
 * Force-clears the cached registry (both localStorage and in-memory).
 * Next call to `fetchCustomNodeRegistry` will re-fetch from GitHub.
 */
export function clearRegistryCache(): void {
  _registryPromise = null;
  localStorage.removeItem(CACHE_KEY_LIST);
  localStorage.removeItem(CACHE_KEY_MAP);
}

/**
 * Returns node types from the live cache that belong to ComfyUI's
 * built-in categories.
 */
export function getCoreNodeTypesFromCache(cache: LiveNodeCache): Set<string> {
  const coreTypes = new Set<string>();
  for (const [classType, schema] of NODE_REGISTRY.entries()) {
    if (schema.source === 'core') {
      coreTypes.add(classType);
    }
  }
  for (const [classType, schema] of Object.entries(cache.nodes)) {
    const category = (schema.category || '').trim();
    const topCat = category.split('/')[0].toLowerCase();
    if (category === '' || CORE_CATEGORIES.has(topCat) || CORE_NODE_TYPES.has(classType)) {
      coreTypes.add(classType);
    }
  }
  return coreTypes;
}

interface ManagerCacheNode {
  id?: string;
  title?: string;
  author?: string;
  description?: string;
  reference?: string;
  repository?: string;
  url?: string;
  install_type?: string;
  stars?: number | string;
  last_update?: string;
  state?: string;
  installed?: boolean | string;
  is_installed?: boolean | string;
  nodenames?: string[];
  node_names?: string[];
  nodes?: string[];
}

function readManagerNodesFromLocalStorage(): ManagerCacheNode[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY_LIST);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { data?: unknown } | unknown;
    const payload = (parsed && typeof parsed === 'object' && 'data' in parsed)
      ? (parsed as { data?: unknown }).data
      : parsed;
    const objectPayload = payload as Record<string, unknown> | null;
    if (Array.isArray(payload)) return payload as ManagerCacheNode[];
    if (!objectPayload || typeof objectPayload !== 'object') return [];
    if (Array.isArray(objectPayload.custom_nodes)) return objectPayload.custom_nodes as ManagerCacheNode[];
    if (Array.isArray(objectPayload.nodes)) return objectPayload.nodes as ManagerCacheNode[];
    if (Array.isArray(objectPayload.data)) return objectPayload.data as ManagerCacheNode[];
    return [];
  } catch {
    return [];
  }
}

function toRegistryPackFromManagerCacheNode(node: ManagerCacheNode): CustomNodePackInfo | null {
  const reference = String(node.reference ?? node.repository ?? node.url ?? '').trim();
  const title = String(node.title ?? '').trim();
  if (!reference || !title) return null;

  const nodeNames = getRawPackNodeNames(node);
  const installType = String(node.install_type ?? 'git-clone');
  const stars = typeof node.stars === 'number' ? node.stars : Number(node.stars ?? 0) || 0;

  return {
    id: slugify(title),
    title,
    author: String(node.author ?? 'Unknown'),
    description: String(node.description ?? ''),
    reference,
    installType,
    stars,
    lastUpdate: String(node.last_update ?? ''),
    nodeNames,
    nodeCount: nodeNames.length,
    installCommand: buildInstallCommand(reference, installType),
  };
}

function mergeInstalledCandidatesWithRegistry(
  candidates: CustomNodePackInfo[],
  registryPacks: CustomNodePackInfo[],
): CustomNodePackInfo[] {
  if (candidates.length === 0) return [];

  const byReference = new Map<string, CustomNodePackInfo>();
  const byTitle = new Map<string, CustomNodePackInfo>();
  for (const pack of registryPacks) {
    if (pack.reference) byReference.set(normalizeReference(pack.reference), pack);
    byTitle.set(slugify(pack.title), pack);
  }

  const merged = new Map<string, CustomNodePackInfo>();
  let fallbackIndex = 0;
  for (const candidate of candidates) {
    const referenceKey = normalizeReference(candidate.reference);
    const base = byReference.get(referenceKey) || byTitle.get(slugify(candidate.title));
    const nodeNames = uniqueNodeNames([
      ...candidate.nodeNames,
      ...(base?.nodeNames ?? []),
    ]);

    const resolved = base
      ? {
          ...base,
          nodeNames,
          nodeCount: nodeNames.length,
        }
      : {
          ...candidate,
          id: candidate.id || `${slugify(candidate.title || 'installed-pack')}-${fallbackIndex++}`,
          nodeNames,
          nodeCount: nodeNames.length,
        };

    merged.set(resolved.id, resolved);
  }

  return [...merged.values()];
}

function getInstalledPacksFromManagerCaches(
  registryPacks: CustomNodePackInfo[],
): CustomNodePackInfo[] {
  const cachedInstalled = getCachedInstalledPacks();
  const managerCandidates = cachedInstalled
    .filter((pack) => pack.isInstalled)
    .map((pack: InstalledPackInfo) => {
      const nodeNames = uniqueNodeNames(pack.nodeTypes);
      return {
        id: slugify(pack.title || pack.reference),
        title: pack.title,
        author: pack.author,
        description: pack.description,
        reference: pack.reference,
        installType: pack.installType,
        stars: pack.stars,
        lastUpdate: pack.lastUpdate,
        nodeNames,
        nodeCount: nodeNames.length,
        installCommand: buildInstallCommand(pack.reference, pack.installType),
      } satisfies CustomNodePackInfo;
    });

  const localNodes = readManagerNodesFromLocalStorage();
  const localInstalledCandidates = localNodes
    .filter((node) => isInstalledState(node.installed, node.state, node.is_installed))
    .map((node) => toRegistryPackFromManagerCacheNode(node))
    .filter((pack): pack is CustomNodePackInfo => pack !== null);

  return mergeInstalledCandidatesWithRegistry(
    [...managerCandidates, ...localInstalledCandidates],
    registryPacks,
  );
}

/**
 * Detect installed packs with manager cache as the primary source and
 * /object_info cross-reference as a fallback.
 */
export async function detectInstalledPacks(
  cache?: LiveNodeCache | null,
  registryPacks?: CustomNodePackInfo[],
): Promise<CustomNodePackInfo[]> {
  let packs = registryPacks && registryPacks.length > 0 ? registryPacks : [];

  let managerInstalled = getInstalledPacksFromManagerCaches(packs);
  if (managerInstalled.length > 0 && packs.length === 0) {
    try {
      packs = await fetchCustomNodeRegistry();
      managerInstalled = getInstalledPacksFromManagerCaches(packs);
    } catch {
      // Keep manager-only installed data even when registry refresh fails.
    }
  }
  if (managerInstalled.length > 0) return managerInstalled;

  if (packs.length === 0) {
    try {
      packs = await fetchCustomNodeRegistry();
    } catch {
      packs = [];
    }
  }

  const liveCache = cache ?? getLiveNodeCache();
  if (!liveCache || packs.length === 0) return [];

  const coreTypes = getCoreNodeTypesFromCache(liveCache);
  const liveNodeTypes = Object.keys(liveCache.nodes).filter((type) => !coreTypes.has(type));
  if (liveNodeTypes.length === 0) return [];

  const { usedPacks } = crossReferenceWorkflow(packs, liveNodeTypes);
  return usedPacks;
}

/**
 * Given a list of node type strings (from a workflow), returns which packs
 * are required, which are known in our local registry, and which are unknown.
 */
export function crossReferenceWorkflow(
  packs: CustomNodePackInfo[],
  workflowNodeTypes: string[],
): {
  usedPacks: CustomNodePackInfo[];
  missingTypes: string[];
} {
  const typeSet = new Set(workflowNodeTypes);
  const liveCache = getLiveNodeCache();
  const liveNodeTypes = liveCache ? new Set(Object.keys(liveCache.nodes)) : null;
  const liveNodeTypesLower = liveCache
    ? new Set(Object.keys(liveCache.nodes).map((type) => type.toLowerCase()))
    : null;
  const allPackNodeNames = new Set<string>();
  for (const pack of packs) {
    for (const name of pack.nodeNames) {
      allPackNodeNames.add(name);
    }
  }

  // Build core set from NODE_REGISTRY source metadata first.
  const coreSet = new Set<string>();
  for (const [classType, schema] of NODE_REGISTRY.entries()) {
    if (schema.source === 'core') coreSet.add(classType);
  }

  // Expand with live /object_info nodes that are not claimed by any known pack.
  if (liveCache) {
    for (const nodeType of Object.keys(liveCache.nodes)) {
      if (!allPackNodeNames.has(nodeType)) {
        coreSet.add(nodeType);
      }
    }
  }

  const usedPacks: CustomNodePackInfo[] = [];
  const coveredTypes = new Set<string>();

  for (const pack of packs) {
    // Critical: core nodes must not trigger pack detection.
    const overlap = pack.nodeNames.filter((n) => typeSet.has(n) && !coreSet.has(n));
    if (overlap.length > 0) {
      usedPacks.push(pack);
      pack.nodeNames.filter((n) => typeSet.has(n)).forEach((n) => coveredTypes.add(n));
    }
  }

  // A type is missing only if it's not covered by registry packs/core
  // and also not present in live /object_info cache.
  const missingTypes = workflowNodeTypes.filter(
    (t) => !coveredTypes.has(t)
      && !coreSet.has(t)
      && !(liveNodeTypes?.has(t) || liveNodeTypesLower?.has(t.toLowerCase())),
  );

  return { usedPacks, missingTypes };
}

/**
 * Fuzzy lookup: given a slug string (e.g. "comfyui-ipadapter-plus"), find the
 * best-matching pack from a loaded registry array.
 *
 * Matching strategy (in priority order):
 *   1. Exact ID match
 *   2. Slug matches the slugified title of a pack
 *   3. Slug matches the GitHub repo name extracted from `reference`
 *   4. Loose substring match on ID or title
 */
export function findPackBySlug(
  packs: CustomNodePackInfo[],
  slug: string,
): CustomNodePackInfo | null {
  if (!slug || !packs.length) return null;
  const s = slug.toLowerCase().trim();

  // 1. Exact ID match
  const exact = packs.find(p => p.id === s);
  if (exact) return exact;

  // 2. Slugified title match
  const byTitle = packs.find(p => slugify(p.title) === s);
  if (byTitle) return byTitle;

  // 3. GitHub repo name match
  const byRepo = packs.find(p => {
    const match = p.reference.match(/github\.com\/[^/]+\/([^/]+)/);
    const repo = match?.[1]?.toLowerCase().replace(/\.git$/, '') || '';
    return repo === s || slugify(repo) === s;
  });
  if (byRepo) return byRepo;

  // 4. Loose contains match (pack id contains slug or vice-versa)
  const byContains = packs.find(
    p => p.id.includes(s) || s.includes(p.id),
  );
  if (byContains) return byContains;

  // 5. Try matching with underscores replaced by hyphens and vice-versa
  const altSlug = s.includes('_') ? s.replace(/_/g, '-') : s.replace(/-/g, '_');
  const byAlt = packs.find(
    p => p.id === altSlug || slugify(p.title) === altSlug,
  );
  if (byAlt) return byAlt;

  return null;
}

/**
 * Build a lookup map from slug → CustomNodePackInfo for fast resolution.
 * Indexes by: id, slugified title, and GitHub repo name.
 */
export function buildPackLookup(
  packs: CustomNodePackInfo[],
): Map<string, CustomNodePackInfo> {
  const map = new Map<string, CustomNodePackInfo>();
  for (const p of packs) {
    map.set(p.id, p);
    const titleSlug = slugify(p.title);
    if (!map.has(titleSlug)) map.set(titleSlug, p);
    // Index by repo name
    const repoMatch = p.reference.match(/github\.com\/[^/]+\/([^/]+)/);
    if (repoMatch) {
      const repo = repoMatch[1].toLowerCase().replace(/\.git$/, '');
      if (!map.has(repo)) map.set(repo, p);
      const repoSlug = slugify(repo);
      if (!map.has(repoSlug)) map.set(repoSlug, p);
    }
  }
  return map;
}


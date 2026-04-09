/**
 * ComfyUI-Manager API Service
 *
 * Known ComfyUI environment issues (run in ComfyUI venv to fix):
 *   pip install piexif                 # fixes ComfyUI-Impact-Pack
 *   pip install diffusers              # fixes ComfyUI-Easy-Use warnings
 *   pip install imageio-ffmpeg         # fixes VideoHelperSuite
 *   pip install rotary-embedding-torch # fixes SeedVR2
 *   # triton is not available on Windows - ignore this warning
 *   # mediapipe/anyline need version-specific fixes - low priority
 */
import { getObjectInfo } from '../../services/comfyui-object-info-cache';
import { getComfyUIBaseUrl, resolveComfyUIBaseUrl } from '../../services/api-config';

export interface ManagerNode {
  id: string;
  title: string;
  reference: string;
  installed: string; // "True" | "False" | "Update"
  state?: string;
  is_installed?: boolean;
  install_type: string;
  description: string;
  author?: string;
  files?: string[];
  nodenames?: string[];
  node_names?: string[];
  nodes?: string[];
  repository?: string;
  url?: string;
}

interface ManagerListResponse {
  custom_nodes?: Array<Partial<ManagerNode>>;
  nodes?: Array<Partial<ManagerNode>>;
  data?: Array<Partial<ManagerNode>>;
}

export interface ManagerNodeListStatus {
  available: boolean;
  warning: string | null;
  checkedAt: number;
}

export interface MissingPackInfo {
  packTitle: string;
  reference: string;
  missingNodes: string[];
  managerNodeData?: ManagerNode;
  installed: string;
}

export interface InstallPackResult {
  success: boolean;
  message: string;
}

export interface InstallResult {
  success: boolean;
  error?: string;
}

export interface InstalledPackInfo {
  id: string;
  title: string;
  reference: string;
  description: string;
  author: string;
  installType: string;
  stars: number;
  lastUpdate: string;
  state: string;
  isInstalled: boolean;
  nodeTypes: string[];
  nodeCount: number;
}

export type ManagerPack = Record<string, any>;
export type QueueOperationType = 'install' | 'uninstall' | 'update';

export interface BatchInstallResult {
  installed: string[];
  failed: string[];
}

export interface BatchQueueResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

export interface BatchInstallCallbacks {
  onQueueing?: (pack: ManagerPack, index: number, total: number) => void;
  onQueueComplete?: () => void;
  onInstallProgress?: (status: string) => void;
  onRebootStarted?: () => void;
  onRebootComplete?: () => void;
  onVerifying?: () => void;
  onComplete?: (results: BatchInstallResult) => void;
  onError?: (error: string) => void;
}

export interface BatchQueueCallbacks {
  onQueueing?: (pack: ManagerPack, index: number, total: number) => void;
  onQueueComplete?: () => void;
  onProgress?: (status: string) => void;
  onError?: (error: string) => void;
}

export type ComfyUIStatusPhase =
  | 'unknown'
  | 'online'
  | 'offline'
  | 'queueing'
  | 'installing'
  | 'restarting'
  | 'error'
  | 'manager-node-list-updated';

export interface ComfyUIStatusEvent {
  phase: ComfyUIStatusPhase;
  message: string;
  baseUrl: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export type ManagerStatusCallback = (event: ComfyUIStatusEvent) => void;

export interface ModelDownloadRequest {
  url: string;
  filename: string;
  save_path?: string;
  modelDir?: string;
  modelType?: string;
  name?: string;
  type?: string;
  description?: string;
  reference?: string;
  base?: string;
  displayName?: string;
  modelPageUrl?: string;
  huggingfaceToken?: string;
  civitaiApiKey?: string;
}

export interface ModelDownloadResult {
  success: boolean;
  message: string;
  manualRequired?: boolean;
  gated?: boolean;
  modelInfo?: ModelManualInfo;
}

export interface ModelManualInfo {
  name: string;
  filename: string;
  url: string;
  huggingface_page: string;
  save_path: string;
  size: string;
  description: string;
}

export interface ModelRegistryEntry {
  name: string;
  type: string;
  base: string;
  description: string;
  reference: string;
  filename: string;
  url: string;
  save_path: string;
  installed?: string;
}

type ManagerModelRegistryRow = Record<string, unknown>;

interface KnownGatedModelEntry extends ModelManualInfo {
  base: string;
  type: string;
  gated: true;
  _isGated: true;
  _source: 'known_gated';
}

const BUILTIN_NODES = new Set([
  'Reroute',
  'Note',
  'PrimitiveNode',
  'RerouteTextForCLIPTextEncodeA1111',
]);

let cachedList: ManagerNode[] | null = null;
let cachedListBase: string | null = null;
let cachedAt = 0;
let pendingListRequest: Promise<ManagerNode[]> | null = null;
let pendingListBase: string | null = null;
const LIST_CACHE_MS = 120_000;
const managerNodeListStatusByBase = new Map<string, ManagerNodeListStatus>();
let queueOperationLock: Promise<void> = Promise.resolve();
const comfyUIStatusSubscribers = new Set<ManagerStatusCallback>();

let detectionPromise: Promise<boolean> | null = null;
let detectionResult: boolean | null = null;
let detectionTimestamp = 0;
let detectionBase: string | null = null;
const DETECTION_CACHE_TTL = 30_000;

let managerModelRegistryCache: ManagerModelRegistryRow[] | null = null;
let managerModelRegistryBase: string | null = null;
let managerModelRegistryAt = 0;
let pendingModelRegistryRequest: Promise<ManagerModelRegistryRow[]> | null = null;
let pendingModelRegistryBase: string | null = null;
const MODEL_REGISTRY_CACHE_MS = 120_000;

const NODE_LIST_UNAVAILABLE_WARNING =
  'ComfyUI Manager detected but node list unavailable. Custom node detection is limited to /object_info diffing until Manager list endpoints recover.';

const KNOWN_GATED_MODELS: Record<string, Omit<KnownGatedModelEntry, '_isGated' | '_source'>> = {
  'flux1-dev.safetensors': {
    name: 'FLUX.1-dev (Diffusion Model)',
    filename: 'flux1-dev.safetensors',
    url: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors',
    save_path: 'diffusion_models',
    base: 'FLUX.1',
    type: 'diffusion_model',
    size: '~23.8 GB',
    huggingface_page: 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
    gated: true,
    description: 'FLUX.1-dev diffusion model. Requires accepting the license on HuggingFace before downloading.',
  },
  'flux1-dev-fp8.safetensors': {
    name: 'FLUX.1-dev FP8 (Diffusion Model)',
    filename: 'flux1-dev-fp8.safetensors',
    url: 'https://huggingface.co/Kijai/flux-fp8/resolve/main/flux1-dev-fp8.safetensors',
    save_path: 'diffusion_models',
    base: 'FLUX.1',
    type: 'diffusion_model',
    size: '~11.9 GB',
    huggingface_page: 'https://huggingface.co/Kijai/flux-fp8',
    gated: true,
    description: 'FLUX.1-dev FP8 quantized. Smaller, faster. May require HF authentication.',
  },
  'flux1-schnell.safetensors': {
    name: 'FLUX.1-schnell (Diffusion Model)',
    filename: 'flux1-schnell.safetensors',
    url: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors',
    save_path: 'diffusion_models',
    base: 'FLUX.1',
    type: 'diffusion_model',
    size: '~23.8 GB',
    huggingface_page: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell',
    gated: true,
    description: 'FLUX.1-schnell fast inference model. Requires accepting the license on HuggingFace.',
  },
  'sd3.5_large.safetensors': {
    name: 'Stable Diffusion 3.5 Large',
    filename: 'sd3.5_large.safetensors',
    url: 'https://huggingface.co/stabilityai/stable-diffusion-3.5-large/resolve/main/sd3.5_large.safetensors',
    save_path: 'checkpoints',
    base: 'SD3',
    type: 'checkpoint',
    size: '~16.5 GB',
    huggingface_page: 'https://huggingface.co/stabilityai/stable-diffusion-3.5-large',
    gated: true,
    description: 'SD 3.5 Large checkpoint. Requires accepting the license on HuggingFace.',
  },
  'sd3_medium.safetensors': {
    name: 'Stable Diffusion 3 Medium',
    filename: 'sd3_medium.safetensors',
    url: 'https://huggingface.co/stabilityai/stable-diffusion-3-medium/resolve/main/sd3_medium.safetensors',
    save_path: 'checkpoints',
    base: 'SD3',
    type: 'checkpoint',
    size: '~4.0 GB',
    huggingface_page: 'https://huggingface.co/stabilityai/stable-diffusion-3-medium',
    gated: true,
    description: 'SD 3 Medium checkpoint. Requires accepting the license on HuggingFace.',
  },
};

export function getKnownGatedModel(filename: string): ModelManualInfo | null {
  const key = String(filename || '')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.toLowerCase() || '';
  if (!key) return null;
  const entry = KNOWN_GATED_MODELS[key];
  if (!entry) return null;
  return {
    name: entry.name,
    filename: entry.filename,
    url: entry.url,
    huggingface_page: entry.huggingface_page,
    save_path: entry.save_path,
    size: entry.size,
    description: entry.description,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStatusEvent(
  comfyuiUrl: string | undefined,
  phase: ComfyUIStatusPhase,
  message: string,
  details?: Record<string, unknown>,
): ComfyUIStatusEvent {
  return {
    phase,
    message,
    baseUrl: resolveBaseUrl(comfyuiUrl),
    timestamp: Date.now(),
    details,
  };
}

function emitComfyUIStatus(event: ComfyUIStatusEvent): void {
  for (const subscriber of comfyUIStatusSubscribers) {
    try {
      subscriber(event);
    } catch {
      // keep status broadcasting best-effort
    }
  }
}

function publishStatus(
  comfyuiUrl: string | undefined,
  phase: ComfyUIStatusPhase,
  message: string,
  callback?: ManagerStatusCallback,
  details?: Record<string, unknown>,
): void {
  const event = buildStatusEvent(comfyuiUrl, phase, message, details);
  emitComfyUIStatus(event);
  callback?.(event);
}

export function subscribeComfyUIStatus(callback: ManagerStatusCallback): () => void {
  comfyUIStatusSubscribers.add(callback);
  return () => {
    comfyUIStatusSubscribers.delete(callback);
  };
}

function resolveBaseUrl(comfyuiUrl?: string): string {
  const fallback = getComfyUIBaseUrl();
  return resolveComfyUIBaseUrl(comfyuiUrl || fallback);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function formatBodyPreview(text: string, maxLen = 500): string {
  const trimmed = text.trim();
  if (!trimmed) return '(empty body)';
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}...`;
}

function parseQueueError(responseBody: string): string | null {
  if (!responseBody.trim()) return null;
  try {
    const parsed = JSON.parse(responseBody) as Record<string, unknown>;
    if (parsed.success === false) {
      return String(parsed.error || parsed.message || 'Manager reported queue failure');
    }
    if (parsed.error) return String(parsed.error);
    return null;
  } catch {
    return null;
  }
}

function flattenStringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenStringValues(item));
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) => flattenStringValues(item));
  }
  return [];
}

async function queueFetch(
  comfyuiUrl: string | undefined,
  action: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, any>,
  timeoutMs = 120_000,
): Promise<{ ok: boolean; status: number; responseBody: string }> {
  const base = resolveBaseUrl(comfyuiUrl);
  const url = `${base}/api/manager/queue/${action}`;
  const options: RequestInit = { method };

  if (method === 'POST' && body) {
    options.headers = { 'Content-Type': 'text/plain;charset=UTF-8' };
    options.body = JSON.stringify(body);
  }

  console.log(`[Queue API] ${method} ${url}`);
  try {
    const response = await fetchWithTimeout(url, options, timeoutMs);
    const responseBody = await safeReadText(response);
    console.log(`[Queue API] ${method} ${url} -> ${response.status}`);
    return { ok: response.ok, status: response.status, responseBody };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Queue API] ${method} ${url} -> network error (${message})`);
    return { ok: false, status: 0, responseBody: message };
  }
}

async function withQueueLock<T>(operation: () => Promise<T>): Promise<T> {
  let releaseLock = () => {};
  const previousLock = queueOperationLock;
  queueOperationLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  await previousLock.catch(() => undefined);
  try {
    return await operation();
  } finally {
    releaseLock();
  }
}

function referenceToTitle(reference: string): string {
  const normalized = reference
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .split('/')
    .pop() || reference;
  return normalized.replace(/[-_]+/g, ' ').trim() || reference;
}

function parseManagerMappingsPayload(payload: unknown): ManagerNode[] {
  const entries: Array<[string, unknown]> = [];
  if (Array.isArray(payload)) {
    for (const row of payload) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const reference = String(row[0] ?? '').trim();
      if (!reference) continue;
      entries.push([reference, row[1]]);
    }
  } else if (payload && typeof payload === 'object') {
    entries.push(...Object.entries(payload as Record<string, unknown>));
  } else {
    return [];
  }

  const nodes: ManagerNode[] = [];

  for (const [reference, rawValue] of entries) {
    const lowerRef = reference.toLowerCase();
    if (!reference || reference.startsWith('_')) continue;
    if (lowerRef === 'error' || lowerRef === 'message' || lowerRef === 'status') continue;
    if (!reference.includes('/')) continue;
    const nodenames = [...new Set(
      flattenStringValues(rawValue)
        .map((v) => v.trim())
        .filter((v) => v.length > 0 && !/^https?:\/\//i.test(v)),
    )];
    if (nodenames.length === 0) continue;
    nodes.push({
      id: reference,
      title: referenceToTitle(reference),
      reference,
      installed: 'False',
      install_type: 'git-clone',
      description: '',
      nodenames,
    });
  }

  return nodes;
}

async function managerFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  silentStatuses: number[] = [],
): Promise<{ response: Response; errorBody: string }> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers || undefined);
  if (method === 'POST' && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const requestInit: RequestInit = {
    ...init,
    headers,
  };
  console.log(`[Manager API] ${method} ${url}`);

  try {
    const response = await fetchWithTimeout(url, requestInit, timeoutMs);
    if (!response.ok) {
      const body = await safeReadText(response);
      const preview = formatBodyPreview(body);
      if (silentStatuses.includes(response.status)) {
        console.log(`[Manager API] ${method} ${url} -> ${response.status}`);
      } else {
        console.error(`[Manager API] ${method} ${url} -> ${response.status}: ${preview}`);
      }
      return { response, errorBody: body };
    }

    const contentLength = response.headers.get('content-length');
    const sizeSuffix = contentLength ? ` (${Math.round((Number(contentLength) / 1024) * 10) / 10} KB)` : '';
    console.log(`[Manager API] ${method} ${url} -> ${response.status}${sizeSuffix}`);
    return { response, errorBody: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Manager API] ${method} ${url} -> network error (${message})`);
    throw error;
  }
}

function parseManagerNodeListPayload(payload: unknown): Array<Partial<ManagerNode>> {
  if (Array.isArray(payload)) {
    return payload as Array<Partial<ManagerNode>>;
  }

  if (payload && typeof payload === 'object') {
    const typed = payload as ManagerListResponse;
    if (Array.isArray(typed.custom_nodes)) return typed.custom_nodes;
    if (Array.isArray(typed.nodes)) return typed.nodes;
    if (Array.isArray(typed.data)) return typed.data;
    const firstArray = Object.values(payload as Record<string, unknown>).find((value) => Array.isArray(value));
    if (Array.isArray(firstArray)) {
      return firstArray as Array<Partial<ManagerNode>>;
    }
  }

  return [];
}

function normalizeManagerNode(node: Partial<ManagerNode>): ManagerNode {
  const normalizedState = typeof node.state === 'string' ? node.state.toLowerCase() : '';
  const rawInstalled = typeof node.is_installed === 'boolean' ? node.is_installed : node.installed;
  const normalizedInstalled = typeof rawInstalled === 'string' ? rawInstalled.toLowerCase() : rawInstalled;
  const isInstalled = normalizedState === 'enabled'
    || normalizedState === 'disabled'
    || normalizedState === 'update'
    || normalizedInstalled === 'true'
    || normalizedInstalled === true
    || normalizedInstalled === 'installed'
    || normalizedInstalled === 'enabled'
    || normalizedInstalled === 'update';

  return {
    id: String(node.id ?? ''),
    title: String(node.title ?? ''),
    reference: String(node.reference ?? node.repository ?? node.url ?? ''),
    installed: String(node.installed ?? 'False'),
    state: node.state ? String(node.state) : undefined,
    is_installed: isInstalled,
    install_type: String(node.install_type ?? 'git-clone'),
    description: String(node.description ?? ''),
    author: node.author ? String(node.author) : undefined,
    files: Array.isArray(node.files) ? node.files.map((f) => String(f)) : undefined,
    nodenames: Array.isArray(node.nodenames) ? node.nodenames.map((f) => String(f)) : undefined,
    node_names: Array.isArray(node.node_names) ? node.node_names.map((f) => String(f)) : undefined,
    nodes: Array.isArray(node.nodes) ? node.nodes.map((f) => String(f)) : undefined,
    repository: node.repository ? String(node.repository) : undefined,
    url: node.url ? String(node.url) : undefined,
  };
}

async function detectManager(comfyuiUrl: string): Promise<boolean> {
  const base = resolveBaseUrl(comfyuiUrl);

  const v2Endpoints = [
    `${base}/customnode/getlist?mode=local`,
    `${base}/customnode/getmappings?mode=local`,
    `${base}/customnode/installed`,
    `${base}/customnode/fetch_updates?mode=local`,
  ];
  const v3Endpoints = [
    `${base}/api/manager/node/list`,
    `${base}/api/manager/check`,
  ];

  console.log('[Manager Detection] Checking at:', base);

  for (const url of [...v2Endpoints, ...v3Endpoints]) {
    try {
      const { response } = await managerFetch(
        url,
        {
          method: 'GET',
          headers: { Accept: 'application/json, text/plain, */*' },
        },
        5000,
        [404],
      );

      // 200 = healthy Manager endpoint; 500 = endpoint exists but failed server-side.
      // 404 means the route is missing (Manager likely not installed for that endpoint).
      if (response.status !== 404) {
        console.log(`[Manager Detection] FOUND via ${url} (status: ${response.status})`);
        return true;
      }

      console.log(`[Manager Detection] ${url} -> 404`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[Manager Detection] ${url} -> network error (${message})`);
    }
  }

  console.log('[Manager Detection] No manager endpoints responded');
  return false;
}

export async function detectManagerCached(comfyuiUrl: string): Promise<boolean> {
  const base = resolveBaseUrl(comfyuiUrl);
  const now = Date.now();

  if (detectionBase !== base) {
    detectionResult = null;
    detectionTimestamp = 0;
    detectionPromise = null;
    detectionBase = base;
  }

  if (detectionResult !== null && (now - detectionTimestamp) < DETECTION_CACHE_TTL) {
    return detectionResult;
  }

  if (detectionPromise) {
    return detectionPromise;
  }

  detectionPromise = detectManager(comfyuiUrl)
    .then((result) => {
      detectionResult = result;
      detectionTimestamp = Date.now();
      detectionPromise = null;
      detectionBase = base;
      return result;
    })
    .catch((error) => {
      detectionPromise = null;
      throw error;
    });

  return detectionPromise;
}

export function invalidateDetectionCache(): void {
  detectionResult = null;
  detectionTimestamp = 0;
  detectionPromise = null;
}

export async function checkManagerAvailable(comfyuiUrl: string): Promise<boolean> {
  return await detectManagerCached(comfyuiUrl);
}

function setManagerNodeListStatus(base: string, available: boolean, warning: string | null): void {
  managerNodeListStatusByBase.set(base, {
    available,
    warning,
    checkedAt: Date.now(),
  });
}

function triggerNodePackMappingPrebuild(): void {
  import('./node-pack-mapper')
    .then((module) => module.getNodeToPackMapping())
    .then((mapping) => {
      console.log(
        `[NodePackMapper] Pre-built: ${mapping.nodeClassToPack.size} node->pack mappings, ${mapping.builtinNodes.size} built-in nodes`,
      );
    })
    .catch(() => {
      // silent warmup failure
    });
}

export function getManagerNodeListStatus(comfyuiUrl: string): ManagerNodeListStatus {
  const base = resolveBaseUrl(comfyuiUrl);
  return managerNodeListStatusByBase.get(base) ?? {
    available: true,
    warning: null,
    checkedAt: 0,
  };
}

export async function getManagerNodeList(
  comfyuiUrl: string,
  forceRefresh = false,
): Promise<ManagerNode[]> {
  const now = Date.now();
  const base = resolveBaseUrl(comfyuiUrl);
  if (!forceRefresh && cachedList && cachedListBase === base && now - cachedAt < LIST_CACHE_MS) {
    return cachedList;
  }

  if (pendingListRequest && pendingListBase === base) {
    return pendingListRequest;
  }

  pendingListBase = base;
  pendingListRequest = (async (): Promise<ManagerNode[]> => {
    const attempts: Array<{ url: string; method: 'GET'; parser: 'list' | 'mappings' }> = [
      { url: `${base}/customnode/getlist?mode=local`, method: 'GET', parser: 'list' },
      { url: `${base}/customnode/getmappings?mode=local`, method: 'GET', parser: 'mappings' },
      { url: `${base}/api/manager/node/list`, method: 'GET', parser: 'list' },
    ];

    let lastStatus = 0;
    let lastError = '';

    for (const attempt of attempts) {
      try {
        const { response, errorBody } = await managerFetch(
          attempt.url,
          {
            method: attempt.method,
            headers: { Accept: 'application/json, text/plain, */*' },
          },
          20_000,
        );

        lastStatus = response.status;
        if (!response.ok) {
          lastError = errorBody || `HTTP ${response.status}`;
          continue;
        }

        const payload = await response.json() as unknown;
        let rawNodeList: Array<Partial<ManagerNode>> = [];

        if (attempt.parser === 'list') {
          if (Array.isArray(payload)) {
            rawNodeList = payload as Array<Partial<ManagerNode>>;
          } else if (payload && typeof payload === 'object') {
            const objectPayload = payload as Record<string, unknown>;

            if (
              objectPayload.node_packs
              && typeof objectPayload.node_packs === 'object'
              && !Array.isArray(objectPayload.node_packs)
            ) {
              rawNodeList = Object.entries(objectPayload.node_packs as Record<string, unknown>).map(([id, info]) => {
                const packInfo = info && typeof info === 'object' ? info as Record<string, unknown> : {};
                const state = typeof packInfo.state === 'string' ? packInfo.state.toLowerCase() : '';
                const isInstalled = state === 'enabled' || state === 'disabled' || state === 'update';
                return {
                  id,
                  ...packInfo,
                  is_installed: isInstalled,
                };
              });
            } else if (Array.isArray(objectPayload.custom_nodes)) {
              rawNodeList = objectPayload.custom_nodes as Array<Partial<ManagerNode>>;
            } else {
              const arrayProp = Object.values(objectPayload).find((value) => Array.isArray(value));
              if (Array.isArray(arrayProp)) {
                rawNodeList = arrayProp as Array<Partial<ManagerNode>>;
              }
            }
          }
        }

        const nodes = attempt.parser === 'mappings'
          ? parseManagerMappingsPayload(payload)
          : rawNodeList.map(normalizeManagerNode);

        if (nodes.length === 0 && attempt.parser === 'list') {
          console.warn(`[Manager Node List] ${attempt.url} returned an empty list, trying fallback endpoint`);
          continue;
        }

        cachedList = nodes;
        cachedListBase = base;
        cachedAt = Date.now();
        setManagerNodeListStatus(base, true, null);
        publishStatus(
          base,
          'manager-node-list-updated',
          `Manager node list refreshed (${nodes.length} packs)`,
          undefined,
          { nodeCount: nodes.length, endpoint: attempt.url },
        );

        if (attempt.parser === 'list') {
          const installedCount = rawNodeList
            .map((node) => normalizeManagerNode(node))
            .filter((node) => node.is_installed)
            .length;
          const availableCount = Math.max(0, rawNodeList.length - installedCount);
          if (attempt.url.includes('/customnode/getlist?mode=local')) {
            console.log(
              `[Manager Node List] Loaded ${rawNodeList.length} custom nodes from /customnode/getlist?mode=local (${installedCount} installed, ${availableCount} available)`,
            );
          } else {
            console.log(
              `[Manager Node List] Loaded ${rawNodeList.length} custom nodes from ${attempt.url} (${installedCount} installed, ${availableCount} available)`,
            );
          }
        } else {
          console.log(`[Manager Node List] Loaded ${nodes.length} packs from ${attempt.method} ${attempt.url}`);
        }

        // Warm up node->pack mapping in the background for requirements analysis flows.
        triggerNodePackMappingPrebuild();
        return nodes;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastError = message;
        console.log(`[Manager Node List] ${attempt.method} ${attempt.url} failed: ${message}`);
      }
    }

    setManagerNodeListStatus(base, false, NODE_LIST_UNAVAILABLE_WARNING);
    console.warn(
      `[Manager] Node list unavailable (Manager detected but list endpoints returned errors). Last error: ${lastError || `HTTP ${lastStatus || 0}`}`,
    );
    return [];
  })();

  try {
    return await pendingListRequest;
  } finally {
    pendingListRequest = null;
    pendingListBase = null;
  }
}

export function getCachedManagerNodeList(): ManagerNode[] | null {
  return cachedList;
}

export function invalidateManagerNodeListCache(): void {
  cachedList = null;
  cachedListBase = null;
  cachedAt = 0;
  pendingListRequest = null;
  pendingListBase = null;
  managerNodeListStatusByBase.clear();
}

function normalizeReference(reference: string): string {
  return reference.replace(/\.git$/i, '').replace(/\/+$/, '').toLowerCase().trim();
}

export function buildManagerPackBody(packData: Record<string, any>): Record<string, any> {
  const reference = String(packData.reference ?? packData.repository ?? '').trim();
  const repository = String(packData.repository ?? reference).trim();
  const files = Array.isArray(packData.files)
    ? packData.files.map((entry: unknown) => String(entry))
    : (repository || reference)
      ? [repository || reference]
      : [];

  return {
    ...packData,
    id: String(packData.id ?? reference ?? ''),
    title: String(packData.title ?? packData.name ?? ''),
    reference,
    repository,
    files,
    install_type: String(packData.install_type ?? 'git-clone'),
    description: String(packData.description ?? ''),
    author: String(packData.author ?? ''),
    state: String(packData.state ?? ''),
    version: String(packData.version ?? ''),
    stars: Number(packData.stars ?? 0),
    last_update: String(packData.last_update ?? ''),
    selected_version: String(packData.selected_version ?? 'latest'),
    channel: String(packData.channel ?? 'default'),
    mode: String(packData.mode ?? 'cache'),
    skip_post_install: packData.skip_post_install === true,
    trust: packData.trust !== false,
    'update-state': String(packData['update-state'] ?? 'false'),
    health: String(packData.health ?? '-'),
  };
}

async function resolveManagerPackBody(
  comfyuiUrl: string | undefined,
  packData: Record<string, any>,
): Promise<Record<string, any>> {
  const base = resolveBaseUrl(comfyuiUrl);
  const normalizedInput = buildManagerPackBody(packData);
  const inputReference = normalizeReference(String(normalizedInput.reference ?? ''));
  const inputId = String(normalizedInput.id ?? '').trim();
  const inputTitle = String(normalizedInput.title ?? '').trim().toLowerCase();

  if (inputReference && normalizedInput.files?.length) {
    return normalizedInput;
  }

  const managerNodes = await getManagerNodeList(base);
  const matched = managerNodes.find((node) => {
    const byId = inputId && String(node.id ?? '').trim() === inputId;
    const byReference = inputReference && normalizeReference(String(node.reference ?? '')) === inputReference;
    const byTitle = inputTitle && String(node.title ?? '').trim().toLowerCase() === inputTitle;
    return byId || byReference || byTitle;
  });

  if (!matched) {
    return normalizedInput;
  }

  return buildManagerPackBody({
    ...matched,
    ...normalizedInput,
    files: normalizedInput.files?.length ? normalizedInput.files : matched.files,
  });
}

async function queueOperation(
  queueAction: QueueOperationType,
  packData: Record<string, any>,
  comfyuiUrl?: string,
  onStatus?: ManagerStatusCallback,
): Promise<InstallResult> {
  return await withQueueLock(async () => {
    try {
      const payload = await resolveManagerPackBody(comfyuiUrl, packData);
      const packTitle = payload.title || payload.id || payload.reference || 'Unknown pack';
      const actionLabel = queueAction === 'install' ? 'Install' : queueAction === 'uninstall' ? 'Uninstall' : 'Update';

      console.log(`[${actionLabel}] Step 1: Resetting queue...`);
      publishStatus(comfyuiUrl, 'queueing', `${actionLabel}: resetting queue`, onStatus, { action: queueAction, packTitle });
      const reset = await queueFetch(comfyuiUrl, 'reset', 'GET', undefined, 30_000);
      if (!reset.ok) {
        publishStatus(
          comfyuiUrl,
          'error',
          `${actionLabel}: queue reset failed (${reset.status})`,
          onStatus,
          { action: queueAction, packTitle, status: reset.status },
        );
        return {
          success: false,
          error: `Queue reset failed (${reset.status})${reset.responseBody ? `: ${formatBodyPreview(reset.responseBody)}` : ''}`,
        };
      }

      console.log(`[${actionLabel}] Step 2: Queueing ${queueAction} for: ${packTitle}`);
      publishStatus(comfyuiUrl, 'queueing', `${actionLabel}: queueing ${packTitle}`, onStatus, { action: queueAction, packTitle });
      const queued = await queueFetch(comfyuiUrl, queueAction, 'POST', payload, 120_000);
      if (!queued.ok) {
        publishStatus(
          comfyuiUrl,
          'error',
          `${actionLabel}: queue request failed (${queued.status})`,
          onStatus,
          { action: queueAction, packTitle, status: queued.status },
        );
        return {
          success: false,
          error: `${actionLabel} failed (${queued.status})${queued.responseBody ? `: ${formatBodyPreview(queued.responseBody)}` : ''}`,
        };
      }

      let queueResponseData: unknown = null;
      try {
        queueResponseData = queued.responseBody ? JSON.parse(queued.responseBody) : null;
      } catch {
        queueResponseData = null;
      }

      if (queueResponseData && typeof queueResponseData === 'object') {
        const typed = queueResponseData as Record<string, unknown>;
        if (typed.success === false) {
          publishStatus(
            comfyuiUrl,
            'error',
            `${actionLabel}: manager rejected queue request`,
            onStatus,
            { action: queueAction, packTitle },
          );
          return { success: false, error: String(typed.error || typed.message || 'Manager reported failure') };
        }
        if (typed.error) {
          publishStatus(
            comfyuiUrl,
            'error',
            `${actionLabel}: manager returned error`,
            onStatus,
            { action: queueAction, packTitle },
          );
          return { success: false, error: String(typed.error) };
        }
      }

      console.log(`[${actionLabel}] Step 3: Starting queue...`);
      publishStatus(comfyuiUrl, 'installing', `${actionLabel}: processing ${packTitle}`, onStatus, { action: queueAction, packTitle });
      const started = await queueFetch(comfyuiUrl, 'start', 'GET', undefined, 30_000);
      if (!started.ok) {
        console.warn(`[${actionLabel}] Queue start returned ${started.status}. Continuing because job may still be queued.`);
      } else {
        console.log(`[${actionLabel}] Queue started successfully for: ${packTitle}`);
      }

      publishStatus(comfyuiUrl, 'installing', `${actionLabel}: queued successfully for ${packTitle}`, onStatus, { action: queueAction, packTitle });
      invalidateManagerCaches();
      return { success: true };
    } catch (error) {
      publishStatus(
        comfyuiUrl,
        'error',
        `${queueAction} request failed`,
        onStatus,
        { action: queueAction },
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Manager request failed',
      };
    }
  });
}

function isQueueIdle(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as Record<string, unknown>;
  if (data.is_idle === true) return true;
  if (data.running === false) return true;
  if (data.status === 'idle' || data.status === 'done') return true;
  if (typeof data.remaining === 'number' && data.remaining <= 0) return true;
  if (typeof data.queue_remaining === 'number' && data.queue_remaining <= 0) return true;
  if (typeof data.pending_count === 'number' && data.pending_count <= 0 && data.running === false) return true;
  return false;
}

async function pollInstallCompletion(
  comfyuiUrl?: string,
  packCount = 1,
  maxWaitMs = 300_000,
  onStatus?: (status: string) => void,
  statusCallback?: ManagerStatusCallback,
): Promise<void> {
  const started = Date.now();
  const pollInterval = 3000;
  const estimatedMs = Math.min(maxWaitMs, Math.max(30_000, packCount * 30_000));

  while (Date.now() - started < maxWaitMs) {
    await sleep(pollInterval);

    const elapsedMs = Date.now() - started;
    const elapsedSec = Math.round(elapsedMs / 1000);
    onStatus?.(`Installing packs... ${elapsedSec}s elapsed`);
    publishStatus(comfyuiUrl, 'installing', `Installing packs... ${elapsedSec}s elapsed`, statusCallback, { elapsedSec, packCount });

    const statusResponse = await queueFetch(comfyuiUrl, 'status', 'GET', undefined, 15_000);
    if (statusResponse.ok) {
      try {
        const statusPayload = statusResponse.responseBody
          ? JSON.parse(statusResponse.responseBody)
          : null;
        console.log('[BatchInstall] Queue status:', statusPayload);
        if (isQueueIdle(statusPayload)) {
          console.log('[BatchInstall] Queue is idle - install batch complete');
          publishStatus(comfyuiUrl, 'online', 'Queue finished processing', statusCallback, { packCount });
          return;
        }
      } catch {
        // ignore parse errors and keep polling
      }
    }

    if (!statusResponse.ok && elapsedMs >= estimatedMs) {
      console.log('[BatchInstall] Queue status endpoint unavailable; estimated install window elapsed');
      publishStatus(
        comfyuiUrl,
        'installing',
        'Queue status endpoint unavailable; proceeding after estimated install window',
        statusCallback,
        { elapsedSec, packCount },
      );
      return;
    }
  }

  console.warn('[BatchInstall] Queue completion polling timed out, proceeding');
  publishStatus(comfyuiUrl, 'error', 'Queue completion polling timed out', statusCallback, { packCount });
}

export async function batchInstallPacks(
  packs: ManagerPack[],
  callbacks?: BatchInstallCallbacks,
  comfyuiUrl?: string,
  onStatus?: ManagerStatusCallback,
): Promise<BatchInstallResult> {
  const result = await batchQueuePacks(
    'install',
    packs,
    {
      onQueueing: callbacks?.onQueueing,
      onQueueComplete: callbacks?.onQueueComplete,
      onProgress: callbacks?.onInstallProgress,
      onError: callbacks?.onError,
    },
    comfyuiUrl,
    onStatus,
  );
  const converted: BatchInstallResult = {
    installed: result.succeeded,
    failed: result.failed.map((entry) => entry.id),
  };
  callbacks?.onComplete?.(converted);
  return converted;
}

export async function batchQueuePacks(
  operation: QueueOperationType,
  packs: ManagerPack[],
  callbacks?: BatchQueueCallbacks,
  comfyuiUrl?: string,
  onStatus?: ManagerStatusCallback,
): Promise<BatchQueueResult> {
  return await withQueueLock(async () => {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    const opLabel = operation.charAt(0).toUpperCase() + operation.slice(1);
    const opProgressVerb = operation === 'update' ? 'Updating' : operation === 'install' ? 'Installing' : 'Uninstalling';

    if (!packs.length) {
      return { succeeded, failed };
    }

    console.log(`[Batch${opLabel}] Resetting queue for ${packs.length} pack(s)...`);
    publishStatus(comfyuiUrl, 'queueing', `Batch ${operation}: resetting queue (${packs.length} packs)`, onStatus, { operation, total: packs.length });
    const reset = await queueFetch(comfyuiUrl, 'reset', 'GET', undefined, 30_000);
    if (!reset.ok) {
      const error = `Queue reset failed: ${reset.status}${reset.responseBody ? ` ${formatBodyPreview(reset.responseBody)}` : ''}`;
      publishStatus(comfyuiUrl, 'error', `Batch ${operation}: queue reset failed (${reset.status})`, onStatus, { operation, total: packs.length, status: reset.status });
      callbacks?.onError?.(error);
      return {
        succeeded,
        failed: packs.map((pack) => ({
          id: String(pack.id || pack.reference || pack.title || 'unknown-pack'),
          error,
        })),
      };
    }

    for (let index = 0; index < packs.length; index += 1) {
      const pack = packs[index];
      callbacks?.onQueueing?.(pack, index, packs.length);
      publishStatus(comfyuiUrl, 'queueing', `Batch ${operation}: queueing ${index + 1}/${packs.length}`, onStatus, { operation, index: index + 1, total: packs.length });
      const fallbackId = String(pack.id || pack.reference || pack.title || `pack-${index}`);
      try {
        const payload = await resolveManagerPackBody(comfyuiUrl, pack);
        const packId = String(payload.id || payload.reference || payload.title || fallbackId);
        const queueResult = await queueFetch(comfyuiUrl, operation, 'POST', payload, 120_000);
        if (!queueResult.ok) {
          const error = `${queueResult.status}${queueResult.responseBody ? ` ${formatBodyPreview(queueResult.responseBody)}` : ''}`;
          console.error(`[Batch${opLabel}] Failed to queue ${packId}: ${error}`);
          publishStatus(comfyuiUrl, 'error', `Batch ${operation}: failed to queue ${packId}`, onStatus, { operation, packId, status: queueResult.status });
          failed.push({ id: packId, error });
          continue;
        }

        const queueError = parseQueueError(queueResult.responseBody);
        if (queueError) {
          console.error(`[Batch${opLabel}] Manager rejected ${packId}: ${queueError}`);
          publishStatus(comfyuiUrl, 'error', `Batch ${operation}: manager rejected ${packId}`, onStatus, { operation, packId });
          failed.push({ id: packId, error: queueError });
          continue;
        }

        succeeded.push(packId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Batch${opLabel}] Failed to prepare ${fallbackId}: ${message}`);
        publishStatus(comfyuiUrl, 'error', `Batch ${operation}: failed to prepare ${fallbackId}`, onStatus, { operation, packId: fallbackId });
        failed.push({ id: fallbackId, error: message });
      }
    }

    if (succeeded.length === 0) {
      publishStatus(comfyuiUrl, 'error', `Batch ${operation}: no packs queued`, onStatus, { operation, total: packs.length });
      callbacks?.onError?.(`No packs were queued for ${operation}`);
      return { succeeded, failed };
    }

    callbacks?.onQueueComplete?.();
    console.log(`[Batch${opLabel}] Starting queue (${succeeded.length} queued, ${failed.length} failed)...`);
    publishStatus(comfyuiUrl, 'installing', `Batch ${operation}: processing ${succeeded.length} queued pack(s)`, onStatus, { operation, succeeded: succeeded.length, failed: failed.length });
    const started = await queueFetch(comfyuiUrl, 'start', 'GET', undefined, 30_000);
    if (!started.ok && started.status !== 201) {
      callbacks?.onError?.(`Queue start failed: ${started.status}`);
      console.error(`[Batch${opLabel}] Queue start failed: ${started.status}`);
      publishStatus(comfyuiUrl, 'error', `Batch ${operation}: queue start failed (${started.status})`, onStatus, { operation, status: started.status });
    }

    callbacks?.onProgress?.(`${opProgressVerb} ${succeeded.length} pack(s)... This may take a few minutes.`);
    await pollInstallCompletion(comfyuiUrl, succeeded.length, 300_000, callbacks?.onProgress, onStatus);
    await refreshManagerNodeList(comfyuiUrl);
    publishStatus(comfyuiUrl, 'manager-node-list-updated', `Batch ${operation}: manager list refreshed`, onStatus, { operation, succeeded: succeeded.length });
    return { succeeded, failed };
  });
}

export async function refreshManagerNodeList(comfyuiUrl?: string): Promise<ManagerNode[]> {
  return await getManagerNodeList(resolveBaseUrl(comfyuiUrl), true);
}

export async function installPack(
  packData: Record<string, any>,
  comfyuiUrl?: string,
  onStatus?: ManagerStatusCallback,
): Promise<InstallResult> {
  const result = await queueOperation('install', packData, comfyuiUrl, onStatus);
  if (result.success) {
    await refreshManagerNodeList(comfyuiUrl).catch(() => undefined);
    publishStatus(comfyuiUrl, 'manager-node-list-updated', 'Install completed, manager list refreshed', onStatus);
  }
  return result;
}

export async function uninstallPack(
  packData: Record<string, any>,
  comfyuiUrl?: string,
  onStatus?: ManagerStatusCallback,
): Promise<InstallResult> {
  const result = await queueOperation('uninstall', packData, comfyuiUrl, onStatus);
  if (result.success) {
    await refreshManagerNodeList(comfyuiUrl).catch(() => undefined);
    publishStatus(comfyuiUrl, 'manager-node-list-updated', 'Uninstall completed, manager list refreshed', onStatus);
  }
  return result;
}

export async function updatePack(
  packData: Record<string, any>,
  comfyuiUrl?: string,
  onStatus?: ManagerStatusCallback,
): Promise<InstallResult> {
  const result = await queueOperation('update', packData, comfyuiUrl, onStatus);
  if (result.success) {
    await refreshManagerNodeList(comfyuiUrl).catch(() => undefined);
    publishStatus(comfyuiUrl, 'manager-node-list-updated', 'Update completed, manager list refreshed', onStatus);
  }
  return result;
}

export async function togglePackActive(packData: Record<string, any>, comfyuiUrl?: string): Promise<InstallResult> {
  try {
    const base = resolveBaseUrl(comfyuiUrl);
    const normalized = await resolveManagerPackBody(base, packData);
    const state = String(normalized.state || '').toLowerCase();
    const nextState = state === 'enabled' ? 'disabled' : 'enabled';
    const payload = { ...normalized, state: nextState };
    const { response, errorBody } = await managerFetch(
      `${base}/customnode/toggle_active`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
      },
      60_000,
    );
    if (!response.ok) {
      return {
        success: false,
        error: `Toggle active failed (${response.status})${errorBody ? `: ${formatBodyPreview(errorBody)}` : ''}`,
      };
    }
    invalidateManagerCaches();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Toggle active failed',
    };
  }
}

export function invalidateManagerCaches(): void {
  invalidateManagerNodeListCache();
  invalidateDetectionCache();
  clearManagerModelRegistryCache();
  void import('./node-pack-mapper')
    .then((module) => module.invalidateNodeToPackMappingCache())
    .catch(() => {
      // keep cache invalidation best-effort
    });
}

export async function installCustomNodePack(
  comfyuiUrl: string,
  packData: Partial<ManagerNode> & { reference?: string },
): Promise<InstallPackResult> {
  const reference = String(packData.reference ?? '').trim();

  if (!reference) {
    return { success: false, message: 'Cannot auto-install: pack reference is missing.' };
  }
  const result = await installPack(buildManagerPackBody(packData as Record<string, any>), comfyuiUrl);
  return result.success
    ? { success: true, message: 'Installation queued. Restart ComfyUI to activate.' }
    : { success: false, message: result.error || 'Failed to install custom node pack.' };
}

export async function installCustomNode(
  comfyuiUrl: string,
  nodeInfo: Partial<ManagerNode> & { reference: string },
): Promise<void> {
  const result = await installCustomNodePack(comfyuiUrl, nodeInfo);
  if (!result.success) {
    throw new Error(result.message);
  }
}

export async function rebootComfyUI(comfyuiUrl?: string): Promise<boolean> {
  const base = resolveBaseUrl(comfyuiUrl);
  const endpoints: Array<{ path: string; method: 'GET' | 'POST' }> = [
    { path: '/api/manager/reboot', method: 'GET' },
    { path: '/api/manager/reboot', method: 'POST' },
    { path: '/manager/reboot', method: 'GET' },
    { path: '/manager/reboot', method: 'POST' },
  ];

  console.log('[Reboot] Rebooting ComfyUI...');
  publishStatus(comfyuiUrl, 'restarting', 'Triggering ComfyUI reboot...');

  for (const endpoint of endpoints) {
    const url = `${base}${endpoint.path}`;
    try {
      const { response } = await managerFetch(url, { method: endpoint.method }, 8000);
      if (response.ok || response.status === 200) {
        invalidateManagerCaches();
        publishStatus(comfyuiUrl, 'restarting', `Reboot triggered via ${endpoint.path}`);
        return true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[Reboot] ${url} error: ${message}`);
    }
  }

  publishStatus(comfyuiUrl, 'error', 'Failed to trigger ComfyUI reboot');
  return false;
}

export async function rebootAndWait(
  comfyuiUrl?: string,
  onRebootStarted?: () => void,
  onRebootComplete?: () => void,
  maxWaitMs = 120_000,
  onStatus?: ManagerStatusCallback,
): Promise<boolean> {
  const base = resolveBaseUrl(comfyuiUrl);
  const endpoints = [`${base}/api/manager/reboot`, `${base}/manager/reboot`];
  let rebootInitiated = false;

  for (const url of endpoints) {
    try {
      console.log(`[Reboot] Trying ${url}...`);
      const response = await fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: { Accept: 'application/json, text/plain, */*' },
        },
        10_000,
      ).catch(() => null);

      if (response === null) {
        console.log(`[Reboot] ${url} connection dropped - reboot initiated`);
        publishStatus(comfyuiUrl, 'restarting', `Reboot initiated via ${url} (connection dropped)`, onStatus);
        rebootInitiated = true;
        break;
      }

      if (response.ok || response.status === 200 || response.status === 202) {
        console.log(`[Reboot] ${url} -> ${response.status} - reboot initiated`);
        publishStatus(comfyuiUrl, 'restarting', `Reboot initiated via ${url}`, onStatus, { status: response.status });
        rebootInitiated = true;
        break;
      }

      console.log(`[Reboot] ${url} -> ${response.status}, trying next endpoint...`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[Reboot] ${url} threw error (expected during reboot): ${message}`);
      publishStatus(comfyuiUrl, 'restarting', `Reboot initiated via ${url} (${message})`, onStatus);
      rebootInitiated = true;
      break;
    }
  }

  if (!rebootInitiated) {
    console.error('[Reboot] No reboot endpoint responded with a usable signal');
    publishStatus(comfyuiUrl, 'error', 'No reboot endpoint responded with a usable signal', onStatus);
    return false;
  }

  onRebootStarted?.();
  publishStatus(comfyuiUrl, 'restarting', 'Reboot initiated. Waiting for ComfyUI to go offline...', onStatus);
  console.log('[Reboot] Reboot initiated. Waiting for server to go offline...');

  let serverWentDown = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(2000);
    try {
      const probe = await fetchWithTimeout(`${base}/system_stats`, { method: 'GET' }, 3000);
      if (!probe.ok) {
        serverWentDown = true;
        break;
      }
      console.log(`[Reboot] Server still up (attempt ${attempt + 1}/10)...`);
    } catch {
      serverWentDown = true;
      console.log('[Reboot] Server is offline.');
      publishStatus(comfyuiUrl, 'offline', 'ComfyUI is offline (restart in progress)', onStatus);
      break;
    }
  }

  if (!serverWentDown) {
    console.warn('[Reboot] Server did not go offline within 20s, polling for restart anyway...');
  }

  console.log('[Reboot] Polling for ComfyUI to come back online...');
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    await sleep(3000);
    try {
      const response = await fetchWithTimeout(`${base}/system_stats`, { method: 'GET' }, 5000);
      if (response.ok) {
        console.log('[Reboot] ComfyUI is back online!');
        invalidateManagerCaches();
        invalidateObjectInfoCache();
        onRebootComplete?.();
        publishStatus(comfyuiUrl, 'online', 'ComfyUI restarted successfully', onStatus);
        return true;
      }
    } catch {
      const elapsed = Math.round((Date.now() - started) / 1000);
      console.log(`[Reboot] Still waiting... (${elapsed}s elapsed)`);
      publishStatus(comfyuiUrl, 'restarting', `Waiting for ComfyUI restart... (${elapsed}s elapsed)`, onStatus, { elapsedSec: elapsed });
    }
  }

  console.warn(`[Reboot] Timed out after ${Math.round(maxWaitMs / 1000)}s waiting for ComfyUI`);
  publishStatus(comfyuiUrl, 'error', `ComfyUI restart timed out after ${Math.round(maxWaitMs / 1000)}s`, onStatus);
  return false;
}

export async function verifyInstallation(
  comfyuiUrl: string,
  requiredNodeTypes: string[],
): Promise<{ found: string[]; missing: string[] }> {
  const base = resolveBaseUrl(comfyuiUrl);
  const uniqueTypes = [...new Set(requiredNodeTypes.filter(Boolean))];

  if (!uniqueTypes.length) {
    return { found: [], missing: [] };
  }

  try {
    const objectInfo = await getObjectInfo(base, true);
    const available = new Set(Object.keys(objectInfo));
    const found: string[] = [];
    const missing: string[] = [];

    for (const nodeType of uniqueTypes) {
      if (available.has(nodeType)) found.push(nodeType);
      else missing.push(nodeType);
    }

    console.log(
      `[Verify] ${found.length}/${uniqueTypes.length} node type(s) present after install`,
    );
    if (missing.length > 0) {
      console.warn('[Verify] Missing node types after install:', missing);
    }

    return { found, missing };
  } catch (error) {
    console.error('[Verify] Failed to fetch /object_info for verification:', error);
    return { found: [], missing: uniqueTypes };
  }
}

export async function waitForComfyUI(
  comfyuiUrl: string,
  timeoutMs = 120_000,
  onStatus?: ManagerStatusCallback,
): Promise<boolean> {
  const base = resolveBaseUrl(comfyuiUrl);
  const started = Date.now();
  const pollInterval = 3000;

  console.log('[WaitForRestart] Waiting for ComfyUI to come back...');
  publishStatus(comfyuiUrl, 'restarting', 'Waiting for ComfyUI to come back online...', onStatus);

  await sleep(5000);

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetchWithTimeout(`${base}/system_stats`, { method: 'GET' }, 5000);
      if (response.ok) {
        console.log('[WaitForRestart] ComfyUI is back');
        await sleep(3000);
        invalidateManagerCaches();
        publishStatus(comfyuiUrl, 'online', 'ComfyUI is back online', onStatus);
        return true;
      }
    } catch {
      // still down
      publishStatus(comfyuiUrl, 'offline', 'ComfyUI still offline during restart wait', onStatus);
    }

    await sleep(pollInterval);
    console.log('[WaitForRestart] Still waiting...', Math.round((Date.now() - started) / 1000), 'seconds');
  }

  console.log('[WaitForRestart] Timed out');
  publishStatus(comfyuiUrl, 'error', 'Timed out waiting for ComfyUI restart', onStatus);
  return false;
}

export async function waitForRestart(
  comfyuiUrl: string,
  maxWaitMs = 120_000,
  onStatus?: ManagerStatusCallback,
): Promise<boolean> {
  return await waitForComfyUI(comfyuiUrl, maxWaitMs, onStatus);
}

const MANAGER_SAVE_PATH: Record<string, string> = {
  checkpoint: 'default/checkpoints',
  lora: 'default/loras',
  vae: 'default/vae',
  upscale: 'default/upscale_models',
  embedding: 'default/embeddings',
  unet: 'default/diffusion_models',
  clip: 'default/clip',
  controlnet: 'default/controlnet',
  ipadapter: 'custom_nodes/ComfyUI_IPAdapter_plus/models',
};

function stripModelExtension(filename: string): string {
  return filename.replace(/\.(safetensors|ckpt|pt|pth|bin|gguf)$/i, '');
}

function normalizeModelType(modelType: string): string {
  const value = (modelType || '').trim().toLowerCase();
  const mapping: Record<string, string> = {
    checkpoint: 'checkpoint',
    ckpt: 'checkpoint',
    checkpoints: 'checkpoint',
    lora: 'lora',
    loras: 'lora',
    vae: 'vae',
    upscale: 'upscale',
    upscaler: 'upscale',
    upscale_model: 'upscale',
    upscale_models: 'upscale',
    embedding: 'embedding',
    embeddings: 'embedding',
    unet: 'unet',
    diffusion_model: 'unet',
    diffusion_models: 'unet',
    clip: 'clip',
    clip_vision: 'clip',
    text_encoder: 'clip',
    controlnet: 'controlnet',
    control_net: 'controlnet',
    ipadapter: 'ipadapter',
    ip_adapter: 'ipadapter',
  };

  if (!value) return 'checkpoint';
  if (mapping[value]) return mapping[value];
  return value;
}

function inferModelTypeFromPath(pathOrType: string): string {
  const normalized = (pathOrType || '').trim().replace(/\\/g, '/').toLowerCase();
  if (!normalized) return 'checkpoint';
  const tail = normalized.split('/').pop() || normalized;
  return normalizeModelType(tail);
}

function resolveManagerSavePath(savePathOrModelDir: string | undefined, modelType: string): string {
  const raw = (savePathOrModelDir || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (raw) {
    if (raw.startsWith('default/') || raw.startsWith('custom_nodes/')) return raw;
    if (raw.startsWith('models/')) return `default/${raw.slice('models/'.length)}`;
    if (raw.includes('/')) {
      const tail = raw.split('/').pop() || raw;
      return `default/${tail}`;
    }
    const fromRawType = MANAGER_SAVE_PATH[normalizeModelType(raw)];
    if (fromRawType) return fromRawType;
    return `default/${raw}`;
  }

  return MANAGER_SAVE_PATH[normalizeModelType(modelType)] || `default/${normalizeModelType(modelType)}`;
}

function detectBaseArchitecture(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('flux')) return 'flux';
  if (lower.includes('sdxl') || lower.includes('sd_xl')) return 'sdxl';
  if (lower.includes('sd3') || lower.includes('sd_3')) return 'sd3';
  if (lower.includes('sd15') || lower.includes('v1-5') || lower.includes('v1.5')) return 'sd15';
  if (lower.includes('t5xxl') || lower.includes('clip_l') || lower.includes('clip_g')) return 'flux';
  if (lower.includes('ae.safetensors')) return 'flux';
  return 'other';
}

export async function installModel(
  comfyuiUrl: string,
  url: string,
  filename: string,
  modelType: string,
  displayName?: string,
  modelPageUrl?: string,
  auth?: { huggingfaceToken?: string; civitaiApiKey?: string },
  installPath?: string,
): Promise<{ status: string }> {
  const result = await downloadModel(comfyuiUrl, {
    url,
    filename,
    save_path: installPath,
    modelDir: installPath,
    modelType,
    name: displayName,
    displayName,
    reference: modelPageUrl,
    modelPageUrl,
    huggingfaceToken: auth?.huggingfaceToken,
    civitaiApiKey: auth?.civitaiApiKey,
  });

  if (!result.success) {
    throw new Error(result.message || `Model install failed: ${filename}`);
  }

  return { status: 'ok' };
}

export async function getModelInstallStatus(comfyuiUrl: string): Promise<Record<string, unknown>> {
  return await getQueueStatus(comfyuiUrl) as unknown as Record<string, unknown>;
}

export interface QueueStatusResponse {
  running: boolean;
  progress?: number;
  total?: number;
  current_item?: string;
  [key: string]: unknown;
}

export async function getQueueStatus(comfyuiUrl: string): Promise<QueueStatusResponse> {
  const base = resolveBaseUrl(comfyuiUrl);
  const endpoints = [
    `${base}/api/manager/queue/status`,
    `${base}/manager/queue/status`,
  ];

  for (const url of endpoints) {
    try {
      const { response } = await managerFetch(
        url,
        { method: 'GET', headers: { Accept: 'application/json, text/plain, */*' } },
        15_000,
        [404],
      );
      if (!response.ok) continue;
      try {
        return await response.json() as QueueStatusResponse;
      } catch {
        return { running: false };
      }
    } catch {
      // try fallback endpoint
    }
  }

  return { running: false };
}

function extractModelRegistryRows(payload: unknown, depth = 0): ManagerModelRegistryRow[] {
  if (!payload || depth > 3) return [];

  if (Array.isArray(payload)) {
    return payload
      .filter((entry): entry is ManagerModelRegistryRow => !!entry && typeof entry === 'object');
  }

  if (typeof payload !== 'object') {
    return [];
  }

  const obj = payload as Record<string, unknown>;
  const candidateKeys = ['models', 'model_list', 'data', 'items', 'custom_nodes', 'list'];
  for (const key of candidateKeys) {
    if (obj[key] === undefined) continue;
    const rows = extractModelRegistryRows(obj[key], depth + 1);
    if (rows.length > 0) return rows;
  }

  for (const value of Object.values(obj)) {
    if (!Array.isArray(value)) continue;
    const rows = extractModelRegistryRows(value, depth + 1);
    if (rows.length > 0) return rows;
  }

  return [];
}

function toModelRegistryEntry(row: ManagerModelRegistryRow): ModelRegistryEntry | null {
  const filename = String(row.filename ?? row.name ?? '').trim();
  const url = String(row.url ?? row.download_url ?? '').trim();
  if (!filename || !url) return null;
  return {
    name: String(row.name ?? filename),
    type: String(row.type ?? row.model_type ?? ''),
    base: String(row.base ?? ''),
    description: String(row.description ?? ''),
    reference: String(row.reference ?? row.page_url ?? ''),
    filename,
    url,
    save_path: String(row.save_path ?? row.model_dir ?? ''),
    installed: row.installed !== undefined ? String(row.installed) : undefined,
  };
}

function normalizeFilenameForMatch(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.toLowerCase() || '';
}

function isKnownGatedModelEntry(entry: ManagerModelRegistryRow | null): entry is KnownGatedModelEntry {
  if (!entry) return false;
  return entry._isGated === true;
}

function normalizeUrlForMatch(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const authKeys = new Set(['token', 'api_key', 'apikey', 'authorization', 'auth']);
    const queryPairs = [...parsed.searchParams.entries()]
      .filter(([key]) => !authKeys.has(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b));
    const base = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
    if (queryPairs.length === 0) return base;
    const query = queryPairs
      .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
      .join('&');
    return `${base}?${query}`;
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

function appendCivitaiToken(downloadUrl: string, civitaiApiKey?: string): string {
  if (!civitaiApiKey || !/civitai\.com/i.test(downloadUrl)) return downloadUrl;
  const sep = downloadUrl.includes('?') ? '&' : '?';
  return `${downloadUrl}${sep}token=${encodeURIComponent(civitaiApiKey)}`;
}

function resolveInternalModelDirectory(savePathOrModelDir: string | undefined, modelType: string): string {
  const raw = (savePathOrModelDir || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!raw) return getModelSavePath(modelType);
  if (raw.startsWith('default/')) return raw.slice('default/'.length) || getModelSavePath(modelType);
  if (raw.startsWith('models/')) return raw.slice('models/'.length) || getModelSavePath(modelType);
  if (raw.includes('/')) return raw.split('/').pop() || getModelSavePath(modelType);
  return raw;
}

export function clearManagerModelRegistryCache(): void {
  managerModelRegistryCache = null;
  managerModelRegistryBase = null;
  managerModelRegistryAt = 0;
  pendingModelRegistryRequest = null;
  pendingModelRegistryBase = null;
}

export async function fetchManagerModelRegistry(comfyuiUrl: string): Promise<ManagerModelRegistryRow[]> {
  const base = resolveBaseUrl(comfyuiUrl);
  const now = Date.now();
  if (
    managerModelRegistryCache
    && managerModelRegistryBase === base
    && now - managerModelRegistryAt < MODEL_REGISTRY_CACHE_MS
  ) {
    return managerModelRegistryCache;
  }
  if (pendingModelRegistryRequest && pendingModelRegistryBase === base) {
    return pendingModelRegistryRequest;
  }

  pendingModelRegistryBase = base;
  pendingModelRegistryRequest = (async () => {
    const endpoints = [
      `${base}/externalmodel/getlist?mode=cache`,
      `${base}/externalmodel/getlist?mode=default`,
      `${base}/models/getlist`,
      `${base}/api/manager/models/getlist`,
    ];
    for (const url of endpoints) {
      try {
        const response = await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers: { Accept: 'application/json, text/plain, */*' },
          },
          30_000,
        );
        if (!response.ok) {
          const body = await safeReadText(response);
          console.warn(`[ModelDownload] Registry fetch failed via ${url}: ${response.status}${body ? ` ${formatBodyPreview(body)}` : ''}`);
          continue;
        }

        const payload = await response.json() as unknown;
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          console.log('[ModelDownload] Registry response keys:', Object.keys(payload as Record<string, unknown>));
        }

        const rows = extractModelRegistryRows(payload);
        console.log(`[ModelDownload] Loaded ${rows.length} models from Manager registry (${url})`);
        if (rows.length > 0) {
          console.log('[ModelDownload] Sample entry:', JSON.stringify(rows[0], null, 2));
        }

        managerModelRegistryCache = rows;
        managerModelRegistryBase = base;
        managerModelRegistryAt = Date.now();
        return rows;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[ModelDownload] Registry fetch failed via ${url}: ${message}`);
      }
    }

    managerModelRegistryCache = [];
    managerModelRegistryBase = base;
    managerModelRegistryAt = Date.now();
    return [];
  })();

  try {
    return await pendingModelRegistryRequest;
  } finally {
    pendingModelRegistryRequest = null;
    pendingModelRegistryBase = null;
  }
}

export function findModelInRegistry(
  registry: ManagerModelRegistryRow[],
  missingModel: { filename: string; url?: string; name?: string },
): ManagerModelRegistryRow | null {
  const targetFilenameExact = String(missingModel.filename || '').trim();
  if (!targetFilenameExact) return null;

  const byFilename = registry.find((entry) => {
    const entryFilename = String(entry.filename ?? '').trim();
    return entryFilename === targetFilenameExact;
  });
  if (byFilename) {
    console.log(`[ModelDownload] Matched by filename: ${missingModel.filename}`);
    return byFilename;
  }

  const targetFilename = normalizeFilenameForMatch(missingModel.filename);
  if (targetFilename) {
    const byFilenameCaseInsensitive = registry.find((entry) => {
      const entryFilename = normalizeFilenameForMatch(entry.filename ?? entry.name);
      return entryFilename === targetFilename;
    });
    if (byFilenameCaseInsensitive) {
      console.log(`[ModelDownload] Matched by filename (normalized): ${missingModel.filename}`);
      return byFilenameCaseInsensitive;
    }
  }

  const targetUrl = normalizeUrlForMatch(missingModel.url || '');
  if (targetUrl) {
    const byUrl = registry.find((entry) => {
      const candidateUrl = normalizeUrlForMatch(entry.url);
      return candidateUrl === targetUrl;
    });
    if (byUrl) {
      console.log(`[ModelDownload] Matched by URL: ${missingModel.url}`);
      return byUrl;
    }
  }

  const fuzzyNeedle = targetFilenameExact.replace(/\.[^.]+$/, '').toLowerCase();
  if (fuzzyNeedle) {
    const byFuzzy = registry.find((entry) => {
      const entryFilename = String(entry.filename ?? '').trim().replace(/\.[^.]+$/, '').toLowerCase();
      return entryFilename === fuzzyNeedle;
    });
    if (byFuzzy) {
      console.log(`[ModelDownload] Matched by fuzzy name: ${fuzzyNeedle} -> ${String(byFuzzy.filename ?? byFuzzy.name ?? '')}`);
      return byFuzzy;
    }
  }

  const targetName = String(missingModel.name || '').trim().toLowerCase();
  if (targetName) {
    const byName = registry.find((entry) => String(entry.name ?? '').trim().toLowerCase().includes(targetName));
    if (byName) {
      console.log(`[ModelDownload] Matched by name fallback: ${missingModel.name}`);
      return byName;
    }
  }

  const gatedKey = normalizeFilenameForMatch(missingModel.filename);
  const knownGated = KNOWN_GATED_MODELS[gatedKey];
  if (knownGated) {
    console.log(`[ModelDownload] Known gated model: ${missingModel.filename} -> ${knownGated.huggingface_page}`);
    return {
      ...knownGated,
      _isGated: true,
      _source: 'known_gated',
    };
  }

  console.warn(`[ModelDownload] No registry match for: ${missingModel.filename}`);
  return null;
}

export async function getModelList(comfyuiUrl: string): Promise<ModelRegistryEntry[]> {
  const registry = await fetchManagerModelRegistry(comfyuiUrl);
  return registry
    .map((row) => toModelRegistryEntry(row))
    .filter((entry): entry is ModelRegistryEntry => entry !== null);
}

export function getModelSavePath(modelType: string): string {
  const type = (modelType || '').toLowerCase().trim();

  const mapping: Record<string, string> = {
    checkpoint: 'checkpoints',
    ckpt: 'checkpoints',
    checkpoints: 'checkpoints',
    lora: 'loras',
    loras: 'loras',
    vae: 'vae',
    clip: 'clip',
    text_encoder: 'clip',
    clip_vision: 'clip_vision',
    controlnet: 'controlnet',
    control_net: 'controlnet',
    upscale_model: 'upscale_models',
    upscale: 'upscale_models',
    upscaler: 'upscale_models',
    embedding: 'embeddings',
    embeddings: 'embeddings',
    hypernetwork: 'hypernetworks',
    style_model: 'style_models',
    gligen: 'gligen',
    unet: 'diffusion_models',
    diffusion_model: 'diffusion_models',
    diffusion_models: 'diffusion_models',
    ipadapter: 'ipadapter',
    ip_adapter: 'ipadapter',
    insightface: 'insightface',
    reactor: 'reactor',
    ultralytics: 'ultralytics',
    sam: 'sams',
    onnx: 'onnx',
    configs: 'configs',
  };

  return mapping[type] || 'checkpoints';
}

export async function downloadModel(
  comfyuiUrl: string,
  request: ModelDownloadRequest,
): Promise<ModelDownloadResult> {
  const base = resolveBaseUrl(comfyuiUrl);
  const displayName = request.displayName || request.name || request.filename;

  const registry = await fetchManagerModelRegistry(comfyuiUrl);
  const registryEntry = findModelInRegistry(registry, {
    filename: request.filename,
    url: request.url,
    name: displayName,
  });

  if (isKnownGatedModelEntry(registryEntry)) {
    console.log(`[ModelDownload] Gated model detected: ${request.filename}. Manual download required.`);
    return {
      success: false,
      manualRequired: true,
      gated: true,
      message: `"${registryEntry.name}" is a gated model requiring HuggingFace license acceptance. Accept the license, then download manually.`,
      modelInfo: {
        name: registryEntry.name,
        filename: registryEntry.filename,
        url: registryEntry.url,
        huggingface_page: registryEntry.huggingface_page,
        save_path: registryEntry.save_path,
        size: registryEntry.size,
        description: registryEntry.description,
      },
    };
  }

  if (registryEntry) {
    const queueResult = await withQueueLock(async (): Promise<ModelDownloadResult | null> => {
      const resetUrls = [
        `${base}/manager/queue/reset`,
        `${base}/api/manager/queue/reset`,
      ];
      let resetOk = false;
      let resetError = '';
      for (const resetUrl of resetUrls) {
        try {
          const resetResponse = await fetchWithTimeout(resetUrl, { method: 'GET' }, 30_000);
          if (resetResponse.ok || resetResponse.status === 201) {
            resetOk = true;
            break;
          }
          if (resetResponse.status === 404) continue;
          const body = await safeReadText(resetResponse);
          resetError = `Queue reset failed (${resetResponse.status})${body ? `: ${formatBodyPreview(body)}` : ''}`;
        } catch (error) {
          resetError = error instanceof Error ? error.message : String(error);
        }
      }
      if (!resetOk) {
        return { success: false, message: resetError || 'Queue reset endpoint not available.' };
      }

      const installPayload = JSON.stringify(registryEntry);
      console.log('[ModelDownload] Sending verbatim registry entry:', {
        name: String(registryEntry.name ?? ''),
        filename: String(registryEntry.filename ?? ''),
        save_path: String(registryEntry.save_path ?? ''),
        base: String(registryEntry.base ?? ''),
        type: String(registryEntry.type ?? ''),
        url: String(registryEntry.url ?? ''),
      });

      const installUrls = [
        `${base}/manager/queue/install_model`,
        `${base}/api/manager/queue/install_model`,
      ];
      let installOk = false;
      let installError = '';
      for (const installUrl of installUrls) {
        try {
          const installResponse = await fetchWithTimeout(
            installUrl,
            {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
              body: installPayload,
            },
            120_000,
          );
          if (installResponse.ok || installResponse.status === 201) {
            installOk = true;
            break;
          }
          if (installResponse.status === 404) continue;
          const body = await safeReadText(installResponse);
          const queueError = parseQueueError(body);
          installError = queueError || `Queue install_model failed (${installResponse.status})${body ? `: ${formatBodyPreview(body)}` : ''}`;
        } catch (error) {
          installError = error instanceof Error ? error.message : String(error);
        }
      }
      if (!installOk) {
        return { success: false, message: installError || 'Queue install_model endpoint not available.' };
      }

      const startUrls = [
        `${base}/manager/queue/start`,
        `${base}/api/manager/queue/start`,
      ];
      let startOk = false;
      let startError = '';
      for (const startUrl of startUrls) {
        try {
          const startResponse = await fetchWithTimeout(startUrl, { method: 'GET' }, 30_000);
          if (startResponse.ok || startResponse.status === 201) {
            startOk = true;
            break;
          }
          if (startResponse.status === 404) continue;
          const body = await safeReadText(startResponse);
          startError = `Queue start failed (${startResponse.status})${body ? `: ${formatBodyPreview(body)}` : ''}`;
        } catch (error) {
          startError = error instanceof Error ? error.message : String(error);
        }
      }
      if (!startOk) {
        return { success: false, message: startError || 'Queue start endpoint not available after queueing model install.' };
      }

      console.log('[ModelDownload] Queue install accepted and started');
      return { success: true, message: `Download started: ${request.filename}` };
    });

    if (queueResult) {
      return queueResult;
    }
  }

  return {
    success: false,
    message: `"${request.filename}" is not in the ComfyUI Manager model registry. Install manually via Manager UI or download directly from the model page.`,
    manualRequired: true,
  };
}

function extractWorkflowClassTypes(workflowJson: unknown): string[] {
  const out = new Set<string>();
  if (!workflowJson || typeof workflowJson !== 'object') return [];

  const typed = workflowJson as Record<string, unknown>;
  if (Array.isArray((typed as { nodes?: unknown[] }).nodes)) {
    for (const node of (typed as { nodes: unknown[] }).nodes) {
      const nodeObj = node as Record<string, unknown>;
      const type = typeof nodeObj?.type === 'string'
        ? nodeObj.type
        : typeof nodeObj?.class_type === 'string'
          ? nodeObj.class_type
          : '';
      if (type) out.add(type);
    }
  } else {
    for (const value of Object.values(typed)) {
      const node = value as Record<string, unknown>;
      if (!node || typeof node !== 'object') continue;
      const type = typeof node.class_type === 'string'
        ? node.class_type
        : typeof node.type === 'string'
          ? node.type
          : '';
      if (type) out.add(type);
    }
  }

  return [...out];
}

function normalizeNodeName(value: string): string {
  return value.trim().toLowerCase();
}

function getPackNodeNames(pack: ManagerNode): string[] {
  return [
    ...(pack.nodenames ?? []),
    ...(pack.node_names ?? []),
    ...(pack.nodes ?? []),
    ...(pack.files ?? []),
  ]
    .map((name) => String(name).trim())
    .filter(Boolean);
}

export function getPackNodeTypes(pack: ManagerNode): string[] {
  return [
    ...(pack.nodenames ?? []),
    ...(pack.node_names ?? []),
    ...(pack.nodes ?? []),
  ]
    .map((name) => String(name).trim())
    .filter(Boolean)
    .filter((name, index, arr) => arr.indexOf(name) === index);
}

function isInstalledPack(pack: ManagerNode): boolean {
  const state = String(pack.state ?? '').toLowerCase();
  const installed = String(pack.installed ?? '').toLowerCase();
  return pack.is_installed === true
    || state === 'enabled'
    || state === 'disabled'
    || state === 'update'
    || installed === 'true'
    || installed === 'installed'
    || installed === 'enabled'
    || installed === 'update';
}

export function toInstalledPackInfo(pack: ManagerNode): InstalledPackInfo {
  const nodeTypes = getPackNodeTypes(pack);
  const rawPack = pack as unknown as Record<string, unknown>;
  const stars = typeof rawPack.stars === 'number'
    ? rawPack.stars
    : typeof rawPack.stars === 'string'
      ? Number(rawPack.stars) || 0
      : 0;

  return {
    id: String(pack.id ?? ''),
    title: String(pack.title ?? ''),
    reference: String(pack.reference ?? pack.repository ?? pack.url ?? ''),
    description: String(pack.description ?? ''),
    author: String(pack.author ?? 'Unknown'),
    installType: String(pack.install_type ?? 'git-clone'),
    stars,
    lastUpdate: typeof rawPack.last_update === 'string' ? rawPack.last_update : '',
    state: String(pack.state ?? ''),
    isInstalled: isInstalledPack(pack),
    nodeTypes,
    nodeCount: nodeTypes.length,
  };
}

export function getCachedInstalledPacks(): InstalledPackInfo[] {
  const list = getCachedManagerNodeList();
  if (!list || list.length === 0) return [];
  return list
    .map((pack) => toInstalledPackInfo(pack))
    .filter((pack) => pack.isInstalled);
}

export async function getInstalledPacks(
  comfyuiUrl: string,
  forceRefresh = false,
): Promise<InstalledPackInfo[]> {
  const packs = await getManagerNodeList(comfyuiUrl, forceRefresh);
  return packs
    .map((pack) => toInstalledPackInfo(pack))
    .filter((pack) => pack.isInstalled);
}

function packContainsNode(pack: ManagerNode, nodeType: string): boolean {
  const target = normalizeNodeName(nodeType);
  const names = getPackNodeNames(pack).map(normalizeNodeName);

  return names.some((name) => {
    if (name === target) return true;

    const slashParts = name.split('/');
    const tail = slashParts[slashParts.length - 1] || name;
    if (tail === target) return true;

    return name.includes(target);
  });
}

export async function detectMissingPacks(
  comfyuiUrl: string,
  workflowJson: unknown,
  options?: { includeManagerLookup?: boolean },
): Promise<MissingPackInfo[]> {
  const base = resolveBaseUrl(comfyuiUrl);
  const workflowNodeTypes = extractWorkflowClassTypes(workflowJson);
  if (workflowNodeTypes.length === 0) return [];

  let objectInfo: Record<string, unknown> = {};
  try {
    objectInfo = await getObjectInfo(base);
  } catch {
    objectInfo = {};
  }

  const availableTypes = new Set(Object.keys(objectInfo));
  const missingTypeSet = new Set<string>();
  for (const nodeType of workflowNodeTypes) {
    if (BUILTIN_NODES.has(nodeType)) continue;
    if (!availableTypes.has(nodeType)) {
      missingTypeSet.add(nodeType);
    }
  }

  const missingTypes = [...missingTypeSet];
  if (missingTypes.length === 0) return [];

  const includeManagerLookup = options?.includeManagerLookup ?? true;
  if (!includeManagerLookup) {
    return missingTypes.map((nodeType) => ({
      packTitle: `Unknown pack for: ${nodeType}`,
      reference: '',
      missingNodes: [nodeType],
      installed: 'False',
    }));
  }

  let managerNodes: ManagerNode[] = [];
  try {
    managerNodes = await getManagerNodeList(base);
  } catch {
    managerNodes = [];
  }

  const packMap = new Map<string, MissingPackInfo>();
  for (const nodeType of missingTypes) {
    const matchingPack = managerNodes.find((pack) => packContainsNode(pack, nodeType));

    if (matchingPack) {
      const key = matchingPack.reference || matchingPack.title;
      if (!packMap.has(key)) {
        packMap.set(key, {
          packTitle: matchingPack.title || 'Unknown Pack',
          reference: matchingPack.reference || '',
          missingNodes: [],
          managerNodeData: matchingPack,
          installed: matchingPack.installed || 'False',
        });
      }
      packMap.get(key)!.missingNodes.push(nodeType);
    } else {
      const key = `__unknown__${nodeType}`;
      packMap.set(key, {
        packTitle: `Unknown pack for: ${nodeType}`,
        reference: '',
        missingNodes: [nodeType],
        installed: 'False',
      });
    }
  }

  return [...packMap.values()];
}

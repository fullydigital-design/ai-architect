import { getComfyUIBaseUrl } from '../../services/api-config';
import { getObjectInfo } from '../../services/comfyui-object-info-cache';
import { getManagerNodeList, type ManagerNode } from './comfyui-manager-service';

export interface PackInfo {
  id: string;
  title: string;
  author: string;
  description: string;
  reference: string;
  repository: string;
  state: string;
  is_installed: boolean;
  install_type: string;
  version: string;
  stars: number;
  last_update: string;
}

export interface NodeToPackMapping {
  nodeClassToPack: Map<string, PackInfo>;
  repoToPack: Map<string, PackInfo>;
  packToNodeClasses: Map<string, string[]>;
  builtinNodes: Set<string>;
  builtAt: number;
}

const MAPPING_TTL_MS = 5 * 60 * 1000;
let cachedMapping: NodeToPackMapping | null = null;
let cachedBase: string | null = null;
let buildPromise: Promise<NodeToPackMapping> | null = null;
let buildBase: string | null = null;

export function getComfyUIApiBase(): string {
  return getComfyUIBaseUrl();
}

export function invalidateNodeToPackMappingCache(): void {
  cachedMapping = null;
  cachedBase = null;
  buildPromise = null;
  buildBase = null;
}

function normalizeRepoUrl(url: string): string {
  return url
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .toLowerCase()
    .trim();
}

function isInstalledState(state: string): boolean {
  const normalized = state.toLowerCase();
  return normalized === 'enabled' || normalized === 'disabled' || normalized === 'update';
}

function managerNodeToPackInfo(pack: ManagerNode): PackInfo {
  const raw = pack as unknown as Record<string, unknown>;
  const version = typeof raw.version === 'string'
    ? raw.version
    : typeof raw.cnr_latest === 'string'
      ? raw.cnr_latest
      : 'unknown';
  const stars = typeof raw.stars === 'number'
    ? raw.stars
    : typeof raw.stars === 'string'
      ? Number(raw.stars) || 0
      : 0;
  const state = typeof pack.state === 'string'
    ? pack.state
    : typeof raw.state === 'string'
      ? raw.state
      : 'unknown';
  const reference = pack.reference || pack.repository || pack.url || '';
  const repository = pack.repository || reference;

  return {
    id: pack.id || reference || pack.title || 'unknown-pack',
    title: pack.title || pack.id || 'Unknown Pack',
    author: pack.author || 'Unknown',
    description: pack.description || '',
    reference,
    repository,
    state,
    is_installed: typeof pack.is_installed === 'boolean'
      ? pack.is_installed
      : isInstalledState(state),
    install_type: pack.install_type || 'unknown',
    version,
    stars,
    last_update: typeof raw.last_update === 'string' ? raw.last_update : '',
  };
}

function collectPackUrls(pack: ManagerNode): string[] {
  const raw = pack as unknown as Record<string, unknown>;
  const urls = new Set<string>();
  const candidates: unknown[] = [
    pack.reference,
    pack.repository,
    pack.url,
    raw.files,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string') {
      if (candidate.trim()) urls.add(candidate.trim());
      continue;
    }
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        if (typeof entry === 'string' && entry.trim()) {
          urls.add(entry.trim());
        }
      }
    }
  }

  return [...urls];
}

function flattenStringArrays(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenStringArrays(entry));
  }
  return [];
}

async function fetchMappings(apiBase: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${apiBase}/customnode/getmappings?mode=local`);
    if (!response.ok) return null;
    const data = await response.json() as unknown;

    if (Array.isArray(data)) {
      const asObject: Record<string, unknown> = {};
      for (const item of data) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const repo = typeof item[0] === 'string' ? item[0] : String(item[0] ?? '');
        if (!repo) continue;
        asObject[repo] = item[1];
      }
      return asObject;
    }

    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }

    return null;
  } catch (error) {
    console.warn('[NodePackMapper] Failed to fetch mappings:', error);
    return null;
  }
}

async function fetchObjectInfo(apiBase: string): Promise<Record<string, unknown> | null> {
  try {
    const objectInfo = await getObjectInfo(apiBase);
    return objectInfo as Record<string, unknown>;
  } catch (error) {
    console.warn('[NodePackMapper] Failed to fetch object_info:', error);
    return null;
  }
}

async function buildMapping(apiBase: string): Promise<NodeToPackMapping> {
  const [nodeList, mappingsData, objectInfo] = await Promise.all([
    getManagerNodeList(apiBase),
    fetchMappings(apiBase),
    fetchObjectInfo(apiBase),
  ]);

  const nodeClassToPack = new Map<string, PackInfo>();
  const repoToPack = new Map<string, PackInfo>();
  const packToNodeClasses = new Map<string, string[]>();

  for (const pack of nodeList) {
    const packInfo = managerNodeToPackInfo(pack);
    for (const url of collectPackUrls(pack)) {
      repoToPack.set(normalizeRepoUrl(url), packInfo);
    }
    if (packInfo.reference) {
      repoToPack.set(normalizeRepoUrl(packInfo.reference), packInfo);
    }
    if (packInfo.repository) {
      repoToPack.set(normalizeRepoUrl(packInfo.repository), packInfo);
    }
  }

  if (mappingsData) {
    for (const [repoUrl, rawNodeClassArrays] of Object.entries(mappingsData)) {
      const normalizedRepo = normalizeRepoUrl(repoUrl);
      const packInfo = repoToPack.get(normalizedRepo);
      const nodeClasses = [...new Set(
        flattenStringArrays(rawNodeClassArrays)
          .map((nodeClass) => nodeClass.trim())
          .filter(Boolean),
      )];

      if (!packInfo || nodeClasses.length === 0) continue;

      packToNodeClasses.set(packInfo.id, nodeClasses);
      for (const nodeClass of nodeClasses) {
        nodeClassToPack.set(nodeClass, packInfo);
      }
    }
  }

  const builtinNodes = new Set<string>();
  if (objectInfo) {
    for (const nodeClass of Object.keys(objectInfo)) {
      if (!nodeClassToPack.has(nodeClass)) {
        builtinNodes.add(nodeClass);
      }
    }
  }

  const mapping: NodeToPackMapping = {
    nodeClassToPack,
    repoToPack,
    packToNodeClasses,
    builtinNodes,
    builtAt: Date.now(),
  };

  console.log(
    `[NodePackMapper] Built mapping: ${mapping.nodeClassToPack.size} node classes -> packs, ${mapping.builtinNodes.size} built-in nodes, ${mapping.packToNodeClasses.size} packs`,
  );

  return mapping;
}

export async function getNodeToPackMapping(forceRefresh = false): Promise<NodeToPackMapping> {
  const apiBase = getComfyUIApiBase();
  const now = Date.now();

  if (cachedBase !== apiBase) {
    cachedMapping = null;
    buildPromise = null;
    buildBase = null;
    cachedBase = apiBase;
  }

  if (cachedMapping && !forceRefresh && (now - cachedMapping.builtAt) < MAPPING_TTL_MS) {
    return cachedMapping;
  }

  if (buildPromise && buildBase === apiBase) {
    return buildPromise;
  }

  buildBase = apiBase;
  buildPromise = buildMapping(apiBase)
    .then((mapping) => {
      cachedMapping = mapping;
      cachedBase = apiBase;
      buildPromise = null;
      buildBase = null;
      return mapping;
    })
    .catch((error) => {
      buildPromise = null;
      buildBase = null;
      throw error;
    });

  return buildPromise;
}

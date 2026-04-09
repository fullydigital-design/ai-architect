import { classifyNodesByPack } from './node-schema-filter';
import {
  buildSchemaDrawerSection,
  formatLiveNodeForPrompt,
  getLiveNodeCache,
  type LiveNodeCache,
  type LiveNodeSchema,
} from './comfyui-backend';
import type { CustomNodePackInfo } from '../data/custom-node-registry';

export type SchemaMode = 'full' | 'compact' | 'off';

export interface SelectorState {
  version: 2;
  mode: SchemaMode;
  packs: Record<string, {
    enabled: boolean;
    selectedNodes: string[] | null;
  }>;
  lastUpdated: number;
}

export interface ClassifiedPack {
  id: string;
  title: string;
  nodeNames: string[];
  nodeCount: number;
  isCore: boolean;
  estimatedTokensFull: number;
  estimatedTokensCompact: number;
}

const STORAGE_KEY = 'comfyui-architect-schema-selector';
const CHARS_PER_TOKEN = 4;
const TOKENS_PER_NODE_COMPACT_FALLBACK = 120;
const FULL_SCHEMA_MULTIPLIER = 2.8;

function normalizePackId(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createDefaultSelectorState(): SelectorState {
  return {
    version: 2,
    mode: 'compact',
    packs: {},
    lastUpdated: Date.now(),
  };
}

function sanitizeSelectorState(raw: unknown): SelectorState {
  if (!raw || typeof raw !== 'object') return createDefaultSelectorState();
  const parsed = raw as {
    version?: number;
    mode?: SchemaMode;
    packs?: Record<string, { enabled?: boolean; selectedNodes?: string[] | null }>;
    lastUpdated?: number;
  };
  const mode: SchemaMode = parsed.mode === 'full' || parsed.mode === 'compact' || parsed.mode === 'off'
    ? parsed.mode
    : 'compact';
  const packs: SelectorState['packs'] = {};
  for (const [packId, packState] of Object.entries(parsed.packs || {})) {
    packs[packId] = {
      enabled: !!packState?.enabled,
      selectedNodes: Array.isArray(packState?.selectedNodes)
        ? [...new Set(packState!.selectedNodes.map((name) => String(name || '').trim()).filter(Boolean))]
        : null,
    };
  }
  return {
    version: 2,
    mode,
    packs,
    lastUpdated: Number(parsed.lastUpdated || Date.now()),
  };
}

export function loadSelectorState(): SelectorState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSelectorState();
    return sanitizeSelectorState(JSON.parse(raw));
  } catch {
    return createDefaultSelectorState();
  }
}

export function saveSelectorState(state: SelectorState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      version: 2,
      lastUpdated: Date.now(),
    }));
  } catch {
    // localStorage full/blocked
  }
}

export function pruneStalePackEntries(
  state: SelectorState,
  availablePackIds: string[],
): SelectorState {
  const available = new Set(availablePackIds);
  const pruned: SelectorState['packs'] = {};
  let changed = false;
  for (const [packId, packState] of Object.entries(state.packs)) {
    if (available.has(packId)) {
      pruned[packId] = packState;
    } else {
      changed = true;
    }
  }
  if (!changed) return state;
  const next: SelectorState = { ...state, packs: pruned, lastUpdated: Date.now() };
  saveSelectorState(next);
  return next;
}

export function sanitizeZombiePackStates(state: SelectorState): SelectorState {
  let changed = false;
  const sanitized: SelectorState['packs'] = {};
  for (const [packId, packState] of Object.entries(state.packs)) {
    if (
      packState.enabled === true &&
      Array.isArray(packState.selectedNodes) &&
      packState.selectedNodes.length === 0
    ) {
      sanitized[packId] = { ...packState, selectedNodes: null };
      changed = true;
    } else {
      sanitized[packId] = packState;
    }
  }
  if (!changed) return state;
  const next: SelectorState = { ...state, packs: sanitized, lastUpdated: Date.now() };
  saveSelectorState(next);
  return next;
}

export function classifyNodesIntoPacks(
  liveCache: LiveNodeCache,
  registry: CustomNodePackInfo[] = [],
): ClassifiedPack[] {
  const fallbackPacks = classifyNodesByPack(liveCache.nodes as Record<string, any>);
  const fallbackNodeToPack = new Map<string, { id: string; title: string }>();
  for (const [packId, pack] of fallbackPacks.entries()) {
    for (const classType of pack.nodeClassTypes) {
      fallbackNodeToPack.set(classType, { id: packId, title: pack.displayName });
    }
  }

  const registryNodeToPack = new Map<string, { id: string; title: string }>();
  for (const pack of registry) {
    for (const classType of pack.nodeNames || []) {
      registryNodeToPack.set(classType, { id: pack.id, title: pack.title });
    }
  }

  const grouped = new Map<string, { title: string; nodeNames: Set<string>; isCore: boolean }>();
  const ensurePack = (id: string, title: string) => {
    if (!grouped.has(id)) {
      grouped.set(id, {
        title,
        nodeNames: new Set<string>(),
        isCore: id === 'comfyui-core',
      });
    }
    return grouped.get(id)!;
  };

  for (const classType of Object.keys(liveCache.nodes || {})) {
    const mapped = registryNodeToPack.get(classType) || fallbackNodeToPack.get(classType) || { id: 'comfyui-core', title: 'ComfyUI Core' };
    const id = normalizePackId(mapped.id || 'comfyui-core') || 'comfyui-core';
    const title = mapped.title || 'ComfyUI Core';
    ensurePack(id, title).nodeNames.add(classType);
  }

  const packs: ClassifiedPack[] = [];
  for (const [id, value] of grouped.entries()) {
    const nodeNames = [...value.nodeNames].sort((a, b) => a.localeCompare(b));
    let compactTokens = 0;
    for (const nodeName of nodeNames) {
      const schema = liveCache.nodes[nodeName];
      if (schema) {
        compactTokens += Math.ceil(formatLiveNodeForPrompt(schema).length / CHARS_PER_TOKEN);
      } else {
        compactTokens += TOKENS_PER_NODE_COMPACT_FALLBACK;
      }
    }
    packs.push({
      id,
      title: value.title,
      nodeNames,
      nodeCount: nodeNames.length,
      isCore: value.isCore,
      estimatedTokensCompact: compactTokens,
      estimatedTokensFull: Math.round(compactTokens * FULL_SCHEMA_MULTIPLIER),
    });
  }

  packs.sort((a, b) => {
    if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
    return b.nodeCount - a.nodeCount;
  });

  return packs;
}

function getNodeToPackMap(packs: ClassifiedPack[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const pack of packs) {
    for (const nodeName of pack.nodeNames) map.set(nodeName, pack.id);
  }
  return map;
}

function isNodeSelected(
  state: SelectorState,
  packId: string,
  classType: string,
): boolean {
  const packState = state.packs[packId];
  if (!packState) return true;
  if (!packState.enabled) return false;
  if (packState.selectedNodes === null) return true;
  return packState.selectedNodes.includes(classType);
}

export function countSelectedNodesForPack(
  state: SelectorState,
  pack: ClassifiedPack,
): number {
  const packState = state.packs[pack.id];
  if (!packState) return pack.nodeCount;
  if (!packState.enabled) return 0;
  if (packState.selectedNodes === null) return pack.nodeCount;
  const selectedSet = new Set(packState.selectedNodes);
  return pack.nodeNames.filter((name) => selectedSet.has(name)).length;
}

export function getSelectedPackIds(state: SelectorState, packs: ClassifiedPack[]): string[] {
  if (state.mode === 'off') return [];
  return packs
    .filter((pack) => countSelectedNodesForPack(state, pack) > 0)
    .map((pack) => pack.id);
}

export function buildSelectedLiveNodeMap(
  state: SelectorState,
  liveCache: LiveNodeCache,
  packs: ClassifiedPack[],
): Record<string, LiveNodeSchema> {
  if (state.mode === 'off') return {};

  const selected: Record<string, LiveNodeSchema> = {};
  const nodeToPack = getNodeToPackMap(packs);
  for (const [classType, schema] of Object.entries(liveCache.nodes || {})) {
    const packId = nodeToPack.get(classType) || 'comfyui-core';
    if (!isNodeSelected(state, packId, classType)) continue;
    selected[classType] = schema;
  }
  return selected;
}

export function buildSelectedLiveNodeSchemas(
  state: SelectorState,
  liveCache: LiveNodeCache,
  packs: ClassifiedPack[],
): LiveNodeSchema[] {
  return Object.values(buildSelectedLiveNodeMap(state, liveCache, packs));
}

export function estimateSchemaTokens(
  state: SelectorState,
  packs: ClassifiedPack[],
): number {
  if (state.mode === 'off') return 0;

  const liveCache = getLiveNodeCache();
  if (!liveCache) {
    // Fallback while disconnected: retain coarse estimate from classified pack metadata.
    let fallback = 0;
    for (const pack of packs) {
      const selectedCount = countSelectedNodesForPack(state, pack);
      if (selectedCount <= 0) continue;
      const perNode = state.mode === 'full'
        ? (pack.estimatedTokensFull / Math.max(pack.nodeCount, 1))
        : (pack.estimatedTokensCompact / Math.max(pack.nodeCount, 1));
      fallback += perNode * selectedCount;
    }
    return Math.max(0, Math.round(fallback));
  }

  const selectedNodeMap = buildSelectedLiveNodeMap(state, liveCache, packs);
  if (Object.keys(selectedNodeMap).length === 0) return 0;

  const nodeToPackTitle = new Map<string, string>();
  for (const pack of packs) {
    if (countSelectedNodesForPack(state, pack) <= 0) continue;
    for (const nodeName of pack.nodeNames) {
      if (selectedNodeMap[nodeName]) nodeToPackTitle.set(nodeName, pack.title);
    }
  }

  const section = buildSchemaDrawerSection(selectedNodeMap, {
    mode: state.mode === 'full' ? 'full' : 'compact',
    nodeToPackTitle,
    log: false,
  });

  // Keep token conversion aligned with prompt diagnostics (~4 chars/token).
  return Math.ceil(section.length / CHARS_PER_TOKEN);
}

/**
 * Create a selector state that enables only the provided class_types.
 * Used by brainstorm->build bridge to load minimal node schemas.
 */
export function createNodeSelectionState(
  classTypes: string[],
  packs: ClassifiedPack[],
  mode: 'full' | 'compact' = 'full',
): SelectorState {
  const requested = new Set(
    classTypes
      .map((classType) => String(classType || '').trim())
      .filter((classType) => classType.length > 0),
  );

  const packsState: SelectorState['packs'] = {};
  const matchedNodes = new Set<string>();

  for (const pack of packs) {
    const selectedNodes = pack.nodeNames.filter((nodeName) => requested.has(nodeName));
    if (selectedNodes.length === 0) {
      packsState[pack.id] = {
        enabled: false,
        selectedNodes: [],
      };
      continue;
    }

    for (const nodeName of selectedNodes) {
      matchedNodes.add(nodeName);
    }

    packsState[pack.id] = {
      enabled: true,
      selectedNodes: selectedNodes.length === pack.nodeCount ? null : selectedNodes,
    };
  }

  if (matchedNodes.size !== requested.size) {
    const missing = [...requested].filter((classType) => !matchedNodes.has(classType));
    if (missing.length > 0) {
      console.warn('[SchemaSelector] Requested nodes not found in classified packs:', missing);
    }
  }

  const selectedPackCount = Object.values(packsState).filter((packState) => packState.enabled).length;
  console.log(
    `[SchemaSelector] Auto-selecting ${matchedNodes.size} nodes from ${selectedPackCount} packs`,
  );

  return {
    version: 2,
    mode,
    packs: packsState,
    lastUpdated: Date.now(),
  };
}

/**
 * Recommendation-focused alias for brainstorm->build bridge.
 * Keeps naming aligned with extraction/overlay pipeline docs.
 */
export function createNodeSelectionFromRecommendation(
  classTypes: string[],
  packs: ClassifiedPack[],
  mode: 'full' | 'compact' = 'full',
): SelectorState {
  return createNodeSelectionState(classTypes, packs, mode);
}

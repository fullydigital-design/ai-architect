/**
 * useNodeLibrary - manages the user's pinned custom node packs.
 *
 * Persisted in localStorage. Provides pin/unpin/isPinned helpers and a
 * mode toggle (my-packs vs discover), plus persistent context-filter
 * manual pack overrides.
 */

import { useState, useCallback, useEffect } from 'react';
import type { CustomNodePackInfo } from '../data/custom-node-registry';

// ---- Types ------------------------------------------------------------------

export interface PinnedNodePack {
  id: string;
  title: string;
  reference: string;
  description: string;
  nodeNames: string[];
  nodeCount: number;
  installCommand: string;
  author: string;
  stars: number;
  pinnedAt: number;
}

export type LibraryMode = 'my-packs' | 'discover';

export type ContextFilterMode =
  | 'minimal'
  | 'workflow-smart'
  | 'workflow-packs'
  | 'core-popular'
  | 'everything'
  | 'everything-compressed';

export interface UserNodeLibrary {
  version: 3;
  packs: PinnedNodePack[];
  /** Context filter mode for node-schema selection */
  mode: ContextFilterMode;
  /** UI mode for My Packs panel */
  libraryMode: LibraryMode;
  manuallyAdded: string[];
  manuallyRemoved: string[];
  lastUpdated: number;
}

interface LegacyV1Library {
  version: 1;
  packs: PinnedNodePack[];
  mode: LibraryMode;
  lastUpdated: number;
}

interface LegacyV2Library {
  version: 2;
  packs: PinnedNodePack[];
  mode: LibraryMode;
  contextFilterMode?: ContextFilterMode;
  manuallyAdded?: string[];
  manuallyRemoved?: string[];
  lastUpdated: number;
}

// ---- Storage ----------------------------------------------------------------

const STORAGE_KEY = 'comfyui-architect-node-library';

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .filter((entry, index, arr) => arr.indexOf(entry) === index);
}

function normalizeContextFilterMode(value: unknown): ContextFilterMode {
  const allowed: ContextFilterMode[] = [
    'minimal',
    'workflow-smart',
    'workflow-packs',
    'core-popular',
    'everything',
    'everything-compressed',
  ];
  const text = String(value || '').trim();
  if (allowed.includes(text as ContextFilterMode)) return text as ContextFilterMode;
  return 'workflow-smart';
}

function normalizeLibraryMode(value: unknown): LibraryMode {
  return value === 'my-packs' ? 'my-packs' : 'discover';
}

function fromV3(parsed: Record<string, unknown>): UserNodeLibrary {
  return {
    version: 3,
    packs: Array.isArray(parsed.packs) ? parsed.packs as PinnedNodePack[] : [],
    mode: normalizeContextFilterMode(parsed.mode),
    libraryMode: normalizeLibraryMode(parsed.libraryMode),
    manuallyAdded: normalizeStringArray(parsed.manuallyAdded),
    manuallyRemoved: normalizeStringArray(parsed.manuallyRemoved),
    lastUpdated: Number(parsed.lastUpdated || Date.now()),
  };
}

function fromV2(parsed: LegacyV2Library): UserNodeLibrary {
  return {
    version: 3,
    packs: Array.isArray(parsed.packs) ? parsed.packs : [],
    mode: normalizeContextFilterMode(parsed.contextFilterMode),
    libraryMode: normalizeLibraryMode(parsed.mode),
    manuallyAdded: normalizeStringArray(parsed.manuallyAdded),
    manuallyRemoved: normalizeStringArray(parsed.manuallyRemoved),
    lastUpdated: Number(parsed.lastUpdated || Date.now()),
  };
}

function fromV1(parsed: LegacyV1Library): UserNodeLibrary {
  return {
    version: 3,
    packs: Array.isArray(parsed.packs) ? parsed.packs : [],
    mode: 'workflow-smart',
    libraryMode: normalizeLibraryMode(parsed.mode),
    manuallyAdded: [],
    manuallyRemoved: [],
    lastUpdated: Number(parsed.lastUpdated || Date.now()),
  };
}

function loadLibrary(): UserNodeLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && parsed.version === 3) return fromV3(parsed);
      if (parsed && parsed.version === 2) return fromV2(parsed as unknown as LegacyV2Library);
      if (parsed && parsed.version === 1) return fromV1(parsed as unknown as LegacyV1Library);
    }
  } catch {
    // corrupt data - reset
  }

  return {
    version: 3,
    packs: [],
    mode: 'workflow-smart',
    libraryMode: 'discover',
    manuallyAdded: [],
    manuallyRemoved: [],
    lastUpdated: Date.now(),
  };
}

function saveLibrary(lib: UserNodeLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
  } catch {
    // localStorage full or disabled
  }
}

// ---- Hook -------------------------------------------------------------------

export function useNodeLibrary() {
  const [library, setLibrary] = useState<UserNodeLibrary>(loadLibrary);

  // Persist on every change
  useEffect(() => {
    saveLibrary(library);
  }, [library]);

  const pinPack = useCallback((pack: CustomNodePackInfo) => {
    setLibrary((prev) => {
      if (prev.packs.some((p) => p.id === pack.id)) return prev;
      const pinned: PinnedNodePack = {
        id: pack.id,
        title: pack.title,
        reference: pack.reference,
        description: pack.description,
        nodeNames: pack.nodeNames,
        nodeCount: pack.nodeCount,
        installCommand: pack.installCommand,
        author: pack.author,
        stars: pack.stars,
        pinnedAt: Date.now(),
      };
      return {
        ...prev,
        packs: [...prev.packs, pinned],
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const unpinPack = useCallback((packId: string) => {
    setLibrary((prev) => ({
      ...prev,
      packs: prev.packs.filter((p) => p.id !== packId),
      lastUpdated: Date.now(),
    }));
  }, []);

  const isPinned = useCallback((packId: string): boolean => {
    return library.packs.some((p) => p.id === packId);
  }, [library.packs]);

  const toggleMode = useCallback(() => {
    setLibrary((prev) => ({
      ...prev,
      libraryMode: prev.libraryMode === 'my-packs' ? 'discover' : 'my-packs',
      lastUpdated: Date.now(),
    }));
  }, []);

  const setMode = useCallback((mode: LibraryMode) => {
    setLibrary((prev) => ({
      ...prev,
      libraryMode: mode,
      lastUpdated: Date.now(),
    }));
  }, []);

  const clearAll = useCallback(() => {
    setLibrary((prev) => ({
      ...prev,
      packs: [],
      libraryMode: 'discover',
      lastUpdated: Date.now(),
    }));
  }, []);

  const pinMultiple = useCallback((packs: CustomNodePackInfo[]) => {
    setLibrary((prev) => {
      const existingIds = new Set(prev.packs.map((p) => p.id));
      const newPacks: PinnedNodePack[] = packs
        .filter((p) => !existingIds.has(p.id))
        .map((p) => ({
          id: p.id,
          title: p.title,
          reference: p.reference,
          description: p.description,
          nodeNames: p.nodeNames,
          nodeCount: p.nodeCount,
          installCommand: p.installCommand,
          author: p.author,
          stars: p.stars,
          pinnedAt: Date.now(),
        }));

      if (newPacks.length === 0) return prev;
      return {
        ...prev,
        packs: [...prev.packs, ...newPacks],
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const setContextManualOverrides = useCallback((
    manuallyAdded: string[],
    manuallyRemoved: string[],
    contextFilterMode?: ContextFilterMode,
  ) => {
    const normalizedAdded = normalizeStringArray(manuallyAdded);
    const normalizedRemoved = normalizeStringArray(manuallyRemoved)
      .filter((packId) => !normalizedAdded.includes(packId));

    setLibrary((prev) => ({
      ...prev,
      mode: contextFilterMode ? normalizeContextFilterMode(contextFilterMode) : prev.mode,
      manuallyAdded: normalizedAdded,
      manuallyRemoved: normalizedRemoved,
      lastUpdated: Date.now(),
    }));
  }, []);

  const resetContextManualOverrides = useCallback((contextFilterMode?: ContextFilterMode) => {
    setLibrary((prev) => ({
      ...prev,
      mode: contextFilterMode ? normalizeContextFilterMode(contextFilterMode) : prev.mode,
      manuallyAdded: [],
      manuallyRemoved: [],
      lastUpdated: Date.now(),
    }));
  }, []);

  // Export library as JSON string
  const exportLibrary = useCallback((): string => {
    return JSON.stringify(library, null, 2);
  }, [library]);

  // Import library from JSON string
  const importLibrary = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;
      if (parsed && parsed.version === 3 && Array.isArray(parsed.packs)) {
        setLibrary(fromV3(parsed));
        return true;
      }
      if (parsed && parsed.version === 2 && Array.isArray(parsed.packs)) {
        setLibrary(fromV2(parsed as unknown as LegacyV2Library));
        return true;
      }
      if (parsed && parsed.version === 1 && Array.isArray(parsed.packs)) {
        setLibrary(fromV1(parsed as unknown as LegacyV1Library));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    library,
    pinnedPacks: library.packs,
    // Preserve existing API for My Packs UI.
    mode: library.libraryMode,
    libraryMode: library.libraryMode,
    // Context filter persistence values.
    contextFilter: library.mode,
    contextFilterMode: library.mode,
    manuallyAdded: library.manuallyAdded,
    manuallyRemoved: library.manuallyRemoved,
    pinPack,
    unpinPack,
    isPinned,
    pinMultiple,
    toggleMode,
    setMode,
    clearAll,
    setContextManualOverrides,
    resetContextManualOverrides,
    exportLibrary,
    importLibrary,
    packCount: library.packs.length,
  };
}

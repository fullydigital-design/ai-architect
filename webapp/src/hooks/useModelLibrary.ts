import { useCallback, useEffect, useMemo, useState } from 'react';
import { estimateTokens } from '../services/token-estimator';
import {
  getCachedModelInventory,
  getInstalledModels,
  getKnownModelCategories,
  getModelIntelligence,
  type InstalledModels,
} from '../services/comfyui-backend';

const STORAGE_KEY = 'comfyui-architect-model-library-selection';

export type ModelPreset = 'all' | 'essential' | 'generation' | 'custom';

export interface ModelPresetConfig {
  id: Exclude<ModelPreset, 'custom'>;
  label: string;
  description: string;
  categories: string[] | null;
}

export const MODEL_PRESETS: ModelPresetConfig[] = [
  {
    id: 'all',
    label: 'All Models',
    description: 'Include every installed model in AI context',
    categories: null,
  },
  {
    id: 'essential',
    label: 'Essential',
    description: 'Core generation + control + upscaler categories',
    categories: [
      'checkpoints',
      'loras',
      'vaes',
      'upscale_models',
      'controlnets',
      'clip',
      'clip_vision',
      'embeddings',
      'diffusion_models',
      'text_encoders',
      'unet',
    ],
  },
  {
    id: 'generation',
    label: 'Generation Only',
    description: 'Minimal model context for generation workflows',
    categories: [
      'checkpoints',
      'loras',
      'vaes',
      'diffusion_models',
      'text_encoders',
      'unet',
    ],
  },
];

const DEFAULT_SELECTED_CATEGORIES = new Set([
  'checkpoints',
  'loras',
  'vaes',
  'diffusion_models',
  'text_encoders',
  'unet',
  'upscale_models',
  'controlnets',
  'clip',
  'clip_vision',
  'embeddings',
]);

const DEFAULT_PRESET: ModelPreset = 'essential';

interface StoredSelection {
  selectedCategories: string[];
  activePreset?: string;
}

interface SelectionState {
  selectedCategories: Set<string>;
  activePreset: ModelPreset;
}

function normalizeSelectedCategories(categories: Iterable<string>): Set<string> {
  const normalized = new Set<string>();
  for (const category of categories) {
    const value = String(category || '').trim();
    if (value) normalized.add(value);
  }
  return normalized.size > 0 ? normalized : new Set(DEFAULT_SELECTED_CATEGORIES);
}

function parsePreset(value: unknown): ModelPreset {
  if (value === 'all' || value === 'essential' || value === 'generation' || value === 'custom') {
    return value;
  }
  return DEFAULT_PRESET;
}

function loadSelectionState(): SelectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        selectedCategories: new Set(DEFAULT_SELECTED_CATEGORIES),
        activePreset: DEFAULT_PRESET,
      };
    }
    const parsed = JSON.parse(raw) as StoredSelection;
    const selectedCategories = Array.isArray(parsed.selectedCategories)
      ? normalizeSelectedCategories(parsed.selectedCategories)
      : new Set(DEFAULT_SELECTED_CATEGORIES);
    return {
      selectedCategories,
      activePreset: parsePreset(parsed.activePreset),
    };
  } catch {
    return {
      selectedCategories: new Set(DEFAULT_SELECTED_CATEGORIES),
      activePreset: DEFAULT_PRESET,
    };
  }
}

function saveSelectionState(state: SelectionState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedCategories: [...state.selectedCategories].sort((a, b) => a.localeCompare(b)),
        activePreset: state.activePreset,
      }),
    );
  } catch {
    // localStorage best effort
  }
}

function getInitialInventory(): InstalledModels | null {
  return getCachedModelInventory() || getInstalledModels();
}

function estimateCategoryTokens(category: string, files: string[]): number {
  if (!Array.isArray(files) || files.length === 0) return 0;
  const lines = files.map((filename) => {
    const intel = getModelIntelligence(filename, category);
    const details: string[] = [];
    if (intel.description) details.push(intel.description);
    if (intel.resolution) details.push(intel.resolution);
    if (intel.cfgRange) details.push(`cfg ${intel.cfgRange}`);
    return `"${filename}"${details.length > 0 ? ` - ${details.join(', ')}` : ''}`;
  });
  return estimateTokens(lines.join('\n'));
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function categoriesForPreset(
  preset: Exclude<ModelPreset, 'custom'>,
  inventory: InstalledModels | null,
): Set<string> {
  const config = MODEL_PRESETS.find((candidate) => candidate.id === preset);
  if (!config) return new Set(DEFAULT_SELECTED_CATEGORIES);

  if (config.categories === null) {
    if (!inventory) return new Set(DEFAULT_SELECTED_CATEGORIES);
    return new Set(
      Object.entries(inventory)
        .filter(([, files]) => Array.isArray(files) && files.length > 0)
        .map(([category]) => category),
    );
  }

  if (!inventory) {
    return normalizeSelectedCategories(config.categories);
  }

  const selected = config.categories.filter((category) => {
    const files = inventory[category];
    return Array.isArray(files) && files.length > 0;
  });
  return normalizeSelectedCategories(selected);
}

export interface ModelLibraryState {
  inventory: InstalledModels | null;
  selectedCategories: Set<string>;
  activePreset: ModelPreset;
  isLoading: boolean;
  totalFiles: number;
  totalTokens: number;
  categoryTokens: Record<string, number>;
  allCategories: string[];
  refreshInventory: () => void;
  applyPreset: (preset: Exclude<ModelPreset, 'custom'>) => void;
  setCategorySelected: (category: string, selected: boolean) => void;
  setSelectedCategories: (categories: Iterable<string>) => void;
  resetSelectedCategories: () => void;
}

export function useModelLibrary(): ModelLibraryState {
  const [inventory, setInventory] = useState<InstalledModels | null>(() => getInitialInventory());
  const [selectionState, setSelectionState] = useState<SelectionState>(loadSelectionState);
  const [isLoading, setIsLoading] = useState(false);
  const selectedCategories = selectionState.selectedCategories;
  const activePreset = selectionState.activePreset;

  useEffect(() => {
    saveSelectionState(selectionState);
  }, [selectionState]);

  useEffect(() => {
    if (!inventory) return;
    setSelectionState((prev) => {
      if (prev.activePreset === 'custom') return prev;
      const nextSelected = categoriesForPreset(prev.activePreset, inventory);
      if (areSetsEqual(prev.selectedCategories, nextSelected)) return prev;
      return {
        ...prev,
        selectedCategories: nextSelected,
      };
    });
  }, [inventory]);

  const refreshInventory = useCallback(() => {
    setIsLoading(true);
    try {
      setInventory(getInitialInventory());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyPreset = useCallback((preset: Exclude<ModelPreset, 'custom'>) => {
    setSelectionState({
      selectedCategories: categoriesForPreset(preset, inventory),
      activePreset: preset,
    });
  }, [inventory]);

  const setCategorySelected = useCallback((category: string, selected: boolean) => {
    setSelectionState((prev) => {
      const next = new Set(prev.selectedCategories);
      if (selected) next.add(category);
      else next.delete(category);
      return {
        selectedCategories: normalizeSelectedCategories(next),
        activePreset: 'custom',
      };
    });
  }, []);

  const setSelectedCategories = useCallback((categories: Iterable<string>) => {
    setSelectionState({
      selectedCategories: normalizeSelectedCategories(categories),
      activePreset: 'custom',
    });
  }, []);

  const resetSelectedCategories = useCallback(() => {
    setSelectionState({
      selectedCategories: new Set(DEFAULT_SELECTED_CATEGORIES),
      activePreset: DEFAULT_PRESET,
    });
  }, []);

  const allCategories = useMemo(() => {
    const known = new Set(getKnownModelCategories());
    if (inventory) {
      for (const category of Object.keys(inventory)) {
        known.add(category);
      }
    }
    return [...known].sort((a, b) => a.localeCompare(b));
  }, [inventory]);

  const categoryTokens = useMemo(() => {
    const tokens: Record<string, number> = {};
    if (!inventory) return tokens;
    for (const [category, files] of Object.entries(inventory)) {
      if (!selectedCategories.has(category)) continue;
      tokens[category] = estimateCategoryTokens(category, files);
    }
    return tokens;
  }, [inventory, selectedCategories]);

  const totalFiles = useMemo(() => {
    if (!inventory) return 0;
    let total = 0;
    for (const [category, files] of Object.entries(inventory)) {
      if (!selectedCategories.has(category)) continue;
      total += Array.isArray(files) ? files.length : 0;
    }
    return total;
  }, [inventory, selectedCategories]);

  const totalTokens = useMemo(
    () => Object.values(categoryTokens).reduce((sum, value) => sum + value, 0),
    [categoryTokens],
  );

  return {
    inventory,
    selectedCategories,
    activePreset,
    isLoading,
    totalFiles,
    totalTokens,
    categoryTokens,
    allCategories,
    refreshInventory,
    applyPreset,
    setCategorySelected,
    setSelectedCategories,
    resetSelectedCategories,
  };
}

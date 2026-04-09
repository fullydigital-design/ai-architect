import { useCallback, useRef, useState } from 'react';
import type {
  CivitAIModelResult,
  HuggingFaceModelResult,
  ModelSearchResult,
} from '../types/comfyui';

export const CIVITAI_MODEL_TYPES = [
  'Checkpoint', 'LORA', 'TextualInversion', 'Hypernetwork',
  'VAE', 'ControlNet', 'Upscaler',
] as const;

export type CivitAIModelType = typeof CIVITAI_MODEL_TYPES[number];

export interface ModelSearchOptions {
  query: string;
  source: 'civitai' | 'huggingface' | 'both';
  modelType?: CivitAIModelType;
  limit?: number;
  nsfwFilter?: boolean;
}

function mapCivitAI(item: CivitAIModelResult): ModelSearchResult {
  const latest = item.modelVersions?.[0];
  const firstFile = latest?.files?.[0];
  const preview = latest?.images?.[0]?.url;
  const fileSizeGB = typeof firstFile?.sizeKB === 'number'
    ? firstFile.sizeKB / 1024 / 1024
    : undefined;

  return {
    source: 'civitai',
    id: String(item.id),
    name: item.name,
    author: item.creator?.username ?? 'Unknown',
    type: item.type,
    baseModel: latest?.baseModel,
    downloads: item.stats?.downloadCount ?? 0,
    rating: item.stats?.rating,
    previewUrl: preview,
    pageUrl: `https://civitai.com/models/${item.id}`,
    downloadUrl: firstFile?.downloadUrl ?? latest?.downloadUrl,
    fileSizeGB,
    tags: item.tags ?? [],
  };
}

function mapHuggingFace(item: HuggingFaceModelResult): ModelSearchResult {
  const name = item.modelId?.split('/').pop() || item.modelId;
  return {
    source: 'huggingface',
    id: item.modelId,
    name,
    author: item.author ?? 'Unknown',
    type: item.pipeline_tag ?? 'Model',
    downloads: item.downloads ?? 0,
    pageUrl: `https://huggingface.co/${item.modelId}`,
    tags: item.tags ?? [],
  };
}

export function useModelSearch() {
  const [results, setResults] = useState<ModelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    setResults([]);
    setError(null);
    setLoading(false);
  }, []);

  const search = useCallback(async (options: ModelSearchOptions) => {
    const query = options.query.trim();
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }

    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    const source = options.source ?? 'both';
    const limit = options.limit ?? 10;
    const nsfwFilter = options.nsfwFilter ?? true;
    const partialErrors: string[] = [];
    const merged: ModelSearchResult[] = [];

    if (source === 'civitai' || source === 'both') {
      try {
        const p = new URLSearchParams({
          query,
          limit: String(limit),
          sort: 'Most Downloaded',
          nsfw: nsfwFilter ? 'false' : 'true',
        });
        if (options.modelType) {
          p.set('types', options.modelType);
        }

        const response = await fetch(`https://civitai.com/api/v1/models?${p.toString()}`, { signal });
        if (!response.ok) throw new Error(`CivitAI HTTP ${response.status}`);
        const data = await response.json() as { items?: CivitAIModelResult[] };
        const civitai = (data.items ?? []).map(mapCivitAI);
        merged.push(...civitai);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        partialErrors.push(err instanceof Error ? err.message : 'CivitAI search failed');
      }
    }

    if (source === 'huggingface' || source === 'both') {
      try {
        const p = new URLSearchParams({
          search: query,
          limit: String(limit),
          sort: 'downloads',
          direction: '-1',
        });
        if (options.modelType === 'Checkpoint' || options.modelType === 'LORA') {
          p.set('filter', 'diffusers');
        }

        const response = await fetch(`https://huggingface.co/api/models?${p.toString()}`, { signal });
        if (!response.ok) throw new Error(`HuggingFace HTTP ${response.status}`);
        const data = await response.json() as HuggingFaceModelResult[];
        const huggingface = (Array.isArray(data) ? data : []).map(mapHuggingFace);
        merged.push(...huggingface);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        partialErrors.push(err instanceof Error ? err.message : 'HuggingFace search failed');
      }
    }

    if (signal.aborted) return;

    merged.sort((a, b) => b.downloads - a.downloads);
    setResults(merged);

    if (partialErrors.length > 0 && merged.length > 0) {
      setError(`Partial search errors: ${partialErrors.join(' | ')}`);
    } else if (partialErrors.length > 0) {
      setError(partialErrors.join(' | '));
    } else {
      setError(null);
    }

    setLoading(false);
  }, []);

  return { results, loading, error, search, clear };
}

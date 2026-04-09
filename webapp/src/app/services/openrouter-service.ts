import type { AIProvider } from '../../types/comfyui';

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  contextLength: number;
}

interface OpenRouterModelsCache {
  timestamp: number;
  models: OpenRouterModelInfo[];
}

interface OpenRouterModelRow {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
}

const DEFAULT_CONTEXT_LENGTH = 32_768;

const OPENROUTER_MODELS_CACHE_KEY = 'comfyui-architect-openrouter-models';

export function getCachedOpenRouterModels(): OpenRouterModelInfo[] {
  try {
    const raw = localStorage.getItem(OPENROUTER_MODELS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OpenRouterModelsCache;
    if (!parsed || !Array.isArray(parsed.models)) return [];
    return parsed.models
      .map((model) => ({
        id: String(model.id || '').trim(),
        name: String(model.name || model.id || '').trim(),
        provider: 'openrouter' as const,
        contextLength: Math.max(1, Number(model.contextLength || 0) || DEFAULT_CONTEXT_LENGTH),
      }))
      .filter((model) => !!model.id);
  } catch {
    return [];
  }
}

export function cacheOpenRouterModels(models: OpenRouterModelInfo[]): void {
  try {
    const payload: OpenRouterModelsCache = {
      timestamp: Date.now(),
      models,
    };
    localStorage.setItem(OPENROUTER_MODELS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // best effort cache
  }
}

export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModelInfo[]> {
  if (!apiKey) return [];

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ComfyUI Workflow Architect',
    },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models API error ${response.status}`);
  }

  const payload = await response.json() as { data?: OpenRouterModelRow[] };
  const rows = Array.isArray(payload.data) ? payload.data : [];

  const models: OpenRouterModelInfo[] = rows
    .map((row) => {
      const id = String(row.id || '').trim();
      if (!id) return null;
      const contextLength = Number(row.context_length || 0);
      return {
        id,
        name: String(row.name || id),
        provider: 'openrouter' as const,
        contextLength: contextLength > 0 ? contextLength : DEFAULT_CONTEXT_LENGTH,
      };
    })
    .filter((row): row is OpenRouterModelInfo => row !== null);

  cacheOpenRouterModels(models);
  return models;
}

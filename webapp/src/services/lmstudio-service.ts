import { logger } from '@/utils/logger';

export interface LMStudioModelInfo {
  /** Model identifier to send in chat completion requests. */
  id: string;
  /** Human-readable name, if reported. */
  displayName?: string;
  /** Loaded into VRAM right now (has at least one running instance). */
  loaded: boolean;
  /** Context window (loaded instance config wins; otherwise max_context_length). */
  contextLength?: number;
  /** Architecture / family tag (e.g. "qwen35moe"). */
  arch?: string;
  /** Quantization name (e.g. "Q4_K_M"). */
  quantization?: string;
  /** Parameter count string (e.g. "35B-A3B"), when reported. */
  params?: string;
  /** Capabilities surfaced by LM Studio. */
  vision?: boolean;
  toolUse?: boolean;
  reasoning?: boolean;
}

export interface LMStudioProbeResult {
  baseUrl: string;
  models: LMStudioModelInfo[];
}

const DEFAULT_HOST = 'http://localhost:1234';
const REST_API_PATH = '/api/v1/models';
const OPENAI_PATH = '/v1/models';
const REQUEST_TIMEOUT_MS = 2500;

/** Trim trailing slash and any pre-baked /v1 or /api/v1 suffix so we control the path. */
function normalizeHost(input: string | undefined): string {
  const raw = (input || DEFAULT_HOST).trim();
  if (!raw) return DEFAULT_HOST;
  return raw.replace(/\/$/, '').replace(/\/(api\/)?v1\/?$/, '');
}

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

/**
 * Parse the LM Studio REST API response shape (/api/v1/models).
 *
 * Real shape (LM Studio 0.4.x+):
 *   { "models": [{
 *       "type": "llm" | "embedding",
 *       "key": "qwen/qwen3.6-35b-a3b",
 *       "display_name": "Qwen3.6 35B A3B",
 *       "architecture": "qwen35moe",
 *       "quantization": { "name": "Q4_K_M", "bits_per_weight": 4 },
 *       "params_string": "35B-A3B",
 *       "max_context_length": 262144,
 *       "loaded_instances": [
 *         { "id": "qwen/qwen3.6-35b-a3b",
 *           "config": { "context_length": 256000, ... } }
 *       ],
 *       "capabilities": { "vision": true, "trained_for_tool_use": true,
 *                         "reasoning": { ... } }
 *     }] }
 */
function parseRestApiResponse(payload: unknown): LMStudioModelInfo[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const list = Array.isArray(root.models) ? root.models : [];
  return list
    .map((row): LMStudioModelInfo | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const kind = typeof r.type === 'string' ? r.type : '';
      // Skip embedding-only models — chat completion can't use them.
      if (kind && kind !== 'llm' && kind !== 'vlm') return null;

      const instances = Array.isArray(r.loaded_instances) ? r.loaded_instances : [];
      const firstInstance = instances[0] as Record<string, unknown> | undefined;
      const instanceId = firstInstance && typeof firstInstance.id === 'string' ? firstInstance.id : '';
      const key = typeof r.key === 'string' ? r.key : '';
      const id = instanceId || key;
      if (!id) return null;

      const quant = r.quantization && typeof r.quantization === 'object'
        ? (r.quantization as Record<string, unknown>)
        : null;
      const quantization = quant && typeof quant.name === 'string' ? quant.name : undefined;

      const caps = r.capabilities && typeof r.capabilities === 'object'
        ? (r.capabilities as Record<string, unknown>)
        : null;

      const instanceCtx = firstInstance && firstInstance.config && typeof firstInstance.config === 'object'
        ? ((firstInstance.config as Record<string, unknown>).context_length as number | undefined)
        : undefined;
      const maxCtx = typeof r.max_context_length === 'number' ? r.max_context_length : undefined;

      return {
        id,
        displayName: typeof r.display_name === 'string' ? r.display_name : undefined,
        loaded: instances.length > 0,
        contextLength: typeof instanceCtx === 'number' ? instanceCtx : maxCtx,
        arch: typeof r.architecture === 'string' ? r.architecture : undefined,
        quantization,
        params: typeof r.params_string === 'string' ? r.params_string : undefined,
        vision: caps ? caps.vision === true : undefined,
        toolUse: caps ? caps.trained_for_tool_use === true : undefined,
        reasoning: caps ? caps.reasoning !== undefined && caps.reasoning !== null : undefined,
      };
    })
    .filter((m): m is LMStudioModelInfo => m !== null);
}

/**
 * Parse the OpenAI-compatible /v1/models response (0.3.x fallback).
 * No load-state info — every listed model is treated as "available, state unknown".
 */
function parseOpenAIResponse(payload: unknown): LMStudioModelInfo[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const data = Array.isArray(root.data) ? root.data : [];
  return data
    .map((row): LMStudioModelInfo | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id : '';
      if (!id) return null;
      // Without REST API, assume loaded — LM Studio's /v1/models only lists the active model on 0.3.x.
      return { id, loaded: true };
    })
    .filter((m): m is LMStudioModelInfo => m !== null);
}

/**
 * Sort: loaded first, then alphabetically by id.
 */
function sortModels(models: LMStudioModelInfo[]): LMStudioModelInfo[] {
  return [...models].sort((a, b) => {
    if (a.loaded !== b.loaded) return a.loaded ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Probe LM Studio for available models. Tries the richer REST API first (0.4.x+),
 * falls back to the OpenAI-compatible endpoint (0.3.x).
 *
 * Throws on network failure / no response. Returns empty array if reachable
 * but no models are exposed.
 */
export async function fetchLMStudioModels(baseUrl: string | undefined): Promise<LMStudioProbeResult> {
  const host = normalizeHost(baseUrl);

  try {
    const res = await fetch(`${host}${REST_API_PATH}`, { signal: timeoutSignal() });
    if (res.ok) {
      const json = await res.json();
      return { baseUrl: host, models: sortModels(parseRestApiResponse(json)) };
    }
    logger.debug(`[LMStudio] ${REST_API_PATH} returned ${res.status}, falling back to ${OPENAI_PATH}`);
  } catch (err) {
    logger.debug(`[LMStudio] ${REST_API_PATH} probe failed, falling back to ${OPENAI_PATH}:`, err);
  }

  const res = await fetch(`${host}${OPENAI_PATH}`, { signal: timeoutSignal() });
  if (!res.ok) {
    throw new Error(`LM Studio not reachable at ${host} (${res.status})`);
  }
  const json = await res.json();
  return { baseUrl: host, models: sortModels(parseOpenAIResponse(json)) };
}

/** Convenience: return only the model IDs that are currently loaded. */
export function loadedModelIds(probe: LMStudioProbeResult): string[] {
  return probe.models.filter((m) => m.loaded).map((m) => m.id);
}

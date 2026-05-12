import { logger } from '@/utils/logger';

export interface LMStudioModelInfo {
  id: string;
  /** Loaded into VRAM right now (LM Studio surfaces this on /api/v1/models). */
  loaded: boolean;
  /** Context window in tokens, when reported. */
  contextLength?: number;
  /** Architecture / family tag (e.g. "qwen35moe"), when reported. */
  arch?: string;
  /** Quantization name (e.g. "Q4_K_M"), when reported. */
  quantization?: string;
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

function parseRestApiResponse(payload: unknown): LMStudioModelInfo[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const data = Array.isArray(root.data) ? root.data : [];
  return data
    .map((row): LMStudioModelInfo | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id : '';
      if (!id) return null;
      const state = typeof r.state === 'string' ? r.state : '';
      const loaded = state === 'loaded' || state === 'running';
      const contextLength = typeof r.loaded_context_length === 'number'
        ? r.loaded_context_length
        : (typeof r.max_context_length === 'number' ? r.max_context_length : undefined);
      const arch = typeof r.arch === 'string' ? r.arch : undefined;
      const quantization = typeof r.quantization === 'string' ? r.quantization : undefined;
      return { id, loaded, contextLength, arch, quantization };
    })
    .filter((m): m is LMStudioModelInfo => m !== null);
}

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
      // /v1/models doesn't expose load state; assume loaded since LM Studio only lists active.
      return { id, loaded: true };
    })
    .filter((m): m is LMStudioModelInfo => m !== null);
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
      return { baseUrl: host, models: parseRestApiResponse(json) };
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
  return { baseUrl: host, models: parseOpenAIResponse(json) };
}

/** Convenience: return only the model IDs that are currently loaded. */
export function loadedModelIds(probe: LMStudioProbeResult): string[] {
  return probe.models.filter((m) => m.loaded).map((m) => m.id);
}

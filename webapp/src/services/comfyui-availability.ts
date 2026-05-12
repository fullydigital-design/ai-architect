import { logger } from '@/utils/logger';

/**
 * Lightweight central cache of "is the ComfyUI server reachable?".
 *
 * Callers (object_info, manager, workflow-sync, websocket-reconnect …) can
 * gate their fetches on this to avoid spamming the proxy with requests that
 * are guaranteed to return HTTP 500 while ComfyUI is offline.
 *
 * No subscriptions, no polling — just a per-baseUrl cached verdict with a
 * short TTL on failure (so we retry occasionally) and a longer TTL on
 * success (the success state is refreshed by the regular status poller
 * already running in useComfyUIStatus).
 */

interface Entry {
  reachable: boolean;
  expiresAt: number;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<boolean>>();

const OFFLINE_TTL_MS = 5_000;
const ONLINE_TTL_MS = 30_000;
const PROBE_TIMEOUT_MS = 2_000;

function normalize(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

/**
 * Synchronous read of the last-known reachability for a base URL.
 * `null` means "no recent verdict — caller should probe".
 */
export function getCachedComfyUIAvailability(baseUrl: string): boolean | null {
  const entry = cache.get(normalize(baseUrl));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.reachable;
}

/**
 * Probe `/system_stats` (single-shot, short timeout). Result is cached.
 * Concurrent callers share a single in-flight probe per base URL.
 */
export async function ensureComfyUIAvailable(baseUrl: string): Promise<boolean> {
  const key = normalize(baseUrl);
  const cached = getCachedComfyUIAvailability(key);
  if (cached !== null) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const probe = (async () => {
    let reachable = false;
    try {
      const res = await fetch(`${key}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      reachable = res.ok;
    } catch {
      reachable = false;
    }
    cache.set(key, {
      reachable,
      expiresAt: Date.now() + (reachable ? ONLINE_TTL_MS : OFFLINE_TTL_MS),
    });
    if (!reachable) {
      logger.debug(`[Availability] ComfyUI unreachable at ${key} — gating dependent fetches for ${OFFLINE_TTL_MS}ms`);
    }
    return reachable;
  })();

  inflight.set(key, probe);
  try {
    return await probe;
  } finally {
    inflight.delete(key);
  }
}

/**
 * Force-set the reachability state (used by code that already made a
 * request and got a definitive answer — e.g. system_stats poller).
 */
export function setComfyUIAvailability(baseUrl: string, reachable: boolean): void {
  cache.set(normalize(baseUrl), {
    reachable,
    expiresAt: Date.now() + (reachable ? ONLINE_TTL_MS : OFFLINE_TTL_MS),
  });
}

/** Wipe the cache for a base URL (e.g. after user-initiated reconnect). */
export function invalidateComfyUIAvailability(baseUrl?: string): void {
  if (baseUrl) {
    cache.delete(normalize(baseUrl));
  } else {
    cache.clear();
  }
}

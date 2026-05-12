import { resolveComfyUIBaseUrl } from './api-config';
import { ensureComfyUIAvailable, setComfyUIAvailability } from './comfyui-availability';
import { logger } from '@/utils/logger';

let cachedResponse: Record<string, any> | null = null;
let cachedBaseUrl: string | null = null;
let cacheTimestamp = 0;
let pendingRequest: Promise<Record<string, any>> | null = null;
let pendingBaseUrl: string | null = null;
const CACHE_DURATION_MS = 300_000; // 5 minutes

function normalizeBaseUrl(url: string): string {
  return resolveComfyUIBaseUrl(url);
}

export async function getObjectInfo(
  comfyuiUrl: string,
  forceRefresh = false,
): Promise<Record<string, any>> {
  const now = Date.now();
  const baseUrl = normalizeBaseUrl(comfyuiUrl);

  if (
    !forceRefresh &&
    cachedResponse &&
    cachedBaseUrl === baseUrl &&
    (now - cacheTimestamp) < CACHE_DURATION_MS
  ) {
    return cachedResponse;
  }

  if (pendingRequest && pendingBaseUrl === baseUrl) {
    return pendingRequest;
  }

  pendingBaseUrl = baseUrl;
  pendingRequest = (async () => {
    const reachable = await ensureComfyUIAvailable(baseUrl);
    if (!reachable) {
      throw new Error('ComfyUI is offline');
    }
    logger.log('[Scanner] Fetching /object_info...');
    const response = await fetch(`${baseUrl}/object_info`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      if (response.status >= 500) setComfyUIAvailability(baseUrl, false);
      throw new Error(`Failed to fetch object_info: ${response.status}`);
    }
    return (await response.json()) as Record<string, any>;
  })()
    .then((data) => {
      cachedResponse = data;
      cachedBaseUrl = baseUrl;
      cacheTimestamp = Date.now();
      pendingRequest = null;
      pendingBaseUrl = null;
      return data;
    })
    .catch((error) => {
      pendingRequest = null;
      pendingBaseUrl = null;
      throw error;
    });

  return pendingRequest;
}

export function getCachedObjectInfo(): Record<string, any> | null {
  return cachedResponse;
}

export function invalidateObjectInfoCache(): void {
  cachedResponse = null;
  cachedBaseUrl = null;
  cacheTimestamp = 0;
  pendingRequest = null;
  pendingBaseUrl = null;
}

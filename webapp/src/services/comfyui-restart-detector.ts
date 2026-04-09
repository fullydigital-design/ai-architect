import { resolveComfyUIBaseUrl } from './api-config';

function normalizeBaseUrl(url: string): string {
  return resolveComfyUIBaseUrl(url);
}

async function isComfyOnline(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForComfyUIRestart(
  comfyuiUrl: string,
  options?: { timeoutMs?: number; pollIntervalMs?: number },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 3_000;
  const baseUrl = normalizeBaseUrl(comfyuiUrl);
  const startedAt = Date.now();

  let sawOffline = false;
  while (Date.now() - startedAt < timeoutMs) {
    const online = await isComfyOnline(baseUrl);
    if (!sawOffline) {
      if (!online) sawOffline = true;
    } else if (online) {
      return true;
    }
    await sleep(pollIntervalMs);
  }
  return false;
}

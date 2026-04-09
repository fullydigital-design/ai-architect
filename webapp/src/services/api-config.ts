const DEFAULT_COMFYUI_URL = 'http://127.0.0.1:8188';

function normalizeDirectUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_COMFYUI_URL;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `http://${trimmed}`;
}

/**
 * Returns the base URL for ComfyUI API calls.
 * In development, uses the Vite proxy to avoid CORS issues.
 * In production, uses the direct ComfyUI URL.
 */
export function getComfyUIBaseUrl(): string {
  if (import.meta.env.DEV) {
    return '/comfyui-proxy';
  }
  return DEFAULT_COMFYUI_URL;
}

/**
 * Resolves a usable ComfyUI HTTP base URL.
 * In development this always routes through the Vite proxy.
 */
export function resolveComfyUIBaseUrl(comfyuiUrl?: string): string {
  if (import.meta.env.DEV) {
    return getComfyUIBaseUrl();
  }
  return normalizeDirectUrl(comfyuiUrl || DEFAULT_COMFYUI_URL);
}

/**
 * Returns the WebSocket URL for ComfyUI.
 * In development, uses the Vite proxy's ws support.
 */
export function getComfyUIWebSocketUrl(comfyuiUrl?: string): string {
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/comfyui-proxy`;
    }
    return 'ws://localhost:5173/comfyui-proxy';
  }

  const base = normalizeDirectUrl(comfyuiUrl || DEFAULT_COMFYUI_URL);
  return base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

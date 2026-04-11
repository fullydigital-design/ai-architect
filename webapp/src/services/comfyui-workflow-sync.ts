import { detectMixedContent, resolveComfyUrl } from './comfyui-backend';

export interface ComfyUIWorkflowFile {
  /** Filename relative to workflows/ (for example "my-workflow.json" or "portraits/face-fix.json") */
  path: string;
  /** Display name (filename without .json extension) */
  name: string;
  /** Subfolder (empty string if root) */
  subfolder: string;
  /** The parsed workflow JSON (loaded on demand) */
  workflow?: Record<string, unknown>;
  /** Source identifier */
  source: 'comfyui-folder';
}

function encodeWorkflowPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function ensureJsonFilename(filename: string): string {
  const trimmed = filename.trim().replace(/^\/+/, '').replace(/\/+/g, '/');
  if (!trimmed) return 'untitled-workflow.json';
  return trimmed.toLowerCase().endsWith('.json') ? trimmed : `${trimmed}.json`;
}

/**
 * List all workflow files in ComfyUI user/default/workflows/.
 */
export async function listComfyUIWorkflows(baseUrl: string): Promise<ComfyUIWorkflowFile[]> {
  const normalized = resolveComfyUrl(baseUrl);
  if (detectMixedContent(normalized)) {
    throw new Error('HTTPS to HTTP ComfyUI requests are blocked by browser mixed-content policy.');
  }

  const response = await fetch(
    `${normalized}/api/userdata?dir=workflows&recurse=true&split=false`,
    { signal: AbortSignal.timeout(10_000) },
  );

  if (!response.ok) {
    if (response.status === 404) {
      console.warn('[ComfyUIWorkflowSync] Userdata workflow API not available (ComfyUI too old?)');
      return [];
    }
    throw new Error(`Failed to list workflows: HTTP ${response.status}`);
  }

  const files = await response.json() as string[];
  return files
    .filter((file) => typeof file === 'string' && file.toLowerCase().endsWith('.json'))
    .map((file) => {
      const normalizedPath = String(file).replace(/^\/+/, '');
      const parts = normalizedPath.split('/');
      const filename = parts[parts.length - 1] || normalizedPath;
      const subfolder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      return {
        path: normalizedPath,
        name: filename.replace(/\.json$/i, ''),
        subfolder,
        source: 'comfyui-folder' as const,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Load one workflow file from ComfyUI workflows folder.
 */
export async function loadComfyUIWorkflow(
  baseUrl: string,
  path: string,
): Promise<Record<string, unknown>> {
  const normalized = resolveComfyUrl(baseUrl);
  if (detectMixedContent(normalized)) {
    throw new Error('HTTPS to HTTP ComfyUI requests are blocked by browser mixed-content policy.');
  }
  const safePath = encodeWorkflowPath(path.replace(/^\/+/, ''));

  const response = await fetch(
    `${normalized}/api/userdata/workflows/${safePath}`,
    { signal: AbortSignal.timeout(10_000) },
  );

  if (!response.ok) {
    if (response.status === 404) {
      // Electron fallback: read directly from filesystem via IPC
      if (typeof window !== 'undefined' && window.electronAPI?.readWorkflowFile) {
        const result = await window.electronAPI.readWorkflowFile(path.replace(/^\/+/, ''));
        if (result.content) {
          return JSON.parse(result.content) as Record<string, unknown>;
        }
        if (result.error) {
          throw new Error(`Failed to load workflow: ${result.error}`);
        }
      }
      throw new Error(`Workflow file not found. Your ComfyUI may not support reading files via API — try updating ComfyUI to the latest version.`);
    }
    throw new Error(`Failed to load workflow "${path}": HTTP ${response.status}`);
  }

  return await response.json() as Record<string, unknown>;
}

/**
 * Save workflow into ComfyUI workflows folder.
 */
export async function saveComfyUIWorkflow(
  baseUrl: string,
  filename: string,
  workflow: Record<string, unknown>,
  overwrite: boolean = false,
): Promise<string> {
  const normalized = resolveComfyUrl(baseUrl);
  if (detectMixedContent(normalized)) {
    throw new Error('HTTPS to HTTP ComfyUI requests are blocked by browser mixed-content policy.');
  }
  const desiredName = ensureJsonFilename(filename);

  let targetName = desiredName;
  if (!overwrite) {
    const existing = await listComfyUIWorkflows(baseUrl);
    const existingPaths = new Set(existing.map((entry) => entry.path));
    if (existingPaths.has(targetName)) {
      const base = targetName.replace(/\.json$/i, '');
      const stamp = new Date().toISOString().slice(0, 10);
      let index = 1;
      let candidate = `${base}_${stamp}.json`;
      while (existingPaths.has(candidate)) {
        index += 1;
        candidate = `${base}_${stamp}_${index}.json`;
      }
      targetName = candidate;
    }
  }

  const response = await fetch(
    `${normalized}/api/userdata/workflows/${encodeWorkflowPath(targetName)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to save workflow "${targetName}": HTTP ${response.status}`);
  }

  return targetName;
}

/**
 * Delete one workflow from ComfyUI workflows folder.
 */
export async function deleteComfyUIWorkflow(
  baseUrl: string,
  path: string,
): Promise<void> {
  const normalized = resolveComfyUrl(baseUrl);
  if (detectMixedContent(normalized)) {
    throw new Error('HTTPS to HTTP ComfyUI requests are blocked by browser mixed-content policy.');
  }
  const safePath = encodeWorkflowPath(path.replace(/^\/+/, ''));

  const response = await fetch(
    `${normalized}/api/userdata/workflows/${safePath}`,
    {
      method: 'DELETE',
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to delete workflow "${path}": HTTP ${response.status}`);
  }
}

import { resolveComfyUIBaseUrl } from './api-config';

export interface HistoryImage {
  url: string;
  filename: string;
  subfolder: string;
  promptId: string;
  timestamp: number;
  workflow?: Record<string, unknown>;
  promptText?: string;
  nodeType?: string;
  modelName?: string;
  nodeCount?: number;
}

interface RawHistoryEntry {
  number?: number;
  prompt?: unknown[];
  outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }>;
  status?: {
    status_str?: string;
    completed?: boolean;
    completed_at?: number;
    completed_time?: number;
  };
  created_at?: number;
  timestamp?: number;
}

function normalizeBaseUrl(baseUrl: string): string {
  return resolveComfyUIBaseUrl(baseUrl).replace(/\/$/, '');
}

function normalizeTimestamp(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Milliseconds epoch
  if (n > 1_000_000_000_000) return Math.round(n);
  // Seconds epoch
  if (n > 1_000_000_000) return Math.round(n * 1000);
  return null;
}

function extractWorkflowFromPrompt(prompt: unknown[]): Record<string, unknown> | undefined {
  const apiWorkflow = prompt?.[2];
  if (apiWorkflow && typeof apiWorkflow === 'object') {
    const maybeApi = apiWorkflow as Record<string, unknown>;
    // Keep API workflow if keys are numeric node IDs.
    if (Object.keys(maybeApi).some((k) => /^\d+$/.test(k))) {
      return maybeApi;
    }
  }

  const extraPngInfo = prompt?.[3] as { extra_pnginfo?: { workflow?: unknown } } | undefined;
  const graphWorkflow = extraPngInfo?.extra_pnginfo?.workflow;
  if (graphWorkflow && typeof graphWorkflow === 'object') {
    return graphWorkflow as Record<string, unknown>;
  }

  return undefined;
}

function extractPromptText(promptNodes: Record<string, any>): string {
  let best = '';
  for (const node of Object.values(promptNodes || {})) {
    if (!node || typeof node !== 'object') continue;
    if (String(node.class_type || '').includes('CLIPTextEncode')) {
      const text = node.inputs?.text;
      if (typeof text === 'string' && text.trim().length > best.length) {
        best = text.trim();
      }
    }
  }
  return best;
}

function extractModelName(promptNodes: Record<string, any>): string {
  for (const node of Object.values(promptNodes || {})) {
    if (!node || typeof node !== 'object') continue;
    const classType = String(node.class_type || '');
    if (classType.includes('CheckpointLoader') || classType.includes('UNETLoader')) {
      const ckpt = node.inputs?.ckpt_name ?? node.inputs?.model_name ?? node.inputs?.unet_name;
      if (typeof ckpt === 'string' && ckpt.trim().length > 0) return ckpt.trim();
    }
  }
  return '';
}

function countNodes(workflow?: Record<string, unknown>, promptNodes?: Record<string, unknown>): number | undefined {
  if (workflow && Array.isArray((workflow as { nodes?: unknown[] }).nodes)) {
    return (workflow as { nodes: unknown[] }).nodes.length;
  }
  if (promptNodes) {
    const numericIds = Object.keys(promptNodes).filter((k) => /^\d+$/.test(k));
    if (numericIds.length > 0) return numericIds.length;
  }
  return undefined;
}

function resolveEntryTimestamp(entry: RawHistoryEntry, prompt: unknown[]): number {
  const candidates = [
    normalizeTimestamp(entry.timestamp),
    normalizeTimestamp(entry.created_at),
    normalizeTimestamp(entry.status?.completed_at),
    normalizeTimestamp(entry.status?.completed_time),
    normalizeTimestamp(prompt?.[0]),
  ];
  const ts = candidates.find((v) => typeof v === 'number' && Number.isFinite(v)) ?? Date.now();
  return ts;
}

/**
 * Fetch all history entries from ComfyUI /history endpoint and extract image URLs + metadata.
 */
export async function fetchComfyUIHistory(
  baseUrl: string,
  maxEntries = 200,
): Promise<HistoryImage[]> {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const response = await fetch(`${normalizedBase}/history?max_items=${maxEntries}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`History fetch failed: ${response.status}`);
  }

  const history = await response.json() as Record<string, RawHistoryEntry>;
  const images: HistoryImage[] = [];

  for (const [promptId, entry] of Object.entries(history || {})) {
    const prompt = Array.isArray(entry.prompt) ? entry.prompt : [];
    const promptNodes = (prompt[2] && typeof prompt[2] === 'object')
      ? prompt[2] as Record<string, any>
      : {};
    const outputs = entry.outputs || {};
    const timestamp = resolveEntryTimestamp(entry, prompt);
    const workflow = extractWorkflowFromPrompt(prompt);
    const promptText = extractPromptText(promptNodes);
    const modelName = extractModelName(promptNodes);
    const nodeCount = countNodes(workflow, promptNodes);

    for (const [nodeId, nodeOutput] of Object.entries(outputs)) {
      const nodeImages = nodeOutput?.images || [];
      for (const img of nodeImages) {
        const imgType = img.type || 'output';
        images.push({
          url: `${normalizedBase}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(imgType)}`,
          filename: img.filename,
          subfolder: img.subfolder || '',
          promptId,
          timestamp,
          workflow,
          promptText: promptText ? promptText.slice(0, 240) : undefined,
          nodeType: nodeId,
          modelName: modelName || undefined,
          nodeCount,
        });
      }
    }
  }

  images.sort((a, b) => b.timestamp - a.timestamp);
  return images;
}

/**
 * Best-effort deletion of a history prompt entry in ComfyUI.
 * ComfyUI APIs differ across versions, so try common variants.
 */
export async function deleteComfyUIHistoryPrompt(
  baseUrl: string,
  promptId: string,
): Promise<boolean> {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const attempts: Array<() => Promise<Response>> = [
    () => fetch(`${normalizedBase}/history/${encodeURIComponent(promptId)}`, { method: 'DELETE', signal: AbortSignal.timeout(8000) }),
    () => fetch(`${normalizedBase}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete: [promptId] }),
      signal: AbortSignal.timeout(8000),
    }),
    () => fetch(`${normalizedBase}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: false, delete: [promptId] }),
      signal: AbortSignal.timeout(8000),
    }),
  ];

  for (const request of attempts) {
    try {
      const response = await request();
      if (response.ok) return true;
    } catch {
      // try next strategy
    }
  }

  return false;
}

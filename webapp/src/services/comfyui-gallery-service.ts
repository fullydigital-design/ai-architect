import { detectMixedContent, resolveComfyUrl } from './comfyui-backend';

export interface GalleryImage {
  /** Full URL to display the image via ComfyUI /view endpoint */
  url: string;
  /** Original filename (for example "ComfyUI_00042_.png") */
  filename: string;
  /** Subfolder within output (usually empty string) */
  subfolder: string;
  /** The prompt_id from /history - used to load workflow back */
  promptId: string;
  /** Generation timestamp in milliseconds */
  timestamp: number;
  /** The full workflow JSON from history (graph or api) when available */
  workflow: Record<string, unknown> | null;
  /** Extracted positive prompt text from CLIPTextEncode nodes */
  promptText: string;
  /** Model filename used, if detectable */
  modelName: string;
  /** Node count in the workflow */
  nodeCount: number;
  /** Whether this image was generated in the current browser session */
  isCurrentSession: boolean;
}

export interface GalleryDateGroup {
  label: string;
  images: GalleryImage[];
}

interface RawHistoryEntry {
  prompt?: unknown[];
  outputs?: Record<string, any>;
  status?: {
    completed_at?: number;
    completed_time?: number;
    messages?: unknown[];
  };
  created_at?: number;
  timestamp?: number;
}

interface RawOutputImageRef {
  filename: string;
  subfolder?: string;
  type?: string;
}

function normalizeTimestamp(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (num > 1_000_000_000_000) return Math.round(num); // ms epoch
  if (num > 1_000_000_000) return Math.round(num * 1000); // sec epoch
  return null;
}

function extractStatusMessageTimestamp(entry: RawHistoryEntry): number | null {
  const messages = entry.status?.messages;
  if (!Array.isArray(messages)) return null;

  const candidateTypes = new Set(['execution_start', 'execution_cached', 'execution_success']);
  for (const message of messages) {
    if (!Array.isArray(message) || message.length < 2) continue;
    const type = String(message[0] || '');
    if (!candidateTypes.has(type)) continue;
    const payload = message[1] as { timestamp?: unknown } | undefined;
    const parsed = normalizeTimestamp(payload?.timestamp);
    if (parsed) return parsed;
  }
  return null;
}

function resolveTimestamp(entry: RawHistoryEntry, prompt: unknown[]): number {
  const candidates = [
    extractStatusMessageTimestamp(entry),
    normalizeTimestamp(entry.timestamp),
    normalizeTimestamp(entry.created_at),
    normalizeTimestamp(entry.status?.completed_at),
    normalizeTimestamp(entry.status?.completed_time),
    normalizeTimestamp(prompt[0]),
  ];
  return candidates.find((candidate) => typeof candidate === 'number') ?? Date.now();
}

function coerceHistoryMap(raw: unknown): Record<string, RawHistoryEntry> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const direct = raw as Record<string, unknown>;
    // Some variants may wrap entries under a "history" key.
    if (direct.history && typeof direct.history === 'object' && !Array.isArray(direct.history)) {
      return direct.history as Record<string, RawHistoryEntry>;
    }
    return direct as Record<string, RawHistoryEntry>;
  }

  if (Array.isArray(raw)) {
    const mapped: Record<string, RawHistoryEntry> = {};
    raw.forEach((entry, index) => {
      if (entry && typeof entry === 'object') {
        mapped[String(index)] = entry as RawHistoryEntry;
      }
    });
    return mapped;
  }

  return {};
}

function extractOutputImages(nodeOutput: unknown): RawOutputImageRef[] {
  if (!nodeOutput || typeof nodeOutput !== 'object') return [];

  const direct = (nodeOutput as { images?: unknown }).images;
  if (Array.isArray(direct)) {
    return direct.filter((img): img is RawOutputImageRef => !!img && typeof img === 'object' && typeof (img as { filename?: unknown }).filename === 'string');
  }

  // Some ComfyUI variants nest output images deeper.
  const nestedOutput = (nodeOutput as { output?: { images?: unknown } }).output?.images;
  if (Array.isArray(nestedOutput)) {
    return nestedOutput.filter((img): img is RawOutputImageRef => !!img && typeof img === 'object' && typeof (img as { filename?: unknown }).filename === 'string');
  }

  return [];
}

function extractPromptNodes(prompt: unknown[]): Record<string, any> {
  const data = prompt[2];
  if (data && typeof data === 'object') {
    return data as Record<string, any>;
  }
  return {};
}

function extractWorkflow(prompt: unknown[]): Record<string, unknown> | null {
  const extraPngInfo = prompt[3] as { extra_pnginfo?: { workflow?: unknown } } | undefined;
  const graphWorkflow = extraPngInfo?.extra_pnginfo?.workflow;
  if (graphWorkflow && typeof graphWorkflow === 'object') {
    return graphWorkflow as Record<string, unknown>;
  }

  const apiWorkflow = prompt[2];
  if (apiWorkflow && typeof apiWorkflow === 'object') {
    return apiWorkflow as Record<string, unknown>;
  }

  return null;
}

function extractPromptText(promptNodes: Record<string, any>): string {
  let longest = '';
  for (const node of Object.values(promptNodes || {})) {
    if (!node || typeof node !== 'object') continue;
    if (node.class_type !== 'CLIPTextEncode') continue;
    const text = node.inputs?.text;
    if (typeof text === 'string' && text.trim().length > longest.length) {
      longest = text.trim();
    }
  }
  return longest;
}

function extractModelName(promptNodes: Record<string, any>): string {
  for (const node of Object.values(promptNodes || {})) {
    if (!node || typeof node !== 'object') continue;
    const classType = String(node.class_type || '');
    if (classType === 'CheckpointLoaderSimple' && typeof node.inputs?.ckpt_name === 'string') {
      return node.inputs.ckpt_name;
    }
    if (classType === 'UNETLoader' && typeof node.inputs?.unet_name === 'string') {
      return node.inputs.unet_name;
    }
  }
  return '';
}

function countNodes(workflow: Record<string, unknown> | null, promptNodes: Record<string, any>): number {
  const graphNodes = workflow?.nodes;
  if (Array.isArray(graphNodes)) return graphNodes.length;

  const apiNodeCount = Object.keys(promptNodes).filter((key) => /^\d+$/.test(key)).length;
  return apiNodeCount;
}

/**
 * Fetch all generation history from ComfyUI and extract image data.
 */
export async function fetchGalleryImages(
  baseUrl: string,
  maxItems: number = 500,
  currentSessionPromptIds?: Set<string>,
): Promise<GalleryImage[]> {
  const normalizedBase = resolveComfyUrl(baseUrl);
  console.log('[Gallery] baseUrl received:', baseUrl);
  console.log('[Gallery] resolved URL:', normalizedBase);
  if (detectMixedContent(normalizedBase)) {
    throw new Error('HTTPS to HTTP ComfyUI requests are blocked by browser mixed-content policy.');
  }

  const response = await fetch(`${normalizedBase}/history?max_items=${maxItems}`, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ComfyUI history: HTTP ${response.status}`);
  }

  const rawHistory = await response.json() as unknown;
  const history = coerceHistoryMap(rawHistory);
  console.log('[Gallery] History entries:', Object.keys(history).length);
  const images: GalleryImage[] = [];

  for (const [promptId, entry] of Object.entries(history || {})) {
    if (!entry || typeof entry !== 'object') continue;
    const prompt = Array.isArray(entry.prompt) ? entry.prompt : [];
    const promptNodes = extractPromptNodes(prompt);
    const timestamp = resolveTimestamp(entry, prompt);
    const workflow = extractWorkflow(prompt);
    const promptText = extractPromptText(promptNodes);
    const modelName = extractModelName(promptNodes);
    const nodeCount = countNodes(workflow, promptNodes);
    const outputs = entry.outputs || {};

    for (const nodeOutput of Object.values(outputs)) {
      const outputImages = extractOutputImages(nodeOutput);
      for (const img of outputImages) {
        if (!img?.filename) continue;
        const type = img.type || 'output';
        images.push({
          url: `${normalizedBase}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(type)}`,
          filename: img.filename,
          subfolder: img.subfolder || '',
          promptId,
          timestamp,
          workflow,
          promptText,
          modelName,
          nodeCount,
          isCurrentSession: currentSessionPromptIds?.has(promptId) ?? false,
        });
      }
    }
  }

  console.log('[Gallery] Extracted images:', images.length);
  images.sort((a, b) => b.timestamp - a.timestamp);
  return images;
}

/**
 * Delete history entries from ComfyUI.
 * Note: This removes history records, not image files on disk.
 */
export async function deleteHistoryEntries(
  baseUrl: string,
  promptIds: string[],
): Promise<void> {
  const normalizedBase = resolveComfyUrl(baseUrl);
  if (detectMixedContent(normalizedBase)) {
    throw new Error('HTTPS to HTTP ComfyUI requests are blocked by browser mixed-content policy.');
  }

  const uniquePromptIds = [...new Set(
    promptIds
      .map((id) => String(id || '').trim())
      .filter((id) => id.length > 0),
  )];
  if (uniquePromptIds.length === 0) return;

  const response = await fetch(`${normalizedBase}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delete: uniquePromptIds }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete history: HTTP ${response.status}`);
  }
}

/**
 * Group images by date for display.
 */
export function groupImagesByDate(images: GalleryImage[]): GalleryDateGroup[] {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart - 86_400_000;
  const weekAgoStart = todayStart - 7 * 86_400_000;

  const groups: GalleryDateGroup[] = [
    { label: 'Today', images: [] },
    { label: 'Yesterday', images: [] },
    { label: 'This Week', images: [] },
    { label: 'Older', images: [] },
  ];

  for (const image of images) {
    if (image.timestamp >= todayStart) groups[0].images.push(image);
    else if (image.timestamp >= yesterdayStart) groups[1].images.push(image);
    else if (image.timestamp >= weekAgoStart) groups[2].images.push(image);
    else groups[3].images.push(image);
  }

  return groups.filter((group) => group.images.length > 0);
}

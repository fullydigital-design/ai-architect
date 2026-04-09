import { useState, useEffect, useCallback } from 'react';
import type { HistoryEntry, HistoryImageRef } from '../types';
import { getComfyUIBaseUrl, resolveComfyUIBaseUrl } from '../services/api-config';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export function comfyImageUrl(ref: HistoryImageRef, baseUrl = getComfyUIBaseUrl()): string {
  const p = new URLSearchParams({
    filename: ref.filename,
    subfolder: ref.subfolder,
    type: ref.type,
  });
  return `${normalizeBaseUrl(baseUrl)}/view?${p.toString()}`;
}

export function useComfyHistory(comfyuiUrl = getComfyUIBaseUrl(), maxItems = 50) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseUrl = normalizeBaseUrl(resolveComfyUIBaseUrl(comfyuiUrl));

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/history?max_items=${maxItems}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json() as Record<string, {
        number?: number;
        prompt?: unknown[];
        outputs?: Record<string, { images?: HistoryImageRef[] }>;
        status?: { status_str?: string };
      }>;

      const parsed: HistoryEntry[] = Object.entries(raw).map(([promptId, entry]) => {
        const outputs: HistoryImageRef[] = [];
        for (const nodeOut of Object.values(entry.outputs ?? {})) {
          outputs.push(...(nodeOut.images ?? []));
        }
        const s = entry.status?.status_str ?? 'unknown';
        return {
          promptId,
          number: entry.number ?? 0,
          status: s === 'success' ? 'success' : s === 'error' ? 'error' : 'unknown',
          outputs,
          workflowSnapshot: Array.isArray(entry.prompt) && entry.prompt[2]
            ? entry.prompt[2] as Record<string, unknown>
            : undefined,
        };
      });

      setEntries(parsed.sort((a, b) => b.number - a.number));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, maxItems]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { entries, loading, error, refetch: fetchHistory };
}

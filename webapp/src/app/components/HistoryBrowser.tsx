import { useMemo, useState } from 'react';
import { RefreshCw, ImageOff, History } from 'lucide-react';
import { comfyImageUrl, useComfyHistory } from '../../hooks/useComfyHistory';
import type { HistoryEntry } from '../../types';

interface HistoryBrowserProps {
  comfyuiUrl?: string;
  onLoadWorkflow?: (workflow: Record<string, unknown>) => void;
  onRerun?: (workflow: Record<string, unknown>) => void;
}

type StatusFilter = 'all' | 'success' | 'error';

function statusDot(status: HistoryEntry['status']): string {
  if (status === 'success') return 'bg-green-500';
  if (status === 'error') return 'bg-red-500';
  return 'bg-gray-500';
}

function extractWorkflowGraph(snapshot: Record<string, unknown>): Record<string, unknown> {
  const maybeExtraPngInfo = (snapshot as { extra_pnginfo?: unknown }).extra_pnginfo;
  if (
    maybeExtraPngInfo &&
    typeof maybeExtraPngInfo === 'object' &&
    (maybeExtraPngInfo as { workflow?: unknown }).workflow &&
    typeof (maybeExtraPngInfo as { workflow?: unknown }).workflow === 'object'
  ) {
    return (maybeExtraPngInfo as { workflow: Record<string, unknown> }).workflow;
  }
  return snapshot;
}

export default function HistoryBrowser({ comfyuiUrl, onLoadWorkflow, onRerun }: HistoryBrowserProps) {
  const { entries, loading, error, refetch } = useComfyHistory(comfyuiUrl, 50);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const queryMatch = !q || entry.promptId.toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || entry.status === statusFilter;
      return queryMatch && statusMatch;
    });
  }, [entries, query, statusFilter]);

  const showOffline = (error ?? '').toLowerCase().includes('fetch') || (error ?? '').toLowerCase().includes('offline');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={refetch}
          className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-surface-inset px-3 py-2 text-sm hover:bg-surface-elevated"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-gray-200" />}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by promptId"
          className="min-w-[220px] flex-1 rounded-md border border-border-strong bg-surface-inset px-3 py-2 text-sm outline-none focus:border-gray-500"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-border-strong bg-surface-inset px-3 py-2 text-sm outline-none"
        >
          <option value="all">All</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
      </div>

      {showOffline && (
        <div className="rounded-md border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
          ComfyUI appears to be offline. Start ComfyUI and refresh.
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-inset/40 p-10 text-center text-content-secondary">
          <History className="mx-auto mb-3 h-8 w-8" />
          <p>No generation history yet. Run a workflow in ComfyUI to see results here.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((entry) => {
          const firstImage = entry.outputs[0];
          const imageKey = `${entry.promptId}:${firstImage?.filename ?? 'none'}`;
          const showImage = !!firstImage && !brokenImages.has(imageKey);
          const hasWorkflow = !!entry.workflowSnapshot;

          return (
            <article key={entry.promptId} className="overflow-hidden rounded-lg border border-border-default bg-gray-950">
              <div className="aspect-video bg-surface-elevated">
                {showImage ? (
                  <img
                    src={comfyImageUrl(firstImage, comfyuiUrl)}
                    alt={`History #${entry.number}`}
                    className="h-full w-full object-cover"
                    onError={() => setBrokenImages((prev) => new Set(prev).add(imageKey))}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-surface-elevated text-content-muted">
                    <ImageOff className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-xs text-content-primary">
                    <span className={`h-2 w-2 rounded-full ${statusDot(entry.status)}`} />
                    {entry.status}
                  </div>
                  <div className="text-xs text-content-muted">#{entry.number}</div>
                </div>

                <p className="truncate text-xs text-content-muted">{entry.promptId}</p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasWorkflow}
                    title={hasWorkflow ? '' : 'No workflow snapshot'}
                    onClick={() => {
                      if (hasWorkflow && onLoadWorkflow && entry.workflowSnapshot) {
                        onLoadWorkflow(extractWorkflowGraph(entry.workflowSnapshot));
                      }
                    }}
                    className="flex-1 rounded-md border border-border-strong px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Load Workflow
                  </button>
                  <button
                    type="button"
                    disabled={!hasWorkflow}
                    title={hasWorkflow ? '' : 'No workflow snapshot'}
                    onClick={() => {
                      if (hasWorkflow && onRerun && entry.workflowSnapshot) {
                        onRerun(extractWorkflowGraph(entry.workflowSnapshot));
                      }
                    }}
                    className="flex-1 rounded-md border border-border-strong px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Re-run
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

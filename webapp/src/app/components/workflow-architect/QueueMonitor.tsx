import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';

interface QueueMonitorProps {
  comfyuiUrl?: string;
  /** Polling interval in ms (default 3000) */
  pollInterval?: number;
  /** If provided, uses WebSocket data instead of polling */
  wsConnected?: boolean;
  wsQueueRunning?: number;
  wsQueuePending?: number;
  wsExecution?: {
    isRunning: boolean;
    currentNode: string | null;
    progress: { step: number; max: number } | null;
  };
  /** Compact mode for header embedding */
  compact?: boolean;
}

interface QueueResponse {
  queue_running?: unknown[];
  queue_pending?: unknown[];
}

function getDotClass(offline: boolean, runningCount: number, pendingCount: number): string {
  if (offline) return 'bg-red-400';
  if (runningCount > 0) return 'bg-emerald-400 animate-pulse';
  if (pendingCount > 0) return 'bg-amber-400';
  return 'bg-text-muted';
}

function getStatusText(offline: boolean, runningCount: number, pendingCount: number): string {
  if (offline) return 'Offline';
  if (runningCount > 0) return 'Generating...';
  if (pendingCount > 0) return `${pendingCount} pending`;
  return 'Queue idle';
}

export function QueueMonitor({
  comfyuiUrl,
  pollInterval = 3000,
  wsConnected,
  wsQueueRunning = 0,
  wsQueuePending = 0,
  wsExecution,
  compact = false,
}: QueueMonitorProps) {
  const useWebSocketMode = wsConnected !== undefined;
  const [runningCount, setRunningCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [offline, setOffline] = useState(false);
  const [paused, setPaused] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!comfyuiUrl?.trim()) return;
    const base = comfyuiUrl.replace(/\/$/, '');
    try {
      setChecking(true);
      const res = await fetch(`${base}/queue`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as QueueResponse;
      const running = Array.isArray(data.queue_running) ? data.queue_running.length : 0;
      const pending = Array.isArray(data.queue_pending) ? data.queue_pending.length : 0;
      setRunningCount(running);
      setPendingCount(pending);
      setOffline(false);
      setPaused(false);
    } catch {
      setRunningCount(0);
      setPendingCount(0);
      setOffline(true);
      setPaused(true);
    } finally {
      setChecking(false);
    }
  }, [comfyuiUrl]);

  useEffect(() => {
    if (useWebSocketMode) return;
    if (!comfyuiUrl || paused) return;
    void fetchQueue();
    const id = window.setInterval(() => {
      void fetchQueue();
    }, pollInterval);
    return () => window.clearInterval(id);
  }, [comfyuiUrl, pollInterval, paused, fetchQueue]);

  const handleManualCheck = async () => {
    setPaused(false);
    await fetchQueue();
  };

  const dotClass = useWebSocketMode
    ? (wsConnected
      ? (wsExecution?.isRunning
        ? 'bg-emerald-400 animate-pulse'
        : wsQueuePending > 0
          ? 'bg-amber-400'
          : 'bg-emerald-400')
      : 'bg-red-400')
    : getDotClass(offline, runningCount, pendingCount);

  const statusText = useWebSocketMode
    ? (wsConnected
      ? (wsExecution?.isRunning
        ? `Running${wsExecution.progress ? ` (${wsExecution.progress.step}/${wsExecution.progress.max})` : ''}`
        : wsQueuePending > 0
          ? `${wsQueuePending} queued`
          : 'Idle')
      : 'Offline')
    : getStatusText(offline, runningCount, pendingCount);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span className="text-[10px] text-content-muted">{statusText}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-secondary px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
          <span className="text-[10px] text-content-secondary">{statusText}</span>
        </div>
        <button
          type="button"
          onClick={handleManualCheck}
          disabled={checking}
          className="inline-flex items-center gap-1 text-[10px] text-content-muted hover:text-content-primary disabled:opacity-40 transition-colors"
        >
          {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
          Check
        </button>
      </div>
      {useWebSocketMode ? (
        <div className="text-[10px] text-content-muted">
          Running: {wsQueueRunning} - Pending: {wsQueuePending}
          {wsExecution?.isRunning && wsExecution.currentNode ? ` - Node: ${wsExecution.currentNode}` : ''}
        </div>
      ) : (
        <div className="text-[10px] text-content-muted">
          Running: {runningCount} - Pending: {pendingCount}
        </div>
      )}
    </div>
  );
}


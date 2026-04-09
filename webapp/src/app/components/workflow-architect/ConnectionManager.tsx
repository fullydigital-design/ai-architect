import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, RotateCcw, Server, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useComfyStatus } from '../../../hooks/useComfyStatus';
import { resolveComfyUIBaseUrl } from '../../../services/api-config';

interface ConnectionManagerProps {
  comfyuiUrl: string;
  onUrlChange: (url: string) => void;
  wsConnected: boolean;
  wsQueueRunning: number;
  wsQueuePending: number;
  onReconnect: () => void;
  managerAvailable?: boolean;
  hideConnectionHeader?: boolean;
}

interface SystemStats {
  gpuName: string | null;
  pythonVersion: string | null;
  vramUsedGb: number | null;
  vramTotalGb: number | null;
}

function normalizeUrl(url: string): string {
  return resolveComfyUIBaseUrl(url);
}

export function ConnectionManager({
  comfyuiUrl,
  onUrlChange,
  wsConnected,
  wsQueueRunning,
  wsQueuePending,
  onReconnect,
  managerAvailable,
  hideConnectionHeader = false,
}: ConnectionManagerProps) {
  const normalizedUrl = useMemo(() => normalizeUrl(comfyuiUrl), [comfyuiUrl]);
  const { online, gpuUsage } = useComfyStatus(normalizedUrl, 15000);

  const [editing, setEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(comfyuiUrl);
  const [testing, setTesting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    gpuName: null,
    pythonVersion: null,
    vramUsedGb: null,
    vramTotalGb: null,
  });

  useEffect(() => {
    setDraftUrl(comfyuiUrl);
  }, [comfyuiUrl]);

  const fetchSystemStats = useCallback(async (targetUrl: string) => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${normalizeUrl(targetUrl)}/system_stats`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const device = data?.devices?.[0];
      const vramUsed = typeof device?.vram_used === 'number' ? device.vram_used / 1e9 : null;
      const vramTotal = typeof device?.vram_total === 'number' ? device.vram_total / 1e9 : null;
      setSystemStats({
        gpuName: typeof device?.name === 'string' ? device.name : null,
        pythonVersion: data?.system?.python_version ?? null,
        vramUsedGb: vramUsed,
        vramTotalGb: vramTotal,
      });
      return true;
    } catch {
      setSystemStats({
        gpuName: null,
        pythonVersion: null,
        vramUsedGb: null,
        vramTotalGb: null,
      });
      return false;
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (online || wsConnected) {
      void fetchSystemStats(normalizedUrl);
    }
  }, [online, wsConnected, normalizedUrl, fetchSystemStats]);

  const handleSaveUrl = () => {
    const next = draftUrl.trim();
    onUrlChange(next);
    setEditing(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    const ok = await fetchSystemStats(draftUrl || comfyuiUrl);
    setTesting(false);
    if (ok) {
      toast.success('ComfyUI connection is healthy');
    } else {
      toast.error('Cannot reach ComfyUI');
    }
  };

  const handleClearQueue = async () => {
    try {
      const res = await fetch(`${normalizedUrl}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Queue cleared');
    } catch {
      toast.error('Failed to clear queue');
    }
  };

  const handleReboot = async () => {
    if (!managerAvailable) return;
    const confirmed = window.confirm('Reboot ComfyUI now? Running jobs will be interrupted.');
    if (!confirmed) return;
    try {
      const res = await fetch(`${normalizedUrl}/manager/reboot`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('ComfyUI reboot requested');
    } catch {
      toast.error('Failed to request ComfyUI reboot');
    }
  };

  return (
    <div className="rounded-lg border border-border-default bg-surface-secondary p-2.5 space-y-2.5">
      {!hideConnectionHeader && (
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs text-content-primary">{wsConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="text-[10px] text-content-muted inline-flex items-center gap-1">
            {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            WS: {wsConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      )}

      <div className="rounded border border-border-default bg-surface-inset px-2 py-1.5">
        {editing ? (
          <div className="space-y-1.5">
            <input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              className="w-full rounded border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary outline-none focus:border-primary/50"
              placeholder="http://127.0.0.1:8188"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveUrl}
                className="rounded border border-border-strong px-2 py-1 text-[10px] text-content-primary hover:bg-surface-elevated"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftUrl(comfyuiUrl);
                  setEditing(false);
                }}
                className="rounded border border-border-strong px-2 py-1 text-[10px] text-content-secondary hover:bg-surface-elevated"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full text-left text-[10px] text-content-secondary hover:text-content-primary"
            title="Click to edit URL"
          >
            {normalizedUrl}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="inline-flex items-center justify-center gap-1 rounded border border-border-strong px-2 py-1.5 text-[10px] text-content-primary hover:bg-surface-elevated disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Server className="h-3 w-3" />}
          Test Connection
        </button>
        <button
          type="button"
          onClick={onReconnect}
          className="inline-flex items-center justify-center gap-1 rounded border border-border-strong px-2 py-1.5 text-[10px] text-content-primary hover:bg-surface-elevated"
        >
          <RefreshCcw className="h-3 w-3" />
          Reconnect WebSocket
        </button>
      </div>

      <div className="rounded border border-border-default bg-surface-inset px-2 py-1.5 text-[10px] text-content-secondary space-y-1">
        <div>Queue: {wsQueueRunning} running, {wsQueuePending} pending</div>
        {gpuUsage !== null && <div>GPU: {gpuUsage}% VRAM</div>}
        {loadingStats ? (
          <div className="inline-flex items-center gap-1 text-content-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading system info...
          </div>
        ) : (
          <>
            {systemStats.gpuName && <div>GPU Name: {systemStats.gpuName}</div>}
            {systemStats.vramUsedGb !== null && systemStats.vramTotalGb !== null && (
              <div>VRAM: {systemStats.vramUsedGb.toFixed(1)} / {systemStats.vramTotalGb.toFixed(1)} GB</div>
            )}
            {systemStats.pythonVersion && <div>Python: {systemStats.pythonVersion}</div>}
          </>
        )}
      </div>

      <div className="text-[10px] text-content-secondary">
        ComfyUI-Manager: {managerAvailable ? (
          <span className="text-emerald-300">Detected ✅</span>
        ) : (
          <span className="text-amber-300">Not Installed ❌</span>
        )} <span className="text-content-faint">(debug: {String(!!managerAvailable)})</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={handleClearQueue}
          className="rounded border border-border-strong px-2 py-1.5 text-[10px] text-content-primary hover:bg-surface-elevated"
        >
          Clear Queue
        </button>
        <button
          type="button"
          onClick={handleReboot}
          disabled={!managerAvailable}
          className="inline-flex items-center justify-center gap-1 rounded border border-border-strong px-2 py-1.5 text-[10px] text-content-primary hover:bg-surface-elevated disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-3 w-3" />
          Reboot ComfyUI
        </button>
      </div>
    </div>
  );
}

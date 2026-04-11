import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Play, RefreshCcw, RotateCcw, Server, Square, Terminal, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useComfyStatus } from '../../../hooks/useComfyStatus';
import { useComfyUIProcess } from '../../../hooks/useComfyUIProcess';
import { resolveComfyUIBaseUrl } from '../../../services/api-config';

const LAUNCH_CONFIG_KEY = 'comfyui-architect-launch-config';

interface LaunchConfig {
  root: string;
  pythonExe: string;
  port: number;
}

function loadLaunchConfig(): LaunchConfig {
  try {
    const stored = localStorage.getItem(LAUNCH_CONFIG_KEY);
    if (stored) return JSON.parse(stored) as LaunchConfig;
  } catch { /* ignore */ }
  return { root: '', pythonExe: '', port: 8188 };
}

function saveLaunchConfig(cfg: LaunchConfig) {
  try {
    localStorage.setItem(LAUNCH_CONFIG_KEY, JSON.stringify(cfg));
  } catch { /* ignore */ }
}

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

const STATUS_COLOR: Record<string, string> = {
  idle:     'text-content-muted',
  starting: 'text-amber-400',
  running:  'text-emerald-400',
  error:    'text-red-400',
  stopped:  'text-content-muted',
};

const STATUS_LABEL: Record<string, string> = {
  idle:     'Not started',
  starting: 'Starting…',
  running:  'Running',
  error:    'Error',
  stopped:  'Stopped',
};

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
  const { isElectron, status: processStatus, logs, error: processError, start, stop, getDefaultPaths } = useComfyUIProcess();

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

  // Launch section state
  const [launchConfig, setLaunchConfig] = useState<LaunchConfig>(loadLaunchConfig);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Prefill from comfyui-paths.config.json on first mount (Electron only)
  useEffect(() => {
    if (!isElectron) return;
    const stored = localStorage.getItem(LAUNCH_CONFIG_KEY);
    if (stored) return; // user already has saved config
    void getDefaultPaths().then((defaults) => {
      if (!defaults) return;
      const cfg: LaunchConfig = {
        root:      defaults.comfyui_root || '',
        pythonExe: defaults.python_exe   || '',
        port:      8188,
      };
      setLaunchConfig(cfg);
      saveLaunchConfig(cfg);
    });
  }, [isElectron, getDefaultPaths]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (showLogs) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, showLogs]);

  // Toast when ComfyUI process comes online
  const prevStatus = useRef(processStatus);
  useEffect(() => {
    if (prevStatus.current !== 'running' && processStatus === 'running') {
      toast.success('ComfyUI started — connecting…');
      onReconnect();
    }
    if (prevStatus.current !== 'error' && processStatus === 'error' && processError) {
      toast.error(`ComfyUI error: ${processError}`);
    }
    prevStatus.current = processStatus;
  }, [processStatus, processError, onReconnect]);

  useEffect(() => { setDraftUrl(comfyuiUrl); }, [comfyuiUrl]);

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
        gpuName:       typeof device?.name === 'string' ? device.name : null,
        pythonVersion: data?.system?.python_version ?? null,
        vramUsedGb:    vramUsed,
        vramTotalGb:   vramTotal,
      });
      return true;
    } catch {
      setSystemStats({ gpuName: null, pythonVersion: null, vramUsedGb: null, vramTotalGb: null });
      return false;
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (online || wsConnected) void fetchSystemStats(normalizedUrl);
  }, [online, wsConnected, normalizedUrl, fetchSystemStats]);

  const handleSaveUrl = () => {
    onUrlChange(draftUrl.trim());
    setEditing(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    const ok = await fetchSystemStats(draftUrl || comfyuiUrl);
    setTesting(false);
    if (ok) toast.success('ComfyUI connection is healthy');
    else     toast.error('Cannot reach ComfyUI');
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
    if (!window.confirm('Reboot ComfyUI now? Running jobs will be interrupted.')) return;
    try {
      const res = await fetch(`${normalizedUrl}/manager/reboot`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('ComfyUI reboot requested');
    } catch {
      toast.error('Failed to request ComfyUI reboot');
    }
  };

  const handleLaunchConfigChange = (field: keyof LaunchConfig, value: string | number) => {
    const next = { ...launchConfig, [field]: value };
    setLaunchConfig(next);
    saveLaunchConfig(next);
  };

  const handleStart = async () => {
    setShowLogs(true);
    await start({
      root:      launchConfig.root,
      port:      launchConfig.port,
      pythonExe: launchConfig.pythonExe,
    });
    // Update the connection URL to match the launched port
    const newUrl = `http://127.0.0.1:${launchConfig.port}`;
    if (comfyuiUrl !== newUrl) onUrlChange(newUrl);
  };

  const handleStop = async () => {
    if (!window.confirm('Stop ComfyUI? Any running generation will be interrupted.')) return;
    await stop();
  };

  const isLaunching = processStatus === 'starting';
  const isRunning   = processStatus === 'running';
  const canStart    = !isLaunching && !isRunning && launchConfig.root.trim() !== '';

  return (
    <div className="rounded-lg border border-border-default bg-surface-secondary p-2.5 space-y-2.5">
      {/* ── Connection status header ─────────────────────────────────────────── */}
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

      {/* ── URL editor ───────────────────────────────────────────────────────── */}
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
                onClick={() => { setDraftUrl(comfyuiUrl); setEditing(false); }}
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

      {/* ── Test / Reconnect ─────────────────────────────────────────────────── */}
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

      {/* ── System stats ─────────────────────────────────────────────────────── */}
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

      {/* ── Manager / queue controls ─────────────────────────────────────────── */}
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

      {/* ── Launch ComfyUI (Electron only) ───────────────────────────────────── */}
      {isElectron && (
        <div className="rounded border border-border-default bg-surface-inset">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-default">
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3 w-3 text-content-muted" />
              <span className="text-[10px] font-medium text-content-primary">Launch ComfyUI</span>
            </div>
            <span className={`text-[10px] ${STATUS_COLOR[processStatus]}`}>
              {STATUS_LABEL[processStatus]}
            </span>
          </div>

          <div className="p-2 space-y-2">
            {/* Path fields */}
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-content-muted block mb-0.5">ComfyUI Root</label>
                <input
                  value={launchConfig.root}
                  onChange={(e) => handleLaunchConfigChange('root', e.target.value)}
                  placeholder="E:\_AI_IMG\ComfyUI"
                  disabled={isRunning || isLaunching}
                  className="w-full rounded border border-border-strong bg-surface-secondary px-2 py-1 text-[10px] text-content-primary outline-none focus:border-primary/50 disabled:opacity-50 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-content-muted block mb-0.5">Python Executable</label>
                <input
                  value={launchConfig.pythonExe}
                  onChange={(e) => handleLaunchConfigChange('pythonExe', e.target.value)}
                  placeholder="C:\...\python.exe"
                  disabled={isRunning || isLaunching}
                  className="w-full rounded border border-border-strong bg-surface-secondary px-2 py-1 text-[10px] text-content-primary outline-none focus:border-primary/50 disabled:opacity-50 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-content-muted block mb-0.5">Port</label>
                <input
                  type="number"
                  value={launchConfig.port}
                  onChange={(e) => handleLaunchConfigChange('port', parseInt(e.target.value, 10) || 8188)}
                  min={1024}
                  max={65535}
                  disabled={isRunning || isLaunching}
                  className="w-24 rounded border border-border-strong bg-surface-secondary px-2 py-1 text-[10px] text-content-primary outline-none focus:border-primary/50 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Start / Stop */}
            <div className="flex items-center gap-1.5">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!canStart}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded border border-emerald-700 bg-emerald-900/30 px-2 py-1.5 text-[10px] text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLaunching
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Play className="h-3 w-3" />}
                  {isLaunching ? 'Starting…' : 'Start ComfyUI'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded border border-red-700 bg-red-900/30 px-2 py-1.5 text-[10px] text-red-300 hover:bg-red-900/50"
                >
                  <Square className="h-3 w-3" />
                  Stop ComfyUI
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLogs((v) => !v)}
                className="inline-flex items-center gap-1 rounded border border-border-strong px-2 py-1.5 text-[10px] text-content-muted hover:bg-surface-elevated"
                title={showLogs ? 'Hide logs' : 'Show logs'}
              >
                {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Logs
              </button>
            </div>

            {/* Log tail */}
            {showLogs && (
              <div className="rounded border border-border-default bg-[#0a0a0a] px-2 py-1.5 max-h-40 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-[10px] text-content-faint italic">No output yet…</div>
                ) : (
                  logs.map((line, i) => (
                    <div key={i} className="text-[10px] text-content-muted font-mono leading-relaxed whitespace-pre-wrap break-all">
                      {line}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            )}

            {processError && processStatus === 'error' && (
              <div className="text-[10px] text-red-400 bg-red-950/30 rounded px-2 py-1 border border-red-900/50">
                {processError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

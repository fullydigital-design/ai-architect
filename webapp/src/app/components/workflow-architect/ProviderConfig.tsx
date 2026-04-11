import { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  ExternalLink,
  RotateCcw,
  Info,
  Github,
  MonitorSmartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Cpu,
  Check,
  Loader2,
  Shield,
  Terminal,
  Copy,
  HelpCircle,
} from 'lucide-react';
import type { AIProvider, ProviderSettings, CustomModel } from '../../../types/comfyui';
import {
  DEFAULT_MODELS,
  getModelsByProvider,
  getProviderForModel,
  PROVIDER_INFO,
  PROVIDER_ORDER,
  MODEL_DISCOVERY_URLS,
  type ModelEntry,
} from '../../../services/ai-provider';
import type { PinnedNodePack, LibraryMode } from '../../../hooks/useNodeLibrary';
import { MyPacksPanel } from './MyPacksPanel';
import { InstalledModelsPanel } from './InstalledModelsPanel';
import {
  testConnection,
  fetchAndCacheObjectInfo,
  getCacheStatus,
  clearLiveNodeCache,
  detectMixedContent,
  createEmptyInstalledModels,
  type ConnectionTestResult,
  type LiveNodeCache,
} from '../../../services/comfyui-backend';
import {
  fetchCustomNodeRegistry,
  detectInstalledPacks,
  type CustomNodePackInfo,
} from '../../../data/custom-node-registry';
import { fetchOpenRouterModels, getCachedOpenRouterModels } from '../../services/openrouter-service';
import { toast } from 'sonner';

// ── ComfyUI Backend Connection Sub-Panel ─────────────────────────────────────

function ComfyUIConnectionPanel({
  settings,
  onSettingsChange,
  onLiveNodesSync,
  onInstalledPacksDetected,
  installedPacksCount = 0,
}: {
  settings: ProviderSettings;
  onSettingsChange: (s: ProviderSettings) => void;
  onLiveNodesSync?: (cache: LiveNodeCache) => void;
  onInstalledPacksDetected?: (packs: CustomNodePackInfo[]) => void;
  installedPacksCount?: number;
}) {
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [showTunnelGuide, setShowTunnelGuide] = useState(false);

  const cache = getCacheStatus();
  const hasUrl = !!settings.comfyuiUrl?.trim();

  // Detect mixed content issue (HTTPS site → HTTP ComfyUI)
  const isMixedContent = hasUrl && detectMixedContent(settings.comfyuiUrl || '');
  const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Detect if user has entered a tunnel URL (already solving the problem)
  const urlValue = (settings.comfyuiUrl || '').trim().toLowerCase();
  const isTunnelUrl = /\.(ngrok|trycloudflare|loca\.lt|serveo\.net|localhost\.run)/.test(urlValue)
    || urlValue.startsWith('https://');

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => toast.success('Copied to clipboard'));
  };

  const handleTest = async () => {
    if (!hasUrl) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(settings.comfyuiUrl!);
      setTestResult(result);
      if (result.success) {
        toast.success('Connected to ComfyUI!');
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      toast.error(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    if (!hasUrl) return;
    setIsSyncing(true);
    try {
      const result = await fetchAndCacheObjectInfo(settings.comfyuiUrl!);
      onLiveNodesSync?.(result);

      // Detect installed custom packs from live /object_info after sync.
      try {
        const registryPacks = await fetchCustomNodeRegistry();
        const installed = await detectInstalledPacks(result, registryPacks);
        onInstalledPacksDetected?.(installed);
      } catch {
        // Registry unavailable: keep sync successful, skip installed-pack enrichment.
      }

      const modelCount = Object.values(result.models).reduce((s, arr) => s + arr.length, 0);
      toast.success(`Synced ${result.nodeCount} nodes & ${modelCount} models from ComfyUI`);
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClear = () => {
    clearLiveNodeCache();
    onInstalledPacksDetected?.([]);
    onLiveNodesSync?.({
      url: '',
      timestamp: 0,
      nodeCount: 0,
      nodes: {},
      models: createEmptyInstalledModels(),
      categorySummary: {},
    });
    toast.info('Live node cache cleared');
  };

  const formatAge = (minutes: number): string => {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatVram = (bytes: number): string => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border-default">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-content-secondary uppercase tracking-wider flex items-center gap-1">
          <MonitorSmartphone className="w-3 h-3" />
          ComfyUI Backend
        </label>
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
          cache
            ? 'bg-state-info-muted text-state-info border border-state-info/20'
            : 'bg-surface-2 text-content-muted'
        }`}>
          {cache ? `${cache.nodeCount} nodes synced` : 'Not connected'}
        </span>
      </div>

      {/* HTTPS tunnel guide banner — shown when site is HTTPS */}
      {isPageHttps && !isTunnelUrl && (
        <div className="rounded-lg border border-state-warning/20 overflow-hidden">
          <button
            onClick={() => setShowTunnelGuide(!showTunnelGuide)}
            className="w-full flex items-center justify-between px-2.5 py-2 bg-state-warning-muted hover:bg-state-warning-muted transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-state-warning" />
              <span className="text-[11px] text-state-warning">
                HTTPS site &mdash; tunnel required for local ComfyUI
              </span>
            </div>
            {showTunnelGuide ? (
              <ChevronUp className="w-3 h-3 text-state-warning/50" />
            ) : (
              <ChevronDown className="w-3 h-3 text-state-warning/50" />
            )}
          </button>

          {showTunnelGuide && (
            <div className="px-2.5 py-2 space-y-2.5 bg-state-warning-muted border-t border-state-warning/20">
              <p className="text-[10px] text-state-warning/70 leading-relaxed">
                Browsers block HTTP requests from HTTPS pages (mixed content).
                Use a free HTTPS tunnel to securely expose your local ComfyUI:
              </p>

              {/* Option 1: Cloudflared (recommended) */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1 py-0.5 rounded bg-state-info-muted text-state-info border border-state-info/20">
                    Recommended
                  </span>
                  <span className="text-[10px] text-content-secondary">Cloudflare Tunnel (free, no signup)</span>
                </div>
                <div className="flex items-center gap-1">
                  <code className="flex-1 text-[10px] text-content-secondary bg-surface-1/70 px-2 py-1.5 rounded font-mono select-all overflow-x-auto whitespace-nowrap">
                    cloudflared tunnel --url http://localhost:8188
                  </code>
                  <button
                    onClick={() => copyCommand('cloudflared tunnel --url http://localhost:8188')}
                    className="shrink-0 p-1.5 rounded hover:bg-surface-2 text-content-muted hover:text-content-secondary transition-colors"
                    title="Copy command"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[9px] text-content-muted leading-relaxed">
                  Install: <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" target="_blank" rel="noopener noreferrer" className="text-accent-text hover:text-accent-text underline">cloudflared</a>.
                  Gives you a URL like <code className="text-content-secondary bg-surface-2/50 px-0.5 rounded">https://random-name.trycloudflare.com</code>
                </p>
              </div>

              {/* Option 2: ngrok */}
              <div className="space-y-1">
                <span className="text-[10px] text-content-secondary">ngrok (free with signup)</span>
                <div className="flex items-center gap-1">
                  <code className="flex-1 text-[10px] text-content-secondary bg-surface-1/70 px-2 py-1.5 rounded font-mono select-all overflow-x-auto whitespace-nowrap">
                    ngrok http 8188
                  </code>
                  <button
                    onClick={() => copyCommand('ngrok http 8188')}
                    className="shrink-0 p-1.5 rounded hover:bg-surface-2 text-content-muted hover:text-content-secondary transition-colors"
                    title="Copy command"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Then what */}
              <div className="flex items-start gap-1.5 pt-1 border-t border-border-subtle">
                <Terminal className="w-3 h-3 text-state-info/60 shrink-0 mt-0.5" />
                <p className="text-[9px] text-content-secondary leading-relaxed">
                  Run the command, copy the <code className="text-content-secondary bg-surface-2/50 px-0.5 rounded">https://</code> URL it outputs, and paste it below.
                  ComfyUI also needs <code className="text-content-secondary bg-surface-2/50 px-0.5 rounded">--listen 0.0.0.0 --enable-cors-header "*"</code> flags.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tunnel detected — green badge */}
      {isTunnelUrl && isPageHttps && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-state-success-muted border border-state-success/20">
          <Check className="w-3 h-3 text-state-success" />
          <span className="text-[10px] text-state-success">
            HTTPS tunnel URL detected — mixed content resolved
          </span>
        </div>
      )}

      {/* URL input */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={settings.comfyuiUrl || ''}
          onChange={(e) => onSettingsChange({ ...settings, comfyuiUrl: e.target.value })}
          placeholder={isPageHttps ? "https://your-tunnel-url.trycloudflare.com" : "http://127.0.0.1:8188"}
          className="flex-1 min-w-0 bg-surface-inset border border-border-default rounded-lg text-xs text-content-primary px-2.5 py-2 focus:outline-none focus:border-accent/50 placeholder-text-tertiary font-mono"
        />
        <button
          onClick={handleTest}
          disabled={!hasUrl || isTesting}
          className="shrink-0 px-2.5 py-2 rounded-lg bg-surface-elevated border border-border-strong hover:border-state-info/30 hover:bg-surface-secondary text-content-secondary hover:text-state-info text-xs transition-colors disabled:opacity-30"
          title="Test connection"
        >
          {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`p-2 rounded-lg text-[10px] ${
          testResult.success
            ? 'bg-state-success-muted border border-state-success/20 text-state-success'
            : 'bg-state-error-muted border border-state-error/20 text-state-error'
        }`}>
          {testResult.success ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Connected</span>
              </div>
              {testResult.systemInfo?.gpuName && (
                <div className="flex items-center gap-1 text-content-secondary">
                  <Cpu className="w-2.5 h-2.5" />
                  <span>{testResult.systemInfo.gpuName}</span>
                  {testResult.systemInfo.vramTotal && (
                    <span className="text-content-muted">
                      ({formatVram(testResult.systemInfo.vramFree || 0)} free / {formatVram(testResult.systemInfo.vramTotal)})
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <WifiOff className="w-3 h-3 shrink-0" />
                <span>{testResult.error?.split('\n')[0]}</span>
              </div>
              {testResult.error && testResult.error.includes('\n') && (
                <div className="text-[9px] text-state-error/60 space-y-0.5 pl-4">
                  {testResult.error.split('\n').slice(1).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sync button */}
      <button
        onClick={handleSync}
        disabled={!hasUrl || isSyncing}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-state-info hover:bg-state-info/90 disabled:opacity-30 disabled:hover:bg-state-info text-content-inverse text-xs transition-colors"
      >
        {isSyncing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Syncing nodes...
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Nodes from ComfyUI
          </>
        )}
      </button>

      {/* Cache info */}
      {cache && (
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-content-muted">
            {cache.nodeCount} nodes cached ({formatAge(cache.ageMinutes)})
          </span>
          <button
            onClick={handleClear}
            className="text-content-faint hover:text-state-error transition-colors"
          >
            Clear cache
          </button>
        </div>
      )}
      {installedPacksCount > 0 && (
        <p className="text-[10px] text-state-success/70 mt-0.5">
          {installedPacksCount} custom pack(s) detected
        </p>
      )}

      {/* General help */}
      <p className="text-[9px] text-content-faint">
        Connects to your local ComfyUI to sync all installed node schemas & model filenames.
        {isPageHttps ? (
          <> Use a tunnel (see above) to connect securely from this HTTPS page.</>
        ) : (
          <>
            {' '}Start ComfyUI with{' '}
            <code className="text-content-secondary bg-surface-2/50 px-0.5 rounded">--listen</code>{' '}
            and <code className="text-content-secondary bg-surface-2/50 px-0.5 rounded">--enable-cors-header &quot;*&quot;</code> if needed.
          </>
        )}
      </p>
    </div>
  );
}

interface ProviderConfigProps {
  settings: ProviderSettings;
  onSettingsChange: (settings: ProviderSettings) => void;
  // Node library props
  pinnedPacks?: PinnedNodePack[];
  libraryMode?: LibraryMode;
  onUnpinPack?: (packId: string) => void;
  onToggleLibraryMode?: () => void;
  onClearLibrary?: () => void;
  onOpenNodesBrowser?: () => void;
  onExportLibrary?: () => string;
  onImportLibrary?: (json: string) => boolean;
  // Learn Nodes props
  learnedPackIds?: Set<string>;
  learningPackId?: string | null;
  learningProgress?: string;
  onLearnPack?: (packId: string, packTitle: string, reference: string) => void;
  onClearLearnedSchemas?: (packId: string) => void;
  learnedNodeCounts?: Map<string, number>;
  // ComfyUI backend connection
  liveNodeCount?: number;
  onLiveNodesSync?: (cache: LiveNodeCache) => void;
  onInstalledPacksDetected?: (packs: CustomNodePackInfo[]) => void;
  installedPacksCount?: number;
}

type Tab = 'model' | 'keys' | 'my-models' | 'my-packs';

export function ProviderConfig({
  settings,
  onSettingsChange,
  pinnedPacks = [],
  libraryMode = 'discover',
  onUnpinPack,
  onToggleLibraryMode,
  onClearLibrary,
  onOpenNodesBrowser,
  onExportLibrary,
  onImportLibrary,
  learnedPackIds = new Set(),
  learningPackId = null,
  learningProgress = '',
  onLearnPack,
  onClearLearnedSchemas,
  learnedNodeCounts = new Map(),
  liveNodeCount = 0,
  onLiveNodesSync,
  onInstalledPacksDetected,
  installedPacksCount = 0,
}: ProviderConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('model');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [addModelProvider, setAddModelProvider] = useState<AIProvider>('openai');
  const [addModelId, setAddModelId] = useState('');

  useEffect(() => {
    const openrouterKey = settings.keys.openrouter?.trim();
    if (!openrouterKey) return;
    if (activeTab !== 'model' && activeTab !== 'my-models') return;

    void fetchOpenRouterModels(openrouterKey).catch(() => {
      // Best-effort cache warmup.
    });
  }, [settings.keys.openrouter, activeTab]);

  // All models including custom
  const modelsByProvider = useMemo(
    () => getModelsByProvider(settings.customModels),
    [settings.customModels]
  );

  // Determine which provider serves the currently-selected model
  const activeProvider = getProviderForModel(settings.selectedModel, settings.customModels);
  const activeKey = settings.keys[activeProvider];
  const providerName = PROVIDER_INFO[activeProvider].name;

  // Find display name for selected model
  const allModels = useMemo(() => {
    const entries: ModelEntry[] = [];
    for (const p of PROVIDER_ORDER) {
      entries.push(...(modelsByProvider[p] || []));
    }
    return entries;
  }, [modelsByProvider]);

  const selectedModelEntry = allModels.find(m => m.id === settings.selectedModel);

  // Count API keys set (LM Studio uses a URL, not a key — exclude from count)
  const apiKeyProviders = PROVIDER_ORDER.filter(p => p !== 'lmstudio');
  const keysSet = apiKeyProviders.filter(p => settings.keys[p].length > 0).length;
  const customModelCount = settings.customModels.length;

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleAddModel = () => {
    const trimmedId = addModelId.trim();
    if (!trimmedId) return;
    // Derive a display name from the model ID
    const name = trimmedId
      .split('/').pop()!
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/(\d{4,})/, (match) => match); // keep numbers as-is

    const cachedOpenRouterModel = addModelProvider === 'openrouter'
      ? getCachedOpenRouterModels().find((model) => model.id === trimmedId)
      : null;

    const newModel: CustomModel = {
      id: trimmedId,
      name,
      provider: addModelProvider,
      contextLength: cachedOpenRouterModel?.contextLength,
    };

    // Don't add duplicates
    if (settings.customModels.some(m => m.id === trimmedId)) return;

    onSettingsChange({
      ...settings,
      customModels: [...settings.customModels, newModel],
    });
    setAddModelId('');
  };

  const handleRemoveCustomModel = (modelId: string) => {
    const updated = settings.customModels.filter(m => m.id !== modelId);
    onSettingsChange({
      ...settings,
      customModels: updated,
      // If we removed the selected model, fallback
      selectedModel: settings.selectedModel === modelId
        ? DEFAULT_MODELS[0].id
        : settings.selectedModel,
    });
  };

  const handleResetDefaults = () => {
    onSettingsChange({
      ...settings,
      customModels: [],
      selectedModel: DEFAULT_MODELS[0].id,
    });
  };

  const handleSelectModel = (modelId: string) => {
    onSettingsChange({ ...settings, selectedModel: modelId });
  };

  const handleKeyChange = (provider: AIProvider, value: string) => {
    onSettingsChange({
      ...settings,
      keys: { ...settings.keys, [provider]: value },
    });
  };

  // All default + custom for the grouped display in My Models
  const allByProvider = useMemo(() => {
    const result: Record<AIProvider, Array<{ id: string; name: string; isCustom: boolean; isActive: boolean }>> = {
      openai: [], anthropic: [], google: [], openrouter: [], lmstudio: [],
    };
    for (const m of DEFAULT_MODELS) {
      result[m.provider].push({
        id: m.id,
        name: m.name,
        isCustom: false,
        isActive: settings.selectedModel === m.id,
      });
    }
    for (const m of settings.customModels) {
      result[m.provider].push({
        id: m.id,
        name: m.name,
        isCustom: true,
        isActive: settings.selectedModel === m.id,
      });
    }
    return result;
  }, [settings.customModels, settings.selectedModel]);

  return (
    <div className="border-b border-border-default">
      {/* Collapsed header bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-secondary transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-accent-text shrink-0" />
          <span className="text-xs text-content-secondary truncate">
            {selectedModelEntry ? (
              <>
                <span className="text-content-primary">{selectedModelEntry.name}</span>
                <span className="text-content-muted ml-1.5">via {providerName}</span>
              </>
            ) : (
              <span className="text-content-primary">Configure AI Model</span>
            )}
          </span>
          {!activeKey && settings.selectedModel && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-state-warning-muted text-state-warning border border-state-warning/20">
              No key
            </span>
          )}
          {pinnedPacks.length > 0 && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-state-success-muted text-state-success border border-state-success/20">
              {pinnedPacks.length} packs
            </span>
          )}
          {liveNodeCount > 0 && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-state-info-muted text-state-info border border-state-info/20">
              {liveNodeCount} live
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-content-faint shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-content-faint shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-border-default mb-3">
            {([
              { id: 'model' as Tab, label: 'Model' },
              { id: 'keys' as Tab, label: `Keys`, badge: `${keysSet}/${apiKeyProviders.length}` },
              { id: 'my-packs' as Tab, label: 'My Packs', badge: `${pinnedPacks.length}` },
              { id: 'my-models' as Tab, label: 'My Models', badge: `${DEFAULT_MODELS.length + customModelCount}` },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-accent-text'
                    : 'border-transparent text-content-secondary hover:text-content-secondary'
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className={`ml-1.5 px-1 py-0.5 rounded text-[9px] ${
                    activeTab === tab.id ? 'bg-accent-muted text-accent-text' : 'bg-surface-2 text-content-muted'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ===== MODEL TAB ===== */}
          {activeTab === 'model' && (
            <div className="space-y-3">
              {/* Key status warning */}
              {!activeKey && settings.selectedModel && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-state-warning-muted border border-state-warning/20">
                  <div className="w-2 h-2 rounded-full bg-state-warning shrink-0" />
                  <span className="text-[11px] text-state-warning">
                    No {providerName} API key
                  </span>
                </div>
              )}

              {/* Model dropdown */}
              <div>
                <label className="text-[10px] text-content-secondary uppercase tracking-wider mb-1.5 block">Model</label>
                <select
                  value={settings.selectedModel}
                  onChange={(e) => handleSelectModel(e.target.value)}
                  className="w-full bg-surface-inset border border-border-default rounded-lg text-xs text-content-primary px-3 py-2.5 focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                  }}
                >
                  {PROVIDER_ORDER.map(provider => {
                    const models = modelsByProvider[provider];
                    if (!models?.length) return null;
                    return (
                      <optgroup key={provider} label={PROVIDER_INFO[provider].name}>
                        {models.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.id})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* Active model info */}
              {selectedModelEntry && (
                <div className="p-2.5 rounded-lg bg-surface-2/30 border border-border/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-content-secondary uppercase tracking-wider">Model Info</span>
                    <span className="text-[9px] text-content-muted">via {providerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-content-primary">{selectedModelEntry.name}</span>
                    {settings.selectedModel === settings.selectedModel && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-accent-muted text-accent-text">
                        Active
                      </span>
                    )}
                  </div>
                  <code className="block text-[10px] text-content-secondary font-mono">
                    {selectedModelEntry.id}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* ===== KEYS TAB ===== */}
          {activeTab === 'keys' && (
            <div className="space-y-3">
              <p className="text-[11px] text-content-secondary">
                Enter API keys for each provider you use. Keys are stored locally in your browser and never sent anywhere except directly to the provider API.
              </p>

              {PROVIDER_ORDER.map(provider => {
                const info = PROVIDER_INFO[provider];
                const key = settings.keys[provider];
                const isVisible = showKeys[provider] || false;
                const hasKey = key.length > 0;
                const isLocal = provider === 'lmstudio';

                return (
                  <div key={provider} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-content-secondary uppercase tracking-wider flex items-center gap-1">
                        {isLocal && <Cpu className="w-3 h-3" />}
                        {info.name}
                      </label>
                      {isLocal ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-state-info-muted text-state-info border border-state-info/20">
                          Local · No key needed
                        </span>
                      ) : (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          hasKey
                            ? 'bg-state-success-muted text-state-success border border-state-success/20'
                            : 'bg-surface-2 text-content-muted'
                        }`}>
                          {hasKey ? 'Set' : 'Not set'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={isLocal || isVisible ? 'text' : 'password'}
                        value={key}
                        onChange={(e) => handleKeyChange(provider, e.target.value)}
                        placeholder={isLocal ? 'http://localhost:1234/v1' : `Paste your ${info.name} API key`}
                        className="w-full bg-surface-inset border border-border-default rounded-lg text-xs text-content-primary px-3 py-2 pr-8 focus:outline-none focus:border-accent/50 placeholder-text-tertiary font-mono"
                      />
                      {!isLocal && (
                        <button
                          onClick={() => toggleKeyVisibility(provider)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary transition-colors"
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    <a
                      href={info.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-accent-text hover:text-accent-text transition-colors"
                    >
                      {info.keyUrlLabel}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                );
              })}

              {/* GitHub Personal Access Token */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-content-secondary uppercase tracking-wider flex items-center gap-1">
                    <Github className="w-3 h-3" />
                    GitHub Token
                  </label>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    settings.githubToken
                      ? 'bg-state-success-muted text-state-success border border-state-success/20'
                      : 'bg-surface-2 text-content-muted'
                  }`}>
                    {settings.githubToken ? 'Set' : 'Optional'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showKeys['github'] ? 'text' : 'password'}
                    value={settings.githubToken || ''}
                    onChange={(e) => onSettingsChange({ ...settings, githubToken: e.target.value })}
                    placeholder="ghp_... (optional — for Learn Nodes)"
                    className="w-full bg-surface-inset border border-border-default rounded-lg text-xs text-content-primary px-3 py-2 pr-8 focus:outline-none focus:border-accent/50 placeholder-text-tertiary font-mono"
                  />
                  <button
                    onClick={() => toggleKeyVisibility('github')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary transition-colors"
                  >
                    {showKeys['github'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <a
                    href="https://github.com/settings/tokens?type=beta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-accent-text hover:text-accent-text transition-colors"
                  >
                    Generate fine-grained token
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-[9px] text-content-faint">
                    5,000 vs 60 req/hr
                  </span>
                </div>
                <p className="text-[9px] text-content-faint">
                  Used by "Learn Nodes" to read custom node source from GitHub.
                  No scopes needed — public repo read access only.
                </p>
              </div>


              {/* Model download API keys */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div>
                  <p className="text-[10px] text-content-secondary uppercase tracking-wider">Model Download API Keys</p>
                  <p className="text-[9px] text-content-muted mt-0.5">
                    Used for gated/private model downloads via ComfyUI-Manager.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-content-secondary uppercase tracking-wider">HuggingFace Token</label>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      (settings.huggingfaceApiKey || '').startsWith('hf_')
                        ? 'bg-state-success-muted text-state-success border border-state-success/20'
                        : (settings.huggingfaceApiKey || '').length > 0
                          ? 'bg-state-error-muted text-state-error border border-state-error/20'
                          : 'bg-surface-2 text-content-muted'
                    }`}>
                      {(settings.huggingfaceApiKey || '').length === 0 ? 'Optional' : (settings.huggingfaceApiKey || '').startsWith('hf_') ? 'Looks valid' : 'Check format'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showKeys['hf'] ? 'text' : 'password'}
                      value={settings.huggingfaceApiKey || ''}
                      onChange={(e) => onSettingsChange({ ...settings, huggingfaceApiKey: e.target.value })}
                      placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-surface-inset border border-border-default rounded-lg text-xs text-content-primary px-3 py-2 pr-8 focus:outline-none focus:border-accent/50 placeholder-text-tertiary font-mono"
                    />
                    <button
                      onClick={() => toggleKeyVisibility('hf')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary transition-colors"
                    >
                      {showKeys['hf'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-accent-text hover:text-accent-text transition-colors"
                  >
                    Get HuggingFace token
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-content-secondary uppercase tracking-wider">CivitAI API Key</label>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      (settings.civitaiApiKey || '').length >= 32
                        ? 'bg-state-success-muted text-state-success border border-state-success/20'
                        : (settings.civitaiApiKey || '').length > 0
                          ? 'bg-state-error-muted text-state-error border border-state-error/20'
                          : 'bg-surface-2 text-content-muted'
                    }`}>
                      {(settings.civitaiApiKey || '').length === 0 ? 'Optional' : (settings.civitaiApiKey || '').length >= 32 ? 'Looks valid' : 'Check length'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showKeys['civitai'] ? 'text' : 'password'}
                      value={settings.civitaiApiKey || ''}
                      onChange={(e) => onSettingsChange({ ...settings, civitaiApiKey: e.target.value })}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-surface-inset border border-border-default rounded-lg text-xs text-content-primary px-3 py-2 pr-8 focus:outline-none focus:border-accent/50 placeholder-text-tertiary font-mono"
                    />
                    <button
                      onClick={() => toggleKeyVisibility('civitai')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary transition-colors"
                    >
                      {showKeys['civitai'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <a
                    href="https://civitai.com/user/account"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-accent-text hover:text-accent-text transition-colors"
                  >
                    Get CivitAI API key
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <p className="text-[9px] text-content-faint">
                  Keys are stored locally in your browser and used only for HuggingFace/CivitAI download requests.
                </p>
              </div>
              {/* ComfyUI Backend Connection */}
              <ComfyUIConnectionPanel
                settings={settings}
                onSettingsChange={onSettingsChange}
                onLiveNodesSync={onLiveNodesSync}
                onInstalledPacksDetected={onInstalledPacksDetected}
                installedPacksCount={installedPacksCount}
              />

              {/* Installed ComfyUI Models browser */}
              <InstalledModelsPanel />

              {/* Security note */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-2/30 border border-border/50">
                <Info className="w-3.5 h-3.5 text-content-faint shrink-0 mt-0.5" />
                <p className="text-[10px] text-content-muted">
                  Keys are stored in <code className="text-content-secondary bg-surface-2/50 px-1 py-0.5 rounded">localStorage</code> only. They are sent directly to the provider's API and never pass through any intermediary.
                </p>
              </div>
            </div>
          )}

          {/* ===== MY PACKS TAB ===== */}
          {activeTab === 'my-packs' && onUnpinPack && onToggleLibraryMode && onClearLibrary && onOpenNodesBrowser && onExportLibrary && onImportLibrary && (
            <MyPacksPanel
              pinnedPacks={pinnedPacks}
              mode={libraryMode}
              onUnpin={onUnpinPack}
              onToggleMode={onToggleLibraryMode}
              onClearAll={onClearLibrary}
              onOpenBrowser={onOpenNodesBrowser}
              onExportLibrary={onExportLibrary}
              onImportLibrary={onImportLibrary}
              learnedPackIds={learnedPackIds}
              learningPackId={learningPackId}
              learningProgress={learningProgress}
              onLearnPack={onLearnPack || (() => {})}
              onClearLearnedSchemas={onClearLearnedSchemas || (() => {})}
              learnedNodeCounts={learnedNodeCounts}
              hasApiKey={!!activeKey}
              liveNodeCount={liveNodeCount}
            />
          )}

          {/* ===== MY MODELS TAB ===== */}
          {activeTab === 'my-models' && (
            <div className="space-y-3">
              {/* Current default + custom models list */}
              {PROVIDER_ORDER.map(provider => {
                const models = allByProvider[provider];
                if (!models || models.length === 0) return null;
                const info = PROVIDER_INFO[provider];

                return (
                  <div key={provider} className="space-y-1">
                    <label className="text-[10px] text-content-secondary uppercase tracking-wider">{info.name}</label>
                    <div className="space-y-0.5">
                      {models.map(m => (
                        <div
                          key={m.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            m.isActive
                              ? 'bg-accent/10 border border-accent/20'
                              : 'hover:bg-surface-2/40 border border-transparent'
                          }`}
                          onClick={() => handleSelectModel(m.id)}
                        >
                          <span className="flex-1 text-xs text-content-primary min-w-0 truncate">{m.name}</span>
                          {m.isActive && (
                            <span className="shrink-0 px-1 py-0.5 rounded text-[8px] bg-accent-muted text-accent-text">Active</span>
                          )}
                          {m.isCustom && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveCustomModel(m.id); }}
                              className="shrink-0 text-content-faint hover:text-state-error transition-colors"
                              title="Remove custom model"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Add custom model */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="text-[10px] text-content-secondary uppercase tracking-wider">Add Custom Model</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={addModelProvider}
                    onChange={(e) => setAddModelProvider(e.target.value as AIProvider)}
                    className="bg-surface-inset border border-border-default rounded-lg text-xs text-content-primary px-2 py-1.5 focus:outline-none"
                  >
                    {PROVIDER_ORDER.map(p => (
                      <option key={p} value={p}>{PROVIDER_INFO[p].name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={addModelId}
                    onChange={(e) => setAddModelId(e.target.value)}
                    placeholder="model-id"
                    className="flex-1 min-w-0 bg-surface-inset border border-border-default rounded-lg text-xs text-content-primary px-2 py-1.5 focus:outline-none focus:border-accent/50 placeholder-text-tertiary font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                  />
                  <button
                    onClick={handleAddModel}
                    disabled={!addModelId.trim()}
                    className="shrink-0 px-2 py-1.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-30 text-accent-contrast text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[9px] text-content-faint">
                  Add any model ID supported by the provider.
                  {' '}
                  {PROVIDER_ORDER.map(p => (
                    MODEL_DISCOVERY_URLS[p] ? (
                      <a key={p} href={MODEL_DISCOVERY_URLS[p]} target="_blank" rel="noopener noreferrer" className="text-accent-text hover:text-accent-text">
                        {PROVIDER_INFO[p].name}
                      </a>
                    ) : null
                  )).filter(Boolean).reduce<React.ReactNode[]>((acc, el, i) => {
                    if (i > 0) acc.push(' \u{00B7} ');
                    acc.push(el);
                    return acc;
                  }, [])}
                </p>
              </div>

              {/* Reset */}
              {settings.customModels.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1.5 text-[10px] text-content-muted hover:text-content-secondary transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to defaults
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


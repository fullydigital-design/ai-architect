import { useState, useEffect, useMemo, useCallback, useRef, type UIEvent } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Star,
  Package,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Terminal,
  Globe,
  Pin,
  PinOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import type { ComfyUIWorkflow } from '../../../types/comfyui';
import { useManagerAPI } from '../../../hooks/useManagerAPI';
import {
  fetchCustomNodeRegistry,
  clearRegistryCache,
  crossReferenceWorkflow,
  type CustomNodePackInfo,
} from '../../../data/custom-node-registry';
import { copyToClipboard } from '../../../utils/comfyui-export';

// ---- Types -----------------------------------------------------------------

type SortField = 'stars' | 'title' | 'author' | 'nodeCount' | 'lastUpdate';
type SortDirection = 'asc' | 'desc';
type FilterTab = 'all' | 'used' | 'missing' | 'installed' | 'popular' | 'pinned';

interface CustomNodesBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: ComfyUIWorkflow | null;
  comfyuiUrl?: string;
  installedPacks?: CustomNodePackInfo[];
  embedded?: boolean;
  hideHeader?: boolean;
  // Pin support
  isPinned?: (packId: string) => boolean;
  onPinPack?: (pack: CustomNodePackInfo) => void;
  onUnpinPack?: (packId: string) => void;
  pinnedCount?: number;
}

// ---- Helpers ---------------------------------------------------------------

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function normalizeReference(reference: string): string {
  return String(reference || '').replace(/\.git$/i, '').replace(/\/+$/, '').trim().toLowerCase();
}

// ---- Component -------------------------------------------------------------

export function CustomNodesBrowser({
  isOpen,
  onClose,
  workflow,
  comfyuiUrl,
  installedPacks,
  embedded = false,
  hideHeader = false,
  isPinned,
  onPinPack,
  onUnpinPack,
  pinnedCount = 0,
}: CustomNodesBrowserProps) {
  const manager = useManagerAPI(comfyuiUrl);
  const [packs, setPacks] = useState<CustomNodePackInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('stars');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [managerChecked, setManagerChecked] = useState(false);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const searchRef = useRef<HTMLInputElement>(null);

  // ---- Load data -----------------------------------------------------------

  const loadRegistry = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (forceRefresh) clearRegistryCache();
      const data = await fetchCustomNodeRegistry({ comfyuiUrl });
      console.log(`[Browse] Loaded ${data.length} pack(s)`);
      setPacks(data);
    } catch (err: any) {
      console.error('Failed to load custom node registry:', err);
      setError(err.message || 'Failed to fetch custom node list from ComfyUI-Manager repository.');
    } finally {
      setLoading(false);
    }
  }, [comfyuiUrl]);

  useEffect(() => {
    if (isOpen && packs.length === 0 && !loading) {
      loadRegistry();
    }
  }, [isOpen, packs.length, loading, loadRegistry]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && comfyuiUrl) {
      setManagerChecked(false);
      Promise.all([
        manager.checkManager(comfyuiUrl),
        manager.fetchStatuses(comfyuiUrl),
      ]).finally(() => setManagerChecked(true));
    }
  }, [isOpen, comfyuiUrl, manager.checkManager, manager.fetchStatuses]);

  // ---- Workflow cross-reference --------------------------------------------

  const workflowNodeTypes = useMemo(() => {
    if (!workflow?.nodes?.length) return [];
    return [...new Set(workflow.nodes.map((n) => n.type))];
  }, [workflow]);

  const { usedPacks, missingTypes } = useMemo(() => {
    if (!packs.length || !workflowNodeTypes.length) {
      return { usedPacks: [] as CustomNodePackInfo[], missingTypes: [] as string[] };
    }
    return crossReferenceWorkflow(packs, workflowNodeTypes);
  }, [packs, workflowNodeTypes]);

  const usedPackIds = useMemo(() => new Set(usedPacks.map((p) => p.id)), [usedPacks]);
  const installedReferenceSet = useMemo(() => {
    const refs = new Set<string>();
    for (const [reference, status] of manager.packStatuses.entries()) {
      if (status === 'installed' || status === 'disabled' || status === 'update-available') {
        refs.add(normalizeReference(reference));
      }
    }
    return refs;
  }, [manager.packStatuses]);

  const installedPackIds = useMemo(() => {
    const ids = new Set<string>((installedPacks ?? []).map((p) => p.id));
    for (const pack of packs) {
      if (installedReferenceSet.has(normalizeReference(pack.reference))) {
        ids.add(pack.id);
      }
    }
    return ids;
  }, [installedPacks, packs, installedReferenceSet]);
  const missingPackCount = useMemo(
    () => usedPacks.filter((p) => !installedPackIds.has(p.id)).length,
    [usedPacks, installedPackIds],
  );

  // ---- Sorting & filtering -------------------------------------------------

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'title' || field === 'author' ? 'asc' : 'desc');
    }
  };

  const filteredPacks = useMemo(() => {
    let list = [...packs];

    // Tab filter
    if (filterTab === 'used') {
      list = list.filter((p) => usedPackIds.has(p.id));
    } else if (filterTab === 'missing') {
      list = list.filter((p) => usedPackIds.has(p.id) && !installedPackIds.has(p.id));
    } else if (filterTab === 'installed') {
      list = list.filter((p) => installedPackIds.has(p.id));
    } else if (filterTab === 'popular') {
      list = list.filter((p) => p.stars >= 100);
    } else if (filterTab === 'pinned') {
      list = list.filter((p) => isPinned?.(p.id));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.nodeNames.some((n) => n.toLowerCase().includes(q)),
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'stars':
          cmp = a.stars - b.stars;
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'author':
          cmp = a.author.localeCompare(b.author);
          break;
        case 'nodeCount':
          cmp = a.nodeCount - b.nodeCount;
          break;
        case 'lastUpdate':
          cmp = a.lastUpdate.localeCompare(b.lastUpdate);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [packs, search, sortField, sortDir, filterTab, usedPackIds, installedPackIds, isPinned]);

  useEffect(() => {
    setVisibleCount(50);
  }, [search, sortField, sortDir, filterTab, packs.length]);

  const visiblePacks = useMemo(
    () => filteredPacks.slice(0, visibleCount),
    [filteredPacks, visibleCount],
  );

  const handleRowsScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 200) return;
    setVisibleCount((prev) => Math.min(prev + 50, filteredPacks.length));
  }, [filteredPacks.length]);

  // ---- Actions -------------------------------------------------------------

  const handleCopyInstall = async (pack: CustomNodePackInfo) => {
    await copyToClipboard(pack.installCommand);
    toast.success(`Copied install command for ${pack.title}`);
  };

  const handleCopyAllMissing = async () => {
    const missingPacks = usedPacks.filter((p) => !installedPackIds.has(p.id));
    const commands = missingPacks.map((p) => p.installCommand).filter(Boolean).join('\n');
    if (commands) {
      await copyToClipboard(commands);
      toast.success(`Copied ${missingPacks.length} install command(s)`);
    }
  };

  const handleTogglePin = (pack: CustomNodePackInfo) => {
    if (!isPinned || !onPinPack || !onUnpinPack) return;
    if (isPinned(pack.id)) {
      onUnpinPack(pack.id);
      toast.success(`Unpinned ${pack.title}`);
    } else {
      onPinPack(pack);
      toast.success(`Pinned ${pack.title} to My Packs`);
    }
  };

  const handleInstall = useCallback(async (pack: CustomNodePackInfo) => {
    if (!comfyuiUrl) return;
    const ok = await manager.installPack(comfyuiUrl, pack.reference);
    if (ok) {
      toast.success('Installed! Restart ComfyUI to activate.');
      setShowRestartPrompt(true);
      await manager.fetchStatuses(comfyuiUrl);
    }
  }, [comfyuiUrl, manager]);

  const handleUpdate = useCallback(async (pack: CustomNodePackInfo) => {
    if (!comfyuiUrl) return;
    const ok = await manager.updatePack(comfyuiUrl, pack.reference);
    if (ok) {
      toast.success(`Updated ${pack.title}`);
      await manager.fetchStatuses(comfyuiUrl);
    }
  }, [comfyuiUrl, manager]);

  const handleUninstall = useCallback(async (pack: CustomNodePackInfo) => {
    if (!comfyuiUrl) return;
    const ok = await manager.uninstallPack(comfyuiUrl, pack.reference);
    if (ok) {
      toast.success(`Uninstalled ${pack.title}. Restart ComfyUI to finalize.`);
      setShowRestartPrompt(true);
      await manager.fetchStatuses(comfyuiUrl);
    }
  }, [comfyuiUrl, manager]);

  const handleRestartComfy = useCallback(async () => {
    if (!comfyuiUrl) return;
    toast.info('Restarting ComfyUI — waiting for it to come back online...');
    const ok = await manager.rebootComfyUI(comfyuiUrl);
    if (ok) {
      toast.success('ComfyUI restarted successfully');
      setShowRestartPrompt(false);
    } else {
      toast.error(manager.error || 'Failed to restart ComfyUI');
    }
  }, [comfyuiUrl, manager]);

  // ---- Sort icon helper ----------------------------------------------------

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-accent-text" />
    ) : (
      <ArrowDown className="w-3 h-3 text-accent-text" />
    );
  };

  // ---- Render --------------------------------------------------------------

  if (!isOpen) return null;

  const hasPinSupport = !!isPinned && !!onPinPack && !!onUnpinPack;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={embedded ? false : { opacity: 0 }}
          animate={embedded ? undefined : { opacity: 1 }}
          exit={embedded ? undefined : { opacity: 0 }}
          transition={embedded ? undefined : { duration: 0.15 }}
          className={
            embedded
              ? 'h-full w-full flex'
              : 'fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm p-4'
          }
          onClick={(e) => {
            if (!embedded && e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={embedded ? false : { opacity: 0, scale: 0.96, y: 10 }}
            animate={embedded ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={embedded ? undefined : { opacity: 0, scale: 0.96, y: 10 }}
            transition={embedded ? undefined : { duration: 0.2 }}
            className={
              embedded
                ? 'w-full h-full flex flex-col bg-surface-elevated border-0 overflow-hidden'
                : 'w-full max-w-6xl h-[85vh] flex flex-col rounded-sm bg-surface-elevated border border-border-strong shadow-2xl overflow-hidden'
            }
          >
            {/* ---- Header -------------------------------------------------- */}
            {!hideHeader && (
              <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-surface-secondary border-b border-border-default">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Package className="w-4.5 h-4.5 text-accent-contrast" />
                  </div>
                  <div>
                    <h2 className="text-sm text-content-primary">
                      Custom Nodes Browser
                    </h2>
                    <p className="text-[10px] text-content-secondary mt-0.5">
                      Powered by ComfyUI-Manager registry
                      {packs.length > 0 && (
                        <span className="text-content-faint"> &middot; {packs.length.toLocaleString()} packs indexed</span>
                      )}
                      {pinnedCount > 0 && (
                        <span className="text-state-success/70"> &middot; {pinnedCount} pinned</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadRegistry(true)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-surface-elevated hover:bg-surface-secondary text-content-secondary text-xs border border-border-strong transition-colors disabled:opacity-40"
                    title="Refresh from GitHub (clears 24h cache)"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  {!embedded && (
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-sm text-content-muted hover:text-content-secondary hover:bg-surface-secondary transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ---- Toolbar ------------------------------------------------- */}
            <div className="shrink-0 px-5 py-3 border-b border-border-subtle flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search packs, authors, or node names..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-sm bg-surface-inset border border-border-default text-sm text-content-primary placeholder-content-faint focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-faint hover:text-content-secondary"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-surface-inset/50 rounded-sm p-0.5">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'popular', label: 'Popular' },
                    { key: 'installed', label: `Installed (${installedPackIds.size})` },
                    ...(hasPinSupport && pinnedCount > 0
                      ? [{ key: 'pinned', label: `My Library (${pinnedCount})` }]
                      : []),
                    ...(workflowNodeTypes.length > 0
                      ? [
                          { key: 'used', label: `Used (${usedPacks.length})` },
                          { key: 'missing', label: `Missing (${missingPackCount})` },
                        ]
                      : []),
                  ] as { key: FilterTab; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterTab(tab.key)}
                    className={`px-3 py-1.5 rounded-sm text-xs transition-colors ${
                      filterTab === tab.key
                        ? tab.key === 'pinned'
                          ? 'bg-state-success-muted text-state-success'
                          : tab.key === 'installed'
                          ? 'bg-state-success-muted text-state-success'
                          : 'bg-accent-muted text-accent-text'
                        : 'text-content-secondary hover:text-content-secondary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {isOpen && (
              <div className="shrink-0 px-5 py-2 border-b border-border-subtle">
                {managerChecked && manager.managerAvailable ? (
                  <div className="rounded-sm bg-state-success-muted border border-state-success/20 px-3 py-2 text-[11px] text-state-success">
                    ComfyUI-Manager connected - install directly from here
                  </div>
                ) : managerChecked ? (
                  <div className="rounded-sm bg-state-warning-muted border border-state-warning/20 px-3 py-2 text-[11px] text-state-warning">
                    <span className="mr-1">!</span>
                    ComfyUI-Manager not detected - install buttons unavailable. Install:{' '}
                    <a
                      href="https://github.com/ltdrdata/ComfyUI-Manager"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-state-warning"
                    >
                      https://github.com/ltdrdata/ComfyUI-Manager
                    </a>
                  </div>
                ) : (
                  <div className="rounded-sm bg-surface-secondary border border-border-default px-3 py-2 text-[11px] text-content-secondary">
                    Checking ComfyUI-Manager availability...
                  </div>
                )}
              </div>
            )}

            {showRestartPrompt && (
              <div className="shrink-0 px-5 py-2 border-b border-accent/20 bg-accent/5 flex items-center justify-between gap-3">
                <span className="text-[11px] text-accent-text flex items-center gap-1.5">
                  {manager.isRebooting && (
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  )}
                  {manager.isRebooting
                    ? 'Restarting ComfyUI — waiting for it to come back online...'
                    : 'Custom node installed! Restart ComfyUI to activate.'}
                </span>
                <button
                  onClick={handleRestartComfy}
                  disabled={!comfyuiUrl || manager.loading || manager.isRebooting}
                  className="px-2.5 py-1 rounded-sm border border-accent/30 bg-accent/20 hover:bg-accent/30 disabled:opacity-40 text-[11px] text-accent-text transition-colors flex items-center gap-1"
                >
                  {manager.isRebooting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Restarting...
                    </>
                  ) : (
                    'Restart Now'
                  )}
                </button>
              </div>
            )}

            {/* ---- Workflow context bar (if workflow loaded) ---------------- */}
            {workflowNodeTypes.length > 0 && (
              <div className="shrink-0 px-5 py-2 bg-accent/5 border-b border-accent/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-text" />
                  <span className="text-content-secondary">
                    Current workflow uses{' '}
                    <span className="text-accent-text">{workflowNodeTypes.length}</span> node types from{' '}
                    <span className="text-accent-text">{usedPacks.length}</span> custom pack(s)
                  </span>
                  {missingTypes.length > 0 && (
                    <span className="ml-2 text-state-warning">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      {missingTypes.length} unresolved type(s)
                    </span>
                  )}
                </div>
                {missingPackCount > 0 && (
                  <button
                    onClick={handleCopyAllMissing}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-accent/10 hover:bg-accent-muted text-accent-text text-[11px] border border-accent/20 transition-colors"
                  >
                    <Terminal className="w-3 h-3" />
                    Copy all install commands
                  </button>
                )}
              </div>
            )}

            {/* ---- Content area -------------------------------------------- */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {loading && packs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-content-secondary">
                  <Loader2 className="w-8 h-8 animate-spin text-accent-text" />
                  <div className="text-sm">Fetching custom node registry...</div>
                  <div className="text-[10px] text-content-faint">
                    Loading from github.com/ltdrdata/ComfyUI-Manager
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-content-secondary px-8">
                  <AlertTriangle className="w-8 h-8 text-state-warning" />
                  <div className="text-sm text-center text-state-warning">Failed to load registry</div>
                  <div className="text-xs text-center text-content-secondary max-w-md">{error}</div>
                  <button
                    onClick={() => loadRegistry(true)}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-sm bg-accent hover:bg-accent-hover text-accent-contrast text-xs transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="shrink-0 grid grid-cols-[1fr_120px_80px_70px_100px_70px] gap-2 px-5 py-2 bg-surface-secondary border-b border-border-default/60 text-[10px] text-content-secondary uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort('title')}
                      className="flex items-center gap-1 hover:text-content-secondary transition-colors text-left"
                    >
                      Title / Description <SortIcon field="title" />
                    </button>
                    <button
                      onClick={() => toggleSort('author')}
                      className="flex items-center gap-1 hover:text-content-secondary transition-colors"
                    >
                      Author <SortIcon field="author" />
                    </button>
                    <button
                      onClick={() => toggleSort('stars')}
                      className="flex items-center gap-1 hover:text-content-secondary transition-colors"
                    >
                      Stars <SortIcon field="stars" />
                    </button>
                    <button
                      onClick={() => toggleSort('nodeCount')}
                      className="flex items-center gap-1 hover:text-content-secondary transition-colors"
                    >
                      Nodes <SortIcon field="nodeCount" />
                    </button>
                    <button
                      onClick={() => toggleSort('lastUpdate')}
                      className="flex items-center gap-1 hover:text-content-secondary transition-colors"
                    >
                      Updated <SortIcon field="lastUpdate" />
                    </button>
                    <span />
                  </div>

                  {/* Results count */}
                  <div className="shrink-0 px-5 py-1.5 text-[10px] text-content-faint bg-surface-secondary">
                    {filteredPacks.length.toLocaleString()} pack(s)
                    {search && ` matching "${search}"`}
                    {loading && <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-accent-text" />}
                  </div>

                  {/* Table rows */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin" onScroll={handleRowsScroll}>
                    {filteredPacks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2 text-content-faint">
                        <Filter className="w-6 h-6" />
                        <p className="text-sm">No packs found</p>
                        <p className="text-xs">Try a different search or filter</p>
                      </div>
                    ) : (
                      visiblePacks.map((pack) => {
                        const isExpanded = expandedRow === pack.id;
                        const isUsedInWorkflow = usedPackIds.has(pack.id);
                        const isInstalled = installedPackIds.has(pack.id);
                        const packIsPinned = isPinned?.(pack.id) ?? false;
                        const status = manager.packStatuses.get(pack.reference);
                        const isActing = manager.activeAction?.reference === pack.reference;

                        return (
                          <div
                            key={pack.id}
                            className={`border-b border-border-subtle transition-colors ${
                              packIsPinned
                                ? 'bg-state-success-muted/50 hover:bg-state-success-muted border-l-2 border-l-state-success/30'
                                : isInstalled
                                ? 'bg-state-success-muted/40 hover:bg-state-success-muted/60'
                                : isUsedInWorkflow
                                ? 'bg-accent/[0.03] hover:bg-accent/[0.06]'
                                : 'hover:bg-surface-secondary/50'
                            }`}
                          >
                            {/* Main row */}
                            <div
                              className="grid grid-cols-[1fr_120px_80px_70px_100px_70px] gap-2 px-5 py-2.5 items-center cursor-pointer"
                              onClick={() => setExpandedRow(isExpanded ? null : pack.id)}
                            >
                              {/* Title + Description */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-content-secondary shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-content-secondary shrink-0" />
                                  )}
                                  <span className="text-xs text-content-primary truncate">
                                    {pack.title}
                                  </span>
                                  {packIsPinned && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-state-success-muted text-state-success border border-state-success/20">
                                      pinned
                                    </span>
                                  )}
                                  {isUsedInWorkflow && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-accent/15 text-accent-text border border-accent/20">
                                      in workflow
                                    </span>
                                  )}
                                  {isInstalled && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-state-success-muted text-state-success border border-state-success/20">
                                      installed
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-content-faint truncate ml-5 mt-0.5">
                                  {pack.description || 'No description available'}
                                </p>
                              </div>

                              {/* Author */}
                              <span className="text-[11px] text-content-secondary truncate">
                                {pack.author}
                              </span>

                              {/* Stars */}
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-state-warning/70" />
                                <span className="text-[11px] text-content-secondary">
                                  {formatStars(pack.stars)}
                                </span>
                              </div>

                              {/* Node count */}
                              <span className="text-[11px] text-content-secondary">
                                {pack.nodeCount > 0 ? pack.nodeCount : '-'}
                              </span>

                              {/* Last update */}
                              <span className="text-[10px] text-content-faint">
                                {formatDate(pack.lastUpdate)}
                              </span>

                              {/* Actions */}
                              <div className="group/pack-actions flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                {hasPinSupport && (
                                  <button
                                    onClick={() => handleTogglePin(pack)}
                                    className={`p-1 rounded transition-colors ${
                                      packIsPinned
                                        ? 'text-state-success hover:text-state-success hover:bg-state-success-muted'
                                        : 'text-content-faint hover:text-state-success hover:bg-surface-secondary'
                                    }`}
                                    title={packIsPinned ? 'Unpin from My Packs' : 'Pin to My Packs'}
                                  >
                                    {packIsPinned ? (
                                      <PinOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Pin className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                                <a
                                  href={pack.reference}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded text-content-faint hover:text-accent-text hover:bg-surface-secondary transition-colors"
                                  title="Open on GitHub"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                {isActing ? (
                                  <span className="p-1 text-accent-text" title="Processing...">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  </span>
                                ) : manager.managerAvailable && comfyuiUrl ? (
                                  <>
                                    {status === 'not-installed' && (
                                      <button
                                        onClick={() => handleInstall(pack)}
                                        className="px-2 py-0.5 text-[10px] rounded-sm border border-state-success/40 text-state-success hover:bg-state-success-muted transition-colors"
                                      >
                                        Install
                                      </button>
                                    )}
                                    {status === 'update-available' && (
                                      <button
                                        onClick={() => handleUpdate(pack)}
                                        className="px-2 py-0.5 text-[10px] rounded-sm border border-state-info/40 text-state-info hover:bg-state-info-muted transition-colors"
                                      >
                                        Update
                                      </button>
                                    )}
                                    {status === 'installed' && (
                                      <>
                                        <span className="px-2 py-0.5 text-[10px] rounded-sm border border-state-success/30 bg-state-success-muted text-state-success">
                                          Installed
                                        </span>
                                        <button
                                          onClick={() => handleUninstall(pack)}
                                          className="hidden group-hover/pack-actions:inline-flex px-2 py-0.5 text-[10px] rounded-sm border border-state-error/40 text-state-error hover:bg-state-error-muted transition-colors"
                                        >
                                          Uninstall
                                        </button>
                                      </>
                                    )}
                                  </>
                                ) : null}
                              </div>
                            </div>

                            {/* Expanded detail */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-3 pt-0 ml-5">
                                    {/* Install command + pin button */}
                                    <div className="flex items-center gap-2 mb-2.5">
                                      <code className="flex-1 text-[11px] text-state-success/80 font-mono bg-surface-inset rounded-sm px-3 py-1.5 border border-border-default">
                                        {pack.installCommand}
                                      </code>
                                      <button
                                        onClick={() => handleCopyInstall(pack)}
                                        className="flex items-center gap-1 px-2 py-1.5 rounded-sm bg-surface-elevated hover:bg-surface-secondary text-content-secondary text-[10px] border border-border-default transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                        Copy
                                      </button>
                                      {hasPinSupport && (
                                        <button
                                          onClick={() => handleTogglePin(pack)}
                                          className={`flex items-center gap-1 px-2 py-1.5 rounded-sm text-[10px] border transition-colors ${
                                            packIsPinned
                                              ? 'bg-state-success-muted hover:bg-state-success-muted text-state-success border-state-success/20'
                                              : 'bg-surface-elevated hover:bg-surface-secondary text-content-secondary border-border-default'
                                          }`}
                                        >
                                          {packIsPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                          {packIsPinned ? 'Unpin' : 'Pin'}
                                        </button>
                                      )}
                                      <a
                                        href={pack.reference}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2 py-1.5 rounded-sm bg-surface-elevated hover:bg-surface-secondary text-content-secondary text-[10px] border border-border-default transition-colors"
                                      >
                                        <Globe className="w-3 h-3" />
                                        GitHub
                                      </a>
                                      {manager.managerAvailable && comfyuiUrl && (
                                        <>
                                          {manager.activeAction?.reference === pack.reference ? (
                                            <span className="flex items-center gap-1 px-2 py-1.5 rounded-sm bg-accent/10 text-accent-text text-[10px] border border-accent/20">
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                              Working...
                                            </span>
                                          ) : status === 'not-installed' ? (
                                            <button
                                              onClick={() => handleInstall(pack)}
                                              className="flex items-center gap-1 px-2 py-1.5 rounded-sm text-[10px] border border-state-success/40 text-state-success hover:bg-state-success-muted transition-colors"
                                            >
                                              Install
                                            </button>
                                          ) : status === 'update-available' ? (
                                            <button
                                              onClick={() => handleUpdate(pack)}
                                              className="flex items-center gap-1 px-2 py-1.5 rounded-sm text-[10px] border border-state-info/40 text-state-info hover:bg-state-info-muted transition-colors"
                                            >
                                              Update
                                            </button>
                                          ) : status === 'installed' ? (
                                            <button
                                              onClick={() => handleUninstall(pack)}
                                              className="flex items-center gap-1 px-2 py-1.5 rounded-sm text-[10px] border border-state-error/40 text-state-error hover:bg-state-error-muted transition-colors"
                                            >
                                              Uninstall
                                            </button>
                                          ) : null}
                                        </>
                                      )}
                                    </div>

                                    {/* Description */}
                                    {pack.description && (
                                      <p className="text-[11px] text-content-secondary mb-2.5 leading-relaxed">
                                        {pack.description}
                                      </p>
                                    )}

                                    {/* Node names */}
                                    {pack.nodeCount > 0 ? (
                                      <div>
                                        <div className="text-[10px] text-content-secondary mb-1.5 flex items-center gap-1">
                                          <Package className="w-3 h-3" />
                                          {pack.nodeCount} node class{pack.nodeCount !== 1 ? 'es' : ''} provided:
                                        </div>
                                        <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto scrollbar-thin">
                                          {pack.nodeNames.map((name) => {
                                            const isInWorkflow =
                                              workflowNodeTypes.includes(name);
                                            return (
                                              <span
                                                key={name}
                                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                                  isInWorkflow
                                                    ? 'bg-accent/15 text-accent-text border border-accent/25'
                                                    : 'bg-surface-elevated/60 text-content-secondary border border-border-default/40'
                                                }`}
                                                title={
                                                  isInWorkflow ? 'Used in current workflow' : ''
                                                }
                                              >
                                                {name}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-content-faint italic">
                                        Node mapping not available for this pack.
                                      </p>
                                    )}

                                    {/* Pack metadata */}
                                    <div className="flex items-center gap-4 mt-2.5 text-[10px] text-content-faint">
                                      <span>Install: {pack.installType}</span>
                                      {pack.stars > 0 && (
                                        <span className="flex items-center gap-0.5">
                                          <Star className="w-2.5 h-2.5" /> {pack.stars.toLocaleString()} stars
                                        </span>
                                      )}
                                      {pack.lastUpdate && (
                                        <span>Updated: {formatDate(pack.lastUpdate)}</span>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                    {filteredPacks.length > visiblePacks.length && (
                      <div className="px-5 py-3 text-center text-[10px] text-content-secondary">
                        Showing {visiblePacks.length} of {filteredPacks.length} packs. Scroll to load more.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ---- Footer (missing types) ---------------------------------- */}
            {missingTypes.length > 0 && (
              <div className="shrink-0 px-5 py-2.5 bg-state-warning-muted border-t border-state-warning/20">
                <div className="flex items-center gap-2 text-xs text-state-warning mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{missingTypes.length} node type(s) not found in any registered pack:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {missingTypes.slice(0, 20).map((t) => (
                    <span
                      key={t}
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-state-warning-muted text-state-warning/80 border border-state-warning/20"
                    >
                      {t}
                    </span>
                  ))}
                  {missingTypes.length > 20 && (
                    <span className="text-[10px] text-state-warning/60">
                      +{missingTypes.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}




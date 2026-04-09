/**
 * MyPacksPanel - "My Packs" tab content for ProviderConfig.
 *
 * Shows pinned packs, mode toggle, token estimate, management actions,
 * and per-pack "Learn Nodes" buttons that fetch schemas from GitHub via AI.
 */

import { useState } from 'react';
import {
  Package,
  X,
  Lock,
  Compass,
  Trash2,
  Download,
  Upload,
  Search,
  Info,
  Zap,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Brain,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PinnedNodePack, LibraryMode } from '../../../hooks/useNodeLibrary';
import { estimatePacksTokens } from '../../../services/pack-suggester';
import { getLiveNodeCache } from '../../../services/comfyui-backend';

interface MyPacksPanelProps {
  pinnedPacks: PinnedNodePack[];
  mode: LibraryMode;
  onUnpin: (packId: string) => void;
  onToggleMode: () => void;
  onClearAll: () => void;
  onOpenBrowser: () => void;
  onExportLibrary: () => string;
  onImportLibrary: (json: string) => boolean;
  // Learn Nodes feature
  learnedPackIds: Set<string>;
  learningPackId: string | null;
  learningProgress: string;
  onLearnPack: (packId: string, packTitle: string, reference: string) => void;
  onClearLearnedSchemas: (packId: string) => void;
  learnedNodeCounts: Map<string, number>;
  hasApiKey: boolean;
  liveNodeCount?: number;
}

export function MyPacksPanel({
  pinnedPacks,
  mode,
  onUnpin,
  onToggleMode,
  onClearAll,
  onOpenBrowser,
  onExportLibrary,
  onImportLibrary,
  learnedPackIds,
  learningPackId,
  learningProgress,
  onLearnPack,
  onClearLearnedSchemas,
  learnedNodeCounts,
  hasApiKey,
  liveNodeCount = 0,
}: MyPacksPanelProps) {
  void liveNodeCount; // trigger re-render when live sync count changes
  const tokenEstimate = estimatePacksTokens(pinnedPacks);
  const [expandedLearnInfo, setExpandedLearnInfo] = useState<string | null>(null);
  const liveCache = getLiveNodeCache();

  const handleExport = () => {
    const json = onExportLibrary();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-comfyui-packs.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Library exported');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const success = onImportLibrary(reader.result as string);
        if (success) {
          toast.success('Library imported');
        } else {
          toast.error('Invalid library file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const learnedCount = pinnedPacks.filter((p) => learnedPackIds.has(p.id)).length;

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div>
        <label className="text-[10px] text-content-muted uppercase tracking-wider mb-1.5 block">
          AI Node Scope
        </label>
        <button
          onClick={onToggleMode}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
            mode === 'my-packs'
              ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
              : 'bg-accent-muted border-accent/20 hover:bg-accent-muted/80'
          }`}
        >
          {mode === 'my-packs' ? (
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <Compass className="w-3.5 h-3.5 text-accent-text shrink-0" />
          )}
          <div className="text-left flex-1 min-w-0">
            <div className={`text-xs ${mode === 'my-packs' ? 'text-amber-300' : 'text-accent-text'}`}>
              {mode === 'my-packs' ? 'My Packs Only' : 'Discover Mode'}
            </div>
            <div className="text-[10px] text-content-faint mt-0.5">
              {mode === 'my-packs'
                ? 'AI uses ONLY your pinned packs + core nodes'
                : 'AI may suggest packs beyond your library'}
            </div>
          </div>
        </button>
      </div>

      {/* Pinned packs list */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-content-muted uppercase tracking-wider">
            Pinned Packs ({pinnedPacks.length})
            {learnedCount > 0 && (
              <span className="ml-1.5 text-emerald-500">
                {' '} - {learnedCount} learned
              </span>
            )}
          </span>
          {pinnedPacks.length > 0 && (
            <span className="text-[9px] text-content-faint">
              ~{tokenEstimate.toLocaleString()} tokens in prompt
            </span>
          )}
        </div>

        {pinnedPacks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-5 px-3 rounded-lg bg-surface-elevated/20 border border-border-default/40">
            <Package className="w-5 h-5 text-content-faint" />
            <p className="text-[11px] text-content-faint text-center">
              No packs pinned yet
            </p>
            <p className="text-[10px] text-content-faint text-center">
              Browse and pin packs so the AI knows what custom nodes you have installed.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {pinnedPacks.map((pack) => {
              const isLearned = learnedPackIds.has(pack.id);
              const isLearning = learningPackId === pack.id;
              const learnedNodes = learnedNodeCounts.get(pack.id) || 0;
              const isInfoExpanded = expandedLearnInfo === pack.id;
              const liveNodesInPack = liveCache
                ? pack.nodeNames.filter((name) => !!liveCache.nodes[name]).length
                : 0;
              const hasLiveCoverage = liveNodesInPack > 0;
              const liveCoveragePercent = pack.nodeNames.length > 0
                ? Math.round((liveNodesInPack / pack.nodeNames.length) * 100)
                : 0;

              return (
                <div
                  key={pack.id}
                  className="rounded-lg group hover:bg-surface-elevated/40 transition-colors"
                >
                  {/* Main pack row */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-content-primary truncate">{pack.title}</span>
                        {isLearned && (
                          <span
                            className="shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/25 transition-colors"
                            onClick={() => setExpandedLearnInfo(isInfoExpanded ? null : pack.id)}
                            title={`${learnedNodes} node schemas learned - click for details`}
                          >
                            <Brain className="w-2.5 h-2.5" />
                            {learnedNodes}
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-content-faint">
                        {pack.nodeCount} nodes - {pack.author}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Live sync indicator or Learn Nodes controls */}
                      {hasLiveCoverage && liveCoveragePercent >= 50 ? (
                        <span
                          className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                          title={`${liveNodesInPack}/${pack.nodeNames.length} nodes synced from ComfyUI - AI has full schemas`}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          Live {liveCoveragePercent}%
                        </span>
                      ) : isLearning ? (
                        <div className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] text-accent-text bg-accent-muted">
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </div>
                      ) : isLearned ? (
                        <button
                          onClick={() => onLearnPack(pack.id, pack.title, pack.reference)}
                          className="shrink-0 p-1 rounded text-emerald-600 hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="Re-learn nodes (refresh schemas from GitHub)"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!hasApiKey) {
                              toast.error('Set up an API key first - the AI is needed to parse node schemas');
                              return;
                            }
                            onLearnPack(pack.id, pack.title, pack.reference);
                          }}
                          className="shrink-0 flex items-center gap-0.5 px-1.5 py-1 rounded text-[9px] text-accent-text bg-accent-muted hover:bg-accent-muted/80 border border-accent/20 hover:border-accent/30 transition-all opacity-70 group-hover:opacity-100"
                          title="Fetch node schemas from GitHub using AI (~$0.01-0.05)"
                        >
                          <Zap className="w-2.5 h-2.5" />
                          Learn
                        </button>
                      )}

                      {/* Unpin button */}
                      <button
                        onClick={() => onUnpin(pack.id)}
                        className="shrink-0 p-1 rounded text-content-faint hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Unpin"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Learning progress indicator */}
                  {isLearning && learningProgress && (
                    <div className="px-2.5 pb-1.5">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent-muted border border-accent/20">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-accent-text shrink-0" />
                        <span className="text-[9px] text-accent-text truncate">{learningProgress}</span>
                      </div>
                    </div>
                  )}

                  {/* Learned schemas info (expandable) */}
                  {isInfoExpanded && isLearned && (
                    <div className="px-2.5 pb-1.5">
                      <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-emerald-400">
                            <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />
                            {learnedNodes} node schemas learned
                          </span>
                          <button
                            onClick={() => {
                              onClearLearnedSchemas(pack.id);
                              setExpandedLearnInfo(null);
                              toast.success('Learned schemas cleared');
                            }}
                            className="text-[8px] text-content-faint hover:text-red-400 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        <p className="text-[9px] text-content-faint">
                          AI has full input/output specs for this pack.
                          Workflows using these nodes will have correct types and connections.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Learn All button when there are unlearned packs */}
      {pinnedPacks.length > 0 && learnedCount < pinnedPacks.length && hasApiKey && !liveCache && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const unlearned = pinnedPacks.find((p) => !learnedPackIds.has(p.id));
              if (unlearned && !learningPackId) {
                onLearnPack(unlearned.id, unlearned.title, unlearned.reference);
              }
            }}
            disabled={!!learningPackId}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent-muted hover:bg-accent-muted/80 disabled:opacity-40 text-accent-text text-xs border border-accent/20 transition-colors"
          >
            {learningPackId ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Learning...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Learn Next ({pinnedPacks.length - learnedCount} remaining)
              </>
            )}
          </button>
        </div>
      )}

      {/* No API key warning */}
      {pinnedPacks.length > 0 && !hasApiKey && !liveCache && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400/80">
            Set up an API key in the Keys tab to use "Learn Nodes." It uses your AI to parse node schemas from GitHub source code.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenBrowser}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 text-xs border border-emerald-500/20 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          Browse and Pin
        </button>
      </div>

      {/* Export / Import / Clear */}
      {pinnedPacks.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border-default">
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-surface-elevated/50 hover:bg-surface-elevated text-content-muted hover:text-content-secondary text-[10px] border border-border-strong/50 transition-colors"
            title="Export pinned packs list"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-surface-elevated/50 hover:bg-surface-elevated text-content-muted hover:text-content-secondary text-[10px] border border-border-strong/50 transition-colors"
            title="Import pinned packs list"
          >
            <Upload className="w-3 h-3" />
            Import
          </button>
          <div className="flex-1" />
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-surface-elevated/50 hover:bg-red-500/10 text-content-faint hover:text-red-400 text-[10px] border border-border-strong/50 hover:border-red-500/20 transition-colors"
            title="Clear all pinned packs"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-elevated/30 border border-border-default/50">
        <Info className="w-3.5 h-3.5 text-content-faint shrink-0 mt-0.5" />
        <p className="text-[10px] text-content-faint">
          {liveCache
            ? 'ComfyUI is connected - the AI automatically has full node schemas for all pinned packs via /object_info. No "Learn" step needed.'
            : mode === 'my-packs'
            ? 'In "My Packs Only" mode, the AI will only generate workflows using nodes from your pinned packs and core ComfyUI nodes. Use "Learn Nodes" to give the AI full schema knowledge for each pack.'
            : 'In "Discover" mode, the AI may suggest packs beyond your pinned library. Pin packs you use often and click "Learn" for best results.'}
        </p>
      </div>
    </div>
  );
}

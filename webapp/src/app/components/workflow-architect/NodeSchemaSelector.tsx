import { Suspense, lazy, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react';
import type { InstalledModels } from '@/services/comfyui-backend';
import type { ModelPreset } from '@/hooks/useModelLibrary';
import {
  createDefaultSelectorState,
  countSelectedNodesForPack,
  estimateSchemaTokens,
  type ClassifiedPack,
  type SelectorState,
  type SchemaMode,
} from '@/services/node-schema-selector';
import { formatTokenCount } from '@/services/token-estimator';
import { ModelLibraryPanel } from './ModelLibraryPanel';

const ComfyUIWorkflowFolderPanel = lazy(() =>
  import('./ComfyUIWorkflowFolderPanel').then((mod) => ({ default: mod.ComfyUIWorkflowFolderPanel })),
);

interface NodeSchemaSelectorProps {
  state: SelectorState;
  packs: ClassifiedPack[];
  onChange: (next: SelectorState) => void;
  isStale?: boolean;
  layout?: 'dropdown' | 'panel';
  modelInventory?: InstalledModels | null;
  modelCategories?: string[];
  modelSelectedCategories?: Set<string>;
  modelActivePreset?: ModelPreset;
  modelCategoryTokens?: Record<string, number>;
  modelLibraryTokens?: number;
  modelLibraryFiles?: number;
  modelLibraryLoading?: boolean;
  onApplyModelPreset?: (preset: Exclude<ModelPreset, 'custom'>) => void;
  onToggleModelCategory?: (category: string, selected: boolean) => void;
  onResetModelCategories?: () => void;
  onMentionModel?: (filename: string, categoryLabel: string) => void;
  comfyuiUrl?: string;
  onLoadWorkflowPath?: (path: string) => Promise<boolean> | boolean;
  onSendWorkflowToChat?: (workflowName: string) => void;
}

type SelectorTab = 'packs' | 'models' | 'workflows';

function nextState(base: SelectorState, updater: (draft: SelectorState) => void): SelectorState {
  const draft: SelectorState = {
    ...base,
    packs: { ...base.packs },
    lastUpdated: Date.now(),
  };
  updater(draft);
  return draft;
}

export function NodeSchemaSelector({
  state,
  packs,
  onChange,
  isStale = false,
  layout = 'dropdown',
  modelInventory,
  modelCategories = [],
  modelSelectedCategories = new Set<string>(),
  modelActivePreset = 'custom',
  modelCategoryTokens = {},
  modelLibraryTokens = 0,
  modelLibraryFiles = 0,
  modelLibraryLoading = false,
  onApplyModelPreset,
  onToggleModelCategory,
  onResetModelCategories,
  onMentionModel,
  comfyuiUrl,
  onLoadWorkflowPath,
  onSendWorkflowToChat,
}: NodeSchemaSelectorProps) {
  const [activeTab, setActiveTab] = useState<SelectorTab>('packs');
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [packSearch, setPackSearch] = useState<Record<string, string>>({});
  const isPanel = layout === 'panel';

  const totalSchemaTokens = useMemo(
    () => estimateSchemaTokens(state, packs),
    [state, packs],
  );

  const setMode = (mode: SchemaMode) => {
    onChange(nextState(state, (draft) => {
      draft.mode = mode;
    }));
  };

  const setPackEnabled = (packId: string, enabled: boolean, selectAllNodes = true) => {
    onChange(nextState(state, (draft) => {
      draft.packs[packId] = {
        enabled,
        selectedNodes: enabled
          ? (selectAllNodes ? null : (draft.packs[packId]?.selectedNodes || []))
          : [],
      };
    }));
  };

  const setNodeEnabled = (pack: ClassifiedPack, nodeName: string, enabled: boolean) => {
    onChange(nextState(state, (draft) => {
      const prev = draft.packs[pack.id] || { enabled: true, selectedNodes: null as string[] | null };
      let selectedNodes: string[] | null = prev.selectedNodes;
      let packEnabled = prev.enabled;

      if (selectedNodes === null) {
        if (!enabled) {
          selectedNodes = pack.nodeNames.filter((name) => name !== nodeName);
          packEnabled = selectedNodes.length > 0;
        }
      } else {
        const set = new Set(selectedNodes);
        if (enabled) set.add(nodeName);
        else set.delete(nodeName);
        const next = [...set].sort((a, b) => a.localeCompare(b));
        if (next.length === 0) {
          selectedNodes = [];
          packEnabled = false;
        } else if (next.length === pack.nodeCount) {
          selectedNodes = null;
          packEnabled = true;
        } else {
          selectedNodes = next;
          packEnabled = true;
        }
      }

      draft.packs[pack.id] = {
        enabled: packEnabled,
        selectedNodes,
      };
    }));
  };

  const setPackNodesAll = (pack: ClassifiedPack, enabled: boolean) => {
    onChange(nextState(state, (draft) => {
      draft.packs[pack.id] = {
        enabled,
        selectedNodes: enabled ? null : [],
      };
    }));
  };

  const handleSelectAll = () => {
    onChange(nextState(state, (draft) => {
      for (const pack of packs) {
        draft.packs[pack.id] = { enabled: true, selectedNodes: null };
      }
    }));
  };

  const handleDeselectAll = () => {
    onChange(nextState(state, (draft) => {
      for (const pack of packs) {
        draft.packs[pack.id] = { enabled: false, selectedNodes: [] };
      }
    }));
  };

  const handleReset = () => {
    const reset = createDefaultSelectorState();
    onChange({ ...reset, mode: state.mode });
  };

  const toggleExpanded = (packId: string) => {
    setExpandedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) next.delete(packId);
      else next.add(packId);
      return next;
    });
  };

  return (
    <div className={isPanel ? 'h-full min-h-0 flex flex-col rounded-none border-0 bg-transparent p-0' : 'mb-3 rounded-lg border border-border-default bg-surface-secondary/40 p-2'}>
      <div className={isPanel ? 'mb-2 flex shrink-0 gap-1.5 px-2 pt-2' : 'mb-2 flex gap-1.5'}>
        <button
          onClick={() => setActiveTab('packs')}
          className={`rounded-md border px-2.5 py-1 text-[10px] ${
            activeTab === 'packs'
              ? 'border-accent/40 bg-accent-muted text-accent-text'
              : 'border-border-default text-content-muted hover:border-border-strong hover:text-content-primary'
          }`}
        >
          Node Packs
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`rounded-md border px-2.5 py-1 text-[10px] ${
            activeTab === 'models'
              ? 'border-accent/40 bg-accent-muted text-accent-text'
              : 'border-border-default text-content-muted hover:border-border-strong hover:text-content-primary'
          }`}
        >
          Models
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`rounded-md border px-2.5 py-1 text-[10px] ${
            activeTab === 'workflows'
              ? 'border-accent/40 bg-accent-muted text-accent-text'
              : 'border-border-default text-content-muted hover:border-border-strong hover:text-content-primary'
          }`}
        >
          Workflows
        </button>
      </div>

      {activeTab === 'packs' && (
        <>
          <div className={isPanel ? 'mx-2 mb-2 shrink-0 rounded-lg border border-border-default bg-surface-inset p-2' : 'mb-2 rounded-lg border border-border-default bg-surface-inset p-2'}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] text-content-muted uppercase tracking-wider">Mode</div>
              <div className="text-[10px] text-content-primary">
                Schema tokens: <span className="tabular-nums">{formatTokenCount(totalSchemaTokens)}</span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {(['full', 'compact', 'off'] as SchemaMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMode(mode)}
                  className={`rounded border px-2 py-1 text-[10px] capitalize ${
                    state.mode === mode
                      ? 'border-accent/40 bg-accent text-accent-contrast'
                      : 'border-border-default text-content-muted hover:border-border-strong hover:text-content-primary'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            {isStale && (
              <div className="mt-1 text-[10px] text-state-warning">
                Changes will apply on next message.
              </div>
            )}
          </div>

          <div className={isPanel ? 'mx-2 mb-2 flex shrink-0 items-center gap-2 text-[10px]' : 'mb-2 flex items-center gap-2 text-[10px]'}>
            <button
              onClick={handleSelectAll}
              className="rounded border border-border-default bg-surface-secondary px-2 py-1 text-content-primary hover:bg-surface-elevated"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="rounded border border-border-default bg-surface-secondary px-2 py-1 text-content-primary hover:bg-surface-elevated"
            >
              Deselect All
            </button>
            <button
              onClick={handleReset}
              className="rounded border border-border-default bg-surface-secondary px-2 py-1 text-accent-text hover:bg-surface-elevated hover:border-accent/30"
            >
              Reset
            </button>
          </div>

          <div className={isPanel ? 'min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2' : 'max-h-64 space-y-1 overflow-y-auto pr-1'}>
            {packs.length === 0 && (
              <div className="rounded-lg border border-border-default bg-surface-inset px-3 py-2 text-[10px] text-content-muted">
                No node packs loaded yet. Click <span className="text-content-primary">Sync Nodes from ComfyUI</span> in the backend panel.
              </div>
            )}
            {packs.map((pack) => {
              const expanded = expandedPacks.has(pack.id);
              const selectedCount = countSelectedNodesForPack(state, pack);
              const packEnabled = selectedCount > 0;
              const partial = packEnabled && selectedCount < pack.nodeCount;
              const tokensPerNode = state.mode === 'full'
                ? (pack.estimatedTokensFull / Math.max(pack.nodeCount, 1))
                : (pack.estimatedTokensCompact / Math.max(pack.nodeCount, 1));
              const packTokenEstimate = Math.round(selectedCount * tokensPerNode);
              const nodeFilter = (packSearch[pack.id] || '').toLowerCase();
              const filteredNodes = nodeFilter
                ? pack.nodeNames.filter((name) => name.toLowerCase().includes(nodeFilter))
                : pack.nodeNames;

              return (
                <div key={pack.id} className="rounded-lg border border-border-default bg-surface-secondary/70">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={packEnabled}
                      ref={(el) => {
                        if (el) el.indeterminate = partial;
                      }}
                      onChange={(event) => setPackEnabled(pack.id, event.target.checked, true)}
                      className="h-3 w-3 rounded border-border-default bg-surface-elevated accent-accent"
                    />
                    <button
                      onClick={() => toggleExpanded(pack.id)}
                      className="text-content-faint hover:text-content-secondary"
                      title={expanded ? 'Collapse' : 'Expand'}
                    >
                      {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-content-primary">{pack.title}</div>
                      <div className="text-[9px] text-content-faint">
                        {partial ? `${selectedCount}/${pack.nodeCount} nodes selected` : `${pack.nodeCount} nodes`}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-content-muted">
                      <div className="tabular-nums">{formatTokenCount(packTokenEstimate)}</div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-border-default px-2 py-1.5 bg-surface-primary/70">
                      <div className="mb-1.5 flex items-center gap-1">
                        <Search className="h-3 w-3 text-content-faint" />
                        <input
                          type="text"
                          value={packSearch[pack.id] || ''}
                          onChange={(event) => {
                            const next = { ...packSearch };
                            next[pack.id] = event.target.value;
                            setPackSearch(next);
                          }}
                          placeholder="Filter nodes..."
                          className="w-full rounded border border-border-default bg-surface-inset px-2 py-1 text-[10px] text-content-primary focus:border-accent/50 focus:outline-none"
                        />
                      </div>

                      <div className="mb-1.5 flex gap-1 text-[10px]">
                        <button
                          onClick={() => setPackNodesAll(pack, true)}
                          className="rounded border border-border-default px-1.5 py-0.5 text-content-primary hover:bg-surface-secondary"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setPackNodesAll(pack, false)}
                          className="rounded border border-border-default px-1.5 py-0.5 text-content-primary hover:bg-surface-secondary"
                        >
                          Deselect All
                        </button>
                      </div>

                      <div className="max-h-40 space-y-0.5 overflow-y-auto pr-1">
                        {filteredNodes.map((nodeName) => {
                          const nodeSelected = state.packs[pack.id]?.selectedNodes === null
                            ? state.packs[pack.id]?.enabled !== false
                            : (state.packs[pack.id]?.enabled
                              ? (state.packs[pack.id]?.selectedNodes || []).includes(nodeName)
                              : false);

                          return (
                            <label key={nodeName} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-surface-secondary">
                              <input
                                type="checkbox"
                                checked={nodeSelected}
                                onChange={(event) => setNodeEnabled(pack, nodeName, event.target.checked)}
                                className="h-3 w-3 rounded border-border-default bg-surface-elevated accent-accent"
                              />
                              <span className="truncate text-[10px] text-content-primary">{nodeName}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'models' && modelInventory && modelCategories.length > 0 && onApplyModelPreset && onToggleModelCategory && onResetModelCategories && (
        <div className={isPanel ? 'min-h-0 flex-1 flex flex-col overflow-hidden' : ''}>
          <ModelLibraryPanel
            inventory={modelInventory}
            allCategories={modelCategories}
            selectedCategories={modelSelectedCategories}
            activePreset={modelActivePreset}
            categoryTokens={modelCategoryTokens}
            totalTokens={modelLibraryTokens}
            totalFiles={modelLibraryFiles}
            isLoading={modelLibraryLoading}
            onApplyPreset={onApplyModelPreset}
            onToggleCategory={onToggleModelCategory}
            onResetSelection={onResetModelCategories}
            onMentionModel={onMentionModel}
            layout={isPanel ? 'panel' : 'dropdown'}
          />
        </div>
      )}

      {activeTab === 'workflows' && (
        <div className={isPanel ? 'min-h-0 flex-1 overflow-hidden' : 'max-h-64 overflow-hidden'}>
          <Suspense fallback={
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-content-faint">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          }>
            <ComfyUIWorkflowFolderPanel
              comfyuiUrl={comfyuiUrl}
              onLoadWorkflowPath={onLoadWorkflowPath}
              onSendToChat={onSendWorkflowToChat}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}


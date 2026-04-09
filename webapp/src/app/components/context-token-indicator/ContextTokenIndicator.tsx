import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { CustomModel } from '@/types/comfyui';
import {
  estimateContextUsage,
  estimateJsonTokens,
  formatTokenCount,
} from '@/services/token-estimator';
import type { InstalledModels } from '@/services/comfyui-backend';
import {
  classifyNodesByPack,
  compressSchemas,
  FILTER_PRESETS,
  filterNodeSchemas,
  inferPresetId,
  presetToConfig,
  resolveModelContextLimit,
  type FilterConfig,
  type FilterPresetId,
} from '@/services/node-schema-filter';
import type { ModelPreset } from '@/hooks/useModelLibrary';

interface PackBreakdownEntry {
  packId: string;
  packName: string;
  rawTokens: number;
  compressedTokens: number;
  effectiveTokens: number;
  nodeCount: number;
  included: boolean;
  autoIncluded: boolean;
  manuallyAdded: boolean;
  manuallyRemoved: boolean;
  category: 'core' | 'popular' | 'custom' | 'unknown';
}

interface ContextTokenIndicatorProps {
  systemPrompt?: string;
  workflowJson?: unknown;
  workflowMetadata?: string;
  nodeSchemas?: unknown;
  allNodeSchemas?: Record<string, unknown> | null;
  conversationHistory?: string[];
  selectedModelId?: string;
  selectedModelName?: string;
  selectedModelProvider?: string;
  customModels?: CustomModel[];
  onFilterConfigChange?: (config: FilterConfig) => void;
  currentFilterConfig?: FilterConfig;
  currentWorkflow?: unknown;
  manualPackAdditions?: string[];
  manualPackRemovals?: string[];
  onManualPackOverridesChange?: (
    manuallyAdded: string[],
    manuallyRemoved: string[],
    mode: FilterPresetId,
  ) => void;
  onResetManualPackOverrides?: (mode: FilterPresetId) => void;
  onEnhanceWithPack?: (pack: { packId: string; packName: string; nodeCount: number }) => void;
  modelLibraryPrompt?: string;
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
  onToggleSchemaDrawer?: () => void;
  schemaDrawerOpen?: boolean;
}

export function ContextTokenIndicator({
  systemPrompt,
  workflowJson,
  workflowMetadata,
  nodeSchemas,
  allNodeSchemas,
  conversationHistory,
  selectedModelId,
  selectedModelName,
  selectedModelProvider,
  customModels,
  onFilterConfigChange,
  currentFilterConfig,
  currentWorkflow,
  manualPackAdditions = [],
  manualPackRemovals = [],
  onManualPackOverridesChange,
  onResetManualPackOverrides,
  onEnhanceWithPack,
  modelLibraryPrompt,
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
  onToggleSchemaDrawer,
  schemaDrawerOpen = false,
}: ContextTokenIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [compressionEnabled, setCompressionEnabled] = useState(currentFilterConfig?.compressSchemas ?? true);

  useEffect(() => {
    setCompressionEnabled(currentFilterConfig?.compressSchemas ?? true);
  }, [currentFilterConfig?.compressSchemas]);

  const modelContext = useMemo(
    () => resolveModelContextLimit(selectedModelId || '', selectedModelProvider, customModels),
    [selectedModelId, selectedModelProvider, customModels],
  );

  const currentPresetId = useMemo<FilterPresetId>(() => {
    if (!currentFilterConfig) return 'workflow-smart';
    return inferPresetId(currentFilterConfig);
  }, [currentFilterConfig]);

  const packBreakdown = useMemo<PackBreakdownEntry[]>(() => {
    if (!allNodeSchemas || !currentFilterConfig) return [];

    const packs = classifyNodesByPack(allNodeSchemas as Record<string, any>);
    const currentResult = filterNodeSchemas(
      allNodeSchemas as Record<string, any>,
      currentFilterConfig,
      currentWorkflow as any,
    );
    const currentIncludedTypes = new Set(Object.keys(currentResult.filteredSchemas || {}));

    const baseConfig: FilterConfig = {
      ...currentFilterConfig,
      manualPackAdditions: new Set<string>(),
      manualPackRemovals: new Set<string>(),
    };
    const baseResult = filterNodeSchemas(
      allNodeSchemas as Record<string, any>,
      baseConfig,
      currentWorkflow as any,
    );
    const baseIncludedTypes = new Set(Object.keys(baseResult.filteredSchemas || {}));

    const manualAddedSet = new Set(manualPackAdditions);
    const manualRemovedSet = new Set(manualPackRemovals);

    return [...packs.values()]
      .map((pack) => {
        const packSchemas: Record<string, unknown> = {};
        for (const classType of pack.nodeClassTypes) {
          const schema = allNodeSchemas[classType];
          if (schema) packSchemas[classType] = schema;
        }

        const compressedTokens = estimateJsonTokens(compressSchemas(packSchemas as Record<string, any>));
        const effectiveTokens = currentFilterConfig.compressSchemas ? compressedTokens : pack.estimatedTokens;

        return {
          packId: pack.id,
          packName: pack.displayName,
          rawTokens: pack.estimatedTokens,
          compressedTokens,
          effectiveTokens,
          nodeCount: pack.nodeCount,
          included: pack.nodeClassTypes.some((classType) => currentIncludedTypes.has(classType)),
          autoIncluded: pack.nodeClassTypes.some((classType) => baseIncludedTypes.has(classType)),
          manuallyAdded: manualAddedSet.has(pack.id),
          manuallyRemoved: manualRemovedSet.has(pack.id),
          category: pack.category,
        };
      })
      .sort((left, right) => right.compressedTokens - left.compressedTokens);
  }, [allNodeSchemas, currentFilterConfig, currentWorkflow, manualPackAdditions, manualPackRemovals]);

  const schemaBudgetUsed = useMemo(
    () => packBreakdown.filter((pack) => pack.included).reduce((sum, pack) => sum + pack.effectiveTokens, 0),
    [packBreakdown],
  );

  const estimate = useMemo(() => estimateContextUsage({
    systemPrompt,
    workflowJson,
    workflowMetadata,
    nodeSchemas,
    modelLibraryPrompt,
    conversationHistory,
    selectedModel: selectedModelId,
    modelLimitOverride: modelContext.contextLimit,
  }), [
    systemPrompt,
    workflowJson,
    workflowMetadata,
    nodeSchemas,
    modelLibraryPrompt,
    conversationHistory,
    selectedModelId,
    modelContext.contextLimit,
  ]);

  const largeIncludedPacks = useMemo(
    () => packBreakdown.filter((pack) => pack.included && pack.effectiveTokens >= 10_000 && pack.category !== 'core'),
    [packBreakdown],
  );

  const statusColors = {
    ok: { bar: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/10' },
    warning: { bar: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    critical: { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' },
  } as const;
  const totalUsageRatio = estimate.modelLimit > 0 ? (estimate.total / estimate.modelLimit) : 0;
  const totalUsagePercent = Math.round(totalUsageRatio * 100);
  const totalStatus: keyof typeof statusColors = totalUsageRatio >= 0.9 ? 'critical' : totalUsageRatio >= 0.7 ? 'warning' : 'ok';
  const colors = statusColors[totalStatus];
  const totalStatusMessage = totalUsageRatio > 1
    ? `${formatTokenCount(estimate.total)} tokens - exceeds ${selectedModelName || selectedModelId || 'model'} context (${formatTokenCount(estimate.modelLimit)})`
    : totalUsageRatio >= 0.9
      ? 'Context is near model limit - consider compressing schemas or reducing packs.'
      : totalUsageRatio >= 0.7
        ? 'Context is getting full - consider compressing schemas or reducing packs.'
        : 'Plenty of context space remaining.';

  const handlePreset = (presetId: FilterPresetId) => {
    if (!currentFilterConfig || !onFilterConfigChange) return;

    const preset = FILTER_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;

    const next = presetToConfig(preset, currentFilterConfig.selectedPackIds);
    next.manualPackAdditions = new Set(currentFilterConfig.manualPackAdditions);
    next.manualPackRemovals = new Set(currentFilterConfig.manualPackRemovals);

    onFilterConfigChange(next);
    onManualPackOverridesChange?.(manualPackAdditions, manualPackRemovals, presetId);
  };

  const persistManualOverrides = (
    nextAdded: string[],
    nextRemoved: string[],
    nextConfig?: FilterConfig,
  ) => {
    const mode = nextConfig ? inferPresetId(nextConfig) : currentPresetId;
    onManualPackOverridesChange?.(nextAdded, nextRemoved, mode);
  };

  const handlePackToggle = (
    pack: PackBreakdownEntry,
    checked: boolean,
    options?: { suppressToast?: boolean },
  ) => {
    if (!currentFilterConfig || !onFilterConfigChange) return;

    const added = new Set(manualPackAdditions);
    const removed = new Set(manualPackRemovals);
    const isInPresetBase = pack.autoIncluded;

    if (checked) {
      if (isInPresetBase) {
        removed.delete(pack.packId);
      } else {
        added.add(pack.packId);
      }
    } else if (isInPresetBase) {
      removed.add(pack.packId);
      added.delete(pack.packId);
    } else {
      added.delete(pack.packId);
      removed.delete(pack.packId);
    }

    const nextConfig: FilterConfig = {
      ...currentFilterConfig,
      manualPackAdditions: new Set(added),
      manualPackRemovals: new Set(removed),
    };

    onFilterConfigChange(nextConfig);
    persistManualOverrides([...added], [...removed], nextConfig);
    console.log('[PackToggle] Saved:', { manuallyAdded: [...added], manuallyRemoved: [...removed] });
    if (!options?.suppressToast) {
      toast.success(
        checked
          ? `${pack.packName} added to schema context`
          : `${pack.packName} removed from schema context`,
      );
    }
  };

  const resetManualOverrides = () => {
    if (!currentFilterConfig || !onFilterConfigChange) return;

    const nextConfig: FilterConfig = {
      ...currentFilterConfig,
      manualPackAdditions: new Set<string>(),
      manualPackRemovals: new Set<string>(),
    };

    onFilterConfigChange(nextConfig);
    onResetManualPackOverrides?.(currentPresetId);
    onManualPackOverridesChange?.([], [], currentPresetId);
    toast.message('Manual overrides reset');
  };

  const applyCompression = (enabled: boolean) => {
    setCompressionEnabled(enabled);
    if (!currentFilterConfig || !onFilterConfigChange) return;

    const nextConfig: FilterConfig = {
      ...currentFilterConfig,
      compressSchemas: enabled,
    };

    onFilterConfigChange(nextConfig);
  };

  const removeLargePack = (packId: string) => {
    const pack = packBreakdown.find((entry) => entry.packId === packId);
    if (!pack) return;
    if (!pack.included) return;
    handlePackToggle(pack, false);
  };

  const applyAggressiveCompression = () => {
    if (!currentFilterConfig || !onFilterConfigChange) return;

    const nextConfig: FilterConfig = {
      ...currentFilterConfig,
      includeRelatedNodes: false,
      compressSchemas: true,
    };

    onFilterConfigChange(nextConfig);
    toast.message('Applied aggressive compression');
  };

  const handleEnhanceWithPack = (pack: PackBreakdownEntry) => {
    if (pack.nodeCount <= 0 || !onEnhanceWithPack) return;
    if (!pack.included) {
      handlePackToggle(pack, true, { suppressToast: true });
    }
    setShowDetails(false);
    onEnhanceWithPack({
      packId: pack.packId,
      packName: pack.packName,
      nodeCount: pack.nodeCount,
    });
  };

  const isPresetActive = (presetId: FilterPresetId): boolean => {
    if (!currentFilterConfig) return false;
    const preset = FILTER_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return false;

    return (
      currentFilterConfig.mode === preset.mode
      && currentFilterConfig.includeRelatedNodes === preset.includeRelatedNodes
      && currentFilterConfig.compressSchemas === preset.compress
    );
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        className={`flex items-center gap-2 px-2 py-1 rounded-lg ${colors.bg} hover:opacity-90 transition-opacity`}
        title={totalStatusMessage}
      >
        <div className="w-12 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${Math.min(100, totalUsagePercent)}%` }}
          />
        </div>
        <span className={`text-[10px] ${colors.text} tabular-nums`}>
          {formatTokenCount(estimate.total)}/{formatTokenCount(estimate.modelLimit)}
        </span>
      </button>

      {onToggleSchemaDrawer && (
        <button
          type="button"
          onClick={onToggleSchemaDrawer}
          className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          title={schemaDrawerOpen ? 'Close schema panel (Ctrl+Shift+S)' : 'Open schema panel (Ctrl+Shift+S)'}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
          </svg>
          <span>Schemas</span>
          <span className="text-text-tertiary">{schemaDrawerOpen ? '◂' : '▸'}</span>
        </button>
      )}

      {showDetails && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />

          <div className="absolute right-0 top-full mt-1 z-50 w-[24rem] max-h-[80vh] overflow-y-auto bg-surface-inset border border-border-strong rounded-xl shadow-2xl p-4">
            <h3 className="text-white text-xs mb-3">Context Window Usage</h3>

            <div className="mb-3 pb-3 border-b border-border-subtle">
              <div className="text-[10px] text-content-muted uppercase tracking-widest mb-1.5">Active Model</div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-content-primary leading-tight truncate">{selectedModelName || selectedModelId || 'No model selected'}</div>
                  <div className="text-xs text-content-faint font-mono mt-0.5 break-all">{selectedModelId || '-'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm text-content-primary font-mono">{formatTokenCount(modelContext.contextLimit)}</div>
                  <div className="text-xs text-content-faint">context</div>
                  {modelContext.confidence !== 'estimated' && (
                    <div className="text-[10px] text-content-muted mt-0.5">{modelContext.confidence}</div>
                  )}
                  {modelContext.confidence === 'estimated' && (
                    <div className="text-xs text-yellow-500 mt-0.5" title="Context size estimated from fallback rules">
                      estimated
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <BudgetRow
                label="Node Schemas"
                used={estimate.breakdown.nodeSchemas}
                limit={modelContext.contextLimit}
                barClass="bg-emerald-500"
                showLimit={false}
              />
              <BudgetRow
                label="Total Context"
                used={estimate.total}
                limit={estimate.modelLimit}
                barClass={colors.bar}
              />
              <p className={`mt-1 text-[10px] ${colors.text}`}>{totalStatusMessage}</p>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-content-muted mb-1">
                <span>{formatTokenCount(estimate.total)} tokens used</span>
                <span>{totalUsagePercent}%</span>
              </div>
              <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${Math.min(100, totalUsagePercent)}%` }} />
              </div>
              <p className={`text-[10px] mt-1 ${colors.text}`}>{totalStatusMessage}</p>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-[10px] text-content-muted uppercase tracking-wider">Breakdown</h4>
              <BreakdownRow label="System Prompt" tokens={estimate.breakdown.systemPrompt} total={estimate.total} />
              <BreakdownRow label="Workflow JSON" tokens={estimate.breakdown.workflowJson} total={estimate.total} />
              <BreakdownRow label="Workflow Metadata" tokens={estimate.breakdown.workflowMetadata} total={estimate.total} />
              <BreakdownRow
                label="Node Schemas"
                tokens={estimate.breakdown.nodeSchemas}
                total={estimate.total}
                onClick={!schemaDrawerOpen && onToggleSchemaDrawer
                  ? () => {
                    onToggleSchemaDrawer();
                    setShowDetails(false);
                  }
                  : undefined}
                title={!schemaDrawerOpen && onToggleSchemaDrawer ? 'Open schema panel (Ctrl+Shift+S)' : undefined}
              />
              <BreakdownRow label="Model Library" tokens={estimate.breakdown.modelLibrary} total={estimate.total} />
              <BreakdownRow label="Conversation" tokens={estimate.breakdown.conversationHistory} total={estimate.total} />
              <BreakdownRow label="Other" tokens={estimate.breakdown.other} total={estimate.total} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownRow({
  label,
  tokens,
  total,
  onClick,
  title,
}: {
  label: string;
  tokens: number;
  total: number;
  onClick?: () => void;
  title?: string;
}) {
  const percent = total > 0 ? Math.round((tokens / total) * 100) : 0;
  return (
    <div
      className={`flex items-center justify-between text-[10px] ${onClick ? 'cursor-pointer hover:text-content-primary' : ''}`}
      onClick={onClick}
      title={title}
    >
      <span className="text-content-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1 bg-surface-elevated rounded-full overflow-hidden">
          <div className="h-full bg-gray-600 rounded-full" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-content-muted tabular-nums w-10 text-right">{formatTokenCount(tokens)}</span>
      </div>
    </div>
  );
}

function BudgetRow({
  label,
  used,
  limit,
  barClass,
  showLimit = true,
}: {
  label: string;
  used: number;
  limit: number;
  barClass: string;
  showLimit?: boolean;
}) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="mb-1.5">
      <div className="mb-0.5 flex items-center justify-between text-[10px]">
        <span className="text-content-secondary">{label}</span>
        <span className="text-content-muted tabular-nums">
          {showLimit ? `${formatTokenCount(used)} / ${formatTokenCount(limit)}` : formatTokenCount(used)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}




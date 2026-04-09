import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Lock, Sparkles, Unlock, Wand2, X } from 'lucide-react';
import type { ComfyUIWorkflow, ProviderSettings } from '../../../types/comfyui';
import {
  optimizeParameters,
  type OptimizationIntent,
  type OptimizationResult,
  type ParameterChange,
} from '../../../services/workflow-parameter-optimizer';
import { resolveNodeSchema } from '../../../services/node-schema-resolver';

interface ParameterOptimizerPanelProps {
  workflow: ComfyUIWorkflow;
  objectInfo: Record<string, any>;
  liveObjectInfo?: Record<string, any>;
  providerSettings: ProviderSettings;
  architectureHint?: string;
  onApplyChanges: (changes: ParameterChange[]) => void;
  onClose: () => void;
}

type OptimizerState = 'idle' | 'loading' | 'review' | 'error' | 'applied';
type OptimizationScope = 'all' | 'selected';

function formatValue(value: any): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function getChangeKey(change: { nodeId: number; widgetName: string }): string {
  return `${change.nodeId}:${change.widgetName}`;
}

function isWidgetOptimizableName(widgetName: string): boolean {
  const normalized = widgetName.toLowerCase();
  if (normalized.includes('seed')) return false;
  return true;
}

export function ParameterOptimizerPanel({
  workflow,
  objectInfo,
  liveObjectInfo,
  providerSettings,
  architectureHint,
  onApplyChanges,
  onClose,
}: ParameterOptimizerPanelProps) {
  const [phase, setPhase] = useState<OptimizerState>('idle');
  const [intent, setIntent] = useState<OptimizationIntent>('balanced');
  const [customPrompt, setCustomPrompt] = useState('');
  const [scope, setScope] = useState<OptimizationScope>('all');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<number>>(new Set());
  const [lockedParams, setLockedParams] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState('');
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());

  const optimizableNodes = useMemo(() => {
    return (workflow.nodes || [])
      .map((node) => {
        const schema = resolveNodeSchema(node.type, objectInfo);
        if (!schema) return null;
        const hasOptimizableWidgets = schema.widgets.some((widget) => {
          if (widget.type === 'STRING' && widget.multiline) return false;
          return isWidgetOptimizableName(widget.name);
        });
        if (!hasOptimizableWidgets) return null;
        return {
          id: node.id,
          title: node.title || schema.displayName || node.type,
          type: node.type,
        };
      })
      .filter((entry): entry is { id: number; title: string; type: string } => Boolean(entry));
  }, [workflow.nodes, objectInfo]);

  useEffect(() => {
    if (optimizableNodes.length === 0) {
      setSelectedNodeIds(new Set());
      return;
    }

    setSelectedNodeIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set(optimizableNodes.map((node) => node.id));
    });
  }, [optimizableNodes]);

  const groupedChanges = useMemo(() => {
    if (!result) return [];
    const groups = new Map<string, { key: string; title: string; nodeId: number; nodeType: string; changes: Array<{ idx: number; change: ParameterChange }> }>();
    result.changes.forEach((change, index) => {
      const key = `${change.nodeId}-${change.nodeType}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: change.nodeTitle,
          nodeId: change.nodeId,
          nodeType: change.nodeType,
          changes: [],
        });
      }
      groups.get(key)!.changes.push({ idx: index, change });
    });
    return Array.from(groups.values());
  }, [result]);

  const selectedCount = selectedIndexes.size;

  const totalChanges = result?.changes.length || 0;
  const nodesAffected = useMemo(() => {
    if (!result) return 0;
    return new Set(result.changes.map((change) => change.nodeId)).size;
  }, [result]);

  const estimatedSpeedup = useMemo(() => {
    if (intent !== 'speed' || !result) return null;
    const factor = Math.min(2.8, 1 + result.changes.length * 0.08);
    return `~${factor.toFixed(1)}x`;
  }, [intent, result]);

  const handleAnalyze = useCallback(async () => {
    setPhase('loading');
    setError('');
    setResult(null);

    const selectedIds = scope === 'selected' ? Array.from(selectedNodeIds) : undefined;
    if (scope === 'selected' && (!selectedIds || selectedIds.length === 0)) {
      setError('Select at least one node for scoped optimization.');
      setPhase('error');
      return;
    }

    try {
      const optimization = await optimizeParameters({
        workflow,
        objectInfo,
        liveObjectInfo,
        intent,
        customPrompt: intent === 'custom' ? customPrompt : undefined,
        providerSettings,
        architectureHint,
        selectedNodeIds: selectedIds,
        lockedParameters: Array.from(lockedParams).map((entry) => {
          const [nodeIdRaw, widgetName] = entry.split(':');
          return { nodeId: Number(nodeIdRaw), widgetName };
        }),
      });
      setResult(optimization);
      const defaults = new Set<number>(
        optimization.changes
          .map((change, index) => ({ change, index }))
          .filter(({ change }) => !lockedParams.has(getChangeKey(change)))
          .map(({ index }) => index),
      );
      setSelectedIndexes(defaults);
      setPhase('review');
    } catch (err) {
      setError((err as Error).message || 'Failed to optimize workflow');
      setPhase('error');
    }
  }, [
    workflow,
    objectInfo,
    liveObjectInfo,
    intent,
    customPrompt,
    providerSettings,
    architectureHint,
    scope,
    selectedNodeIds,
    lockedParams,
  ]);

  const toggleChange = useCallback((index: number, checked: boolean) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  }, []);

  const toggleNodeScope = useCallback((nodeId: number) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const toggleLockParam = useCallback((change: ParameterChange, index: number) => {
    const key = getChangeKey(change);
    setLockedParams((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      const currentlyLocked = lockedParams.has(key);
      if (currentlyLocked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  }, [lockedParams]);

  const handleApplySelected = useCallback(() => {
    if (!result || selectedIndexes.size === 0) return;
    const changes = result.changes.filter((change, index) => selectedIndexes.has(index) && !lockedParams.has(getChangeKey(change)));
    onApplyChanges(changes);
    setPhase('applied');
    setTimeout(() => onClose(), 900);
  }, [result, selectedIndexes, lockedParams, onApplyChanges, onClose]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-surface-overlay backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-border-strong bg-surface-primary shadow-[var(--shadow-overlay)]">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-accent/25 bg-accent-muted p-2">
              <Sparkles className="h-4 w-4 text-accent-text" />
            </div>
            <div>
              <h3 className="text-sm text-content-primary">AI Parameter Optimizer</h3>
              <p className="text-[11px] text-content-muted">Analyze and optimize workflow widget parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-content-muted transition-colors hover:bg-surface-elevated hover:text-content-primary"
            title="Close optimizer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(85vh-60px)] overflow-y-auto px-4 py-4">
          {phase === 'idle' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border-default bg-surface-secondary p-3">
                <p className="mb-2 text-xs text-content-primary">Optimization Intent</p>
                <div className="grid gap-2 text-xs text-content-primary sm:grid-cols-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={intent === 'quality'} onChange={() => setIntent('quality')} />
                    Best Quality
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={intent === 'speed'} onChange={() => setIntent('speed')} />
                    Fastest
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={intent === 'balanced'} onChange={() => setIntent('balanced')} />
                    Balanced
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={intent === 'custom'} onChange={() => setIntent('custom')} />
                    Custom Prompt
                  </label>
                </div>
                {intent === 'custom' && (
                  <textarea
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    rows={3}
                    placeholder="Example: optimize for cinematic realism and reduce generation time under 12s"
                    className="mt-3 w-full resize-y rounded border border-border-strong bg-surface-inset px-2 py-1.5 text-xs text-content-primary outline-none focus:border-accent/40"
                  />
                )}
              </div>

              <div className="rounded-lg border border-border-default bg-surface-secondary p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-content-primary">Optimization Scope</span>
                  <button
                    onClick={() => setScope(scope === 'all' ? 'selected' : 'all')}
                    className="text-xs text-accent-text hover:text-accent-text"
                  >
                    {scope === 'all' ? 'Select specific nodes' : 'Optimize all nodes'}
                  </button>
                </div>
                {scope === 'selected' && (
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded border border-border-default bg-surface-inset p-2">
                    {optimizableNodes.length === 0 && (
                      <div className="text-xs text-content-muted">No optimizable nodes detected in this workflow.</div>
                    )}
                    {optimizableNodes.map((node) => (
                      <label key={node.id} className="flex cursor-pointer items-center gap-2 text-xs text-content-secondary hover:text-content-primary">
                        <input
                          type="checkbox"
                          checked={selectedNodeIds.has(node.id)}
                          onChange={() => toggleNodeScope(node.id)}
                          className="accent-accent"
                        />
                        <span>#{node.id} {node.title} ({node.type})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {lockedParams.size > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs text-amber-200">Locked parameters: {lockedParams.size} (will be excluded from analysis)</p>
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={workflow.nodes.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-muted px-3 py-1.5 text-xs text-accent-text transition-colors hover:bg-accent-muted/80 disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Analyze Workflow
                </button>
              </div>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent-text" />
              <p className="text-sm text-content-primary">AI is analyzing your workflow...</p>
              <p className="text-xs text-content-muted">This can take a few seconds depending on model/provider.</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="space-y-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-red-300" />
                <div>
                  <p className="text-sm text-red-200">Optimization failed</p>
                  <p className="mt-1 text-xs text-red-300/80">{error}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setPhase('idle')}
                  className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-content-primary hover:bg-surface-elevated"
                >
                  Back
                </button>
                <button
                  onClick={handleAnalyze}
                  className="rounded-lg border border-accent/30 bg-accent-muted px-3 py-1.5 text-xs text-accent-text hover:bg-accent-muted/80"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {phase === 'review' && result && (
            <div className="space-y-3">
              <div className="rounded-lg border border-accent/20 bg-accent-muted p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-text" />
                  <span className="text-sm font-medium text-content-primary">Optimization Summary</span>
                </div>
                <div className="mb-2 grid grid-cols-3 gap-3 text-center text-xs">
                  <div>
                    <div className="text-lg font-semibold text-content-primary">{totalChanges}</div>
                    <div className="text-content-secondary">Changes</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-content-primary">{nodesAffected}</div>
                    <div className="text-content-secondary">Nodes</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-content-primary">{intent === 'speed' ? (estimatedSpeedup || '~1.0x') : 'Higher'}</div>
                    <div className="text-content-secondary">{intent === 'speed' ? 'Est. Speedup' : 'Quality'}</div>
                  </div>
                </div>
                <p className="text-xs text-content-primary">{result.summary}</p>
              </div>

              {result.changes.length === 0 ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  Workflow is already well-optimized for this intent.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedChanges.map((group) => (
                    <div key={group.key} className="rounded-lg border border-border-default bg-surface-secondary p-3">
                      <div className="mb-2 text-xs text-content-primary">
                        #{group.nodeId} {group.title}
                        <span className="ml-2 text-content-muted">({group.nodeType})</span>
                      </div>
                      <div className="space-y-2">
                        {group.changes.map(({ idx, change }) => {
                          const checked = selectedIndexes.has(idx);
                          const lockKey = getChangeKey(change);
                          const isLocked = lockedParams.has(lockKey);
                          const isAutoCorrected = change.validationStatus === 'auto-corrected' || change.isAutoCorrected;
                          return (
                            <label
                              key={`${change.nodeId}-${change.widgetName}-${idx}`}
                              className={`block rounded border px-2 py-2 text-xs ${
                                checked
                                  ? 'border-accent/30 bg-accent-muted'
                                  : 'border-border-default bg-surface-inset'
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <div className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isLocked}
                                    onChange={(event) => toggleChange(idx, event.target.checked)}
                                  />
                                  <span className="text-content-primary">{change.widgetName}</span>
                                  <span className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-content-secondary">{change.widgetType}</span>
                                  {isAutoCorrected && (
                                    <span className="text-[10px] text-amber-300" title={`Corrected from ${JSON.stringify(change.originalProposal ?? change.newValue)}`}>
                                      auto-corrected
                                    </span>
                                  )}
                                  {!isAutoCorrected && (
                                    <span className="text-[10px] text-emerald-300">valid</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    toggleLockParam(change, idx);
                                  }}
                                  className={`rounded p-1 transition-colors ${isLocked ? 'text-amber-300 hover:bg-amber-500/20' : 'text-content-muted hover:bg-surface-secondary/60 hover:text-content-primary'}`}
                                  title={isLocked ? 'Unlock parameter' : 'Lock parameter'}
                                >
                                  {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                              <div className="pl-5">
                                <div className="text-[11px]">
                                  <span className="text-rose-300/90">{formatValue(change.oldValue)}</span>
                                  <span className="mx-1 text-content-muted">-&gt;</span>
                                  <span className="text-emerald-300">{formatValue(change.newValue)}</span>
                                </div>
                                {isAutoCorrected && (
                                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-300">
                                    <AlertTriangle className="h-3 w-3" />
                                    Proposed value {formatValue(change.originalProposal)} was adjusted to valid option {formatValue(change.newValue)}.
                                  </div>
                                )}
                                <div className="mt-0.5 text-[10px] text-content-muted">{change.reason}</div>
                                {isLocked && (
                                  <div className="mt-0.5 text-[10px] text-amber-300">Locked - excluded from apply.</div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-content-primary hover:bg-surface-elevated"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySelected}
                  disabled={selectedCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-muted px-3 py-1.5 text-xs text-accent-text hover:bg-accent-muted/80 disabled:opacity-40"
                >
                  Apply Selected ({selectedCount} changes)
                </button>
              </div>
            </div>
          )}

          {phase === 'applied' && (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-300" />
              <p className="text-sm text-emerald-200">Optimization applied.</p>
              <p className="text-xs text-content-muted">Updated values are now in your workflow.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

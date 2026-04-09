/**
 * ExperimentPanel - Phase 14: parameter sweeps + AI optimizer + A/B compare.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X,
  FlaskConical,
  Plus,
  Trash2,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  ArrowRightLeft,
  Maximize2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Zap,
  RefreshCw,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ComfyUIWorkflow } from '../../../types/comfyui';
import {
  discoverSweepableWidgets,
  expandSweepValues,
  generateVariants,
  runExperiment,
  parseOptimizerResponse,
  runABCompare,
  parseSmartSuggestResponse,
  type SweepParam,
  type SweepableWidget,
  type ExperimentProgress,
  type ExperimentRunResult,
  type SweepValueType,
  type OptimizationResult,
  type ABCompareResult,
  type ABCompareProgress,
  saveExperimentToHistory,
  getExperimentHistory,
  clearExperimentHistory,
  type ExperimentHistoryEntry,
} from '../../../services/experiment-engine';
import { executeWorkflow, type ExecutionImage } from '../../../services/comfyui-execution';
import {
  buildOptimizerSystemPrompt,
  buildOptimizerUserMessage,
  SMART_SUGGEST_SYSTEM_PROMPT,
  buildSmartSuggestUserMessage,
} from '../../../services/optimizer-prompt';
import { calculateMaxTokens } from '../../../services/ai-provider';
import {
  buildRatingSystemPrompt,
  parseRatingResponse,
  imageToBase64,
  RATING_MODES,
  getRatingModeForStrategy,
  calculateWeightedScore,
  type RatingResult,
  type ImageRating,
  type RatingMode,
} from '../../../services/image-rating-service';
import {
  OPTIMIZER_STRATEGIES,
  getDefaultStrategy,
  type OptimizerStrategy,
} from '../../../services/optimizer-strategies';
import {
  EXPERIMENT_PRESETS,
  getCompatiblePresets,
  applyPreset,
  type ExperimentPreset,
} from '../../../data/experiment-presets';
import { WorkflowDiffView } from './WorkflowDiffView';

interface ExperimentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: ComfyUIWorkflow | null;
  comfyuiUrl: string;
  lastExecutionImages?: ExecutionImage[];
  onCallAI?: (systemPrompt: string, userMessage: string) => Promise<string>;
  onAcceptOptimized?: (workflow: ComfyUIWorkflow) => void;
  onApplyOptimized?: (workflow: ComfyUIWorkflow) => void;
}

let _idCounter = 0;
function uid(): string {
  return `sw-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
}

function stripNonFunctionalNodes(workflow: any): any {
  if (!workflow || typeof workflow !== 'object') return workflow;

  // Graph format: { nodes: [...], links: [...] }
  if (Array.isArray(workflow.nodes)) {
    const keptNodes = workflow.nodes.filter(
      (node: any) => node?.type !== 'Note' && node?.type !== 'Reroute',
    );
    const keptNodeIds = new Set<number>(keptNodes.map((node: any) => Number(node.id)));

    const keptLinks = Array.isArray(workflow.links)
      ? workflow.links.filter((link: any) => {
        // Comfy link tuple: [linkId, fromNodeId, fromSlot, toNodeId, toSlot, type]
        const fromNodeId = Number(link?.[1]);
        const toNodeId = Number(link?.[3]);
        return keptNodeIds.has(fromNodeId) && keptNodeIds.has(toNodeId);
      })
      : workflow.links;

    return {
      ...workflow,
      nodes: keptNodes,
      links: keptLinks,
    };
  }

  // API format: numbered keys with { class_type, inputs }
  const stripped: Record<string, any> = {};
  for (const [key, value] of Object.entries(workflow)) {
    const node = value as any;
    if (node?.class_type !== 'Note' && node?.class_type !== 'Reroute') {
      stripped[key] = node;
    }
  }
  return stripped;
}

function minimizeForOptimizer(workflow: any): any {
  if (!workflow || typeof workflow !== 'object') return workflow;

  if (Array.isArray(workflow.nodes)) {
    const minimizedNodes = workflow.nodes.map((node: any) => ({
      id: node?.id,
      type: node?.type,
      inputs: node?.inputs,
      outputs: Array.isArray(node?.outputs)
        ? node.outputs.map((out: any) => ({
          name: out?.name,
          type: out?.type,
          links: out?.links,
        }))
        : node?.outputs,
      widgets_values: node?.widgets_values,
    }));

    return {
      last_node_id: workflow.last_node_id,
      last_link_id: workflow.last_link_id,
      nodes: minimizedNodes,
      links: workflow.links,
      groups: workflow.groups,
      config: workflow.config,
      extra: workflow.extra,
      version: workflow.version,
    };
  }

  // API format is already compact enough.
  return workflow;
}

function getSelectedModelIdFromSettingsStore(): string {
  if (typeof window === 'undefined') return 'unknown-model';
  try {
    const raw = window.localStorage.getItem('comfyui-architect-settings');
    if (!raw) return 'unknown-model';
    const parsed = JSON.parse(raw) as { selectedModel?: string };
    return parsed.selectedModel || 'unknown-model';
  } catch {
    return 'unknown-model';
  }
}

function extractGenerationPrompt(workflow: ComfyUIWorkflow | null): string {
  if (!workflow?.nodes?.length) return 'No prompt provided';
  const promptCandidates: string[] = [];

  for (const node of workflow.nodes) {
    if (!node?.type || !node.type.includes('CLIPTextEncode')) continue;
    if (!Array.isArray(node.widgets_values)) continue;
    const firstText = node.widgets_values.find((value) => typeof value === 'string' && value.trim().length > 0);
    if (typeof firstText === 'string') {
      promptCandidates.push(firstText.trim());
    }
  }

  if (promptCandidates.length === 0) return 'No prompt provided';
  // Prefer the longest non-empty prompt (usually the positive prompt).
  const bestPrompt = [...promptCandidates].sort((a, b) => b.length - a.length)[0];
  return bestPrompt;
}

function getRatingBadgeClass(score: number): string {
  if (score >= 8) return 'bg-state-success text-accent-contrast';
  if (score >= 6) return 'bg-accent text-accent-contrast';
  return 'bg-state-error text-accent-contrast';
}

export function ExperimentPanel({
  isOpen,
  onClose,
  workflow,
  comfyuiUrl,
  lastExecutionImages = [],
  onCallAI,
  onAcceptOptimized,
  onApplyOptimized,
}: ExperimentPanelProps) {
  const [panelMode, setPanelMode] = useState<'sweep' | 'optimize'>('sweep');

  // Sweep config state
  const [sweepParams, setSweepParams] = useState<SweepParam[]>([]);
  const [sweepMode, setSweepMode] = useState<'grid' | 'zip'>('grid');
  const [experimentName, setExperimentName] = useState('Experiment 1');

  // Sweep execution state
  const [progress, setProgress] = useState<ExperimentProgress | null>(null);
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null);
  const [results, setResults] = useState<ExperimentRunResult[]>([]);

  // Smart suggest state
  const [smartSuggestLoading, setSmartSuggestLoading] = useState(false);
  const [smartSuggestReasons, setSmartSuggestReasons] = useState<Record<string, string>>({});

  // AI optimize state
  const [optimizeStatus, setOptimizeStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle');
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [optimizeError, setOptimizeError] = useState('');
  const [abCompareResult, setAbCompareResult] = useState<ABCompareResult | null>(null);
  const [abCompareProgress, setAbCompareProgress] = useState<ABCompareProgress | null>(null);
  const [abCompareRunning, setAbCompareRunning] = useState(false);
  const [abCancelFn, setAbCancelFn] = useState<(() => void) | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<OptimizerStrategy>(getDefaultStrategy());
  const [customGoal, setCustomGoal] = useState('');
  const [lastOptimizeStrategy, setLastOptimizeStrategy] = useState<OptimizerStrategy>(getDefaultStrategy());

  // Shared UI state
  const [showResults, setShowResults] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showDiffDetails, setShowDiffDetails] = useState(false);
  const [experimentHistory, setExperimentHistory] = useState<ExperimentHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [imageRatings, setImageRatings] = useState<RatingResult | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [selectedRatingMode, setSelectedRatingMode] = useState<RatingMode>(
    getRatingModeForStrategy(getDefaultStrategy().id),
  );

  const sweepableWidgets = useMemo(() => {
    if (!workflow) return [];
    return discoverSweepableWidgets(workflow);
  }, [workflow]);

  const compatiblePresets = useMemo(() => {
    if (!workflow) return [];
    const nodeTypes = workflow.nodes.map((n) => n.type).filter(Boolean);
    return getCompatiblePresets(nodeTypes);
  }, [workflow]);

  useEffect(() => {
    setExperimentHistory(getExperimentHistory());
  }, []);

  useEffect(() => {
    setImageRatings(null);
  }, [results, abCompareResult, panelMode]);

  useEffect(() => {
    setSelectedRatingMode(getRatingModeForStrategy(selectedStrategy.id));
  }, [selectedStrategy.id]);

  useEffect(() => {
    if (!isOpen) return;
    setOptimizeStatus('idle');
    setOptimizationResult(null);
    setOptimizeError('');
    setAbCompareResult(null);
    setAbCompareProgress(null);
    setAbCompareRunning(false);
    setAbCancelFn(null);
    setShowDiffDetails(false);
  }, [isOpen, workflow]);

  const widgetsByNode = useMemo(() => {
    const grouped = new Map<number, { label: string; type: string; widgets: SweepableWidget[] }>();
    for (const w of sweepableWidgets) {
      if (!grouped.has(w.nodeId)) {
        grouped.set(w.nodeId, { label: w.nodeLabel, type: w.nodeType, widgets: [] });
      }
      grouped.get(w.nodeId)!.widgets.push(w);
    }
    return grouped;
  }, [sweepableWidgets]);

  const variants = useMemo(() => {
    if (sweepParams.length === 0 || !workflow) return [];
    try {
      return generateVariants(workflow, {
        name: experimentName,
        params: sweepParams,
        mode: sweepMode,
      });
    } catch {
      return [];
    }
  }, [workflow, sweepParams, sweepMode, experimentName]);

  const isSweepRunning = progress?.status === 'running' || progress?.status === 'preparing';

  const rateableImages = useMemo(() => {
    const images: Array<{ url: string; label: string; durationMs?: number }> = [];

    if (abCompareResult) {
      const original = abCompareResult.original.execution.images?.[0];
      const optimized = abCompareResult.optimized.execution.images?.[0];
      if (original?.url) {
        images.push({
          url: original.url,
          label: 'Original',
          durationMs: abCompareResult.original.execution.durationMs,
        });
      }
      if (optimized?.url) {
        images.push({
          url: optimized.url,
          label: 'AI Optimized',
          durationMs: abCompareResult.optimized.execution.durationMs,
        });
      }
    }

    for (const result of results) {
      const first = result.execution.images?.[0];
      if (first?.url) {
        images.push({
          url: first.url,
          label: result.variant.label,
          durationMs: result.execution.durationMs,
        });
      }
    }

    const deduped = new Map<string, { url: string; label: string; durationMs?: number }>();
    for (const image of images) {
      if (!deduped.has(image.url)) {
        deduped.set(image.url, image);
      }
    }

    return Array.from(deduped.values());
  }, [abCompareResult, results]);

  const ratingsByKey = useMemo(() => {
    const map = new Map<string, ImageRating>();
    for (const rating of imageRatings?.ratings || []) {
      if (rating.imageUrl) map.set(`url:${rating.imageUrl}`, rating);
      map.set(`label:${rating.variantLabel}`, rating);
    }
    return map;
  }, [imageRatings]);

  const getImageRating = useCallback((label: string, url?: string): ImageRating | null => {
    if (url) {
      const byUrl = ratingsByKey.get(`url:${url}`);
      if (byUrl) return byUrl;
    }
    return ratingsByKey.get(`label:${label}`) || null;
  }, [ratingsByKey]);

  const handleAddParam = useCallback((widget: SweepableWidget) => {
    if (sweepParams.some((p) => p.nodeId === widget.nodeId && p.widgetName === widget.widgetName)) {
      toast.info('This parameter is already in the sweep.');
      return;
    }

    const defaultType: SweepValueType = widget.valueType === 'number' ? 'number-range' : 'string-list';

    const newParam: SweepParam = {
      id: uid(),
      nodeId: widget.nodeId,
      nodeType: widget.nodeType,
      nodeLabel: widget.nodeLabel,
      widgetName: widget.widgetName,
      widgetIndex: widget.widgetIndex,
      type: defaultType,
      ...(widget.valueType === 'number'
        ? {
            rangeStart: typeof widget.currentValue === 'number' ? widget.currentValue : 0,
            rangeEnd: typeof widget.currentValue === 'number' ? widget.currentValue + 10 : 10,
            rangeStep: 1,
          }
        : {}),
      ...(widget.options
        ? {
            values: widget.options.slice(0, 5),
          }
        : {
            values: [widget.currentValue],
          }),
    };

    setSweepParams((prev) => [...prev, newParam]);
  }, [sweepParams]);

  const handleRemoveParam = useCallback((paramId: string) => {
    setSweepParams((prev) => prev.filter((p) => p.id !== paramId));
    setSmartSuggestReasons((prev) => {
      const next = { ...prev };
      delete next[paramId];
      return next;
    });
  }, []);

  const handleUpdateParam = useCallback((paramId: string, updates: Partial<SweepParam>) => {
    setSweepParams((prev) => prev.map((p) => (p.id === paramId ? { ...p, ...updates } : p)));
  }, []);

  const handleRun = useCallback(() => {
    if (!workflow || !comfyuiUrl || variants.length === 0) {
      toast.error('No variants to run. Add sweep parameters first.');
      return;
    }

    if (variants.length > 50) {
      toast.error(`Too many variants (${variants.length}). Reduce ranges to max 50.`);
      return;
    }

    setResults([]);
    setShowResults(true);

    const { promise, cancel } = runExperiment(comfyuiUrl, variants, (prog) => {
      setProgress(prog);
      if (prog.results.length > 0) {
        setResults([...prog.results]);
      }
    });

    setCancelFn(() => cancel);

    promise
      .then((finalResults) => {
        setResults(finalResults);
        setCancelFn(null);

        // Save to history
        const totalDuration = finalResults.reduce((sum, r) => sum + (r.execution.durationMs || 0), 0);
        const firstImage = finalResults.find((r) => r.execution.images?.[0])?.execution.images[0]?.url;
        const paramSummary = sweepParams.map((p) => `${p.widgetName}`).join(', ');

        const historyEntry: ExperimentHistoryEntry = {
          id: `exp-${Date.now().toString(36)}`,
          name: experimentName,
          timestamp: Date.now(),
          mode: 'sweep',
          variantCount: finalResults.length,
          totalDurationMs: totalDuration,
          paramSummary,
          bestImageUrl: firstImage,
        };
        saveExperimentToHistory(historyEntry);
        setExperimentHistory(getExperimentHistory());

        // Skip completion toast for cancelled runs (partial result set).
        if (finalResults.length === variants.length) {
          const successCount = finalResults.filter((r) => r.execution.success).length;
          toast.success(`Experiment complete: ${successCount}/${finalResults.length} succeeded`);
        }
      })
      .catch((err: any) => {
        setCancelFn(null);
        toast.error(`Experiment failed: ${err.message}`);
      });
  }, [workflow, comfyuiUrl, variants, sweepParams, experimentName]);

  const handleCancel = useCallback(() => {
    cancelFn?.();
    setCancelFn(null);
    // Immediately mark as cancelled so pending placeholders disappear right away.
    setProgress((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    toast.info('Experiment cancelled');
  }, [cancelFn]);

  const handleSmartSuggest = useCallback(async () => {
    if (!workflow || !onCallAI) return;

    setSmartSuggestLoading(true);

    try {
      const workflowJson = JSON.stringify(workflow, null, 2);
      const response = await onCallAI(
        SMART_SUGGEST_SYSTEM_PROMPT,
        buildSmartSuggestUserMessage(workflowJson),
      );

      const { suggestions, params, error } = parseSmartSuggestResponse(response, sweepableWidgets);

      if (error) {
        toast.error('Smart suggest: ' + error);
      } else if (params.length === 0) {
        toast.info('AI could not find parameters to suggest for this workflow');
      } else {
        setSweepParams(params);

        const suggestionsByKey = new Map<string, string>();
        for (const suggestion of suggestions) {
          suggestionsByKey.set(`${suggestion.nodeId}:${suggestion.widgetName}`, suggestion.reason);
        }

        const reasons: Record<string, string> = {};
        for (const param of params) {
          reasons[param.id] =
            suggestionsByKey.get(`${param.nodeId}:${param.widgetName}`)
            || suggestions.find((s) => s.widgetName === param.widgetName)?.reason
            || '';
        }
        setSmartSuggestReasons(reasons);

        toast.success(`AI suggested ${params.length} parameter${params.length !== 1 ? 's' : ''} to sweep`);
      }
    } catch (err: any) {
      toast.error('Smart suggest failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSmartSuggestLoading(false);
    }
  }, [workflow, onCallAI, sweepableWidgets]);

  const handleApplyPreset = useCallback((preset: ExperimentPreset) => {
    if (!workflow) return;
    const params = applyPreset(preset, {}, sweepableWidgets);
    if (params.length === 0) {
      toast.error('No matching widgets found for this preset');
      return;
    }
    setSweepParams(params);
    setExperimentName(preset.name);
    setShowPresets(false);
    toast.success(`Applied "${preset.name}" - ${params.length} parameter(s)`);
  }, [workflow, sweepableWidgets]);

  const handleOptimize = useCallback(async () => {
    if (!workflow || !onCallAI) return;

    const customGoalText = customGoal.trim();
    if (selectedStrategy.id === 'custom' && !customGoalText) {
      toast.error('Enter a custom optimization goal first.');
      return;
    }

    const strategyToUse: OptimizerStrategy = selectedStrategy.id === 'custom'
      ? {
        ...selectedStrategy,
        promptInjection: `OPTIMIZATION GOAL: ${customGoalText}\n${customGoalText}`,
      }
      : selectedStrategy;
    const optimizerSystemPrompt = buildOptimizerSystemPrompt(strategyToUse);

    setOptimizeStatus('analyzing');
    setOptimizationResult(null);
    setOptimizeError('');
    setAbCompareResult(null);
    setAbCompareProgress(null);
    setLastOptimizeStrategy(strategyToUse);

    try {
      const workflowForOptimizer = minimizeForOptimizer(stripNonFunctionalNodes(workflow));
      const workflowJson = JSON.stringify(workflowForOptimizer, null, 2);
      const optimizerUserMessage = buildOptimizerUserMessage(workflowJson);
      const currentModel = getSelectedModelIdFromSettingsStore();
      const fullPrompt = `${optimizerSystemPrompt}\n\n${optimizerUserMessage}`;
      const tokenCalc = calculateMaxTokens(fullPrompt, currentModel);

      console.log(
        '[Optimizer] Request payload size (chars):',
        workflowJson.length,
        '(original:',
        JSON.stringify(workflow).length,
        ')',
      );
      console.log('[Optimizer] Token estimate:', {
        inputTokens: tokenCalc.inputTokens,
        contextWindow: tokenCalc.contextWindow,
        maxOutputTokens: tokenCalc.maxTokens,
        model: currentModel,
      });

      if (!tokenCalc.fits) {
        const sizeError =
          tokenCalc.error
          || 'Workflow too large for the current AI model context window.';
        setOptimizeError(sizeError);
        setOptimizeStatus('error');
        toast.error(
          `Your AI model's context window is too small for this workflow. ` +
          `Input: ~${tokenCalc.inputTokens.toLocaleString()} tokens, ` +
          `Model limit: ${tokenCalc.contextWindow.toLocaleString()} tokens. ` +
          `Try a larger model like Gemini 1.5 Pro (2M) or Claude 3.5 Sonnet (200K).`,
          { duration: 8000 },
        );
        console.error('[Optimizer]', sizeError);
        return;
      }

      const response = await onCallAI(
        optimizerSystemPrompt,
        optimizerUserMessage,
      );

      const result = parseOptimizerResponse(response);

      if (result.success && result.optimizedWorkflow) {
        setOptimizationResult(result);
        setOptimizeStatus('ready');
        console.log('[Optimizer] Context usage:', {
          inputTokens: tokenCalc.inputTokens,
          maxOutput: tokenCalc.maxTokens,
          contextWindow: tokenCalc.contextWindow,
          utilization: `${Math.round((tokenCalc.inputTokens / tokenCalc.contextWindow) * 100)}%`,
          model: currentModel,
        });
        toast.success('AI optimization complete - review changes and run A/B compare');
      } else {
        setOptimizeError(result.error || 'Failed to parse optimization');
        setOptimizeStatus('error');
      }
    } catch (err: any) {
      setOptimizeError(err.message || 'AI call failed');
      setOptimizeStatus('error');
      toast.error('Optimization failed: ' + (err.message || 'Unknown error'));
    }
  }, [workflow, onCallAI, selectedStrategy, customGoal]);

  const handleReOptimize = useCallback(() => {
    void handleOptimize();
  }, [handleOptimize]);

  const handleRunABCompare = useCallback(() => {
    if (!workflow || !optimizationResult?.optimizedWorkflow || !comfyuiUrl) return;

    setAbCompareRunning(true);
    setAbCompareResult(null);
    setAbCompareProgress(null);
    setShowResults(true);

    const originalFromCanvas: ExperimentRunResult | null = lastExecutionImages.length > 0
      ? {
        variant: {
          index: 0,
          paramValues: {},
          label: 'A (Original)',
          workflow,
        },
        execution: {
          success: true,
          promptId: 'canvas-cached',
          images: lastExecutionImages,
          durationMs: 0,
        },
      }
      : null;

    const finalizeCompareResult = (result: ABCompareResult) => {
      setAbCompareResult(result);
      setAbCompareRunning(false);
      setAbCancelFn(null);

      const historyEntry: ExperimentHistoryEntry = {
        id: `exp-${Date.now().toString(36)}`,
        name: 'AI Optimize A/B',
        timestamp: Date.now(),
        mode: 'optimize',
        variantCount: 2,
        totalDurationMs: (result.original.execution.durationMs || 0) + (result.optimized.execution.durationMs || 0),
        paramSummary: 'AI Optimizer',
        bestImageUrl: result.optimized.execution.images?.[0]?.url || result.original.execution.images?.[0]?.url,
      };
      saveExperimentToHistory(historyEntry);
      setExperimentHistory(getExperimentHistory());

      if (result.optimized.execution.error === 'Cancelled') {
        toast.info('A/B comparison cancelled');
        return;
      }
      toast.success('A/B comparison complete!');
    };

    if (originalFromCanvas) {
      let cancelled = false;
      setAbCompareProgress({
        status: 'running-optimized',
        currentSide: 'optimized',
        originalResult: originalFromCanvas,
      });

      const { promise: optimizedPromise, cancel: cancelOptimized } = executeWorkflow(
        comfyuiUrl,
        optimizationResult.optimizedWorkflow,
        (prog) => {
          setAbCompareProgress({
            status: 'running-optimized',
            currentSide: 'optimized',
            originalResult: originalFromCanvas,
            execProgress: {
              step: prog.step,
              totalSteps: prog.totalSteps,
              percentage: prog.percentage,
              currentNodeClass: prog.currentNodeClass,
            },
          });
        },
      );

      setAbCancelFn(() => () => {
        cancelled = true;
        cancelOptimized();
      });

      optimizedPromise
        .then((optimizedExecution) => {
          const optimizedResult: ExperimentRunResult = {
            variant: {
              index: 1,
              paramValues: {},
              label: 'AI Optimized',
              workflow: optimizationResult.optimizedWorkflow!,
            },
            execution: optimizedExecution,
          };

          const result: ABCompareResult = {
            original: originalFromCanvas,
            optimized: optimizedResult,
            changesDescription: optimizationResult.changesDescription,
          };
          setAbCompareProgress({
            status: optimizedExecution.error === 'Cancelled' ? 'cancelled' : 'complete',
            currentSide: 'optimized',
            originalResult: originalFromCanvas,
            optimizedResult,
          });
          finalizeCompareResult(result);
        })
        .catch((err: any) => {
          if (cancelled) {
            const optimizedResult: ExperimentRunResult = {
              variant: {
                index: 1,
                paramValues: {},
                label: 'AI Optimized',
                workflow: optimizationResult.optimizedWorkflow!,
              },
              execution: {
                success: false,
                promptId: '',
                images: [],
                error: 'Cancelled',
                durationMs: 0,
              },
            };

            const result: ABCompareResult = {
              original: originalFromCanvas,
              optimized: optimizedResult,
              changesDescription: optimizationResult.changesDescription,
            };
            setAbCompareProgress({
              status: 'cancelled',
              currentSide: 'optimized',
              originalResult: originalFromCanvas,
              optimizedResult,
            });
            finalizeCompareResult(result);
            return;
          }

          setAbCompareRunning(false);
          setAbCancelFn(null);
          toast.error('A/B compare failed: ' + err.message);
        });
      return;
    }

    const { promise, cancel } = runABCompare(
      comfyuiUrl,
      workflow,
      optimizationResult.optimizedWorkflow,
      optimizationResult.changesDescription,
      (prog) => setAbCompareProgress(prog),
    );

    setAbCancelFn(() => cancel);

    promise
      .then((result) => {
        setAbCompareResult(result);
        setAbCompareRunning(false);
        setAbCancelFn(null);

        const historyEntry: ExperimentHistoryEntry = {
          id: `exp-${Date.now().toString(36)}`,
          name: 'AI Optimize A/B',
          timestamp: Date.now(),
          mode: 'optimize',
          variantCount: 2,
          totalDurationMs: (result.original.execution.durationMs || 0) + (result.optimized.execution.durationMs || 0),
          paramSummary: 'AI Optimizer',
          bestImageUrl: result.optimized.execution.images?.[0]?.url || result.original.execution.images?.[0]?.url,
        };
        saveExperimentToHistory(historyEntry);
        setExperimentHistory(getExperimentHistory());

        if (result.optimized.execution.error === 'Cancelled') {
          toast.info('A/B comparison cancelled');
          return;
        }
        toast.success('A/B comparison complete!');
      })
      .catch((err: any) => {
        setAbCompareRunning(false);
        setAbCancelFn(null);
        toast.error('A/B compare failed: ' + err.message);
      });
  }, [workflow, optimizationResult, comfyuiUrl, lastExecutionImages]);

  const handleAcceptOptimized = useCallback(() => {
    if (!optimizationResult?.optimizedWorkflow || !onAcceptOptimized) return;
    onAcceptOptimized(optimizationResult.optimizedWorkflow);
  }, [optimizationResult, onAcceptOptimized]);

  const handleRateImages = useCallback(async () => {
    if (!onCallAI) {
      toast.error('Configure an AI provider first.');
      return;
    }

    const allImages = rateableImages;
    if (allImages.length === 0) {
      toast.error('No result images to rate');
      return;
    }

    const maxImagesForRating = 12;
    const images = allImages.slice(0, maxImagesForRating);
    if (allImages.length > maxImagesForRating) {
      toast.info(`Rating first ${maxImagesForRating} images to keep request size manageable`);
    }

    setIsRating(true);
    setImageRatings(null);

    try {
      const generationPrompt = extractGenerationPrompt(workflow);
      const systemPrompt = buildRatingSystemPrompt(generationPrompt, images.length, selectedRatingMode);
      const base64Images = await Promise.all(images.map((img) => imageToBase64(img.url)));

      const userContent: any[] = [
        { type: 'text', text: `Rate these ${images.length} generated images:` },
        ...base64Images.map((b64) => ({
          type: 'image_url',
          image_url: { url: b64, detail: 'high' },
        })),
        ...images.map((img, i) => ({
          type: 'text',
          text: `Image ${i + 1} label: "${img.label}"${img.durationMs && img.durationMs > 0 ? `, generation time: ${(img.durationMs / 1000).toFixed(1)}s` : ''}`,
        })),
      ];

      let response: string;
      try {
        response = await (onCallAI as unknown as (systemPrompt: string, userMessage: any) => Promise<string>)(
          systemPrompt,
          userContent,
        );
      } catch (visionErr) {
        console.warn('[ImageRating] Vision payload rejected, falling back to URL text prompt:', visionErr);
        const fallbackUserMessage = [
          `Rate these ${images.length} generated images. Use labels in your response.`,
          ...images.map((img, i) => `Image ${i}: ${img.label}\nURL: ${img.url}${img.durationMs && img.durationMs > 0 ? `\nGeneration time: ${(img.durationMs / 1000).toFixed(1)}s` : ''}`),
        ].join('\n\n');
        response = await onCallAI(systemPrompt, fallbackUserMessage);
      }

      const result = parseRatingResponse(response, images, selectedRatingMode);
      setImageRatings(result);

      if (result.success) {
        try {
          const historyRaw = localStorage.getItem('experiment-history');
          if (historyRaw) {
            const history = JSON.parse(historyRaw) as any[];
            if (history.length > 0) {
              history[0].ratings = result;
              history[0].bestVariant = result.bestVariant;
              localStorage.setItem('experiment-history', JSON.stringify(history));
              console.log('[ImageRating] Saved ratings to experiment history');
              setExperimentHistory(getExperimentHistory());
            }
          }
        } catch (historyErr) {
          console.warn('[ImageRating] Could not save ratings to history:', historyErr);
        }

        toast.success(`AI rated ${result.ratings.length} images — best: ${result.bestVariant}`);
      } else {
        toast.error(result.error || 'Failed to rate images');
      }
    } catch (err: any) {
      console.error('[ImageRating] Error:', err);
      toast.error(`Rating failed: ${err.message}`);
    } finally {
      setIsRating(false);
    }
  }, [onCallAI, rateableImages, workflow, selectedRatingMode]);

  const handleAutoPickBest = useCallback((ratings: RatingResult) => {
    if (!ratings.success || !ratings.bestVariant) return;

    const best = ratings.ratings.find((r) => r.rank === 1);
    if (!best) return;

    if (best.variantLabel === 'Original') {
      toast.info('AI recommends keeping the original workflow - no changes applied.');
      return;
    }

    if (best.variantLabel === 'AI Optimized') {
      handleAcceptOptimized();
      toast.success('Auto-picked AI Optimized workflow based on AI rating!');
      return;
    }

    const bestSweepResult = results.find(
      (r) => r.variant.label === best.variantLabel || r.execution.images?.[0]?.url === best.imageUrl,
    );
    if (!bestSweepResult) {
      toast.error('Could not find the best-rated variant to apply.');
      return;
    }

    if (!onAcceptOptimized) {
      toast.error('No workflow apply handler is available.');
      return;
    }

    onAcceptOptimized(bestSweepResult.variant.workflow);
    const bestScore = best.weightedScore ?? best.scores.overall;
    toast.success(`Auto-picked ${best.variantLabel} based on AI rating (${bestScore}/10)!`);

    console.log('[AutoPick] Applied best variant:', {
      label: best.variantLabel,
      score: best.weightedScore ?? best.scores.overall,
      reasoning: best.reasoning,
    });
  }, [handleAcceptOptimized, onAcceptOptimized, results]);

  if (!isOpen) return null;

  const showABCompare = panelMode === 'optimize' && (abCompareRunning || !!abCompareResult || !!abCompareProgress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm">
      <div className="w-[90vw] max-w-[1200px] h-[85vh] bg-surface-primary border border-border-default rounded-sm flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-accent-text" />
            <h2 className="text-sm text-content-primary">Experiment Engine</h2>
            <span className="text-[10px] text-content-muted bg-surface-2 border border-border-default px-1.5 py-0.5 rounded-sm">Phase 14</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1 rounded transition-colors ${showHistory ? 'text-accent-text bg-accent/10' : 'text-content-secondary hover:text-content-secondary'}`}
              title="Experiment History"
            >
              <History className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Config */}
          <div className="w-[380px] shrink-0 min-h-0 border-r border-border-default flex flex-col overflow-hidden">
            {/* Mode tabs */}
            <div className="flex gap-2 px-3 pt-3 shrink-0 border-b border-border-default">
              <button
                onClick={() => setPanelMode('sweep')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] border-b-2 transition-colors ${
                  panelMode === 'sweep'
                    ? 'border-accent text-content-primary'
                    : 'border-transparent text-content-muted hover:text-content-secondary'
                }`}
              >
                <FlaskConical className="w-3 h-3" /> Sweep
              </button>
              <button
                onClick={() => setPanelMode('optimize')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] border-b-2 transition-colors ${
                  panelMode === 'optimize'
                    ? 'border-accent text-content-primary'
                    : 'border-transparent text-content-muted hover:text-content-secondary'
                }`}
              >
                <Sparkles className="w-3 h-3" /> AI Optimize
              </button>
            </div>

            {/* Sweep panel */}
            {panelMode === 'sweep' && (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                  {/* Experiment Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-content-secondary uppercase tracking-wider">Experiment Name</label>
                      <button
                        onClick={() => setShowPresets(!showPresets)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-accent/10 border border-accent/20 text-accent-text text-[9px] hover:bg-accent/20 transition-colors"
                      >
                        <Zap className="w-2.5 h-2.5" /> Presets
                      </button>
                    </div>
                    <input
                      type="text"
                      value={experimentName}
                      onChange={(e) => setExperimentName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-default rounded-sm text-xs text-content-primary focus:outline-none focus:border-accent"
                    />

                    {showPresets && (
                      <div className="mt-2 mb-1 p-2 rounded-sm bg-surface-2/40 border border-border-default/30 space-y-1.5 max-h-[240px] overflow-y-auto">
                        <p className="text-[9px] text-content-secondary uppercase tracking-wider px-1">
                          Quick Experiments ({compatiblePresets.length}/{EXPERIMENT_PRESETS.length})
                        </p>
                        {compatiblePresets.length === 0 ? (
                          <p className="text-[10px] text-content-muted px-1">No compatible presets for this workflow</p>
                        ) : (
                          compatiblePresets.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => handleApplyPreset(preset)}
                              className="w-full flex items-start gap-2 px-2 py-1.5 rounded-sm hover:bg-surface-3/30 text-left transition-colors group"
                            >
                              <span className="text-sm shrink-0 mt-0.5">{preset.icon}</span>
                              <div className="min-w-0">
                                <div className="text-[11px] text-content-primary group-hover:text-accent-text transition-colors">{preset.name}</div>
                                <div className="text-[9px] text-content-muted">{preset.description}</div>
                              </div>
                              <span className={`shrink-0 text-[8px] px-1.5 py-0.5 rounded mt-0.5 ${
                                preset.category === 'quality' ? 'bg-state-success-muted text-state-success'
                                  : preset.category === 'speed' ? 'bg-state-info-muted text-state-info'
                                    : preset.category === 'style' ? 'bg-accent/10 text-accent-text'
                                      : 'bg-state-warning/10 text-orange-400'
                              }`}>{preset.category}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sweep Mode */}
                  <div>
                    <label className="text-[10px] text-content-secondary uppercase tracking-wider">Sweep Mode</label>
                    <div className="flex gap-1.5 mt-1">
                      <button
                        onClick={() => setSweepMode('grid')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-sm text-[11px] border transition-colors ${
                          sweepMode === 'grid'
                            ? 'bg-accent/10 border-accent/20 text-accent-text'
                            : 'bg-surface-2/30 border-border-default/30 text-content-secondary hover:text-content-secondary'
                        }`}
                      >
                        <Grid3X3 className="w-3 h-3" />
                        Grid (all combos)
                      </button>
                      <button
                        onClick={() => setSweepMode('zip')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-sm text-[11px] border transition-colors ${
                          sweepMode === 'zip'
                            ? 'bg-accent/10 border-accent/20 text-accent-text'
                            : 'bg-surface-2/30 border-border-default/30 text-content-secondary hover:text-content-secondary'
                        }`}
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        Zip (parallel)
                      </button>
                    </div>
                  </div>

                  {/* Sweep Parameters */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-content-secondary uppercase tracking-wider">Sweep Parameters</label>
                      <button
                        onClick={handleSmartSuggest}
                        disabled={!workflow || !onCallAI || smartSuggestLoading}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-accent/10 border border-accent/20 text-accent-text text-[9px] hover:bg-accent/20 disabled:opacity-30 transition-colors"
                      >
                        {smartSuggestLoading
                          ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          : <Sparkles className="w-2.5 h-2.5" />}
                        Smart Suggest
                      </button>
                    </div>

                    {sweepParams.length === 0 && (
                      <p className="text-[10px] text-content-faint mt-1.5 italic">
                        No parameters added yet. Pick a widget from the list below.
                      </p>
                    )}

                    <div className="space-y-2 mt-1.5">
                      {sweepParams.map((param) => (
                        <SweepParamConfig
                          key={param.id}
                          param={param}
                          onUpdate={handleUpdateParam}
                          onRemove={handleRemoveParam}
                          reason={smartSuggestReasons[param.id]}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Widget Picker */}
                  <div>
                    <label className="text-[10px] text-content-secondary uppercase tracking-wider">Available Widgets</label>
                    {!workflow ? (
                      <p className="text-[10px] text-content-faint mt-1 italic">Generate a workflow first.</p>
                    ) : sweepableWidgets.length === 0 ? (
                      <p className="text-[10px] text-content-faint mt-1 italic">No sweepable widgets found.</p>
                    ) : (
                      <div className="mt-1.5 space-y-1 max-h-[250px] overflow-y-auto">
                        {Array.from(widgetsByNode.entries()).map(([nodeId, group]) => (
                          <WidgetNodeGroup
                            key={nodeId}
                            nodeId={nodeId}
                            label={group.label}
                            type={group.type}
                            widgets={group.widgets}
                            onAdd={handleAddParam}
                            addedWidgets={sweepParams}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sweep run bar */}
                <div className="shrink-0 p-3 border-t border-border-default space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-content-secondary">
                    <span>{variants.length} variant{variants.length !== 1 ? 's' : ''} to run</span>
                    {sweepParams.length > 1 && sweepMode === 'grid' && (
                      <span className="text-accent-text/60">
                        {sweepParams.map((p) => expandSweepValues(p).length).join(' × ')} = {variants.length}
                      </span>
                    )}
                  </div>

                  {isSweepRunning ? (
                    <button
                      onClick={handleCancel}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-state-error hover:bg-state-error/90 text-accent-contrast text-xs transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Cancel Experiment
                    </button>
                  ) : (
                    <button
                      onClick={handleRun}
                      disabled={variants.length === 0 || !comfyuiUrl}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:hover:bg-accent text-accent-contrast text-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run Experiment ({variants.length} variants)
                    </button>
                  )}
                </div>
              </>
            )}
            {/* Optimize panel */}
            {panelMode === 'optimize' && (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 scrollbar-thin">
                  <div className="p-3 rounded-sm bg-accent/[0.08] border border-accent/15">
                    <p className="text-[11px] text-accent-text">
                      AI analyzes your workflow and generates an optimized version. Run both and compare.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-content-secondary uppercase tracking-wider">Optimization Strategy</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {OPTIMIZER_STRATEGIES.map((strategy) => (
                        <button
                          key={strategy.id}
                          onClick={() => setSelectedStrategy(strategy)}
                          className={`px-2.5 py-2 rounded-sm text-left transition-all text-xs ${
                            selectedStrategy.id === strategy.id
                              ? 'bg-accent-muted border border-accent/40 text-accent-text'
                              : 'bg-surface-secondary/40 border border-border-subtle text-content-muted hover:bg-surface-secondary hover:text-content-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{strategy.icon}</span>
                            <span className="font-medium truncate">{strategy.name}</span>
                          </div>
                          <p className="text-[10px] text-content-faint mt-0.5 line-clamp-1">{strategy.shortDescription}</p>
                        </button>
                      ))}
                    </div>

                    {selectedStrategy.id === 'custom' && (
                      <textarea
                        value={customGoal}
                        onChange={(e) => setCustomGoal(e.target.value)}
                        placeholder="Describe your optimization goal... e.g. Optimize for anime art style with vivid colors"
                        className="w-full px-3 py-2 rounded-sm bg-surface-2 border border-border-default text-content-primary text-xs placeholder-text-tertiary resize-none h-16 focus:border-accent focus:outline-none"
                      />
                    )}
                  </div>

                  {optimizeStatus === 'idle' && (
                    <div className="text-center py-6">
                      <Sparkles className="w-8 h-8 text-accent-text/30 mx-auto" />
                      <p className="text-xs text-content-secondary mt-3">Click below to optimize</p>
                    </div>
                  )}
                  {optimizeStatus === 'analyzing' && (
                    <div className="text-center py-6">
                      <Loader2 className="w-6 h-6 text-accent-text mx-auto animate-spin" />
                      <p className="text-xs text-accent-text mt-3">AI analyzing workflow...</p>
                    </div>
                  )}
                  {optimizeStatus === 'ready' && optimizationResult && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-content-muted">
                        <span>{lastOptimizeStrategy.icon}</span>
                        <span>Optimized for: {lastOptimizeStrategy.name}</span>
                      </div>
                      <div className="p-3 rounded-sm bg-surface-2/30 border border-border-default/30">
                        <h4 className="text-[10px] text-content-secondary uppercase tracking-wider mb-2">Changes</h4>
                        <div className="text-[11px] text-content-primary whitespace-pre-wrap">{optimizationResult.changesDescription}</div>
                      </div>

                      {optimizeStatus === 'ready' && optimizationResult?.optimizedWorkflow && (
                        <div className="space-y-1.5">
                          <button
                            onClick={() => setShowDiffDetails(!showDiffDetails)}
                            className="flex items-center gap-1.5 text-[10px] text-content-secondary hover:text-content-secondary transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {showDiffDetails ? 'Hide' : 'Show'} Parameter Diff
                            <span className="text-[9px] text-content-muted">
                              ({Array.isArray((optimizationResult.optimizedWorkflow as any).nodes)
                                ? (optimizationResult.optimizedWorkflow as any).nodes.length
                                : Object.keys(optimizationResult.optimizedWorkflow as any).length} nodes)
                            </span>
                          </button>
                          {showDiffDetails && (
                            <WorkflowDiffView
                              originalWorkflow={workflow as unknown as Record<string, any>}
                              optimizedWorkflow={optimizationResult.optimizedWorkflow as unknown as Record<string, any>}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {optimizeStatus === 'error' && (
                    <div className="p-3 rounded-sm bg-state-error-muted border border-state-error/20">
                      <p className="text-[11px] text-state-error/80">{optimizeError}</p>
                    </div>
                  )}
                </div>

                {/* Optimize run bar */}
                <div className="shrink-0 p-3 border-t border-border-default space-y-1.5">
                  {(optimizeStatus === 'idle' || optimizeStatus === 'error') && (
                    <button
                      onClick={handleOptimize}
                      disabled={!workflow || !onCallAI}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-accent hover:bg-accent-hover disabled:opacity-30 text-accent-contrast text-xs transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Analyze & Optimize
                    </button>
                  )}
                  {optimizeStatus === 'ready' && (
                    <>
                      <button
                        onClick={() => {
                          if (!optimizationResult?.optimizedWorkflow) return;
                          onApplyOptimized?.(optimizationResult.optimizedWorkflow);
                          toast.success('Optimized workflow applied to canvas');
                          onClose();
                        }}
                        disabled={!optimizationResult?.optimizedWorkflow}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-accent hover:bg-accent-hover disabled:opacity-30 text-accent-contrast text-xs transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5" /> Apply to Workflow
                      </button>
                      <button
                        onClick={handleRunABCompare}
                        disabled={!optimizationResult?.optimizedWorkflow || abCompareRunning}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-state-warning hover:bg-state-warning/90 disabled:opacity-30 text-accent-contrast text-xs transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" /> Run A/B Compare
                      </button>
                      <button
                        onClick={() => setOptimizeStatus('idle')}
                        className="w-full text-center text-[10px] text-content-muted hover:text-content-secondary transition-colors"
                      >
                        Re-analyze
                      </button>
                    </>
                  )}
                  {optimizeStatus === 'analyzing' && (
                    <div className="text-center text-[10px] text-content-muted py-2">Analyzing...</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex-1 relative min-h-0 flex flex-col overflow-hidden">
            {showHistory && (
              <div className="absolute inset-0 z-20 bg-surface-primary/95 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                  <h3 className="text-sm text-content-primary">Experiment History</h3>
                  <div className="flex items-center gap-2">
                    {experimentHistory.length > 0 && (
                      <button
                        onClick={() => { clearExperimentHistory(); setExperimentHistory([]); }}
                        className="text-[10px] text-state-error/50 hover:text-state-error flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear All
                      </button>
                    )}
                    <button onClick={() => setShowHistory(false)} className="text-content-secondary hover:text-content-secondary">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {experimentHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-8 h-8 text-content-faint mx-auto" />
                      <p className="text-xs text-content-muted mt-2">No experiments yet</p>
                    </div>
                  ) : (
                    experimentHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 p-2 rounded-sm bg-surface-secondary border border-border-default hover:border-border-strong transition-colors">
                        {entry.bestImageUrl ? (
                          <img src={entry.bestImageUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-surface-2/50 shrink-0 flex items-center justify-center">
                            <FlaskConical className="w-4 h-4 text-content-faint" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-content-primary truncate">{entry.name}</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded ${entry.mode === 'sweep' ? 'bg-accent/10 text-accent-text' : 'bg-accent/10 text-accent-text'}`}>
                              {entry.mode}
                            </span>
                          </div>
                          <div className="text-[9px] text-content-muted flex items-center gap-2 mt-0.5">
                            <span>{entry.variantCount} variants</span>
                            <span>{(entry.totalDurationMs / 1000).toFixed(1)}s total</span>
                            <span className="truncate">{entry.paramSummary}</span>
                          </div>
                          <div className="text-[9px] text-content-faint mt-0.5">
                            {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Right: Results */}
            {panelMode === 'optimize' && (abCompareResult || abCompareRunning) ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {abCompareRunning && abCompareProgress && (
                <div className="shrink-0 px-4 py-2 border-b border-border-default bg-surface-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-content-secondary">
                      <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                      Running {abCompareProgress.currentSide}...
                    </span>
                    <button onClick={() => abCancelFn?.()} className="text-[10px] text-state-error/60 hover:text-state-error">
                      Cancel
                    </button>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-accent/60 rounded-sm transition-all"
                      style={{ width: `${abCompareProgress.currentSide === 'original' ? (abCompareProgress.execProgress?.percentage || 0) / 2 : 50 + (abCompareProgress.execProgress?.percentage || 0) / 2}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin">
                {rateableImages.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <RatingModeSelector
                      selectedMode={selectedRatingMode}
                      onSelectMode={setSelectedRatingMode}
                    />
                    <button
                      onClick={handleRateImages}
                      disabled={isRating || !onCallAI}
                      className="w-full px-4 py-2 rounded-sm bg-accent/[0.12] border border-accent/30 text-accent-text hover:bg-accent/[0.14] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isRating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rating images...
                        </>
                      ) : (
                        <>?? Rate Images with AI</>
                      )}
                    </button>
                    {imageRatings?.success && (
                      <div className="mt-3 space-y-2">
                        <div className="px-3 py-2 rounded-sm bg-state-success-muted border border-state-success/30 text-state-success text-sm">
                          <span className="font-medium">AI Recommends:</span> {imageRatings.bestVariant}
                          <p className="text-xs text-state-success/70 mt-1">{imageRatings.summary}</p>
                        </div>
                        <button
                          onClick={() => handleAutoPickBest(imageRatings)}
                          className="w-full px-4 py-2.5 rounded-sm bg-state-success hover:bg-state-success/90 text-accent-contrast font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          ? Auto-Pick Best ({imageRatings.bestVariant})
                        </button>
                        <div className="mt-3 space-y-2">
                          <h4 className="text-xs font-medium text-content-muted uppercase tracking-wider">
                            AI Ratings
                          </h4>
                          {imageRatings.ratings
                            .slice()
                            .sort((a, b) => a.rank - b.rank)
                            .map((rating) => (
                              <RatingBreakdown
                                key={`${rating.variantLabel}-${rating.rank}`}
                                rating={rating}
                                ratingMode={selectedRatingMode}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {/* Original */}
                  <div>
                    <h3 className="text-xs text-content-secondary mb-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-text-secondary" />Original</h3>
                    <div className="rounded-sm border border-border-default bg-surface-1 aspect-square overflow-hidden flex items-center justify-center relative">
                      {abCompareResult?.original.execution.images?.[0] ? (
                        <img src={abCompareResult.original.execution.images[0].url} alt="Original" className="w-full h-full object-contain cursor-pointer" onClick={() => setLightboxUrl(abCompareResult.original.execution.images[0].url)} />
                      ) : <Loader2 className="w-8 h-8 text-content-faint animate-spin" />}
                      {(() => {
                        const url = abCompareResult?.original.execution.images?.[0]?.url;
                        const rating = getImageRating('Original', url);
                        if (!rating) return null;
                        return (
                          <div
                            className={`absolute top-2 right-2 px-2 py-1 rounded-sm text-xs font-bold ${getRatingBadgeClass(rating.weightedScore ?? rating.scores.overall)}`}
                            title={rating.reasoning}
                          >
                            {rating.rank === 1 ? '?? ' : ''}
                            {(rating.weightedScore ?? rating.scores.overall)}/10
                          </div>
                        );
                      })()}
                    </div>
                    {abCompareResult?.original.execution && <p className="text-[9px] text-content-muted mt-1">{abCompareResult.original.execution.durationMs > 0 ? `${(abCompareResult.original.execution.durationMs / 1000).toFixed(1)}s` : ''}</p>}
                  </div>
                  {/* Optimized */}
                  <div>
                    <h3 className="text-xs text-accent-text mb-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-accent" />AI Optimized</h3>
                    <div className="rounded-sm border border-accent/20 bg-accent/[0.08] aspect-square overflow-hidden flex items-center justify-center relative">
                      {abCompareResult?.optimized.execution.images?.[0] ? (
                        <img src={abCompareResult.optimized.execution.images[0].url} alt="Optimized" className="w-full h-full object-contain cursor-pointer" onClick={() => setLightboxUrl(abCompareResult.optimized.execution.images[0].url)} />
                      ) : <Loader2 className="w-8 h-8 text-accent animate-spin" />}
                      {(() => {
                        const url = abCompareResult?.optimized.execution.images?.[0]?.url;
                        const rating = getImageRating('AI Optimized', url);
                        if (!rating) return null;
                        return (
                          <div
                            className={`absolute top-2 right-2 px-2 py-1 rounded-sm text-xs font-bold ${getRatingBadgeClass(rating.weightedScore ?? rating.scores.overall)}`}
                            title={rating.reasoning}
                          >
                            {rating.rank === 1 ? '?? ' : ''}
                            {(rating.weightedScore ?? rating.scores.overall)}/10
                          </div>
                        );
                      })()}
                    </div>
                    {abCompareResult?.optimized.execution && <p className="text-[9px] text-accent-text mt-1">{abCompareResult.optimized.execution.durationMs > 0 ? `${(abCompareResult.optimized.execution.durationMs / 1000).toFixed(1)}s` : ''}</p>}
                  </div>
                </div>
                {abCompareResult && optimizationResult?.changesDescription && (
                  <div className="mt-4 p-3 rounded-sm bg-accent/[0.08] border border-accent/15">
                    <h4 className="text-[10px] text-accent-text uppercase tracking-wider mb-1.5">Changes Applied</h4>
                    <div className="text-[11px] text-content-primary whitespace-pre-wrap">{optimizationResult.changesDescription}</div>
                  </div>
                )}
                {abCompareResult?.optimized.execution.success && onAcceptOptimized && optimizationResult?.optimizedWorkflow && (
                  <div className="mt-3 flex justify-end">
                    <button onClick={() => onAcceptOptimized(optimizationResult.optimizedWorkflow)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-accent hover:bg-accent-hover text-accent-contrast text-xs transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept Optimized
                    </button>
                  </div>
                )}
              </div>
            </div>
            ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Progress bar */}
              {progress && isSweepRunning && (
                <div className="shrink-0 px-4 py-2 border-b border-border-default bg-surface-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-content-secondary">
                      <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                      Running variant {progress.currentVariantIndex + 1}/{progress.totalVariants}
                    </span>
                    <span className="text-[10px] text-accent-text/60">
                      {progress.currentVariantLabel}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-accent/60 rounded-sm transition-all duration-300"
                      style={{ width: `${((progress.completedVariants + (progress.currentExecProgress?.percentage || 0) / 100) / Math.max(progress.totalVariants, 1)) * 100}%` }}
                    />
                  </div>
                  {progress.currentExecProgress?.currentNodeClass && (
                    <span className="text-[9px] text-content-muted mt-0.5 block">
                      {progress.currentExecProgress.currentNodeClass}
                      {progress.currentExecProgress.step != null && progress.currentExecProgress.totalSteps
                        ? ` (${progress.currentExecProgress.step}/${progress.currentExecProgress.totalSteps})`
                        : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Results grid */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin">
                {rateableImages.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <RatingModeSelector
                      selectedMode={selectedRatingMode}
                      onSelectMode={setSelectedRatingMode}
                    />
                    <button
                      onClick={handleRateImages}
                      disabled={isRating || !onCallAI}
                      className="w-full px-4 py-2 rounded-sm bg-accent/[0.12] border border-accent/30 text-accent-text hover:bg-accent/[0.14] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isRating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rating images...
                        </>
                      ) : (
                        <>?? Rate Images with AI</>
                      )}
                    </button>
                    {imageRatings?.success && (
                      <div className="mt-3 space-y-2">
                        <div className="px-3 py-2 rounded-sm bg-state-success-muted border border-state-success/30 text-state-success text-sm">
                          <span className="font-medium">AI Recommends:</span> {imageRatings.bestVariant}
                          <p className="text-xs text-state-success/70 mt-1">{imageRatings.summary}</p>
                        </div>
                        <button
                          onClick={() => handleAutoPickBest(imageRatings)}
                          className="w-full px-4 py-2.5 rounded-sm bg-state-success hover:bg-state-success/90 text-accent-contrast font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          ? Auto-Pick Best ({imageRatings.bestVariant})
                        </button>
                        <div className="mt-3 space-y-2">
                          <h4 className="text-xs font-medium text-content-muted uppercase tracking-wider">
                            AI Ratings
                          </h4>
                          {imageRatings.ratings
                            .slice()
                            .sort((a, b) => a.rank - b.rank)
                            .map((rating) => (
                              <RatingBreakdown
                                key={`${rating.variantLabel}-${rating.rank}`}
                                rating={rating}
                                ratingMode={selectedRatingMode}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {results.length === 0 && !isSweepRunning ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-3 max-w-md">
                      <FlaskConical className="w-10 h-10 text-accent-text/20 mx-auto" />
                      <p className="text-content-secondary text-sm">Configure sweep parameters and run the experiment</p>
                      <p className="text-content-faint text-xs">
                        Results will appear here in a comparison grid. Each variant runs sequentially
                        on your ComfyUI with different parameter values.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {results.map((r, idx) => (
                      <ResultCard
                        key={idx}
                        result={r}
                        onImageClick={setLightboxUrl}
                        rating={getImageRating(r.variant.label, r.execution.images?.[0]?.url)}
                      />
                    ))}

                    {/* Placeholder cards for pending variants */}
                    {isSweepRunning && Array.from({
                      length: Math.min(Math.max(variants.length - results.length, 0), 8)
                    }).map((_, idx) => (
                      <div key={`pending-${idx}`} className="rounded-sm border border-border-default bg-surface-1 aspect-square flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-content-muted animate-spin" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-[60] bg-surface-overlay flex items-center justify-center cursor-pointer"
            onClick={() => setLightboxUrl(null)}
          >
            <img
              src={lightboxUrl}
              alt="Experiment result"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-sm shadow-2xl"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 text-content-muted hover:text-content-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function SweepParamConfig({
  param,
  onUpdate,
  onRemove,
  reason,
}: {
  param: SweepParam;
  onUpdate: (id: string, updates: Partial<SweepParam>) => void;
  onRemove: (id: string) => void;
  reason?: string;
}) {
  const valueCount = expandSweepValues(param).length;

  return (
    <div className="p-2 rounded-sm bg-surface-2/30 border border-border-default/30 space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <span className="text-[10px] text-accent-text/70 font-mono">{param.widgetName}</span>
          <span className="text-[9px] text-content-muted ml-1.5">on {param.nodeLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-content-muted bg-surface-2 px-1 rounded">{valueCount} val{valueCount !== 1 ? 's' : ''}</span>
          <button onClick={() => onRemove(param.id)} className="text-content-faint hover:text-state-error transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {reason && <p className="text-[9px] text-accent-text italic">{reason}</p>}

      {/* Type selector */}
      <div className="flex gap-1">
        {['number-range', 'number-list', 'string-list'].map((t) => (
          <button
            key={t}
            onClick={() => onUpdate(param.id, { type: t as SweepValueType })}
            className={`px-1.5 py-0.5 rounded text-[8px] border transition-colors ${
              param.type === t
                ? 'bg-accent/10 border-accent/20 text-accent-text'
                : 'bg-surface-2/30 border-border-default/20 text-content-muted hover:text-content-secondary'
            }`}
          >
            {t === 'number-range' ? 'Range' : t === 'number-list' ? 'Numbers' : 'Values'}
          </button>
        ))}
      </div>

      {/* Value inputs */}
      {param.type === 'number-range' ? (
        <div className="flex items-center gap-1.5">
          <label className="text-[9px] text-content-muted shrink-0">From</label>
          <input
            type="number"
            value={param.rangeStart ?? 0}
            onChange={(e) => onUpdate(param.id, { rangeStart: parseFloat(e.target.value) || 0 })}
            className="w-16 px-1.5 py-0.5 bg-surface-2/50 border border-border-default/40 rounded text-[10px] text-content-primary focus:outline-none focus:border-accent"
          />
          <label className="text-[9px] text-content-muted shrink-0">To</label>
          <input
            type="number"
            value={param.rangeEnd ?? 10}
            onChange={(e) => onUpdate(param.id, { rangeEnd: parseFloat(e.target.value) || 0 })}
            className="w-16 px-1.5 py-0.5 bg-surface-2/50 border border-border-default/40 rounded text-[10px] text-content-primary focus:outline-none focus:border-accent"
          />
          <label className="text-[9px] text-content-muted shrink-0">Step</label>
          <input
            type="number"
            value={param.rangeStep ?? 1}
            onChange={(e) => onUpdate(param.id, { rangeStep: parseFloat(e.target.value) || 1 })}
            className="w-14 px-1.5 py-0.5 bg-surface-2/50 border border-border-default/40 rounded text-[10px] text-content-primary focus:outline-none focus:border-accent"
            min={0.01}
            step={0.1}
          />
        </div>
      ) : (
        <div>
          <textarea
            value={(param.values ?? []).join('\n')}
            onChange={(e) => {
              const vals = e.target.value.split('\n').map((v) => v.trim()).filter(Boolean);
              const parsed = param.type === 'number-list'
                ? vals.map((v) => parseFloat(v)).filter((v) => !isNaN(v))
                : vals;
              onUpdate(param.id, { values: parsed });
            }}
            placeholder={param.type === 'number-list' ? 'One number per line' : 'One value per line'}
            rows={3}
            className="w-full px-2 py-1 bg-surface-2/50 border border-border-default/40 rounded text-[10px] text-content-primary font-mono focus:outline-none focus:border-accent resize-none"
          />
          <span className="text-[8px] text-content-faint">One value per line</span>
        </div>
      )}
    </div>
  );
}

function WidgetNodeGroup({
  nodeId,
  label,
  type,
  widgets,
  onAdd,
  addedWidgets,
}: {
  nodeId: number;
  label: string;
  type: string;
  widgets: SweepableWidget[];
  onAdd: (w: SweepableWidget) => void;
  addedWidgets: SweepParam[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-sm border border-border-default/40 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-surface-2/30 transition-colors text-left"
      >
        {isOpen
          ? <ChevronDown className="w-2.5 h-2.5 text-content-muted" />
          : <ChevronRight className="w-2.5 h-2.5 text-content-muted" />
        }
        <span className="text-[10px] text-content-primary flex-1 truncate">{label}</span>
        <span className="text-[8px] text-content-muted font-mono">{type}</span>
        <span className="text-[8px] text-content-faint">{widgets.length}</span>
      </button>

      {isOpen && (
        <div className="border-t border-border-default/30">
          {widgets.map((w, idx) => {
            const isAdded = addedWidgets.some((p) => p.nodeId === w.nodeId && p.widgetName === w.widgetName);
            return (
              <div
                key={`${w.widgetName}-${idx}`}
                className="flex items-center gap-1.5 px-3 py-1 hover:bg-surface-2/20 transition-colors"
              >
                <span className="text-[10px] text-content-secondary flex-1 font-mono truncate">{w.widgetName}</span>
                <span className="text-[9px] text-content-faint truncate max-w-[60px]">
                  {formatVal(w.currentValue)}
                </span>
                <button
                  onClick={() => onAdd(w)}
                  disabled={isAdded}
                  className={`shrink-0 p-0.5 rounded transition-colors ${
                    isAdded
                      ? 'text-accent/50 cursor-default'
                      : 'text-content-muted hover:text-accent-text'
                  }`}
                  title={isAdded ? 'Already added' : 'Add to sweep'}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatVal(val: any): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') return Number.isInteger(val) ? String(val) : val.toFixed(2);
  if (typeof val === 'string') return val.length > 12 ? val.slice(0, 10) + '…' : val;
  return String(val);
}

function RatingModeSelector({
  selectedMode,
  onSelectMode,
}: {
  selectedMode: RatingMode;
  onSelectMode: (mode: RatingMode) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-content-faint uppercase tracking-wider">Rating Focus</label>
      <div className="flex flex-wrap gap-1">
        {RATING_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode)}
            title={mode.description}
            className={`px-2 py-1 rounded text-[10px] transition-all border ${
              selectedMode.id === mode.id
                ? 'bg-accent/[0.14] text-content-primary border-accent/30'
                : 'bg-surface-secondary/40 text-content-faint border-border-subtle hover:text-content-secondary'
            }`}
          >
            {mode.icon} {mode.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function RatingBreakdown({
  rating,
  ratingMode,
}: {
  rating: ImageRating;
  ratingMode: RatingMode;
}) {
  const weightedScore = calculateWeightedScore(rating.scores, ratingMode);
  const criteria = ratingMode.criteria.map((criterion) => ({
    ...criterion,
    score: rating.scores[criterion.key],
  }));

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-state-success';
    if (score >= 6) return 'bg-accent';
    if (score >= 4) return 'bg-state-warning';
    return 'bg-state-error';
  };

  return (
    <div className="space-y-1.5 p-2 rounded-sm bg-surface-inset/80">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-xs font-medium text-content-secondary">
            {rating.rank === 1 ? '?? ' : ''}{rating.variantLabel}
          </span>
          <p className="text-[10px] text-content-faint mt-0.5">
            Weighted: {weightedScore}/10 ({ratingMode.name})
          </p>
        </div>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          weightedScore >= 8
            ? 'bg-state-success-muted text-state-success'
            : weightedScore >= 6
              ? 'bg-accent/20 text-accent-text'
              : 'bg-state-error-muted text-state-error'
        }`}>
          {weightedScore}/10
        </span>
      </div>

      {criteria.map(({ key, label, score, weight, description }) => {
        const numericScore = Number(score);
        const hasScore = Number.isFinite(numericScore);
        const isHighPriority = weight > 1.2;
        return (
          <div key={key} className="flex items-center gap-2" title={`${description} (weight ${weight.toFixed(1)}x)`}>
            <span className={`text-[10px] w-20 shrink-0 ${isHighPriority ? 'text-accent-text font-medium' : 'text-content-muted'}`}>
              {isHighPriority ? '? ' : ''}{label}
            </span>
          <div className="flex-1 h-1.5 bg-border-default rounded-sm overflow-hidden">
            <div
              className={`h-full rounded-sm transition-all ${getScoreColor(hasScore ? numericScore : 0)}`}
              style={{ width: `${hasScore ? numericScore * 10 : 0}%` }}
            />
          </div>
            <span className="text-[10px] text-content-muted w-6 text-right">{hasScore ? numericScore : '-'}</span>
          </div>
        );
      })}

      {rating.reasoning && (
        <p className="text-[10px] text-content-faint mt-1 italic">{rating.reasoning}</p>
      )}
    </div>
  );
}

function ResultCard({
  result,
  onImageClick,
  rating,
}: {
  result: ExperimentRunResult;
  onImageClick: (url: string) => void;
  rating?: ImageRating | null;
}) {
  const { variant, execution } = result;
  const firstImage = execution.images?.[0];

  return (
    <div className={`rounded-sm border overflow-hidden ${
      execution.success
        ? 'border-border-subtle bg-surface-secondary/40'
        : 'border-state-error/20 bg-state-error-muted'
    }`}>
      {/* Image or error */}
      <div className="aspect-square bg-surface-1 relative overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage.url}
            alt={variant.label}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onImageClick(firstImage.url)}
            loading="lazy"
          />
        ) : execution.success ? (
          <div className="w-full h-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-state-success/30" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3">
            <div className="text-center">
              <AlertCircle className="w-5 h-5 text-state-error/50 mx-auto mb-1" />
              <p className="text-[9px] text-state-error/60 line-clamp-3">{execution.error}</p>
            </div>
          </div>
        )}

        {/* Multi-image badge */}
        {execution.images.length > 1 && (
          <span className="absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded bg-surface-overlay text-[8px] text-content-secondary">
            +{execution.images.length - 1}
          </span>
        )}

        {rating && (
          <div
            className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${getRatingBadgeClass(rating.weightedScore ?? rating.scores.overall)}`}
            title={rating.reasoning}
          >
            {rating.rank === 1 ? '?? ' : ''}
            {(rating.weightedScore ?? rating.scores.overall)}/10
          </div>
        )}

        {/* Expand button */}
        {firstImage && (
          <button
            onClick={() => onImageClick(firstImage.url)}
            className="absolute top-1.5 left-1.5 p-1 rounded bg-surface-overlay text-content-muted hover:text-content-primary opacity-0 hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Params label */}
      <div className="px-2 py-1.5 border-t border-border-default/30">
        <p className="text-[9px] text-accent-text/70 font-mono truncate" title={variant.label}>
          {variant.label}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[8px] text-content-faint">
            #{variant.index + 1}
          </span>
          {execution.durationMs > 0 && (
            <span className="text-[8px] text-content-faint">
              {(execution.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}





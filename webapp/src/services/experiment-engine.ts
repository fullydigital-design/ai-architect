/**
 * Experiment Engine — Phase 5
 *
 * Generates workflow variants from parameter sweep configs, executes them
 * sequentially on ComfyUI, and collects results in a comparison grid.
 */

import type { ComfyUIWorkflow } from '../types/comfyui';
import { executeWorkflow, type ExecutionResult, type ExecutionImage, type ProgressCallback } from './comfyui-execution';
import { getLiveNodeSchema } from './comfyui-backend';
import { NODE_REGISTRY } from '../data/node-registry';

// ── Types ────────────────────────────────────────────────────────────────────

export type SweepValueType = 'number-range' | 'number-list' | 'string-list';

export interface SweepParam {
  /** Unique ID */
  id: string;
  /** Target node ID in the workflow */
  nodeId: number;
  /** Node class type (for display) */
  nodeType: string;
  /** Node title/label */
  nodeLabel: string;
  /** Widget name (e.g. 'cfg', 'steps', 'seed', 'sampler_name') */
  widgetName: string;
  /** Index in widgets_values */
  widgetIndex: number;
  /** Type of sweep */
  type: SweepValueType;
  /** For number-range: start, end, step */
  rangeStart?: number;
  rangeEnd?: number;
  rangeStep?: number;
  /** For number-list / string-list: explicit values */
  values?: (string | number)[];
}

export interface ExperimentConfig {
  /** Name for this experiment */
  name: string;
  /** Parameters to sweep */
  params: SweepParam[];
  /** If multiple params, sweep mode: 'grid' (all combos) or 'zip' (parallel lists) */
  mode: 'grid' | 'zip';
}

export interface ExperimentVariant {
  /** Variant index */
  index: number;
  /** Parameter values for this variant: { paramId → value } */
  paramValues: Record<string, string | number>;
  /** Human-readable label */
  label: string;
  /** The modified workflow */
  workflow: ComfyUIWorkflow;
}

export interface ExperimentRunResult {
  variant: ExperimentVariant;
  execution: ExecutionResult;
}

export interface ExperimentProgress {
  status: 'preparing' | 'running' | 'complete' | 'cancelled' | 'error';
  totalVariants: number;
  completedVariants: number;
  currentVariantIndex: number;
  currentVariantLabel: string;
  /** Current variant's sub-progress from the execution engine */
  currentExecProgress?: {
    step?: number;
    totalSteps?: number;
    percentage?: number;
    currentNodeClass?: string;
  };
  results: ExperimentRunResult[];
  error?: string;
}

export type ExperimentProgressCallback = (progress: ExperimentProgress) => void;

// -- AI Optimizer Types -------------------------------------------------------

export interface OptimizationResult {
  /** The AI-optimized workflow */
  optimizedWorkflow: ComfyUIWorkflow | null;
  /** Markdown description of what changed */
  changesDescription: string;
  /** Raw AI response for debugging */
  rawResponse: string;
  /** Whether parsing succeeded */
  success: boolean;
  /** Error message if parsing failed */
  error?: string;
}

export interface ABCompareResult {
  original: ExperimentRunResult;
  optimized: ExperimentRunResult;
  changesDescription: string;
}

export interface ABCompareProgress {
  status: 'preparing' | 'running-original' | 'running-optimized' | 'complete' | 'cancelled' | 'error';
  /** Which side is currently running */
  currentSide: 'original' | 'optimized';
  /** Sub-progress from execution engine */
  execProgress?: {
    step?: number;
    totalSteps?: number;
    percentage?: number;
    currentNodeClass?: string;
  };
  /** Results so far */
  originalResult?: ExperimentRunResult;
  optimizedResult?: ExperimentRunResult;
  error?: string;
}

export type ABCompareProgressCallback = (progress: ABCompareProgress) => void;

export interface SmartSuggestion {
  nodeId: number;
  widgetName: string;
  reason: string;
  type: SweepValueType;
  rangeStart?: number;
  rangeEnd?: number;
  rangeStep?: number;
  values?: (string | number)[];
}

// ── Sweep Value Generation ───────────────────────────────────────────────────

/**
 * Expand a SweepParam into its list of concrete values.
 */
export function expandSweepValues(param: SweepParam): (string | number)[] {
  if (param.type === 'number-range') {
    const start = param.rangeStart ?? 0;
    const end = param.rangeEnd ?? 10;
    const step = param.rangeStep ?? 1;
    if (step <= 0 || start > end) return [start];
    const values: number[] = [];
    for (let v = start; v <= end + 1e-9; v += step) {
      // Round to avoid floating point drift
      values.push(Math.round(v * 1000) / 1000);
    }
    // Safety cap
    return values.slice(0, 50);
  }
  return param.values ?? [];
}

/**
 * Generate all variant combinations from sweep params.
 */
export function generateVariants(
  baseWorkflow: ComfyUIWorkflow,
  config: ExperimentConfig,
): ExperimentVariant[] {
  const paramValues = config.params.map(p => ({
    param: p,
    values: expandSweepValues(p),
  }));

  // Check for empty sweeps
  if (paramValues.some(pv => pv.values.length === 0)) {
    return [];
  }

  let combos: Array<Record<string, string | number>>;

  if (config.mode === 'zip') {
    // Zip mode: parallel lists (length = min of all lists)
    const minLen = Math.min(...paramValues.map(pv => pv.values.length));
    combos = [];
    for (let i = 0; i < minLen; i++) {
      const combo: Record<string, string | number> = {};
      for (const pv of paramValues) {
        combo[pv.param.id] = pv.values[i];
      }
      combos.push(combo);
    }
  } else {
    // Grid mode: cartesian product (all combinations)
    combos = [{}];
    for (const pv of paramValues) {
      const expanded: Array<Record<string, string | number>> = [];
      for (const existingCombo of combos) {
        for (const val of pv.values) {
          expanded.push({ ...existingCombo, [pv.param.id]: val });
        }
      }
      combos = expanded;
    }
  }

  // Safety cap: max 100 variants
  combos = combos.slice(0, 100);

  return combos.map((combo, index) => {
    // Build a cloned workflow with modified widget values
    const variant = cloneAndModifyWorkflow(baseWorkflow, config.params, combo);

    // Build label
    const labelParts = config.params.map(p => {
      const val = combo[p.id];
      return `${p.widgetName}=${val}`;
    });

    return {
      index,
      paramValues: combo,
      label: labelParts.join(', '),
      workflow: variant,
    };
  });
}

function cloneAndModifyWorkflow(
  base: ComfyUIWorkflow,
  params: SweepParam[],
  values: Record<string, string | number>,
): ComfyUIWorkflow {
  // Deep clone
  const wf: ComfyUIWorkflow = JSON.parse(JSON.stringify(base));

  for (const param of params) {
    const node = wf.nodes.find(n => n.id === param.nodeId);
    if (!node || !node.widgets_values) continue;

    const val = values[param.id];
    if (val !== undefined && param.widgetIndex < node.widgets_values.length) {
      node.widgets_values[param.widgetIndex] = val;
    }
  }

  return wf;
}

// ── Sweepable Parameters Discovery ───────────────────────────────────────────

export interface SweepableWidget {
  nodeId: number;
  nodeType: string;
  nodeLabel: string;
  widgetName: string;
  widgetIndex: number;
  currentValue: any;
  /** Hint for the UI */
  valueType: 'number' | 'string' | 'boolean';
  /** If this is a combo/enum, available options */
  options?: string[];
  min?: number;
  max?: number;
}

/**
 * Discover all sweepable widgets from a workflow — these are node parameters
 * that can be varied in an experiment.
 */
export function discoverSweepableWidgets(workflow: ComfyUIWorkflow): SweepableWidget[] {
  const results: SweepableWidget[] = [];

  for (const node of workflow.nodes) {
    if (!node.widgets_values || node.widgets_values.length === 0) continue;

    const liveSchema = getLiveNodeSchema(node.type);
    const staticSchema = NODE_REGISTRY.get(node.type);
    const schema = liveSchema || staticSchema;

    if (!schema) continue;

    const widgetInputs = schema.inputs.filter(i => i.isWidget);

    let widgetIdx = 0;
    for (let i = 0; i < widgetInputs.length && widgetIdx < node.widgets_values.length; i++) {
      const wInput = widgetInputs[i];
      const val = node.widgets_values[widgetIdx];
      const realWidgetIdx = widgetIdx;
      widgetIdx++;

      // Skip control_after_generate
      if (widgetIdx < node.widgets_values.length) {
        const nextVal = node.widgets_values[widgetIdx];
        if (
          (wInput.name === 'seed' || wInput.name === 'noise_seed') &&
          typeof nextVal === 'string' &&
          ['fixed', 'increment', 'decrement', 'randomize'].includes(nextVal)
        ) {
          widgetIdx++;
        }
      }

      // Skip hidden/control widgets
      if (wInput.name === 'control_after_generate') continue;

      const valueType = typeof val === 'number' ? 'number'
        : typeof val === 'boolean' ? 'boolean'
        : 'string';

      results.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.title || (liveSchema?.display_name) || (staticSchema as any)?.displayName || node.type,
        widgetName: wInput.name,
        widgetIndex: realWidgetIdx,
        currentValue: val,
        valueType,
        options: wInput.options,
        min: wInput.min,
        max: wInput.max,
      });
    }
  }

  return results;
}

// ── Experiment Execution ─────────────────────────────────────────────────────

/**
 * Run an experiment: execute all variants sequentially, reporting progress.
 * Returns a cancel function.
 */
export function runExperiment(
  url: string,
  variants: ExperimentVariant[],
  onProgress: ExperimentProgressCallback,
): { promise: Promise<ExperimentRunResult[]>; cancel: () => void } {
  let cancelled = false;
  let currentCancel: (() => void) | null = null;

  const cancel = () => {
    cancelled = true;
    currentCancel?.();
  };

  const promise = (async (): Promise<ExperimentRunResult[]> => {
    const results: ExperimentRunResult[] = [];

    onProgress({
      status: 'preparing',
      totalVariants: variants.length,
      completedVariants: 0,
      currentVariantIndex: 0,
      currentVariantLabel: '',
      results: [],
    });

    for (let i = 0; i < variants.length; i++) {
      if (cancelled) {
        onProgress({
          status: 'cancelled',
          totalVariants: variants.length,
          completedVariants: results.length,
          currentVariantIndex: i,
          currentVariantLabel: variants[i].label,
          results,
        });
        break;
      }

      const variant = variants[i];

      onProgress({
        status: 'running',
        totalVariants: variants.length,
        completedVariants: results.length,
        currentVariantIndex: i,
        currentVariantLabel: variant.label,
        results,
      });

      const execProgressCallback: ProgressCallback = (execProgress) => {
        onProgress({
          status: 'running',
          totalVariants: variants.length,
          completedVariants: results.length,
          currentVariantIndex: i,
          currentVariantLabel: variant.label,
          currentExecProgress: {
            step: execProgress.step,
            totalSteps: execProgress.totalSteps,
            percentage: execProgress.percentage,
            currentNodeClass: execProgress.currentNodeClass,
          },
          results,
        });
      };

      try {
        const { promise: execPromise, cancel: execCancel } = executeWorkflow(
          url,
          variant.workflow,
          execProgressCallback,
        );
        currentCancel = execCancel;

        const execResult = await execPromise;
        currentCancel = null;

        results.push({ variant, execution: execResult });
      } catch (err: any) {
        results.push({
          variant,
          execution: {
            success: false,
            promptId: '',
            images: [],
            error: err.message || 'Execution failed',
            durationMs: 0,
          },
        });
      }
    }

    if (!cancelled) {
      onProgress({
        status: 'complete',
        totalVariants: variants.length,
        completedVariants: results.length,
        currentVariantIndex: variants.length - 1,
        currentVariantLabel: '',
        results,
      });
    }

    return results;
  })();

  return { promise, cancel };
}

/**
 * Parse the AI optimizer response into a workflow + changes description.
 * Expects json:optimized-workflow and markdown:changes code blocks.
 */
export function parseOptimizerResponse(response: string): OptimizationResult {
  try {
    // Log raw response for debugging
    console.log('[Optimizer] Raw AI response length:', response.length);
    console.log('[Optimizer] Raw AI response preview:', response.substring(0, 500));

    // Try multiple patterns to find the workflow JSON, from most specific to least
    const patterns = [
      /```json:optimized-workflow\s*\n([\s\S]*?)```/,        // exact format we requested
      /```json:optimized[_-]?workflow\s*\n([\s\S]*?)```/i,   // case-insensitive variant
      /```json\s*\n(\{[\s\S]*?"class_type"[\s\S]*?\})\s*```/, // any json block containing class_type
      /```\s*\n(\{[\s\S]*?"class_type"[\s\S]*?\})\s*```/,     // code block without language tag
      /```json\s*\n(\{[\s\S]*?\})\s*```/,                     // any json code block (greedy last resort)
    ];

    let workflowJson: string | null = null;

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        // Verify it's valid JSON and looks like a ComfyUI workflow
        try {
          const parsed = JSON.parse(match[1].trim());
          // Accept API format: { "1": { class_type: "...", inputs: {...} }, ... }
          const isApiFormat = Object.values(parsed).some(
            (v: any) => v && typeof v === 'object' && (v.class_type || v.inputs),
          );
          // Accept graph/native format: { nodes: [...], links?: [...] }
          const isGraphFormat = Array.isArray(parsed.nodes) && parsed.nodes.some(
            (n: any) => n && typeof n === 'object' && (n.type || n.class_type),
          );
          if (isApiFormat || isGraphFormat) {
            workflowJson = match[1].trim();
            console.log('[Optimizer] Found workflow JSON via pattern:', pattern.source.substring(0, 40));
            console.log('[Optimizer] Detected format:', isApiFormat ? 'API' : 'Graph');
            break;
          }
        } catch {
          // Not valid JSON, try next pattern
          continue;
        }
      }
    }

    // Last resort: find any large JSON object in the response that looks like a workflow
    if (!workflowJson) {
      const jsonObjectMatch = response.match(/(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g);
      if (jsonObjectMatch) {
        for (const candidate of jsonObjectMatch) {
          try {
            const parsed = JSON.parse(candidate);
            const keys = Object.keys(parsed);
            const looksLikeApi = Object.values(parsed).some((v: any) => v?.class_type);
            const looksLikeGraph = Array.isArray(parsed.nodes) && parsed.nodes.length > 0;
            if (keys.length >= 2 && (looksLikeApi || looksLikeGraph)) {
              workflowJson = candidate;
              console.log('[Optimizer] Found workflow JSON via raw object scan');
              break;
            }
          } catch {
            // not valid JSON
          }
        }
      }
    }

    if (!workflowJson) {
      console.error('[Optimizer] Could not find workflow JSON. Full response:', response);
      return {
        optimizedWorkflow: null,
        changesDescription: response,
        rawResponse: response,
        success: false,
        error: 'Could not find optimized workflow JSON in AI response. The AI may not have returned a valid workflow. Try again.',
      };
    }

    const wf = JSON.parse(workflowJson);

    // Try to extract changes description
    const changesPatterns = [
      /```markdown:changes\s*\n([\s\S]*?)```/,
      /\*\*What I Changed:?\*\*\s*([\s\S]*?)(?=\n\n|\*\*Expected|$)/i,
      /(?:changes?|improvements?|optimizations?)\s*:?\s*\n((?:[-*]\s+.+\n?)+)/i,
    ];

    let changesDescription = '';
    for (const pattern of changesPatterns) {
      const match = response.match(pattern);
      if (match) {
        changesDescription = match[1].trim();
        break;
      }
    }

    // If no structured changes found, extract text after the JSON block
    if (!changesDescription) {
      const afterJson = response.split('```').pop()?.trim();
      if (afterJson && afterJson.length > 10) {
        changesDescription = afterJson;
      } else {
        changesDescription = 'Optimization applied (see diff for details)';
      }
    }

    return {
      optimizedWorkflow: wf,
      changesDescription,
      rawResponse: response,
      success: true,
    };
  } catch (err: any) {
    console.error('[Optimizer] Parse error:', err, '\nResponse:', response);
    return {
      optimizedWorkflow: null,
      changesDescription: '',
      rawResponse: response,
      success: false,
      error: `Parse failed: ${err.message}`,
    };
  }
}

/**
 * Run A/B comparison: execute original workflow, then optimized workflow,
 * reporting progress for both.
 */
export function runABCompare(
  url: string,
  originalWorkflow: ComfyUIWorkflow,
  optimizedWorkflow: ComfyUIWorkflow,
  changesDescription: string,
  onProgress: ABCompareProgressCallback,
): { promise: Promise<ABCompareResult>; cancel: () => void } {
  let cancelled = false;
  let currentCancel: (() => void) | null = null;

  const cancel = () => {
    cancelled = true;
    currentCancel?.();
  };

  const promise = (async (): Promise<ABCompareResult> => {
    onProgress({
      status: 'preparing',
      currentSide: 'original',
    });

    // Run original workflow
    onProgress({
      status: 'running-original',
      currentSide: 'original',
    });

    let originalResult: ExperimentRunResult;
    try {
      const { promise: execPromise, cancel: execCancel } = executeWorkflow(
        url,
        originalWorkflow,
        (prog) => {
          onProgress({
            status: 'running-original',
            currentSide: 'original',
            execProgress: {
              step: prog.step,
              totalSteps: prog.totalSteps,
              percentage: prog.percentage,
              currentNodeClass: prog.currentNodeClass,
            },
          });
        },
      );
      currentCancel = execCancel;
      const execResult = await execPromise;
      currentCancel = null;

      originalResult = {
        variant: {
          index: 0,
          paramValues: {},
          label: 'Original',
          workflow: originalWorkflow,
        },
        execution: execResult,
      };
    } catch (err: any) {
      originalResult = {
        variant: {
          index: 0,
          paramValues: {},
          label: 'Original',
          workflow: originalWorkflow,
        },
        execution: {
          success: false,
          promptId: '',
          images: [],
          error: err.message || 'Execution failed',
          durationMs: 0,
        },
      };
    }

    if (cancelled) {
      const cancelledOptimizedResult: ExperimentRunResult = {
        variant: {
          index: 1,
          paramValues: {},
          label: 'AI Optimized',
          workflow: optimizedWorkflow,
        },
        execution: {
          success: false,
          promptId: '',
          images: [],
          error: 'Cancelled',
          durationMs: 0,
        },
      };
      onProgress({
        status: 'cancelled',
        currentSide: 'original',
        originalResult,
        optimizedResult: cancelledOptimizedResult,
      });
      return {
        original: originalResult,
        optimized: cancelledOptimizedResult,
        changesDescription,
      };
    }

    // Run optimized workflow
    onProgress({
      status: 'running-optimized',
      currentSide: 'optimized',
      originalResult,
    });

    let optimizedResult: ExperimentRunResult;
    try {
      const { promise: execPromise, cancel: execCancel } = executeWorkflow(
        url,
        optimizedWorkflow,
        (prog) => {
          onProgress({
            status: 'running-optimized',
            currentSide: 'optimized',
            originalResult,
            execProgress: {
              step: prog.step,
              totalSteps: prog.totalSteps,
              percentage: prog.percentage,
              currentNodeClass: prog.currentNodeClass,
            },
          });
        },
      );
      currentCancel = execCancel;
      const execResult = await execPromise;
      currentCancel = null;

      optimizedResult = {
        variant: {
          index: 1,
          paramValues: {},
          label: 'AI Optimized',
          workflow: optimizedWorkflow,
        },
        execution: execResult,
      };
    } catch (err: any) {
      optimizedResult = {
        variant: {
          index: 1,
          paramValues: {},
          label: 'AI Optimized',
          workflow: optimizedWorkflow,
        },
        execution: {
          success: false,
          promptId: '',
          images: [],
          error: err.message || 'Execution failed',
          durationMs: 0,
        },
      };
    }

    if (cancelled) {
      onProgress({
        status: 'cancelled',
        currentSide: 'optimized',
        originalResult,
        optimizedResult,
      });
      return {
        original: originalResult,
        optimized: optimizedResult,
        changesDescription,
      };
    }

    onProgress({
      status: 'complete',
      currentSide: 'optimized',
      originalResult,
      optimizedResult,
    });

    return {
      original: originalResult,
      optimized: optimizedResult,
      changesDescription,
    };
  })().catch((err: any) => {
    onProgress({
      status: 'error',
      currentSide: 'optimized',
      error: err?.message || 'A/B compare failed',
    });
    throw err;
  });

  return { promise, cancel };
}

/**
 * Parse AI smart-suggest response into SweepParam objects.
 */
export function parseSmartSuggestResponse(
  response: string,
  sweepableWidgets: SweepableWidget[],
): { suggestions: SmartSuggestion[]; params: SweepParam[]; error?: string } {
  try {
    const match = response.match(/```json:suggestions\s*\r?\n([\s\S]*?)```/)
      || response.match(/```json\s*\r?\n([\s\S]*?)```/);

    if (!match) {
      return {
        suggestions: [],
        params: [],
        error: 'Could not find suggestions JSON in AI response',
      };
    }

    const parsed = JSON.parse(match[1].trim());
    const suggestions = Array.isArray(parsed) ? parsed as SmartSuggestion[] : [];
    const params: SweepParam[] = [];

    for (const suggestion of suggestions) {
      const exactWidget = sweepableWidgets.find(
        (w) => w.nodeId === suggestion.nodeId && w.widgetName === suggestion.widgetName,
      );
      const fuzzyWidget = exactWidget || sweepableWidgets.find(
        (w) => w.widgetName === suggestion.widgetName,
      );

      if (!fuzzyWidget) continue;

      params.push({
        id: `smart-${Date.now().toString(36)}-${params.length}`,
        nodeId: fuzzyWidget.nodeId,
        nodeType: fuzzyWidget.nodeType,
        nodeLabel: fuzzyWidget.nodeLabel,
        widgetName: fuzzyWidget.widgetName,
        widgetIndex: fuzzyWidget.widgetIndex,
        type: suggestion.type,
        rangeStart: suggestion.rangeStart,
        rangeEnd: suggestion.rangeEnd,
        rangeStep: suggestion.rangeStep,
        values: suggestion.values,
      });
    }

    return { suggestions, params };
  } catch (err: any) {
    return {
      suggestions: [],
      params: [],
      error: `Failed to parse smart suggestions: ${err.message}`,
    };
  }
}

// -- Experiment History -------------------------------------------------------

export interface ExperimentHistoryEntry {
  id: string;
  name: string;
  timestamp: number;
  mode: 'sweep' | 'optimize';
  /** Number of variants run */
  variantCount: number;
  /** Total duration in ms */
  totalDurationMs: number;
  /** Summary of params used */
  paramSummary: string;
  /** Best result image URL (first successful image) */
  bestImageUrl?: string;
  /** For optimize mode: was it accepted? */
  optimizedAccepted?: boolean;
}

const HISTORY_KEY = 'experiment-history';
const MAX_HISTORY = 50;

export function saveExperimentToHistory(entry: ExperimentHistoryEntry): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: ExperimentHistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore storage errors
  }
}

export function getExperimentHistory(): ExperimentHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearExperimentHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

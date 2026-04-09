/**
 * experiment-presets.ts — Pre-built experiment templates for common workflows
 */
import type { SweepParam, SweepValueType } from '../services/experiment-engine';

export interface ExperimentPreset {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: 'quality' | 'speed' | 'style' | 'advanced';
  /** Which node types this preset targets (matched against workflow) */
  targetNodeTypes: string[];
  /** The sweep params to auto-create (nodeId filled at runtime from workflow) */
  paramTemplates: PresetParamTemplate[];
}

export interface PresetParamTemplate {
  /** Which node class_type to find */
  targetNodeType: string;
  widgetName: string;
  type: SweepValueType;
  rangeStart?: number;
  rangeEnd?: number;
  rangeStep?: number;
  values?: (string | number)[];
}

export const EXPERIMENT_PRESETS: ExperimentPreset[] = [
  {
    id: 'quality-steps',
    name: 'Step Count Sweep',
    description: 'Find the sweet spot between quality and speed (10-40 steps)',
    icon: '🎯',
    category: 'quality',
    targetNodeTypes: ['KSampler', 'KSamplerAdvanced'],
    paramTemplates: [{
      targetNodeType: 'KSampler',
      widgetName: 'steps',
      type: 'number-range',
      rangeStart: 10,
      rangeEnd: 40,
      rangeStep: 5,
    }],
  },
  {
    id: 'cfg-sweep',
    name: 'CFG Scale Sweep',
    description: 'Test prompt adherence vs creativity (2-12 CFG)',
    icon: '⚖️',
    category: 'quality',
    targetNodeTypes: ['KSampler', 'KSamplerAdvanced'],
    paramTemplates: [{
      targetNodeType: 'KSampler',
      widgetName: 'cfg',
      type: 'number-range',
      rangeStart: 2,
      rangeEnd: 12,
      rangeStep: 1,
    }],
  },
  {
    id: 'sampler-compare',
    name: 'Sampler Comparison',
    description: 'Compare popular samplers side-by-side',
    icon: '🔀',
    category: 'style',
    targetNodeTypes: ['KSampler', 'KSamplerAdvanced'],
    paramTemplates: [{
      targetNodeType: 'KSampler',
      widgetName: 'sampler_name',
      type: 'string-list',
      values: ['euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_3m_sde', 'uni_pc'],
    }],
  },
  {
    id: 'scheduler-compare',
    name: 'Scheduler Comparison',
    description: 'Test different noise schedules',
    icon: '📈',
    category: 'style',
    targetNodeTypes: ['KSampler', 'KSamplerAdvanced'],
    paramTemplates: [{
      targetNodeType: 'KSampler',
      widgetName: 'scheduler',
      type: 'string-list',
      values: ['normal', 'karras', 'exponential', 'sgm_uniform'],
    }],
  },
  {
    id: 'denoise-sweep',
    name: 'Denoise Strength Sweep',
    description: 'For img2img: find the right balance (0.3-0.9)',
    icon: '🎨',
    category: 'quality',
    targetNodeTypes: ['KSampler', 'KSamplerAdvanced'],
    paramTemplates: [{
      targetNodeType: 'KSampler',
      widgetName: 'denoise',
      type: 'number-range',
      rangeStart: 0.3,
      rangeEnd: 0.9,
      rangeStep: 0.1,
    }],
  },
  {
    id: 'speed-vs-quality',
    name: 'Speed vs Quality',
    description: 'Steps + CFG combined sweep (fewer variants)',
    icon: '⚡',
    category: 'speed',
    targetNodeTypes: ['KSampler', 'KSamplerAdvanced'],
    paramTemplates: [
      {
        targetNodeType: 'KSampler',
        widgetName: 'steps',
        type: 'number-range',
        rangeStart: 10,
        rangeEnd: 30,
        rangeStep: 10,
      },
      {
        targetNodeType: 'KSampler',
        widgetName: 'cfg',
        type: 'number-range',
        rangeStart: 4,
        rangeEnd: 8,
        rangeStep: 2,
      },
    ],
  },
  {
    id: 'full-sampler-matrix',
    name: 'Full Sampler Matrix',
    description: 'Sampler x Scheduler grid (20 variants)',
    icon: '🧪',
    category: 'advanced',
    targetNodeTypes: ['KSampler', 'KSamplerAdvanced'],
    paramTemplates: [
      {
        targetNodeType: 'KSampler',
        widgetName: 'sampler_name',
        type: 'string-list',
        values: ['euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_3m_sde'],
      },
      {
        targetNodeType: 'KSampler',
        widgetName: 'scheduler',
        type: 'string-list',
        values: ['normal', 'karras', 'exponential', 'sgm_uniform', 'beta'],
      },
    ],
  },
];

/**
 * Check which presets are compatible with the current workflow
 */
export function getCompatiblePresets(
  workflowNodeTypes: string[],
): ExperimentPreset[] {
  return EXPERIMENT_PRESETS.filter((preset) =>
    preset.targetNodeTypes.some((t) =>
      workflowNodeTypes.some((wt) => wt === t || wt.includes(t)),
    ),
  );
}

/**
 * Convert a preset into SweepParam[] by matching targetNodeType to actual workflow nodes.
 * `nodeMap` = { nodeId: { class_type, label } }
 */
export function applyPreset(
  preset: ExperimentPreset,
  nodeMap: Record<string, { classType: string; label: string }>,
  sweepableWidgets: { nodeId: number; nodeType: string; nodeLabel: string; widgetName: string; widgetIndex: number }[],
): SweepParam[] {
  void nodeMap;
  const params: SweepParam[] = [];

  for (const template of preset.paramTemplates) {
    // Find matching widget in sweepableWidgets
    const widget = sweepableWidgets.find((w) =>
      (w.nodeType === template.targetNodeType || w.nodeType.includes(template.targetNodeType))
      && w.widgetName === template.widgetName,
    );
    if (!widget) continue;

    params.push({
      id: `preset-${Date.now().toString(36)}-${params.length}`,
      nodeId: widget.nodeId,
      nodeType: widget.nodeType,
      nodeLabel: widget.nodeLabel,
      widgetName: widget.widgetName,
      widgetIndex: widget.widgetIndex,
      type: template.type,
      rangeStart: template.rangeStart,
      rangeEnd: template.rangeEnd,
      rangeStep: template.rangeStep,
      values: template.values,
    });
  }

  return params;
}

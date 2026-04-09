/**
 * Workflow Parameter Optimizer
 * Uses AI to analyze a workflow and suggest optimal parameter values.
 */

import { callAI } from './ai-provider';
import {
  getCurrentWidgetValues,
  resolveNodeSchema,
  type WidgetDefinition,
} from './node-schema-resolver';
import { getRawObjectInfo } from './comfyui-backend';
import type { ComfyUIWorkflow, ProviderSettings } from '../types/comfyui';

export type OptimizationIntent = 'quality' | 'speed' | 'balanced' | 'custom';

export interface LockedParameter {
  nodeId: number;
  widgetName: string;
}

export interface OptimizationRequest {
  workflow: ComfyUIWorkflow;
  objectInfo: Record<string, any>;
  liveObjectInfo?: Record<string, any>;
  intent: OptimizationIntent;
  customPrompt?: string;
  providerSettings: ProviderSettings;
  architectureHint?: string;
  selectedNodeIds?: number[];
  lockedParameters?: LockedParameter[];
}

export type ParameterValidationStatus = 'valid' | 'auto-corrected';

export interface ParameterChange {
  nodeId: number;
  nodeType: string;
  nodeTitle: string;
  widgetName: string;
  widgetIndex: number;
  widgetType: WidgetDefinition['type'];
  validOptions?: string[];
  oldValue: any;
  newValue: any;
  reason: string;
  validationStatus: ParameterValidationStatus;
  isAutoCorrected?: boolean;
  originalProposal?: any;
}

export interface OptimizationResult {
  changes: ParameterChange[];
  summary: string;
  intent: OptimizationIntent;
}

interface SnapshotOptions {
  selectedNodeIdSet?: Set<number>;
  lockedParamKeys?: Set<string>;
}

interface ValueValidationResult {
  isValid: boolean;
  normalizedValue: any;
  validOptions?: string[];
  validationStatus: ParameterValidationStatus;
  originalProposal?: any;
  isAutoCorrected: boolean;
}

function isWidgetOptimizable(widget: WidgetDefinition): boolean {
  const name = widget.name.toLowerCase();
  if (name.includes('seed')) return false;
  if (widget.type === 'STRING' && widget.multiline) return false;
  return true;
}

export function buildWorkflowSnapshot(
  workflow: ComfyUIWorkflow,
  objectInfo: Record<string, any>,
  options: SnapshotOptions = {},
): string {
  const lines: string[] = [];
  const selectedNodeIdSet = options.selectedNodeIdSet;
  const lockedParamKeys = options.lockedParamKeys;

  const nodes = (workflow.nodes || []).filter((node) => {
    if (!selectedNodeIdSet || selectedNodeIdSet.size === 0) return true;
    return selectedNodeIdSet.has(node.id);
  });

  lines.push(`Workflow: ${nodes.length} selected node(s), ${workflow.links?.length || 0} total connections`);
  lines.push('');

  const comboDiagnostics: Array<{ id: number; type: string; combos: string[] }> = [];

  for (const node of nodes) {
    const schema = resolveNodeSchema(node.type, objectInfo);
    if (!schema || schema.widgets.length === 0) continue;

    const title = node.title || schema.displayName || node.type;
    lines.push(`Node #${node.id} "${title}" (type: ${node.type}, category: ${schema.category})`);

    const values = getCurrentWidgetValues(node.widgets_values, schema);
    const comboWidgets = schema.widgets.filter((widget) => widget.type === 'COMBO' || Array.isArray(widget.options));
    if (comboWidgets.length > 0) {
      comboDiagnostics.push({
        id: node.id,
        type: node.type,
        combos: comboWidgets.map((widget) => widget.name),
      });
    }

    for (const widget of schema.widgets) {
      const currentVal = values.get(widget.name);
      let line = `  - ${widget.name}: ${JSON.stringify(currentVal)}`;

      if (widget.type === 'INT' || widget.type === 'FLOAT') {
        const parts: string[] = [];
        if (widget.min !== undefined) parts.push(`min: ${widget.min}`);
        if (widget.max !== undefined) parts.push(`max: ${widget.max}`);
        if (widget.step !== undefined) parts.push(`step: ${widget.step}`);
        if (widget.default !== undefined) parts.push(`default: ${widget.default}`);
        if (parts.length > 0) line += ` (${parts.join(', ')})`;
      }

      if (widget.type === 'COMBO' && widget.options) {
        const optionsPreview = widget.options.length <= 15
          ? widget.options.join(', ')
          : `${widget.options.slice(0, 15).join(', ')}, ... (${widget.options.length} total)`;
        line += ` [options: ${optionsPreview}]`;
      }

      if (widget.type === 'BOOLEAN') {
        line += ' (boolean)';
      }

      if (widget.type === 'STRING') {
        const asText = String(currentVal || '');
        if (asText.length > 200) {
          line = `  - ${widget.name}: "${asText.substring(0, 200)}..." (${asText.length} chars, multiline: ${widget.multiline})`;
        } else {
          line += ` (multiline: ${widget.multiline})`;
        }
      }

      if (lockedParamKeys?.has(`${node.id}:${widget.name}`)) {
        line += ' [LOCKED - DO NOT CHANGE]';
      }

      lines.push(line);
    }

    if (schema.linkInputs.length > 0) {
      const inputSlotByName = new Map<string, number>();
      node.inputs?.forEach((input, slot) => {
        if (input?.name) inputSlotByName.set(input.name, slot);
      });

      const connectionDetails: string[] = [];
      for (const [fallbackSlot, linkInput] of schema.linkInputs.entries()) {
        const targetSlot = inputSlotByName.get(linkInput.name) ?? fallbackSlot;
        const link = (workflow.links || []).find((entry) => entry[3] === node.id && entry[4] === targetSlot);
        if (!link) continue;
        const sourceNode = (workflow.nodes || []).find((entry) => entry.id === link[1]);
        connectionDetails.push(
          `${linkInput.name} <- Node #${link[1]} (${sourceNode?.type || 'unknown'})`,
        );
      }

      if (connectionDetails.length > 0) {
        lines.push(`  Connections: ${connectionDetails.join('; ')}`);
      }
    }

    lines.push('');
  }

  if (lockedParamKeys && lockedParamKeys.size > 0) {
    lines.push('LOCKED PARAMETERS (do NOT change these):');
    for (const key of lockedParamKeys) {
      const [nodeId, widgetName] = key.split(':');
      lines.push(`- Node #${nodeId}: ${widgetName}`);
    }
    lines.push('');
  }

  console.log('[Optimizer] Snapshot widget types:', comboDiagnostics.filter((entry) => entry.combos.length > 0));

  return lines.join('\n');
}

const OPTIMIZER_SYSTEM_PROMPT = `You are a ComfyUI workflow parameter optimization expert. You deeply understand Stable Diffusion, SDXL, Flux, and other diffusion model architectures.

Your task: Given a workflow snapshot with all node parameters and their valid ranges, suggest optimal parameter values based on the user's intent.

RULES:
1. Only suggest changes to WIDGET parameters (numbers, strings, dropdowns). Never suggest changing connections or adding/removing nodes.
2. Every change must use a value that's valid for that widget (within min/max range, or from the available options list).
3. Do NOT change text prompts (STRING widgets with multiline: true) — those are creative choices.
4. Do NOT change seed values — those are intentionally random.
5. Do NOT change model/checkpoint/lora selections — those are deliberate model choices. UNLESS the current value looks like a placeholder.
6. Focus on: steps, cfg/guidance, sampler, scheduler, denoise, resolution, batch size, and technique-specific parameters.
7. Provide a clear reason for EACH change.
8. Respect the LOCKED PARAMETERS list exactly. Never propose changes to locked fields.

RESPOND WITH VALID JSON ONLY — no markdown fencing, no explanation outside the JSON:
{
  "summary": "Brief overall explanation of the optimization strategy",
  "changes": [
    {
      "nodeId": <number>,
      "widgetName": "<exact widget name from snapshot>",
      "newValue": <new value matching the widget type>,
      "reason": "<brief reason for this change>"
    }
  ]
}

If no changes are needed, return: {"summary": "Workflow parameters are already well-optimized.", "changes": []}`;

function buildUserPrompt(
  snapshot: string,
  intent: OptimizationIntent,
  customPrompt?: string,
  architectureHint?: string,
): string {
  let intentText = '';
  switch (intent) {
    case 'quality':
      intentText = 'Optimize for MAXIMUM IMAGE QUALITY. Prefer more steps, optimal CFG, best samplers for convergence, native model resolution. Speed is secondary.';
      break;
    case 'speed':
      intentText = 'Optimize for FASTEST GENERATION while maintaining acceptable quality. Minimize steps, use fast samplers when sensible, and avoid unnecessary overhead.';
      break;
    case 'balanced':
      intentText = 'Find the BEST BALANCE between quality and speed. Use efficient samplers, reasonable step counts, and practical parameter values.';
      break;
    case 'custom':
      intentText = customPrompt?.trim() || 'Optimize this workflow.';
      break;
  }

  let prompt = `${intentText}\n\n`;
  if (architectureHint) {
    prompt += `Detected architecture: ${architectureHint}\n\n`;
  }
  prompt += `WORKFLOW SNAPSHOT:\n${snapshot}`;
  return prompt;
}

export async function optimizeParameters(request: OptimizationRequest): Promise<OptimizationResult> {
  const {
    workflow,
    objectInfo,
    liveObjectInfo,
    intent,
    customPrompt,
    providerSettings,
    architectureHint,
    selectedNodeIds,
    lockedParameters,
  } = request;

  const selectedNodeIdSet = selectedNodeIds?.length ? new Set(selectedNodeIds) : undefined;
  const lockedParamKeys = new Set((lockedParameters || []).map((entry) => `${entry.nodeId}:${entry.widgetName}`));
  const effectiveLiveObjectInfo = liveObjectInfo || getRawObjectInfo() || objectInfo;

  const snapshot = buildWorkflowSnapshot(workflow, objectInfo, { selectedNodeIdSet, lockedParamKeys });
  const userPrompt = buildUserPrompt(snapshot, intent, customPrompt, architectureHint);
  const aiResponseText = await callAIProvider(providerSettings, OPTIMIZER_SYSTEM_PROMPT, userPrompt);
  const parsed = parseOptimizerResponse(
    aiResponseText,
    workflow,
    objectInfo,
    effectiveLiveObjectInfo,
    selectedNodeIdSet,
    lockedParamKeys,
  );

  return {
    ...parsed,
    intent,
  };
}

async function callAIProvider(
  providerSettings: ProviderSettings,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const result = await callAI({
    settings: providerSettings,
    messages: [{ role: 'user', content: userPrompt }],
    systemPromptOverride: systemPrompt,
  });
  return result.text;
}

function parseOptimizerResponse(
  responseText: string,
  workflow: ComfyUIWorkflow,
  objectInfo: Record<string, any>,
  liveObjectInfo: Record<string, any> | null | undefined,
  selectedNodeIdSet?: Set<number>,
  lockedParamKeys?: Set<string>,
): { summary: string; changes: ParameterChange[] } {
  let jsonText = responseText.trim();

  const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    jsonText = fenced[1].trim();
  }

  if (!jsonText.startsWith('{')) {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${(error as Error).message}`);
  }

  const summary = typeof parsed.summary === 'string'
    ? parsed.summary
    : 'No summary provided.';

  const validChanges: ParameterChange[] = [];
  const items = Array.isArray(parsed.changes) ? parsed.changes : [];

  for (const item of items) {
    const nodeId = Number(item?.nodeId);
    const widgetName = typeof item?.widgetName === 'string' ? item.widgetName : '';
    const reason = typeof item?.reason === 'string' ? item.reason : 'No reason provided';
    const proposedValue = item?.newValue;

    if (!Number.isFinite(nodeId) || !widgetName) continue;

    if (selectedNodeIdSet && selectedNodeIdSet.size > 0 && !selectedNodeIdSet.has(nodeId)) {
      console.warn(`[ParameterOptimizer] Skipping out-of-scope node #${nodeId}`);
      continue;
    }

    const lockKey = `${nodeId}:${widgetName}`;
    if (lockedParamKeys?.has(lockKey)) {
      console.warn(`[ParameterOptimizer] Skipping locked parameter ${lockKey}`);
      continue;
    }

    const node = (workflow.nodes || []).find((entry) => entry.id === nodeId);
    if (!node) {
      console.warn(`[ParameterOptimizer] Skipping unknown node #${nodeId}`);
      continue;
    }

    const schema = resolveNodeSchema(node.type, objectInfo);
    if (!schema) {
      console.warn(`[ParameterOptimizer] Missing schema for node type "${node.type}"`);
      continue;
    }

    const widget = schema.widgets.find((entry) => entry.name === widgetName);
    if (!widget) {
      console.warn(`[ParameterOptimizer] Missing widget "${widgetName}" on ${node.type}`);
      continue;
    }

    console.log(`[Optimizer] Validating change: node ${nodeId} / ${widgetName}`);

    const currentValues = getCurrentWidgetValues(node.widgets_values, schema);
    const oldValue = currentValues.get(widgetName);

    console.log(`[Optimizer]   Current value: ${JSON.stringify(oldValue)}`);
    console.log(`[Optimizer]   Proposed value: ${JSON.stringify(proposedValue)}`);
    console.log('[Optimizer]   Widget schema:', widget);

    const validation = isValueValid(widgetName, proposedValue, widget, node.type, liveObjectInfo || objectInfo);

    if (validation.validOptions && validation.validOptions.length > 0) {
      console.log(
        `[Optimizer]   COMBO options (${validation.validOptions.length}):`,
        validation.validOptions.slice(0, 10),
        validation.validOptions.length > 10 ? `... +${validation.validOptions.length - 10} more` : '',
      );
      console.log(`[Optimizer]   Is valid: ${validation.isValid}`);
    }

    if (!validation.isValid) {
      console.warn(`[ParameterOptimizer] Invalid value ${JSON.stringify(proposedValue)} for ${node.type}.${widgetName}`);
      continue;
    }

    const nextValue = validation.normalizedValue;
    if (JSON.stringify(oldValue) === JSON.stringify(nextValue)) continue;

    if (validation.isAutoCorrected) {
      console.log(
        `[Optimizer] Auto-corrected ${node.type}.${widgetName}: ${JSON.stringify(proposedValue)} -> ${JSON.stringify(nextValue)}`,
      );
    }

    validChanges.push({
      nodeId,
      nodeType: node.type,
      nodeTitle: node.title || schema.displayName || node.type,
      widgetName: widget.name,
      widgetIndex: widget.widgetIndex,
      widgetType: widget.type,
      validOptions: validation.validOptions,
      oldValue,
      newValue: nextValue,
      reason,
      validationStatus: validation.validationStatus,
      isAutoCorrected: validation.isAutoCorrected,
      originalProposal: validation.originalProposal,
    });
  }

  return { summary, changes: validChanges };
}

function isValueValid(
  widgetName: string,
  value: any,
  widget: WidgetDefinition,
  nodeType: string,
  liveObjectInfo?: Record<string, any> | null,
): ValueValidationResult {
  const result = validateAndNormalizeValue(widgetName, value, widget, nodeType, liveObjectInfo || undefined);
  console.log(`[Optimizer] isValueValid(${widgetName}, ${JSON.stringify(value)}):`, {
    schemaType: widget?.type,
    hasOptions: !!(widget?.options?.length),
    optionCount: (result.validOptions || widget?.options || []).length,
    result: result.isValid,
    validationStatus: result.validationStatus,
  });
  return result;
}

function validateAndNormalizeValue(
  widgetName: string,
  value: any,
  widget: WidgetDefinition,
  nodeType: string,
  liveObjectInfo?: Record<string, any>,
): ValueValidationResult {
  switch (widget.type) {
    case 'INT': {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return invalidValidation(value);
      }
      if (widget.min !== undefined && value < widget.min) return invalidValidation(value);
      if (widget.max !== undefined && value > widget.max) return invalidValidation(value);
      return validValidation(value);
    }
    case 'FLOAT': {
      if (typeof value !== 'number') {
        return invalidValidation(value);
      }
      if (widget.min !== undefined && value < widget.min) return invalidValidation(value);
      if (widget.max !== undefined && value > widget.max) return invalidValidation(value);
      return validValidation(value);
    }
    case 'STRING':
      return typeof value === 'string' ? validValidation(value) : invalidValidation(value);
    case 'BOOLEAN':
      return typeof value === 'boolean' ? validValidation(value) : invalidValidation(value);
    case 'COMBO': {
      const options = resolveComboOptions(widget, nodeType, widgetName, liveObjectInfo);
      const normalizedValue = String(value);
      if (options.length === 0) {
        return validValidation(normalizedValue, options);
      }

      if (options.includes(normalizedValue)) {
        return validValidation(normalizedValue, options);
      }

      console.warn(
        `[Optimizer] COMBO validation FAILED: "${widgetName}" value "${normalizedValue}" not in ${options.length} options`,
      );

      const corrected = findClosestComboMatch(normalizedValue, options);
      if (corrected) {
        return {
          isValid: true,
          normalizedValue: corrected,
          validOptions: options,
          validationStatus: 'auto-corrected',
          originalProposal: value,
          isAutoCorrected: true,
        };
      }

      console.warn(
        `[Optimizer] No match found for ${widgetName}. Available: ${options.slice(0, 5).join(', ')}${options.length > 5 ? '...' : ''}`,
      );
      return invalidValidation(value, options);
    }
    default:
      return validValidation(value);
  }
}

function resolveComboOptions(
  widget: WidgetDefinition,
  nodeType: string,
  widgetName: string,
  liveObjectInfo?: Record<string, any>,
): string[] {
  const staticOptions = widget.options || [];
  const liveOptions = liveObjectInfo ? extractLiveComboOptions(liveObjectInfo, nodeType, widgetName) : null;
  if (liveOptions && liveOptions.length > 0) {
    return liveOptions.map(String);
  }
  return staticOptions.map(String);
}

function extractLiveComboOptions(
  objectInfo: Record<string, any>,
  nodeType: string,
  widgetName: string,
): string[] | null {
  const nodeInfo = objectInfo?.[nodeType];
  if (!nodeInfo?.input) return null;

  for (const section of ['required', 'optional']) {
    const inputs = nodeInfo.input?.[section];
    if (!inputs || !inputs[widgetName]) continue;

    const inputDef = inputs[widgetName];
    if (Array.isArray(inputDef) && Array.isArray(inputDef[0])) {
      return inputDef[0].map(String);
    }
  }

  return null;
}

function findClosestComboMatch(value: string, options: string[]): string | null {
  if (options.includes(value)) return value;

  const ciMatch = options.find((option) => option.toLowerCase() === value.toLowerCase());
  if (ciMatch) return ciMatch;

  const normalizedInput = value.toLowerCase().replace(/[\s-]+/g, '_');
  const canonicalMatch = options.find((option) => option.toLowerCase().replace(/[\s-]+/g, '_') === normalizedInput);
  if (canonicalMatch) return canonicalMatch;

  const subMatch = options.find((option) => option.toLowerCase().includes(value.toLowerCase()));
  if (subMatch) return subMatch;

  return null;
}

function validValidation(value: any, validOptions?: string[]): ValueValidationResult {
  return {
    isValid: true,
    normalizedValue: value,
    validOptions,
    validationStatus: 'valid',
    isAutoCorrected: false,
  };
}

function invalidValidation(value: any, validOptions?: string[]): ValueValidationResult {
  return {
    isValid: false,
    normalizedValue: value,
    validOptions,
    validationStatus: 'valid',
    isAutoCorrected: false,
  };
}

export function hasOptimizableWidgetsForNode(
  workflow: ComfyUIWorkflow,
  nodeId: number,
  objectInfo: Record<string, any>,
): boolean {
  const node = workflow.nodes.find((entry) => entry.id === nodeId);
  if (!node) return false;
  const schema = resolveNodeSchema(node.type, objectInfo);
  if (!schema) return false;
  return schema.widgets.some(isWidgetOptimizable);
}

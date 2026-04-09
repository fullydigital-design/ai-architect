import type {
  ComfyUIWorkflow,
  ValidationResult as LegacyValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types/comfyui';
import { NODE_REGISTRY } from '../data/node-registry';
import { CONNECTION_TYPES } from '../data/core-nodes';
import { getLiveNodeCache, validateModelReferences } from './comfyui-backend';
import { getWidgetOrder } from './node-schema-filter';

type ComfyInputSpec = [string | string[], Record<string, unknown>?];
type APIWorkflowNode = {
  class_type?: string;
  inputs?: Record<string, unknown>;
  widgets_values?: unknown[];
};
type APIWorkflow = Record<string, APIWorkflowNode>;
type IssueSeverity = 'error' | 'warning';

const WIDGET_TYPES = new Set(['INT', 'FLOAT', 'STRING', 'BOOLEAN', 'COMBO']);
const MODEL_LOADER_WIDGET_NAMES = new Set([
  'ckpt_name',
  'lora_name',
  'vae_name',
  'control_net_name',
  'clip_name',
  'clip_name1',
  'clip_name2',
  'model_name',
  'unet_name',
  'ipadapter_file',
  'instantid_file',
  'style_model_name',
  'gligen_name',
  'photomaker_model_name',
  'hypernetwork_name',
  'upscale_model_name',
]);
const PHASE_B_MODEL_WIDGET_NAMES = new Set([
  'ckpt_name',
  'unet_name',
  'vae_name',
  'clip_name',
  'clip_name1',
  'clip_name2',
  'lora_name',
  'model_name',
  'control_net_name',
  'style_model_name',
  'upscale_model',
  'sam_model_name',
]);
const CONTROL_AFTER_GENERATE_VALUES = new Set(['fixed', 'increment', 'decrement', 'randomize']);

function normalizeModelPath(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\\/g, '/').trim().toLowerCase();
}

function modelPathBasename(value: string): string {
  const normalized = normalizeModelPath(value);
  if (!normalized) return '';
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

function isModelLoaderWidget(widgetName: string): boolean {
  const normalized = String(widgetName || '').trim().toLowerCase();
  if (!normalized) return false;
  if (MODEL_LOADER_WIDGET_NAMES.has(normalized)) return true;
  return /(^|_)(ckpt|lora|vae|control(net)?|upscale|unet|clip|ipadapter|instantid|gligen|photomaker|model)(_name|_file)?$/.test(normalized);
}

function hasLooseModelOptionMatch(value: unknown, allowed: string[]): boolean {
  const normalizedValue = normalizeModelPath(value);
  if (!normalizedValue) return false;
  const valueBase = modelPathBasename(normalizedValue);
  return allowed.some((candidate) => {
    const normalizedCandidate = normalizeModelPath(candidate);
    if (!normalizedCandidate) return false;
    if (normalizedCandidate === normalizedValue) return true;
    const candidateBase = modelPathBasename(normalizedCandidate);
    if (candidateBase === valueBase) return true;
    return normalizedCandidate.endsWith(`/${valueBase}`) || normalizedValue.endsWith(`/${candidateBase}`);
  });
}

export interface SchemaValidationError {
  nodeId: string;
  nodeType: string;
  field: string;
  severity: IssueSeverity;
  message: string;
  fix?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationError[];
  autoFixable: SchemaValidationError[];
}

function normalizeInputType(spec: unknown): string {
  if (!Array.isArray(spec) || spec.length === 0) return '*';
  const rawType = (spec as ComfyInputSpec)[0];
  if (Array.isArray(rawType)) return 'COMBO';
  if (typeof rawType === 'string') return rawType.toUpperCase();
  return '*';
}

function isLinkValue(value: unknown): value is [string | number, number] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [nodeId, slot] = value;
  const normalizedId = typeof nodeId === 'number' ? String(nodeId) : nodeId;
  return typeof normalizedId === 'string' && /^\d+$/.test(normalizedId) && typeof slot === 'number';
}

function isTypeCompatible(outputType: string, expectedType: string): boolean {
  if (!outputType || !expectedType) return true;
  if (outputType === expectedType) return true;
  if (outputType === '*' || expectedType === '*') return true;
  if ((outputType === 'MASK' && expectedType === 'IMAGE') || (outputType === 'IMAGE' && expectedType === 'MASK')) {
    return true;
  }
  return false;
}

function getInputSpec(
  nodeDef: Record<string, unknown> | undefined,
  inputName: string,
): ComfyInputSpec | null {
  if (!nodeDef) return null;
  const input = nodeDef.input as Record<string, unknown> | undefined;
  const required = (input?.required as Record<string, unknown> | undefined) || {};
  const optional = (input?.optional as Record<string, unknown> | undefined) || {};
  const value = required[inputName] ?? optional[inputName];
  return Array.isArray(value) ? (value as ComfyInputSpec) : null;
}

function hasExactNodeSchema(
  nodeType: string,
  liveCache: ReturnType<typeof getLiveNodeCache>,
): boolean {
  return Boolean(liveCache?.nodes?.[nodeType] || NODE_REGISTRY.get(nodeType));
}

function isSeedWidgetName(name: string): boolean {
  return String(name || '').trim().toLowerCase().includes('seed');
}

function expectsCompanionForRawWidget(widgetName: string, spec: ComfyInputSpec): boolean {
  const options = (spec[1] as Record<string, unknown> | undefined) || {};
  const normalizedType = normalizeInputType(spec);
  const seedCompanion = normalizedType === 'INT' && isSeedWidgetName(widgetName);
  const controlCompanion = options.control_after_generate === true;
  const uploadCompanion = options.image_upload === true || options.upload === true;
  return seedCompanion || controlCompanion || uploadCompanion;
}

function getRawWidgetSpecs(nodeDef: Record<string, unknown>): Array<{
  name: string;
  spec: ComfyInputSpec;
  expectsCompanion: boolean;
}> {
  const widgetOrder = getWidgetOrder(nodeDef);
  return widgetOrder
    .map((name) => {
      const spec = getInputSpec(nodeDef, name);
      if (!spec) return null;
      return {
        name,
        spec,
        expectsCompanion: expectsCompanionForRawWidget(name, spec),
      };
    })
    .filter((entry): entry is { name: string; spec: ComfyInputSpec; expectsCompanion: boolean } => Boolean(entry));
}

function getRawWidgetCountExpectation(nodeDef: Record<string, unknown>): {
  baseCount: number;
  companionCount: number;
  withCompanions: number;
} {
  const specs = getRawWidgetSpecs(nodeDef);
  const baseCount = specs.length;
  const companionCount = specs.filter((entry) => entry.expectsCompanion).length;
  return { baseCount, companionCount, withCompanions: baseCount + companionCount };
}

function expectsCompanionForSchemaWidget(widget: {
  name?: string;
  type?: string;
  hasControlAfterGenerateWidget?: boolean;
  hasUploadWidget?: boolean;
}): boolean {
  const normalizedType = String(widget.type || '').toUpperCase().replace(/_MULTILINE$/, '');
  const seedCompanion = normalizedType === 'INT' && isSeedWidgetName(String(widget.name || ''));
  return seedCompanion || widget.hasControlAfterGenerateWidget === true || widget.hasUploadWidget === true;
}

function getSchemaWidgetCountExpectation(
  widgetInputs: Array<{
    name?: string;
    type?: string;
    hasControlAfterGenerateWidget?: boolean;
    hasUploadWidget?: boolean;
  }>,
): {
  baseCount: number;
  companionCount: number;
  withCompanions: number;
} {
  const baseCount = widgetInputs.length;
  const companionCount = widgetInputs.filter((input) => expectsCompanionForSchemaWidget(input)).length;
  return { baseCount, companionCount, withCompanions: baseCount + companionCount };
}

function validateNamedWidgetValue(
  nodeId: string,
  nodeType: string,
  widgetName: string,
  value: unknown,
  spec: ComfyInputSpec,
  errors: SchemaValidationError[],
  warnings: SchemaValidationError[],
): void {
  const type = normalizeInputType(spec);
  const options = (spec[1] as Record<string, unknown> | undefined) || {};

  if (type === 'COMBO') {
    const allowed = Array.isArray(spec[0]) ? spec[0].map(String) : [];
    if (allowed.length === 0) {
      return;
    }
    const normalized = typeof value === 'string' ? value : String(value);
    if (!allowed.includes(normalized)) {
      if (isModelLoaderWidget(widgetName)) {
        const fuzzyMatch = hasLooseModelOptionMatch(normalized, allowed);
        if (!fuzzyMatch) {
          warnings.push({
            nodeId,
            nodeType,
            field: widgetName,
            severity: 'warning',
            message: `Model "${normalized}" for "${widgetName}" is not in current dropdown snapshot; ComfyUI may still resolve it at runtime`,
          });
        }
        return;
      }
      errors.push({
        nodeId,
        nodeType,
        field: widgetName,
        severity: 'error',
        message: `Widget "${widgetName}" value "${normalized}" is not a valid option`,
        fix: allowed.length > 0 ? `Use "${allowed[0]}"` : undefined,
      });
    }
    return;
  }

  if (type === 'INT' || type === 'FLOAT') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push({
        nodeId,
        nodeType,
        field: widgetName,
        severity: 'error',
        message: `Widget "${widgetName}" expects ${type} but got ${typeof value}`,
      });
      return;
    }

    const min = typeof options.min === 'number' ? options.min : undefined;
    const max = typeof options.max === 'number' ? options.max : undefined;
    if (min !== undefined && value < min) {
      errors.push({
        nodeId,
        nodeType,
        field: widgetName,
        severity: 'error',
        message: `Widget "${widgetName}" value ${value} is below minimum ${min}`,
        fix: `Set ${widgetName} to ${min}`,
      });
    }
    if (max !== undefined && value > max) {
      errors.push({
        nodeId,
        nodeType,
        field: widgetName,
        severity: 'error',
        message: `Widget "${widgetName}" value ${value} is above maximum ${max}`,
        fix: `Set ${widgetName} to ${max}`,
      });
    }
    return;
  }

  if (type === 'BOOLEAN' && typeof value !== 'boolean') {
    errors.push({
      nodeId,
      nodeType,
      field: widgetName,
      severity: 'error',
      message: `Widget "${widgetName}" expects BOOLEAN but got ${typeof value}`,
    });
    return;
  }

  if (type === 'STRING' && typeof value !== 'string') {
    warnings.push({
      nodeId,
      nodeType,
      field: widgetName,
      severity: 'warning',
      message: `Widget "${widgetName}" usually expects STRING but got ${typeof value}`,
    });
  }
}

function validateWidgetsByOrder(
  nodeId: string,
  nodeType: string,
  nodeDef: Record<string, unknown>,
  widgetsValues: unknown[],
  errors: SchemaValidationError[],
  warnings: SchemaValidationError[],
  includeCompanionSlots = false,
): void {
  const widgetSpecs = getRawWidgetSpecs(nodeDef);
  let valueIndex = 0;
  for (let index = 0; index < widgetSpecs.length; index += 1) {
    const widget = widgetSpecs[index];
    const value = widgetsValues[valueIndex];
    if (value === undefined) {
      valueIndex += 1;
      continue;
    }
    validateNamedWidgetValue(nodeId, nodeType, widget.name, value, widget.spec, errors, warnings);

    valueIndex += 1;
    if (includeCompanionSlots && widget.expectsCompanion && valueIndex < widgetsValues.length) {
      const companionValue = widgetsValues[valueIndex];
      if (
        typeof companionValue === 'string'
        && CONTROL_AFTER_GENERATE_VALUES.has(companionValue.toLowerCase())
      ) {
        valueIndex += 1;
      } else {
        // Upload/control companion slots are UI-only; skip one slot to preserve alignment.
        valueIndex += 1;
      }
    }
  }
}

/**
 * Validate a ComfyUI API workflow object against live /object_info.
 * Expects API format: { "nodeId": { class_type, inputs } }.
 */
export function validateWorkflowAgainstSchema(
  workflow: APIWorkflow,
  objectInfo: Record<string, unknown>,
): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  const warnings: SchemaValidationError[] = [];
  const liveCache = getLiveNodeCache();

  for (const [nodeId, node] of Object.entries(workflow || {})) {
    if (!/^\d+$/.test(nodeId) || !node || typeof node !== 'object') continue;
    const nodeType = String(node.class_type || '');
    if (!nodeType) continue;
    const shouldValidateWidgets = hasExactNodeSchema(nodeType, liveCache);

    const nodeDef = objectInfo[nodeType] as Record<string, unknown> | undefined;
    if (!nodeDef) {
      warnings.push({
        nodeId,
        nodeType,
        field: 'class_type',
        severity: 'warning',
        message: `Unknown node type "${nodeType}" in live schema cache`,
      });
      continue;
    }

    const nodeInputs = (node.inputs || {}) as Record<string, unknown>;
    const schemaInput = (nodeDef.input as Record<string, unknown> | undefined) || {};
    const requiredDefs = (schemaInput.required as Record<string, unknown> | undefined) || {};
    const optionalDefs = (schemaInput.optional as Record<string, unknown> | undefined) || {};
    const allDefs: Record<string, unknown> = { ...requiredDefs, ...optionalDefs };

    for (const [inputName, inputValue] of Object.entries(nodeInputs)) {
      if (isLinkValue(inputValue)) {
        const [sourceNodeRef, sourceSlot] = inputValue;
        const sourceNodeId = typeof sourceNodeRef === 'number' ? String(sourceNodeRef) : sourceNodeRef;
        const sourceNode = workflow[sourceNodeId];
        if (!sourceNode) {
          errors.push({
            nodeId,
            nodeType,
            field: inputName,
            severity: 'error',
            message: `Input "${inputName}" references missing node "${sourceNodeId}"`,
          });
          continue;
        }

        const sourceType = String(sourceNode.class_type || '');
        const sourceDef = objectInfo[sourceType] as Record<string, unknown> | undefined;
        if (!sourceDef) continue;

        const output = sourceDef.output;
        const outputTypes = Array.isArray(output) ? output : [];
        const sourceOutputType = typeof outputTypes[sourceSlot] === 'string'
          ? String(outputTypes[sourceSlot]).toUpperCase()
          : '';

        const inputSpec = allDefs[inputName];
        const expectedType = normalizeInputType(inputSpec);
        if (WIDGET_TYPES.has(expectedType)) {
          if (shouldValidateWidgets) {
            errors.push({
              nodeId,
              nodeType,
              field: inputName,
              severity: 'error',
              message: `Input "${inputName}" expects widget value type ${expectedType}, but received a link`,
            });
          }
          continue;
        }

        if (sourceOutputType && expectedType && !isTypeCompatible(sourceOutputType, expectedType)) {
          errors.push({
            nodeId,
            nodeType,
            field: inputName,
            severity: 'error',
            message: `Type mismatch: "${inputName}" expects ${expectedType} but got ${sourceOutputType} from node ${sourceNodeId} (${sourceType})`,
            fix: `Connect "${inputName}" to a compatible ${expectedType} output`,
          });
        }
        continue;
      }

      const inputSpec = allDefs[inputName];
      if (!Array.isArray(inputSpec)) continue;
      if (shouldValidateWidgets) {
        validateNamedWidgetValue(
          nodeId,
          nodeType,
          inputName,
          inputValue,
          inputSpec as ComfyInputSpec,
          errors,
          warnings,
        );
      }
    }

    for (const [requiredInputName, requiredInputSpec] of Object.entries(requiredDefs)) {
      if (!Array.isArray(requiredInputSpec)) continue;
      const expectedType = normalizeInputType(requiredInputSpec);
      const currentValue = nodeInputs[requiredInputName];
      const isWidget = WIDGET_TYPES.has(expectedType);

      if (isWidget) {
        if (shouldValidateWidgets && currentValue === undefined) {
          warnings.push({
            nodeId,
            nodeType,
            field: requiredInputName,
            severity: 'warning',
            message: `Required widget "${requiredInputName}" is missing; ComfyUI default may be applied`,
          });
        }
        continue;
      }

      if (!isLinkValue(currentValue)) {
        errors.push({
          nodeId,
          nodeType,
          field: requiredInputName,
          severity: 'error',
          message: `Required input "${requiredInputName}" (${expectedType}) is not connected`,
          fix: `Connect ${nodeType}.${requiredInputName} to a ${expectedType} output`,
        });
      }
    }

    if (shouldValidateWidgets && Array.isArray(node.widgets_values) && node.widgets_values.length > 0) {
      const widgetCountExpectation = getRawWidgetCountExpectation(nodeDef);
      const hasCompanionCount = widgetCountExpectation.companionCount > 0
        && node.widgets_values.length === widgetCountExpectation.withCompanions;
      const hasBaseCount = node.widgets_values.length === widgetCountExpectation.baseCount;

      if (widgetCountExpectation.baseCount > 0 && !hasBaseCount && !hasCompanionCount) {
        warnings.push({
          nodeId,
          nodeType,
          field: 'widgets_values',
          severity: 'warning',
          message: `Widget values stale from previous node type (${node.widgets_values.length} values, expected ${widgetCountExpectation.baseCount}${widgetCountExpectation.companionCount > 0 ? ` or ${widgetCountExpectation.withCompanions} with companions` : ''}). Re-apply node replacement or fix widget values.`,
        });
        console.log(
          `[Validator] Widget mismatch for ${nodeType} (node ${nodeId}): ` +
          `values count ${node.widgets_values.length} !== expected ${widgetCountExpectation.baseCount}`
          + `${widgetCountExpectation.companionCount > 0 ? ` (or ${widgetCountExpectation.withCompanions} with companions)` : ''}`,
        );
        continue;
      }
      validateWidgetsByOrder(
        nodeId,
        nodeType,
        nodeDef,
        node.widgets_values,
        errors,
        warnings,
        hasCompanionCount,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixable: errors.filter((error) => Boolean(error.fix)),
  };
}

export function validateWorkflow(workflow: ComfyUIWorkflow): LegacyValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const liveCache = getLiveNodeCache();
  const resolveSchema = (nodeType: string) => liveCache?.nodes?.[nodeType] || NODE_REGISTRY.get(nodeType);

  if (!workflow || !workflow.nodes || !workflow.links) {
    errors.push({
      type: 'unknown_node',
      nodeId: 0,
      nodeName: '',
      details: 'Workflow is missing nodes or links array'
    });
    return { isValid: false, errors, warnings };
  }

  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));

  // 1. Check all node types exist in live cache or static registry
  for (const node of workflow.nodes) {
    const schema = resolveSchema(node.type);
    if (!schema) {
      errors.push({
        type: 'unknown_node',
        nodeId: node.id,
        nodeName: node.type,
        details: `Node type "${node.type}" not found in live ComfyUI node cache or static registry.`
      });
    }
  }

  // 2. Check for duplicate node IDs
  const nodeIds = workflow.nodes.map(n => n.id);
  const uniqueNodeIds = new Set(nodeIds);
  if (uniqueNodeIds.size !== nodeIds.length) {
    errors.push({
      type: 'duplicate_id',
      nodeId: 0,
      nodeName: '',
      details: 'Duplicate node IDs detected in the workflow'
    });
  }

  // 3. Check for duplicate link IDs
  const linkIds = workflow.links.map(l => l[0]);
  const uniqueLinkIds = new Set(linkIds);
  if (uniqueLinkIds.size !== linkIds.length) {
    errors.push({
      type: 'duplicate_id',
      nodeId: 0,
      nodeName: '',
      details: 'Duplicate link IDs detected in the workflow'
    });
  }

  // 4. Verify all links have valid source/target nodes
  for (const link of workflow.links) {
    const [linkId, srcNodeId, srcSlot, tgtNodeId, tgtSlot, linkType] = link;
    const srcNode = nodeMap.get(srcNodeId);
    const tgtNode = nodeMap.get(tgtNodeId);

    if (!srcNode) {
      errors.push({
        type: 'invalid_slot',
        nodeId: srcNodeId,
        nodeName: `Unknown (ID: ${srcNodeId})`,
        details: `Link ${linkId}: Source node ${srcNodeId} does not exist`
      });
      continue;
    }

    if (!tgtNode) {
      errors.push({
        type: 'invalid_slot',
        nodeId: tgtNodeId,
        nodeName: `Unknown (ID: ${tgtNodeId})`,
        details: `Link ${linkId}: Target node ${tgtNodeId} does not exist`
      });
      continue;
    }

    // 5. Type-check connections using schema
    const srcSchema = resolveSchema(srcNode.type);
    const tgtSchema = resolveSchema(tgtNode.type);

    if (srcSchema && tgtSchema) {
      const srcOutput = (srcSchema.outputs || [])[srcSlot];
      const tgtConnectionInputs = (tgtSchema.inputs || []).filter(i => !i.isWidget);
      const tgtInput = tgtConnectionInputs[tgtSlot];

      if (srcOutput && tgtInput) {
        const srcType = srcOutput.type;
        const tgtType = tgtInput.type;
        if (
          srcType !== tgtType &&
          srcType !== '*' &&
          tgtType !== '*' &&
          linkType !== '*'
        ) {
          errors.push({
            type: 'type_mismatch',
            nodeId: tgtNodeId,
            nodeName: tgtNode.type,
            details: `Link ${linkId}: Output "${srcOutput.name}" (${srcType}) from ${srcNode.type} connected to input "${tgtInput.name}" (${tgtType}) on ${tgtNode.type} — types don't match`
          });
        }
      }
    }
  }

  // 6. Check required connection inputs are connected
  for (const node of workflow.nodes) {
    const schema = resolveSchema(node.type);
    if (!schema) continue;

    const connectionInputs = (schema.inputs || []).filter(i => !i.isWidget);
    for (let slotIdx = 0; slotIdx < connectionInputs.length; slotIdx++) {
      const input = connectionInputs[slotIdx];
      if (!input.isRequired) continue;

      // Check if this is a connection type
      if (CONNECTION_TYPES.includes(input.type) || input.type.includes('_')) {
        const hasConnection = workflow.links.some(
          ([, , , tgtNode, tgtSlot]) => tgtNode === node.id && tgtSlot === slotIdx
        );
        if (!hasConnection) {
          errors.push({
            type: 'missing_connection',
            nodeId: node.id,
            nodeName: node.type,
            details: `Required input "${input.name}" (${input.type}) on ${node.type} (node ${node.id}) is not connected`
          });
        }
      }
    }
  }

  // 7. Basic circular dependency check (DFS)
  try {
    const adjacency = new Map<number, number[]>();
    for (const node of workflow.nodes) {
      adjacency.set(node.id, []);
    }
    for (const [, srcId, , tgtId] of workflow.links) {
      const targets = adjacency.get(srcId);
      if (targets) targets.push(tgtId);
    }

    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    function hasCycle(nodeId: number): boolean {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    }

    for (const node of workflow.nodes) {
      if (!visited.has(node.id) && hasCycle(node.id)) {
        errors.push({
          type: 'circular_dependency',
          nodeId: node.id,
          nodeName: node.type,
          details: 'Circular dependency detected in the workflow graph'
        });
        break;
      }
    }
  } catch {
    // Skip cycle detection on error
  }

  // 8. Model file validation (Phase 3) — warn about missing models
  try {
    const modelCheck = validateModelReferences(workflow);
    for (const missing of modelCheck.missing) {
      warnings.push({
        type: 'missing_model',
        nodeId: missing.nodeId,
        details: `Model file "${missing.filename}" (${missing.category}) referenced in ${missing.nodeType} (node ${missing.nodeId}) is not installed on your ComfyUI. Download it or change to an installed model.`,
      });
    }
  } catch {
    // Model validation is best-effort — skip on any error
  }

  // 9. Validate widget COMBO values and numeric ranges (exact schema only)
  for (const node of workflow.nodes) {
    if (!hasExactNodeSchema(node.type, liveCache)) continue;
    if (!Array.isArray(node.widgets_values) || node.widgets_values.length === 0) continue;

    const schema = resolveSchema(node.type);
    if (!schema) continue;

    const widgetInputs = (schema.inputs || []).filter((input) => input.isWidget);
    const widgetCountExpectation = getSchemaWidgetCountExpectation(widgetInputs);
    const hasCompanionCount = widgetCountExpectation.companionCount > 0
      && node.widgets_values.length === widgetCountExpectation.withCompanions;
    const hasBaseCount = node.widgets_values.length === widgetCountExpectation.baseCount;

    if (widgetCountExpectation.baseCount > 0 && !hasBaseCount && !hasCompanionCount) {
      warnings.push({
        type: 'unusual_value',
        nodeId: node.id,
        details: `Widget values stale from previous node type (${node.widgets_values.length} values, expected ${widgetCountExpectation.baseCount}${widgetCountExpectation.companionCount > 0 ? ` or ${widgetCountExpectation.withCompanions} with companions` : ''}) on ${node.type}. Re-apply node replacement or fix widget values.`,
      });
      console.log(
        `[Validator] Widget mismatch for ${node.type} (node ${node.id}): ` +
        `values count ${node.widgets_values.length} !== expected ${widgetCountExpectation.baseCount}`
        + `${widgetCountExpectation.companionCount > 0 ? ` (or ${widgetCountExpectation.withCompanions} with companions)` : ''}`,
      );
      continue;
    }

    let valueIdx = 0;
    for (let idx = 0; idx < widgetInputs.length; idx += 1) {
      if (valueIdx >= node.widgets_values.length) break;

      const widget = widgetInputs[idx];
      const value = node.widgets_values[valueIdx];
      if (value === undefined) {
        valueIdx += 1;
        continue;
      }

      if (widget.type === 'COMBO') {
        if (!Array.isArray(widget.options) || widget.options.length === 0) {
          continue;
        }

        const options = widget.options;
        const hasExactOption = options.some((option) => option === value);
        const widgetName = String(widget.name || '').trim().toLowerCase();
        const looksLikeModelList = options.some((option) => (
          typeof option === 'string' && /\.(safetensors|ckpt|pt|pth|bin|onnx|sft)$/i.test(option)
        )) || PHASE_B_MODEL_WIDGET_NAMES.has(widgetName);

        if (!hasExactOption) {
          if (looksLikeModelList) {
            warnings.push({
              type: 'missing_model',
              nodeId: node.id,
              details: `Widget "${widget.name}" on ${node.type}: model "${String(value)}" not found locally. Download it or pick an installed one.`,
            });
          } else {
            const preview = options.slice(0, 10).map((option) => String(option)).join(', ');
            errors.push({
              type: 'invalid_widget_value',
              nodeId: node.id,
              nodeName: node.type,
              details: `Widget "${widget.name}" on ${node.type} (node ${node.id}): value "${String(value)}" is not valid. Options: ${preview}${options.length > 10 ? '...' : ''}`,
            });
          }
        }
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        if (typeof widget.min === 'number' && value < widget.min) {
          warnings.push({
            type: 'widget_out_of_range',
            nodeId: node.id,
            details: `Widget "${widget.name}" on ${node.type}: value ${value} below minimum ${widget.min}`,
          });
        }
        if (typeof widget.max === 'number' && value > widget.max) {
          warnings.push({
            type: 'widget_out_of_range',
            nodeId: node.id,
            details: `Widget "${widget.name}" on ${node.type}: value ${value} above maximum ${widget.max}`,
          });
        }
      }

      valueIdx += 1;
      if (hasCompanionCount && expectsCompanionForSchemaWidget(widget) && valueIdx < node.widgets_values.length) {
        valueIdx += 1;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export {
  DEFAULT_VALIDATION_OPTIONS,
  quickValidate,
  validateWorkflowPipeline,
  type FixStatus,
  type IssueSeverity,
  type ValidationIssue as PipelineValidationIssue,
  type ValidationOptions as PipelineValidationOptions,
  type ValidationResult as PipelineValidationResult,
} from './workflow-validation-pipeline';

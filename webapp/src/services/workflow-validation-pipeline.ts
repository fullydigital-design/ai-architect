/**
 * Phase 11B - Workflow Validation Pipeline + Auto-fix Engine
 *
 * Validates AI-generated workflows against live /object_info and applies
 * conservative auto-fixes for common schema and wiring mistakes.
 */

import { getLiveNodeCache } from './comfyui-backend';

export type IssueSeverity = 'error' | 'warning' | 'info';
export type FixStatus = 'auto-fixed' | 'unfixable' | 'manual-review';

export interface ValidationIssue {
  id: string;
  stage: 1 | 2 | 3 | 4;
  severity: IssueSeverity;
  fixStatus: FixStatus;
  nodeId?: string;
  nodeClassType?: string;
  field?: string;
  message: string;
  details?: string;
  fix?: {
    description: string;
    original: unknown;
    corrected: unknown;
  };
}

export interface ValidationResult {
  isValid: boolean;
  fixedWorkflow: any;
  wasModified: boolean;
  issues: ValidationIssue[];
  stats: {
    totalIssues: number;
    autoFixed: number;
    unfixable: number;
    manualReview: number;
    byStage: {
      stage1_existence: number;
      stage2_structural: number;
      stage3_connections: number;
      stage4_values: number;
    };
  };
  confidence: number;
  summary: string;
  errorContextForAI?: string;
  validationTimeMs: number;
}

export interface ValidationOptions {
  autoFix?: boolean;
  fuzzyMatch?: boolean;
  fuzzyThreshold?: number;
  autoConnect?: boolean;
  autoClamp?: boolean;
  removeOrphans?: boolean;
  deduplicateLoaders?: boolean;
  strict?: boolean;
  allowUnknownNodes?: boolean;
  skipValidationForUnknown?: boolean;
  safeMode?: boolean;
}

export const DEFAULT_VALIDATION_OPTIONS: Required<ValidationOptions> = {
  autoFix: true,
  fuzzyMatch: true,
  fuzzyThreshold: 0.85,
  autoConnect: false,
  autoClamp: true,
  removeOrphans: false,
  deduplicateLoaders: false,
  strict: false,
  allowUnknownNodes: true,
  skipValidationForUnknown: true,
  safeMode: true,
};

interface StageResult {
  workflow: any;
  issues: ValidationIssue[];
  modified: boolean;
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function validateWorkflowPipeline(workflow: any, options?: ValidationOptions): ValidationResult {
  const started = nowMs();
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const objectInfo = getLiveNodeCache()?.nodes as Record<string, any> | undefined;

  if (!objectInfo || Object.keys(objectInfo).length === 0) {
    return {
      isValid: true,
      fixedWorkflow: workflow,
      wasModified: false,
      issues: [],
      stats: {
        totalIssues: 0,
        autoFixed: 0,
        unfixable: 0,
        manualReview: 0,
        byStage: {
          stage1_existence: 0,
          stage2_structural: 0,
          stage3_connections: 0,
          stage4_values: 0,
        },
      },
      confidence: 100,
      summary: 'Validation skipped: /object_info cache not available. Passing workflow through unchanged.',
      validationTimeMs: nowMs() - started,
    };
  }

  const isUI = Array.isArray(workflow?.nodes) && Array.isArray(workflow?.links);
  let wf = clone(workflow);
  let wasModified = false;
  const issues: ValidationIssue[] = [];

  const s1 = stage1NodeExistence(wf, objectInfo, opts, isUI);
  wf = s1.workflow;
  issues.push(...s1.issues);
  wasModified = wasModified || s1.modified;

  const s2 = stage2Structural(wf, objectInfo, opts, isUI);
  wf = s2.workflow;
  issues.push(...s2.issues);
  wasModified = wasModified || s2.modified;

  const s3 = stage3Connections(wf, objectInfo, opts, isUI);
  wf = s3.workflow;
  issues.push(...s3.issues);
  wasModified = wasModified || s3.modified;

  const s4 = stage4WidgetValues(wf, objectInfo, opts, isUI);
  wf = s4.workflow;
  issues.push(...s4.issues);
  wasModified = wasModified || s4.modified;

  const autoFixed = issues.filter((i) => i.fixStatus === 'auto-fixed').length;
  const unfixable = issues.filter((i) => i.fixStatus === 'unfixable').length;
  const manualReview = issues.filter((i) => i.fixStatus === 'manual-review').length;
  const unfixableErrors = issues.filter((i) => i.severity === 'error' && i.fixStatus === 'unfixable');
  let isValid = unfixableErrors.length === 0;
  if (opts.strict) {
    const unfixedWarnings = issues.filter((i) => i.severity === 'warning' && i.fixStatus !== 'auto-fixed');
    isValid = isValid && unfixedWarnings.length === 0;
  }
  const confidence = calculateConfidence(issues);

  return {
    isValid,
    fixedWorkflow: wf,
    wasModified,
    issues,
    stats: {
      totalIssues: issues.length,
      autoFixed,
      unfixable,
      manualReview,
      byStage: {
        stage1_existence: issues.filter((i) => i.stage === 1).length,
        stage2_structural: issues.filter((i) => i.stage === 2).length,
        stage3_connections: issues.filter((i) => i.stage === 3).length,
        stage4_values: issues.filter((i) => i.stage === 4).length,
      },
    },
    confidence,
    summary: buildSummary(issues, autoFixed, unfixable, isValid, confidence),
    errorContextForAI: unfixableErrors.length > 0 ? buildErrorContext(unfixableErrors) : undefined,
    validationTimeMs: nowMs() - started,
  };
}

function stage1NodeExistence(
  workflow: any,
  objectInfo: Record<string, any>,
  opts: Required<ValidationOptions>,
  isUI: boolean,
): StageResult {
  const issues: ValidationIssue[] = [];
  let modified = false;
  const classes = Object.keys(objectInfo);

  if (isUI) {
    for (const node of workflow.nodes || []) {
      const ct = String(node?.type || '');
      if (!ct || isFrontendOnlyNode(ct) || objectInfo[ct]) continue;

      const match = opts.fuzzyMatch ? fuzzyBest(ct, classes, opts.fuzzyThreshold) : null;
      const highConfidence = !!match && match.score >= 0.9;
      const canAutoFix = highConfidence && opts.autoFix && !opts.safeMode;

      if (highConfidence) {
        issues.push({
          id: `s1-${node.id}`,
          stage: 1,
          severity: 'warning',
          fixStatus: canAutoFix ? 'auto-fixed' : 'manual-review',
          nodeId: String(node.id),
          nodeClassType: ct,
          message: `Unknown node type "${ct}" - ${canAutoFix ? 'auto-corrected' : 'suggested correction'}: "${match!.name}" (${(match!.score * 100).toFixed(0)}% match)`,
          fix: canAutoFix
            ? { description: 'Class type corrected', original: ct, corrected: match!.name }
            : undefined,
        });
        if (canAutoFix) {
          node.type = match!.name;
          modified = true;
        }
      } else if (match && match.score >= opts.fuzzyThreshold) {
        issues.push({
          id: `s1-${node.id}`,
          stage: 1,
          severity: 'info',
          fixStatus: 'manual-review',
          nodeId: String(node.id),
          nodeClassType: ct,
          message: `Node type "${ct}" not in cache. Did you mean "${match.name}"? (${(match.score * 100).toFixed(0)}% match). Node will be passed through to ComfyUI as-is.`,
        });
      } else {
        issues.push({
          id: `s1-${node.id}`,
          stage: 1,
          severity: 'info',
          fixStatus: 'manual-review',
          nodeId: String(node.id),
          nodeClassType: ct,
          message: `Node type "${ct}" not found in /object_info cache. This may be a custom node - passing through to ComfyUI for validation.`,
        });
      }
    }
    return { workflow, issues, modified };
  }

  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!isNumericId(nodeId)) continue;
    const ct = String((nodeData as any)?.class_type || '');
    if (!ct || isFrontendOnlyNode(ct) || objectInfo[ct]) continue;
    const match = opts.fuzzyMatch ? fuzzyBest(ct, classes, opts.fuzzyThreshold) : null;
    const highConfidence = !!match && match.score >= 0.9;
    const canAutoFix = highConfidence && opts.autoFix && !opts.safeMode;

    if (highConfidence) {
      issues.push({
        id: `s1-${nodeId}`,
        stage: 1,
        severity: 'warning',
        fixStatus: canAutoFix ? 'auto-fixed' : 'manual-review',
        nodeId,
        nodeClassType: ct,
        message: `Unknown node type "${ct}" - ${canAutoFix ? 'auto-corrected' : 'suggested correction'}: "${match!.name}" (${(match!.score * 100).toFixed(0)}% match)`,
        fix: canAutoFix
          ? { description: 'Class type corrected', original: ct, corrected: match!.name }
          : undefined,
      });
      if (canAutoFix) {
        (nodeData as any).class_type = match!.name;
        modified = true;
      }
    } else if (match && match.score >= opts.fuzzyThreshold) {
      issues.push({
        id: `s1-${nodeId}`,
        stage: 1,
        severity: 'info',
        fixStatus: 'manual-review',
        nodeId,
        nodeClassType: ct,
        message: `Node type "${ct}" not in cache. Did you mean "${match.name}"? (${(match.score * 100).toFixed(0)}% match). Node will be passed through to ComfyUI as-is.`,
      });
    } else {
      issues.push({
        id: `s1-${nodeId}`,
        stage: 1,
        severity: 'info',
        fixStatus: 'manual-review',
        nodeId,
        nodeClassType: ct,
        message: `Node type "${ct}" not found in /object_info cache. This may be a custom node - passing through to ComfyUI for validation.`,
      });
    }
  }

  return { workflow, issues, modified };
}

function stage2Structural(
  workflow: any,
  objectInfo: Record<string, any>,
  opts: Required<ValidationOptions>,
  isUI: boolean,
): StageResult {
  const issues: ValidationIssue[] = [];
  let modified = false;

  if (isUI) {
    const cycle = detectCycle(buildAdjacencyUI(workflow));
    if (cycle) {
      issues.push({
        id: 's2-cycle',
        stage: 2,
        severity: 'error',
        fixStatus: 'unfixable',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
      });
    }

    if (opts.removeOrphans && opts.autoFix && !opts.safeMode) {
      const nodeIdsWithIncoming = new Set<number>();
      const nodeIdsWithOutgoing = new Set<number>();
      for (const link of workflow.links || []) {
        nodeIdsWithOutgoing.add(Number(link[1]));
        nodeIdsWithIncoming.add(Number(link[3]));
      }

      const orphanIds = new Set<number>();
      const removedLabels: string[] = [];
      for (const node of workflow.nodes || []) {
        const id = Number(node.id);
        const type = String(node.type || '');
        const hasIncoming = nodeIdsWithIncoming.has(id);
        const hasOutgoing = nodeIdsWithOutgoing.has(id);
        const isUtility = isFrontendOnlyNode(type);
        const isInCache = !!objectInfo[type];
        const hasWidgets = Array.isArray(node.widgets_values) && node.widgets_values.length > 0;

        if (!hasIncoming && !hasOutgoing && !isUtility && isInCache && !hasWidgets) {
          orphanIds.add(id);
          removedLabels.push(`${type}(#${id})`);
        }
      }

      if (orphanIds.size > 0) {
        workflow.nodes = (workflow.nodes || []).filter((n: any) => !orphanIds.has(Number(n.id)));
        workflow.links = (workflow.links || []).filter((l: any[]) => (
          !orphanIds.has(Number(l[1])) && !orphanIds.has(Number(l[3]))
        ));
        issues.push({
          id: 's2-orphans',
          stage: 2,
          severity: 'info',
          fixStatus: 'auto-fixed',
          message: `Removed ${orphanIds.size} completely isolated node(s): ${removedLabels.join(', ')}`,
          fix: {
            description: 'Isolated nodes removed (zero connections)',
            original: `${orphanIds.size} isolated nodes`,
            corrected: 'Removed',
          },
        });
        modified = true;
      }
    }

    if (opts.deduplicateLoaders && opts.autoFix) {
      const groups = new Map<string, any[]>();
      for (const node of workflow.nodes || []) {
        const schema = objectInfo[String(node.type || '')];
        if (!schema) continue;
        const outputs = schema.output || [];
        const req = Object.values(schema.input?.required || {});
        const emits = outputs.some((t: string) => ['MODEL', 'CLIP', 'VAE'].includes(t));
        const consumes = req.some((cfg: any) => Array.isArray(cfg) && ['MODEL', 'CLIP', 'VAE'].includes(cfg[0]));
        if (!emits || consumes) continue;
        const key = `${node.type}::${JSON.stringify(node.widgets_values || [])}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(node);
      }
      for (const nodes of groups.values()) {
        if (nodes.length <= 1) continue;
        const keep = nodes[0];
        for (const dup of nodes.slice(1)) {
          for (const link of workflow.links || []) {
            if (Number(link[1]) === Number(dup.id)) link[1] = keep.id;
          }
          workflow.nodes = (workflow.nodes || []).filter((n: any) => Number(n.id) !== Number(dup.id));
          issues.push({
            id: `s2-dedup-${dup.id}`,
            stage: 2,
            severity: 'info',
            fixStatus: 'auto-fixed',
            nodeId: String(dup.id),
            nodeClassType: dup.type,
            message: `Deduplicated ${dup.type}(#${dup.id}) to #${keep.id}`,
          });
          modified = true;
        }
      }
    }

    return { workflow, issues, modified };
  }

  const cycle = detectCycle(buildAdjacencyAPI(workflow));
  if (cycle) {
    issues.push({
      id: 's2-cycle',
      stage: 2,
      severity: 'error',
      fixStatus: 'unfixable',
      message: `Circular dependency detected: ${cycle.join(' -> ')}`,
    });
  }

  if (opts.removeOrphans && opts.autoFix && !opts.safeMode) {
    const nodeIdsWithIncoming = new Set<string>();
    const nodeIdsWithOutgoing = new Set<string>();

    for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
      if (!isNumericId(nodeId)) continue;
      for (const inputValue of Object.values((nodeData as any).inputs || {})) {
        if (!isConnectionValue(inputValue)) continue;
        nodeIdsWithOutgoing.add(String((inputValue as any[])[0]));
        nodeIdsWithIncoming.add(nodeId);
      }
    }

    const deleteIds: string[] = [];
    for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
      if (!isNumericId(nodeId)) continue;
      const ct = String((nodeData as any)?.class_type || '');
      const hasIncoming = nodeIdsWithIncoming.has(nodeId);
      const hasOutgoing = nodeIdsWithOutgoing.has(nodeId);
      const isUtility = isFrontendOnlyNode(ct);
      const isInCache = !!objectInfo[ct];

      if (!hasIncoming && !hasOutgoing && !isUtility && isInCache) {
        deleteIds.push(nodeId);
      }
    }

    for (const id of deleteIds) {
      const ct = String((workflow[id] as any)?.class_type || '');
      delete workflow[id];
      issues.push({
        id: `s2-orphan-${id}`,
        stage: 2,
        severity: 'info',
        fixStatus: 'auto-fixed',
        nodeId: id,
        nodeClassType: ct,
        message: `Removed isolated node ${ct}(#${id}) - zero connections`,
      });
      modified = true;
    }
  }

  return { workflow, issues, modified };
}

function stage3Connections(
  workflow: any,
  objectInfo: Record<string, any>,
  opts: Required<ValidationOptions>,
  isUI: boolean,
): StageResult {
  const issues: ValidationIssue[] = [];
  const result = isUI
    ? stage3ConnectionsUI(workflow, objectInfo, opts, issues)
    : stage3ConnectionsAPI(workflow, objectInfo, opts, issues);
  return { workflow: result.workflow, issues, modified: result.modified };
}

function stage3ConnectionsUI(
  workflow: any,
  objectInfo: Record<string, any>,
  opts: Required<ValidationOptions>,
  issues: ValidationIssue[],
): StageResult {
  let modified = false;
  const links = new Map<number, any[]>();
  const nodes = new Map<number, any>();
  for (const link of workflow.links || []) links.set(Number(link[0]), link);
  for (const node of workflow.nodes || []) nodes.set(Number(node.id), node);

  for (const node of workflow.nodes || []) {
    const ct = String(node.type || '');
    const schema = objectInfo[ct];
    if (!schema) {
      if (opts.skipValidationForUnknown) continue;
      issues.push({
        id: `s3-unknown-${node.id}`,
        stage: 3,
        severity: 'info',
        fixStatus: 'manual-review',
        nodeId: String(node.id),
        nodeClassType: ct,
        message: `Skipping deep validation for unknown node type "${ct}"`,
      });
      continue;
    }

    for (const input of node.inputs || []) {
      if (input.link == null) continue;
      const link = links.get(Number(input.link));
      if (!link) {
        issues.push({
          id: `s3-link-${node.id}-${input.name}`,
          stage: 3,
          severity: 'warning',
          fixStatus: opts.autoFix && !opts.safeMode ? 'auto-fixed' : 'manual-review',
          nodeId: String(node.id),
          nodeClassType: ct,
          field: input.name,
          message: `Input "${input.name}" references missing link #${input.link}`,
        });
        if (opts.autoFix && !opts.safeMode) {
          input.link = null;
          modified = true;
        }
        continue;
      }

      const srcNode = nodes.get(Number(link[1]));
      if (!srcNode) {
        issues.push({
          id: `s3-src-${node.id}-${input.name}`,
          stage: 3,
          severity: 'error',
          fixStatus: 'unfixable',
          nodeId: String(node.id),
          nodeClassType: ct,
          field: input.name,
          message: `Source node #${link[1]} not found`,
        });
        continue;
      }

      const srcSchema = objectInfo[String(srcNode.type || '')];
      if (!srcSchema && opts.skipValidationForUnknown) {
        continue;
      }

      const expected = String(input.type || '*');
      const got = String(link[5] || '*');
      if (!isTypeCompatible(got, expected) && got !== '*' && expected !== '*') {
        if (opts.safeMode) {
          issues.push({
            id: `s3-type-ui-${node.id}-${input.name}`,
            stage: 3,
            severity: 'info',
            fixStatus: 'manual-review',
            nodeId: String(node.id),
            nodeClassType: ct,
            field: input.name,
            message: `Possible type mismatch: source outputs ${got} but "${input.name}" expects ${expected}. Passing through to ComfyUI.`,
          });
          continue;
        }
        const srcOutputs = objectInfo[String(srcNode.type || '')]?.output || [];
        const correctedSlot = srcOutputs.findIndex((t: string) => isTypeCompatible(t, expected));
        if (correctedSlot !== -1 && opts.autoFix) {
          link[2] = correctedSlot;
          link[5] = srcOutputs[correctedSlot];
          modified = true;
          issues.push({
            id: `s3-type-ui-${node.id}-${input.name}`,
            stage: 3,
            severity: 'warning',
            fixStatus: 'auto-fixed',
            nodeId: String(node.id),
            nodeClassType: ct,
            field: input.name,
            message: `Type mismatch fixed by switching source slot to ${correctedSlot}`,
          });
        } else {
          issues.push({
            id: `s3-type-ui-${node.id}-${input.name}`,
            stage: 3,
            severity: 'error',
            fixStatus: 'unfixable',
            nodeId: String(node.id),
            nodeClassType: ct,
            field: input.name,
            message: `Type mismatch: got ${got}, expected ${expected}`,
          });
        }
      }
    }
  }

  return { workflow, issues, modified };
}

function stage3ConnectionsAPI(
  workflow: any,
  objectInfo: Record<string, any>,
  opts: Required<ValidationOptions>,
  issues: ValidationIssue[],
): StageResult {
  let modified = false;
  const outputsByNode = new Map<string, string[]>();

  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!isNumericId(nodeId)) continue;
    const ct = String((nodeData as any)?.class_type || '');
    const outputs = objectInfo[ct]?.output;
    if (Array.isArray(outputs)) outputsByNode.set(nodeId, outputs as string[]);
  }

  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!isNumericId(nodeId)) continue;
    const data = nodeData as any;
    const ct = String(data.class_type || '');
    const schema = objectInfo[ct];
    if (!schema) {
      if (opts.skipValidationForUnknown) continue;
      issues.push({
        id: `s3-unknown-${nodeId}`,
        stage: 3,
        severity: 'info',
        fixStatus: 'manual-review',
        nodeId,
        nodeClassType: ct,
        message: `Skipping deep validation for unknown node type "${ct}"`,
      });
      continue;
    }

    const required = schema.input?.required || {};
    const optional = schema.input?.optional || {};
    const allInputs = { ...required, ...optional };
    data.inputs = data.inputs || {};

    for (const [inputName, inputValue] of Object.entries(data.inputs || {})) {
      if (!allInputs[inputName]) {
        if (opts.safeMode) {
          issues.push({
            id: `s3-name-${nodeId}-${inputName}`,
            stage: 3,
            severity: 'info',
            fixStatus: 'manual-review',
            nodeId,
            nodeClassType: ct,
            field: inputName,
            message: `Input "${inputName}" not found in schema for ${ct}. Passing through - ComfyUI may handle this.`,
          });
          continue;
        }

        let fixed = false;
        if (opts.fuzzyMatch && opts.autoFix) {
          const match = fuzzyBest(inputName, Object.keys(allInputs), opts.fuzzyThreshold);
          if (match) {
            data.inputs[match.name] = inputValue;
            delete data.inputs[inputName];
            modified = true;
            fixed = true;
            issues.push({
              id: `s3-name-${nodeId}-${inputName}`,
              stage: 3,
              severity: 'warning',
              fixStatus: 'auto-fixed',
              nodeId,
              nodeClassType: ct,
              field: inputName,
              message: `Input "${inputName}" corrected to "${match.name}"`,
            });
          }
        }
        if (!fixed) {
          issues.push({
            id: `s3-name-${nodeId}-${inputName}`,
            stage: 3,
            severity: 'warning',
            fixStatus: 'manual-review',
            nodeId,
            nodeClassType: ct,
            field: inputName,
            message: `Unknown input "${inputName}" on ${ct}`,
          });
        }
        continue;
      }

      if (!isConnectionValue(inputValue)) continue;
      const [sourceNodeIdRaw, sourceSlotRaw] = inputValue as [string | number, number];
      const sourceNodeId = String(sourceNodeIdRaw);
      const sourceSlot = Number(sourceSlotRaw);
      const sourceNode = workflow[sourceNodeId] as any;

      if (!sourceNode) {
        issues.push({
          id: `s3-src-${nodeId}-${inputName}`,
          stage: 3,
          severity: 'error',
          fixStatus: 'unfixable',
          nodeId,
          nodeClassType: ct,
          field: inputName,
          message: `Input "${inputName}" references missing node #${sourceNodeId}`,
        });
        continue;
      }

      const sourceSchema = objectInfo[String(sourceNode.class_type || '')];
      if (!sourceSchema && opts.skipValidationForUnknown) {
        continue;
      }

      const sourceOutputs = outputsByNode.get(sourceNodeId) || [];
      const expectedType = getInputType(allInputs[inputName]);

      if (sourceSlot < 0 || sourceSlot >= sourceOutputs.length) {
        const corrected = sourceOutputs.findIndex((t) => isTypeCompatible(t, expectedType));
        if (corrected !== -1 && opts.autoFix) {
          data.inputs[inputName] = [sourceNodeId, corrected];
          modified = true;
          issues.push({
            id: `s3-slot-${nodeId}-${inputName}`,
            stage: 3,
            severity: 'warning',
            fixStatus: 'auto-fixed',
            nodeId,
            nodeClassType: ct,
            field: inputName,
            message: `Slot ${sourceSlot} out of range, corrected to ${corrected}`,
          });
        } else {
          issues.push({
            id: `s3-slot-${nodeId}-${inputName}`,
            stage: 3,
            severity: 'error',
            fixStatus: 'unfixable',
            nodeId,
            nodeClassType: ct,
            field: inputName,
            message: `Slot ${sourceSlot} out of range on ${sourceNode.class_type}`,
          });
        }
        continue;
      }

      const gotType = sourceOutputs[sourceSlot];
      if (!isTypeCompatible(gotType, expectedType)) {
        if (opts.safeMode) {
          issues.push({
            id: `s3-type-${nodeId}-${inputName}`,
            stage: 3,
            severity: 'info',
            fixStatus: 'manual-review',
            nodeId,
            nodeClassType: ct,
            field: inputName,
            message: `Possible type mismatch: source outputs ${gotType} but "${inputName}" expects ${expectedType}. Passing through to ComfyUI.`,
          });
          continue;
        }
        const corrected = sourceOutputs.findIndex((t) => isTypeCompatible(t, expectedType));
        if (corrected !== -1 && corrected !== sourceSlot && opts.autoFix) {
          data.inputs[inputName] = [sourceNodeId, corrected];
          modified = true;
          issues.push({
            id: `s3-type-${nodeId}-${inputName}`,
            stage: 3,
            severity: 'warning',
            fixStatus: 'auto-fixed',
            nodeId,
            nodeClassType: ct,
            field: inputName,
            message: `Type mismatch corrected by using slot ${corrected}`,
          });
        } else {
          issues.push({
            id: `s3-type-${nodeId}-${inputName}`,
            stage: 3,
            severity: 'error',
            fixStatus: 'unfixable',
            nodeId,
            nodeClassType: ct,
            field: inputName,
            message: `Type mismatch: got ${gotType}, expected ${expectedType}`,
          });
        }
      }
    }

    for (const [reqName, reqConfig] of Object.entries(required)) {
      if (data.inputs[reqName] !== undefined) continue;
      const reqType = getInputType(reqConfig);

      if (opts.safeMode || !opts.autoConnect) {
        issues.push({
          id: `s3-missing-${nodeId}-${reqName}`,
          stage: 3,
          severity: 'warning',
          fixStatus: 'manual-review',
          nodeId,
          nodeClassType: ct,
          field: reqName,
          message: `Required ${reqType} input "${reqName}" on ${ct} is not connected. ComfyUI may report an error at execution time.`,
        });
        continue;
      }

      if (isWidgetType(reqType)) {
        const defaultValue = getDefaultValue(reqConfig);
        if (defaultValue !== undefined && opts.autoFix) {
          data.inputs[reqName] = defaultValue;
          modified = true;
          issues.push({
            id: `s3-default-${nodeId}-${reqName}`,
            stage: 3,
            severity: 'info',
            fixStatus: 'auto-fixed',
            nodeId,
            nodeClassType: ct,
            field: reqName,
            message: `Applied default for missing "${reqName}"`,
          });
          continue;
        }
      }

      if (!isWidgetType(reqType) && opts.autoConnect && opts.autoFix) {
        const source = findSourceForType(workflow, objectInfo, nodeId, reqType);
        if (source) {
          data.inputs[reqName] = [source.nodeId, source.slotIndex];
          modified = true;
          issues.push({
            id: `s3-autoconnect-${nodeId}-${reqName}`,
            stage: 3,
            severity: 'warning',
            fixStatus: 'auto-fixed',
            nodeId,
            nodeClassType: ct,
            field: reqName,
            message: `Auto-connected ${reqName} from ${source.classType}(#${source.nodeId})[${source.slotIndex}]`,
          });
          continue;
        }
      }

      issues.push({
        id: `s3-missing-${nodeId}-${reqName}`,
        stage: 3,
        severity: 'warning',
        fixStatus: 'manual-review',
        nodeId,
        nodeClassType: ct,
        field: reqName,
        message: `Missing required input "${reqName}" (${reqType}).`,
      });
    }
  }

  return { workflow, issues, modified };
}

function stage4WidgetValues(
  workflow: any,
  objectInfo: Record<string, any>,
  opts: Required<ValidationOptions>,
  isUI: boolean,
): StageResult {
  const issues: ValidationIssue[] = [];
  let modified = false;
  if (isUI) return { workflow, issues, modified };

  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!isNumericId(nodeId)) continue;
    const data = nodeData as any;
    const ct = String(data.class_type || '');
    const schema = objectInfo[ct];
    if (!schema) continue;
    const allInputs = { ...(schema.input?.required || {}), ...(schema.input?.optional || {}) };

    for (const [inputName, inputValue] of Object.entries(data.inputs || {})) {
      if (isConnectionValue(inputValue)) continue;
      const inputSchema = allInputs[inputName];
      if (!inputSchema) continue;
      const check = validateValue(inputValue, inputSchema, inputName, ct, nodeId, opts);
      if (check.issue) issues.push(check.issue);
      if (check.corrected !== undefined && check.corrected !== inputValue) {
        data.inputs[inputName] = check.corrected;
        modified = true;
      }
    }
  }

  return { workflow, issues, modified };
}

function validateValue(
  value: any,
  schema: any,
  inputName: string,
  classType: string,
  nodeId: string,
  opts: Required<ValidationOptions>,
): { issue?: ValidationIssue; corrected?: any } {
  if (!Array.isArray(schema)) return {};
  const [type, options] = schema;

  if (Array.isArray(type)) {
    if (type.includes(value)) return {};

    const lower = inputName.toLowerCase();
    const modelLikeWidgets = new Set([
      'ckpt_name',
      'lora_name',
      'vae_name',
      'control_net_name',
      'clip_name',
      'clip_name1',
      'clip_name2',
      'model_name',
      'unet_name',
      'hypernetwork_name',
      'style_model_name',
      'gligen_name',
      'ipadapter_file',
      'instantid_file',
      'photomaker_model_name',
      'upscale_model_name',
    ]);
    const isModelEnum = (
      modelLikeWidgets.has(lower)
      || lower.includes('model')
      || lower.includes('ckpt')
      || lower.includes('lora')
      || lower.includes('vae')
      || lower.includes('controlnet')
      || lower.includes('upscale')
      || lower.includes('clip')
      || lower.includes('unet')
      || lower.includes('hypernetwork')
      || lower.includes('gligen')
      || lower.includes('ipadapter')
      || lower.includes('instantid')
    );

    if (isModelEnum) {
      return {
        issue: {
          id: `s4-enum-${nodeId}-${inputName}`,
          stage: 4,
          severity: 'info',
          fixStatus: 'manual-review',
          nodeId,
          nodeClassType: classType,
          field: inputName,
          message: `Value "${value}" for "${inputName}" not in current dropdown list - may be a recently added model or resource. Passing through.`,
        },
      };
    }

    if (opts.safeMode) {
      return {
        issue: {
          id: `s4-enum-${nodeId}-${inputName}`,
          stage: 4,
          severity: 'warning',
          fixStatus: 'manual-review',
          nodeId,
          nodeClassType: classType,
          field: inputName,
          message: `Value "${value}" for "${inputName}" not in allowed list. Passing through to ComfyUI.`,
        },
      };
    }

    if (typeof value === 'string' && opts.fuzzyMatch && opts.autoFix) {
      const choice = fuzzyBest(value, type.filter((v: any) => typeof v === 'string'), 0.5);
      if (choice) {
        return {
          corrected: choice.name,
          issue: {
            id: `s4-enum-${nodeId}-${inputName}`,
            stage: 4,
            severity: 'warning',
            fixStatus: 'auto-fixed',
            nodeId,
            nodeClassType: classType,
            field: inputName,
            message: `Invalid enum "${value}" corrected to "${choice.name}"`,
          },
        };
      }
    }
    return {
      issue: {
        id: `s4-enum-${nodeId}-${inputName}`,
        stage: 4,
        severity: 'warning',
        fixStatus: 'manual-review',
        nodeId,
        nodeClassType: classType,
        field: inputName,
        message: `Invalid enum value "${value}"`,
      },
    };
  }

  if (type === 'INT' || type === 'FLOAT') {
    if (typeof value === 'string' && opts.autoFix && Number.isFinite(Number(value))) {
      const coerced = type === 'INT' ? Math.round(Number(value)) : Number(value);
      return clampNumeric(coerced, options, inputName, classType, nodeId, opts, value);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return {
        issue: {
          id: `s4-type-${nodeId}-${inputName}`,
          stage: 4,
          severity: 'warning',
          fixStatus: 'manual-review',
          nodeId,
          nodeClassType: classType,
          field: inputName,
          message: `Expected ${type}, got ${typeof value}`,
        },
      };
    }
    return clampNumeric(value, options, inputName, classType, nodeId, opts);
  }

  if (type === 'BOOLEAN' && typeof value === 'string' && opts.autoFix) {
    const corrected = value.toLowerCase() === 'true' || value === '1';
    return {
      corrected,
      issue: {
        id: `s4-bool-${nodeId}-${inputName}`,
        stage: 4,
        severity: 'info',
        fixStatus: 'auto-fixed',
        nodeId,
        nodeClassType: classType,
        field: inputName,
        message: `Coerced "${value}" to boolean ${corrected}`,
      },
    };
  }

  return {};
}

function clampNumeric(
  value: number,
  options: any,
  inputName: string,
  classType: string,
  nodeId: string,
  opts: Required<ValidationOptions>,
  original?: any,
): { issue?: ValidationIssue; corrected?: number } {
  let corrected = value;
  if (options?.min !== undefined && corrected < options.min) corrected = options.min;
  if (options?.max !== undefined && corrected > options.max) corrected = options.max;
  if (corrected === value && original === undefined) return {};

  if (corrected !== value) {
    if (!opts.autoFix || !opts.autoClamp) {
      return {
        issue: {
          id: `s4-range-${nodeId}-${inputName}`,
          stage: 4,
          severity: 'warning',
          fixStatus: 'manual-review',
          nodeId,
          nodeClassType: classType,
          field: inputName,
          message: `Value ${value} out of range`,
        },
      };
    }
    return {
      corrected,
      issue: {
        id: `s4-range-${nodeId}-${inputName}`,
        stage: 4,
        severity: 'warning',
        fixStatus: 'auto-fixed',
        nodeId,
        nodeClassType: classType,
        field: inputName,
        message: `Clamped ${value} to ${corrected}`,
      },
    };
  }

  return {
    corrected: value,
    issue: original !== undefined ? {
      id: `s4-coerce-${nodeId}-${inputName}`,
      stage: 4,
      severity: 'info',
      fixStatus: 'auto-fixed',
      nodeId,
      nodeClassType: classType,
      field: inputName,
      message: `Coerced "${original}" to numeric ${value}`,
    } : undefined,
  };
}

export function quickValidate(workflow: any): { valid: boolean; errorCount: number; warningCount: number } {
  const objectInfo = getLiveNodeCache()?.nodes as Record<string, any> | undefined;
  if (!workflow) return { valid: true, errorCount: 0, warningCount: 0 };
  if (!objectInfo) return { valid: true, errorCount: 0, warningCount: 0 };
  const isUI = Array.isArray(workflow?.nodes) && Array.isArray(workflow?.links);
  let errors = 0;
  let warnings = 0;

  if (isUI) {
    for (const node of workflow.nodes || []) {
      const ct = String(node?.type || '');
      if (!ct || isFrontendOnlyNode(ct)) continue;
      if (!objectInfo[ct]) warnings += 1;
    }
    return { valid: errors === 0, errorCount: errors, warningCount: warnings };
  }

  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!isNumericId(nodeId)) continue;
    const ct = String((nodeData as any)?.class_type || '');
    if (!ct || isFrontendOnlyNode(ct)) continue;
    if (!objectInfo[ct]) warnings += 1;
  }
  return { valid: errors === 0, errorCount: errors, warningCount: warnings };
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function isNumericId(id: string): boolean {
  return /^\d+$/.test(id);
}

function isFrontendOnlyNode(classType: string): boolean {
  const ct = classType.toLowerCase();
  return ct === 'note' || ct === 'reroute' || ct === 'group' || ct.startsWith('//');
}

function isConnectionValue(value: any): boolean {
  return Array.isArray(value) && value.length === 2 && isNumericId(String(value[0])) && typeof value[1] === 'number';
}

function isTypeCompatible(outputType: string, inputType: string): boolean {
  if (!outputType || !inputType) return true;
  if (outputType === inputType) return true;
  if (outputType === '*' || inputType === '*') return true;
  if ((outputType === 'MASK' && inputType === 'IMAGE') || (outputType === 'IMAGE' && inputType === 'MASK')) return true;
  return false;
}

function getInputType(schema: any): string {
  if (!Array.isArray(schema)) return '*';
  if (typeof schema[0] === 'string') return schema[0];
  if (Array.isArray(schema[0])) return 'COMBO';
  return '*';
}

function isWidgetType(type: string): boolean {
  return ['INT', 'FLOAT', 'STRING', 'BOOLEAN', 'COMBO'].includes(type);
}

function getDefaultValue(schema: any): any {
  if (!Array.isArray(schema)) return undefined;
  const [type, options] = schema;
  if (Array.isArray(type) && type.length > 0) return type[0];
  if (options?.default !== undefined) return options.default;
  if (type === 'INT') return options?.min ?? 0;
  if (type === 'FLOAT') return options?.min ?? 0;
  if (type === 'STRING') return '';
  if (type === 'BOOLEAN') return false;
  return undefined;
}

function findSourceForType(
  workflow: any,
  objectInfo: Record<string, any>,
  targetNodeId: string,
  requiredType: string,
): { nodeId: string; slotIndex: number; classType: string } | null {
  const matches: Array<{ nodeId: string; slotIndex: number; classType: string; distance: number }> = [];
  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!isNumericId(nodeId) || nodeId === targetNodeId) continue;
    const ct = String((nodeData as any)?.class_type || '');
    const outputs = objectInfo[ct]?.output;
    if (!Array.isArray(outputs)) continue;
    outputs.forEach((outType: string, slotIndex: number) => {
      if (isTypeCompatible(outType, requiredType)) {
        matches.push({ nodeId, slotIndex, classType: ct, distance: Math.abs(Number(nodeId) - Number(targetNodeId)) });
      }
    });
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => a.distance - b.distance);
  return matches[0];
}

function buildAdjacencyUI(workflow: any): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of workflow.nodes || []) adj.set(String(node.id), []);
  for (const link of workflow.links || []) {
    const from = String(link[1]);
    const to = String(link[3]);
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push(to);
  }
  return adj;
}

function buildAdjacencyAPI(workflow: any): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const nodeId of Object.keys(workflow || {})) if (isNumericId(nodeId)) adj.set(nodeId, []);
  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!isNumericId(nodeId)) continue;
    for (const inputValue of Object.values((nodeData as any).inputs || {})) {
      if (!isConnectionValue(inputValue)) continue;
      const from = String((inputValue as any[])[0]);
      if (!adj.has(from)) adj.set(from, []);
      adj.get(from)!.push(nodeId);
    }
  }
  return adj;
}

function detectCycle(adj: Map<string, string[]>): string[] | null {
  const visited = new Set<string>();
  const stackSet = new Set<string>();
  for (const root of adj.keys()) {
    if (visited.has(root)) continue;
    const stack: Array<{ node: string; idx: number }> = [{ node: root, idx: 0 }];
    visited.add(root);
    stackSet.add(root);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const children = adj.get(frame.node) || [];
      if (frame.idx >= children.length) {
        stackSet.delete(frame.node);
        stack.pop();
        continue;
      }
      const child = children[frame.idx];
      frame.idx += 1;
      if (stackSet.has(child)) {
        const cycle = [child];
        for (let i = stack.length - 1; i >= 0; i -= 1) {
          cycle.unshift(stack[i].node);
          if (stack[i].node === child) break;
        }
        return cycle;
      }
      if (!visited.has(child)) {
        visited.add(child);
        stackSet.add(child);
        stack.push({ node: child, idx: 0 });
      }
    }
  }
  return null;
}

function findReachableUI(workflow: any, starts: Set<number>): Set<number> {
  const reverse = new Map<number, number[]>();
  for (const link of workflow.links || []) {
    const from = Number(link[1]);
    const to = Number(link[3]);
    if (!reverse.has(to)) reverse.set(to, []);
    reverse.get(to)!.push(from);
  }
  const seen = new Set<number>();
  const queue = [...starts];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    for (const parent of reverse.get(nodeId) || []) if (!seen.has(parent)) queue.push(parent);
  }
  return seen;
}

function findReachableAPI(workflow: any, starts: Set<string>): Set<string> {
  const reverse = new Map<string, string[]>();
  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!isNumericId(nodeId)) continue;
    for (const inputValue of Object.values((nodeData as any).inputs || {})) {
      if (!isConnectionValue(inputValue)) continue;
      const from = String((inputValue as any[])[0]);
      if (!reverse.has(nodeId)) reverse.set(nodeId, []);
      reverse.get(nodeId)!.push(from);
    }
  }
  const seen = new Set<string>();
  const queue = [...starts];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    for (const parent of reverse.get(nodeId) || []) if (!seen.has(parent)) queue.push(parent);
  }
  return seen;
}

function similarity(a: string, b: string): number {
  const lhs = a.toLowerCase();
  const rhs = b.toLowerCase();
  if (!lhs && !rhs) return 1;
  const d = levenshtein(lhs, rhs);
  return 1 - d / Math.max(lhs.length, rhs.length);
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[rows - 1][cols - 1];
}

function fuzzyBest(target: string, candidates: string[], threshold: number): { name: string; score: number } | null {
  let best: { name: string; score: number } | null = null;
  for (const candidate of candidates || []) {
    const score = similarity(target, candidate);
    if (score < threshold) continue;
    if (!best || score > best.score) best = { name: candidate, score };
  }
  return best;
}

function similarNames(target: string, candidates: string[], count: number): string[] {
  return [...(candidates || [])]
    .map((name) => ({ name, score: similarity(target, name) }))
    .filter((item) => item.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => item.name);
}

function calculateConfidence(issues: ValidationIssue[]): number {
  if (issues.length === 0) return 100;
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        if (issue.fixStatus === 'unfixable') score -= 25;
        else if (issue.fixStatus === 'auto-fixed') score -= 3;
        else score -= 10;
        break;
      case 'warning':
        if (issue.fixStatus === 'auto-fixed') score -= 1;
        else score -= 3;
        break;
      case 'info':
      default:
        score -= 0.5;
        break;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildSummary(
  issues: ValidationIssue[],
  autoFixed: number,
  unfixable: number,
  isValid: boolean,
  confidence: number,
): string {
  if (issues.length === 0) return 'Validation passed - no issues found. Confidence: 100%.';
  const parts: string[] = [];
  parts.push(isValid ? `Validation passed with ${issues.length} issue(s).` : `Validation failed - ${unfixable} unfixable error(s).`);
  if (autoFixed > 0) parts.push(`${autoFixed} auto-fixed.`);
  parts.push(`Confidence: ${confidence}%.`);
  return parts.join(' ');
}

function buildErrorContext(errors: ValidationIssue[]): string {
  const lines: string[] = [
    '--- WORKFLOW VALIDATION ERRORS (from previous attempt) ---',
    'Please fix all of the following errors in the regenerated workflow:',
    '',
  ];
  for (const issue of errors) {
    lines.push(`ERROR in node #${issue.nodeId || '?'} (${issue.nodeClassType || '?'}):`);
    lines.push(`  ${issue.message}`);
    if (issue.details) lines.push(`  Details: ${issue.details}`);
    lines.push('');
  }
  lines.push('Please regenerate the full corrected workflow JSON.');
  lines.push('--- END VALIDATION ERRORS ---');
  return lines.join('\n');
}

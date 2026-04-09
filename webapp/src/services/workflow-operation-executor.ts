/**
 * Phase 11C - Workflow Operation Executor
 *
 * Applies operation lists to a workflow (UI or API format) without mutating the
 * original object. Compound ops are resolved into atomic ops first.
 */

import { getLiveNodeCache, getLiveNodeSchema } from './comfyui-backend';
import { NODE_REGISTRY } from '../data/node-registry';
import type {
  ModificationResult,
  OpAddNode,
  OpAppendChain,
  OpBypassNode,
  OpConnect,
  OpDisconnect,
  OpDuplicateNode,
  OpInsertBetween,
  OpRemoveNode,
  OpReplaceChain,
  OpReplaceNode,
  OpSetValue,
  OpSwapNodes,
  OperationResult,
  WorkflowOperation,
} from './workflow-operations';

export function executeOperations(workflow: any, operations: WorkflowOperation[]): ModificationResult {
  const objectInfo = ((getLiveNodeCache()?.nodes || {}) as Record<string, any>);
  const wf = clone(workflow);
  const isUI = Array.isArray(wf?.nodes) && Array.isArray(wf?.links);
  const operationResults: OperationResult[] = [];
  let wasModified = false;

  for (const operation of operations) {
    try {
      const atomic = resolveCompoundOp(operation, wf, objectInfo, isUI);
      if (atomic.length === 0) {
        const result = applyAtomicOp(operation, wf, objectInfo, isUI);
        operationResults.push(result);
        if (result.success) wasModified = true;
        continue;
      }

      const subResults: OperationResult[] = [];
      let allSucceeded = true;
      for (const step of atomic) {
        const stepResult = applyAtomicOp(step, wf, objectInfo, isUI);
        subResults.push(stepResult);
        if (!stepResult.success) {
          allSucceeded = false;
          break;
        }
      }

      operationResults.push({
        success: allSucceeded,
        op: operation,
        message: allSucceeded
          ? `${operation.op} resolved into ${atomic.length} atomic step(s)`
          : `${operation.op} failed after ${subResults.length} step(s)`,
        createdNodeIds: subResults.flatMap((item) => item.createdNodeIds || []),
        removedNodeIds: subResults.flatMap((item) => item.removedNodeIds || []),
        createdConnections: subResults.flatMap((item) => item.createdConnections || []),
        removedConnections: subResults.flatMap((item) => item.removedConnections || []),
        error: allSucceeded ? undefined : subResults.find((item) => !item.success)?.error,
      });

      if (allSucceeded) wasModified = true;
    } catch (error: any) {
      operationResults.push({
        success: false,
        op: operation,
        message: `${operation.op} threw exception`,
        error: error?.message || String(error),
      });
    }
  }

  const successCount = operationResults.filter((item) => item.success).length;
  const failCount = operationResults.length - successCount;
  return {
    workflow: wf,
    wasModified,
    operationResults,
    allSucceeded: failCount === 0,
    successCount,
    failCount,
    summary: `${successCount}/${operationResults.length} operation(s) succeeded`,
  };
}

function resolveCompoundOp(
  op: WorkflowOperation,
  workflow: any,
  objectInfo: Record<string, any>,
  isUI: boolean,
): WorkflowOperation[] {
  switch (op.op) {
    case 'INSERT_BETWEEN':
      return resolveInsertBetween(op, workflow, objectInfo, isUI);
    case 'APPEND_CHAIN':
      return resolveAppendChain(op, workflow, objectInfo, isUI);
    case 'REPLACE_CHAIN':
      return resolveReplaceChain(op, workflow, objectInfo, isUI);
    case 'DUPLICATE_NODE':
      return resolveDuplicateNode(op, workflow, isUI);
    case 'SWAP_NODES':
      return resolveSwapNodes(op, workflow, isUI);
    case 'BYPASS_NODE':
      return resolveBypassNode(op, workflow, isUI);
    default:
      return [];
  }
}

function resolveInsertBetween(
  op: OpInsertBetween,
  workflow: any,
  objectInfo: Record<string, any>,
  isUI: boolean,
): WorkflowOperation[] {
  const newId = op.new_id || String(getNextNodeId(workflow, isUI));
  const ops: WorkflowOperation[] = [{
    op: 'ADD_NODE',
    id: newId,
    class_type: op.new_class_type,
    widgets: op.widgets,
  }];

  const existing = findConnection(workflow, op.source_id, op.target_id, op.via_type, isUI);
  if (!existing) return ops;

  const schema = resolveNodeSchema(op.new_class_type, objectInfo);
  const inputName = findInputByType(schema, op.via_type);
  const outputSlot = findOutputSlotByType(schema, op.via_type);
  if (inputName == null || outputSlot == null) return ops;

  ops.push({ op: 'DISCONNECT', target_id: op.target_id, target_input: existing.targetInput });
  ops.push({
    op: 'CONNECT',
    source_id: op.source_id,
    source_slot: existing.sourceSlot,
    target_id: newId,
    target_input: inputName,
  });
  ops.push({
    op: 'CONNECT',
    source_id: newId,
    source_slot: outputSlot,
    target_id: op.target_id,
    target_input: existing.targetInput,
  });

  return ops;
}

function resolveAppendChain(
  op: OpAppendChain,
  workflow: any,
  objectInfo: Record<string, any>,
  isUI: boolean,
): WorkflowOperation[] {
  const ops: WorkflowOperation[] = [];
  let currentSourceId = op.after_node_id;
  let currentSourceSlot = op.after_slot ?? 0;
  let currentType = op.via_type;

  let intercepted: { targetId: string; targetInput: string } | null = null;
  if (op.intercept) {
    intercepted = findOutputTarget(workflow, op.after_node_id, currentSourceSlot, isUI);
    if (intercepted) {
      ops.push({ op: 'DISCONNECT', target_id: intercepted.targetId, target_input: intercepted.targetInput });
    }
  }

  const baseId = getNextNodeId(workflow, isUI);
  op.chain.forEach((chainNode, index) => {
    const newId = String(baseId + index);
    ops.push({
      op: 'ADD_NODE',
      id: newId,
      class_type: chainNode.class_type,
      widgets: chainNode.widgets,
    });

    const schema = resolveNodeSchema(chainNode.class_type, objectInfo);
    const targetInput = findInputByType(schema, currentType);
    if (targetInput != null) {
      ops.push({
        op: 'CONNECT',
        source_id: currentSourceId,
        source_slot: currentSourceSlot,
        target_id: newId,
        target_input: targetInput,
      });
    }

    const preferredOutputSlot = findOutputSlotByType(schema, currentType);
    if (preferredOutputSlot != null) {
      currentSourceSlot = preferredOutputSlot;
    } else {
      currentSourceSlot = 0;
      const outputType = getSchemaOutputType(schema, 0);
      if (outputType) currentType = outputType;
    }
    currentSourceId = newId;
  });

  if (intercepted) {
    ops.push({
      op: 'CONNECT',
      source_id: currentSourceId,
      source_slot: currentSourceSlot,
      target_id: intercepted.targetId,
      target_input: intercepted.targetInput,
    });
  }

  return ops;
}

function resolveReplaceChain(
  op: OpReplaceChain,
  workflow: any,
  objectInfo: Record<string, any>,
  isUI: boolean,
): WorkflowOperation[] {
  const chainIds = findChainBetween(workflow, op.start_id, op.end_id, isUI);
  const incoming = op.keep_start_inputs !== false ? getIncomingConnections(workflow, op.start_id, isUI) : [];
  const outgoing = op.keep_end_outputs !== false ? getOutgoingConnections(workflow, op.end_id, isUI) : [];
  const ops: WorkflowOperation[] = [];

  for (const nodeId of chainIds) {
    ops.push({ op: 'REMOVE_NODE', id: nodeId });
  }

  const baseId = getNextNodeId(workflow, isUI);
  const newIds: string[] = [];
  op.new_chain.forEach((entry, index) => {
    const id = String(baseId + index);
    newIds.push(id);
    ops.push({ op: 'ADD_NODE', id, class_type: entry.class_type, widgets: entry.widgets });
  });

  for (let index = 0; index < newIds.length - 1; index += 1) {
    const sourceSchema = resolveNodeSchema(op.new_chain[index].class_type, objectInfo);
    const targetSchema = resolveNodeSchema(op.new_chain[index + 1].class_type, objectInfo);
    const sourceOutputs = getSchemaOutputs(sourceSchema);
    for (const output of sourceOutputs) {
      const targetInput = findInputByType(targetSchema, output.type);
      if (!targetInput) continue;
      ops.push({
        op: 'CONNECT',
        source_id: newIds[index],
        source_slot: output.slotIndex,
        target_id: newIds[index + 1],
        target_input: targetInput,
      });
      break;
    }
  }

  if (newIds.length > 0) {
    const firstSchema = resolveNodeSchema(op.new_chain[0].class_type, objectInfo);
    for (const connection of incoming) {
      const input = findInputByType(firstSchema, connection.type);
      if (!input) continue;
      ops.push({
        op: 'CONNECT',
        source_id: connection.sourceId,
        source_slot: connection.sourceSlot,
        target_id: newIds[0],
        target_input: input,
      });
    }

    const lastSchema = resolveNodeSchema(op.new_chain[op.new_chain.length - 1].class_type, objectInfo);
    for (const connection of outgoing) {
      const slot = findOutputSlotByType(lastSchema, connection.type);
      if (slot == null) continue;
      ops.push({
        op: 'CONNECT',
        source_id: newIds[newIds.length - 1],
        source_slot: slot,
        target_id: connection.targetId,
        target_input: connection.targetInput,
      });
    }
  }

  return ops;
}

function resolveDuplicateNode(op: OpDuplicateNode, workflow: any, isUI: boolean): WorkflowOperation[] {
  const source = getNodeData(workflow, op.source_id, isUI);
  if (!source) return [];
  const newId = op.new_id || String(getNextNodeId(workflow, isUI));
  const widgets = { ...source.widgets, ...(op.widget_overrides || {}) };
  const ops: WorkflowOperation[] = [{ op: 'ADD_NODE', id: newId, class_type: source.classType, widgets }];
  if (op.copy_connections !== false) {
    const incoming = getIncomingConnections(workflow, op.source_id, isUI);
    for (const connection of incoming) {
      ops.push({
        op: 'CONNECT',
        source_id: connection.sourceId,
        source_slot: connection.sourceSlot,
        target_id: newId,
        target_input: connection.targetInput,
      });
    }
  }
  return ops;
}

function resolveSwapNodes(op: OpSwapNodes, workflow: any, isUI: boolean): WorkflowOperation[] {
  const ops: WorkflowOperation[] = [];
  const aIncoming = getIncomingConnections(workflow, op.node_a_id, isUI);
  const bIncoming = getIncomingConnections(workflow, op.node_b_id, isUI);
  const aOutgoing = getOutgoingConnections(workflow, op.node_a_id, isUI);
  const bOutgoing = getOutgoingConnections(workflow, op.node_b_id, isUI);

  for (const connection of aIncoming) {
    ops.push({ op: 'DISCONNECT', target_id: op.node_a_id, target_input: connection.targetInput });
  }
  for (const connection of bIncoming) {
    ops.push({ op: 'DISCONNECT', target_id: op.node_b_id, target_input: connection.targetInput });
  }
  for (const connection of aIncoming) {
    ops.push({
      op: 'CONNECT',
      source_id: connection.sourceId,
      source_slot: connection.sourceSlot,
      target_id: op.node_b_id,
      target_input: connection.targetInput,
    });
  }
  for (const connection of bIncoming) {
    ops.push({
      op: 'CONNECT',
      source_id: connection.sourceId,
      source_slot: connection.sourceSlot,
      target_id: op.node_a_id,
      target_input: connection.targetInput,
    });
  }
  for (const connection of aOutgoing) {
    ops.push({
      op: 'CONNECT',
      source_id: op.node_b_id,
      source_slot: connection.sourceSlot,
      target_id: connection.targetId,
      target_input: connection.targetInput,
    });
  }
  for (const connection of bOutgoing) {
    ops.push({
      op: 'CONNECT',
      source_id: op.node_a_id,
      source_slot: connection.sourceSlot,
      target_id: connection.targetId,
      target_input: connection.targetInput,
    });
  }
  return ops;
}

function resolveBypassNode(op: OpBypassNode, workflow: any, isUI: boolean): WorkflowOperation[] {
  const incoming = getIncomingConnections(workflow, op.id, isUI)
    .find((connection) => connection.type === op.via_type || connection.type === '*');
  const outgoing = getOutgoingConnections(workflow, op.id, isUI)
    .filter((connection) => connection.type === op.via_type || connection.type === '*');
  if (!incoming || outgoing.length === 0) return [];

  const ops: WorkflowOperation[] = [{
    op: 'DISCONNECT',
    target_id: op.id,
    target_input: incoming.targetInput,
  }];
  for (const connection of outgoing) {
    ops.push({
      op: 'CONNECT',
      source_id: incoming.sourceId,
      source_slot: incoming.sourceSlot,
      target_id: connection.targetId,
      target_input: connection.targetInput,
    });
  }
  ops.push({ op: 'REMOVE_NODE', id: op.id });
  return ops;
}

function applyAtomicOp(
  op: WorkflowOperation,
  workflow: any,
  objectInfo: Record<string, any>,
  isUI: boolean,
): OperationResult {
  switch (op.op) {
    case 'ADD_NODE': return applyAddNode(op, workflow, objectInfo, isUI);
    case 'REMOVE_NODE': return applyRemoveNode(op, workflow, isUI);
    case 'REPLACE_NODE': return applyReplaceNode(op, workflow, objectInfo, isUI);
    case 'CONNECT': return applyConnect(op, workflow, objectInfo, isUI);
    case 'DISCONNECT': return applyDisconnect(op, workflow, isUI);
    case 'SET_VALUE': return applySetValue(op, workflow, isUI);
    default:
      return { success: false, op, message: `Unsupported atomic op ${op.op}`, error: 'Unsupported op' };
  }
}

function applyAddNode(op: OpAddNode, workflow: any, objectInfo: Record<string, any>, isUI: boolean): OperationResult {
  const schema = resolveNodeSchema(op.class_type, objectInfo);

  if (isUI) {
    const duplicate = (workflow.nodes || []).find((node: any) => String(node.id) === op.id);
    if (duplicate) return { success: false, op, message: `Node #${op.id} already exists`, error: 'Duplicate node ID' };

    if (!schema) {
      const position = op.position || calculateNewNodePosition(workflow);
      workflow.nodes = workflow.nodes || [];
      workflow.nodes.push({
        id: Number(op.id),
        type: op.class_type,
        pos: position,
        size: [300, 150],
        flags: {},
        order: workflow.nodes.length,
        mode: 0,
        title: op.title,
        inputs: [],
        outputs: [],
        widgets_values: op.widgets ? Object.values(op.widgets) : [],
        properties: { 'Node name for S&R': op.class_type },
      });
      workflow.last_node_id = Math.max(Number(workflow.last_node_id || 0), Number(op.id));
      return {
        success: true,
        op,
        message: `Added ${op.class_type} as node #${op.id} (not in /object_info cache - minimal structure created)`,
        createdNodeIds: [op.id],
      };
    }

    const inputs = buildUIInputs(schema);
    const outputs = buildUIOutputs(schema);
    const widgetsValues = buildWidgetValues(schema, op.widgets);
    const position = op.position || calculateNewNodePosition(workflow);

    workflow.nodes = workflow.nodes || [];
    workflow.nodes.push({
      id: Number(op.id),
      type: op.class_type,
      pos: position,
      size: [300, 150],
      flags: {},
      order: workflow.nodes.length,
      mode: 0,
      title: op.title,
      inputs: inputs.length > 0 ? inputs : undefined,
      outputs: outputs.length > 0 ? outputs : undefined,
      widgets_values: widgetsValues.length > 0 ? widgetsValues : undefined,
      properties: { 'Node name for S&R': op.class_type },
    });
    workflow.last_node_id = Math.max(Number(workflow.last_node_id || 0), Number(op.id));
    return { success: true, op, message: `Added #${op.id} ${op.class_type}`, createdNodeIds: [op.id] };
  }

  if (workflow[op.id]) return { success: false, op, message: `Node #${op.id} already exists`, error: 'Duplicate node ID' };
  if (!schema) {
    workflow[op.id] = {
      class_type: op.class_type,
      inputs: op.widgets || {},
      _meta: op.title ? { title: op.title } : undefined,
    };
    return {
      success: true,
      op,
      message: `Added ${op.class_type} as node #${op.id} (not in cache - passing through to ComfyUI)`,
      createdNodeIds: [op.id],
    };
  }

  const inputs = buildAPIInputs(schema, op.widgets);
  workflow[op.id] = { class_type: op.class_type, inputs, _meta: op.title ? { title: op.title } : undefined };
  return { success: true, op, message: `Added #${op.id} ${op.class_type}`, createdNodeIds: [op.id] };
}

function applyRemoveNode(op: OpRemoveNode, workflow: any, isUI: boolean): OperationResult {
  if (isUI) {
    const nodeId = Number(op.id);
    const existing = (workflow.nodes || []).some((node: any) => Number(node.id) === nodeId);
    if (!existing) return { success: false, op, message: `Node #${op.id} not found`, error: 'Node not found' };

    workflow.nodes = (workflow.nodes || []).filter((node: any) => Number(node.id) !== nodeId);
    workflow.links = (workflow.links || []).filter((link: any[]) => Number(link[1]) !== nodeId && Number(link[3]) !== nodeId);

    for (const node of workflow.nodes || []) {
      for (const input of node.inputs || []) {
        if (input.link == null) continue;
        const exists = (workflow.links || []).some((link: any[]) => Number(link[0]) === Number(input.link));
        if (!exists) input.link = null;
      }
      for (const output of node.outputs || []) {
        output.links = (output.links || []).filter((linkId: number) =>
          (workflow.links || []).some((link: any[]) => Number(link[0]) === Number(linkId)));
      }
    }

    return { success: true, op, message: `Removed node #${op.id}`, removedNodeIds: [op.id] };
  }

  if (!workflow[op.id]) return { success: false, op, message: `Node #${op.id} not found`, error: 'Node not found' };
  delete workflow[op.id];
  for (const [, nodeData] of Object.entries(workflow || {})) {
    const data = nodeData as any;
    for (const [inputName, value] of Object.entries(data.inputs || {})) {
      if (Array.isArray(value) && String(value[0]) === op.id) {
        delete data.inputs[inputName];
      }
    }
  }
  return { success: true, op, message: `Removed node #${op.id}`, removedNodeIds: [op.id] };
}

function applyReplaceNode(op: OpReplaceNode, workflow: any, objectInfo: Record<string, any>, isUI: boolean): OperationResult {
  const schema = resolveNodeSchema(op.new_class_type, objectInfo);
  if (!schema) {
    return { success: false, op, message: `Unknown class_type ${op.new_class_type}`, error: 'Unknown class_type' };
  }

  if (isUI) {
    const node = (workflow.nodes || []).find((item: any) => String(item.id) === op.id);
    if (!node) return { success: false, op, message: `Node #${op.id} not found`, error: 'Node not found' };
    const previous = node.type;
    node.type = op.new_class_type;

    // Critical: rebuild positional widgets_values for the NEW class_type.
    // Keeping the old array causes shifted/mistyped values during WidgetMap.
    const nextWidgetValues = buildWidgetValues(schema, op.widgets);
    if (nextWidgetValues.length > 0) {
      node.widgets_values = nextWidgetValues;
    } else {
      delete node.widgets_values;
    }

    node.properties = {
      ...(node.properties || {}),
      'Node name for S&R': op.new_class_type,
    };

    // If graph metadata is missing, repopulate from schema.
    if (!Array.isArray(node.inputs) || node.inputs.length === 0) {
      const uiInputs = buildUIInputs(schema);
      if (uiInputs.length > 0) node.inputs = uiInputs;
    }
    if (!Array.isArray(node.outputs) || node.outputs.length === 0) {
      const uiOutputs = buildUIOutputs(schema);
      if (uiOutputs.length > 0) node.outputs = uiOutputs;
    }

    return {
      success: true,
      op,
      message: `Replaced node #${op.id}: ${previous} -> ${op.new_class_type} (rebuilt ${nextWidgetValues.length} widget value(s))`,
    };
  }

  const node = workflow[op.id] as any;
  if (!node) return { success: false, op, message: `Node #${op.id} not found`, error: 'Node not found' };
  const previous = node.class_type;
  node.class_type = op.new_class_type;

  // Rebuild widget inputs for API format while preserving existing link tuples.
  const preservedConnections: Record<string, any> = {};
  const existingInputs = (node.inputs && typeof node.inputs === 'object') ? node.inputs : {};
  for (const input of getSchemaConnectionInputs(schema)) {
    const candidate = existingInputs[input.name];
    if (isNodeLinkTuple(candidate)) {
      preservedConnections[input.name] = candidate;
    }
  }

  node.inputs = {
    ...buildAPIInputs(schema, op.widgets),
    ...preservedConnections,
  };

  return { success: true, op, message: `Replaced node #${op.id}: ${previous} -> ${op.new_class_type}` };
}

function applyConnect(op: OpConnect, workflow: any, objectInfo: Record<string, any>, isUI: boolean): OperationResult {
  if (isUI) {
    const source = (workflow.nodes || []).find((node: any) => String(node.id) === op.source_id);
    const target = (workflow.nodes || []).find((node: any) => String(node.id) === op.target_id);
    if (!source) return { success: false, op, message: `Source #${op.source_id} not found`, error: 'Source not found' };
    if (!target) return { success: false, op, message: `Target #${op.target_id} not found`, error: 'Target not found' };

    const sourceSchema = resolveNodeSchema(String(source.type || ''), objectInfo);
    const targetSchema = resolveNodeSchema(String(target.type || ''), objectInfo);

    if (!source.outputs || source.outputs.length === 0) {
      const schemaOutputs = buildUIOutputs(sourceSchema);
      if (schemaOutputs.length > 0) {
        source.outputs = schemaOutputs;
        console.log(`[Modifier] Populated ${source.outputs.length} outputs for ${source.type} #${source.id} from schema`);
      }
    }

    if (!target.inputs || target.inputs.length === 0) {
      const schemaInputs = buildUIInputs(targetSchema);
      if (schemaInputs.length > 0) {
        target.inputs = schemaInputs;
      }
    }
    target.inputs = target.inputs || [];
    let targetInput = (target.inputs || []).find((input: any) => input.name === op.target_input);
    if (!targetInput) {
      targetInput = { name: op.target_input, type: '*', link: null };
      target.inputs.push(targetInput);
    }

    const sourceOutputCount = source.outputs?.length || 0;
    if (!source.outputs || op.source_slot >= sourceOutputCount) {
      return {
        success: false,
        op,
        message: `Source slot ${op.source_slot} out of range on ${source.type} (has ${sourceOutputCount} outputs)`,
        error: 'Invalid source slot',
      };
    }

    const linkId = Number(workflow.last_link_id || 0) + 1;
    workflow.last_link_id = linkId;
    const targetSlot = (target.inputs || []).findIndex((input: any) => input.name === op.target_input);
    const sourceOutputType = getSchemaOutputType(sourceSchema, op.source_slot);
    if (sourceOutputType) {
      source.outputs[op.source_slot].type = sourceOutputType;
    }
    const targetInputType = getSchemaInputType(targetSchema, targetInput.name);
    if (targetInputType && targetInput.type === '*') {
      targetInput.type = targetInputType;
    }

    const outputType = source.outputs[op.source_slot]?.type || '*';
    workflow.links = workflow.links || [];
    workflow.links.push([linkId, Number(op.source_id), op.source_slot, Number(op.target_id), targetSlot, outputType]);

    targetInput.link = linkId;
    source.outputs[op.source_slot].links = source.outputs[op.source_slot].links || [];
    source.outputs[op.source_slot].links.push(linkId);
    return {
      success: true,
      op,
      message: `Connected #${op.source_id}[${op.source_slot}] -> #${op.target_id}.${op.target_input}`,
      createdConnections: [{ source: op.source_id, target: op.target_id, type: outputType }],
    };
  }

  if (!workflow[op.source_id]) return { success: false, op, message: `Source #${op.source_id} not found`, error: 'Source not found' };
  if (!workflow[op.target_id]) return { success: false, op, message: `Target #${op.target_id} not found`, error: 'Target not found' };
  const targetData = workflow[op.target_id] as any;
  targetData.inputs = targetData.inputs || {};
  targetData.inputs[op.target_input] = [op.source_id, op.source_slot];
  return {
    success: true,
    op,
    message: `Connected #${op.source_id}[${op.source_slot}] -> #${op.target_id}.${op.target_input}`,
    createdConnections: [{ source: op.source_id, target: op.target_id, type: '*' }],
  };
}

function applyDisconnect(op: OpDisconnect, workflow: any, isUI: boolean): OperationResult {
  if (isUI) {
    const target = (workflow.nodes || []).find((node: any) => String(node.id) === op.target_id);
    if (!target) return { success: false, op, message: `Node #${op.target_id} not found`, error: 'Node not found' };
    const targetInput = (target.inputs || []).find((input: any) => input.name === op.target_input);
    if (!targetInput || targetInput.link == null) {
      return { success: true, op, message: `Input ${op.target_input} already disconnected` };
    }

    const linkId = Number(targetInput.link);
    workflow.links = (workflow.links || []).filter((link: any[]) => Number(link[0]) !== linkId);
    targetInput.link = null;

    for (const node of workflow.nodes || []) {
      for (const output of node.outputs || []) {
        output.links = (output.links || []).filter((id: number) => Number(id) !== linkId);
      }
    }
    return { success: true, op, message: `Disconnected #${op.target_id}.${op.target_input}` };
  }

  const target = workflow[op.target_id] as any;
  if (!target) return { success: false, op, message: `Node #${op.target_id} not found`, error: 'Node not found' };
  if (!target.inputs || target.inputs[op.target_input] === undefined) {
    return { success: true, op, message: `Input ${op.target_input} already disconnected` };
  }
  delete target.inputs[op.target_input];
  return { success: true, op, message: `Disconnected #${op.target_id}.${op.target_input}` };
}

function applySetValue(op: OpSetValue, workflow: any, isUI: boolean): OperationResult {
  if (isUI) {
    const node = (workflow.nodes || []).find((entry: any) => String(entry.id) === op.node_id);
    if (!node) return { success: false, op, message: `Node #${op.node_id} not found`, error: 'Node not found' };

    const objectInfo = (getLiveNodeCache()?.nodes || {}) as Record<string, any>;
    const schema = resolveNodeSchema(node.type, objectInfo);
    if (!schema) return { success: false, op, message: `Schema missing for ${node.type}`, error: 'Schema missing' };

    let widgetIndex = 0;
    for (const input of getSchemaWidgetInputs(schema)) {
      const wired = (node.inputs || []).some((entry: any) => entry.name === input.name && entry.link != null);
      if (wired) continue;
      if (input.name === op.input_name) {
        node.widgets_values = node.widgets_values || [];
        const old = node.widgets_values[widgetIndex];
        node.widgets_values[widgetIndex] = op.value;
        return {
          success: true,
          op,
          message: `Set #${op.node_id}.${op.input_name} = ${JSON.stringify(op.value)} (was ${JSON.stringify(old)})`,
        };
      }
      widgetIndex += 1;
    }

    return { success: false, op, message: `Widget ${op.input_name} not found on #${op.node_id}`, error: 'Widget not found' };
  }

  const node = workflow[op.node_id] as any;
  if (!node) return { success: false, op, message: `Node #${op.node_id} not found`, error: 'Node not found' };
  node.inputs = node.inputs || {};
  const old = node.inputs[op.input_name];
  node.inputs[op.input_name] = op.value;
  return {
    success: true,
    op,
    message: `Set #${op.node_id}.${op.input_name} = ${JSON.stringify(op.value)} (was ${JSON.stringify(old)})`,
  };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function resolveNodeSchema(classType: string, objectInfo: Record<string, any>): any {
  if (!classType) return null;
  return objectInfo[classType] || getLiveNodeSchema(classType) || NODE_REGISTRY.get(classType) || null;
}

function getSchemaConnectionInputs(schema: any): Array<{ name: string; type: string }> {
  if (!schema) return [];

  if (Array.isArray(schema.inputs)) {
    return schema.inputs
      .filter((input: any) => input && input.isWidget === false)
      .map((input: any) => ({ name: String(input.name), type: String(input.type || '*') }));
  }

  const allInputs = { ...(schema.input?.required || {}), ...(schema.input?.optional || {}) } as Record<string, any>;
  const inputs: Array<{ name: string; type: string }> = [];
  for (const [name, config] of Object.entries(allInputs)) {
    if (!Array.isArray(config)) continue;
    const type = config[0];
    const isConnection = typeof type === 'string' && !['INT', 'FLOAT', 'STRING', 'BOOLEAN'].includes(type);
    if (!isConnection) continue;
    inputs.push({ name, type });
  }
  return inputs;
}

function getSchemaWidgetInputs(schema: any): Array<{ name: string; type: any; options: Record<string, any> }> {
  if (!schema) return [];

  if (Array.isArray(schema.inputs)) {
    return schema.inputs
      .filter((input: any) => input && input.isWidget !== false)
      .map((input: any) => ({
        name: String(input.name),
        type: input.type,
        options: {
          default: input.default,
          min: input.min,
          max: input.max,
          options: input.options,
        },
      }));
  }

  const allInputs = { ...(schema.input?.required || {}), ...(schema.input?.optional || {}) } as Record<string, any>;
  const widgets: Array<{ name: string; type: any; options: Record<string, any> }> = [];
  for (const [name, config] of Object.entries(allInputs)) {
    if (!Array.isArray(config)) continue;
    const type = config[0];
    const options = config[1] || {};
    const isWidget = ['INT', 'FLOAT', 'STRING', 'BOOLEAN'].includes(type) || Array.isArray(type);
    if (!isWidget) continue;
    widgets.push({ name, type, options });
  }
  return widgets;
}

function getSchemaOutputs(schema: any): Array<{ name: string; type: string; slotIndex: number }> {
  if (!schema) return [];

  if (Array.isArray(schema.outputs)) {
    return schema.outputs.map((output: any, index: number) => ({
      name: String(output?.name || output?.type || `output_${index}`),
      type: String(output?.type || '*'),
      slotIndex: Number(output?.slotIndex ?? index),
    }));
  }

  const outputTypes: string[] = schema?.output || [];
  const outputNames: string[] = schema?.output_name || [];
  const outputs: Array<{ name: string; type: string; slotIndex: number }> = [];
  for (let index = 0; index < outputTypes.length; index += 1) {
    outputs.push({ name: outputNames[index] || outputTypes[index], type: outputTypes[index], slotIndex: index });
  }
  return outputs;
}

function getSchemaOutputType(schema: any, slot: number): string | null {
  const output = getSchemaOutputs(schema).find((entry) => entry.slotIndex === slot);
  return output?.type || null;
}

function getSchemaInputType(schema: any, inputName: string): string | null {
  const input = getSchemaConnectionInputs(schema).find((entry) => entry.name === inputName);
  return input?.type || null;
}

function buildUIInputs(schema: any): any[] {
  return getSchemaConnectionInputs(schema).map((input) => ({
    name: input.name,
    type: input.type,
    link: null,
  }));
}

function buildUIOutputs(schema: any): any[] {
  return getSchemaOutputs(schema).map((output) => ({
    name: output.name,
    type: output.type,
    links: null,
    slot_index: output.slotIndex,
  }));
}

function buildWidgetValues(schema: any, overrides?: Record<string, any>): any[] {
  const values: any[] = [];
  for (const input of getSchemaWidgetInputs(schema)) {
    if (overrides && overrides[input.name] !== undefined) {
      values.push(overrides[input.name]);
      continue;
    }

    if (Array.isArray(input.type) && input.type.length > 0) {
      values.push(input.type[0]);
      continue;
    }

    if (input.options.default !== undefined) {
      values.push(input.options.default);
      continue;
    }

    if (input.type === 'INT' || input.type === 'FLOAT') {
      values.push(input.options.min ?? 0);
      continue;
    }

    if (input.type === 'STRING') {
      values.push('');
      continue;
    }

    if (input.type === 'BOOLEAN') {
      values.push(false);
      continue;
    }

    values.push(null);
  }
  return values;
}

function buildAPIInputs(schema: any, overrides?: Record<string, any>): Record<string, any> {
  const inputs: Record<string, any> = {};
  for (const input of getSchemaWidgetInputs(schema)) {
    if (overrides && overrides[input.name] !== undefined) {
      inputs[input.name] = overrides[input.name];
      continue;
    }
    if (Array.isArray(input.type) && input.type.length > 0) {
      inputs[input.name] = input.type[0];
      continue;
    }
    if (input.options.default !== undefined) {
      inputs[input.name] = input.options.default;
    }
  }
  return inputs;
}

function isNodeLinkTuple(value: unknown): value is [string | number, number] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [nodeId, slot] = value;
  const normalizedId = typeof nodeId === 'number' ? String(nodeId) : nodeId;
  return typeof normalizedId === 'string' && /^\d+$/.test(normalizedId) && typeof slot === 'number';
}

function getNextNodeId(workflow: any, isUI: boolean): number {
  let max = 0;
  if (isUI) {
    for (const node of workflow.nodes || []) max = Math.max(max, Number(node.id) || 0);
    max = Math.max(max, Number(workflow.last_node_id || 0));
  } else {
    for (const key of Object.keys(workflow || {})) if (/^\d+$/.test(key)) max = Math.max(max, Number(key));
  }
  return max + 1;
}

function findConnection(
  workflow: any,
  sourceId: string,
  targetId: string,
  viaType: string,
  isUI: boolean,
): { sourceSlot: number; targetInput: string } | null {
  if (isUI) {
    const target = (workflow.nodes || []).find((node: any) => String(node.id) === targetId);
    if (!target) return null;
    for (const link of workflow.links || []) {
      if (String(link[1]) !== sourceId || String(link[3]) !== targetId) continue;
      if (viaType !== '*' && String(link[5]) !== viaType) continue;
      const input = (target.inputs || []).find((item: any) => Number(item.link) === Number(link[0]));
      if (!input) continue;
      return { sourceSlot: Number(link[2]), targetInput: String(input.name) };
    }
    return null;
  }

  const target = workflow[targetId] as any;
  if (!target?.inputs) return null;
  for (const [inputName, inputValue] of Object.entries(target.inputs)) {
    if (!Array.isArray(inputValue)) continue;
    if (String(inputValue[0]) !== sourceId) continue;
    return { sourceSlot: Number(inputValue[1]), targetInput: inputName };
  }
  return null;
}

function findInputByType(schema: any, type: string): string | null {
  for (const input of getSchemaConnectionInputs(schema)) {
    if (input.type === type || input.type === '*') return input.name;
  }
  return null;
}

function findOutputSlotByType(schema: any, type: string): number | null {
  for (const output of getSchemaOutputs(schema)) {
    if (output.type === type || output.type === '*') return output.slotIndex;
  }
  return null;
}

function findOutputTarget(workflow: any, sourceId: string, slot: number, isUI: boolean): { targetId: string; targetInput: string } | null {
  if (isUI) {
    for (const link of workflow.links || []) {
      if (String(link[1]) !== sourceId || Number(link[2]) !== slot) continue;
      const target = (workflow.nodes || []).find((node: any) => Number(node.id) === Number(link[3]));
      const input = (target?.inputs || []).find((item: any) => Number(item.link) === Number(link[0]));
      if (!input) continue;
      return { targetId: String(link[3]), targetInput: String(input.name) };
    }
    return null;
  }
  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!/^\d+$/.test(nodeId)) continue;
    for (const [inputName, value] of Object.entries((nodeData as any).inputs || {})) {
      if (!Array.isArray(value)) continue;
      if (String(value[0]) === sourceId && Number(value[1]) === slot) {
        return { targetId: nodeId, targetInput: inputName };
      }
    }
  }
  return null;
}

function getIncomingConnections(workflow: any, nodeId: string, isUI: boolean): Array<{
  sourceId: string;
  sourceSlot: number;
  targetInput: string;
  type: string;
}> {
  const incoming: Array<{ sourceId: string; sourceSlot: number; targetInput: string; type: string }> = [];
  if (isUI) {
    const node = (workflow.nodes || []).find((entry: any) => String(entry.id) === nodeId);
    if (!node) return incoming;
    for (const input of node.inputs || []) {
      if (input.link == null) continue;
      const link = (workflow.links || []).find((entry: any[]) => Number(entry[0]) === Number(input.link));
      if (!link) continue;
      incoming.push({
        sourceId: String(link[1]),
        sourceSlot: Number(link[2]),
        targetInput: String(input.name),
        type: String(link[5] || '*'),
      });
    }
    return incoming;
  }

  const node = workflow[nodeId] as any;
  if (!node?.inputs) return incoming;
  for (const [inputName, value] of Object.entries(node.inputs)) {
    if (!Array.isArray(value) || value.length !== 2) continue;
    const sourceId = String(value[0]);
    if (!/^\d+$/.test(sourceId)) continue;
    incoming.push({ sourceId, sourceSlot: Number(value[1]), targetInput: inputName, type: '*' });
  }
  return incoming;
}

function getOutgoingConnections(workflow: any, sourceId: string, isUI: boolean): Array<{
  targetId: string;
  targetInput: string;
  sourceSlot: number;
  type: string;
}> {
  const outgoing: Array<{ targetId: string; targetInput: string; sourceSlot: number; type: string }> = [];
  if (isUI) {
    for (const link of workflow.links || []) {
      if (String(link[1]) !== sourceId) continue;
      const target = (workflow.nodes || []).find((node: any) => Number(node.id) === Number(link[3]));
      const input = (target?.inputs || []).find((item: any) => Number(item.link) === Number(link[0]));
      if (!input) continue;
      outgoing.push({
        targetId: String(link[3]),
        targetInput: String(input.name),
        sourceSlot: Number(link[2]),
        type: String(link[5] || '*'),
      });
    }
    return outgoing;
  }

  for (const [nodeId, nodeData] of Object.entries(workflow || {})) {
    if (!/^\d+$/.test(nodeId)) continue;
    for (const [inputName, value] of Object.entries((nodeData as any).inputs || {})) {
      if (!Array.isArray(value) || value.length !== 2) continue;
      if (String(value[0]) !== sourceId) continue;
      outgoing.push({
        targetId: nodeId,
        targetInput: inputName,
        sourceSlot: Number(value[1]),
        type: '*',
      });
    }
  }
  return outgoing;
}

function getNodeData(workflow: any, nodeId: string, isUI: boolean): { classType: string; widgets: Record<string, any> } | null {
  if (isUI) {
    const node = (workflow.nodes || []).find((entry: any) => String(entry.id) === nodeId);
    if (!node) return null;
    return { classType: String(node.type || 'Unknown'), widgets: {} };
  }
  const node = workflow[nodeId] as any;
  if (!node) return null;
  const widgets: Record<string, any> = {};
  for (const [name, value] of Object.entries(node.inputs || {})) {
    if (Array.isArray(value) && value.length === 2 && /^\d+$/.test(String(value[0]))) continue;
    widgets[name] = value;
  }
  return { classType: String(node.class_type || 'Unknown'), widgets };
}

function findChainBetween(workflow: any, startId: string, endId: string, isUI: boolean): string[] {
  const queue: Array<{ nodeId: string; path: string[] }> = [{ nodeId: startId, path: [startId] }];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.nodeId === endId) return current.path;
    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);
    for (const connection of getOutgoingConnections(workflow, current.nodeId, isUI)) {
      if (!visited.has(connection.targetId)) {
        queue.push({ nodeId: connection.targetId, path: [...current.path, connection.targetId] });
      }
    }
  }
  return [startId, endId];
}

function calculateNewNodePosition(workflow: any): [number, number] {
  if (!Array.isArray(workflow?.nodes) || workflow.nodes.length === 0) return [100, 100];
  let maxX = 0;
  let avgY = 0;
  for (const node of workflow.nodes) {
    const pos = node.pos || [0, 0];
    const width = node.size?.[0] || 300;
    maxX = Math.max(maxX, Number(pos[0]) + Number(width));
    avgY += Number(pos[1] || 0);
  }
  avgY = Math.round(avgY / workflow.nodes.length);
  return [maxX + 100, avgY];
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Phase 11C - Workflow Summarizer
 *
 * Produces a compact structural summary of a workflow for AI modification
 * prompts. Keeps node IDs, links, key widgets, and output type hints.
 */

import { getLiveNodeCache } from './comfyui-backend';
import { estimateTokens } from './token-estimator';

export interface WorkflowSummary {
  text: string;
  estimatedTokens: number;
  nodeCount: number;
  linkCount: number;
  nodeIds: string[];
  maxNodeId: number;
}

export function summarizeWorkflow(workflow: any): WorkflowSummary {
  const isUI = Array.isArray(workflow?.nodes) && Array.isArray(workflow?.links);
  return isUI ? summarizeUIFormat(workflow) : summarizeAPIFormat(workflow);
}

function summarizeAPIFormat(workflow: any): WorkflowSummary {
  const objectInfo = (getLiveNodeCache()?.nodes || {}) as Record<string, any>;
  const nodeIds = Object.keys(workflow || {})
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));

  const lines: string[] = [];
  let maxNodeId = 0;
  let linkCount = 0;

  for (const nodeId of nodeIds) {
    const data = workflow[nodeId] as any;
    const classType = String(data?.class_type || 'Unknown');
    const schema = objectInfo[classType];

    maxNodeId = Math.max(maxNodeId, Number(nodeId));
    const widgets: string[] = [];
    const connections: string[] = [];

    for (const [inputName, inputValue] of Object.entries(data?.inputs || {})) {
      if (looksLikeConnection(inputValue)) {
        const [sourceId, sourceSlot] = inputValue as [string | number, number];
        connections.push(`${inputName}:#${sourceId}[${sourceSlot}]`);
        linkCount += 1;
      } else {
        widgets.push(`${inputName}=${formatValue(inputValue)}`);
      }
    }

    const outputTypes = Array.isArray(schema?.output) ? schema.output as string[] : [];
    const outputSummary = outputTypes.length > 0
      ? ` -> ${outputTypes.map((type, index) => `${type}[${index}]`).join(', ')}`
      : '';

    let line = `#${nodeId} ${classType}`;
    if (widgets.length > 0) line += ` [${widgets.join(', ')}]`;
    if (connections.length > 0) line += ` <- ${connections.join(', ')}`;
    line += outputSummary;

    const title = data?._meta?.title;
    if (title && title !== classType) {
      line += ` // "${title}"`;
    }
    lines.push(line);
  }

  const header = `WORKFLOW (${nodeIds.length} nodes, ${linkCount} connections, max_id=${maxNodeId}):`;
  const text = [header, ...lines].join('\n');
  return {
    text,
    estimatedTokens: estimateTokens(text),
    nodeCount: nodeIds.length,
    linkCount,
    nodeIds,
    maxNodeId,
  };
}

function summarizeUIFormat(workflow: any): WorkflowSummary {
  const objectInfo = (getLiveNodeCache()?.nodes || {}) as Record<string, any>;
  const linkMap = new Map<number, any[]>();
  for (const link of workflow.links || []) linkMap.set(Number(link[0]), link);

  const sortedNodes = [...(workflow.nodes || [])].sort((a: any, b: any) => Number(a.id) - Number(b.id));
  const nodeIds: string[] = [];
  const lines: string[] = [];
  let maxNodeId = 0;

  for (const node of sortedNodes) {
    const nodeId = String(node.id);
    const classType = String(node.type || 'Unknown');
    const schema = objectInfo[classType];

    nodeIds.push(nodeId);
    maxNodeId = Math.max(maxNodeId, Number(node.id));

    const connections: string[] = [];
    for (const input of node.inputs || []) {
      if (input.link == null) continue;
      const link = linkMap.get(Number(input.link));
      if (!link) continue;
      connections.push(`${input.name}:#${link[1]}[${link[2]}]`);
    }

    const widgets = summarizeNodeWidgets(node, schema);
    const outputTypes = Array.isArray(schema?.output) ? schema.output as string[] : [];
    const outputSummary = outputTypes.length > 0
      ? ` -> ${outputTypes.map((type, index) => `${type}[${index}]`).join(', ')}`
      : '';

    let line = `#${nodeId} ${classType}`;
    if (widgets.length > 0) line += ` [${widgets.join(', ')}]`;
    if (connections.length > 0) line += ` <- ${connections.join(', ')}`;
    line += outputSummary;
    if (node.title && node.title !== classType) line += ` // "${node.title}"`;
    lines.push(line);
  }

  const linkCount = (workflow.links || []).length;
  const header = `WORKFLOW (${nodeIds.length} nodes, ${linkCount} connections, max_id=${maxNodeId}):`;
  const text = [header, ...lines].join('\n');
  return {
    text,
    estimatedTokens: estimateTokens(text),
    nodeCount: nodeIds.length,
    linkCount,
    nodeIds,
    maxNodeId,
  };
}

function summarizeNodeWidgets(node: any, schema: any): string[] {
  if (!Array.isArray(node?.widgets_values) || !schema?.input) return [];
  const widgets: string[] = [];
  const allInputs = { ...(schema.input.required || {}), ...(schema.input.optional || {}) } as Record<string, any>;

  let widgetIndex = 0;
  for (const [inputName, config] of Object.entries(allInputs)) {
    if (!Array.isArray(config)) continue;
    const type = config[0];
    const isConnectionType = typeof type === 'string' && !['INT', 'FLOAT', 'STRING', 'BOOLEAN'].includes(type) && !Array.isArray(type);
    const wired = (node.inputs || []).some((input: any) => input.name === inputName && input.link != null);
    if (isConnectionType || wired) continue;

    if (widgetIndex < node.widgets_values.length) {
      const value = node.widgets_values[widgetIndex];
      if (value !== '' && value !== undefined && value !== null) {
        widgets.push(`${inputName}=${formatValue(value)}`);
      }
    }
    widgetIndex += 1;
  }

  return widgets;
}

function looksLikeConnection(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const sourceId = String(value[0]);
  return /^\d+$/.test(sourceId) && typeof value[1] === 'number';
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    if (value.length > 60) return `"${value.slice(0, 57)}..."`;
    return `"${value}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function summarizeWorkflowNeighborhood(
  workflow: any,
  focusNodeIds: string[],
  depth = 2,
): WorkflowSummary {
  const summary = summarizeWorkflow(workflow);
  const neighbors = collectNeighborNodeIds(workflow, new Set(focusNodeIds), depth);
  const note = `FOCUS: #${focusNodeIds.join(', #')} (neighborhood ${neighbors.size}/${summary.nodeCount} nodes)`;
  const text = `${summary.text}\n${note}`;
  return {
    ...summary,
    text,
    estimatedTokens: estimateTokens(text),
  };
}

function collectNeighborNodeIds(workflow: any, seed: Set<string>, depth: number): Set<string> {
  const isUI = Array.isArray(workflow?.nodes) && Array.isArray(workflow?.links);
  const neighbors = new Set(seed);

  for (let step = 0; step < depth; step += 1) {
    const snapshot = [...neighbors];
    for (const nodeId of snapshot) {
      if (isUI) {
        for (const link of workflow.links || []) {
          const source = String(link[1]);
          const target = String(link[3]);
          if (source === nodeId) neighbors.add(target);
          if (target === nodeId) neighbors.add(source);
        }
      } else {
        for (const [candidateId, candidateData] of Object.entries(workflow || {})) {
          if (!/^\d+$/.test(candidateId)) continue;
          for (const inputValue of Object.values((candidateData as any).inputs || {})) {
            if (!looksLikeConnection(inputValue)) continue;
            const [source] = inputValue as [string | number, number];
            if (String(source) === nodeId) neighbors.add(candidateId);
            if (candidateId === nodeId) neighbors.add(String(source));
          }
        }
      }
    }
  }

  return neighbors;
}


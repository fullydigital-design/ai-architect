/**
 * Workflow Serializer
 * Converts a ComfyUIWorkflow into a structured text representation
 * for AI-assisted workflow modification.
 */

import type { ComfyUIWorkflow, ComfyUILink, ComfyUINode } from '../types/comfyui';

export interface WorkflowContext {
  structuralSummary: string;
  workflowJson: string;
  nodeCount: number;
  connectionCount: number;
  usedCompactJson: boolean;
  maxNodeId: number;
  maxLinkId: number;
  nextNodeId: number;
  nextLinkId: number;
}

const COMPACT_JSON_CHAR_THRESHOLD = 30000;
const COMPACT_NODE_THRESHOLD = 15;
const MAX_DATA_FLOW_EDGES = 18;

function formatWidgetValue(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return 'null';
  const text = JSON.stringify(value);
  if (!text) return String(value);
  return text.length > 60 ? `${text.substring(0, 60)}...` : text;
}

function summarizeWidgetValues(node: ComfyUINode): string {
  const values = Array.isArray(node.widgets_values) ? node.widgets_values : [];
  if (values.length === 0) return 'none';

  const type = node.type.toLowerCase();
  const parts: string[] = [];

  if (type.includes('checkpointloader') && values[0] !== undefined) {
    parts.push(`checkpoint=${formatWidgetValue(values[0])}`);
  } else if (type.includes('loraloader')) {
    if (values[0] !== undefined) parts.push(`lora=${formatWidgetValue(values[0])}`);
    if (values[1] !== undefined) parts.push(`strength_model=${formatWidgetValue(values[1])}`);
    if (values[2] !== undefined) parts.push(`strength_clip=${formatWidgetValue(values[2])}`);
  } else if (type.includes('ksampler')) {
    if (values[0] !== undefined) parts.push(`seed=${formatWidgetValue(values[0])}`);
    if (values[2] !== undefined) parts.push(`steps=${formatWidgetValue(values[2])}`);
    if (values[3] !== undefined) parts.push(`cfg=${formatWidgetValue(values[3])}`);
    if (values[4] !== undefined) parts.push(`sampler_name=${formatWidgetValue(values[4])}`);
    if (values[5] !== undefined) parts.push(`scheduler=${formatWidgetValue(values[5])}`);
    if (values[6] !== undefined) parts.push(`denoise=${formatWidgetValue(values[6])}`);
  } else if (type.includes('emptylatentimage')) {
    if (values[0] !== undefined) parts.push(`width=${formatWidgetValue(values[0])}`);
    if (values[1] !== undefined) parts.push(`height=${formatWidgetValue(values[1])}`);
    if (values[2] !== undefined) parts.push(`batch=${formatWidgetValue(values[2])}`);
  } else if (type.includes('cliptextencode')) {
    if (values[0] !== undefined) {
      const text = String(values[0]);
      parts.push(`text=${formatWidgetValue(text.length > 80 ? `${text.substring(0, 80)}...` : text)}`);
    }
  } else if (type.includes('vaeloader') && values[0] !== undefined) {
    parts.push(`vae=${formatWidgetValue(values[0])}`);
  } else if (type.includes('unetloader') && values[0] !== undefined) {
    parts.push(`unet=${formatWidgetValue(values[0])}`);
  } else if (type.includes('dualcliploader')) {
    if (values[0] !== undefined) parts.push(`clip_1=${formatWidgetValue(values[0])}`);
    if (values[1] !== undefined) parts.push(`clip_2=${formatWidgetValue(values[1])}`);
    if (values[2] !== undefined) parts.push(`type=${formatWidgetValue(values[2])}`);
  } else if (type.includes('saveimage') && values[0] !== undefined) {
    parts.push(`filename_prefix=${formatWidgetValue(values[0])}`);
  }

  if (parts.length > 0) return parts.join(', ');

  const generic = values
    .slice(0, 6)
    .map((value, index) => `w${index}=${formatWidgetValue(value)}`);
  if (values.length > 6) generic.push(`...(+${values.length - 6} more)`);
  return generic.join(', ');
}

function getMaxNodeId(workflow: ComfyUIWorkflow): number {
  const maxNode = (workflow.nodes || []).reduce((max, node) => Math.max(max, node.id), 0);
  return Math.max(maxNode, workflow.last_node_id || 0);
}

function getMaxLinkId(workflow: ComfyUIWorkflow): number {
  const maxLink = (workflow.links || []).reduce((max, link) => Math.max(max, link[0]), 0);
  return Math.max(maxLink, workflow.last_link_id || 0);
}

function describeInputs(node: ComfyUINode, links: ComfyUILink[]): string {
  const inputs = node.inputs || [];
  if (inputs.length === 0) return 'none';
  return inputs
    .map((input, inputIndex) => {
      const link = links.find((entry) => entry[3] === node.id && entry[4] === inputIndex);
      if (!link) return `${input.name}=null`;
      return `${input.name}<-[#${link[1]}.${link[2]} ${link[5]}]`;
    })
    .join(', ');
}

function describeOutputs(node: ComfyUINode, links: ComfyUILink[]): string {
  const outputs = node.outputs || [];
  if (outputs.length === 0) return 'none';
  return outputs
    .map((output) => {
      const slotIndex = output.slot_index ?? 0;
      const outgoing = links.filter((entry) => entry[1] === node.id && entry[2] === slotIndex);
      if (outgoing.length === 0) return `${slotIndex}:${output.type}->[]`;
      const targets = outgoing.map((entry) => `#${entry[3]}.${entry[4]}`).join(', ');
      return `${slotIndex}:${output.type}->[${targets}]`;
    })
    .join(', ');
}

function buildDataFlowSummary(links: ComfyUILink[]): string {
  if (links.length === 0) return 'none';
  const ordered = [...links].sort((a, b) => a[0] - b[0]);
  const preview = ordered
    .slice(0, MAX_DATA_FLOW_EDGES)
    .map((link) => `#${link[1]} -> #${link[3]} (${link[5]})`)
    .join(' | ');
  if (ordered.length <= MAX_DATA_FLOW_EDGES) return preview;
  return `${preview} | ... (+${ordered.length - MAX_DATA_FLOW_EDGES} more)`;
}

export function buildCompactWorkflowJson(workflow: ComfyUIWorkflow): string {
  const compact = {
    last_node_id: workflow.last_node_id,
    last_link_id: workflow.last_link_id,
    nodes: (workflow.nodes || []).map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      pos: node.pos,
      size: node.size,
      widgets_values: node.widgets_values,
      inputs: (node.inputs || []).map((input) => ({
        name: input.name,
        type: input.type,
        link: input.link,
      })),
      outputs: (node.outputs || []).map((output) => ({
        name: output.name,
        type: output.type,
        links: output.links,
        slot_index: output.slot_index,
      })),
    })),
    links: workflow.links || [],
    groups: workflow.groups || [],
    config: workflow.config || {},
    extra: workflow.extra || {},
    version: workflow.version ?? 0.4,
  };
  return JSON.stringify(compact, null, 2);
}

export function buildWorkflowContext(workflow: ComfyUIWorkflow): WorkflowContext {
  const nodes = workflow.nodes || [];
  const links = workflow.links || [];
  const maxNodeId = getMaxNodeId(workflow);
  const maxLinkId = getMaxLinkId(workflow);
  const nextNodeId = maxNodeId + 1;
  const nextLinkId = maxLinkId + 1;
  const lines: string[] = [];

  lines.push(`Nodes (${nodes.length} total):`);
  lines.push('');

  for (const node of nodes) {
    const title = node.title || node.type;
    lines.push(`Node #${node.id} [${node.type}] "${title}"`);
    lines.push(`  Widgets: ${summarizeWidgetValues(node)}`);
    lines.push(`  Inputs: ${describeInputs(node, links)}`);
    lines.push(`  Outputs: ${describeOutputs(node, links)}`);
    lines.push('');
  }

  lines.push(`Data flow: ${buildDataFlowSummary(links)}`);
  lines.push('');
  lines.push(`IMPORTANT: max_node_id=${maxNodeId}, max_link_id=${maxLinkId}`);
  lines.push(`New nodes MUST use id >= ${nextNodeId}. New links MUST use id >= ${nextLinkId}.`);

  const fullJson = JSON.stringify(workflow, null, 2);
  const usedCompactJson = nodes.length > COMPACT_NODE_THRESHOLD || fullJson.length > COMPACT_JSON_CHAR_THRESHOLD;
  const workflowJson = usedCompactJson ? buildCompactWorkflowJson(workflow) : fullJson;

  return {
    structuralSummary: lines.join('\n'),
    workflowJson,
    nodeCount: nodes.length,
    connectionCount: links.length,
    usedCompactJson,
    maxNodeId,
    maxLinkId,
    nextNodeId,
    nextLinkId,
  };
}

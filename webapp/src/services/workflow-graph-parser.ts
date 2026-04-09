/**
 * Phase 11A - Workflow Graph Parser
 *
 * Converts ComfyUI workflow JSON into a typed DAG representation
 * that the merger engine can analyze and combine.
 */

import { getLiveNodeCache } from './comfyui-backend';

export interface WorkflowGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  metadata: {
    sourceFormat: 'ui' | 'api';
    totalNodes: number;
    totalEdges: number;
    entryNodes: string[];
    terminalNodes: string[];
  };
}

export interface GraphNode {
  id: string;
  classType: string;
  title?: string;
  role: NodeRole;
  inputs: GraphNodePort[];
  outputs: GraphNodePort[];
  widgetValues: any[];
  position?: [number, number];
  size?: [number, number];
}

export interface GraphNodePort {
  name: string;
  type: string;
  isConnected: boolean;
  connectedTo?: {
    nodeId: string;
    portName: string;
    portIndex: number;
  };
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourcePortName: string;
  sourcePortIndex: number;
  targetNodeId: string;
  targetPortName: string;
  targetPortIndex: number;
  type: string;
}

export type NodeRole =
  | 'loader'
  | 'encoder'
  | 'sampler'
  | 'decoder'
  | 'upscaler'
  | 'post-processor'
  | 'controlnet'
  | 'output'
  | 'input'
  | 'conditioning'
  | 'latent-op'
  | 'mask'
  | 'utility'
  | 'unknown';

export function parseWorkflowToGraph(workflow: any): WorkflowGraph {
  if (isUIFormat(workflow)) return parseUIFormat(workflow);
  return parseAPIFormat(workflow);
}

function isUIFormat(workflow: any): boolean {
  return Array.isArray(workflow?.nodes) && Array.isArray(workflow?.links);
}

function parseUIFormat(workflow: any): WorkflowGraph {
  const liveCache = getLiveNodeCache();
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const linkMap = new Map<number, any[]>();
  for (const link of workflow.links || []) {
    if (Array.isArray(link) && link.length >= 6) {
      linkMap.set(link[0], link);
    }
  }

  for (const rawNode of workflow.nodes || []) {
    const nodeId = String(rawNode.id);
    const classType = String(rawNode.type || 'Unknown');
    const nodeInfo = liveCache?.nodes?.[classType];

    const inputs: GraphNodePort[] = [];
    if (Array.isArray(rawNode.inputs)) {
      for (const input of rawNode.inputs) {
        const port: GraphNodePort = {
          name: String(input?.name || `input_${inputs.length}`),
          type: String(input?.type || '*'),
          isConnected: input?.link != null,
        };
        if (input?.link != null) {
          const linkData = linkMap.get(input.link);
          if (linkData) {
            port.connectedTo = {
              nodeId: String(linkData[1]),
              portName: `output_${linkData[2]}`,
              portIndex: Number(linkData[2] || 0),
            };
            port.type = String(linkData[5] || port.type || '*');
          }
        }
        inputs.push(port);
      }
    }

    const outputs: GraphNodePort[] = [];
    if (Array.isArray(rawNode.outputs)) {
      for (const output of rawNode.outputs) {
        outputs.push({
          name: String(output?.name || `output_${outputs.length}`),
          type: String(output?.type || '*'),
          isConnected: Array.isArray(output?.links) && output.links.length > 0,
        });
      }
    }

    if (inputs.length === 0 && nodeInfo?.inputs) {
      for (const input of nodeInfo.inputs) {
        if (!input.isWidget) {
          inputs.push({
            name: input.name,
            type: String(input.type || '*'),
            isConnected: false,
          });
        }
      }
    }

    if (outputs.length === 0 && nodeInfo?.outputs) {
      for (const output of nodeInfo.outputs) {
        outputs.push({
          name: output.name || `output_${outputs.length}`,
          type: String(output.type || '*'),
          isConnected: false,
        });
      }
    }

    const role = classifyNodeRole(classType, inputs, outputs);
    nodes.set(nodeId, {
      id: nodeId,
      classType,
      title: typeof rawNode.title === 'string' ? rawNode.title : undefined,
      role,
      inputs,
      outputs,
      widgetValues: Array.isArray(rawNode.widgets_values) ? rawNode.widgets_values : [],
      position: Array.isArray(rawNode.pos) ? [Number(rawNode.pos[0] || 0), Number(rawNode.pos[1] || 0)] : undefined,
      size: Array.isArray(rawNode.size) ? [Number(rawNode.size[0] || 300), Number(rawNode.size[1] || 100)] : undefined,
    });
  }

  for (const [linkId, linkData] of linkMap.entries()) {
    const sourceNodeId = String(linkData[1]);
    const sourceSlot = Number(linkData[2] || 0);
    const targetNodeId = String(linkData[3]);
    const targetSlot = Number(linkData[4] || 0);
    const type = String(linkData[5] || '*');

    const sourceNode = nodes.get(sourceNodeId);
    const targetNode = nodes.get(targetNodeId);
    const sourcePortName = sourceNode?.outputs[sourceSlot]?.name || `output_${sourceSlot}`;
    const targetPortName = targetNode?.inputs[targetSlot]?.name || `input_${targetSlot}`;

    edges.push({
      id: String(linkId),
      sourceNodeId,
      sourcePortName,
      sourcePortIndex: sourceSlot,
      targetNodeId,
      targetPortName,
      targetPortIndex: targetSlot,
      type,
    });
  }

  const nodesWithIncoming = new Set(edges.map((edge) => edge.targetNodeId));
  const nodesWithOutgoing = new Set(edges.map((edge) => edge.sourceNodeId));

  return {
    nodes,
    edges,
    metadata: {
      sourceFormat: 'ui',
      totalNodes: nodes.size,
      totalEdges: edges.length,
      entryNodes: [...nodes.keys()].filter((id) => !nodesWithIncoming.has(id)),
      terminalNodes: [...nodes.keys()].filter((id) => !nodesWithOutgoing.has(id)),
    },
  };
}

function parseAPIFormat(workflow: any): WorkflowGraph {
  const liveCache = getLiveNodeCache();
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let edgeIdCounter = 0;

  for (const [nodeId, rawNode] of Object.entries(workflow || {})) {
    if (!/^\d+$/.test(nodeId)) continue;
    const data = rawNode as any;
    const classType = String(data?.class_type || 'Unknown');
    const liveSchema = liveCache?.nodes?.[classType];

    const inputs: GraphNodePort[] = [];
    for (const schemaInput of liveSchema?.inputs || []) {
      if (schemaInput.isWidget) continue;
      const value = data?.inputs?.[schemaInput.name];
      const isLinked = Array.isArray(value) && value.length >= 2;
      inputs.push({
        name: schemaInput.name,
        type: String(schemaInput.type || '*'),
        isConnected: isLinked,
        connectedTo: isLinked ? {
          nodeId: String(value[0]),
          portName: `output_${Number(value[1] || 0)}`,
          portIndex: Number(value[1] || 0),
        } : undefined,
      });
    }

    const outputs: GraphNodePort[] = (liveSchema?.outputs || []).map((output, index) => ({
      name: output.name || `output_${index}`,
      type: String(output.type || '*'),
      isConnected: false,
    }));

    nodes.set(nodeId, {
      id: nodeId,
      classType,
      title: typeof data?._meta?.title === 'string' ? data._meta.title : undefined,
      role: classifyNodeRole(classType, inputs, outputs),
      inputs,
      outputs,
      widgetValues: [],
    });
  }

  for (const [nodeId, node] of nodes.entries()) {
    node.inputs.forEach((input, inputIndex) => {
      if (!input.connectedTo) return;
      const sourceId = input.connectedTo.nodeId;
      const sourceNode = nodes.get(sourceId);
      const sourcePortName = sourceNode?.outputs[input.connectedTo.portIndex]?.name || input.connectedTo.portName;
      const sourceType = sourceNode?.outputs[input.connectedTo.portIndex]?.type || input.type;
      if (sourceNode?.outputs[input.connectedTo.portIndex]) {
        sourceNode.outputs[input.connectedTo.portIndex].isConnected = true;
      }

      edges.push({
        id: String(++edgeIdCounter),
        sourceNodeId: sourceId,
        sourcePortName,
        sourcePortIndex: input.connectedTo.portIndex,
        targetNodeId: nodeId,
        targetPortName: input.name,
        targetPortIndex: inputIndex,
        type: sourceType,
      });
    });
  }

  const nodesWithIncoming = new Set(edges.map((edge) => edge.targetNodeId));
  const nodesWithOutgoing = new Set(edges.map((edge) => edge.sourceNodeId));

  return {
    nodes,
    edges,
    metadata: {
      sourceFormat: 'api',
      totalNodes: nodes.size,
      totalEdges: edges.length,
      entryNodes: [...nodes.keys()].filter((id) => !nodesWithIncoming.has(id)),
      terminalNodes: [...nodes.keys()].filter((id) => !nodesWithOutgoing.has(id)),
    },
  };
}

export function classifyNodeRole(
  classType: string,
  inputs: GraphNodePort[],
  outputs: GraphNodePort[],
): NodeRole {
  const ct = classType.toLowerCase();
  const inputTypes = inputs.map((input) => input.type.toUpperCase());
  const outputTypes = outputs.map((output) => output.type.toUpperCase());

  if (/^(save|preview)image/i.test(classType) || ct.includes('saveimage') || ct.includes('previewimage')) return 'output';
  if (ct.includes('savevideo') || ct.includes('saveaudio') || ct.includes('save3d')) return 'output';
  if (ct === 'loadimage' || ct.includes('loadvideo') || ct.includes('loadaudio')) return 'input';

  if (ct.includes('checkpointloader') || ct.includes('unetloader') || ct.includes('diffusionmodelloader')) return 'loader';
  if (ct.includes('loraloader') || ct.includes('controlnetloader') || ct.includes('cliploader') || ct.includes('vaeloader')) return 'loader';
  if (ct.includes('upscalemodelloader') || ct.includes('stylemodelloader') || ct.includes('ipadapterloader') || ct.includes('instantidloader')) return 'loader';

  if (ct.includes('cliptextencode') || ct.includes('clipencode') || ct.includes('vaeencode') || ct.includes('clipvisionencode')) return 'encoder';
  if (ct.includes('vaedecode')) return 'decoder';
  if (ct.includes('ksampler') || ct.includes('sampler') || ct.includes('basicscheduler') || ct.includes('basicguider')) return 'sampler';
  if (ct.includes('upscale') || ct.includes('realesrgan') || ct.includes('esrgan') || ct.includes('swinir')) return 'upscaler';
  if (ct.includes('facedetailer') || ct.includes('facerestore') || ct.includes('reactor') || ct.includes('detailer')) return 'post-processor';
  if (ct.includes('controlnet') && !ct.includes('loader')) return 'controlnet';
  if (ct.includes('conditioning') || ct.includes('clipsetlastlayer')) return 'conditioning';
  if (ct.includes('latent')) return 'latent-op';
  if (ct.includes('mask') || ct.includes('detector') || ct.includes('segm')) return 'mask';
  if (ct === 'note' || ct === 'reroute' || ct.includes('primitive') || ct.includes('debug')) return 'utility';

  if (outputTypes.some((type) => ['MODEL', 'CLIP', 'VAE'].includes(type))
    && !inputTypes.some((type) => ['MODEL', 'CLIP', 'VAE'].includes(type))) {
    return 'loader';
  }
  if (inputTypes.includes('LATENT') && inputTypes.includes('MODEL')
    && inputTypes.includes('CONDITIONING') && outputTypes.includes('LATENT')) {
    return 'sampler';
  }
  if (inputTypes.includes('IMAGE') && outputTypes.includes('IMAGE')
    && !inputTypes.includes('MODEL') && !outputTypes.includes('MODEL')) {
    return 'post-processor';
  }
  if (outputTypes.includes('IMAGE') && inputTypes.length === 0) return 'input';
  if (inputTypes.includes('IMAGE') && outputTypes.length === 0) return 'output';

  return 'unknown';
}

export function findPrimaryPath(graph: WorkflowGraph): string[] {
  let longestPath: string[] = [];
  for (const entryId of graph.metadata.entryNodes) {
    const path = dfsLongestPath(graph, entryId, new Set<string>());
    if (path.length > longestPath.length) longestPath = path;
  }
  return longestPath;
}

function dfsLongestPath(graph: WorkflowGraph, nodeId: string, visited: Set<string>): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const outgoing = graph.edges.filter((edge) => edge.sourceNodeId === nodeId);
  if (outgoing.length === 0) return [nodeId];

  let bestChild: string[] = [];
  for (const edge of outgoing) {
    const childPath = dfsLongestPath(graph, edge.targetNodeId, new Set(visited));
    if (childPath.length > bestChild.length) bestChild = childPath;
  }
  return [nodeId, ...bestChild];
}

export function getNodeOutputTypes(graph: WorkflowGraph, nodeId: string): string[] {
  const node = graph.nodes.get(nodeId);
  if (!node) return [];
  return node.outputs.map((output) => output.type).filter((type) => type !== '*');
}

export function getNodeFreeInputTypes(graph: WorkflowGraph, nodeId: string): string[] {
  const node = graph.nodes.get(nodeId);
  if (!node) return [];
  return node.inputs.filter((input) => !input.isConnected).map((input) => input.type).filter((type) => type !== '*');
}

export function getNodesByRole(graph: WorkflowGraph, role: NodeRole): GraphNode[] {
  return [...graph.nodes.values()].filter((node) => node.role === role);
}

export function findLastProcessingNode(graph: WorkflowGraph): GraphNode | null {
  for (const terminalId of graph.metadata.terminalNodes) {
    const terminal = graph.nodes.get(terminalId);
    if (!terminal || terminal.role !== 'output') continue;
    const incoming = graph.edges.filter((edge) => edge.targetNodeId === terminalId);
    for (const edge of incoming) {
      const source = graph.nodes.get(edge.sourceNodeId);
      if (source && source.role !== 'output' && source.role !== 'utility') return source;
    }
  }
  return null;
}

export function findFirstProcessingNode(graph: WorkflowGraph): GraphNode | null {
  for (const entryId of graph.metadata.entryNodes) {
    const entry = graph.nodes.get(entryId);
    if (!entry) continue;
    if (entry.role !== 'loader' && entry.role !== 'input' && entry.role !== 'utility') return entry;
    const outgoing = graph.edges.filter((edge) => edge.sourceNodeId === entryId);
    for (const edge of outgoing) {
      const next = graph.nodes.get(edge.targetNodeId);
      if (next && next.role !== 'loader' && next.role !== 'utility') return next;
    }
  }
  return null;
}

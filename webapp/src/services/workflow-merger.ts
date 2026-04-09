/**
 * Phase 11A - Workflow Merger Engine
 *
 * Analyzes two workflow graphs, detects merge strategy, finds type-safe bridge
 * points, deduplicates shared loader resources, and produces a merged workflow.
 */

import {
  parseWorkflowToGraph,
  findLastProcessingNode,
  findFirstProcessingNode,
  type WorkflowGraph,
  type GraphNode,
  type GraphEdge,
  type NodeRole,
} from './workflow-graph-parser';
import { getLiveNodeCache } from './comfyui-backend';

export type MergeStrategy = 'sequential' | 'parallel' | 'additive' | 'replacement';

export interface BridgePoint {
  id: string;
  description: string;
  priority: number;
  sourceWorkflow: 'A' | 'B';
  targetWorkflow: 'A' | 'B';
  sourceNodeId: string;
  sourceNodeName: string;
  sourcePortName: string;
  sourcePortType: string;
  targetNodeId: string;
  targetNodeName: string;
  targetPortName: string;
  targetPortType: string;
  requiresConverter?: {
    classType: string;
    inputPort: string;
    outputPort: string;
  };
}

export interface SharedResource {
  nodeA: GraphNode;
  nodeB: GraphNode;
  classType: string;
  role: NodeRole;
  recommendation: 'keep-a' | 'keep-b' | 'keep-both';
  reason: string;
}

export interface MergeAnalysis {
  graphA: WorkflowGraph;
  graphB: WorkflowGraph;
  recommendedStrategy: MergeStrategy;
  strategyExplanation: string;
  bridgePoints: BridgePoint[];
  sharedResources: SharedResource[];
  warnings: string[];
  requiredPacks: string[];
}

export interface MergeResult {
  workflow: any;
  graph: WorkflowGraph;
  strategy: MergeStrategy;
  bridgesUsed: BridgePoint[];
  deduplicatedNodes: string[];
  addedConverterNodes: string[];
  warnings: string[];
  summary: string;
}

export function analyzeMerge(
  workflowA: any,
  workflowB: any,
  _nameA: string = 'Workflow A',
  _nameB: string = 'Workflow B',
): MergeAnalysis {
  const graphA = parseWorkflowToGraph(workflowA);
  const graphB = parseWorkflowToGraph(workflowB);

  const sharedResources = findSharedResources(graphA, graphB);
  const bridgePoints = findBridgePoints(graphA, graphB);
  const strategyDecision = determineMergeStrategy(graphA, graphB, bridgePoints, sharedResources);
  const warnings: string[] = [];
  const requiredPacks = collectRequiredPacks(graphA, graphB);

  for (const shared of sharedResources) {
    if (shared.recommendation === 'keep-both') {
      warnings.push(
        `${shared.classType} exists in both workflows with different settings; both copies will be kept.`,
      );
    }
  }

  if (bridgePoints.length === 0) {
    warnings.push(
      'No direct type-safe bridge points were found. Workflows can still be merged in parallel with shared resources.',
    );
  }

  return {
    graphA,
    graphB,
    recommendedStrategy: strategyDecision.strategy,
    strategyExplanation: strategyDecision.explanation,
    bridgePoints: bridgePoints.sort((a, b) => b.priority - a.priority),
    sharedResources,
    warnings,
    requiredPacks,
  };
}

export function executeMerge(
  analysis: MergeAnalysis,
  strategy?: MergeStrategy,
  selectedBridges?: BridgePoint[],
): MergeResult {
  const mergeStrategy = strategy || analysis.recommendedStrategy;
  const bridges = selectedBridges || selectDefaultBridges(analysis.bridgePoints, mergeStrategy);
  const combined = combineGraphNodes(analysis.graphA, analysis.graphB);
  const deduplicatedNodes: string[] = [];
  const addedConverterNodes: string[] = [];
  const warnings = [...analysis.warnings];

  for (const shared of analysis.sharedResources) {
    if (shared.recommendation !== 'keep-a') continue;

    const newIdB = combined.idMapB.get(shared.nodeB.id);
    if (!newIdB) continue;

    const newIdA = combined.idMapA.get(shared.nodeA.id) || shared.nodeA.id;
    redirectConnections(combined.mergedEdges, newIdB, newIdA);
    combined.mergedNodes.delete(newIdB);
    deduplicatedNodes.push(`${shared.classType} (kept from A)`);
  }

  for (const bridge of bridges) {
    const sourceId = bridge.sourceWorkflow === 'A'
      ? (combined.idMapA.get(bridge.sourceNodeId) || bridge.sourceNodeId)
      : (combined.idMapB.get(bridge.sourceNodeId) || bridge.sourceNodeId);
    const targetId = bridge.targetWorkflow === 'A'
      ? (combined.idMapA.get(bridge.targetNodeId) || bridge.targetNodeId)
      : (combined.idMapB.get(bridge.targetNodeId) || bridge.targetNodeId);

    if (!combined.mergedNodes.has(sourceId) || !combined.mergedNodes.has(targetId)) {
      continue;
    }

    if (bridge.requiresConverter) {
      const converterId = String(getNextNodeId(combined.mergedNodes));
      const converterNode = createConverterNode(
        converterId,
        bridge.requiresConverter.classType,
        bridge.requiresConverter.inputPort,
        bridge.sourcePortType,
        bridge.requiresConverter.outputPort,
        bridge.targetPortType,
      );
      combined.mergedNodes.set(converterId, converterNode);
      addedConverterNodes.push(bridge.requiresConverter.classType);

      const converterPos = estimateBridgePosition(combined.mergedNodes.get(sourceId), combined.mergedNodes.get(targetId));
      converterNode.position = converterPos;

      combined.mergedEdges.push({
        id: String(getNextEdgeId(combined.mergedEdges)),
        sourceNodeId: sourceId,
        sourcePortName: bridge.sourcePortName,
        sourcePortIndex: findOutputIndex(combined.mergedNodes.get(sourceId), bridge.sourcePortName),
        targetNodeId: converterId,
        targetPortName: bridge.requiresConverter.inputPort,
        targetPortIndex: 0,
        type: bridge.sourcePortType,
      });

      combined.mergedEdges.push({
        id: String(getNextEdgeId(combined.mergedEdges)),
        sourceNodeId: converterId,
        sourcePortName: bridge.requiresConverter.outputPort,
        sourcePortIndex: 0,
        targetNodeId: targetId,
        targetPortName: bridge.targetPortName,
        targetPortIndex: findInputIndex(combined.mergedNodes.get(targetId), bridge.targetPortName),
        type: bridge.targetPortType,
      });
    } else {
      combined.mergedEdges.push({
        id: String(getNextEdgeId(combined.mergedEdges)),
        sourceNodeId: sourceId,
        sourcePortName: bridge.sourcePortName,
        sourcePortIndex: findOutputIndex(combined.mergedNodes.get(sourceId), bridge.sourcePortName),
        targetNodeId: targetId,
        targetPortName: bridge.targetPortName,
        targetPortIndex: findInputIndex(combined.mergedNodes.get(targetId), bridge.targetPortName),
        type: bridge.sourcePortType,
      });
    }
  }

  repositionMergedNodes(combined.mergedNodes, combined.idMapA, combined.idMapB, mergeStrategy);
  const normalizedEdges = dedupeEdges(combined.mergedEdges);
  const mergedWorkflow = graphToWorkflowJSON(combined.mergedNodes, normalizedEdges);

  const mergedGraph: WorkflowGraph = {
    nodes: combined.mergedNodes,
    edges: normalizedEdges,
    metadata: {
      sourceFormat: 'ui',
      totalNodes: combined.mergedNodes.size,
      totalEdges: normalizedEdges.length,
      entryNodes: findEntryNodes(combined.mergedNodes, normalizedEdges),
      terminalNodes: findTerminalNodes(combined.mergedNodes, normalizedEdges),
    },
  };

  return {
    workflow: mergedWorkflow,
    graph: mergedGraph,
    strategy: mergeStrategy,
    bridgesUsed: bridges,
    deduplicatedNodes,
    addedConverterNodes,
    warnings,
    summary: generateMergeSummary(analysis, mergeStrategy, bridges, deduplicatedNodes, addedConverterNodes),
  };
}

function findBridgePoints(graphA: WorkflowGraph, graphB: WorkflowGraph): BridgePoint[] {
  return [
    ...findDirectionalBridges(graphA, graphB, 'A', 'B'),
    ...findDirectionalBridges(graphB, graphA, 'B', 'A'),
  ];
}

function findDirectionalBridges(
  sourceGraph: WorkflowGraph,
  targetGraph: WorkflowGraph,
  sourceLabel: 'A' | 'B',
  targetLabel: 'A' | 'B',
): BridgePoint[] {
  const bridges: BridgePoint[] = [];
  let nextBridgeId = 0;

  const lastProcessor = findLastProcessingNode(sourceGraph);
  const sourceOutputs: Array<{
    nodeId: string;
    nodeName: string;
    portName: string;
    portType: string;
    priority: number;
  }> = [];

  if (lastProcessor) {
    for (const output of lastProcessor.outputs) {
      if (output.type === '*') continue;
      sourceOutputs.push({
        nodeId: lastProcessor.id,
        nodeName: lastProcessor.title || lastProcessor.classType,
        portName: output.name,
        portType: output.type,
        priority: 80,
      });
    }
  }

  for (const [nodeId, node] of sourceGraph.nodes.entries()) {
    if (node.role === 'utility' || node.role === 'output') continue;
    for (const output of node.outputs) {
      if (!['IMAGE', 'LATENT', 'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'MASK'].includes(output.type)) continue;
      sourceOutputs.push({
        nodeId,
        nodeName: node.title || node.classType,
        portName: output.name,
        portType: output.type,
        priority: node.id === lastProcessor?.id ? 80 : (node.role === 'loader' ? 60 : 40),
      });
    }
  }

  const targetInputs: Array<{
    nodeId: string;
    nodeName: string;
    portName: string;
    portType: string;
    role: NodeRole;
  }> = [];

  for (const [nodeId, node] of targetGraph.nodes.entries()) {
    if (node.role === 'utility' || node.role === 'output') continue;
    for (const input of node.inputs) {
      if (!['IMAGE', 'LATENT', 'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'MASK'].includes(input.type)) continue;
      targetInputs.push({
        nodeId,
        nodeName: node.title || node.classType,
        portName: input.name,
        portType: input.type,
        role: node.role,
      });
    }
  }

  for (const source of sourceOutputs) {
    for (const target of targetInputs) {
      if (isTypeCompatible(source.portType, target.portType)) {
        bridges.push({
          id: `bridge-${sourceLabel}${targetLabel}-${++nextBridgeId}`,
          description: `${source.nodeName}.${source.portName} (${source.portType}) -> ${target.nodeName}.${target.portName}`,
          priority: calculateBridgePriority(source, target),
          sourceWorkflow: sourceLabel,
          targetWorkflow: targetLabel,
          sourceNodeId: source.nodeId,
          sourceNodeName: source.nodeName,
          sourcePortName: source.portName,
          sourcePortType: source.portType,
          targetNodeId: target.nodeId,
          targetNodeName: target.nodeName,
          targetPortName: target.portName,
          targetPortType: target.portType,
        });
      }

      if (source.portType === target.portType) continue;
      const converter = findConverterNode(source.portType, target.portType);
      if (!converter) continue;
      bridges.push({
        id: `bridge-${sourceLabel}${targetLabel}-conv-${++nextBridgeId}`,
        description: `${source.nodeName}.${source.portName} -> [${converter.classType}] -> ${target.nodeName}.${target.portName}`,
        priority: Math.max(0, calculateBridgePriority(source, target) - 20),
        sourceWorkflow: sourceLabel,
        targetWorkflow: targetLabel,
        sourceNodeId: source.nodeId,
        sourceNodeName: source.nodeName,
        sourcePortName: source.portName,
        sourcePortType: source.portType,
        targetNodeId: target.nodeId,
        targetNodeName: target.nodeName,
        targetPortName: target.portName,
        targetPortType: target.portType,
        requiresConverter: converter,
      });
    }
  }

  return bridges;
}

function isTypeCompatible(outputType: string, inputType: string): boolean {
  if (outputType === inputType) return true;
  if (outputType === '*' || inputType === '*') return true;
  const compatibility: Record<string, string[]> = {
    IMAGE: ['IMAGE'],
    LATENT: ['LATENT'],
    MODEL: ['MODEL'],
    CLIP: ['CLIP'],
    VAE: ['VAE'],
    CONDITIONING: ['CONDITIONING'],
    MASK: ['MASK', 'IMAGE'],
  };
  return compatibility[outputType]?.includes(inputType) || false;
}

function findConverterNode(
  fromType: string,
  toType: string,
): { classType: string; inputPort: string; outputPort: string } | null {
  const converters: Record<string, Record<string, { classType: string; inputPort: string; outputPort: string }>> = {
    LATENT: {
      IMAGE: { classType: 'VAEDecode', inputPort: 'samples', outputPort: 'IMAGE' },
    },
    IMAGE: {
      LATENT: { classType: 'VAEEncode', inputPort: 'pixels', outputPort: 'LATENT' },
      MASK: { classType: 'ImageToMask', inputPort: 'image', outputPort: 'MASK' },
    },
    MASK: {
      IMAGE: { classType: 'MaskToImage', inputPort: 'mask', outputPort: 'IMAGE' },
    },
  };
  return converters[fromType]?.[toType] || null;
}

function calculateBridgePriority(
  source: { portType: string; priority: number },
  target: { portType: string; role: NodeRole },
): number {
  let priority = source.priority;
  if (source.portType === 'IMAGE' && target.portType === 'IMAGE') priority += 15;
  if (target.role === 'post-processor' || target.role === 'upscaler') priority += 10;
  if (['MODEL', 'CLIP', 'VAE'].includes(source.portType)) priority += 5;
  return Math.min(priority, 100);
}

function findSharedResources(graphA: WorkflowGraph, graphB: WorkflowGraph): SharedResource[] {
  const shared: SharedResource[] = [];

  for (const nodeA of graphA.nodes.values()) {
    for (const nodeB of graphB.nodes.values()) {
      if (nodeA.classType !== nodeB.classType) continue;
      if (nodeA.role !== 'loader') continue;

      const sameConfig = JSON.stringify(nodeA.widgetValues || []) === JSON.stringify(nodeB.widgetValues || []);
      shared.push({
        nodeA,
        nodeB,
        classType: nodeA.classType,
        role: nodeA.role,
        recommendation: sameConfig ? 'keep-a' : 'keep-both',
        reason: sameConfig
          ? `Same ${nodeA.classType} with identical settings; one shared copy is enough.`
          : `Same ${nodeA.classType} with different settings; keep both.`,
      });
    }
  }

  return shared;
}

function determineMergeStrategy(
  graphA: WorkflowGraph,
  graphB: WorkflowGraph,
  bridges: BridgePoint[],
  shared: SharedResource[],
): { strategy: MergeStrategy; explanation: string } {
  const lastA = findLastProcessingNode(graphA);
  const firstB = findFirstProcessingNode(graphB);
  const aToB = bridges.filter((bridge) => bridge.sourceWorkflow === 'A' && bridge.targetWorkflow === 'B');

  const sequentialBridges = aToB.filter((bridge) =>
    ['IMAGE', 'LATENT'].includes(bridge.sourcePortType) &&
    ['IMAGE', 'LATENT'].includes(bridge.targetPortType),
  );

  if (sequentialBridges.length > 0 && sequentialBridges[0].priority >= 60) {
    return {
      strategy: 'sequential',
      explanation:
        `Workflow A (${lastA?.classType || 'output'}) can feed Workflow B (${firstB?.classType || 'input'}) ` +
        `via a type-safe bridge. Recommended chain: A -> B.`,
    };
  }

  const rolesA = new Set([...graphA.nodes.values()].map((node) => node.role));
  const rolesB = new Set([...graphB.nodes.values()].map((node) => node.role));
  const uniqueBRoles = [...rolesB].filter((role) => !rolesA.has(role) && role !== 'utility' && role !== 'unknown');
  if (uniqueBRoles.length > 0 && shared.length > 0) {
    return {
      strategy: 'additive',
      explanation: `Workflow B adds unique stages (${uniqueBRoles.join(', ')}) and can be grafted onto A.`,
    };
  }

  if (shared.length > 2 && bridges.length === 0) {
    return {
      strategy: 'parallel',
      explanation: `No strong bridge found, but many shared resources exist. Run both branches in parallel.`,
    };
  }

  if (bridges.length > 0) {
    return {
      strategy: 'sequential',
      explanation: `Found ${bridges.length} bridge candidates. Sequential chaining is the safest default.`,
    };
  }

  return {
    strategy: 'parallel',
    explanation: 'No direct type-safe bridge detected. Parallel merge keeps both workflows intact.',
  };
}

function selectDefaultBridges(bridges: BridgePoint[], strategy: MergeStrategy): BridgePoint[] {
  if (bridges.length === 0) return [];

  const sorted = [...bridges].sort((a, b) => b.priority - a.priority);
  if (strategy === 'sequential') {
    const selected: BridgePoint[] = [];
    const main = sorted.find((bridge) =>
      bridge.sourceWorkflow === 'A' &&
      bridge.targetWorkflow === 'B' &&
      ['IMAGE', 'LATENT'].includes(bridge.sourcePortType),
    );
    if (main) selected.push(main);

    const resourceTypes = new Set<string>(selected.map((bridge) => bridge.sourcePortType));
    for (const bridge of sorted) {
      if (bridge.sourceWorkflow !== 'A' || bridge.targetWorkflow !== 'B') continue;
      if (!['MODEL', 'CLIP', 'VAE'].includes(bridge.sourcePortType)) continue;
      if (resourceTypes.has(bridge.sourcePortType)) continue;
      selected.push(bridge);
      resourceTypes.add(bridge.sourcePortType);
    }
    return selected;
  }

  const result: BridgePoint[] = [];
  const takenTargets = new Set<string>();
  for (const bridge of sorted) {
    const key = `${bridge.targetWorkflow}:${bridge.targetNodeId}:${bridge.targetPortName}`;
    if (takenTargets.has(key)) continue;
    result.push(bridge);
    takenTargets.add(key);
    if (result.length >= 5) break;
  }
  return result;
}

function combineGraphNodes(
  graphA: WorkflowGraph,
  graphB: WorkflowGraph,
): {
  mergedNodes: Map<string, GraphNode>;
  mergedEdges: GraphEdge[];
  idMapA: Map<string, string>;
  idMapB: Map<string, string>;
} {
  const mergedNodes = new Map<string, GraphNode>();
  const mergedEdges: GraphEdge[] = [];
  const idMapA = new Map<string, string>();
  const idMapB = new Map<string, string>();

  let maxId = 0;
  for (const id of graphA.nodes.keys()) {
    maxId = Math.max(maxId, parseInt(id, 10) || 0);
  }
  const offsetB = maxId + 100;

  for (const [nodeId, node] of graphA.nodes.entries()) {
    idMapA.set(nodeId, nodeId);
    mergedNodes.set(nodeId, cloneGraphNode(node, nodeId));
  }

  let edgeCounter = 0;
  for (const edge of graphA.edges) {
    mergedEdges.push({
      ...edge,
      id: String(++edgeCounter),
      sourceNodeId: idMapA.get(edge.sourceNodeId) || edge.sourceNodeId,
      targetNodeId: idMapA.get(edge.targetNodeId) || edge.targetNodeId,
    });
  }

  for (const [nodeId, node] of graphB.nodes.entries()) {
    const newId = String((parseInt(nodeId, 10) || 0) + offsetB);
    idMapB.set(nodeId, newId);
    mergedNodes.set(newId, cloneGraphNode(node, newId));
  }

  for (const edge of graphB.edges) {
    mergedEdges.push({
      ...edge,
      id: String(++edgeCounter),
      sourceNodeId: idMapB.get(edge.sourceNodeId) || edge.sourceNodeId,
      targetNodeId: idMapB.get(edge.targetNodeId) || edge.targetNodeId,
    });
  }

  return { mergedNodes, mergedEdges, idMapA, idMapB };
}

function cloneGraphNode(node: GraphNode, id: string): GraphNode {
  return {
    ...node,
    id,
    inputs: node.inputs.map((input) => ({ ...input })),
    outputs: node.outputs.map((output) => ({ ...output })),
    widgetValues: Array.isArray(node.widgetValues) ? [...node.widgetValues] : [],
  };
}

function redirectConnections(edges: GraphEdge[], fromNodeId: string, toNodeId: string): void {
  for (const edge of edges) {
    if (edge.sourceNodeId === fromNodeId) edge.sourceNodeId = toNodeId;
    if (edge.targetNodeId === fromNodeId) edge.targetNodeId = toNodeId;
  }
}

function repositionMergedNodes(
  nodes: Map<string, GraphNode>,
  idMapA: Map<string, string>,
  idMapB: Map<string, string>,
  strategy: MergeStrategy,
): void {
  let maxX = 0;
  let maxY = 0;
  for (const id of idMapA.values()) {
    const node = nodes.get(id);
    if (!node?.position) continue;
    maxX = Math.max(maxX, node.position[0] + (node.size?.[0] || 300));
    maxY = Math.max(maxY, node.position[1]);
  }

  const gap = 220;
  for (const id of idMapB.values()) {
    const node = nodes.get(id);
    if (!node) continue;
    const original = node.position || [0, 0];
    if (strategy === 'parallel') {
      node.position = [original[0], original[1] + maxY + gap + 200];
    } else {
      node.position = [original[0] + maxX + gap, original[1]];
    }
  }
}

function createConverterNode(
  id: string,
  classType: string,
  inputPortName: string,
  inputType: string,
  outputPortName: string,
  outputType: string,
): GraphNode {
  return {
    id,
    classType,
    title: classType,
    role: classType.toLowerCase().includes('decode')
      ? 'decoder'
      : classType.toLowerCase().includes('encode')
        ? 'encoder'
        : 'utility',
    inputs: [{
      name: inputPortName,
      type: inputType,
      isConnected: true,
    }],
    outputs: [{
      name: outputPortName,
      type: outputType,
      isConnected: true,
    }],
    widgetValues: [],
    position: [0, 0],
    size: [220, 90],
  };
}

function estimateBridgePosition(source?: GraphNode, target?: GraphNode): [number, number] {
  const sourcePos = source?.position || [0, 0];
  const targetPos = target?.position || [sourcePos[0] + 350, sourcePos[1]];
  return [
    Math.round((sourcePos[0] + targetPos[0]) / 2),
    Math.round((sourcePos[1] + targetPos[1]) / 2),
  ];
}

function findOutputIndex(node: GraphNode | undefined, outputName: string): number {
  if (!node) return 0;
  const index = node.outputs.findIndex((output) => output.name === outputName);
  return index >= 0 ? index : 0;
}

function findInputIndex(node: GraphNode | undefined, inputName: string): number {
  if (!node) return 0;
  const index = node.inputs.findIndex((input) => input.name === inputName);
  return index >= 0 ? index : 0;
}

function getNextNodeId(nodes: Map<string, GraphNode>): number {
  let max = 0;
  for (const id of nodes.keys()) {
    max = Math.max(max, parseInt(id, 10) || 0);
  }
  return max + 1;
}

function getNextEdgeId(edges: GraphEdge[]): number {
  let max = 0;
  for (const edge of edges) {
    max = Math.max(max, parseInt(edge.id, 10) || 0);
  }
  return max + 1;
}

function findEntryNodes(nodes: Map<string, GraphNode>, edges: GraphEdge[]): string[] {
  const withIncoming = new Set(edges.map((edge) => edge.targetNodeId));
  return [...nodes.keys()].filter((id) => !withIncoming.has(id));
}

function findTerminalNodes(nodes: Map<string, GraphNode>, edges: GraphEdge[]): string[] {
  const withOutgoing = new Set(edges.map((edge) => edge.sourceNodeId));
  return [...nodes.keys()].filter((id) => !withOutgoing.has(id));
}

function collectRequiredPacks(graphA: WorkflowGraph, graphB: WorkflowGraph): string[] {
  const liveNodes = getLiveNodeCache()?.nodes || {};
  const missing = new Set<string>();
  const allTypes = new Set<string>();

  for (const node of graphA.nodes.values()) allTypes.add(node.classType);
  for (const node of graphB.nodes.values()) allTypes.add(node.classType);

  for (const classType of allTypes) {
    if (!liveNodes[classType]) {
      missing.add(classType);
    }
  }

  return [...missing].sort();
}

function dedupeEdges(edges: GraphEdge[]): GraphEdge[] {
  const seen = new Set<string>();
  const deduped: GraphEdge[] = [];
  let nextId = 1;
  for (const edge of edges) {
    const key = `${edge.sourceNodeId}:${edge.sourcePortIndex}:${edge.targetNodeId}:${edge.targetPortIndex}:${edge.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      ...edge,
      id: String(nextId++),
    });
  }
  return deduped;
}

function graphToWorkflowJSON(nodes: Map<string, GraphNode>, edges: GraphEdge[]): any {
  const links: any[] = [];
  const edgeToLinkId = new Map<string, number>();
  let linkId = 0;

  for (const edge of edges) {
    const id = ++linkId;
    edgeToLinkId.set(edge.id, id);
    links.push([
      id,
      parseInt(edge.sourceNodeId, 10),
      edge.sourcePortIndex,
      parseInt(edge.targetNodeId, 10),
      edge.targetPortIndex,
      edge.type,
    ]);
  }

  const sortedNodes = [...nodes.values()].sort((a, b) => (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0));
  const workflowNodes = sortedNodes.map((node, order) => {
    const inputDefs = node.inputs.map((input, inputIndex) => {
      const edge = edges.find((candidate) =>
        candidate.targetNodeId === node.id &&
        (candidate.targetPortName === input.name || candidate.targetPortIndex === inputIndex),
      );
      return {
        name: input.name,
        type: input.type,
        link: edge ? (edgeToLinkId.get(edge.id) || null) : null,
      };
    });

    const outputDefs = node.outputs.map((output, outputIndex) => {
      const outgoing = edges.filter((edge) =>
        edge.sourceNodeId === node.id &&
        (edge.sourcePortName === output.name || edge.sourcePortIndex === outputIndex),
      );
      return {
        name: output.name,
        type: output.type,
        links: outgoing
          .map((edge) => edgeToLinkId.get(edge.id))
          .filter((value): value is number => typeof value === 'number'),
      };
    });

    return {
      id: parseInt(node.id, 10),
      type: node.classType,
      pos: node.position || [0, order * 140],
      size: node.size || [300, 120],
      flags: {},
      order,
      mode: 0,
      title: node.title,
      inputs: inputDefs.length > 0 ? inputDefs : undefined,
      outputs: outputDefs.length > 0 ? outputDefs : undefined,
      widgets_values: Array.isArray(node.widgetValues) ? node.widgetValues : [],
      properties: {},
    };
  });

  const maxNodeId = workflowNodes.reduce((acc, node) => Math.max(acc, node.id), 0);
  return {
    last_node_id: maxNodeId,
    last_link_id: linkId,
    nodes: workflowNodes,
    links,
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };
}

function generateMergeSummary(
  analysis: MergeAnalysis,
  strategy: MergeStrategy,
  bridges: BridgePoint[],
  deduped: string[],
  converters: string[],
): string {
  const lines: string[] = [];
  lines.push(`Merge strategy: ${strategy.toUpperCase()}`);
  lines.push(`Nodes: ${analysis.graphA.metadata.totalNodes} (A) + ${analysis.graphB.metadata.totalNodes} (B)`);
  if (bridges.length > 0) {
    lines.push(`Bridges: ${bridges.map((bridge) => bridge.description).join('; ')}`);
  }
  if (deduped.length > 0) {
    lines.push(`Deduplicated: ${deduped.join(', ')}`);
  }
  if (converters.length > 0) {
    lines.push(`Auto-inserted converters: ${converters.join(', ')}`);
  }
  if (analysis.warnings.length > 0) {
    lines.push(`Warnings: ${analysis.warnings.join('; ')}`);
  }
  return lines.join('\n');
}


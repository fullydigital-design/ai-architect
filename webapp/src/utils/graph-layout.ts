import dagre from '@dagrejs/dagre';

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
  label?: string;
  type?: string;
  x?: number;
  y?: number;
}

export interface LayoutEdge {
  source: string;
  sourceOutput: string;
  target: string;
  targetInput: string;
}

export interface LayoutOptions {
  direction: 'LR' | 'TB';
  nodeWidth: number;
  nodeHeight: number;
  rankSep: number;
  nodeSep: number;
  edgeSep: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'LR',
  nodeWidth: 200,
  nodeHeight: 80,
  rankSep: 120,
  nodeSep: 40,
  edgeSep: 20,
};

export function computeAutoLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: Partial<LayoutOptions> = {},
): Map<string, { x: number; y: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
    edgesep: opts.edgeSep,
    marginx: 40,
    marginy: 40,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: node.width || opts.nodeWidth,
      height: node.height || opts.nodeHeight,
      label: node.label || node.id,
    });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const positions = new Map<string, { x: number; y: number }>();
  for (const nodeId of graph.nodes()) {
    const nodeData = graph.node(nodeId);
    if (!nodeData) continue;
    positions.set(nodeId, {
      x: nodeData.x - (nodeData.width / 2),
      y: nodeData.y - (nodeData.height / 2),
    });
  }

  return positions;
}

export function computeGraphBounds(
  positions: Map<string, { x: number; y: number }>,
  nodeWidth = 200,
  nodeHeight = 80,
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + nodeWidth);
    maxY = Math.max(maxY, pos.y + nodeHeight);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: nodeWidth, maxY: nodeHeight, width: nodeWidth, height: nodeHeight };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

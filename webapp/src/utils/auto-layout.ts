import type { ComfyUIWorkflow, ComfyUINode } from '../types/comfyui';
import { NODE_REGISTRY } from '../data/node-registry';

// ── Layout constants ─────────────────────────────────────────────────────────

const LAYER_GAP_X = 420;   // horizontal gap between layers (columns)
const NODE_GAP_Y = 55;     // vertical gap between nodes in the same layer
const START_X = 60;
const START_Y = 60;
const DEFAULT_NODE_W = 320;

// ── Node height estimation (mirrors ComfyNode.tsx rendering) ─────────────────

const H_ACCENT = 3;
const H_HEADER = 28;
const H_FOOTER = 20;
const H_SECTION_LABEL = 16;
const H_ROW = 24;
const H_MULTILINE = 60;       // multiline text widget
const H_SECTION_BORDER = 1;
const MAX_VISIBLE_WIDGETS = 16;

function normalizeName(name: string): string {
  return String(name || '').toLowerCase().replace(/[\s_-]/g, '');
}

function countMergedConnectionInputs(node: ComfyUINode): number {
  const schema = NODE_REGISTRY.get(node.type);
  const schemaConnInputs = (schema?.inputs || []).filter((input) => !input.isWidget);
  const merged = new Set<string>();

  for (const input of node.inputs || []) {
    if (!input?.name) continue;
    merged.add(normalizeName(input.name));
  }
  for (const input of schemaConnInputs) {
    merged.add(normalizeName(input.name));
  }
  return merged.size;
}

function countMergedOutputs(node: ComfyUINode): number {
  const schema = NODE_REGISTRY.get(node.type);
  const schemaOutputs = schema?.outputs || [];
  const mergedBySlot = new Set<number>();
  const mergedByNameType = new Set<string>();

  for (const output of node.outputs || []) {
    if (Number.isFinite(output?.slot_index)) mergedBySlot.add(Number(output.slot_index));
    const key = `${normalizeName(output?.name || '')}:${String(output?.type || '').toUpperCase()}`;
    if (key !== ':') mergedByNameType.add(key);
  }

  for (const output of schemaOutputs) {
    if (Number.isFinite(output?.slotIndex)) mergedBySlot.add(Number(output.slotIndex));
    const key = `${normalizeName(output?.name || '')}:${String(output?.type || '').toUpperCase()}`;
    if (key !== ':') mergedByNameType.add(key);
  }

  return Math.max(mergedBySlot.size, mergedByNameType.size);
}

function estimateNodeHeight(node: ComfyUINode): number {
  const schema = NODE_REGISTRY.get(node.type);

  // Count connection inputs
  const connectionInputCount = countMergedConnectionInputs(node);

  // Count widget values (visible ones only)
  const widgetValues = node.widgets_values ?? [];
  const visibleWidgetCount = Math.min(
    widgetValues.filter(v => v !== null && v !== undefined && String(v) !== '').length,
    MAX_VISIBLE_WIDGETS,
  );

  // Check for multiline widgets (prompts, text)
  let multilineCount = 0;
  const widgetInputs = schema?.inputs.filter(i => i.isWidget) ?? [];
  for (let i = 0; i < visibleWidgetCount; i++) {
    const val = widgetValues[i];
    const name = (widgetInputs[i]?.name ?? '').toLowerCase();
    if (
      typeof val === 'string' &&
      (val.length > 60 || name.includes('prompt') || name.includes('text'))
    ) {
      multilineCount++;
    }
  }

  // Count outputs
  const outputCount = countMergedOutputs(node);

  // Sum up
  let h = H_ACCENT + H_HEADER + H_FOOTER;

  if (connectionInputCount > 0) {
    h += H_SECTION_LABEL + connectionInputCount * H_ROW + H_SECTION_BORDER + 4;
  }

  if (visibleWidgetCount > 0) {
    const regularWidgets = visibleWidgetCount - multilineCount;
    h += H_SECTION_LABEL + regularWidgets * H_ROW + multilineCount * H_MULTILINE + H_SECTION_BORDER + 4;
    if (widgetValues.filter(v => v !== null && v !== undefined && String(v) !== '').length > MAX_VISIBLE_WIDGETS) {
      h += 14; // overflow "+N more" text
    }
  }

  if (outputCount > 0) {
    h += H_SECTION_LABEL + outputCount * H_ROW + H_SECTION_BORDER + 4;
  }

  return Math.max(h, 90); // minimum height
}

function estimateNodeWidth(node: ComfyUINode): number {
  // Use stored size if it looks reasonable, otherwise default
  if (node.size?.[0] && node.size[0] > 100 && node.size[0] < 600) {
    return node.size[0];
  }
  return DEFAULT_NODE_W;
}

// ── Topological layering (Kahn's algorithm) ──────────────────────────────────

function buildLayers(workflow: ComfyUIWorkflow): number[][] {
  const incomingEdges = new Map<number, Set<number>>();
  const outgoingEdges = new Map<number, Set<number>>();

  for (const node of workflow.nodes) {
    incomingEdges.set(node.id, new Set());
    outgoingEdges.set(node.id, new Set());
  }

  for (const [, srcId, , tgtId] of workflow.links) {
    incomingEdges.get(tgtId)?.add(srcId);
    outgoingEdges.get(srcId)?.add(tgtId);
  }

  const layers: number[][] = [];
  const assigned = new Set<number>();
  const inDegree = new Map<number, number>();

  for (const node of workflow.nodes) {
    inDegree.set(node.id, incomingEdges.get(node.id)?.size ?? 0);
  }

  // Kahn's algorithm
  let currentLayer: number[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) currentLayer.push(id);
  }

  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    for (const id of currentLayer) assigned.add(id);

    const nextLayer: number[] = [];
    for (const id of currentLayer) {
      for (const tgt of outgoingEdges.get(id) ?? []) {
        const newDeg = (inDegree.get(tgt) ?? 1) - 1;
        inDegree.set(tgt, newDeg);
        if (newDeg === 0) nextLayer.push(tgt);
      }
    }
    currentLayer = nextLayer;
  }

  // Remaining nodes (cycles or disconnected)
  const remaining = workflow.nodes.filter(n => !assigned.has(n.id)).map(n => n.id);
  if (remaining.length > 0) {
    layers.push(remaining);
  }

  return layers;
}

// ── Vertical ordering heuristic (reduce edge crossings) ─────────────────────

function sortLayerByConnections(
  layer: number[],
  prevLayerPositions: Map<number, number>,
  incomingEdges: Map<number, Set<number>>,
): number[] {
  if (layer.length <= 1) return layer;

  // Sort nodes by the average Y position of their predecessors
  return [...layer].sort((a, b) => {
    const aParents = incomingEdges.get(a) ?? new Set();
    const bParents = incomingEdges.get(b) ?? new Set();

    let aAvg = 0, aCount = 0;
    for (const p of aParents) {
      if (prevLayerPositions.has(p)) { aAvg += prevLayerPositions.get(p)!; aCount++; }
    }
    let bAvg = 0, bCount = 0;
    for (const p of bParents) {
      if (prevLayerPositions.has(p)) { bAvg += prevLayerPositions.get(p)!; bCount++; }
    }

    const aCenter = aCount > 0 ? aAvg / aCount : Infinity;
    const bCenter = bCount > 0 ? bAvg / bCount : Infinity;
    return aCenter - bCenter;
  });
}

// ── Main layout function ─────────────────────────────────────────────────────

export function autoLayoutWorkflow(workflow: ComfyUIWorkflow): ComfyUIWorkflow {
  if (!workflow.nodes || workflow.nodes.length === 0) return workflow;

  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
  const layers = buildLayers(workflow);

  // Build incoming edges for vertical sorting
  const incomingEdges = new Map<number, Set<number>>();
  for (const node of workflow.nodes) {
    incomingEdges.set(node.id, new Set());
  }
  for (const [, srcId, , tgtId] of workflow.links) {
    incomingEdges.get(tgtId)?.add(srcId);
  }

  // Track Y center positions per node for cross-layer alignment
  const nodeCenterY = new Map<number, number>();
  const positions = new Map<number, { x: number; y: number; w: number; h: number }>();

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    // Sort this layer's nodes to minimize edge crossings
    const sortedLayer = sortLayerByConnections(layers[layerIdx], nodeCenterY, incomingEdges);

    const x = START_X + layerIdx * LAYER_GAP_X;
    let y = START_Y;

    for (const nodeId of sortedLayer) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const w = estimateNodeWidth(node);
      const h = estimateNodeHeight(node);

      positions.set(nodeId, { x, y, w, h });
      nodeCenterY.set(nodeId, y + h / 2);

      y += h + NODE_GAP_Y;
    }
  }

  // Build final node list
  const newNodes: ComfyUINode[] = workflow.nodes.map(node => {
    const pos = positions.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      pos: [pos.x, pos.y] as [number, number],
      size: [pos.w, pos.h] as [number, number],
    };
  });

  return { ...workflow, nodes: newNodes };
}

// ── Overlap detection & resolution ──────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

function rectsOverlap(a: Rect, b: Rect, padding: number = 20): boolean {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  );
}

/**
 * Checks if any nodes in the workflow overlap and resolves collisions
 * by nudging them apart. If overlaps are severe, falls back to full
 * topological re-layout.
 */
export function resolveOverlaps(workflow: ComfyUIWorkflow): ComfyUIWorkflow {
  if (!workflow.nodes || workflow.nodes.length <= 1) return workflow;

  // Build rectangles
  const rects: Array<Rect & { id: number }> = workflow.nodes.map(node => ({
    id: node.id,
    x: node.pos[0],
    y: node.pos[1],
    w: estimateNodeWidth(node),
    h: estimateNodeHeight(node),
  }));

  // Count overlapping pairs
  let overlapCount = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (rectsOverlap(rects[i], rects[j])) overlapCount++;
    }
  }

  if (overlapCount === 0) return workflow; // No overlaps — keep original positions

  // If many overlaps, just re-layout from scratch
  const totalPairs = (rects.length * (rects.length - 1)) / 2;
  if (overlapCount / totalPairs > 0.12 || overlapCount > rects.length) {
    return autoLayoutWorkflow(workflow);
  }

  // Otherwise: iterative nudging (more iterations + damping)
  const PADDING = 35;
  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
  const posMap = new Map(rects.map(r => [r.id, { x: r.x, y: r.y, w: r.w, h: r.h }]));

  for (let iter = 0; iter < 80; iter++) {
    let anyOverlap = false;
    const rectArr = Array.from(posMap.entries()).map(([id, r]) => ({ id, ...r }));

    for (let i = 0; i < rectArr.length; i++) {
      for (let j = i + 1; j < rectArr.length; j++) {
        const a = rectArr[i];
        const b = rectArr[j];
        if (!rectsOverlap(a, b, PADDING)) continue;
        anyOverlap = true;

        // Calculate overlap vector
        const overlapX = Math.min(a.x + a.w + PADDING - b.x, b.x + b.w + PADDING - a.x);
        const overlapY = Math.min(a.y + a.h + PADDING - b.y, b.y + b.h + PADDING - a.y);

        // Push apart along the axis of least overlap
        if (overlapY < overlapX) {
          const nudge = (overlapY / 2 + 2) * 0.6;
          if (a.y < b.y) {
            posMap.get(a.id)!.y -= nudge;
            posMap.get(b.id)!.y += nudge;
          } else {
            posMap.get(a.id)!.y += nudge;
            posMap.get(b.id)!.y -= nudge;
          }
        } else {
          const nudge = (overlapX / 2 + 2) * 0.6;
          if (a.x < b.x) {
            posMap.get(a.id)!.x -= nudge;
            posMap.get(b.id)!.x += nudge;
          } else {
            posMap.get(a.id)!.x += nudge;
            posMap.get(b.id)!.x -= nudge;
          }
        }
      }
    }

    if (!anyOverlap) break;
  }

  // Apply resolved positions
  const newNodes: ComfyUINode[] = workflow.nodes.map(node => {
    const pos = posMap.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      pos: [Math.round(pos.x), Math.round(pos.y)] as [number, number],
      size: [pos.w, pos.h] as [number, number],
    };
  });

  return { ...workflow, nodes: newNodes };
}

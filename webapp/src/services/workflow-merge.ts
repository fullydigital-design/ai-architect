import type { ComfyUILink, ComfyUINode, ComfyUIWorkflow } from '../types/comfyui';

export interface MergeReport {
  preservedNodes: number;
  addedNodes: number;
  removedNodes: number;
  reconnectedLinks: number;
  forcedRestorations: number;
  warnings: string[];
}

function getMaxNodeId(workflow: ComfyUIWorkflow): number {
  const maxNode = (workflow.nodes || []).reduce((max, node) => Math.max(max, node.id), 0);
  return Math.max(maxNode, workflow.last_node_id || 0);
}

function getMaxLinkId(workflow: ComfyUIWorkflow): number {
  const maxLink = (workflow.links || []).reduce((max, link) => Math.max(max, link[0]), 0);
  return Math.max(maxLink, workflow.last_link_id || 0);
}

function linkKey(link: ComfyUILink): string {
  return `${link[1]}-${link[2]}-${link[3]}-${link[4]}-${link[5]}`;
}

function scoreNodeSimilarity(original: ComfyUINode, modified: ComfyUINode): number {
  let score = 0;

  if (original.type === modified.type) score += 20;

  const originalWidgets = JSON.stringify(original.widgets_values || []);
  const modifiedWidgets = JSON.stringify(modified.widgets_values || []);
  if (originalWidgets === modifiedWidgets) score += 60;

  if ((original.title || '') === (modified.title || '')) score += 10;

  if (Array.isArray(original.pos) && Array.isArray(modified.pos)) {
    const dx = Math.abs(original.pos[0] - modified.pos[0]);
    const dy = Math.abs(original.pos[1] - modified.pos[1]);
    if (dx < 20 && dy < 20) score += 10;
    else if (dx < 80 && dy < 80) score += 5;
  }

  return score;
}

function remapNodeIdInLinks(links: ComfyUILink[], idMapping: Map<number, number>): ComfyUILink[] {
  return links.map((link) => [
    link[0],
    idMapping.get(link[1]) ?? link[1],
    link[2],
    idMapping.get(link[3]) ?? link[3],
    link[4],
    link[5],
  ]);
}

export function detectIdRewrite(original: ComfyUIWorkflow, modified: ComfyUIWorkflow): boolean {
  const originalIds = new Set((original.nodes || []).map((node) => node.id));
  const modifiedIds = new Set((modified.nodes || []).map((node) => node.id));
  if (originalIds.size === 0) return false;

  const overlap = [...originalIds].filter((id) => modifiedIds.has(id));
  return overlap.length < originalIds.size * 0.3;
}

export function attemptIdRecovery(
  original: ComfyUIWorkflow,
  modified: ComfyUIWorkflow,
): ComfyUIWorkflow | null {
  const originalNodes = original.nodes || [];
  const modifiedNodes = modified.nodes || [];
  if (originalNodes.length === 0 || modifiedNodes.length === 0) return null;

  const originalByType = new Map<string, ComfyUINode[]>();
  for (const node of originalNodes) {
    const bucket = originalByType.get(node.type) || [];
    bucket.push(node);
    originalByType.set(node.type, bucket);
  }

  const idMapping = new Map<number, number>();
  const usedOriginalIds = new Set<number>();

  for (const modifiedNode of modifiedNodes) {
    const candidates = originalByType.get(modifiedNode.type) || [];
    if (candidates.length === 0) continue;

    let bestCandidate: ComfyUINode | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      if (usedOriginalIds.has(candidate.id)) continue;
      const score = scoreNodeSimilarity(candidate, modifiedNode);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      idMapping.set(modifiedNode.id, bestCandidate.id);
      usedOriginalIds.add(bestCandidate.id);
    }
  }

  if (idMapping.size < originalNodes.length * 0.5) return null;

  let nextNodeId = getMaxNodeId(original) + 1;
  const remappedNodes = modifiedNodes.map((node) => {
    const mappedId = idMapping.get(node.id);
    if (mappedId !== undefined) {
      return { ...node, id: mappedId };
    }

    const newId = nextNodeId++;
    idMapping.set(node.id, newId);
    return { ...node, id: newId };
  });

  const remappedLinks = remapNodeIdInLinks(modified.links || [], idMapping);

  return {
    ...modified,
    nodes: remappedNodes,
    links: remappedLinks,
    last_node_id: Math.max(getMaxNodeId(modified), ...remappedNodes.map((node) => node.id)),
    last_link_id: Math.max(getMaxLinkId(modified), ...remappedLinks.map((link) => link[0])),
  };
}

export function mergeWorkflows(
  original: ComfyUIWorkflow,
  modified: ComfyUIWorkflow,
  _userRequest: string,
): { workflow: ComfyUIWorkflow; report: MergeReport } {
  const originalNodes = original.nodes || [];
  const modifiedNodes = modified.nodes || [];
  const originalMap = new Map<number, ComfyUINode>();
  for (const node of originalNodes) {
    originalMap.set(node.id, node);
  }

  const report: MergeReport = {
    preservedNodes: 0,
    addedNodes: 0,
    removedNodes: 0,
    reconnectedLinks: 0,
    forcedRestorations: 0,
    warnings: [],
  };

  const mergedNodes: ComfyUINode[] = [];

  for (const modifiedNode of modifiedNodes) {
    const originalNode = originalMap.get(modifiedNode.id);
    if (!originalNode) {
      report.addedNodes += 1;
      mergedNodes.push(modifiedNode);
      continue;
    }

    if (originalNode.type !== modifiedNode.type) {
      report.warnings.push(
        `Node #${modifiedNode.id} type changed: ${originalNode.type} -> ${modifiedNode.type}`,
      );
      mergedNodes.push(modifiedNode);
      continue;
    }

    report.preservedNodes += 1;

    const needsRestoration =
      JSON.stringify(originalNode.pos) !== JSON.stringify(modifiedNode.pos) ||
      JSON.stringify(originalNode.size) !== JSON.stringify(modifiedNode.size) ||
      JSON.stringify(originalNode.flags || {}) !== JSON.stringify(modifiedNode.flags || {}) ||
      (originalNode.order ?? null) !== (modifiedNode.order ?? null) ||
      (originalNode.mode ?? null) !== (modifiedNode.mode ?? null) ||
      JSON.stringify(originalNode.properties || {}) !== JSON.stringify(modifiedNode.properties || {}) ||
      (originalNode.title || '') !== (modifiedNode.title || '') ||
      (originalNode.color || '') !== (modifiedNode.color || '') ||
      (originalNode.bgcolor || '') !== (modifiedNode.bgcolor || '');

    if (needsRestoration) report.forcedRestorations += 1;

    mergedNodes.push({
      ...modifiedNode,
      pos: originalNode.pos,
      size: originalNode.size || modifiedNode.size,
      flags: originalNode.flags ?? modifiedNode.flags,
      order: originalNode.order ?? modifiedNode.order,
      mode: originalNode.mode ?? modifiedNode.mode,
      properties: originalNode.properties ?? modifiedNode.properties,
      title: originalNode.title ?? modifiedNode.title,
      color: originalNode.color ?? modifiedNode.color,
      bgcolor: originalNode.bgcolor ?? modifiedNode.bgcolor,
    });
  }

  const modifiedNodeIds = new Set(modifiedNodes.map((node) => node.id));
  for (const originalNode of originalNodes) {
    if (!modifiedNodeIds.has(originalNode.id)) report.removedNodes += 1;
  }

  const originalLinkSet = new Set((original.links || []).map((link) => linkKey(link)));
  const modifiedLinkSet = new Set((modified.links || []).map((link) => linkKey(link)));
  let addedLinks = 0;
  let removedLinks = 0;

  for (const link of modifiedLinkSet) {
    if (!originalLinkSet.has(link)) addedLinks += 1;
  }
  for (const link of originalLinkSet) {
    if (!modifiedLinkSet.has(link)) removedLinks += 1;
  }
  report.reconnectedLinks = addedLinks + removedLinks;

  const mergedWorkflow: ComfyUIWorkflow = {
    ...modified,
    nodes: mergedNodes,
    links: modified.links || [],
    last_node_id: Math.max(getMaxNodeId(modified), ...mergedNodes.map((node) => node.id)),
    last_link_id: Math.max(getMaxLinkId(modified), ...(modified.links || []).map((link) => link[0])),
  };

  return { workflow: mergedWorkflow, report };
}

import type { ComfyUIWorkflow } from '../types/comfyui';

export interface WorkflowDiff {
  nodesAdded: Array<{ id: number; type: string }>;
  nodesRemoved: Array<{ id: number; type: string }>;
  nodesModified: Array<{ id: number; type: string; changes: string[] }>;
  linksAdded: number;
  linksRemoved: number;
  summary: string;
}

export function diffWorkflows(
  before: ComfyUIWorkflow,
  after: ComfyUIWorkflow,
): WorkflowDiff {
  const beforeNodeIds = new Set(before.nodes.map((n) => n.id));
  const afterNodeIds = new Set(after.nodes.map((n) => n.id));
  const beforeNodeMap = new Map(before.nodes.map((n) => [n.id, n]));

  const nodesAdded = after.nodes
    .filter((n) => !beforeNodeIds.has(n.id))
    .map((n) => ({ id: n.id, type: n.type }));

  const nodesRemoved = before.nodes
    .filter((n) => !afterNodeIds.has(n.id))
    .map((n) => ({ id: n.id, type: n.type }));

  const nodesModified: WorkflowDiff['nodesModified'] = [];
  for (const afterNode of after.nodes) {
    const beforeNode = beforeNodeMap.get(afterNode.id);
    if (!beforeNode) continue;

    const changes: string[] = [];
    if (afterNode.type !== beforeNode.type) {
      changes.push(`type: ${beforeNode.type} -> ${afterNode.type}`);
    }

    const bw = JSON.stringify(beforeNode.widgets_values || []);
    const aw = JSON.stringify(afterNode.widgets_values || []);
    if (bw !== aw) {
      changes.push('widget values changed');
    }

    const bLinks = (beforeNode.inputs || []).map((i) => i.link).sort();
    const aLinks = (afterNode.inputs || []).map((i) => i.link).sort();
    if (JSON.stringify(bLinks) !== JSON.stringify(aLinks)) {
      changes.push('connections changed');
    }

    if (changes.length > 0) {
      nodesModified.push({ id: afterNode.id, type: afterNode.type, changes });
    }
  }

  const beforeLinkIds = new Set(before.links.map((l) => l[0]));
  const afterLinkIds = new Set(after.links.map((l) => l[0]));
  const linksAdded = after.links.filter((l) => !beforeLinkIds.has(l[0])).length;
  const linksRemoved = before.links.filter((l) => !afterLinkIds.has(l[0])).length;

  const parts: string[] = [];
  if (nodesAdded.length > 0) parts.push(`+${nodesAdded.length} node(s)`);
  if (nodesRemoved.length > 0) parts.push(`-${nodesRemoved.length} node(s)`);
  if (nodesModified.length > 0) parts.push(`~${nodesModified.length} modified`);
  if (linksAdded > 0) parts.push(`+${linksAdded} link(s)`);
  if (linksRemoved > 0) parts.push(`-${linksRemoved} link(s)`);
  const summary = parts.length > 0 ? `Changes: ${parts.join(', ')}` : 'No changes detected';

  return { nodesAdded, nodesRemoved, nodesModified, linksAdded, linksRemoved, summary };
}

export function formatDiffMarkdown(diff: WorkflowDiff): string {
  const lines: string[] = [`**${diff.summary}**`];

  if (diff.nodesAdded.length > 0) {
    lines.push('');
    lines.push('**Added:**');
    for (const n of diff.nodesAdded) {
      lines.push(`- Node #${n.id} (${n.type})`);
    }
  }

  if (diff.nodesRemoved.length > 0) {
    lines.push('');
    lines.push('**Removed:**');
    for (const n of diff.nodesRemoved) {
      lines.push(`- Node #${n.id} (${n.type})`);
    }
  }

  if (diff.nodesModified.length > 0) {
    lines.push('');
    lines.push('**Modified:**');
    for (const n of diff.nodesModified) {
      lines.push(`- Node #${n.id} (${n.type}): ${n.changes.join(', ')}`);
    }
  }

  if (diff.linksAdded > 0 || diff.linksRemoved > 0) {
    lines.push('');
    lines.push(`**Connections:** +${diff.linksAdded} added, -${diff.linksRemoved} removed`);
  }

  return lines.join('\n');
}

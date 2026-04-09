/**
 * Workflow Diff
 * Compares two ComfyUI workflows and produces a structured diff.
 */

import type { ComfyUIWorkflow } from '../types/comfyui';

export interface WorkflowDiff {
  addedNodes: Array<{ id: number; type: string; title: string }>;
  removedNodes: Array<{ id: number; type: string; title: string }>;
  modifiedNodes: Array<{
    id: number;
    type: string;
    title: string;
    changes: string[];
  }>;
  addedConnections: number;
  removedConnections: number;
  summary: string;
}

function linkKey(link: ComfyUIWorkflow['links'][number]): string {
  return `${link[1]}-${link[2]}-${link[3]}-${link[4]}`;
}

export function diffWorkflows(
  oldWorkflow: ComfyUIWorkflow,
  newWorkflow: ComfyUIWorkflow,
): WorkflowDiff {
  const oldNodes = new Map((oldWorkflow.nodes || []).map((node) => [node.id, node]));
  const newNodes = new Map((newWorkflow.nodes || []).map((node) => [node.id, node]));

  const addedNodes: WorkflowDiff['addedNodes'] = [];
  const removedNodes: WorkflowDiff['removedNodes'] = [];
  const modifiedNodes: WorkflowDiff['modifiedNodes'] = [];

  for (const [id, nextNode] of newNodes) {
    const previousNode = oldNodes.get(id);
    if (!previousNode) {
      addedNodes.push({
        id,
        type: nextNode.type,
        title: nextNode.title || nextNode.type,
      });
      continue;
    }

    const changes: string[] = [];
    if (previousNode.type !== nextNode.type) {
      changes.push(`type changed: ${previousNode.type} -> ${nextNode.type}`);
    }

    const oldWidgets = JSON.stringify(previousNode.widgets_values || []);
    const newWidgets = JSON.stringify(nextNode.widgets_values || []);
    if (oldWidgets !== newWidgets) {
      changes.push('widget values changed');
    }

    if (changes.length > 0) {
      modifiedNodes.push({
        id,
        type: nextNode.type,
        title: nextNode.title || nextNode.type,
        changes,
      });
    }
  }

  for (const [id, previousNode] of oldNodes) {
    if (!newNodes.has(id)) {
      removedNodes.push({
        id,
        type: previousNode.type,
        title: previousNode.title || previousNode.type,
      });
    }
  }

  const oldLinkSet = new Set((oldWorkflow.links || []).map((link) => linkKey(link)));
  const newLinkSet = new Set((newWorkflow.links || []).map((link) => linkKey(link)));

  let addedConnections = 0;
  let removedConnections = 0;

  for (const item of newLinkSet) {
    if (!oldLinkSet.has(item)) addedConnections += 1;
  }
  for (const item of oldLinkSet) {
    if (!newLinkSet.has(item)) removedConnections += 1;
  }

  const summaryParts: string[] = [];
  if (addedNodes.length > 0) summaryParts.push(`Added ${addedNodes.length} node${addedNodes.length === 1 ? '' : 's'}`);
  if (removedNodes.length > 0) summaryParts.push(`Removed ${removedNodes.length} node${removedNodes.length === 1 ? '' : 's'}`);
  if (modifiedNodes.length > 0) summaryParts.push(`Modified ${modifiedNodes.length} node${modifiedNodes.length === 1 ? '' : 's'}`);
  if (addedConnections > 0) summaryParts.push(`${addedConnections} new connection${addedConnections === 1 ? '' : 's'}`);
  if (removedConnections > 0) summaryParts.push(`${removedConnections} removed connection${removedConnections === 1 ? '' : 's'}`);

  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedConnections,
    removedConnections,
    summary: summaryParts.length > 0 ? `${summaryParts.join('. ')}.` : 'No structural changes detected.',
  };
}

export function formatDiffMarkdown(diff: WorkflowDiff): string {
  const lines: string[] = ['**Workflow Modified:**', ''];

  if (diff.addedNodes.length > 0) {
    lines.push(`- Added nodes: ${diff.addedNodes.map((node) => `${node.title} (${node.type})`).join(', ')}`);
  }
  if (diff.removedNodes.length > 0) {
    lines.push(`- Removed nodes: ${diff.removedNodes.map((node) => `${node.title} (${node.type})`).join(', ')}`);
  }
  if (diff.modifiedNodes.length > 0) {
    lines.push(`- Modified nodes: ${diff.modifiedNodes.map((node) => `${node.title} (#${node.id})`).join(', ')}`);
  }
  if (diff.addedConnections > 0 || diff.removedConnections > 0) {
    lines.push(`- Connections: +${diff.addedConnections} / -${diff.removedConnections}`);
  }

  lines.push('');
  lines.push(`*${diff.summary}*`);
  lines.push('');
  lines.push('Check the **Requirements** panel for any new packs or models needed.');

  return lines.join('\n');
}


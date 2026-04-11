import type { ComfyUIWorkflow } from '../types/comfyui';

function summarizeWidgets(values: unknown[] | undefined): string {
  if (!Array.isArray(values) || values.length === 0) return '[]';
  return JSON.stringify(values.slice(0, 5));
}

function listUniqueNodeTypes(workflow: ComfyUIWorkflow): string {
  const unique = [...new Set(workflow.nodes.map((node) => node.type))].sort((a, b) => a.localeCompare(b));
  return unique.join(', ');
}

function buildNodeListing(workflow: ComfyUIWorkflow): string {
  if (!workflow.nodes.length) return '- (no nodes)';
  return workflow.nodes
    .map((node) => {
      const title = node.title ? `"${node.title}"` : `"${node.type}"`;
      const widgets = summarizeWidgets(node.widgets_values);
      return `- Node #${node.id} (${node.type}): ${title} ${widgets}`;
    })
    .join('\n');
}

export function buildModifySystemPrompt(
  currentWorkflow: ComfyUIWorkflow,
  packsSection: string,
): string {
  const nodeCount = currentWorkflow.nodes.length;
  const linkCount = currentWorkflow.links.length;
  const uniqueNodeTypes = listUniqueNodeTypes(currentWorkflow);
  const nodeListing = buildNodeListing(currentWorkflow);
  const workflowJson = JSON.stringify(currentWorkflow, null, 2);

  return `You are a ComfyUI workflow modification expert. The user has an existing workflow loaded and wants to make specific changes.

## Workflow Summary
- Node count: ${nodeCount}
- Link count: ${linkCount}
- Unique node types: ${uniqueNodeTypes || '(none)'}
- last_node_id: ${currentWorkflow.last_node_id}
- last_link_id: ${currentWorkflow.last_link_id}

### Compact Node Listing
${nodeListing}

## Full Workflow JSON
\`\`\`json
${workflowJson}
\`\`\`

${packsSection ? `## Custom Node Pack Context\n${packsSection}\n` : ''}## Modification Rules (Critical)
1. Return the COMPLETE modified workflow in a \`\`\`json:workflow block.
2. Preserve all existing nodes and links not affected by the requested change.
3. New node IDs must start from last_node_id + 1 and increment sequentially.
4. New link IDs must start from last_link_id + 1 and increment sequentially.
5. Position newly added nodes near their related nodes in the graph.
6. Before the JSON block, output a compact change summary using ONLY this format (no prose paragraphs):
   **Added:** `NodeType` #ID — reason
   **Modified:** `NodeType` #ID — param: old → new (reason)
   **Removed:** `NodeType` #ID — reason
   **Rewired:** `NodeType` #A → `NodeType` #B — reason
7. Use real model filenames when available.
8. Validate connection type compatibility for every new or modified link.

## Response Discipline
- **No preamble.** Skip openers like "Sure!", "Of course!", "I've updated the workflow..." — go straight to the change summary.
- **Change summary = bullet list only.** One line per change. No elaboration unless the user asks.
- **Assume expert.** Don't explain what a LoRA is, how KSampler works, or what connections do.

## Common Modification Patterns
- Add ControlNet: ControlNetLoader + ControlNetApplyAdvanced
- Add LoRA: LoraLoader between CheckpointLoader and downstream consumers
- Change sampler: modify widgets_values on KSampler
- Add upscaling: UpscaleModelLoader + ImageUpscaleWithModel after VAEDecode
- Switch checkpoint: change ckpt_name widget on CheckpointLoaderSimple

Be surgical. Change only what was asked. Lead with the bullet summary, then the JSON.`;
}

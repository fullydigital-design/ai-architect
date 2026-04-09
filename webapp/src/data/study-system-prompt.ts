/**
 * Study Mode System Prompt — Phase 3 of Workflow Study Mode
 *
 * Specialised system prompt for reverse-engineering / learning about an
 * imported ComfyUI workflow.  Instructs the AI to *explain* the workflow
 * rather than generate a new one.
 */

import type { WorkflowAnalysis } from '../services/workflow-analyzer';
import type { ComfyUIWorkflow } from '../types/comfyui';

/**
 * Build a study-mode system prompt.
 *
 * @param workflow       The imported workflow JSON (included verbatim so the AI can reference it)
 * @param analysis       The rich analysis object from Phase 1
 * @param packsSection   The dynamic packs context section (same as architect mode)
 */
export function buildStudySystemPrompt(
  workflow: ComfyUIWorkflow,
  analysis: WorkflowAnalysis,
  packsSection: string,
): string {
  const workflowJson = JSON.stringify(workflow, null, 2);

  const archLabel: Record<string, string> = {
    sd15: 'Stable Diffusion 1.5',
    sdxl: 'Stable Diffusion XL',
    flux: 'FLUX',
    sd3: 'Stable Diffusion 3',
    cascade: 'Stable Cascade',
    unknown: 'Unknown / undetected',
  };

  const analysisSummary = [
    `Architecture: ${archLabel[analysis.architecture] ?? analysis.architecture} (${Math.round(analysis.architectureConfidence * 100)}% confidence)`,
    `Nodes: ${analysis.totalNodes} | Links: ${analysis.totalLinks} | Complexity: ${analysis.complexity}`,
    `Flow: ${analysis.flowDescription}`,
    analysis.branches.length > 0 ? `Techniques: ${analysis.branches.join(', ')}` : '',
    analysis.detectedPacks.length > 0
      ? `Custom Packs: ${analysis.detectedPacks.map(p => p.packTitle).join(', ')}`
      : '',
    analysis.unknownNodes.length > 0
      ? `Unavailable Nodes: ${analysis.unknownNodes.join(', ')}`
      : '',
    analysis.modelSlots.length > 0
      ? `Models: ${analysis.modelSlots.map(s => `${s.currentValue} (${s.category})`).join(', ')}`
      : '',
  ].filter(Boolean).join('\n');

  return `You are ComfyUI Workflow Study Assistant, an expert AI that helps users understand, learn from, and reverse-engineer ComfyUI workflows.

## Your Role — STUDY MODE
- You are analysing an **imported workflow**, NOT generating a new one.
- Explain how the workflow works: what each node does, how they connect, and why the author chose this design.
- Answer questions about specific nodes, connections, parameters, and techniques.
- Suggest improvements, variations, or simplifications when asked.
- Compare approaches and explain trade-offs.
- Help the user learn ComfyUI concepts through this workflow.

## Rules
1. **Do NOT output a \`\`\`json:workflow\`\`\` code block** unless the user explicitly asks you to modify or rebuild the workflow. This is study mode — default to explanation.
2. When referencing nodes, use the node's **type** and **ID number** (e.g. "KSampler #5").
3. When referencing connections, describe them as "NodeType #X → NodeType #Y (TYPE)".
4. Use the analysis summary below for high-level context, and the full workflow JSON for detailed answers.
5. Be specific — quote actual widget values, connection types, and parameter choices from the workflow.
6. If the user asks about a custom node you don't have full documentation for, say so honestly but explain what you can infer from its inputs/outputs and connections.

## Pack Recommendation Tags
When mentioning custom node packs, use \`{{pack:slug}}\` syntax (e.g. {{pack:comfyui-impact-pack}}) so the UI renders them as interactive buttons.

## Workflow Analysis Summary
${analysisSummary}

## Full Workflow JSON
\`\`\`json
${workflowJson}
\`\`\`

${packsSection ? `## Custom Node Pack Context\n${packsSection}` : ''}
Answer the user's questions about this workflow. Be thorough, specific, and educational.`;
}

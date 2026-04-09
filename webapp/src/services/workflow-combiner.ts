import type { WorkflowTemplate } from '../types/comfyui';
import { buildTemplateSummary } from './workflow-library';

/**
 * Build the AI prompt for combining multiple workflows.
 * Includes summary context plus compact workflow JSON blocks.
 */
export function buildCombinePrompt(templates: WorkflowTemplate[]): string {
  const parts: string[] = [];

  parts.push(`## Workflow Combination Request

You are combining ${templates.length} saved workflows into a single unified pipeline. Study each workflow architecture, then merge them into one coherent workflow.

### Source Workflows
`);

  for (let i = 0; i < templates.length; i += 1) {
    const template = templates[i];
    const letter = String.fromCharCode(65 + i); // A, B, C...

    parts.push(`#### Workflow ${letter}: "${template.name}" [${template.category}]`);
    parts.push('');
    parts.push(buildTemplateSummary(template));
    parts.push('');
    parts.push(`<workflow_${letter}_json>`);
    parts.push('```json');
    parts.push(JSON.stringify(template.workflow));
    parts.push('```');
    parts.push(`</workflow_${letter}_json>`);
    parts.push('');
  }

  const hasFragments = templates.some((template) => template.isFragment);
  if (hasFragments) {
    parts.push(`### Fragment Integration Notes

Some selected items are **fragments** (partial pipelines). When integrating:
- Fragments may have open inputs that expect upstream connections.
- Fragments may have open outputs that should feed downstream stages.
- Connect fragment inputs/outputs to the most appropriate full-workflow stages.
- If fragment type is "conditioning", insert into conditioning path before sampling.
- If fragment type is "upscaling", append after generation decode output.
- If fragment type is "postprocess", append after generation/upscaling output.`);
    parts.push('');
  }

  parts.push(`### Combination Rules

1. **Chain the pipelines:** Connect Workflow A output to Workflow B input, B to C, etc. Final workflow must end with final SaveImage/PreviewImage.
2. **Reuse shared resources:** If multiple workflows use equivalent loaders (same class_type and same model filename), merge into one loader and fan out.
3. **Deconflict node IDs:** All node IDs must be unique. Renumber sequentially from 1 while preserving relative flow order.
4. **Deconflict link IDs:** All link IDs must be unique and sequential.
5. **Remove duplicates:** If nodes are identical (same type + same widget values), keep one and reconnect.
6. **Resolve type bridges:** If output/input types mismatch during chaining, add required bridge nodes (for example VAEEncode IMAGE->LATENT).
7. **Layout:** Position nodes left-to-right by data flow. Use ~300px horizontal spacing and vertical stacks for side branches.
8. **Preserve settings:** Keep original widget values/settings unless a direct conflict forces a minimal adjustment.

### Output

Generate the combined workflow using the standard response format:
- \`json:workflow-api\` code block with merged workflow JSON
- Full Pipeline Summary
- Why This Architecture Wins
- Tuning Tips
- Required Models`);

  return parts.join('\n');
}

/**
 * Rough token estimate for combining templates.
 */
export function estimateCombineTokens(templates: WorkflowTemplate[]): number {
  let total = 500; // base overhead
  for (const template of templates) {
    total += 300 + (template.workflow.nodes.length * 150);
  }
  return total;
}

/**
 * Validate combine input before sending to AI.
 */
export function validateCombination(templates: WorkflowTemplate[]): string | null {
  if (templates.length < 2) return 'Select at least 2 workflows to combine';
  if (templates.length > 4) return 'Maximum 4 workflows can be combined at once (token budget).';

  const totalNodes = templates.reduce((sum, template) => sum + template.workflow.nodes.length, 0);
  if (totalNodes > 100) {
    return `Combined node count (${totalNodes}) is high. Consider combining smaller workflows or fragments.`;
  }

  return null;
}

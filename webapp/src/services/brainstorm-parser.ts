import { getLiveNodeSchema } from './comfyui-backend';

export interface RecommendedNode {
  class_type: string;
  display_name: string;
  pack: string;
  role: string;
}

export interface WorkflowRecommendation {
  workflow_title: string;
  workflow_summary: string;
  nodes: RecommendedNode[];
}

/**
 * Build a hidden extraction prompt for brainstorming -> node recommendation.
 */
export function buildNodeExtractionPrompt(): string {
  return `Based on our entire conversation above, extract the complete list of ComfyUI nodes needed to build this workflow.

You MUST respond with ONLY a JSON block in this exact format - no other text, no explanation, no markdown outside the block:

\`\`\`json:recommended-nodes
{
  "workflow_title": "Short descriptive title for the workflow",
  "workflow_summary": "1-2 sentence summary of what the workflow does",
  "nodes": [
    {
      "class_type": "ExactClassName",
      "display_name": "Human Readable Name",
      "pack": "Pack Name",
      "role": "Why this node is needed (1 short sentence)"
    }
  ]
}
\`\`\`

Rules:
- Use EXACT class_type names from the installed node list (case-sensitive)
- Include ALL nodes needed for a complete, working workflow
- Order: loaders -> processing -> conditioning -> sampling -> post-processing -> output
- Include utility nodes (save, preview, etc.)
- One "role" sentence per node explaining its purpose in THIS workflow`;
}

/**
 * Extract json:recommended-nodes block from an AI brainstorm response.
 * Returns null when the block is missing or invalid.
 */
export function parseRecommendedNodes(aiResponse: string): WorkflowRecommendation | null {
  const pattern = /```json:recommended-nodes\s*\r?\n([\s\S]*?)```/i;
  const match = aiResponse.match(pattern);
  if (!match) {
    // Fallback: try raw JSON bodies that contain a nodes array.
    const fallbackPattern = /\{[\s\S]*"nodes"\s*:\s*\[[\s\S]*\][\s\S]*\}/i;
    const fallbackMatch = aiResponse.match(fallbackPattern);
    if (!fallbackMatch) return null;
    try {
      const fallbackParsed = JSON.parse(fallbackMatch[0].trim()) as unknown;
      return validateAndNormalizeRecommendation(fallbackParsed);
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(match[1].trim()) as unknown;
    return validateAndNormalizeRecommendation(parsed);
  } catch (error) {
    console.warn('[BrainstormParser] Failed to parse recommended-nodes JSON:', error);
    return null;
  }
}

function validateAndNormalizeRecommendation(parsed: unknown): WorkflowRecommendation | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const source = parsed as {
    workflow_title?: unknown;
    workflow_summary?: unknown;
    nodes?: unknown;
  };

  if (!Array.isArray(source.nodes) || source.nodes.length === 0) {
    console.warn('[BrainstormParser] recommended-nodes block has no nodes');
    return null;
  }

  const validNodes = source.nodes
    .filter((node): node is Record<string, unknown> => typeof node === 'object' && node !== null)
    .filter((node) => typeof node.class_type === 'string' && node.class_type.trim().length > 0)
    .map((node) => ({
      class_type: String(node.class_type).trim(),
      display_name: typeof node.display_name === 'string' && node.display_name.trim().length > 0
        ? node.display_name.trim()
        : String(node.class_type).trim(),
      pack: typeof node.pack === 'string' && node.pack.trim().length > 0
        ? node.pack.trim()
        : 'Unknown',
      role: typeof node.role === 'string' ? node.role.trim() : '',
    }));

  if (validNodes.length === 0) {
    console.warn('[BrainstormParser] No valid nodes in recommendation block');
    return null;
  }

  const workflowTitle = typeof source.workflow_title === 'string' && source.workflow_title.trim().length > 0
    ? source.workflow_title.trim()
    : 'Untitled Workflow';
  const workflowSummary = typeof source.workflow_summary === 'string'
    ? source.workflow_summary.trim()
    : '';

  console.log(`[BrainstormParser] Parsed ${validNodes.length} recommended nodes for "${workflowTitle}"`);

  return {
    workflow_title: workflowTitle,
    workflow_summary: workflowSummary,
    nodes: validNodes,
  };
}

/**
 * Strip json:recommended-nodes blocks from visible chat text.
 */
export function stripRecommendationBlock(aiResponse: string): string {
  return aiResponse
    .replace(/```json:recommended-nodes\s*\r?\n[\s\S]*?```/gi, '')
    .trim();
}

/**
 * Mark each recommended node as available/unavailable against live schema cache.
 * If a node map is provided, it is used as the source of truth.
 */
export function validateRecommendedNodes(
  nodes: RecommendedNode[],
  liveNodeMap?: Map<string, unknown>,
): Array<RecommendedNode & { available: boolean }> {
  return nodes.map((node) => ({
    ...node,
    available: liveNodeMap
      ? liveNodeMap.has(node.class_type)
      : Boolean(getLiveNodeSchema(node.class_type)),
  }));
}

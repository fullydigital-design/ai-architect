/**
 * Phase 11C - Mode detection helpers.
 */

export type WorkflowRequestMode = 'create' | 'modify';

/**
 * Detect whether a user request should modify an existing workflow
 * or create a brand-new one.
 */
export function detectRequestMode(
  userMessage: string,
  hasExistingWorkflow: boolean,
): WorkflowRequestMode {
  if (!hasExistingWorkflow) return 'create';

  const text = userMessage.toLowerCase();

  const createSignals = /\b(create|build|generate|new workflow|from scratch|start fresh|blank workflow)\b/i;
  const modifySignals = /\b(add|change|replace|remove|swap|increase|decrease|set|update|modify|adjust|tweak|fix|insert|delete|bypass|connect|disconnect|move|switch|upscale|lora|controlnet|before|after|between|node #\d+)\b/i;

  if (createSignals.test(text)) return 'create';
  if (modifySignals.test(text)) return 'modify';

  return 'modify';
}


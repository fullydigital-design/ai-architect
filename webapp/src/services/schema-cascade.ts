import { logger } from '@/utils/logger';
import {
  formatLiveNodeForPrompt,
  formatLiveNodeForPromptFull,
  getLiveNodeCache,
  type LiveNodeSchema,
} from './comfyui-backend';

/**
 * "Schema cascade" protocol.
 *
 * When the system prompt only exposes node *names* (cheap), the assistant can
 * ask the app for full schemas before producing a workflow or detailed plan.
 *
 * The assistant emits a marker on a line by itself:
 *
 *   <NEED_SCHEMAS>NodeA, NodeB, NodeC</NEED_SCHEMAS>
 *
 * The app parses the request, resolves each name against the live cache, and
 * follows up with a single synthetic user message containing the full schemas.
 * The assistant then continues with its real answer.
 *
 * One cascade round per turn is enough for the workflows we generate; deeper
 * recursion just inflates context for diminishing accuracy.
 */

export const NEED_SCHEMAS_OPEN = '<NEED_SCHEMAS>';
export const NEED_SCHEMAS_CLOSE = '</NEED_SCHEMAS>';
const MAX_REQUESTED_NODES = 20;
const NODE_LIST_RE = new RegExp(`${NEED_SCHEMAS_OPEN}([\\s\\S]*?)${NEED_SCHEMAS_CLOSE}`, 'i');

export interface CascadeRequest {
  /** Node class_types the assistant requested, deduplicated and trimmed. */
  requested: string[];
  /** Substring of the assistant message that contained the request, for stripping. */
  rawBlock: string;
}

/**
 * Locate a `<NEED_SCHEMAS>...</NEED_SCHEMAS>` block in the assistant's reply
 * and return the parsed node list. Returns `null` if no marker is present.
 */
export function parseSchemaCascadeRequest(text: string): CascadeRequest | null {
  if (!text) return null;
  const match = text.match(NODE_LIST_RE);
  if (!match) return null;
  const inner = match[1] || '';
  const requested = [
    ...new Set(
      inner
        .split(/[\s,;\n]+/)
        .map((token) => token.trim().replace(/^["']|["']$/g, ''))
        .filter((token) => token.length > 0),
    ),
  ].slice(0, MAX_REQUESTED_NODES);
  if (requested.length === 0) return null;
  return { requested, rawBlock: match[0] };
}

/** Remove the marker block from the assistant's text. */
export function stripSchemaCascadeMarker(text: string): string {
  return text.replace(NODE_LIST_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

export interface ResolvedSchemas {
  found: LiveNodeSchema[];
  missing: string[];
}

/**
 * Resolve a list of class_types against the live node cache. Names that don't
 * match are returned in `missing` so the follow-up can tell the assistant.
 */
export function resolveLiveSchemas(classTypes: string[]): ResolvedSchemas {
  const cache = getLiveNodeCache();
  if (!cache) {
    return { found: [], missing: [...classTypes] };
  }
  const found: LiveNodeSchema[] = [];
  const missing: string[] = [];
  for (const classType of classTypes) {
    const schema = cache.nodes[classType];
    if (schema) found.push(schema);
    else missing.push(classType);
  }
  return { found, missing };
}

/**
 * Build the synthetic follow-up user message that ships the requested schemas
 * back to the assistant. Uses the full-fat serializer because the assistant
 * specifically asked for these details.
 */
export function buildSchemaCascadeReply(resolved: ResolvedSchemas): string {
  const lines: string[] = [];
  lines.push('[Cascade] Full schemas for the nodes you requested:');
  lines.push('');
  if (resolved.found.length === 0) {
    lines.push('_No matching nodes found in the live cache._');
  } else {
    for (const schema of resolved.found) {
      lines.push(formatLiveNodeForPromptFull(schema).trimEnd());
      lines.push('');
    }
  }
  if (resolved.missing.length > 0) {
    lines.push(`Not found (unknown class_types — double-check spelling or pack availability): ${resolved.missing.join(', ')}`);
    lines.push('');
  }
  lines.push('Now continue with the original task. If you need more schemas, request them in another '
    + `${NEED_SCHEMAS_OPEN} block.`);
  return lines.join('\n');
}

/**
 * Compact preview used in the chat panel after the assistant emitted a
 * cascade marker — purely cosmetic, never sent to the model.
 */
export function describeCascade(resolved: ResolvedSchemas): string {
  const totalFound = resolved.found.length;
  const totalMissing = resolved.missing.length;
  if (totalFound === 0) {
    return `Schema cascade: 0 nodes resolved (${totalMissing} unknown).`;
  }
  if (totalMissing === 0) {
    return `Schema cascade: fetched full schemas for ${totalFound} node${totalFound === 1 ? '' : 's'}.`;
  }
  return `Schema cascade: fetched ${totalFound} schema${totalFound === 1 ? '' : 's'} (${totalMissing} unknown).`;
}

/**
 * Instruction block injected into the brainstorm system prompt so the model
 * knows the protocol exists. Only shown when schema mode is 'names'.
 */
export function buildCascadeInstructions(): string {
  return `\n## Schema Cascade (names-only mode)\n\n`
    + `The "Live Node Schemas" section above lists only the **names** of installed nodes — not their inputs, outputs, or widgets. This keeps the prompt cheap so we can have a long conversation.\n\n`
    + `When you need the inputs/outputs/widgets of specific nodes to plan a workflow precisely or answer a detailed question, request them with this exact marker on a line by itself:\n\n`
    + `${NEED_SCHEMAS_OPEN}NodeName1, NodeName2, NodeName3${NEED_SCHEMAS_CLOSE}\n\n`
    + `Rules:\n`
    + `- Use exact class_type names from the names list above.\n`
    + `- Request only what you'll actually use — at most ${MAX_REQUESTED_NODES} nodes per cascade.\n`
    + `- Put the marker on its own line with nothing else around it. The app strips it before showing your reply.\n`
    + `- After you send the marker, the app responds with a "[Cascade]" follow-up message containing the full schemas. Continue your task once you receive it.\n`
    + `- If you do **not** need detailed schemas (e.g. for a high-level conversation or a recommendation), skip the cascade — just answer.\n`;
}

/**
 * Drop-in debug log so we can trace cascade activity without poking the user.
 */
export function logCascadeResolution(resolved: ResolvedSchemas): void {
  logger.log(`[Cascade] resolved ${resolved.found.length} / missing ${resolved.missing.length}`);
}

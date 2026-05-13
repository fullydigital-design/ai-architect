import { logger } from '@/utils/logger';
import type { ComfyUIWorkflow } from '../types/comfyui';
import {
  formatLiveNodeForPromptFull,
  getLiveNodeCache,
  type LiveNodeSchema,
} from './comfyui-backend';
import type { ClassifiedPack } from './node-schema-selector';

/**
 * Pack-name hints used to identify which custom-node pack the user wants
 * to swap to. Keyed by the canonical pack-id slug; values are substrings
 * that, when present in the user's prompt, identify the target pack.
 *
 * The slug should match the `id` produced by `classifyNodesIntoPacks` so
 * we can look up the pack's nodes in `ClassifiedPack[]`.
 */
const PACK_HINT_TABLE: Array<{ packIdContains: string; promptHints: string[] }> = [
  { packIdContains: 'swarm',          promptHints: ['swarm', 'swarmui', 'swarm ui'] },
  { packIdContains: 'kjnodes',        promptHints: ['kjnode', 'kj-nodes', 'kj nodes'] },
  { packIdContains: 'impact',         promptHints: ['impact pack', 'impact-pack', 'impactpack'] },
  { packIdContains: 'easy-use',       promptHints: ['easyuse', 'easy use', 'easy-use'] },
  { packIdContains: 'rgthree',        promptHints: ['rgthree'] },
  { packIdContains: 'comfyroll',      promptHints: ['comfyroll'] },
  { packIdContains: 'inspire',        promptHints: ['inspire pack', 'inspire-pack', 'inspirepack'] },
  { packIdContains: 'was-node',       promptHints: ['was suite', 'was-node', 'was node'] },
  { packIdContains: 'efficiency',     promptHints: ['efficiency nodes', 'efficiency-nodes'] },
  { packIdContains: 'tinyterra',      promptHints: ['tinyterra', 'ttn'] },
  { packIdContains: 'animatediff',    promptHints: ['animatediff'] },
  { packIdContains: 'ipadapter',      promptHints: ['ipadapter'] },
  { packIdContains: 'florence',       promptHints: ['florence'] },
  { packIdContains: 'gguf',           promptHints: ['gguf'] },
  { packIdContains: 'controlnet-aux', promptHints: ['controlnet aux', 'controlnet-aux'] },
  { packIdContains: 'mtb',            promptHints: ['mtb'] },
  { packIdContains: 'fizz',           promptHints: ['fizz', 'fizznodes'] },
  { packIdContains: 'crystools',      promptHints: ['crystools'] },
  { packIdContains: 'video',          promptHints: ['videohelper', 'video helper'] },
];

interface CandidateFinding {
  schemas: LiveNodeSchema[];
  packTitles: string[];
}

/**
 * Identify which pack(s) the user wants to swap to, based on prompt hints
 * matched against the classified packs available in the live cache.
 */
function identifyTargetPacks(userPrompt: string, packs: ClassifiedPack[]): ClassifiedPack[] {
  const text = userPrompt.toLowerCase();
  const hits: ClassifiedPack[] = [];
  const seen = new Set<string>();

  for (const row of PACK_HINT_TABLE) {
    if (!row.promptHints.some((hint) => text.includes(hint))) continue;
    for (const pack of packs) {
      if (seen.has(pack.id)) continue;
      if (pack.id.includes(row.packIdContains) || pack.title.toLowerCase().includes(row.packIdContains)) {
        hits.push(pack);
        seen.add(pack.id);
      }
    }
  }
  return hits;
}

/**
 * Strip a known pack prefix from a class_type so we can match a target
 * pack's node by the underlying role token. E.g. "SwarmKSampler" -> "KSampler",
 * "KJNodes_Audio_Loader" -> "Audio_Loader", "EasyUse_CheckpointLoader" ->
 * "CheckpointLoader".
 */
function stripPackPrefix(classType: string): string {
  return classType
    .replace(/^Swarm/i, '')
    .replace(/^KJ_?/i, '')
    .replace(/^EasyUse_?/i, '')
    .replace(/^ttN_?/i, '')
    .replace(/^Impact_?/i, '')
    .replace(/^CR_?/i, '')
    .replace(/^WAS_?/i, '');
}

/**
 * For each unique class_type in the current workflow, find candidate nodes
 * inside the target pack(s) that look like role-equivalent replacements.
 *
 * Matching heuristic: a candidate pack-node's class_type, when its own pack
 * prefix is stripped, must overlap with the current type's stripped form, or
 * the candidate must contain the current type as a substring.
 *
 * E.g. current "KSampler" matches target "SwarmKSampler" (substring); current
 * "CLIPTextEncode" matches "SwarmClipTextEncodeAdvanced" (case-insensitive
 * substring).
 */
export function findPackSwapCandidates(
  userPrompt: string,
  currentWorkflow: ComfyUIWorkflow | null,
  packs: ClassifiedPack[],
): CandidateFinding {
  if (!userPrompt || !currentWorkflow || packs.length === 0) {
    return { schemas: [], packTitles: [] };
  }
  const cache = getLiveNodeCache();
  if (!cache) return { schemas: [], packTitles: [] };

  const targets = identifyTargetPacks(userPrompt, packs);
  if (targets.length === 0) return { schemas: [], packTitles: [] };

  const currentTypes = [...new Set(
    (currentWorkflow.nodes || [])
      .map((n) => String(n.type || '').trim())
      .filter((t) => t.length > 0 && t !== 'Note'),
  )];

  const candidateNames = new Set<string>();
  for (const pack of targets) {
    for (const candidate of pack.nodeNames) {
      const candidateLower = candidate.toLowerCase();
      const candidateStripped = stripPackPrefix(candidate).toLowerCase();
      for (const current of currentTypes) {
        const currentLower = current.toLowerCase();
        const currentStripped = stripPackPrefix(current).toLowerCase();
        if (
          candidateLower.includes(currentLower)
          || currentLower.includes(candidateLower)
          || (candidateStripped.length > 2 && candidateStripped.includes(currentStripped))
          || (currentStripped.length > 2 && currentStripped.includes(candidateStripped))
        ) {
          candidateNames.add(candidate);
          break;
        }
      }
    }
  }

  if (candidateNames.size === 0) {
    logger.debug('[PackSwap] Target pack(s) identified but no role-matched candidates found', {
      targets: targets.map((p) => p.title),
      currentTypes,
    });
    return { schemas: [], packTitles: targets.map((p) => p.title) };
  }

  const schemas: LiveNodeSchema[] = [];
  for (const name of candidateNames) {
    const schema = cache.nodes[name];
    if (schema) schemas.push(schema);
  }
  // Sort for stable prompt output.
  schemas.sort((a, b) => a.class_type.localeCompare(b.class_type));

  return {
    schemas,
    packTitles: targets.map((p) => p.title),
  };
}

/**
 * Format the candidate schemas as a system-prompt section the modify prompt
 * can append. Uses the full schema serializer so the AI sees inputs/outputs
 * /widgets exactly as ComfyUI defines them — no guessing widget keys.
 */
export function buildPackSwapCandidateSection(finding: CandidateFinding): string {
  if (finding.schemas.length === 0) return '';
  const lines: string[] = [];
  lines.push('');
  lines.push('## REPLACEMENT-CANDIDATE SCHEMAS (pack swap requested)');
  lines.push('');
  lines.push(`You asked to swap to: ${finding.packTitles.join(', ')}.`);
  lines.push(`Here are the FULL schemas of ${finding.schemas.length} likely replacement nodes from those packs. When you replace a node's class_type, use the NEW class_type's widgets EXACTLY as defined below — do NOT carry over widget names from the original node (e.g. SwarmKSampler does NOT have \`denoise\`; it has \`start_at_step\`, \`end_at_step\`, \`rho\`, etc.).`);
  lines.push('');
  for (const schema of finding.schemas) {
    lines.push(formatLiveNodeForPromptFull(schema).trimEnd());
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Pack Suggester â€” determines which custom node packs are relevant for a
 * given user request, then builds a tiered prompt section for the AI.
 *
 * Schema resolution tiers:
 *   Tier 0: Live schemas from connected ComfyUI backend (/object_info)
 *   Tier 1: Curated hand-authored schemas (custom-node-schemas.ts)
 *   Tier 2: AI-learned schemas from GitHub source (schema-fetcher.ts)
 *   Tier 3: Fallback â€” node name list only
 *
 * Two modes:
 *   "my-packs"  â€” AI uses ONLY the user's pinned packs + core nodes
 *   "discover"  â€” AI uses capability index + keyword search against registry
 */

import type { PinnedNodePack, LibraryMode } from '../hooks/useNodeLibrary';
import { detectCapabilities, CAPABILITY_INDEX } from '../data/capability-index';
import { getKeyNodesForPack, formatPackSchemasForPrompt } from '../data/custom-node-schemas';
import type { PackKeyNodes } from '../data/custom-node-schemas';
import { getLearnedSchemas } from './schema-fetcher';
import {
  getCachedCustomRegistryPackSummaries,
  getLiveNodeCache,
  type LiveNodeSchema,
} from './comfyui-backend';

// ---- Types ------------------------------------------------------------------

export interface PackPromptInfo {
  title: string;
  description: string;
  nodeNames: string[];
  installCommand: string;
  isExpanded: boolean; // tier-2: node-level detail
}

// ---- Capability matching for pinned packs -----------------------------------

/**
 * Given user message + pinned packs, returns which pinned packs are relevant.
 * All pinned packs are included in tier-1 (summaries), but only relevant ones
 * get tier-2 (expanded node listings).
 */
function matchPinnedPacks(
  userMessage: string,
  pinnedPacks: PinnedNodePack[],
  forceExpandAll = false,
  forceExpandedPackIds: Set<string> = new Set(),
): PackPromptInfo[] {
  const capabilities = detectCapabilities(userMessage);
  const msg = userMessage.toLowerCase();

  // Collect pack IDs that match via capability index
  const relevantIds = new Set<string>();
  for (const cap of capabilities) {
    const entry = CAPABILITY_INDEX[cap];
    if (entry) {
      for (const packRef of entry.packs) {
        // Match against pack id (slug) or title
        for (const pp of pinnedPacks) {
          if (
            pp.id.includes(packRef) ||
            packRef.includes(pp.id) ||
            pp.title.toLowerCase().includes(packRef) ||
            packRef.includes(pp.title.toLowerCase().replace(/\s+/g, '-'))
          ) {
            relevantIds.add(pp.id);
          }
        }
      }
    }
  }

  // Also do a direct keyword match against pack titles / descriptions / node names
  for (const pp of pinnedPacks) {
    const combined = `${pp.title} ${pp.description} ${pp.nodeNames.join(' ')}`.toLowerCase();
    // Split user message into words and check if multiple match
    const words = msg.split(/\s+/).filter(w => w.length > 3);
    const matchCount = words.filter(w => combined.includes(w)).length;
    if (matchCount >= 2) {
      relevantIds.add(pp.id);
    }
  }

  return pinnedPacks.map(pp => ({
    title: pp.title,
    description: pp.description,
    nodeNames: pp.nodeNames,
    installCommand: pp.installCommand,
    isExpanded: forceExpandAll || relevantIds.has(pp.id) || forceExpandedPackIds.has(pp.id),
  }));
}

function normalizePackKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getInstalledButNotPinnedPacks(
  liveNodes: Record<string, LiveNodeSchema> | null,
  pinnedPacks: PinnedNodePack[],
): Array<{ id: string; title: string; nodeCount: number; selectedCount: number }> {
  if (!liveNodes) return [];
  const registryPacks = getCachedCustomRegistryPackSummaries();
  if (registryPacks.length === 0) return [];

  const pinnedIdSet = new Set(pinnedPacks.map((pack) => normalizePackKey(pack.id)));
  const pinnedTitleSet = new Set(pinnedPacks.map((pack) => normalizePackKey(pack.title)));
  const liveNodeNames = new Set(Object.keys(liveNodes));

  const results: Array<{ id: string; title: string; nodeCount: number; selectedCount: number }> = [];
  const seenTitles = new Set<string>();

  for (const pack of registryPacks) {
    const packId = normalizePackKey(pack.id);
    const packTitle = normalizePackKey(pack.title);
    if (pinnedIdSet.has(packId) || pinnedTitleSet.has(packTitle)) continue;
    const selectedCount = pack.nodeNames.filter((nodeName) => liveNodeNames.has(nodeName)).length;
    if (selectedCount <= 0) continue;
    if (seenTitles.has(packTitle)) continue;
    seenTitles.add(packTitle);
    results.push({
      id: pack.id,
      title: pack.title,
      nodeCount: pack.nodeNames.length,
      selectedCount,
    });
  }

  return results.sort((a, b) => a.title.localeCompare(b.title));
}

// ---- Build the prompt section -----------------------------------------------

/**
 * Builds a dynamic "Custom Node Packs" section for the system prompt.
 *
 * In "my-packs" mode, injects all pinned packs (tier-1 summaries) with
 * expanded node detail for the relevant ones (tier-2).
 *
 * In "discover" mode, returns empty string (the AI uses only core nodes
 * or you'd add registry-based discovery here later).
 */
export function buildPacksPromptSection(
  userMessage: string,
  pinnedPacks: PinnedNodePack[],
  mode: LibraryMode,
  liveNodesOverride?: Record<string, LiveNodeSchema> | null,
  workflowNodeTypes: string[] = [],
): string {
  // Check for live node cache (Tier 0)
  const liveCache = getLiveNodeCache();
  // Respect explicit override maps, including empty objects (used by selector "off"/deselect states).
  const hasLiveOverride = liveNodesOverride !== undefined && liveNodesOverride !== null;
  const liveNodes = hasLiveOverride
    ? liveNodesOverride
    : (liveCache?.nodes || null);
  const liveNodeCount = liveNodes ? Object.keys(liveNodes).length : 0;
  const installedNotPinnedPacks = getInstalledButNotPinnedPacks(liveNodes, pinnedPacks);

  // Schema Drawer path: live schemas are injected elsewhere, so keep this section compact.
  if (hasLiveOverride) {
    if (!liveNodes || liveNodeCount === 0) return '';

    const selectedNodeNames = new Set(Object.keys(liveNodes));
    const selectedPinned = pinnedPacks
      .map((pack) => ({
        title: pack.title,
        selectedCount: pack.nodeNames.filter((nodeName) => selectedNodeNames.has(nodeName)).length,
      }))
      .filter((pack) => pack.selectedCount > 0);

    const selectedInstalledNotPinned = installedNotPinnedPacks
      .map((pack) => ({
        title: pack.title,
        selectedCount: pack.selectedCount,
      }))
      .filter((pack) => pack.selectedCount > 0);

    const totalSelectedPacks = selectedPinned.length + selectedInstalledNotPinned.length;
    if (totalSelectedPacks === 0) return '';

    let section = `\n## Installed Node Packs (${totalSelectedPacks})\n`;
    section += 'Detailed node schemas are provided in the Schema Drawer section.\n';
    section += 'Do NOT tell the user to install these packs.\n\n';
    section += '### Loaded Pack Inventory\n';
    for (const pack of selectedPinned) {
      section += `- **${pack.title}** (${pack.selectedCount} selected nodes)\n`;
    }
    for (const pack of selectedInstalledNotPinned) {
      section += `- **${pack.title}** (${pack.selectedCount} selected nodes)\n`;
    }
    return section;
  }

  if (pinnedPacks.length === 0 && mode === 'my-packs' && !liveNodes) {
    return `\n## User's Custom Node Packs\n\nNo custom node packs pinned. Use only core ComfyUI nodes. If the user's request would benefit from a custom node pack, explain what they need and suggest they pin it via the "My Packs" panel.\n`;
  }

  if (pinnedPacks.length === 0 && !liveNodes) {
    return ''; // discover mode with no packs â€” no extra context
  }

  if (pinnedPacks.length === 0 && installedNotPinnedPacks.length === 0) {
    return '';
  }

  const forceExpandAll = !!liveNodes;
  const workflowTypeSet = new Set(
    workflowNodeTypes
      .map((type) => String(type || '').trim())
      .filter((type) => type.length > 0),
  );
  const forceExpandedPackIds = new Set<string>();
  if (workflowTypeSet.size > 0) {
    for (const pack of pinnedPacks) {
      if (pack.nodeNames.some((nodeName) => workflowTypeSet.has(nodeName))) {
        forceExpandedPackIds.add(pack.id);
      }
    }
  }
  const packInfos = matchPinnedPacks(userMessage, pinnedPacks, forceExpandAll, forceExpandedPackIds);
  const expandedCount = packInfos.filter(p => p.isExpanded).length;
  const installedCount = liveNodes
    ? (pinnedPacks.length + installedNotPinnedPacks.length)
    : pinnedPacks.length;

  let section = `\n## User's Custom Node Packs (${installedCount} installed)`;
  if (liveNodes) {
    section += ` [Live-synced from ComfyUI - ${liveNodeCount} selected nodes available]`;
  }
  section += '\n\n';

  if (liveNodes) {
    section += `Live schemas are already listed in "Available Node Types". Use this section only as installed-pack inventory.\n\n`;
    section += `### Installed Packs\n`;
    if (packInfos.length === 0) {
      section += '- (none pinned)\n';
    } else {
      for (const info of packInfos) {
        section += `- **${info.title}** (${info.nodeNames.length} nodes)\n`;
      }
    }
    if (installedNotPinnedPacks.length > 0) {
      section += `\n### Also Installed (not pinned - available but no detailed schemas in context)\n`;
      for (const pack of installedNotPinnedPacks) {
        section += `- **${pack.title}** (${pack.nodeCount} nodes)\n`;
      }
      section += '\nThese packs are installed and working. You may use their nodes. Do NOT tell the user to install them.\n';
    }
    return section;
  }

  if (mode === 'my-packs') {
    section += `IMPORTANT: The user has configured "My Packs Only" mode. You MUST only use nodes from the core ComfyUI nodes AND the packs listed below. Do NOT use nodes from packs not listed here. If the request requires a pack the user doesn't have, explain what pack they need and why.\n\n`;
  } else {
    section += `The user has these custom node packs installed. Prefer using nodes from these packs when applicable. You may also suggest additional packs if needed.\n\n`;
  }

  // Tier 1: All packs as summaries
  section += `### Installed Packs\n`;
  for (const info of packInfos) {
    const shortDesc = info.description
      ? ` -- ${info.description.substring(0, 100)}`
      : '';
    section += `- **${info.title}**${shortDesc} (${info.nodeNames.length} nodes)\n`;
  }

  // Tier 2: Expanded node detail for relevant packs
  if (expandedCount > 0) {
    section += `\n### Detailed Node Reference (for relevant packs)\n\n`;
    for (const info of packInfos) {
      if (!info.isExpanded) continue;

      const packId = info.installCommand
        .replace(/^comfy node install\s+/, '')
        .replace(/^git clone\s+.*\//, '')
        .trim();

      // â”€â”€ Tier 1: Curated hand-authored schemas â”€â”€
      const curatedSchemas = getKeyNodesForPack(packId)
        || getKeyNodesForPack(info.title);

      // â”€â”€ Tier 2: AI-learned schemas â”€â”€
      const learnedSchemas = getLearnedSchemas(packId)
        || getLearnedSchemas(info.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

      if (curatedSchemas && curatedSchemas.nodes.length > 0) {
        // Use rich curated schemas â€” these give the AI full input/output specs
        section += formatPackSchemasForPrompt(curatedSchemas);
        section += '\n';
        // Also list any remaining node names not covered by curated schemas
        const curatedNames = new Set(curatedSchemas.nodes.map(n => n.class_type));
        const uncovered = info.nodeNames.filter(n => !curatedNames.has(n));
        if (uncovered.length > 0) {
          const names = uncovered.slice(0, 30);
          section += `Other nodes (name only): ${names.join(', ')}`;
          if (uncovered.length > 30) {
            section += ` ... and ${uncovered.length - 30} more`;
          }
          section += '\n';
        }
      } else if (learnedSchemas && learnedSchemas.schemas.length > 0) {
        // Use AI-learned schemas (Tier 2: parsed from GitHub source)
        const learnedPack: PackKeyNodes = {
          packId: learnedSchemas.packId,
          packTitle: learnedSchemas.packTitle,
          nodes: learnedSchemas.schemas,
        };
        section += formatPackSchemasForPrompt(learnedPack);
        section += '\n';
        // List remaining nodes not covered
        const learnedNames = new Set(learnedSchemas.schemas.map(n => n.class_type));
        const uncovered = info.nodeNames.filter(n => !learnedNames.has(n));
        if (uncovered.length > 0) {
          const names = uncovered.slice(0, 30);
          section += `Other nodes (name only): ${names.join(', ')}`;
          if (uncovered.length > 30) {
            section += ` ... and ${uncovered.length - 30} more`;
          }
          section += '\n';
        }
      } else {
        // â”€â”€ Tier 3: Fallback â€” just list node names â”€â”€
        section += `**${info.title}**\n`;
        section += `Install: \`${info.installCommand}\`\n`;
        if (info.nodeNames.length > 0) {
          const names = info.nodeNames.slice(0, 40);
          section += `Nodes: ${names.join(', ')}`;
          if (info.nodeNames.length > 40) {
            section += ` ... and ${info.nodeNames.length - 40} more`;
          }
          section += '\n';
        }
      }
      section += '\n';
    }
  }

  return section;
}

/**
 * Estimates the token count of the packs prompt section.
 * Rough approximation: ~0.75 tokens per character for English text.
 */
export function estimatePacksTokens(pinnedPacks: PinnedNodePack[]): number {
  if (pinnedPacks.length === 0) return 0;
  // Tier 1: ~40 chars per pack summary
  let chars = pinnedPacks.length * 80;
  // Tier 2: all packs expanded when live cache is available
  const liveCache = getLiveNodeCache();
  const expandedEstimate = liveCache
    ? pinnedPacks.length
    : Math.ceil(pinnedPacks.length * 0.4);
  const avgNodes = pinnedPacks.reduce((s, p) => s + Math.min(p.nodeNames.length, 40), 0) / pinnedPacks.length;
  chars += expandedEstimate * avgNodes * 30;
  // Live schemas add more detail per node
  if (liveCache) {
    chars += expandedEstimate * avgNodes * 20; // extra detail per node
  }
  // Header text
  chars += 300;
  return Math.round(chars * 0.75);
}


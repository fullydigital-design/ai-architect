import { getNodeToPackMapping, type PackInfo } from './node-pack-mapper';
import type { ParsedWorkflow } from './workflow-parser';

export interface NodeRequirement {
  nodeClass: string;
  usageCount: number;
  source: 'builtin' | 'custom_pack' | 'unknown';
  pack?: PackInfo;
  isAvailable: boolean;
  isMissing: boolean;
}

export interface WorkflowRequirements {
  totalNodes: number;
  uniqueNodeTypes: number;
  requirements: NodeRequirement[];
  builtinCount: number;
  installedCount: number;
  missingCount: number;
  unknownCount: number;
  missingPacks: PackInfo[];
  installedPacks: PackInfo[];
}

function getPackKey(pack: PackInfo): string {
  return pack.id || pack.reference || pack.repository || pack.title;
}

export async function analyzeWorkflowRequirements(
  parsedWorkflow: ParsedWorkflow,
): Promise<WorkflowRequirements> {
  const mapping = await getNodeToPackMapping();
  const requirements: NodeRequirement[] = [];
  const missingPacksMap = new Map<string, PackInfo>();
  const installedPacksMap = new Map<string, PackInfo>();

  for (const nodeClass of parsedWorkflow.nodeTypes) {
    const usageCount = parsedWorkflow.nodeTypeCounts.get(nodeClass) || 1;

    // A node is built-in if objectInfo confirms it (primary) OR if the workflow
    // JSON itself declares it as comfy-core via properties.cnr_id (fallback for
    // when ComfyUI is offline and objectInfo wasn't available during mapping build).
    const isBuiltin = mapping.builtinNodes.has(nodeClass)
      || parsedWorkflow.coreNodeTypes.has(nodeClass);

    if (isBuiltin) {
      requirements.push({
        nodeClass,
        usageCount,
        source: 'builtin',
        isAvailable: true,
        isMissing: false,
      });
      continue;
    }

    const pack = mapping.nodeClassToPack.get(nodeClass);
    if (pack) {
      const isInstalled = !!pack.is_installed;
      requirements.push({
        nodeClass,
        usageCount,
        source: 'custom_pack',
        pack,
        isAvailable: isInstalled,
        isMissing: !isInstalled,
      });

      if (isInstalled) {
        installedPacksMap.set(getPackKey(pack), pack);
      } else {
        missingPacksMap.set(getPackKey(pack), pack);
      }
      continue;
    }

    requirements.push({
      nodeClass,
      usageCount,
      source: 'unknown',
      isAvailable: false,
      isMissing: true,
    });
  }

  return {
    totalNodes: parsedWorkflow.nodeCount,
    uniqueNodeTypes: parsedWorkflow.nodeTypes.length,
    requirements,
    builtinCount: requirements.filter((item) => item.source === 'builtin').length,
    installedCount: requirements.filter((item) => item.source === 'custom_pack' && item.isAvailable).length,
    missingCount: requirements.filter((item) => item.source === 'custom_pack' && item.isMissing).length,
    unknownCount: requirements.filter((item) => item.source === 'unknown').length,
    missingPacks: [...missingPacksMap.values()],
    installedPacks: [...installedPacksMap.values()],
  };
}

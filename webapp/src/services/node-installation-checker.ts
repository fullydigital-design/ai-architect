import { getCachedObjectInfo, getObjectInfo } from './comfyui-object-info-cache';

export interface PackInstallationStatus {
  packName: string;
  packReference: string;
  isInstalled: boolean;
  totalNodesUsed: number;
  installedNodes: string[];
  missingNodes: string[];
}

export interface PackInstallationCheckResult {
  statuses: PackInstallationStatus[];
  checkSucceeded: boolean;
  usedCachedObjectInfo?: boolean;
  error?: string;
}

export async function checkPackInstallation(
  comfyuiUrl: string,
  detectedPacks: Array<{
    name: string;
    reference: string;
    nodeTypes: string[];
  }>,
): Promise<PackInstallationCheckResult> {
  const evaluateStatuses = (availableNodeTypes: Set<string>): PackInstallationStatus[] => {
    return detectedPacks.map((pack) => {
      const installedNodes: string[] = [];
      const missingNodes: string[] = [];
      for (const nodeType of pack.nodeTypes) {
        if (availableNodeTypes.has(nodeType)) installedNodes.push(nodeType);
        else missingNodes.push(nodeType);
      }
      return {
        packName: pack.name,
        packReference: pack.reference,
        isInstalled: missingNodes.length === 0,
        totalNodesUsed: pack.nodeTypes.length,
        installedNodes,
        missingNodes,
      };
    });
  };

  try {
    const objectInfo = await getObjectInfo(comfyuiUrl);
    const statuses = evaluateStatuses(new Set(Object.keys(objectInfo)));
    return { statuses, checkSucceeded: true };
  } catch (error) {
    const cachedObjectInfo = getCachedObjectInfo();
    if (cachedObjectInfo) {
      return {
        statuses: evaluateStatuses(new Set(Object.keys(cachedObjectInfo))),
        checkSucceeded: false,
        usedCachedObjectInfo: true,
        error: error instanceof Error ? error.message : 'Failed to verify pack installation (using cached object_info)',
      };
    }

    const statuses: PackInstallationStatus[] = detectedPacks.map((pack) => ({
      packName: pack.name,
      packReference: pack.reference,
      isInstalled: false,
      totalNodesUsed: pack.nodeTypes.length,
      installedNodes: [],
      missingNodes: [...pack.nodeTypes],
    }));
    return {
      statuses,
      checkSucceeded: false,
      error: error instanceof Error ? error.message : 'Failed to verify pack installation',
    };
  }
}

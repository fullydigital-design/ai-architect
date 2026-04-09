/**
 * DetectedPacksCard - Phase 2 of Workflow Study Mode
 *
 * Rendered inside the chat after a workflow import when custom node packs are
 * detected. Shows each detected pack with pin / learn buttons and a batch
 * "Pin All to AI Scope" action.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package, Check, Pin, GraduationCap, ChevronDown, ChevronUp, ExternalLink, Star, Loader2, XCircle, Clock3, AlertTriangle, RefreshCw, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { DetectedPack } from '../../../services/workflow-analyzer';
import type { CustomNodePackInfo } from '../../../data/custom-node-registry';
import type { PackInstallationStatus } from '../../../services/node-installation-checker';
import { getObjectInfo, invalidateObjectInfoCache } from '../../../services/comfyui-object-info-cache';
import {
  batchQueuePacks,
  getManagerNodeList,
  invalidateManagerNodeListCache,
  installPack,
  uninstallPack,
  updatePack,
  rebootAndWait,
  refreshManagerNodeList,
  verifyInstallation,
  waitForRestart,
  type QueueOperationType,
  type ManagerPack,
} from '../../services/comfyui-manager-service';
import { getComfyUIBaseUrl } from '../../../services/api-config';

interface DetectedPacksCardProps {
  detectedPacks: DetectedPack[];
  comfyuiUrl?: string;
  managerAvailable?: boolean;
  installPackFn?: (comfyuiUrl: string, reference: string) => Promise<boolean | void>;
  rebootFn?: (comfyuiUrl: string) => Promise<boolean | void>;
  isPinned: (packId: string) => boolean;
  onPinPack: (pack: CustomNodePackInfo) => void;
  onUnpinPack: (packId: string) => void;
  onPinMultiple: (packs: CustomNodePackInfo[]) => void;
  onLearnPack?: (packId: string, packTitle: string, reference: string) => void;
  learnedPackIds?: Set<string>;
  learningPackId?: string | null;
  installationStatuses?: PackInstallationStatus[];
  isCheckingInstallation?: boolean;
  installationCheckSucceeded?: boolean;
  onRefreshInstallation?: () => void;
  managerNodeListWarning?: string | null;
}

function normalizeReference(ref: string): string {
  return ref.replace(/\.git$/, '').replace(/\/+$/, '').toLowerCase();
}

function isUnknownPack(dp: { packTitle: string; reference: string }): boolean {
  return !dp.reference || dp.packTitle.toLowerCase().startsWith('unknown pack for:');
}

function getUnknownNodeType(dp: { packTitle: string; missingNodesReal?: string[]; nodeTypesUsed?: string[] }): string {
  const byMissing = dp.missingNodesReal?.[0]?.trim();
  if (byMissing) return byMissing;
  const byUsed = dp.nodeTypesUsed?.[0]?.trim();
  if (byUsed) return byUsed;
  const marker = 'unknown pack for:';
  const title = String(dp.packTitle || '');
  const idx = title.toLowerCase().indexOf(marker);
  if (idx >= 0) return title.slice(idx + marker.length).trim();
  return title.trim();
}

function guessLikelyInstalledPackForUnknownNode(
  nodeType: string,
  installedPackTitles: string[],
): string | null {
  const patterns: Array<{ re: RegExp; keyword: string }> = [
    { re: /^impact/i, keyword: 'impact' },
    { re: /^efficiency/i, keyword: 'efficiency' },
    { re: /^was/i, keyword: 'was' },
    { re: /^cr[\s_]/i, keyword: 'comfyroll' },
    { re: /^rgthree/i, keyword: 'rgthree' },
  ];
  const lowerTitles = installedPackTitles.map((title) => title.toLowerCase());
  for (const pattern of patterns) {
    if (!pattern.re.test(nodeType)) continue;
    const matchIndex = lowerTitles.findIndex((title) => title.includes(pattern.keyword));
    if (matchIndex >= 0) return installedPackTitles[matchIndex];
  }
  return null;
}

function packRuntimeKey(dp: { packId: string; reference: string; packTitle: string }): string {
  return `${dp.packId}::${dp.reference || dp.packTitle}`;
}

type RuntimePackStatus = 'installed' | 'not-installed' | 'update-available' | 'disabled' | 'unknown';

function getRuntimePackStatus(node: ManagerPack | undefined): RuntimePackStatus {
  if (!node) return 'unknown';
  const installed = String(node.installed ?? '').toLowerCase();
  const state = String(node.state ?? '').toLowerCase();
  if (installed === 'update' || state === 'update') return 'update-available';
  if (state === 'disabled' || installed === 'disabled') return 'disabled';
  if (
    state === 'enabled'
    || installed === 'true'
    || installed === 'installed'
    || node.is_installed === true
  ) {
    return 'installed';
  }
  if (installed === 'false' || state === 'not-installed') return 'not-installed';
  return 'unknown';
}

/**
 * DetectedPacksCard - Phase 2 of Workflow Study Mode
 *
 * Rendered inside the chat after a workflow import when custom node packs are
 * detected. Shows each detected pack with pin / learn buttons and a batch
 * "Pin All to AI Scope" action.
 */
function toPackInfo(dp: DetectedPack): CustomNodePackInfo {
  return {
    id: dp.packId,
    title: dp.packTitle,
    author: dp.author,
    description: '',
    reference: dp.reference,
    installType: 'git-clone',
    stars: dp.stars,
    lastUpdate: '',
    nodeNames: dp.nodeTypesUsed,
    nodeCount: dp.nodeTypesUsed.length,
    installCommand: dp.installCommand,
  };
}

export const DetectedPacksCard = memo(function DetectedPacksCard({
  detectedPacks,
  comfyuiUrl,
  managerAvailable,
  installPackFn,
  rebootFn,
  isPinned,
  onPinPack,
  onUnpinPack,
  onPinMultiple,
  onLearnPack,
  learnedPackIds,
  learningPackId,
  installationStatuses = [],
  isCheckingInstallation = false,
  installationCheckSucceeded = true,
  onRefreshInstallation,
  managerNodeListWarning,
}: DetectedPacksCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [batchStatuses, setBatchStatuses] = useState<Map<string, 'waiting' | 'installing' | 'succeeded' | 'failed'>>(new Map());
  const [singleInstallState, setSingleInstallState] = useState<Map<string, { status: 'idle' | 'installing' | 'succeeded' | 'failed'; error?: string }>>(new Map());
  const [uninstallingPacks, setUninstallingPacks] = useState<Set<string>>(new Set());
  const [updatingPacks, setUpdatingPacks] = useState<Set<string>>(new Set());
  const [showUninstallConfirm, setShowUninstallConfirm] = useState<string | null>(null);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [needsRestart, setNeedsRestart] = useState(false);
  const [pendingRestartCount, setPendingRestartCount] = useState(0);
  const [installedNodeTypes, setInstalledNodeTypes] = useState<Set<string>>(new Set());
  const [checkComplete, setCheckComplete] = useState(false);
  const [recheckTrigger, setRecheckTrigger] = useState(0);
  const [isInstallingAll, setIsInstallingAll] = useState(false);
  const [installProgress, setInstallProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [isRestarting, setIsRestarting] = useState(false);
  const [isSingleInstallBusy, setIsSingleInstallBusy] = useState(false);
  const [managerPackByRef, setManagerPackByRef] = useState<Map<string, ManagerPack>>(new Map());
  const [managerPackByTitle, setManagerPackByTitle] = useState<Map<string, ManagerPack>>(new Map());
  const [managerStatusByRef, setManagerStatusByRef] = useState<Map<string, RuntimePackStatus>>(new Map());
  const [showInstalledPacks, setShowInstalledPacks] = useState(false);
  const [mappedPackHintsByNode, setMappedPackHintsByNode] = useState<Map<string, { title: string; is_installed: boolean }>>(new Map());
  const installingPackRefs = useRef<Set<string>>(new Set());
  const batchInstallRunningRef = useRef(false);
  const isAnyOperationRunning = isInstallingAll
    || batchUpdating
    || isRestarting
    || isSingleInstallBusy
    || uninstallingPacks.size > 0
    || updatingPacks.size > 0;

  const managerAvailableResolved = !!managerAvailable;
  const packsKey = useMemo(
    () => detectedPacks
      .map((dp) => `${normalizeReference(dp.reference)}:${dp.packTitle.toLowerCase()}`)
      .sort((a, b) => a.localeCompare(b))
      .join('|'),
    [detectedPacks],
  );

  useEffect(() => {
    const base = comfyuiUrl?.trim() || getComfyUIBaseUrl();
    if (!base || detectedPacks.length === 0) return;
    let cancelled = false;

    const run = async () => {
      setCheckComplete(false);
      try {
        const objectInfo = await getObjectInfo(base);
        if (cancelled) return;
        setInstalledNodeTypes(new Set(Object.keys(objectInfo)));
      } catch {
        if (!cancelled) setInstalledNodeTypes(new Set());
      } finally {
        if (!cancelled) setCheckComplete(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [comfyuiUrl, detectedPacks.length, packsKey, recheckTrigger]);

  useEffect(() => {
    const base = comfyuiUrl?.trim() || getComfyUIBaseUrl();
    if (!base || !managerAvailableResolved || detectedPacks.length === 0) {
      setManagerPackByRef(new Map());
      setManagerPackByTitle(new Map());
      setManagerStatusByRef(new Map());
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const managerNodes = await getManagerNodeList(base);
        if (cancelled) return;

        const byRef = new Map<string, ManagerPack>();
        const byTitle = new Map<string, ManagerPack>();
        const statusByRef = new Map<string, RuntimePackStatus>();

        for (const node of managerNodes) {
          const normalizedRef = normalizeReference(String(node.reference || ''));
          if (normalizedRef) {
            byRef.set(normalizedRef, node);
            statusByRef.set(normalizedRef, getRuntimePackStatus(node));
          }
          const title = String(node.title || '').trim().toLowerCase();
          if (title) byTitle.set(title, node);
        }

        setManagerPackByRef(byRef);
        setManagerPackByTitle(byTitle);
        setManagerStatusByRef(statusByRef);
      } catch {
        if (!cancelled) {
          setManagerPackByRef(new Map());
          setManagerPackByTitle(new Map());
          setManagerStatusByRef(new Map());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [comfyuiUrl, detectedPacks.length, managerAvailableResolved, packsKey, recheckTrigger]);

  // Live pin status
  const statusByRef = useMemo(() => {
    const map = new Map<string, PackInstallationStatus>();
    for (const status of installationStatuses) {
      map.set(normalizeReference(status.packReference), status);
    }
    return map;
  }, [installationStatuses]);

  const packsWithStatus = useMemo(() => detectedPacks.map((dp) => {
    const normalizedRef = normalizeReference(dp.reference);
    const installStatus = statusByRef.get(normalizedRef);
    const managerPack = managerPackByRef.get(normalizedRef) || managerPackByTitle.get(dp.packTitle.toLowerCase());

    let isInstalledReal = installStatus ? installStatus.isInstalled : null;
    let missingNodesReal = installStatus?.missingNodes ?? [];
    let installedNodesReal = installStatus?.installedNodes ?? [];

    if (!installStatus && checkComplete) {
      const types = dp.nodeTypesUsed || [];
      installedNodesReal = types.filter((t) => installedNodeTypes.has(t));
      missingNodesReal = types.filter((t) => !installedNodeTypes.has(t));
      isInstalledReal = types.length > 0 ? missingNodesReal.length === 0 : true;
    }

    const managerRuntimeStatus: RuntimePackStatus | null = managerPack
      ? getRuntimePackStatus(managerPack)
      : (dp.managerStatus ?? null);

    // Ground truth: live /object_info node availability.
    // If all used nodes exist, this pack is functionally installed regardless of Manager metadata.
    const runtimeStatus: RuntimePackStatus = isInstalledReal === true
      ? (managerRuntimeStatus === 'update-available' ? 'update-available' : 'installed')
      : isInstalledReal === false
        ? 'not-installed'
        : isUnknownPack(dp)
          ? 'unknown'
          : (managerRuntimeStatus ?? 'unknown');

    return {
      ...dp,
      isPinned: isPinned(dp.packId),
      isLearned: learnedPackIds?.has(dp.packId) ?? dp.isLearned,
      isLearning: learningPackId === dp.packId,
      isInstalledReal,
      missingNodesReal,
      installedNodesReal,
      managerPack,
      managerRuntimeStatus,
      runtimeStatus,
    };
  }), [
    detectedPacks,
    isPinned,
    learnedPackIds,
    learningPackId,
    statusByRef,
    checkComplete,
    installedNodeTypes,
    managerPackByRef,
    managerPackByTitle,
  ]);

  const unpinnedPacks = packsWithStatus.filter(p => !p.isPinned);
  const allPinned = unpinnedPacks.length === 0;
  const missingPacks = packsWithStatus.filter((p) => {
    if (p.isInstalledReal === true) return false;
    if (p.isInstalledReal === false) return true;
    return p.runtimeStatus === 'not-installed' || p.runtimeStatus === 'unknown';
  });
  const installableMissingPacks = missingPacks.filter((p) => !isUnknownPack(p) && p.runtimeStatus === 'not-installed');
  const unknownMissingPacks = missingPacks.filter((p) => isUnknownPack(p) || p.runtimeStatus === 'unknown');
  const knownMissingPacks = missingPacks.filter((p) => !isUnknownPack(p));
  const installedPacks = packsWithStatus.filter((p) => !missingPacks.some((missingPack) => packRuntimeKey(missingPack) === packRuntimeKey(p)));
  const missingNodeTypes = useMemo(
    () => [...new Set(missingPacks.flatMap((pack) => pack.missingNodesReal).filter((name) => name.trim().length > 0))],
    [missingPacks],
  );
  const unknownMissingNodeTypes = useMemo(
    () => [...new Set(unknownMissingPacks.map((pack) => getUnknownNodeType(pack)).filter((name) => name.length > 0))],
    [unknownMissingPacks],
  );
  const installedPackTitles = useMemo(
    () => installedPacks.map((pack) => pack.packTitle),
    [installedPacks],
  );
  const missingCountLabel = `${missingNodeTypes.length} missing node${missingNodeTypes.length === 1 ? '' : 's'}`;
  const installedCountLabel = `${installedPacks.length} installed pack${installedPacks.length === 1 ? '' : 's'}`;
  const allPackSummary = installedPacks
    .map((pack) => `${pack.packTitle} (${pack.nodeTypesUsed.length})`)
    .join(' - ');
  const updatablePacks = packsWithStatus.filter((p) => p.runtimeStatus === 'update-available' && p.isInstalledReal !== false);
  const refreshStatuses = useCallback(() => {
    setRecheckTrigger((v) => v + 1);
    onRefreshInstallation?.();
  }, [onRefreshInstallation]);

  useEffect(() => {
    if (unknownMissingNodeTypes.length === 0) {
      setMappedPackHintsByNode(new Map());
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const nodePackMapper = await import('../../services/node-pack-mapper');
        const mapping = await nodePackMapper.getNodeToPackMapping();
        if (cancelled) return;
        const next = new Map<string, { title: string; is_installed: boolean }>();
        for (const nodeType of unknownMissingNodeTypes) {
          const mappedPack = mapping.nodeClassToPack.get(nodeType);
          if (mappedPack) {
            next.set(nodeType, {
              title: mappedPack.title,
              is_installed: mappedPack.is_installed,
            });
          }
        }
        setMappedPackHintsByNode(next);
      } catch {
        if (!cancelled) setMappedPackHintsByNode(new Map());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [unknownMissingNodeTypes]);

  const handlePinAll = () => {
    const toPinInfos = unpinnedPacks.map(p => toPackInfo(p));
    if (toPinInfos.length === 0) return;
    onPinMultiple(toPinInfos);
    toast.success(`${toPinInfos.length} pack(s) added to AI scope`);
  };

  const handleTogglePin = (dp: typeof packsWithStatus[0]) => {
    if (dp.isPinned) {
      onUnpinPack(dp.packId);
      toast.success(`Unpinned ${dp.packTitle}`);
    } else {
      onPinPack(toPackInfo(dp));
      toast.success(`${dp.packTitle} added to AI scope`);
    }
  };

  const handleLearn = (dp: typeof packsWithStatus[0]) => {
    if (!onLearnPack) return;
    onLearnPack(dp.packId, dp.packTitle, dp.reference);
  };

  const handleInstallSingle = useCallback(async (dp: typeof packsWithStatus[0]) => {
    if (!comfyuiUrl?.trim()) {
      toast.error('Configure ComfyUI URL first');
      return;
    }
    const installKey = dp.reference || dp.packId;
    if (
      !installKey
      || batchInstallRunningRef.current
      || installingPackRefs.current.has(installKey)
      || installingPackRefs.current.size > 0
    ) {
      return;
    }
    if (isUnknownPack(dp)) {
      toast.error('Cannot auto-install: pack not found in ComfyUI-Manager registry.');
      return;
    }
    installingPackRefs.current.add(installKey);
    setIsSingleInstallBusy(true);
    setSingleInstallState((prev) => {
      const next = new Map(prev);
      next.set(dp.reference, { status: 'installing' });
      return next;
    });

    try {
      if (installPackFn) {
        const installResult = await installPackFn(comfyuiUrl, dp.reference);
        const ok = typeof installResult === 'boolean' ? installResult : true;
        if (!ok) throw new Error('Install failed');
      } else {
        const managerPack = dp.managerPack as ManagerPack | undefined;
        const result = await installPack(
          managerPack || { id: dp.packId, title: dp.packTitle, reference: dp.reference },
          comfyuiUrl,
        );
        if (!result.success) {
          throw new Error(result.error || 'Install failed');
        }
      }
      setSingleInstallState((prev) => {
        const next = new Map(prev);
        next.set(dp.reference, { status: 'succeeded' });
        return next;
      });
      setNeedsRestart(true);
      setPendingRestartCount((prev) => prev + 1);
      toast.success(`${dp.packTitle} installed. Restart ComfyUI to activate.`);
      refreshStatuses();
      void refreshManagerNodeList(comfyuiUrl);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Install failed';
      setSingleInstallState((prev) => {
        const next = new Map(prev);
        next.set(dp.reference, { status: 'failed', error: errMsg });
        return next;
      });
      toast.error(errMsg);
    } finally {
      installingPackRefs.current.delete(installKey);
      setIsSingleInstallBusy(installingPackRefs.current.size > 0);
    }
  }, [comfyuiUrl, installPackFn, refreshStatuses]);

  const handleSingleUninstall = useCallback(async (dp: typeof packsWithStatus[0]) => {
    if (!comfyuiUrl?.trim()) {
      toast.error('Configure ComfyUI URL first');
      return;
    }
    const key = dp.packId || dp.reference;
    if (!key) return;

    setShowUninstallConfirm(null);
    setUninstallingPacks((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    try {
      const managerPack = dp.managerPack as ManagerPack | undefined;
      const result = await uninstallPack(
        managerPack || { id: dp.packId, title: dp.packTitle, reference: dp.reference },
        comfyuiUrl,
      );
      if (!result.success) {
        throw new Error(result.error || 'Uninstall failed');
      }
      setNeedsRestart(true);
      setPendingRestartCount((prev) => prev + 1);
      toast.success(`${dp.packTitle} uninstalled. Restart ComfyUI to apply.`);
      refreshStatuses();
      void refreshManagerNodeList(comfyuiUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Uninstall failed';
      toast.error(`Failed to uninstall ${dp.packTitle}: ${message}`);
    } finally {
      setUninstallingPacks((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [comfyuiUrl, refreshStatuses]);

  const handleSingleUpdate = useCallback(async (dp: typeof packsWithStatus[0]) => {
    if (!comfyuiUrl?.trim()) {
      toast.error('Configure ComfyUI URL first');
      return;
    }
    const key = dp.packId || dp.reference;
    if (!key) return;

    setUpdatingPacks((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    try {
      const managerPack = dp.managerPack as ManagerPack | undefined;
      const result = await updatePack(
        managerPack || { id: dp.packId, title: dp.packTitle, reference: dp.reference },
        comfyuiUrl,
      );
      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }
      setNeedsRestart(true);
      setPendingRestartCount((prev) => prev + 1);
      toast.success(`${dp.packTitle} updated. Restart ComfyUI to apply.`);
      refreshStatuses();
      void refreshManagerNodeList(comfyuiUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      toast.error(`Failed to update ${dp.packTitle}: ${message}`);
    } finally {
      setUpdatingPacks((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [comfyuiUrl, refreshStatuses]);

  const handleBatchQueueOperation = useCallback(async (
    operation: QueueOperationType,
    packs: Array<typeof packsWithStatus[number]>,
  ) => {
    if (!comfyuiUrl?.trim() || packs.length === 0 || batchInstallRunningRef.current) return;

    batchInstallRunningRef.current = true;
    if (operation === 'install') setIsInstallingAll(true);
    if (operation === 'update') setBatchUpdating(true);
    setInstallProgress({ current: 0, total: packs.length, currentName: '' });
    setBatchStatuses(new Map());

    const label = operation === 'install' ? 'Install' : operation === 'update' ? 'Update' : 'Uninstall';
    const queueStatusInit = new Map<string, 'waiting' | 'installing' | 'succeeded' | 'failed'>();
    const payloads: ManagerPack[] = packs.map((pack) => {
      queueStatusInit.set(pack.reference, 'waiting');
      return (pack.managerPack as ManagerPack | undefined)
        || { id: pack.packId, title: pack.packTitle, reference: pack.reference };
    });
    setBatchStatuses(queueStatusInit);

    try {
      const result = await batchQueuePacks(
        operation,
        payloads,
        {
          onQueueing: (pack, index, total) => {
            const normalized = normalizeReference(String(pack.reference || ''));
            const match = packs.find((item) => normalizeReference(item.reference) === normalized);
            if (match) {
              setBatchStatuses((prev) => {
                const next = new Map(prev);
                next.set(match.reference, 'installing');
                return next;
              });
            }
            setInstallProgress({
              current: index + 1,
              total,
              currentName: `${label} queue ${index + 1}/${total}: ${String(pack.title || pack.id || 'pack')}`,
            });
          },
          onQueueComplete: () => {
            setInstallProgress({ current: packs.length, total: packs.length, currentName: `${label} queue started...` });
          },
          onProgress: (status) => {
            setInstallProgress((prev) => ({ ...prev, currentName: status }));
          },
          onError: (error) => {
            toast.error(error);
          },
        },
        comfyuiUrl,
      );

      const failedSet = new Set(result.failed.map((entry) => entry.id));
      const succeededSet = new Set(result.succeeded);
      setBatchStatuses((prev) => {
        const next = new Map(prev);
        for (const pack of packs) {
          const packKeys = [pack.packId, pack.reference, normalizeReference(pack.reference)];
          const succeeded = packKeys.some((key) => key && succeededSet.has(String(key)));
          const failed = packKeys.some((key) => key && failedSet.has(String(key)));
          if (succeeded) next.set(pack.reference, 'succeeded');
          else if (failed) next.set(pack.reference, 'failed');
        }
        return next;
      });

      if (result.succeeded.length === 0) {
        toast.error(`No packs were queued for ${operation}.`);
        return;
      }

      setInstallProgress({ current: packs.length, total: packs.length, currentName: 'Restarting ComfyUI...' });
      const rebooted = await rebootAndWait(
        comfyuiUrl,
        () => setInstallProgress({ current: packs.length, total: packs.length, currentName: 'ComfyUI restarting...' }),
        () => setInstallProgress({ current: packs.length, total: packs.length, currentName: 'ComfyUI back online. Verifying...' }),
        180_000,
      );

      if (!rebooted) {
        setNeedsRestart(true);
        setPendingRestartCount((prev) => prev + result.succeeded.length);
        toast.warning('ComfyUI restart timed out. It may still be restarting - check the ComfyUI terminal window.');
        return;
      }

      invalidateObjectInfoCache();
      invalidateManagerNodeListCache();
      void refreshManagerNodeList(comfyuiUrl);

      const requiredNodeTypes = [...new Set(packs.flatMap((pack) => pack.missingNodesReal || []))];
      if (requiredNodeTypes.length > 0) {
        const verification = await verifyInstallation(comfyuiUrl, requiredNodeTypes);
        if (verification.missing.length === 0) {
          toast.success(`${label} complete. All required nodes are now available.`);
        } else {
          toast.warning(`${label} complete, but ${verification.missing.length} node type(s) still missing.`);
        }
      } else {
        toast.success(`${label} complete.`);
      }

      setNeedsRestart(false);
      setPendingRestartCount(0);
      refreshStatuses();
    } catch (error) {
      const message = error instanceof Error ? error.message : `${label} batch failed`;
      toast.error(message);
    } finally {
      setIsInstallingAll(false);
      setBatchUpdating(false);
      batchInstallRunningRef.current = false;
    }
  }, [comfyuiUrl, packsWithStatus, refreshStatuses]);

  const handleRestartNow = useCallback(async () => {
    if (!comfyuiUrl?.trim()) {
      toast.error('Configure ComfyUI URL first');
      return;
    }
    setIsRestarting(true);
    try {
      if (rebootFn) {
        const rebootResult = await rebootFn(comfyuiUrl);
        const ok = typeof rebootResult === 'boolean' ? rebootResult : true;
        if (!ok) {
          toast.warning('ComfyUI restart timed out. It may still be restarting - check the ComfyUI terminal window.');
          return;
        }
        const cameBack = await waitForRestart(comfyuiUrl, 180_000);
        if (!cameBack) {
          toast.warning('ComfyUI restart timed out. It may still be restarting - check the ComfyUI terminal window.');
          return;
        }
      } else {
        const ok = await rebootAndWait(
          comfyuiUrl,
          () => toast.info('ComfyUI is restarting...'),
          () => toast.info('ComfyUI is back online. Verifying nodes...'),
          180_000,
        );
        if (!ok) {
          toast.warning('ComfyUI restart timed out. It may still be restarting - check the ComfyUI terminal window.');
          return;
        }
      }
      invalidateObjectInfoCache();
      invalidateManagerNodeListCache();
      const missingNodeTypes = [...new Set(
        packsWithStatus
          .filter((pack) => pack.isInstalledReal === false)
          .flatMap((pack) => pack.missingNodesReal),
      )];
      if (missingNodeTypes.length > 0) {
        const verification = await verifyInstallation(comfyuiUrl, missingNodeTypes);
        if (verification.missing.length === 0) {
          toast.success('ComfyUI restarted successfully. Missing nodes are now available.');
        } else {
          toast.warning(`Restart complete. ${verification.missing.length} node type(s) still missing.`);
        }
      } else {
        toast.success('ComfyUI restarted successfully');
      }
      setNeedsRestart(false);
      setPendingRestartCount(0);
      setSingleInstallState(new Map());
      refreshStatuses();
      void refreshManagerNodeList(comfyuiUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ComfyUI restart encountered an unexpected error.');
    } finally {
      setIsRestarting(false);
    }
  }, [comfyuiUrl, packsWithStatus, rebootFn, refreshStatuses]);

  const handleInstallAllMissing = useCallback(async () => {
    void handleBatchQueueOperation('install', installableMissingPacks);
  }, [handleBatchQueueOperation, installableMissingPacks]);

  const handleUpdateAll = useCallback(async () => {
    void handleBatchQueueOperation('update', updatablePacks);
  }, [handleBatchQueueOperation, updatablePacks]);

  if (detectedPacks.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-teal-500/25 bg-teal-500/[0.04] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-content-primary hover:text-content-primary transition-colors"
        >
          <Package className="w-4 h-4 text-teal-400" />
          <span>
            Node Requirements
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-content-muted" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-content-muted" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {isCheckingInstallation || !checkComplete ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-300 text-[10px] border border-blue-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              Checking...
            </span>
          ) : !installationCheckSucceeded && missingPacks.length === 0 ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-secondary text-content-primary text-[10px] border border-border-default">
              <XCircle className="w-3 h-3" />
              Status Unknown
            </span>
          ) : missingPacks.length === 0 ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
              <Check className="w-3 h-3" />
              All Installed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" />
              {missingCountLabel}
            </span>
          )}
          <span className="text-[10px] text-content-muted">{installedCountLabel}</span>
          {allPinned ? (
            <span className="text-[10px] text-content-muted">
              AI scope synced
            </span>
          ) : (
            <button
              onClick={handlePinAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-[10px] border border-teal-500/25 hover:border-teal-400/40 transition-all"
            >
              <Pin className="w-3 h-3" />
              Pin All to AI Scope
            </button>
          )}
        </div>
      </div>

      {/* Expanded pack list */}
      {expanded && (
        <div className="px-3.5 pb-3 pt-0 border-t border-teal-500/10 space-y-1.5">
          {!checkComplete && (
            <div className="mt-2 animate-pulse space-y-2 rounded border border-border-default bg-surface-inset p-2.5">
              <div className="h-3 w-3/4 rounded bg-surface-secondary" />
              <div className="h-3 w-1/2 rounded bg-surface-secondary" />
              <div className="h-3 w-2/3 rounded bg-surface-secondary" />
            </div>
          )}
          <p className="text-[10px] text-content-muted pt-2 pb-1">
            Pin packs to give the AI context about these custom nodes.
          </p>
          {!installationCheckSucceeded && (
            <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-200">
              Could not verify installation status from ComfyUI. Start ComfyUI and refresh.
            </div>
          )}
          {managerAvailableResolved && managerNodeListWarning && (
            <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-200">
              {managerNodeListWarning}
            </div>
          )}
          {onRefreshInstallation && (
            <button
              onClick={refreshStatuses}
              className="text-[10px] px-2 py-1 rounded border border-border-default text-content-primary hover:bg-surface-secondary/50"
            >
              Refresh Installation Status
            </button>
          )}

          {needsRestart && (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
              <p className="text-[10px] text-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                ComfyUI restart required to apply changes
                {pendingRestartCount > 0 && (
                  <span className="text-amber-300/70">({pendingRestartCount} pending)</span>
                )}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => void handleRestartNow()}
                  disabled={isRestarting || isAnyOperationRunning}
                  className="rounded border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-[10px] text-amber-100 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRestarting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Restarting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3 h-3" />
                      Restart ComfyUI
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setNeedsRestart(false)}
                  className="rounded border border-border-strong px-2.5 py-1 text-[10px] text-content-primary hover:bg-surface-secondary/50"
                >
                  Later
                </button>
              </div>
            </div>
          )}

          {unknownMissingNodeTypes.length > 0 && (
            <div className="mt-2 space-y-2">
              {unknownMissingNodeTypes.map((nodeType) => {
                const mappedPack = mappedPackHintsByNode.get(nodeType);
                const likelyInstalledPack = guessLikelyInstalledPackForUnknownNode(nodeType, installedPackTitles);
                return (
                  <div
                    key={nodeType}
                    className="rounded border border-amber-500/25 bg-amber-500/10 p-2 text-[10px] text-amber-100"
                  >
                    <div className="flex items-center gap-1.5 text-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono">{nodeType}</span>
                    </div>
                    {mappedPack ? (
                      <p className="mt-1 text-amber-200/90">
                        Likely from: {mappedPack.title}
                        {mappedPack.is_installed ? ' (installed)' : ''}. Try updating this pack.
                      </p>
                    ) : likelyInstalledPack ? (
                      <p className="mt-1 text-amber-200/90">
                        Likely from: {likelyInstalledPack} (installed but node missing). Try updating this pack.
                      </p>
                    ) : (
                      <p className="mt-1 text-amber-200/90">
                        Not found in the local pack registry. Search ComfyUI-Manager or remove this node from the workflow.
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <a
                        href={`https://github.com/ltdrdata/ComfyUI-Manager/search?q=${encodeURIComponent(nodeType)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] underline text-amber-200 hover:text-amber-100"
                      >
                        Search in Manager
                      </a>
                      <a
                        href={`https://github.com/search?q=${encodeURIComponent(`${nodeType} ComfyUI`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] underline text-amber-200 hover:text-amber-100"
                      >
                        Search GitHub
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {checkComplete && managerAvailableResolved && (installableMissingPacks.length > 0 || updatablePacks.length > 0) && (
            <div className="mb-2 mx-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                {installableMissingPacks.length > 0 && (
                  <button
                    onClick={() => void handleInstallAllMissing()}
                    disabled={isAnyOperationRunning}
                    className="flex-1 min-w-[220px] flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isInstallingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {installProgress.currentName || `Installing ${installProgress.current}/${installProgress.total}`}
                      </>
                    ) : (
                      <>Install All Missing ({installableMissingPacks.length})</>
                    )}
                  </button>
                )}
                {updatablePacks.length > 0 && (
                  <button
                    onClick={() => void handleUpdateAll()}
                    disabled={isAnyOperationRunning}
                    className="flex-1 min-w-[220px] flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {batchUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {installProgress.currentName || `Updating ${installProgress.current}/${installProgress.total}`}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Update All ({updatablePacks.length})
                      </>
                    )}
                  </button>
                )}
              </div>
              {(isInstallingAll || batchUpdating) && (
                <div className="w-full bg-surface-secondary rounded-full h-1.5">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${installProgress.total > 0 ? (installProgress.current / installProgress.total) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
          )}
          {!managerAvailableResolved && checkComplete && missingPacks.length > 0 && (
            <div className="mt-2 p-2 rounded bg-surface-secondary text-xs text-content-secondary">
              Install <a href="https://github.com/ltdrdata/ComfyUI-Manager" target="_blank" rel="noopener noreferrer" className="text-state-info hover:underline">ComfyUI-Manager</a> to enable one-click installation of missing nodes.
            </div>
          )}

          {missingPacks.length === 0 && (
            <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-[10px] text-emerald-200">
              <div>All {installedPacks.length} custom node pack{installedPacks.length === 1 ? '' : 's'} installed.</div>
              {allPackSummary && (
                <div className="mt-0.5 text-emerald-200/80 truncate">{allPackSummary}</div>
              )}
            </div>
          )}

          {installedPacks.length > 0 && missingPacks.length > 0 && (
            <button
              onClick={() => setShowInstalledPacks((prev) => !prev)}
              className="w-full mt-1 rounded border border-border-default bg-surface-secondary px-2 py-1 text-left text-[10px] text-content-secondary hover:text-content-primary hover:border-border-strong transition-colors inline-flex items-center gap-1.5"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showInstalledPacks ? 'rotate-0' : '-rotate-90'}`} />
              {installedCountLabel} (all nodes available)
            </button>
          )}

          {(missingPacks.length === 0 ? [] : knownMissingPacks)
            .concat(showInstalledPacks ? installedPacks : [])
            .map(dp => (
            <div
              key={packRuntimeKey(dp)}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-secondary/40 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Pin checkbox */}
                <button
                  onClick={() => handleTogglePin(dp)}
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                    dp.isPinned
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'border-border-strong hover:border-teal-400 text-transparent hover:text-teal-400'
                  }`}
                  title={dp.isPinned ? 'Unpin from AI scope' : 'Pin to AI scope'}
                >
                  <Check className="w-2.5 h-2.5" />
                </button>

                {/* Pack info */}
                <div className="min-w-0 flex-1">
                  {isUnknownPack(dp) && (
                    <div className="text-[9px] text-amber-300/90 truncate">
                      Cannot auto-install. Search manually:{' '}
                      <a
                        href={`https://github.com/search?q=${encodeURIComponent((dp.missingNodesReal[0] || dp.packTitle).replace('Unknown pack for:', '').trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        GitHub search
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const batchStatus = batchStatuses.get(dp.reference);
                      const singleStatus = singleInstallState.get(dp.reference)?.status;
                      const opKey = dp.packId || dp.reference;
                      const isUpdating = opKey ? updatingPacks.has(opKey) : false;
                      const isUninstalling = opKey ? uninstallingPacks.has(opKey) : false;
                      if (batchStatus === 'installing') {
                        return <Loader2 className="w-3 h-3 text-blue-300 animate-spin shrink-0" />;
                      }
                      if (batchStatus === 'succeeded') {
                        return <Check className="w-3 h-3 text-emerald-400 shrink-0" />;
                      }
                      if (batchStatus === 'failed') {
                        return (
                          <span title={`Failed to install ${dp.packTitle}`}>
                            <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                          </span>
                        );
                      }
                      if (batchStatuses.size > 0 && missingPacks.some((p) => p.reference === dp.reference)) {
                        return <Clock3 className="w-3 h-3 text-content-muted shrink-0" />;
                      }
                      if (singleStatus === 'installing') {
                        return <Loader2 className="w-3 h-3 text-blue-300 animate-spin shrink-0" />;
                      }
                      if (isUpdating || isUninstalling) {
                        return <Loader2 className="w-3 h-3 text-blue-300 animate-spin shrink-0" />;
                      }
                      if (singleStatus === 'succeeded') {
                        return <Check className="w-3 h-3 text-emerald-400 shrink-0" />;
                      }
                      if (singleStatus === 'failed') {
                        return <XCircle className="w-3 h-3 text-red-400 shrink-0" />;
                      }
                      if (dp.runtimeStatus === 'update-available') {
                        return <RefreshCw className="w-3 h-3 text-amber-300 shrink-0" />;
                      }
                      if (dp.runtimeStatus === 'disabled') {
                        return <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />;
                      }
                      if (dp.runtimeStatus === 'installed') {
                        return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Installed" />;
                      }
                      if (isCheckingInstallation) {
                        return <Loader2 className="w-3 h-3 text-blue-300 animate-spin shrink-0" />;
                      }
                      return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title="Missing or unknown" />;
                    })()}
                    <span className={`text-[11px] truncate ${dp.isPinned ? 'text-emerald-300/90' : 'text-content-primary'}`}>
                      {dp.packTitle}
                    </span>
                    {dp.stars > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] text-state-warning/70 shrink-0">
                        <Star className="w-2.5 h-2.5" />
                        {dp.stars > 999 ? `${(dp.stars / 1000).toFixed(1)}k` : dp.stars}
                      </span>
                    )}
                    {dp.isLearned && (
                      <span className="text-[9px] text-accent-text/70 shrink-0" title="Node schemas learned">
                        learned
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-content-faint truncate">
                    {dp.nodeTypesUsed.length} node{dp.nodeTypesUsed.length !== 1 ? 's' : ''} used: {dp.nodeTypesUsed.slice(0, 3).join(', ')}
                    {dp.nodeTypesUsed.length > 3 && ` +${dp.nodeTypesUsed.length - 3}`}
                    {' | '}
                    <span className={
                      dp.runtimeStatus === 'installed'
                        ? 'text-emerald-400/80'
                        : dp.runtimeStatus === 'update-available'
                          ? 'text-amber-300/80'
                          : dp.runtimeStatus === 'disabled'
                            ? 'text-amber-400/80'
                            : 'text-red-400/80'
                    }>
                      {dp.runtimeStatus}
                    </span>
                  </div>
                  {dp.isInstalledReal === true && dp.managerRuntimeStatus === 'not-installed' && (
                    <div className="text-[9px] text-emerald-300/70 truncate">
                      Verified installed via live nodes (/object_info)
                    </div>
                  )}
                  {dp.isInstalledReal === false && dp.missingNodesReal.length > 0 && (
                    <div className="text-[9px] text-red-300/80 truncate">
                      Missing nodes: {dp.missingNodesReal.slice(0, 4).join(', ')}
                      {dp.missingNodesReal.length > 4 ? ` +${dp.missingNodesReal.length - 4}` : ''}
                    </div>
                  )}
                  {singleInstallState.get(dp.reference)?.status === 'failed' && (
                    <div className="text-[9px] text-red-300/90 truncate">
                      Failed: {singleInstallState.get(dp.reference)?.error || 'Install failed'}
                    </div>
                  )}
                  {singleInstallState.get(dp.reference)?.status === 'succeeded' && (
                    <div className="text-[9px] text-amber-300/90">Installed. Restart needed.</div>
                  )}
                  {(() => {
                    const opKey = dp.packId || dp.reference;
                    if (!opKey) return null;
                    if (updatingPacks.has(opKey)) {
                      return <div className="text-[9px] text-amber-300/90">Updating...</div>;
                    }
                    if (uninstallingPacks.has(opKey)) {
                      return <div className="text-[9px] text-red-300/90">Uninstalling...</div>;
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {dp.runtimeStatus === 'not-installed' && (
                  <button
                    onClick={() => void handleInstallSingle(dp)}
                    disabled={
                      !comfyuiUrl?.trim()
                      || !managerAvailableResolved
                      || isUnknownPack(dp)
                      || singleInstallState.get(dp.reference)?.status === 'installing'
                      || isAnyOperationRunning
                    }
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-state-info bg-state-info-muted hover:bg-state-info-muted/80 border border-state-info/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title={
                      !managerAvailableResolved
                        ? 'Requires ComfyUI-Manager'
                        : isUnknownPack(dp)
                          ? 'Cannot auto-install: pack not found in ComfyUI-Manager registry'
                          : 'Install this pack'
                    }
                  >
                    {singleInstallState.get(dp.reference)?.status === 'installing' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Package className="w-3 h-3" />
                    )}
                    Install
                  </button>
                )}
                {(dp.runtimeStatus === 'installed' || dp.runtimeStatus === 'disabled') && (
                  <span className="px-2 py-0.5 rounded text-[9px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                    Installed
                  </span>
                )}
                {dp.runtimeStatus === 'update-available' && (
                  <button
                    onClick={() => void handleSingleUpdate(dp)}
                    disabled={!managerAvailableResolved || isAnyOperationRunning}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {updatingPacks.has(dp.packId || dp.reference) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Update
                  </button>
                )}
                {/* Learn button */}
                {onLearnPack && !dp.isLearned && !dp.isLearning && (
                  <button
                    onClick={() => handleLearn(dp)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-accent-text/70 hover:text-accent-text hover:bg-accent-muted border border-transparent hover:border-accent/20 transition-all opacity-0 group-hover:opacity-100"
                    title="Learn node schemas via AI"
                  >
                    <GraduationCap className="w-3 h-3" />
                    Learn
                  </button>
                )}
                {dp.isLearning && (
                  <span className="text-[9px] text-accent-text/70 animate-pulse px-2">
                    Learning...
                  </span>
                )}

                {/* GitHub link */}
                {dp.reference && (
                  <a
                    href={dp.reference}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-content-faint hover:text-content-secondary transition-colors opacity-0 group-hover:opacity-100"
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}

          {showUninstallConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm">
              <div className="mx-4 w-full max-w-md rounded-xl border border-border-strong bg-surface-elevated p-5 shadow-2xl">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-sm text-content-primary">Confirm Uninstall</h3>
                </div>

                <p className="mb-1 text-xs text-content-secondary">
                  Are you sure you want to uninstall{' '}
                  <span className="text-content-primary">
                    {packsWithStatus.find((p) => (p.packId || p.reference) === showUninstallConfirm)?.packTitle || showUninstallConfirm}
                  </span>
                  ?
                </p>
                <p className="mb-4 text-xs text-content-faint">
                  This removes the custom node pack. ComfyUI restart is required and workflows using this pack may stop working.
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowUninstallConfirm(null)}
                    className="rounded-lg px-3 py-1.5 text-xs text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const target = packsWithStatus.find((p) => (p.packId || p.reference) === showUninstallConfirm);
                      if (target) {
                        void handleSingleUninstall(target);
                      } else {
                        setShowUninstallConfirm(null);
                      }
                    }}
                    className="rounded-lg border border-red-500/30 bg-red-600/20 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-600/30"
                  >
                    Uninstall
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Install hint */}
          {(unpinnedPacks.length > 0 || missingPacks.length > 0) && (
            <div className="pt-1.5 border-t border-teal-500/10 mt-1">
              <p className="text-[9px] text-content-faint">
                Make sure these packs are installed in your ComfyUI before running the workflow.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});


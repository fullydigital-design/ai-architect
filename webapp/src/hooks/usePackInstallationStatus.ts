import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  checkPackInstallation,
  type PackInstallationStatus,
} from '../services/node-installation-checker';
import { invalidateObjectInfoCache } from '../services/comfyui-object-info-cache';

interface UsePackInstallationStatusParams {
  comfyuiUrl: string;
  detectedPacks: Array<{ name: string; reference: string; nodeTypes: string[] }>;
  enabled: boolean;
}

export function usePackInstallationStatus({
  comfyuiUrl,
  detectedPacks,
  enabled,
}: UsePackInstallationStatusParams) {
  const [statuses, setStatuses] = useState<PackInstallationStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checkSucceeded, setCheckSucceeded] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const lastReliableStatusesRef = useRef<PackInstallationStatus[]>([]);

  const runCheck = useCallback(async () => {
    if (!enabled || !comfyuiUrl || detectedPacks.length === 0) {
      setStatuses([]);
      setCheckSucceeded(true);
      setIsChecking(false);
      lastReliableStatusesRef.current = [];
      return;
    }

    setIsChecking(true);
    const result = await checkPackInstallation(comfyuiUrl, detectedPacks);
    const hasReliableResult = result.checkSucceeded || result.usedCachedObjectInfo === true;
    if (hasReliableResult) {
      setStatuses(result.statuses);
      lastReliableStatusesRef.current = result.statuses;
    } else if (lastReliableStatusesRef.current.length > 0) {
      setStatuses(lastReliableStatusesRef.current);
    } else {
      setStatuses(result.statuses);
    }
    setCheckSucceeded(hasReliableResult || lastReliableStatusesRef.current.length > 0);
    setIsChecking(false);
  }, [enabled, comfyuiUrl, detectedPacks]);

  useEffect(() => {
    let cancelled = false;
    const execute = async () => {
      if (cancelled) return;
      await runCheck();
    };
    void execute();
    return () => {
      cancelled = true;
    };
  }, [runCheck, refreshTick]);

  const installedPacks = useMemo(
    () => statuses.filter((s) => s.isInstalled),
    [statuses],
  );
  const missingPacks = useMemo(
    () => statuses.filter((s) => !s.isInstalled),
    [statuses],
  );

  const refresh = useCallback(() => {
    invalidateObjectInfoCache();
    setRefreshTick((v) => v + 1);
  }, []);

  return {
    statuses,
    installedPacks,
    missingPacks,
    isChecking,
    checkSucceeded,
    refresh,
  };
}

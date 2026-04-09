import { useCallback, useState } from 'react';
import type { PackInfo } from '../app/services/node-pack-mapper';
import {
  buildManagerPackBody,
  installPack,
  uninstallPack,
  updatePack,
  rebootComfyUI,
  invalidateManagerCaches,
} from '../app/services/comfyui-manager-service';
import { resolveComfyUIBaseUrl } from '../services/api-config';

export type InstallAction = 'install' | 'uninstall' | 'update';
export type InstallStatus =
  | 'idle'
  | 'installing'
  | 'uninstalling'
  | 'updating'
  | 'success'
  | 'error'
  | 'restart-needed';

export interface PackInstallState {
  status: InstallStatus;
  error?: string;
  packId?: string;
}

interface UsePackInstallerOptions {
  comfyuiUrl?: string;
  managerAvailable?: boolean;
  onAfterRestart?: () => Promise<void> | void;
}

interface InstallAllSummary {
  total: number;
  completed: number;
  failed: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePackInstaller(options: UsePackInstallerOptions = {}) {
  const { comfyuiUrl, managerAvailable = true, onAfterRestart } = options;
  const [packStates, setPackStates] = useState<Map<string, PackInstallState>>(new Map());
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);

  const setPackState = useCallback((packId: string, state: PackInstallState) => {
    setPackStates((prev) => {
      const next = new Map(prev);
      next.set(packId, state);
      return next;
    });
  }, []);

  const performAction = useCallback(async (action: InstallAction, packInfo: PackInfo): Promise<boolean> => {
    const packId = packInfo.id || packInfo.reference || packInfo.repository || packInfo.title;
    if (!packId) return false;

    if (!managerAvailable) {
      setPackState(packId, { status: 'error', error: 'ComfyUI-Manager not detected', packId });
      setLastError('ComfyUI-Manager not detected');
      return false;
    }

    setLastError(null);
    const inProgressStatus: InstallStatus =
      action === 'install' ? 'installing' : action === 'uninstall' ? 'uninstalling' : 'updating';
    setPackState(packId, { status: inProgressStatus, packId });

    try {
      const payload = buildManagerPackBody(packInfo as unknown as Record<string, any>);
      const result = action === 'install'
        ? await installPack(payload, comfyuiUrl)
        : action === 'uninstall'
          ? await uninstallPack(payload, comfyuiUrl)
          : await updatePack(payload, comfyuiUrl);

      if (!result.success) {
        const message = result.error || `Failed to ${action} pack`;
        setPackState(packId, { status: 'error', error: message, packId });
        setLastError(message);
        return false;
      }

      setPackState(packId, { status: 'restart-needed', packId });
      setRestartNeeded(true);
      invalidateManagerCaches();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${action} pack`;
      setPackState(packId, { status: 'error', error: message, packId });
      setLastError(message);
      return false;
    }
  }, [comfyuiUrl, managerAvailable, setPackState]);

  const installAllMissing = useCallback(async (packs: PackInfo[]): Promise<InstallAllSummary> => {
    const total = packs.length;
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < packs.length; i += 1) {
      const pack = packs[i];
      setProgressText(`Installing ${i + 1}/${total}: ${pack.title || pack.id}...`);
      const ok = await performAction('install', pack);
      if (ok) completed += 1;
      else failed += 1;
    }

    setProgressText('');
    return { total, completed, failed };
  }, [performAction]);

  const waitForRestart = useCallback(async (maxWaitMs = 120_000): Promise<boolean> => {
    const base = resolveComfyUIBaseUrl(comfyuiUrl || '');
    const start = Date.now();

    await sleep(3000);

    while (Date.now() - start < maxWaitMs) {
      try {
        const response = await fetch(`${base}/`, { method: 'GET', signal: AbortSignal.timeout(3000) });
        if (response.ok) return true;
      } catch {
        // server still restarting
      }
      await sleep(2000);
    }

    return false;
  }, [comfyuiUrl]);

  const triggerRestart = useCallback(async (): Promise<boolean> => {
    if (isRestarting) return false;
    setIsRestarting(true);
    setProgressText('Restarting ComfyUI...');
    setLastError(null);

    try {
      const rebooted = await rebootComfyUI(comfyuiUrl);
      if (!rebooted) {
        setLastError('Failed to trigger ComfyUI restart');
        return false;
      }

      const restarted = await waitForRestart();
      if (!restarted) {
        setLastError('ComfyUI restart timed out. Please restart manually.');
        return false;
      }

      invalidateManagerCaches();
      if (onAfterRestart) {
        await onAfterRestart();
      }

      setPackStates((prev) => {
        const next = new Map(prev);
        for (const [packId, state] of next.entries()) {
          if (state.status === 'restart-needed') {
            next.set(packId, { status: 'success', packId });
          }
        }
        return next;
      });

      setRestartNeeded(false);
      setProgressText('Restart complete.');
      await sleep(1200);
      setProgressText('');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed during restart';
      setLastError(message);
      return false;
    } finally {
      setIsRestarting(false);
    }
  }, [comfyuiUrl, isRestarting, onAfterRestart, waitForRestart]);

  const getPackState = useCallback((packId: string): PackInstallState => {
    return packStates.get(packId) || { status: 'idle', packId };
  }, [packStates]);

  return {
    performAction,
    installAllMissing,
    triggerRestart,
    getPackState,
    restartNeeded,
    isRestarting,
    progressText,
    lastError,
    packStates,
  };
}

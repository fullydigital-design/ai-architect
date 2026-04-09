import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export type BatchPackStatus = 'waiting' | 'installing' | 'succeeded' | 'failed';

export interface InstallablePackLike {
  packId?: string;
  packTitle?: string;
  title?: string;
  name?: string;
  reference: string;
  status?: string;
  installed?: boolean;
  isMissing?: boolean;
}

export interface InstallBatchProgress {
  current: number;
  total: number;
  currentPackName: string;
}

export interface InstallBatchResults {
  succeeded: string[];
  failed: Array<{ name: string; error: string }>;
}

export interface UseInstallAllPacksParams<TPack extends InstallablePackLike> {
  packs: TPack[];
  comfyuiUrl: string;
  installPackFn: (comfyuiUrl: string, reference: string) => Promise<boolean>;
  rebootFn: (comfyuiUrl: string) => Promise<boolean>;
}

export interface UseInstallAllPacksReturn {
  isInstalling: boolean;
  progress: InstallBatchProgress | null;
  results: InstallBatchResults | null;
  isDone: boolean;
  packStatuses: Map<string, BatchPackStatus>;
  installAll: () => Promise<void>;
  cancelInstall: () => void;
  reset: () => void;
  restartComfyUI: () => Promise<boolean>;
}

function getPackName(pack: InstallablePackLike): string {
  return pack.packTitle || pack.title || pack.name || pack.packId || pack.reference;
}

function isMissingPack(pack: InstallablePackLike): boolean {
  if (typeof pack.isMissing === 'boolean') return pack.isMissing;
  if (typeof pack.installed === 'boolean') return !pack.installed;

  const status = (pack.status ?? '').toLowerCase();
  if (!status) return true;
  return status === 'missing' || status === 'not-installed' || status === 'unknown' || status === 'failed';
}

export function useInstallAllPacks<TPack extends InstallablePackLike>({
  packs,
  comfyuiUrl,
  installPackFn,
  rebootFn,
}: UseInstallAllPacksParams<TPack>): UseInstallAllPacksReturn {
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallBatchProgress | null>(null);
  const [results, setResults] = useState<InstallBatchResults | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [packStatuses, setPackStatuses] = useState<Map<string, BatchPackStatus>>(new Map());
  const abortRef = useRef(false);

  const missingPacks = useMemo(() => packs.filter(isMissingPack), [packs]);

  const cancelInstall = useCallback(() => {
    if (!isInstalling) return;
    abortRef.current = true;
    toast.info('Cancelling installation after current pack...');
  }, [isInstalling]);

  const reset = useCallback(() => {
    abortRef.current = false;
    setIsInstalling(false);
    setProgress(null);
    setResults(null);
    setIsDone(false);
    setPackStatuses(new Map());
  }, []);

  const installAll = useCallback(async () => {
    abortRef.current = false;
    const targetPacks = missingPacks;

    if (targetPacks.length === 0) {
      toast.info('All packs already installed');
      return;
    }

    setIsInstalling(true);
    setIsDone(false);
    setProgress({
      current: 0,
      total: targetPacks.length,
      currentPackName: '',
    });
    setResults({ succeeded: [], failed: [] });
    setPackStatuses(() => {
      const init = new Map<string, BatchPackStatus>();
      for (const pack of targetPacks) {
        init.set(pack.reference, 'waiting');
      }
      return init;
    });

    const succeeded: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (let i = 0; i < targetPacks.length; i++) {
      if (abortRef.current) break;

      const pack = targetPacks[i];
      const packName = getPackName(pack);

      setProgress({
        current: i + 1,
        total: targetPacks.length,
        currentPackName: packName,
      });
      setPackStatuses((prev) => {
        const next = new Map(prev);
        next.set(pack.reference, 'installing');
        return next;
      });

      try {
        const ok = await installPackFn(comfyuiUrl, pack.reference);
        if (ok) {
          succeeded.push(packName);
          setPackStatuses((prev) => {
            const next = new Map(prev);
            next.set(pack.reference, 'succeeded');
            return next;
          });
        } else {
          const errorMessage = 'Install failed';
          failed.push({ name: packName, error: errorMessage });
          setPackStatuses((prev) => {
            const next = new Map(prev);
            next.set(pack.reference, 'failed');
            return next;
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ name: packName, error: errorMessage });
        setPackStatuses((prev) => {
          const next = new Map(prev);
          next.set(pack.reference, 'failed');
          return next;
        });
      }
    }

    const total = targetPacks.length;
    setResults({ succeeded, failed });
    setIsInstalling(false);
    setIsDone(true);

    if (abortRef.current) {
      toast.warning(`Install cancelled. Installed ${succeeded.length}/${total}.`);
      return;
    }

    if (failed.length === 0) {
      toast.success(`Installed ${succeeded.length} packs. Restart ComfyUI to activate.`);
    } else if (succeeded.length === 0) {
      toast.error(`All ${total} installations failed.`);
    } else {
      toast.warning(`Installed ${succeeded.length}/${total}. ${failed.length} failed.`);
    }
  }, [missingPacks, installPackFn, comfyuiUrl]);

  const restartComfyUI = useCallback(async (): Promise<boolean> => {
    const ok = await rebootFn(comfyuiUrl);
    if (ok) {
      toast.success('Restarting ComfyUI... This takes 15-30 seconds.');
    } else {
      toast.error('Failed to restart ComfyUI');
    }
    return ok;
  }, [rebootFn, comfyuiUrl]);

  return {
    isInstalling,
    progress,
    results,
    isDone,
    packStatuses,
    installAll,
    cancelInstall,
    reset,
    restartComfyUI,
  };
}

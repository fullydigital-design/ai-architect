import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, Package, RotateCcw, XCircle } from 'lucide-react';
import { useInstallAllPacks, type BatchPackStatus, type InstallablePackLike } from '../../../hooks/useInstallAllPacks';

interface InstallAllMissingButtonProps<TPack extends InstallablePackLike> {
  missingPacks: TPack[];
  comfyuiUrl: string;
  managerAvailable: boolean;
  installPackFn: (comfyuiUrl: string, reference: string) => Promise<boolean>;
  rebootFn: (comfyuiUrl: string) => Promise<boolean>;
  onInstallComplete?: () => void;
  onPackStatusesChange?: (statuses: Map<string, BatchPackStatus>) => void;
  onRestartRequested?: () => void;
}

function getPackName(pack: InstallablePackLike): string {
  return pack.packTitle || pack.title || pack.name || pack.packId || pack.reference;
}

export function InstallAllMissingButton<TPack extends InstallablePackLike>({
  missingPacks,
  comfyuiUrl,
  managerAvailable,
  installPackFn,
  rebootFn,
  onInstallComplete,
  onPackStatusesChange,
  onRestartRequested,
}: InstallAllMissingButtonProps<TPack>) {
  const [activePacks, setActivePacks] = useState<TPack[]>(missingPacks);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  useEffect(() => {
    setActivePacks(missingPacks);
  }, [missingPacks]);

  const {
    isInstalling,
    progress,
    results,
    isDone,
    packStatuses,
    installAll,
    cancelInstall,
    reset,
    restartComfyUI,
  } = useInstallAllPacks({
    packs: activePacks,
    comfyuiUrl,
    installPackFn,
    rebootFn,
  });

  useEffect(() => {
    onPackStatusesChange?.(packStatuses);
  }, [packStatuses, onPackStatusesChange]);

  useEffect(() => {
    if (!isInstalling && isDone) {
      onInstallComplete?.();
    }
  }, [isInstalling, isDone, onInstallComplete]);

  const missingCount = missingPacks.length;
  const percent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const failedSet = useMemo(() => {
    const set = new Set<string>();
    for (const item of results?.failed ?? []) {
      set.add(item.name);
    }
    return set;
  }, [results?.failed]);

  const retryFailed = async () => {
    const failedPacks = missingPacks.filter((pack) => failedSet.has(getPackName(pack)));
    if (failedPacks.length === 0) return;
    setActivePacks(failedPacks);
    reset();
    await installAll();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      if (e.key.toLowerCase() !== 'i') return;

      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable;
      if (isEditable) return;

      if (!managerAvailable || missingCount === 0 || isInstalling) return;
      e.preventDefault();
      void installAll();
      toast.info('Installing all missing custom node packs...');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [managerAvailable, missingCount, isInstalling, installAll]);

  if (missingCount === 0) return null;

  if (!managerAvailable) {
    return (
      <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
          <div>
            <p className="text-xs text-amber-200">ComfyUI-Manager not detected. Install it first.</p>
            <p className="mt-1 text-[10px] text-amber-100/80">Install buttons require ComfyUI-Manager.</p>
          </div>
        </div>
        <button
          type="button"
          disabled
          title="Requires ComfyUI-Manager"
          className="mt-3 w-full rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/70 cursor-not-allowed"
        >
          Install All Missing ({missingCount} packs)
        </button>
      </div>
    );
  }

  if (isInstalling) {
    return (
      <div className="mb-3 rounded-lg border border-blue-500/25 bg-blue-500/[0.06] p-3 space-y-2">
        <p className="text-xs text-blue-200">
          Installing {progress?.current ?? 0}/{progress?.total ?? activePacks.length}: {progress?.currentPackName || 'Starting...'}
        </p>
        <div className="h-2 w-full overflow-hidden rounded bg-surface-secondary">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-blue-200/80">{percent}%</span>
          <button
            type="button"
            onClick={cancelInstall}
            className="rounded border border-blue-400/30 px-2 py-1 text-[10px] text-blue-200 hover:bg-blue-500/15"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (isDone && results) {
    const total = results.succeeded.length + results.failed.length;
    const allSucceeded = results.failed.length === 0;
    const allFailed = results.succeeded.length === 0;
    const toneClass = allSucceeded
      ? 'border-emerald-500/25 bg-emerald-500/[0.08]'
      : allFailed
        ? 'border-red-500/25 bg-red-500/[0.08]'
        : 'border-amber-500/25 bg-amber-500/[0.08]';

    return (
      <div className={`mb-3 rounded-lg ${toneClass} p-3 space-y-2`}>
        <div className="flex items-center gap-2">
          {allSucceeded ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          )}
          <p className="text-xs text-content-primary">
            Installed {results.succeeded.length}/{total} packs
          </p>
        </div>

        {results.failed.length > 0 && (
          <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
            <p className="text-[10px] text-red-200 mb-1">Failed ({results.failed.length}):</p>
            <ul className="space-y-1">
              {results.failed.map((f) => (
                <li key={f.name} className="text-[10px] text-red-100/90 flex items-start gap-1.5">
                  <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{f.name} - {f.error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRestartConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent-muted hover:bg-accent-muted/80 border border-accent/30 px-3 py-1.5 text-xs text-accent-text"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart ComfyUI
          </button>

          {results.failed.length > 0 && (
            <button
              type="button"
              onClick={retryFailed}
              className="rounded-md border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/25"
            >
              Install Failed Again
            </button>
          )}
        </div>

        {showRestartConfirm && (
          <div className="mt-2 rounded-md border border-border-strong bg-surface-secondary p-3">
            <p className="text-xs text-content-primary mb-2">Restart ComfyUI?</p>
            <p className="text-[10px] text-content-secondary mb-3">
              This will interrupt any running generations and restart the ComfyUI server.
              The server will be unavailable for 15-30 seconds.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRestartConfirm(false)}
                className="rounded border border-border-strong px-2.5 py-1 text-[10px] text-content-primary hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowRestartConfirm(false);
                  onRestartRequested?.();
                  await restartComfyUI();
                  onInstallComplete?.();
                }}
                className="rounded border border-accent/30 bg-accent-muted px-2.5 py-1 text-[10px] text-accent-text hover:bg-accent-muted/80"
              >
                Restart Now
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-lg border border-blue-500/25 bg-blue-500/[0.06] p-3">
      <button
        type="button"
        onClick={installAll}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-accent-muted hover:bg-accent-muted/80 border border-accent/30 px-3 py-2 text-xs text-accent-text"
      >
        <Package className="h-3.5 w-3.5" />
        Install All Missing ({missingCount} packs)
      </button>
      <p className="mt-2 text-[10px] text-content-secondary">
        Uses ComfyUI-Manager. Requires restart after installation.
      </p>
    </div>
  );
}

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { ModelAvailability } from '../services/model-availability-service';
import type { ModelSourceMatch } from '../services/model-source-matcher';
import { invalidateObjectInfoCache } from '../services/comfyui-object-info-cache';
import {
  invalidateManagerNodeListCache,
  waitForComfyUI,
} from '../app/services/comfyui-manager-service';

export type InstallEverythingPhase =
  | 'idle'
  | 'installing_packs'
  | 'waiting_restart'
  | 'restarting'
  | 'downloading_models'
  | 'done'
  | 'error';

interface MissingPackLike {
  packName: string;
  packReference: string;
}

interface UseInstallEverythingParams {
  missingPacks: MissingPackLike[];
  missingModels: ModelAvailability[];
  modelSources: Map<string, ModelSourceMatch>;
  comfyuiUrl: string;
  installPackFn: (comfyuiUrl: string, reference: string) => Promise<boolean>;
  installModelFn: (comfyuiUrl: string, url: string, modelDir: string, filename: string) => Promise<boolean>;
  rebootFn: (comfyuiUrl: string) => Promise<boolean>;
  recheckManager?: () => Promise<boolean>;
  onRefreshAll?: () => void;
}

export function useInstallEverything({
  missingPacks,
  missingModels,
  modelSources,
  comfyuiUrl,
  installPackFn,
  installModelFn,
  rebootFn,
  recheckManager,
  onRefreshAll,
}: UseInstallEverythingParams) {
  const [phase, setPhase] = useState<InstallEverythingPhase>('idle');
  const [packProgress, setPackProgress] = useState({ current: 0, total: 0, name: '' });
  const [modelProgress, setModelProgress] = useState({ current: 0, total: 0, name: '', size: '' });
  const [currentAction, setCurrentAction] = useState('');
  const [results, setResults] = useState({
    packsSucceeded: [] as string[],
    packsFailed: [] as { name: string; error: string }[],
    modelsSucceeded: [] as string[],
    modelsFailed: [] as { name: string; error: string }[],
    modelsSkipped: [] as string[],
  });

  const reset = useCallback(() => {
    setPhase('idle');
    setPackProgress({ current: 0, total: 0, name: '' });
    setModelProgress({ current: 0, total: 0, name: '', size: '' });
    setCurrentAction('');
    setResults({
      packsSucceeded: [],
      packsFailed: [],
      modelsSucceeded: [],
      modelsFailed: [],
      modelsSkipped: [],
    });
  }, []);

  const installEverything = useCallback(async () => {
    reset();

    const nextResults = {
      packsSucceeded: [] as string[],
      packsFailed: [] as { name: string; error: string }[],
      modelsSucceeded: [] as string[],
      modelsFailed: [] as { name: string; error: string }[],
      modelsSkipped: [] as string[],
    };

    // STEP 1: install missing packs.
    setPhase('installing_packs');
    for (let i = 0; i < missingPacks.length; i++) {
      const pack = missingPacks[i];
      setPackProgress({ current: i + 1, total: missingPacks.length, name: pack.packName });
      setCurrentAction(`Installing pack ${i + 1}/${missingPacks.length}: ${pack.packName}...`);

      if (!pack.packReference?.trim()) {
        nextResults.packsFailed.push({ name: pack.packName, error: 'Missing manager reference' });
        continue;
      }

      try {
        const ok = await installPackFn(comfyuiUrl, pack.packReference);
        if (ok) nextResults.packsSucceeded.push(pack.packName);
        else nextResults.packsFailed.push({ name: pack.packName, error: 'Install failed' });
      } catch (error) {
        nextResults.packsFailed.push({
          name: pack.packName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // STEP 2: restart if at least one pack installed.
    if (nextResults.packsSucceeded.length > 0) {
      setPhase('waiting_restart');
      setCurrentAction('Restarting ComfyUI to activate installed packs...');

      const rebootOk = await rebootFn(comfyuiUrl);
      if (!rebootOk) {
        setPhase('error');
        setCurrentAction('Failed to trigger ComfyUI restart.');
        setResults(nextResults);
        return;
      }

      setPhase('restarting');
      const isBack = await waitForComfyUI(comfyuiUrl, 120_000);
      if (!isBack) {
        setPhase('error');
        setCurrentAction('ComfyUI restart timed out. Please restart manually.');
        setResults(nextResults);
        return;
      }

      invalidateObjectInfoCache();
      invalidateManagerNodeListCache();
      if (recheckManager) {
        await recheckManager();
      }
      onRefreshAll?.();
      toast.success('ComfyUI restart complete. Continuing with model downloads...');
    }

    // STEP 3: download missing models when URLs are known.
    setPhase('downloading_models');
    const downloadableModels = missingModels.filter((m) => !!modelSources.get(m.filename)?.downloadUrl);

    for (let i = 0; i < missingModels.length; i++) {
      const model = missingModels[i];
      const source = modelSources.get(model.filename);

      if (!source?.downloadUrl) {
        nextResults.modelsSkipped.push(model.filename);
        continue;
      }

      const progressIndex = downloadableModels.findIndex((m) => m.filename === model.filename);
      setModelProgress({
        current: progressIndex + 1,
        total: downloadableModels.length,
        name: model.filename,
        size: source.fileSizeFormatted || '',
      });
      setCurrentAction(`Downloading model ${progressIndex + 1}/${downloadableModels.length}: ${model.filename}...`);

      try {
        const ok = await installModelFn(comfyuiUrl, source.downloadUrl, model.modelFolder, model.filename);
        if (ok) nextResults.modelsSucceeded.push(model.filename);
        else nextResults.modelsFailed.push({ name: model.filename, error: 'Download failed' });
      } catch (error) {
        nextResults.modelsFailed.push({
          name: model.filename,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    setResults(nextResults);
    setPhase('done');
    setCurrentAction(
      `Done! ${nextResults.packsSucceeded.length} packs installed, `
      + `${nextResults.modelsSucceeded.length} model downloads started, `
      + `${nextResults.packsFailed.length + nextResults.modelsFailed.length} failed, `
      + `${nextResults.modelsSkipped.length} skipped (no URL).`,
    );
    onRefreshAll?.();

    const totalMissing = missingPacks.length + missingModels.length;
    const totalDone = nextResults.packsSucceeded.length + nextResults.modelsSucceeded.length;

    if (totalDone === totalMissing && nextResults.modelsFailed.length === 0 && nextResults.packsFailed.length === 0) {
      toast.success('All requirements satisfied. Workflow is ready to run.');
    } else {
      toast.warning(
        `Completed with gaps: packs ${nextResults.packsSucceeded.length}/${missingPacks.length}, models ${nextResults.modelsSucceeded.length}/${missingModels.length}.`,
      );
    }
  }, [
    reset,
    missingPacks,
    missingModels,
    modelSources,
    comfyuiUrl,
    installPackFn,
    installModelFn,
    rebootFn,
    recheckManager,
    onRefreshAll,
  ]);

  return {
    phase,
    packProgress,
    modelProgress,
    currentAction,
    results,
    installEverything,
    reset,
  };
}

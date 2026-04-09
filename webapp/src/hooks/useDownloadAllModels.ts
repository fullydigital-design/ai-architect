import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ModelAvailability } from '../services/model-availability-service';
import type { ModelSourceMatch } from '../services/model-source-matcher';

export type BatchModelStatus = 'waiting' | 'downloading' | 'succeeded' | 'failed' | 'skipped';

export interface DownloadProgress {
  current: number;
  total: number;
  currentModelName: string;
  currentModelSize: string;
}

export interface DownloadResults {
  succeeded: string[];
  failed: Array<{ name: string; error: string }>;
  skipped: string[];
}

interface UseDownloadAllModelsParams {
  models: ModelAvailability[];
  sources: Map<string, ModelSourceMatch>;
  comfyuiUrl: string;
  installModelFn: (comfyuiUrl: string, url: string, modelDir: string, filename: string) => Promise<void>;
}

interface UseDownloadAllModelsReturn {
  isDownloading: boolean;
  progress: DownloadProgress | null;
  results: DownloadResults | null;
  isDone: boolean;
  modelStatuses: Map<string, BatchModelStatus>;
  downloadAll: () => Promise<void>;
  reset: () => void;
}

function modelDisplayName(model: ModelAvailability): string {
  return model.filename || `${model.modelType} model`;
}

export function useDownloadAllModels({
  models,
  sources,
  comfyuiUrl,
  installModelFn,
}: UseDownloadAllModelsParams): UseDownloadAllModelsReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [results, setResults] = useState<DownloadResults | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [modelStatuses, setModelStatuses] = useState<Map<string, BatchModelStatus>>(new Map());

  const missingModels = useMemo(
    () => models.filter((m) => !m.isAvailable),
    [models],
  );

  const reset = useCallback(() => {
    setIsDownloading(false);
    setProgress(null);
    setResults(null);
    setIsDone(false);
    setModelStatuses(new Map());
  }, []);

  const downloadAll = useCallback(async () => {
    if (missingModels.length === 0) {
      toast.info('No missing models to download');
      return;
    }

    setIsDownloading(true);
    setIsDone(false);
    setResults({ succeeded: [], failed: [], skipped: [] });
    setProgress({
      current: 0,
      total: missingModels.length,
      currentModelName: '',
      currentModelSize: '',
    });

    setModelStatuses(() => {
      const initial = new Map<string, BatchModelStatus>();
      for (const model of missingModels) {
        initial.set(model.filename, 'waiting');
      }
      return initial;
    });

    const succeeded: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];
    const skipped: string[] = [];

    for (let i = 0; i < missingModels.length; i++) {
      const model = missingModels[i];
      const name = modelDisplayName(model);
      const source = sources.get(model.filename);

      if (!source?.downloadUrl) {
        skipped.push(name);
        setModelStatuses((prev) => {
          const next = new Map(prev);
          next.set(model.filename, 'skipped');
          return next;
        });
        continue;
      }

      setProgress({
        current: i + 1,
        total: missingModels.length,
        currentModelName: name,
        currentModelSize: source.fileSizeFormatted || 'Unknown size',
      });
      setModelStatuses((prev) => {
        const next = new Map(prev);
        next.set(model.filename, 'downloading');
        return next;
      });

      try {
        await installModelFn(
          comfyuiUrl,
          source.downloadUrl,
          model.modelFolder,
          model.filename,
        );
        succeeded.push(name);
        setModelStatuses((prev) => {
          const next = new Map(prev);
          next.set(model.filename, 'succeeded');
          return next;
        });
      } catch (error) {
        let message = error instanceof Error ? error.message : String(error);
        if (/401|403/.test(message)) {
          message = 'CivitAI API token required for this model';
        } else if (/404/.test(message)) {
          message = 'ComfyUI-Manager model endpoint not found. Download manually.';
        }
        failed.push({ name, error: message });
        setModelStatuses((prev) => {
          const next = new Map(prev);
          next.set(model.filename, 'failed');
          return next;
        });
      }
    }

    const finalResults: DownloadResults = { succeeded, failed, skipped };
    setResults(finalResults);
    setIsDownloading(false);
    setIsDone(true);

    if (failed.length === 0 && succeeded.length > 0) {
      toast.success(`Downloaded ${succeeded.length} model(s). Restart ComfyUI to activate.`);
    } else if (succeeded.length > 0) {
      toast.warning(`Downloaded ${succeeded.length}/${missingModels.length}. ${failed.length} failed, ${skipped.length} skipped.`);
    } else if (failed.length > 0) {
      toast.error(`All downloads failed (${failed.length}).`);
    } else {
      toast.info(`No downloadable models found. ${skipped.length} skipped.`);
    }
  }, [missingModels, sources, comfyuiUrl, installModelFn]);

  return {
    isDownloading,
    progress,
    results,
    isDone,
    modelStatuses,
    downloadAll,
    reset,
  };
}

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDownloadAllModels } from '../../../hooks/useDownloadAllModels';
import { formatModelType, modelTypeBadgeColor } from '../../../utils/workflow-model-extractor';
import type { ModelAvailability } from '../../../services/model-availability-service';
import type { ModelSourceMatch } from '../../../services/model-source-matcher';

interface RequiredModelsCardProps {
  models: ModelAvailability[];
  missingModels: ModelAvailability[];
  sources: Map<string, ModelSourceMatch>;
  comfyuiUrl: string;
  managerAvailable: boolean;
  isChecking: boolean;
  isSearchingSources: boolean;
  sourceSearchProgress?: { current: number; total: number } | null;
  checkFailed: boolean;
  totalMissingSizeFormatted: string;
  onRefresh: () => void;
  installModelFn: (comfyuiUrl: string, url: string, modelDir: string, filename: string) => Promise<void>;
  rebootFn: () => Promise<void>;
}

function sourceLabel(source: ModelSourceMatch): string {
  if (source.source === 'known_db') return `Known DB (${source.confidence})`;
  if (source.source === 'civitai') return `CivitAI (${source.confidence})`;
  if (source.source === 'huggingface') return `HuggingFace (${source.confidence})`;
  return 'Not found';
}

function statusIcon(status: string | undefined) {
  if (status === 'downloading') return <Loader2 className="w-3 h-3 text-blue-300 animate-spin" />;
  if (status === 'succeeded') return <Check className="w-3 h-3 text-emerald-400" />;
  if (status === 'failed') return <AlertTriangle className="w-3 h-3 text-red-400" />;
  if (status === 'skipped') return <AlertTriangle className="w-3 h-3 text-amber-400" />;
  return <span className="w-2 h-2 rounded-full bg-red-400" />;
}

export function RequiredModelsCard({
  models,
  missingModels,
  sources,
  comfyuiUrl,
  managerAvailable,
  isChecking,
  isSearchingSources,
  sourceSearchProgress,
  checkFailed,
  totalMissingSizeFormatted,
  onRefresh,
  installModelFn,
  rebootFn,
}: RequiredModelsCardProps) {
  const [showAvailable, setShowAvailable] = useState(false);
  const [singleStates, setSingleStates] = useState<Map<string, { status: 'idle' | 'downloading' | 'succeeded' | 'failed'; error?: string }>>(new Map());

  const {
    isDownloading,
    progress,
    results,
    isDone,
    modelStatuses,
    downloadAll,
    reset,
  } = useDownloadAllModels({
    models: missingModels,
    sources,
    comfyuiUrl,
    installModelFn,
  });

  const availableModels = useMemo(
    () => models.filter((m) => m.isAvailable),
    [models],
  );

  const downloadableCount = useMemo(
    () => missingModels.filter((m) => !!sources.get(m.filename)?.downloadUrl).length,
    [missingModels, sources],
  );

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const buildSearchTerm = (filename: string): string =>
    filename.replace(/\.(safetensors|ckpt|pth|pt|bin|onnx|gguf)$/i, '');

  const handleSingleDownload = async (model: ModelAvailability) => {
    const source = sources.get(model.filename);
    if (!source?.downloadUrl) {
      toast.warning('No direct download URL found for this model');
      return;
    }
    if (!managerAvailable) {
      toast.error('ComfyUI-Manager not detected');
      return;
    }

    setSingleStates((prev) => {
      const next = new Map(prev);
      next.set(model.filename, { status: 'downloading' });
      return next;
    });
    try {
      await installModelFn(
        comfyuiUrl,
        source.downloadUrl,
        model.modelFolder,
        model.filename,
      );
      toast.success(`Download started: ${model.filename}`);
      setSingleStates((prev) => {
        const next = new Map(prev);
        next.set(model.filename, { status: 'succeeded' });
        return next;
      });
      onRefresh();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to start download';
      toast.error(errMsg);
      setSingleStates((prev) => {
        const next = new Map(prev);
        next.set(model.filename, { status: 'failed', error: errMsg });
        return next;
      });
    }
  };

  if (models.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-accent/20 bg-indigo-500/[0.04] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs text-content-primary">
          <Package className="w-4 h-4 text-accent-text" />
          <span>
            Required Models <span className="text-accent-text">({models.length} total)</span>
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border-strong text-content-primary hover:bg-surface-elevated/60"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="px-3.5 pb-3 pt-0 border-t border-indigo-500/10 space-y-2">
        {isChecking && (
          <p className="text-[11px] text-content-secondary pt-2">Scanning for installed models...</p>
        )}
        {checkFailed && (
          <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
            Could not verify model availability - ComfyUI offline or unreachable.
          </div>
        )}
        {isSearchingSources && sourceSearchProgress && (
          <p className="text-[10px] text-content-muted">
            Searching sources: {sourceSearchProgress.current}/{sourceSearchProgress.total}...
          </p>
        )}

        {missingModels.length > 0 && (
          <div className="rounded-lg border border-blue-500/25 bg-blue-500/[0.06] p-3 mt-2">
            {!isDownloading && !isDone && (
              <>
                <button
                  onClick={() => void downloadAll()}
                  disabled={!managerAvailable || downloadableCount === 0}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-indigo-500/30 hover:bg-indigo-500/40 disabled:opacity-40 border border-indigo-400/30 px-3 py-2 text-xs text-indigo-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download All Missing ({missingModels.length} models, ~{totalMissingSizeFormatted})
                </button>
                <p className="mt-2 text-[10px] text-content-secondary">
                  Uses ComfyUI-Manager. Large downloads may take several minutes per model.
                </p>
                {!managerAvailable && (
                  <p className="mt-1 text-[10px] text-amber-300">
                    ComfyUI-Manager not detected. You can still open manual download links.
                  </p>
                )}
              </>
            )}

            {isDownloading && (
              <div className="space-y-2">
                <p className="text-xs text-blue-200">
                  Downloading {progress?.current ?? 0}/{progress?.total ?? missingModels.length}: {progress?.currentModelName || 'Starting...'} ({progress?.currentModelSize || 'Unknown size'})
                </p>
                <div className="h-2 w-full overflow-hidden rounded bg-surface-secondary">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-[10px] text-blue-200/80">{progressPercent}%</p>
              </div>
            )}

            {!isDownloading && isDone && results && (
              <div className="space-y-2">
                <p className="text-xs text-gray-100">
                  Download complete: {results.succeeded.length} succeeded, {results.failed.length} failed, {results.skipped.length} skipped
                </p>
                {results.failed.length > 0 && (
                  <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
                    <p className="text-[10px] text-red-200 mb-1">Failed downloads:</p>
                    <ul className="space-y-1">
                      {results.failed.map((f) => (
                        <li key={f.name} className="text-[10px] text-red-100/90">- {f.name}: {f.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await rebootFn();
                      toast.success('Restarting ComfyUI... This takes 15-30 seconds.');
                    }}
                    className="rounded-md bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/30 px-3 py-1.5 text-xs text-indigo-100"
                  >
                    Restart ComfyUI
                  </button>
                  <button
                    onClick={() => {
                      reset();
                      void downloadAll();
                    }}
                    className="rounded-md border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/25"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-1">
          <button
            onClick={() => setShowAvailable((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-content-primary hover:text-gray-100"
          >
            {showAvailable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Available Models ({availableModels.length})
          </button>
          {showAvailable && (
            <div className="mt-1 space-y-1">
              {availableModels.map((model) => (
                <div key={`${model.modelType}-${model.filename}`} className="flex items-center justify-between rounded px-2 py-1 bg-surface-inset/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[11px] text-content-primary truncate" title={model.filename}>{model.filename}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${modelTypeBadgeColor(model.modelType)}`}>
                    {formatModelType(model.modelType)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-content-primary">Missing Models ({missingModels.length})</p>
          {missingModels.map((model) => {
            const source = sources.get(model.filename);
            const rowStatus = modelStatuses.get(model.filename);
            const singleState = singleStates.get(model.filename);
            const effectiveStatus = singleState?.status === 'downloading'
              ? 'downloading'
              : singleState?.status === 'succeeded'
                ? 'succeeded'
                : singleState?.status === 'failed'
                  ? 'failed'
                  : rowStatus;
            const sourceFound = source && source.source !== 'not_found';
            return (
              <div key={`${model.modelType}-${model.filename}`} className="rounded border border-border-default bg-surface-inset p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {statusIcon(effectiveStatus)}
                      <span className="text-[11px] text-content-primary truncate" title={model.filename}>{model.filename}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${modelTypeBadgeColor(model.modelType)}`}>
                        {formatModelType(model.modelType)}
                      </span>
                    </div>
                    {isSearchingSources && !source && (
                      <p className="text-[10px] text-content-muted mt-1 inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Searching for download source...
                      </p>
                    )}
                    {source && source.source !== 'not_found' && (
                      <div className="mt-1 space-y-1">
                        <p className="text-[10px] text-content-secondary">Source: {sourceLabel(source)}</p>
                        {source.fileSizeFormatted && (
                          <p className="text-[10px] text-content-muted">Size: {source.fileSizeFormatted}</p>
                        )}
                        {model.availableAlternatives.length > 0 && (
                          <details className="text-[10px] text-content-muted">
                            <summary className="cursor-pointer">You have similar models</summary>
                            <p className="mt-1">{model.availableAlternatives.slice(0, 5).join(', ')}</p>
                          </details>
                        )}
                      </div>
                    )}
                    {source && source.source === 'not_found' && (
                      <p className="text-[10px] text-amber-300 mt-1">
                        Not found online - manual download needed
                      </p>
                    )}
                    {singleState?.status === 'failed' && (
                      <p className="text-[10px] text-red-300 mt-1">
                        Failed: {singleState.error || 'Download failed'}
                      </p>
                    )}
                    {singleState?.status === 'succeeded' && (
                      <p className="text-[10px] text-emerald-300 mt-1">Downloaded. Refresh to verify availability.</p>
                    )}
                  </div>

                  {source?.previewImageUrl && (
                    <img
                      src={source.previewImageUrl}
                      alt={source.modelName}
                      className="w-12 h-12 rounded object-cover border border-border-default"
                    />
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {source?.pageUrl && (
                    <a
                      href={source.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[10px] text-content-primary hover:bg-surface-elevated/50"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Page
                    </a>
                  )}
                  {sourceFound && source?.downloadUrl && (
                    managerAvailable ? (
                      <button
                        onClick={() => void handleSingleDownload(model)}
                        disabled={singleState?.status === 'downloading'}
                        className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {singleState?.status === 'downloading' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        {singleState?.status === 'failed' ? 'Retry' : 'Download'}
                      </button>
                    ) : (
                      <a
                        href={source.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-indigo-400/30 bg-accent-muted px-2 py-1 text-[10px] text-indigo-100 hover:bg-indigo-500/30"
                      >
                        <Download className="w-3 h-3" />
                        Open Download
                      </a>
                    )
                  )}
                  {(!source || source.source === 'not_found') && (
                    <>
                      <a
                        href={`https://civitai.com/search/models?sortBy=Highest_Rated&query=${encodeURIComponent(buildSearchTerm(model.filename))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[10px] text-content-primary hover:bg-surface-elevated/50"
                      >
                        <Search className="w-3 h-3" />
                        Search CivitAI
                      </a>
                      <a
                        href={`https://huggingface.co/models?search=${encodeURIComponent(buildSearchTerm(model.filename))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[10px] text-content-primary hover:bg-surface-elevated/50"
                      >
                        <Search className="w-3 h-3" />
                        Search HuggingFace
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(`${model.filename} safetensors download`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[10px] text-content-primary hover:bg-surface-elevated/50"
                      >
                        <Search className="w-3 h-3" />
                        Search Google
                      </a>
                    </>
                  )}
                  {singleState?.status === 'failed' && source?.downloadUrl && (
                    <a
                      href={source.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/20"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Manual Download
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

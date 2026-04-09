import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Folder as FolderIcon,
  Lock,
  Loader2,
  RefreshCw,
  Terminal,
  XCircle,
} from 'lucide-react';
import type { MissingModel } from '../../../services/model-download-service';

interface MissingModelsPanelProps {
  models: MissingModel[];
  onDownload: (model: MissingModel) => void;
  onDownloadAll: () => void;
  onRetry: (model: MissingModel) => void;
  onManualDownload: (model: MissingModel, url: string) => void;
}

const MODEL_TYPE_FOLDERS: Record<string, { folder: string; description: string; examples: string[] }> = {
  checkpoints: {
    folder: 'models/checkpoints',
    description: 'Full model checkpoints (SD 1.5, SDXL, etc.)',
    examples: ['sd_xl_base_1.0.safetensors', 'v1-5-pruned-emaonly.safetensors'],
  },
  checkpoint: {
    folder: 'models/checkpoints',
    description: 'Full model checkpoints (SD 1.5, SDXL, etc.)',
    examples: ['sd_xl_base_1.0.safetensors'],
  },
  loras: {
    folder: 'models/loras',
    description: 'LoRA fine-tuning weights',
    examples: ['add_detail.safetensors'],
  },
  lora: {
    folder: 'models/loras',
    description: 'LoRA fine-tuning weights',
    examples: ['add_detail.safetensors'],
  },
  vae: {
    folder: 'models/vae',
    description: 'VAE models for image encoding/decoding',
    examples: ['ae.safetensors', 'sdxl_vae.safetensors'],
  },
  clip: {
    folder: 'models/clip',
    description: 'CLIP text encoder models',
    examples: ['clip_l.safetensors', 't5xxl_fp8_e4m3fn.safetensors'],
  },
  clip_vision: {
    folder: 'models/clip_vision',
    description: 'CLIP vision encoder models (for IP-Adapter, etc.)',
    examples: ['clip_vision_g.safetensors'],
  },
  unet: {
    folder: 'models/diffusion_models',
    description: 'Diffusion model / UNet weights (FLUX, SD3, etc.)',
    examples: ['flux1-dev.safetensors', 'flux1-schnell.safetensors'],
  },
  diffusion_models: {
    folder: 'models/diffusion_models',
    description: 'Diffusion model weights (modern format, same as unet)',
    examples: ['flux1-dev.safetensors'],
  },
  diffusion_model: {
    folder: 'models/diffusion_models',
    description: 'Diffusion model weights',
    examples: ['flux1-dev.safetensors'],
  },
  controlnet: {
    folder: 'models/controlnet',
    description: 'ControlNet conditioning models',
    examples: ['control_v11p_sd15_canny.safetensors'],
  },
  upscale_models: {
    folder: 'models/upscale_models',
    description: 'Image upscaling models (ESRGAN, etc.)',
    examples: ['4x-UltraSharp.pth', 'RealESRGAN_x4plus.pth'],
  },
  upscale_model: {
    folder: 'models/upscale_models',
    description: 'Image upscaling models',
    examples: ['4x-UltraSharp.pth'],
  },
  upscale: {
    folder: 'models/upscale_models',
    description: 'Image upscaling models',
    examples: ['4x-UltraSharp.pth'],
  },
  embeddings: {
    folder: 'models/embeddings',
    description: 'Textual inversion embeddings',
    examples: ['EasyNegative.safetensors', 'bad_prompt.pt'],
  },
  embedding: {
    folder: 'models/embeddings',
    description: 'Textual inversion embeddings',
    examples: ['EasyNegative.safetensors'],
  },
  style_models: {
    folder: 'models/style_models',
    description: 'Style transfer models',
    examples: [],
  },
  hypernetworks: {
    folder: 'models/hypernetworks',
    description: 'Hypernetwork models',
    examples: [],
  },
  ipadapter: {
    folder: 'models/ipadapter',
    description: 'IP-Adapter models for image-guided generation',
    examples: ['ip-adapter-plus_sd15.safetensors'],
  },
  TAESD: {
    folder: 'models/vae_approx',
    description: 'Tiny AutoEncoder models for fast preview decoding',
    examples: ['taef1_decoder.pth', 'taesd_decoder.pth'],
  },
  vae_approx: {
    folder: 'models/vae_approx',
    description: 'Approximate VAE for fast previews',
    examples: ['taef1_decoder.pth'],
  },
};

const FOLDER_REFERENCE_ALIAS_KEYS = new Set([
  'checkpoint',
  'lora',
  'upscale_model',
  'diffusion_model',
  'diffusion_models',
  'upscale',
  'embedding',
]);

function getModelKey(model: MissingModel): string {
  return `${model.type}:${model.filename}`.toLowerCase();
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function typeLabel(type: MissingModel['type']): string {
  const labels: Record<MissingModel['type'], string> = {
    checkpoint: 'Checkpoint',
    lora: 'LoRA',
    vae: 'VAE',
    upscale: 'Upscaler',
    embedding: 'Embedding',
    unet: 'UNET',
    clip: 'CLIP',
    controlnet: 'ControlNet',
    ipadapter: 'IP-Adapter',
  };
  return labels[type] || type;
}

function getComfyUIModelPath(savePath: string): string {
  const normalized = (savePath || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const pathMap: Record<string, string> = {
    diffusion_models: 'models/diffusion_models',
    unet: 'models/unet',
    checkpoints: 'models/checkpoints',
    vae: 'models/vae',
    clip: 'models/clip',
    loras: 'models/loras',
    controlnet: 'models/controlnet',
    upscale_models: 'models/upscale_models',
    embeddings: 'models/embeddings',
    text_encoders: 'models/text_encoders',
    vae_approx: 'models/vae_approx',
  };
  if (!normalized) return 'models/checkpoints';
  if (normalized.startsWith('models/')) return normalized;
  return pathMap[normalized] || `models/${normalized}`;
}

function getModelFolderInfo(modelType: string): { folder: string; description: string; examples: string[] } {
  const rawType = (modelType || '').trim();
  const info = MODEL_TYPE_FOLDERS[rawType] || MODEL_TYPE_FOLDERS[rawType.toLowerCase()];
  if (info) return info;
  const normalized = rawType.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') || 'checkpoints';
  return {
    folder: normalized.startsWith('models/') ? normalized : `models/${normalized}`,
    description: `${rawType || 'Unknown'} models`,
    examples: [],
  };
}

function buildManualDownloadCommand(model: MissingModel): string | null {
  const gatedInfo = model.downloadState.status === 'not-found' ? model.downloadState.modelInfo : undefined;
  const url = (gatedInfo?.url || model.downloadUrl || model.downloadInfo?.url || '').trim();
  if (!url) return null;
  const installPath = gatedInfo
    ? getComfyUIModelPath(gatedInfo.save_path)
    : getComfyUIModelPath(model.downloadInfo?.installPath || 'models/checkpoints');
  if (gatedInfo) {
    return `curl -L "${url}" --header "Authorization: Bearer YOUR_HF_TOKEN" -o "ComfyUI/${installPath}/${gatedInfo.filename}"`;
  }
  return `curl -L "${url}" -o "ComfyUI/${installPath}/${model.filename}"`;
}

function stateLabel(model: MissingModel): string {
  const state = model.downloadState.status;
  if (state === 'downloading') {
    const percent = Math.max(0, Math.min(100, Math.round(model.downloadState.progress)));
    return percent <= 5 ? 'Queued' : `Downloading ${percent}%`;
  }
  if (state === 'complete') return 'Installed';
  if (state === 'ready') return 'Ready';
  if (state === 'not-found') return 'Manual install required';
  if (state === 'error') return 'Failed';
  if (state === 'resolving') return 'Fetching registry...';
  return 'Pending';
}

function getModelDownloadUrl(model: MissingModel): string | null {
  return model.registryUrl
    || model.downloadUrl
    || model.downloadInfo?.url
    || (model.downloadState.status === 'not-found' ? model.downloadState.modelInfo?.url : null)
    || null;
}

function getModelPageUrl(model: MissingModel): string | null {
  if (model.pageUrl) return model.pageUrl;
  if (model.downloadState.status === 'not-found' && model.downloadState.modelInfo?.huggingface_page) {
    return model.downloadState.modelInfo.huggingface_page;
  }
  if (model.downloadInfo?.modelPage) return model.downloadInfo.modelPage;

  const downloadUrl = getModelDownloadUrl(model);
  if (!downloadUrl) return null;

  if (downloadUrl.includes('huggingface.co')) {
    const match = downloadUrl.match(/https?:\/\/huggingface\.co\/([^/]+\/[^/]+)/i);
    if (match?.[1]) {
      return `https://huggingface.co/${match[1]}`;
    }
  }

  return null;
}

function ModelDownloadRow({
  model,
  isExpanded,
  onToggle,
  onDownload,
  onRetry,
  onManualDownload,
}: {
  model: MissingModel;
  isExpanded: boolean;
  onToggle: (modelKey: string) => void;
  onDownload: (model: MissingModel) => void;
  onRetry: (model: MissingModel) => void;
  onManualDownload: (model: MissingModel, url: string) => void;
}) {
  const [manualUrl, setManualUrl] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const modelKey = getModelKey(model);
  const progress = model.downloadState.status === 'downloading' ? Math.max(2, Math.min(100, model.downloadState.progress)) : 0;
  const manualCommand = buildManualDownloadCommand(model);
  const gatedInfo = model.downloadState.status === 'not-found' ? model.downloadState.modelInfo : undefined;
  const isGated = (model.downloadState.status === 'not-found' && model.downloadState.gated === true)
    || !!gatedInfo;
  const folderInfo = getModelFolderInfo(model.type);
  const downloadUrl = getModelDownloadUrl(model);
  const pageUrl = getModelPageUrl(model);

  return (
    <div className="overflow-hidden rounded-lg border border-border-strong/80 bg-surface-primary">
      <div
        className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-secondary/20"
        onClick={() => onToggle(modelKey)}
      >
        <div className="mt-0.5 rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-200">
          {typeLabel(model.type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-gray-100" title={model.displayName}>
            {model.displayName}
          </div>
          <div className="truncate text-[10px] text-content-muted" title={model.filename}>
            {model.filename}
          </div>
          <div className="mt-0.5 text-[10px] text-content-muted">
            {stateLabel(model)}
            {model.downloadInfo?.fileSize ? ` . ${formatFileSize(model.downloadInfo.fileSize)}` : ''}
            {model.downloadInfo?.source ? ` . ${model.downloadInfo.source}` : ''}
          </div>
        </div>

        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-content-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />

        <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
          {(model.downloadState.status === 'pending' || model.downloadState.status === 'resolving') && (
            <Loader2 className="h-4 w-4 animate-spin text-content-secondary" />
          )}

          {model.downloadState.status === 'ready' && (
            <button
              onClick={() => onDownload(model)}
              disabled={isGated}
              className="inline-flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/15 px-2 py-1 text-[10px] text-blue-200 hover:bg-blue-500/25 disabled:opacity-60"
            >
              <Download className="h-3 w-3" />
              Download
            </button>
          )}

          {model.downloadState.status === 'downloading' && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
          )}

          {model.downloadState.status === 'complete' && (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          )}

          {model.downloadState.status === 'error' && (
            <button
              onClick={() => onRetry(model)}
              disabled={isGated}
              className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/15 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/25 disabled:opacity-60"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}

          {model.downloadState.status === 'not-found' && (
            <XCircle className="h-4 w-4 text-amber-300" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2 border-t border-border-strong/30 px-3 pb-3 pt-2">
          {model.referencedBy.length > 0 && (
            <div className="text-[10px] text-content-muted">
              Used by {model.referencedBy.length} node{model.referencedBy.length === 1 ? '' : 's'}
            </div>
          )}

          {model.downloadState.status === 'downloading' && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[10px] text-blue-300">
                {progress <= 5 ? 'Queued in ComfyUI Manager...' : `${Math.round(progress)}%`}
                {model.downloadState.speed ? ` . ${model.downloadState.speed}` : ''}
                {model.downloadState.eta ? ` . ETA ${model.downloadState.eta}` : ''}
              </div>
            </div>
          )}

          {model.downloadState.status === 'error' && (
            <div className="text-[10px] text-red-300">{model.downloadState.message}</div>
          )}

          <div className="space-y-1.5 rounded-md border border-border-strong/50 bg-surface-inset/40 px-2.5 py-2">
            {downloadUrl && (
              <div className="flex items-center gap-2 text-xs">
                <ExternalLink className="h-3 w-3 shrink-0 text-blue-400" />
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-blue-400 underline underline-offset-2 hover:text-blue-300"
                  title={downloadUrl}
                >
                  Download {model.filename}
                </a>
                {isGated && (
                  <span className="rounded bg-amber-900/20 px-1.5 py-0.5 text-[10px] text-amber-400/80">
                    requires login
                  </span>
                )}
              </div>
            )}

            {pageUrl && pageUrl !== downloadUrl && (
              <div className="flex items-center gap-2 text-xs">
                <ExternalLink className="h-3 w-3 shrink-0 text-content-muted" />
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-content-secondary underline underline-offset-2 hover:text-content-primary"
                  title={pageUrl}
                >
                  View model page on HuggingFace
                </a>
              </div>
            )}

            {!downloadUrl && !pageUrl && (
              <div className="flex items-start gap-2 text-xs text-content-muted">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  No download URL available. Search for "{model.filename}" on HuggingFace or CivitAI.
                </span>
              </div>
            )}
          </div>

          {isGated && gatedInfo && (
            <div className="space-y-1.5 rounded border border-amber-500/25 bg-amber-500/8 p-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded border border-amber-500/25 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">
                  <Lock className="mr-1 h-2.5 w-2.5" />
                  Gated Model
                </span>
                <span className="text-[10px] text-amber-200">{gatedInfo.size}</span>
              </div>
              <div className="text-[10px] text-content-primary">{gatedInfo.description}</div>
              <div className="flex flex-wrap gap-1.5">
                <a
                  href={gatedInfo.huggingface_page}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-blue-500/25 bg-blue-500/15 px-2 py-1 text-[10px] text-blue-300 hover:bg-blue-500/25"
                >
                  <ExternalLink className="h-3 w-3" />
                  Accept License & Download
                </a>
                <a
                  href={gatedInfo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-border-strong/40 bg-surface-secondary/40 px-2 py-1 text-[10px] text-content-primary hover:bg-surface-secondary/70"
                >
                  <Download className="h-3 w-3" />
                  Download in Browser
                </a>
              </div>
            </div>
          )}

          {model.downloadState.status === 'not-found' && (
            <div className="space-y-1">
              <div
                className="text-[10px] text-amber-200"
                title="ComfyUI Manager only auto-installs models from its whitelist registry."
              >
                {model.downloadState.message || 'This model is not in the ComfyUI Manager registry. Install manually via Manager UI or direct URL.'}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={manualUrl}
                  onChange={(event) => setManualUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && manualUrl.trim()) {
                      onManualDownload(model, manualUrl.trim());
                    }
                  }}
                  placeholder="Paste direct download URL..."
                  className="h-7 flex-1 rounded border border-border-strong bg-surface-inset px-2 text-[10px] text-content-primary outline-none focus:border-accent/60"
                />
                <button
                  onClick={() => {
                    if (manualUrl.trim()) onManualDownload(model, manualUrl.trim());
                  }}
                  className="rounded border border-indigo-500/40 bg-indigo-500/15 px-2 text-[10px] text-indigo-200 hover:bg-indigo-500/25"
                >
                  Download
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {manualCommand && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(manualCommand);
                        setCopyState('copied');
                      } catch {
                        setCopyState('failed');
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-500/25"
                    title={manualCommand}
                  >
                    <Terminal className="h-3 w-3" />
                    Copy curl Command
                  </button>
                )}

                {(model.downloadState.suggestions || []).map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-300 underline hover:text-blue-200"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {url.includes('civitai') ? 'Search CivitAI' : 'Search HuggingFace'}
                  </a>
                ))}
              </div>

              {copyState === 'copied' && (
                <div className="text-[10px] text-emerald-300">Download command copied.</div>
              )}
              {copyState === 'failed' && (
                <div className="text-[10px] text-red-300">Failed to copy command.</div>
              )}
            </div>
          )}

          <div className="rounded-md border border-border-strong/50 bg-surface-inset/50 px-3 py-2">
            <div className="flex items-start gap-2 text-xs">
              <FolderIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
              <div className="space-y-1">
                <div className="text-content-primary">
                  <span className="text-content-muted">Place in:</span>{' '}
                  <code className="rounded bg-blue-950/30 px-1 py-0.5 text-[11px] text-blue-300">
                    ComfyUI/{folderInfo.folder}/{model.filename}
                  </code>
                </div>
                <div className="text-content-muted">{folderInfo.description}</div>
                <div className="text-content-secondary">
                  <span className="text-content-muted">Expected filename:</span>{' '}
                  <code className="rounded bg-amber-950/20 px-1 py-0.5 text-[11px] text-amber-300/80">
                    {model.filename}
                  </code>
                  <span className="ml-1 text-content-faint">(rename after download if needed)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MissingModelsPanel({
  models,
  onDownload,
  onDownloadAll,
  onRetry,
  onManualDownload,
}: MissingModelsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentKeys = new Set(models.map((model) => getModelKey(model)));
    setExpandedModels((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (currentKeys.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [models]);

  const toggleModelExpand = useCallback((modelKey: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelKey)) {
        next.delete(modelKey);
      } else {
        next.add(modelKey);
      }
      return next;
    });
  }, []);

  const readyCount = useMemo(
    () => models.filter((model) => model.downloadState.status === 'ready').length,
    [models],
  );
  const downloadingCount = useMemo(
    () => models.filter((model) => model.downloadState.status === 'downloading').length,
    [models],
  );
  const totalEstimatedBytes = useMemo(
    () => models.reduce((sum, model) => sum + (model.downloadInfo?.fileSize || 0), 0),
    [models],
  );

  const allExpanded = useMemo(
    () => models.length > 0 && models.every((model) => expandedModels.has(getModelKey(model))),
    [models, expandedModels],
  );

  const toggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedModels(new Set());
      return;
    }
    setExpandedModels(new Set(models.map((model) => getModelKey(model))));
  }, [allExpanded, models]);

  if (models.length === 0) return null;

  return (
    <div className="w-full max-w-3xl rounded-lg border border-amber-500/35 bg-amber-500/10 shadow-lg">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <AlertTriangle className="h-4 w-4 text-amber-300" />
        <span className="text-xs text-amber-100">
          {models.length} missing model{models.length === 1 ? '' : 's'} . Workflow may fail to execute
        </span>
        <span className="ml-auto text-[10px] text-amber-200">
          {readyCount} ready
          {downloadingCount > 0 ? ` . ${downloadingCount} downloading` : ''}
        </span>
        <ChevronDown className={`h-4 w-4 text-amber-300 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-2 px-3 pb-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-content-secondary">
              {models.length} missing model{models.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={toggleExpandAll}
              className="text-[10px] text-content-muted transition-colors hover:text-content-primary"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          {readyCount > 1 && (
            <button
              onClick={onDownloadAll}
              className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[10px] text-amber-100 hover:bg-amber-500/25"
            >
              <Download className="h-3.5 w-3.5" />
              Download All ({readyCount})
              {totalEstimatedBytes > 0 ? ` . ~${formatFileSize(totalEstimatedBytes)}` : ''}
            </button>
          )}

          {models.map((model) => {
            const modelKey = getModelKey(model);
            const isExpanded = expandedModels.has(modelKey);
            return (
              <ModelDownloadRow
                key={modelKey}
                model={model}
                isExpanded={isExpanded}
                onToggle={toggleModelExpand}
                onDownload={onDownload}
                onRetry={onRetry}
                onManualDownload={onManualDownload}
              />
            );
          })}

          <details className="mt-4 border-t border-border-strong/30 pt-3">
            <summary className="cursor-pointer select-none text-xs text-content-muted hover:text-content-secondary">
              Model Folder Reference Guide
            </summary>
            <div className="mt-2 space-y-1 text-xs">
              {Object.entries(MODEL_TYPE_FOLDERS)
                .filter(([type]) => !FOLDER_REFERENCE_ALIAS_KEYS.has(type))
                .map(([type, info]) => (
                  <div key={type} className="flex items-center gap-2 py-0.5 text-content-secondary">
                    <code className="min-w-[180px] rounded bg-blue-950/20 px-1 text-[11px] text-blue-300/60">
                      {info.folder}/
                    </code>
                    <span className="text-content-muted">{info.description}</span>
                  </div>
                ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

import type { ComfyUIWorkflow, ComfyUINode } from '../types/comfyui';
import { lookupModel } from '../data/known-models-db';
import { getCurrentWidgetValues, resolveNodeSchema } from './node-schema-resolver';
import { resolveComfyUIBaseUrl } from './api-config';
import {
  getModelList,
  getKnownGatedModel,
  downloadModel as managerDownloadModel,
  type ModelDownloadResult,
  type ModelManualInfo,
  type ModelRegistryEntry,
} from '../app/services/comfyui-manager-service';

export type ModelType =
  | 'checkpoint'
  | 'lora'
  | 'vae'
  | 'upscale'
  | 'embedding'
  | 'unet'
  | 'clip'
  | 'controlnet'
  | 'ipadapter';

export interface MissingModel {
  filename: string;
  displayName: string;
  type: ModelType;
  referencedBy: { nodeId: number | string; nodeType: string; inputName: string }[];
  downloadInfo: ModelDownloadInfo | null;
  downloadState: DownloadState;
  registryUrl?: string;
  downloadUrl?: string;
  pageUrl?: string;
}

export interface ModelDownloadInfo {
  url: string;
  filename: string;
  installPath: string;
  source: 'manager-registry' | 'civitai' | 'huggingface' | 'manual';
  fileSize?: number;
  modelPage?: string;
}

export type DownloadState =
  | { status: 'pending' }
  | { status: 'resolving' }
  | { status: 'ready'; info: ModelDownloadInfo }
  | { status: 'downloading'; progress: number; speed?: string; eta?: string; startedAt?: number; lastProgressChange?: number }
  | { status: 'complete' }
  | { status: 'error'; message: string }
  | { status: 'not-found'; suggestions?: string[]; message?: string; gated?: boolean; modelInfo?: ModelManualInfo };

export const MODEL_TYPE_TO_PATH: Record<ModelType, string> = {
  checkpoint: 'models/checkpoints',
  lora: 'models/loras',
  vae: 'models/vae',
  upscale: 'models/upscale_models',
  embedding: 'models/embeddings',
  unet: 'models/diffusion_models',
  clip: 'models/clip',
  controlnet: 'models/controlnet',
  ipadapter: 'models/ipadapter',
};

const NODE_MODEL_MAPPING: Record<string, Record<string, ModelType>> = {
  CheckpointLoaderSimple: { ckpt_name: 'checkpoint' },
  CheckpointLoader: { ckpt_name: 'checkpoint' },
  unCLIPCheckpointLoader: { ckpt_name: 'checkpoint' },
  CheckpointLoaderGGUF: { ckpt_name: 'checkpoint' },
  CheckpointLoaderNF4: { ckpt_name: 'checkpoint' },
  LoraLoader: { lora_name: 'lora' },
  LoraLoaderModelOnly: { lora_name: 'lora' },
  VAELoader: { vae_name: 'vae' },
  UpscaleModelLoader: { model_name: 'upscale' },
  UNETLoader: { unet_name: 'unet' },
  UnetLoaderGGUF: { unet_name: 'unet' },
  DualCLIPLoader: { clip_name1: 'clip', clip_name2: 'clip' },
  TripleCLIPLoader: { clip_name1: 'clip', clip_name2: 'clip', clip_name3: 'clip' } as Record<string, ModelType>,
  CLIPLoader: { clip_name: 'clip' },
  CLIPLoaderGGUF: { clip_name: 'clip' },
  ControlNetLoader: { control_net_name: 'controlnet' },
  ControlNetLoaderAdvanced: { control_net_name: 'controlnet' },
  DiffControlNetLoader: { model: 'controlnet' },
  IPAdapterModelLoader: { ipadapter_file: 'ipadapter' },
};

interface ServiceAuth {
  huggingfaceToken?: string;
  civitaiApiKey?: string;
}

const EMBEDDING_RE = /embedding:([^\s,\(\)]+)/gi;

function keyForMissingModel(modelType: ModelType, filename: string): string {
  return `${modelType}:${normalizeFilename(filename)}`;
}

function normalizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.toLowerCase() || '';
}

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized === 'none' || normalized === 'null';
}

function parseKnownModelSizeToBytes(size?: string): number | undefined {
  if (!size) return undefined;
  const match = size.match(/([\d.]+)\s*(kb|mb|gb|tb)/i);
  if (!match) return undefined;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return undefined;
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };
  const multiplier = multipliers[unit] || 1;
  return Math.round(numeric * multiplier);
}

const KNOWN_MODEL_SOURCES: Record<string, {
  url: string;
  pageUrl: string;
  sizeBytes?: number;
  installPath?: string;
}> = {
  't5xxl_enconly.safetensors': {
    url: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_enconly.safetensors',
    pageUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders',
    sizeBytes: 4_890_000_000,
    installPath: 'models/clip',
  },
  't5xxl_fp16.safetensors': {
    url: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors',
    pageUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders',
    sizeBytes: 9_790_000_000,
    installPath: 'models/clip',
  },
  't5xxl_fp8_e4m3fn.safetensors': {
    url: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors',
    pageUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders',
    sizeBytes: 4_890_000_000,
    installPath: 'models/clip',
  },
  'clip_l.safetensors': {
    url: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors',
    pageUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders',
    sizeBytes: 234_000_000,
    installPath: 'models/clip',
  },
  'flux1-dev.safetensors': {
    url: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors',
    pageUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
    sizeBytes: 23_800_000_000,
    installPath: 'models/diffusion_models',
  },
  'flux1-dev-fp8.safetensors': {
    url: 'https://huggingface.co/Kijai/flux-fp8/resolve/main/flux1-dev-fp8.safetensors',
    pageUrl: 'https://huggingface.co/Kijai/flux-fp8',
    sizeBytes: 11_900_000_000,
    installPath: 'models/diffusion_models',
  },
  'flux1-schnell.safetensors': {
    url: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors',
    pageUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell',
    sizeBytes: 23_800_000_000,
    installPath: 'models/diffusion_models',
  },
  'ae.safetensors': {
    url: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors',
    pageUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
    sizeBytes: 335_000_000,
    installPath: 'models/vae',
  },
  'vae-ft-mse-840000-ema-pruned.safetensors': {
    url: 'https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors',
    pageUrl: 'https://huggingface.co/stabilityai/sd-vae-ft-mse-original',
    sizeBytes: 319_000_000,
    installPath: 'models/vae',
  },
};

function mapRegistryTypeToModelType(value: string): ModelType | null {
  const normalized = (value || '').toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes('checkpoint') || normalized === 'ckpt') return 'checkpoint';
  if (normalized.includes('lora')) return 'lora';
  if (normalized === 'vae') return 'vae';
  if (normalized.includes('upscale')) return 'upscale';
  if (normalized.includes('embed')) return 'embedding';
  if (normalized === 'unet' || normalized.includes('diffusion_model')) return 'unet';
  if (normalized.includes('clip')) return 'clip';
  if (normalized.includes('controlnet') || normalized.includes('control_net')) return 'controlnet';
  if (normalized.includes('ipadapter') || normalized.includes('ip_adapter')) return 'ipadapter';
  return null;
}

function normalizeInstallPath(value: string, fallback: ModelType): string {
  const raw = (value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!raw) return MODEL_TYPE_TO_PATH[fallback];
  if (raw.startsWith('models/')) return raw;
  return `models/${raw}`;
}

function deriveModelPageUrl(downloadUrl: string): string | undefined {
  const url = String(downloadUrl || '').trim();
  if (!url) return undefined;
  if (/huggingface\.co/i.test(url)) {
    const match = url.match(/https?:\/\/huggingface\.co\/([^/]+\/[^/]+)/i);
    if (match?.[1]) return `https://huggingface.co/${match[1]}`;
  }
  return undefined;
}

export class ModelDownloadService {
  private managerModels: ModelRegistryEntry[] | null = null;
  private comfyuiUrl: string;
  private auth: ServiceAuth = {};

  constructor(comfyuiUrl: string, auth?: ServiceAuth) {
    this.comfyuiUrl = comfyuiUrl;
    this.auth = auth || {};
  }

  setComfyUIUrl(comfyuiUrl: string): void {
    this.comfyuiUrl = comfyuiUrl;
  }

  setAuth(auth: ServiceAuth): void {
    this.auth = auth;
  }

  clearRegistryCache(): void {
    this.managerModels = null;
  }

  detectMissingModels(
    workflow: ComfyUIWorkflow,
    objectInfo: Record<string, any>,
  ): MissingModel[] {
    const missing = new Map<string, MissingModel>();
    const installedModels = this.extractInstalledModels(objectInfo);

    for (const node of workflow.nodes || []) {
      const mapping = NODE_MODEL_MAPPING[node.type];
      if (!mapping) continue;

      const widgetValues = this.getNodeWidgetValues(node, objectInfo);
      for (const [inputName, modelType] of Object.entries(mapping)) {
        const rawValue = widgetValues[inputName];
        if (typeof rawValue !== 'string') continue;
        if (isPlaceholderValue(rawValue)) continue;

        const filename = rawValue.trim().replace(/\\/g, '/').split('/').pop() || rawValue.trim();
        if (!filename) continue;

        if (this.isInstalledFilename(filename, installedModels[modelType] || [])) {
          continue;
        }

        const key = keyForMissingModel(modelType, filename);
        const reference = { nodeId: node.id, nodeType: node.type, inputName };
        const existing = missing.get(key);
        if (existing) {
          existing.referencedBy.push(reference);
          continue;
        }

        missing.set(key, {
          filename,
          displayName: this.cleanModelName(filename),
          type: modelType,
          referencedBy: [reference],
          downloadInfo: null,
          downloadState: { status: 'pending' },
        });
      }
    }

    for (const node of workflow.nodes || []) {
      const widgetValues = this.getNodeWidgetValues(node, objectInfo);
      for (const [widgetName, widgetValue] of Object.entries(widgetValues)) {
        if (!this.shouldScanEmbeddingWidget(node.type, widgetName)) continue;
        if (typeof widgetValue !== 'string') continue;
        let match = EMBEDDING_RE.exec(widgetValue);
        while (match) {
          const embeddingName = (match[1] || '').trim();
          if (embeddingName) {
            const candidate = embeddingName.toLowerCase().endsWith('.safetensors')
              ? embeddingName
              : `${embeddingName}.safetensors`;
            if (!this.isInstalledFilename(candidate, installedModels.embedding || [])) {
              const key = keyForMissingModel('embedding', candidate);
              const ref = { nodeId: node.id, nodeType: node.type, inputName: widgetName };
              const existing = missing.get(key);
              if (existing) {
                existing.referencedBy.push(ref);
              } else {
                missing.set(key, {
                  filename: candidate,
                  displayName: this.cleanModelName(candidate),
                  type: 'embedding',
                  referencedBy: [ref],
                  downloadInfo: null,
                  downloadState: { status: 'pending' },
                });
              }
            }
          }
          match = EMBEDDING_RE.exec(widgetValue);
        }
        EMBEDDING_RE.lastIndex = 0;
      }
    }

    const output = [...missing.values()].sort((a, b) => {
      if (a.type === b.type) return a.filename.localeCompare(b.filename);
      return a.type.localeCompare(b.type);
    });

    console.log(
      '[ModelDownload] Missing models detected:',
      output.length,
      output.map((model) => `${model.type}:${model.filename}`),
    );

    return output;
  }

  async resolveDownloadUrls(models: MissingModel[]): Promise<MissingModel[]> {
    if (!this.managerModels) {
      try {
        this.managerModels = await getModelList(this.comfyuiUrl);
        console.log('[ModelDownload] Manager registry loaded:', this.managerModels.length, 'models');
      } catch (error) {
        console.warn('[ModelDownload] Could not load manager model registry:', error);
        this.managerModels = [];
      }
    }

    return models.map((model) => {
      const resolved = this.resolveDownloadInfo(model);
      if (!resolved) {
        const knownGated = getKnownGatedModel(model.filename);
        if (knownGated) {
          return {
            ...model,
            downloadInfo: null,
            downloadUrl: knownGated.url,
            pageUrl: knownGated.huggingface_page,
            downloadState: {
              status: 'not-found',
              gated: true,
              modelInfo: knownGated,
              message: `"${knownGated.name}" requires HuggingFace license acceptance before download.`,
              suggestions: [
                knownGated.huggingface_page,
                knownGated.url,
              ],
            },
          };
        }

        return {
          ...model,
          downloadInfo: null,
          downloadUrl: undefined,
          pageUrl: undefined,
          downloadState: {
            status: 'not-found',
            message: `No registry or known-source match for ${model.filename}.`,
            suggestions: [
              `https://civitai.com/search/models?query=${encodeURIComponent(model.displayName)}`,
              `https://huggingface.co/models?search=${encodeURIComponent(model.displayName)}`,
            ],
          },
        };
      }

      return {
        ...model,
        downloadInfo: resolved,
        registryUrl: resolved.source === 'manager-registry' ? resolved.url : undefined,
        downloadUrl: resolved.url,
        pageUrl: resolved.modelPage || deriveModelPageUrl(resolved.url),
        downloadState: { status: 'ready', info: resolved },
      };
    });
  }

  async downloadModel(model: MissingModel, authOverride?: ServiceAuth): Promise<ModelDownloadResult> {
    if (!model.downloadInfo) {
      throw new Error(`No download URL resolved for ${model.filename}`);
    }

    const auth = {
      huggingfaceToken: authOverride?.huggingfaceToken || this.auth.huggingfaceToken,
      civitaiApiKey: authOverride?.civitaiApiKey || this.auth.civitaiApiKey,
    };

    return await managerDownloadModel(
      this.comfyuiUrl,
      {
        url: model.downloadInfo.url,
        filename: model.downloadInfo.filename,
        save_path: model.downloadInfo.installPath,
        modelDir: model.downloadInfo.installPath,
        modelType: model.type,
        name: model.displayName,
        displayName: model.displayName,
        reference: model.downloadInfo.modelPage,
        modelPageUrl: model.downloadInfo.modelPage,
        huggingfaceToken: auth.huggingfaceToken,
        civitaiApiKey: auth.civitaiApiKey,
      },
    );
  }

  async isModelInstalled(
    filename: string,
    modelType: ModelType,
    objectInfo: Record<string, any>,
  ): Promise<boolean> {
    const installed = this.extractInstalledModels(objectInfo);
    return this.isInstalledFilename(filename, installed[modelType] || []);
  }

  async checkModelAppeared(
    filename: string,
    modelType: ModelType,
    objectInfo?: Record<string, any>,
  ): Promise<boolean> {
    if (objectInfo) {
      return await this.isModelInstalled(filename, modelType, objectInfo);
    }

    try {
      const base = resolveComfyUIBaseUrl(this.comfyuiUrl);
      const response = await fetch(`${base}/object_info`);
      if (!response.ok) return false;
      const freshObjectInfo = await response.json() as Record<string, any>;
      return await this.isModelInstalled(filename, modelType, freshObjectInfo);
    } catch {
      return false;
    }
  }

  async checkManagerQueueCompleted(): Promise<boolean> {
    const base = resolveComfyUIBaseUrl(this.comfyuiUrl);
    const endpoints = [
      '/comfyui-proxy/queue',
      `${base}/api/manager/queue/status`,
      `${base}/manager/queue/status`,
      `${base}/queue`,
      '/queue',
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) continue;
        const data = await response.json() as Record<string, unknown>;

        const runningListLen = Array.isArray(data.queue_running) ? data.queue_running.length : null;
        const pendingListLen = Array.isArray(data.queue_pending) ? data.queue_pending.length : null;

        if (runningListLen !== null || pendingListLen !== null) {
          return (runningListLen ?? 0) === 0 && (pendingListLen ?? 0) === 0;
        }

        const pendingCount =
          (typeof data.pending === 'number' ? data.pending : null)
          ?? (typeof data.queue_pending === 'number' ? data.queue_pending : null)
          ?? (typeof data.queue_remaining === 'number' ? data.queue_remaining : null)
          ?? (typeof data.total === 'number' && typeof data.progress === 'number' ? Math.max(0, data.total - data.progress) : null);

        const running =
          (typeof data.running === 'boolean' ? data.running : null)
          ?? (typeof data.is_running === 'boolean' ? data.is_running : null);

        if (pendingCount !== null && running !== null) {
          return pendingCount === 0 && running === false;
        }
        if (pendingCount !== null) {
          return pendingCount === 0;
        }
        if (running !== null) {
          return running === false;
        }
      } catch {
        // try next endpoint
      }
    }

    return false;
  }

  getInstallPathForModelType(modelType: ModelType): string {
    return MODEL_TYPE_TO_PATH[modelType];
  }

  private resolveDownloadInfo(model: MissingModel): ModelDownloadInfo | null {
    const modelBasename = normalizeFilename(model.filename);

    const knownSource = KNOWN_MODEL_SOURCES[modelBasename];
    if (knownSource) {
      return {
        url: knownSource.url,
        filename: model.filename,
        installPath: knownSource.installPath || MODEL_TYPE_TO_PATH[model.type],
        source: /civitai\.com/i.test(knownSource.url) ? 'civitai' : 'huggingface',
        fileSize: knownSource.sizeBytes,
        modelPage: knownSource.pageUrl,
      };
    }

    const registryMatch = (this.managerModels || []).find((entry) => {
      const entryFilename = normalizeFilename(String(entry.filename || entry.name || ''));
      const filenameMatch = entryFilename === modelBasename;
      if (!filenameMatch) return false;
      const registryType = mapRegistryTypeToModelType(String(entry.type || entry.save_path || ''));
      if (!registryType) return true;
      return registryType === model.type;
    });

    if (registryMatch && registryMatch.url) {
      const installPath = normalizeInstallPath(registryMatch.save_path || '', model.type);
      const info: ModelDownloadInfo = {
        url: registryMatch.url,
        filename: registryMatch.filename || model.filename,
        installPath,
        source: 'manager-registry',
        modelPage: registryMatch.reference || undefined,
      };
      return info;
    }

    const known = lookupModel(model.filename) || lookupModel(modelBasename);
    if (known) {
      const source = known.source.toLowerCase().includes('civitai')
        ? 'civitai'
        : 'huggingface';
      const info: ModelDownloadInfo = {
        url: known.downloadUrl,
        filename: known.filename || model.filename,
        installPath: normalizeInstallPath(known.subfolder || '', model.type),
        source,
        fileSize: parseKnownModelSizeToBytes(known.size),
      };
      return info;
    }

    return null;
  }

  private extractInstalledModels(objectInfo: Record<string, any>): Record<ModelType, string[]> {
    const result: Record<ModelType, string[]> = {
      checkpoint: [],
      lora: [],
      vae: [],
      upscale: [],
      embedding: [],
      unet: [],
      clip: [],
      controlnet: [],
      ipadapter: [],
    };

    const loaderInputs: Array<{ nodeType: string; inputName: string; modelType: ModelType }> = [
      { nodeType: 'CheckpointLoaderSimple', inputName: 'ckpt_name', modelType: 'checkpoint' },
      { nodeType: 'CheckpointLoader', inputName: 'ckpt_name', modelType: 'checkpoint' },
      { nodeType: 'LoraLoader', inputName: 'lora_name', modelType: 'lora' },
      { nodeType: 'VAELoader', inputName: 'vae_name', modelType: 'vae' },
      { nodeType: 'UpscaleModelLoader', inputName: 'model_name', modelType: 'upscale' },
      { nodeType: 'UNETLoader', inputName: 'unet_name', modelType: 'unet' },
      { nodeType: 'CLIPLoader', inputName: 'clip_name', modelType: 'clip' },
      { nodeType: 'DualCLIPLoader', inputName: 'clip_name1', modelType: 'clip' },
      { nodeType: 'DualCLIPLoader', inputName: 'clip_name2', modelType: 'clip' },
      { nodeType: 'ControlNetLoader', inputName: 'control_net_name', modelType: 'controlnet' },
      { nodeType: 'IPAdapterModelLoader', inputName: 'ipadapter_file', modelType: 'ipadapter' },
    ];

    for (const { nodeType, inputName, modelType } of loaderInputs) {
      const values = this.extractComboOptions(objectInfo, nodeType, inputName);
      if (values.length > 0) {
        result[modelType].push(...values);
      }
    }

    for (const [nodeType, nodeInfo] of Object.entries(objectInfo || {})) {
      if (!nodeInfo || typeof nodeInfo !== 'object') continue;
      const typedNode = nodeInfo as Record<string, any>;
      const sections = [typedNode.input?.required, typedNode.input?.optional];
      for (const section of sections) {
        if (!section || typeof section !== 'object') continue;
        for (const [inputName, spec] of Object.entries(section as Record<string, any>)) {
          if (!/embed/i.test(inputName)) continue;
          if (!Array.isArray(spec) || !Array.isArray(spec[0])) continue;
          const options = spec[0].map(String);
          if (options.length > 0) {
            result.embedding.push(...options);
          }
        }
      }
      if (/embedding/i.test(nodeType)) {
        for (const section of sections) {
          if (!section || typeof section !== 'object') continue;
          for (const spec of Object.values(section as Record<string, any>)) {
            if (!Array.isArray(spec) || !Array.isArray(spec[0])) continue;
            result.embedding.push(...spec[0].map(String));
          }
        }
      }
    }

    for (const key of Object.keys(result) as ModelType[]) {
      const unique = new Set(
        result[key]
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      );
      result[key] = [...unique];
    }

    return result;
  }

  private extractComboOptions(objectInfo: Record<string, any>, nodeType: string, inputName: string): string[] {
    const nodeInfo = objectInfo?.[nodeType];
    if (!nodeInfo?.input) return [];
    const required = nodeInfo.input.required?.[inputName];
    if (Array.isArray(required) && Array.isArray(required[0])) {
      return required[0].map(String);
    }
    const optional = nodeInfo.input.optional?.[inputName];
    if (Array.isArray(optional) && Array.isArray(optional[0])) {
      return optional[0].map(String);
    }
    return [];
  }

  private getNodeWidgetValues(node: ComfyUINode, objectInfo: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    const schema = resolveNodeSchema(node.type, objectInfo);
    if (!schema) return result;
    const values = getCurrentWidgetValues(node.widgets_values, schema);
    for (const [name, value] of values.entries()) {
      result[name] = value;
    }
    return result;
  }

  private cleanModelName(filename: string): string {
    return filename
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      ?.replace(/\.(safetensors|ckpt|pt|pth|bin|gguf)$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || filename;
  }

  private isInstalledFilename(filename: string, installed: string[]): boolean {
    const target = normalizeFilename(filename);
    if (!target) return true;
    const targetBase = target.split('/').pop() || target;
    return installed.some((value) => {
      const normalized = normalizeFilename(value);
      if (!normalized) return false;
      if (normalized === target) return true;
      const normalizedBase = normalized.split('/').pop() || normalized;
      if (normalizedBase === targetBase) return true;
      return normalized.endsWith(`/${targetBase}`) || target.endsWith(`/${normalizedBase}`);
    });
  }

  private shouldScanEmbeddingWidget(nodeType: string, widgetName: string): boolean {
    const lowerNode = nodeType.toLowerCase();
    const lowerWidget = widgetName.toLowerCase();
    if (lowerWidget !== 'text' && !lowerWidget.includes('prompt')) return false;
    return lowerNode.includes('cliptextencode') || lowerNode.includes('prompt');
  }
}

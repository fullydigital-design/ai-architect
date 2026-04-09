import type { ModelAvailability } from './model-availability-service';
import type { ModelType } from '../utils/workflow-model-extractor';

export interface ModelSourceMatch {
  source: 'civitai' | 'huggingface' | 'known_db' | 'not_found';
  confidence: 'exact' | 'high' | 'medium' | 'low';
  modelName: string;
  downloadUrl?: string;
  pageUrl?: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  previewImageUrl?: string;
  description?: string;
}

const KNOWN_MODELS: Record<string, {
  source: 'huggingface' | 'civitai';
  pageUrl: string;
  downloadUrl: string;
  fileSizeBytes?: number;
}> = {
  // FLUX text encoders
  't5xxl_enconly.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders',
    downloadUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_enconly.safetensors',
    fileSizeBytes: 4_890_000_000,
  },
  't5xxl_fp16.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders',
    downloadUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors',
    fileSizeBytes: 9_790_000_000,
  },
  't5xxl_fp8_e4m3fn.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders',
    downloadUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors',
    fileSizeBytes: 4_890_000_000,
  },
  'clip_l.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders',
    downloadUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors',
    fileSizeBytes: 234_000_000,
  },
  // FLUX models
  'flux1-dev.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
    downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors',
    fileSizeBytes: 23_800_000_000,
  },
  'flux1-dev-fp8.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/Kijai/flux-fp8',
    downloadUrl: 'https://huggingface.co/Kijai/flux-fp8/resolve/main/flux1-dev-fp8.safetensors',
    fileSizeBytes: 11_900_000_000,
  },
  'flux1-schnell.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell',
    downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors',
    fileSizeBytes: 23_800_000_000,
  },
  'ae.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
    downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors',
    fileSizeBytes: 335_000_000,
  },
  'sdxl_vae.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/stabilityai/sdxl-vae',
    downloadUrl: 'https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors',
    fileSizeBytes: 334_698_480,
  },
  'vae-ft-mse-840000-ema-pruned.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/stabilityai/sd-vae-ft-mse',
    downloadUrl: 'https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors',
    fileSizeBytes: 334_695_179,
  },
  '4x-ultrasharp.pth': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/Kim2091/UltraSharp',
    downloadUrl: 'https://huggingface.co/Kim2091/UltraSharp/resolve/main/4x-UltraSharp.pth',
    fileSizeBytes: 66_261_349,
  },
  '4x_nmkd-siax_200k.pth': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/gemasai/4x_NMKD-Siax_200k',
    downloadUrl: 'https://huggingface.co/gemasai/4x_NMKD-Siax_200k/resolve/main/4x_NMKD-Siax_200k.pth',
    fileSizeBytes: 66_261_349,
  },
  'clip_vision_g.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/h94/IP-Adapter',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/image_encoder/model.safetensors',
    fileSizeBytes: 3_567_537_640,
  },
  'clip-vit-h-14-laion2b-s32b-b79k.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/h94/IP-Adapter',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors',
    fileSizeBytes: 2_528_373_840,
  },
  'clip-vit-bigg-14-laion2b-39b-b160k.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/h94/IP-Adapter',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/image_encoder/model.safetensors',
    fileSizeBytes: 3_567_537_640,
  },
  'ip-adapter-plus_sdxl_vit-h.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/h94/IP-Adapter',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus_sdxl_vit-h.safetensors',
    fileSizeBytes: 842_248_808,
  },
  'ip-adapter_sdxl_vit-h.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/h94/IP-Adapter',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter_sdxl_vit-h.safetensors',
    fileSizeBytes: 842_248_808,
  },
  'ip-adapter-plus-face_sdxl_vit-h.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/h94/IP-Adapter',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors',
    fileSizeBytes: 842_248_808,
  },
  'ip-adapter_sd15.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/h94/IP-Adapter',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter_sd15.safetensors',
    fileSizeBytes: 176_408_808,
  },
  'ip-adapter-plus_sd15.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/h94/IP-Adapter',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-plus_sd15.safetensors',
    fileSizeBytes: 264_248_808,
  },
  'control_v11p_sd15_openpose.pth': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth',
    fileSizeBytes: 1_445_154_814,
  },
  'control_v11f1p_sd15_depth.pth': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth.pth',
    fileSizeBytes: 1_445_154_814,
  },
  'control_v11p_sd15_canny.pth': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.pth',
    fileSizeBytes: 1_445_154_814,
  },
  'diffusers_xl_canny_full.safetensors': {
    source: 'huggingface',
    pageUrl: 'https://huggingface.co/diffusers/controlnet-canny-sdxl-1.0',
    downloadUrl: 'https://huggingface.co/diffusers/controlnet-canny-sdxl-1.0/resolve/main/diffusion_pytorch_model.fp16.safetensors',
    fileSizeBytes: 2_502_139_104,
  },
};

interface CivitAIModelFile {
  name?: string;
  sizeKB?: number;
  downloadUrl?: string;
}

interface CivitAIModelVersion {
  name?: string;
  baseModel?: string;
  files?: CivitAIModelFile[];
  images?: Array<{ url?: string }>;
  downloadUrl?: string;
}

interface CivitAIModelItem {
  id?: number;
  name?: string;
  type?: string;
  creator?: { username?: string };
  modelVersions?: CivitAIModelVersion[];
  description?: string;
}

interface HuggingFaceItem {
  modelId?: string;
  author?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function mapTypeToCivitAI(modelType: ModelType): string | null {
  const mapping: Partial<Record<ModelType, string>> = {
    checkpoint: 'Checkpoint',
    lora: 'LORA',
    controlnet: 'Controlnet',
    vae: 'VAE',
    embedding: 'TextualInversion',
    upscaler: 'Upscaler',
  };
  return mapping[modelType] ?? null;
}

function normalizeModelKey(filename: string): string {
  return filename
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.toLowerCase() || '';
}

function bestCivitAIMatch(filename: string, items: CivitAIModelItem[]): ModelSourceMatch | null {
  const target = normalizeModelKey(filename);
  const targetBase = stripExtension(target);

  for (const item of items) {
    for (const version of item.modelVersions ?? []) {
      for (const file of version.files ?? []) {
        const fileName = normalizeModelKey(file.name ?? '');
        if (!fileName) continue;
        if (fileName === target) {
          const bytes = typeof file.sizeKB === 'number' ? Math.round(file.sizeKB * 1024) : undefined;
          return {
            source: 'civitai',
            confidence: 'exact',
            modelName: item.name || filename,
            downloadUrl: file.downloadUrl || version.downloadUrl,
            pageUrl: item.id ? `https://civitai.com/models/${item.id}` : undefined,
            fileSizeBytes: bytes,
            fileSizeFormatted: bytes ? formatFileSize(bytes) : undefined,
            previewImageUrl: version.images?.[0]?.url,
            description: item.description,
          };
        }
      }
    }
  }

  for (const item of items) {
    const itemName = (item.name || '').toLowerCase();
    if (!itemName) continue;
    if (itemName.includes(targetBase) || targetBase.includes(itemName)) {
      const version = item.modelVersions?.[0];
      const file = version?.files?.[0];
      const bytes = typeof file?.sizeKB === 'number' ? Math.round(file.sizeKB * 1024) : undefined;
      return {
        source: 'civitai',
        confidence: 'high',
        modelName: item.name || filename,
        downloadUrl: file?.downloadUrl || version?.downloadUrl,
        pageUrl: item.id ? `https://civitai.com/models/${item.id}` : undefined,
        fileSizeBytes: bytes,
        fileSizeFormatted: bytes ? formatFileSize(bytes) : undefined,
        previewImageUrl: version?.images?.[0]?.url,
        description: item.description,
      };
    }
  }

  const first = items[0];
  if (!first) return null;
  const version = first.modelVersions?.[0];
  const file = version?.files?.[0];
  const bytes = typeof file?.sizeKB === 'number' ? Math.round(file.sizeKB * 1024) : undefined;
  return {
    source: 'civitai',
    confidence: 'medium',
    modelName: first.name || filename,
    downloadUrl: file?.downloadUrl || version?.downloadUrl,
    pageUrl: first.id ? `https://civitai.com/models/${first.id}` : undefined,
    fileSizeBytes: bytes,
    fileSizeFormatted: bytes ? formatFileSize(bytes) : undefined,
    previewImageUrl: version?.images?.[0]?.url,
    description: first.description,
  };
}

async function searchCivitAI(filename: string, modelType: ModelType): Promise<{ match: ModelSourceMatch | null; rateLimited: boolean }> {
  await sleep(500);
  try {
    const query = stripExtension(filename);
    const params = new URLSearchParams({
      query,
      limit: '3',
      sort: 'Most Downloaded',
    });
    const civitaiType = mapTypeToCivitAI(modelType);
    if (civitaiType) params.set('types', civitaiType);

    const response = await fetch(`https://civitai.com/api/v1/models?${params.toString()}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 429) return { match: null, rateLimited: true };
    if (!response.ok) return { match: null, rateLimited: false };
    const data = await response.json() as { items?: CivitAIModelItem[] };
    return { match: bestCivitAIMatch(filename, data.items ?? []), rateLimited: false };
  } catch {
    return { match: null, rateLimited: false };
  }
}

async function searchHuggingFace(filename: string, modelType: ModelType): Promise<ModelSourceMatch | null> {
  await sleep(500);
  try {
    const params = new URLSearchParams({
      search: filename,
      limit: '3',
    });
    if (modelType === 'checkpoint' || modelType === 'lora') {
      params.set('filter', 'diffusers');
    }
    const response = await fetch(`https://huggingface.co/api/models?${params.toString()}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const data = await response.json() as HuggingFaceItem[];
    if (!Array.isArray(data) || data.length === 0) return null;
    const best = data[0];
    if (!best?.modelId) return null;
    return {
      source: 'huggingface',
      confidence: 'medium',
      modelName: best.modelId.split('/').pop() || filename,
      pageUrl: `https://huggingface.co/${best.modelId}`,
      description: `Author: ${best.author || 'Unknown'} • Downloads: ${best.downloads ?? 0}`,
    };
  } catch {
    return null;
  }
}

export async function findModelSources(
  missingModels: ModelAvailability[],
  onProgress?: (current: number, total: number) => void,
): Promise<Map<string, ModelSourceMatch>> {
  const matches = new Map<string, ModelSourceMatch>();

  for (let idx = 0; idx < missingModels.length; idx++) {
    onProgress?.(idx + 1, missingModels.length);
    const model = missingModels[idx];
    const key = normalizeModelKey(model.filename);
    const known = KNOWN_MODELS[key];
    if (known) {
      const fileSizeFormatted = known.fileSizeBytes ? formatFileSize(known.fileSizeBytes) : undefined;
      matches.set(model.filename, {
        source: 'known_db',
        confidence: 'exact',
        modelName: model.filename,
        pageUrl: known.pageUrl,
        downloadUrl: known.downloadUrl,
        fileSizeBytes: known.fileSizeBytes,
        fileSizeFormatted,
      });
      continue;
    }

    const civitai = await searchCivitAI(model.filename, model.modelType);
    if (civitai.match) {
      matches.set(model.filename, civitai.match);
      continue;
    }

    const huggingFace = await searchHuggingFace(model.filename, model.modelType);
    if (huggingFace) {
      matches.set(model.filename, huggingFace);
      continue;
    }

    matches.set(model.filename, {
      source: 'not_found',
      confidence: 'low',
      modelName: model.filename,
      description: civitai.rateLimited
        ? 'CivitAI rate limited - try again in 60 seconds'
        : 'No source match found',
    });
  }

  return matches;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

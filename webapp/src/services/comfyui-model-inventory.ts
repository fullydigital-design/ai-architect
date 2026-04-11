import { resolveComfyUrl } from './comfyui-backend';

export interface ModelFile {
  path: string;
  filename: string;
  subfolder: string;
  extension: string;
  sizeBytes: number | null;
  sizeDisplay: string;
}

export interface ModelFolder {
  folderType: string;
  displayName: string;
  files: ModelFile[];
  fileCount: number;
}

const MODEL_FOLDER_TYPES = [
  'checkpoints',
  'clip',
  'clip_vision',
  'configs',
  'controlnet',
  'diffusers',
  'diffusion_models',
  'embeddings',
  'gligen',
  'hypernetworks',
  'ipadapter',
  'instantid',
  'latent_upscale_models',
  'llm',
  'loras',
  'model_patches',
  'photomaker',
  'style_models',
  'text_encoders',
  'unet',
  'upscale_models',
  'vae',
  'vae_approx',
] as const;

const DISPLAY_NAMES: Record<string, string> = {
  checkpoints: 'Checkpoints',
  clip: 'CLIP',
  clip_vision: 'CLIP Vision',
  configs: 'Configs',
  controlnet: 'ControlNets',
  diffusers: 'Diffusers',
  diffusion_models: 'Diffusion Models',
  embeddings: 'Embeddings',
  gligen: 'GLIGEN',
  hypernetworks: 'Hypernetworks',
  ipadapter: 'IP-Adapter',
  instantid: 'InstantID',
  latent_upscale_models: 'Latent Upscale Models',
  llm: 'LLM',
  loras: 'LoRAs',
  model_patches: 'Model Patches',
  photomaker: 'PhotoMaker',
  style_models: 'Style Models',
  text_encoders: 'Text Encoders',
  unet: 'UNet',
  upscale_models: 'Upscale Models',
  vae: 'VAE',
  vae_approx: 'VAE Approx',
};

async function discoverFolderTypes(url: string): Promise<string[]> {
  try {
    const response = await fetch(`${url}/api/models`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [...MODEL_FOLDER_TYPES];
    const payload = await response.json();
    if (Array.isArray(payload) && payload.length > 0) return payload.filter((t): t is string => typeof t === 'string');
  } catch {
    // Fall through to hardcoded list
  }
  return [...MODEL_FOLDER_TYPES];
}

export async function fetchAllModelFolders(baseUrl: string): Promise<ModelFolder[]> {
  const url = resolveComfyUrl(baseUrl);
  const folderTypes = await discoverFolderTypes(url);

  const results = await Promise.allSettled(
    folderTypes.map(async (folderType) => {
      const response = await fetch(`${url}/api/models/${encodeURIComponent(folderType)}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { folderType, files: [] as string[] };
      }

      const payload = await response.json();
      const files = Array.isArray(payload)
        ? payload.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];

      return { folderType, files };
    }),
  );

  const folders: ModelFolder[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;

    const { folderType, files } = result.value;
    if (files.length === 0) continue;

    const modelFiles: ModelFile[] = files.map((rawPath) => {
      const path = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
      const parts = path.split('/');
      const filename = parts[parts.length - 1] || path;
      const subfolder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      const extension = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() || '' : '';
      const sizeBytes = estimateModelSize(folderType, filename, extension);

      return {
        path,
        filename,
        subfolder,
        extension,
        sizeBytes,
        sizeDisplay: sizeBytes ? formatFileSize(sizeBytes) : '—',
      };
    });

    modelFiles.sort((a, b) => a.path.localeCompare(b.path));

    folders.push({
      folderType,
      displayName: DISPLAY_NAMES[folderType] || folderType,
      files: modelFiles,
      fileCount: modelFiles.length,
    });
  }

  folders.sort((a, b) => b.fileCount - a.fileCount || a.displayName.localeCompare(b.displayName));
  return folders;
}

function estimateModelSize(folder: string, filename: string, _ext: string): number | null {
  const lowerName = filename.toLowerCase();

  if (folder === 'configs') return null;

  const baseline: Record<string, number> = {
    checkpoints: 2_000_000_000,
    diffusion_models: 6_500_000_000,
    unet: 6_500_000_000,
    loras: 150_000_000,
    embeddings: 50_000_000,
    hypernetworks: 100_000_000,
    vae: 300_000_000,
    vae_approx: 50_000_000,
    clip: 500_000_000,
    clip_vision: 400_000_000,
    text_encoders: 500_000_000,
    controlnet: 1_500_000_000,
    upscale_models: 60_000_000,
    style_models: 500_000_000,
    photomaker: 500_000_000,
    gligen: 500_000_000,
    ipadapter: 350_000_000,
    instantid: 350_000_000,
    model_patches: 150_000_000,
    latent_upscale_models: 200_000_000,
    diffusers: 6_500_000_000,
    llm: 8_000_000_000,
  };

  if (folder === 'checkpoints' || folder === 'diffusion_models' || folder === 'unet' || folder === 'diffusers') {
    if (lowerName.includes('flux')) return 12_000_000_000;
    if (lowerName.includes('sd3')) return 8_000_000_000;
    if (lowerName.includes('sdxl') || lowerName.includes('xl')) return 6_500_000_000;
    if (lowerName.includes('sd15') || lowerName.includes('sd1.5') || lowerName.includes('v1-5')) return 2_000_000_000;
  }

  if (folder === 'text_encoders') {
    if (lowerName.includes('t5xxl')) return 9_500_000_000;
    if (lowerName.includes('t5')) return 4_500_000_000;
    if (lowerName.includes('clip_l')) return 250_000_000;
    if (lowerName.includes('clip_g')) return 700_000_000;
  }

  if (folder === 'upscale_models') {
    if (lowerName.includes('4x')) return 60_000_000;
    if (lowerName.includes('2x')) return 30_000_000;
  }

  return baseline[folder] || null;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `~${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `~${(bytes / 1_000_000).toFixed(0)} MB`;
  if (bytes >= 1_000) return `~${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

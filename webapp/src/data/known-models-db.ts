/**
 * Known Models Database - maps common model filenames to download URLs.
 * Used by deployment package generation for auto-download commands.
 */

export interface KnownModel {
  filename: string;
  downloadUrl: string;
  subfolder: string;
  size?: string;
  source: string;
}

export const KNOWN_MODELS_DB = new Map<string, KnownModel>();

function register(models: KnownModel[]) {
  for (const model of models) {
    KNOWN_MODELS_DB.set(model.filename.toLowerCase(), model);

    const baseName = model.filename.includes('\\')
      ? model.filename.split('\\').pop() || model.filename
      : model.filename.includes('/')
        ? model.filename.split('/').pop() || model.filename
        : model.filename;
    KNOWN_MODELS_DB.set(baseName.toLowerCase(), model);
  }
}

// Stable Diffusion 1.5
register([
  {
    filename: 'v1-5-pruned-emaonly.safetensors',
    downloadUrl: 'https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors',
    subfolder: 'checkpoints',
    size: '4.3 GB',
    source: 'HuggingFace',
  },
  {
    filename: 'v1-5-pruned-emaonly.ckpt',
    downloadUrl: 'https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.ckpt',
    subfolder: 'checkpoints',
    size: '4.3 GB',
    source: 'HuggingFace',
  },
  {
    filename: 'revAnimated_v122.safetensors',
    downloadUrl: 'https://huggingface.co/SG161222/Realistic_Vision_V5.1_noVAE/resolve/main/realisticVisionV51_v51VAE.safetensors',
    subfolder: 'checkpoints',
    size: '2.1 GB',
    source: 'HuggingFace',
  },
]);

// Stable Diffusion XL
register([
  {
    filename: 'sd_xl_base_1.0.safetensors',
    downloadUrl: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors',
    subfolder: 'checkpoints',
    size: '6.9 GB',
    source: 'HuggingFace (Stability AI)',
  },
  {
    filename: 'sd_xl_refiner_1.0.safetensors',
    downloadUrl: 'https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/main/sd_xl_refiner_1.0.safetensors',
    subfolder: 'checkpoints',
    size: '6.2 GB',
    source: 'HuggingFace (Stability AI)',
  },
  {
    filename: 'sd_xl_turbo_1.0_fp16.safetensors',
    downloadUrl: 'https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors',
    subfolder: 'checkpoints',
    size: '6.9 GB',
    source: 'HuggingFace (Stability AI)',
  },
]);

// FLUX
register([
  {
    filename: 'flux1-dev.safetensors',
    downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors',
    subfolder: 'unet',
    size: '23.8 GB',
    source: 'HuggingFace (Black Forest Labs)',
  },
  {
    filename: 'flux1-schnell.safetensors',
    downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors',
    subfolder: 'unet',
    size: '23.8 GB',
    source: 'HuggingFace (Black Forest Labs)',
  },
  {
    filename: 'ae.safetensors',
    downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors',
    subfolder: 'vae',
    size: '335 MB',
    source: 'HuggingFace (Black Forest Labs)',
  },
  {
    filename: 't5xxl_fp16.safetensors',
    downloadUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors',
    subfolder: 'clip',
    size: '9.8 GB',
    source: 'HuggingFace (comfyanonymous)',
  },
  {
    filename: 't5xxl_fp8_e4m3fn.safetensors',
    downloadUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors',
    subfolder: 'clip',
    size: '4.9 GB',
    source: 'HuggingFace (comfyanonymous)',
  },
  {
    filename: 'clip_l.safetensors',
    downloadUrl: 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors',
    subfolder: 'clip',
    size: '246 MB',
    source: 'HuggingFace (comfyanonymous)',
  },
]);

// VAE
register([
  {
    filename: 'vae-ft-mse-840000-ema-pruned.safetensors',
    downloadUrl: 'https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors',
    subfolder: 'vae',
    size: '335 MB',
    source: 'HuggingFace (Stability AI)',
  },
  {
    filename: 'sdxl_vae.safetensors',
    downloadUrl: 'https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors',
    subfolder: 'vae',
    size: '335 MB',
    source: 'HuggingFace (Stability AI)',
  },
]);

// ControlNet SD1.5
register([
  {
    filename: 'control_v11p_sd15_canny.pth',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.pth',
    subfolder: 'controlnet',
    size: '1.4 GB',
    source: 'HuggingFace (lllyasviel)',
  },
  {
    filename: 'control_v11f1p_sd15_depth.pth',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth.pth',
    subfolder: 'controlnet',
    size: '1.4 GB',
    source: 'HuggingFace (lllyasviel)',
  },
  {
    filename: 'control_v11p_sd15_openpose.pth',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth',
    subfolder: 'controlnet',
    size: '1.4 GB',
    source: 'HuggingFace (lllyasviel)',
  },
  {
    filename: 'control_v11p_sd15_lineart.pth',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_lineart.pth',
    subfolder: 'controlnet',
    size: '1.4 GB',
    source: 'HuggingFace (lllyasviel)',
  },
  {
    filename: 'control_v11p_sd15_softedge.pth',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_softedge.pth',
    subfolder: 'controlnet',
    size: '1.4 GB',
    source: 'HuggingFace (lllyasviel)',
  },
  {
    filename: 'control_v11p_sd15_mlsd.pth',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_mlsd.pth',
    subfolder: 'controlnet',
    size: '1.4 GB',
    source: 'HuggingFace (lllyasviel)',
  },
  {
    filename: 'control_v11p_sd15_normalbae.pth',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_normalbae.pth',
    subfolder: 'controlnet',
    size: '1.4 GB',
    source: 'HuggingFace (lllyasviel)',
  },
  {
    filename: 'control_v11e_sd15_ip2p.pth',
    downloadUrl: 'https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11e_sd15_ip2p.pth',
    subfolder: 'controlnet',
    size: '1.4 GB',
    source: 'HuggingFace (lllyasviel)',
  },
]);

// ControlNet SDXL
register([
  {
    filename: 'diffusers_xl_canny_mid.safetensors',
    downloadUrl: 'https://huggingface.co/thibaud/controlnet-openpose-sdxl-1.0/resolve/main/diffusion_pytorch_model.safetensors',
    subfolder: 'controlnet',
    size: '2.5 GB',
    source: 'HuggingFace',
  },
  {
    filename: 'sai_xl_canny_256lora.safetensors',
    downloadUrl: 'https://huggingface.co/stabilityai/control-lora/resolve/main/control-LoRAs-rank256/control-lora-canny-rank256.safetensors',
    subfolder: 'controlnet',
    size: '390 MB',
    source: 'HuggingFace (Stability AI)',
  },
  {
    filename: 'sai_xl_depth_256lora.safetensors',
    downloadUrl: 'https://huggingface.co/stabilityai/control-lora/resolve/main/control-LoRAs-rank256/control-lora-depth-rank256.safetensors',
    subfolder: 'controlnet',
    size: '390 MB',
    source: 'HuggingFace (Stability AI)',
  },
  {
    filename: 'sai_xl_openpose_256lora.safetensors',
    downloadUrl: 'https://huggingface.co/stabilityai/control-lora/resolve/main/control-LoRAs-rank256/control-lora-openposeXL2-rank256.safetensors',
    subfolder: 'controlnet',
    size: '390 MB',
    source: 'HuggingFace (Stability AI)',
  },
]);

// Upscale models
register([
  {
    filename: 'RealESRGAN_x4plus.pth',
    downloadUrl: 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth',
    subfolder: 'upscale_models',
    size: '67 MB',
    source: 'GitHub (xinntao)',
  },
  {
    filename: 'RealESRGAN_x4plus_anime_6B.pth',
    downloadUrl: 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth',
    subfolder: 'upscale_models',
    size: '17 MB',
    source: 'GitHub (xinntao)',
  },
  {
    filename: '4x-UltraSharp.pth',
    downloadUrl: 'https://huggingface.co/Kim2091/UltraSharp/resolve/main/4x-UltraSharp.pth',
    subfolder: 'upscale_models',
    size: '67 MB',
    source: 'HuggingFace (Kim2091)',
  },
  {
    filename: '4x_NMKD-Siax_200k.pth',
    downloadUrl: 'https://huggingface.co/gemasai/4x_NMKD-Siax_200k/resolve/main/4x_NMKD-Siax_200k.pth',
    subfolder: 'upscale_models',
    size: '64 MB',
    source: 'HuggingFace',
  },
]);

// IP-Adapter
register([
  {
    filename: 'ip-adapter_sd15.safetensors',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter_sd15.safetensors',
    subfolder: 'ipadapter',
    size: '93 MB',
    source: 'HuggingFace (h94)',
  },
  {
    filename: 'ip-adapter-plus_sd15.safetensors',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-plus_sd15.safetensors',
    subfolder: 'ipadapter',
    size: '98 MB',
    source: 'HuggingFace (h94)',
  },
  {
    filename: 'ip-adapter_sdxl.safetensors',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter_sdxl.safetensors',
    subfolder: 'ipadapter',
    size: '682 MB',
    source: 'HuggingFace (h94)',
  },
  {
    filename: 'ip-adapter-plus_sdxl_vit-h.safetensors',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus_sdxl_vit-h.safetensors',
    subfolder: 'ipadapter',
    size: '848 MB',
    source: 'HuggingFace (h94)',
  },
]);

// CLIP Vision
register([
  {
    filename: 'CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors',
    subfolder: 'clip_vision',
    size: '2.5 GB',
    source: 'HuggingFace (h94/IP-Adapter)',
  },
  {
    filename: 'CLIP-ViT-bigG-14-laion2B-39B-b160k.safetensors',
    downloadUrl: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/image_encoder/model.safetensors',
    subfolder: 'clip_vision',
    size: '3.7 GB',
    source: 'HuggingFace (h94/IP-Adapter)',
  },
]);

// Embeddings / misc
register([
  {
    filename: 'badhandv4.pt',
    downloadUrl: 'https://huggingface.co/yesyeahvh/bad-hands-5/resolve/main/badhandv4.pt',
    subfolder: 'embeddings',
    size: '24 KB',
    source: 'HuggingFace',
  },
  {
    filename: 'EasyNegative.safetensors',
    downloadUrl: 'https://huggingface.co/datasets/gsdf/EasyNegative/resolve/main/EasyNegative.safetensors',
    subfolder: 'embeddings',
    size: '84 KB',
    source: 'HuggingFace',
  },
  {
    filename: 'ng_deepnegative_v1_75t.pt',
    downloadUrl: 'https://huggingface.co/datasets/gsdf/Counterfeit-V2.5/resolve/main/embeddings/ng_deepnegative_v1_75t.pt',
    subfolder: 'embeddings',
    size: '73 KB',
    source: 'HuggingFace',
  },
]);

export function lookupKnownModel(filename: string): KnownModel | undefined {
  const exact = KNOWN_MODELS_DB.get(filename.toLowerCase());
  if (exact) return exact;

  const baseName = filename.includes('\\')
    ? filename.split('\\').pop() || filename
    : filename.includes('/')
      ? filename.split('/').pop() || filename
      : filename;
  return KNOWN_MODELS_DB.get(baseName.toLowerCase());
}

export function lookupModel(filename: string): KnownModel | undefined {
  return lookupKnownModel(filename);
}

export function getModelSubfolder(category: string): string {
  const map: Record<string, string> = {
    checkpoint: 'checkpoints',
    vae: 'vae',
    clip: 'clip',
    lora: 'loras',
    controlnet: 'controlnet',
    upscale: 'upscale_models',
    ipadapter: 'ipadapter',
    other: 'models',
  };
  return map[category] || 'models';
}

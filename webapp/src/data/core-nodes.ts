import type { NodeSchema } from '../types/comfyui';

// Connection types (non-widget types that require links)
export const CONNECTION_TYPES = [
  'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE', 'MASK',
  'CONTROL_NET', 'CLIP_VISION', 'CLIP_VISION_OUTPUT', 'STYLE_MODEL',
  'UPSCALE_MODEL', 'SIGMAS', 'SAMPLER', 'GUIDER', 'NOISE', 'TAESD',
  'PHOTOMAKER', 'GLIGEN', '*'
];

export const CORE_NODES: NodeSchema[] = [
  // ===== LOADERS =====
  {
    name: 'CheckpointLoaderSimple',
    displayName: 'Load Checkpoint',
    category: 'loaders',
    description: 'Loads a diffusion model checkpoint (SD1.5, SDXL, etc.)',
    inputs: [
      { name: 'ckpt_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_model.safetensors'], tooltip: 'Select checkpoint file' }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 },
      { name: 'CLIP', type: 'CLIP', slotIndex: 1 },
      { name: 'VAE', type: 'VAE', slotIndex: 2 }
    ],
    source: 'core'
  },
  {
    name: 'UNETLoader',
    displayName: 'Load Diffusion Model',
    category: 'loaders',
    description: 'Loads a UNET/diffusion model (used for FLUX, etc.)',
    inputs: [
      { name: 'unet_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_unet_model.safetensors'] },
      { name: 'weight_dtype', type: 'STRING', isRequired: true, isWidget: true, options: ['default', 'fp8_e4m3fn', 'fp8_e5m2'], default: 'default' }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'DualCLIPLoader',
    displayName: 'DualCLIPLoader',
    category: 'loaders',
    description: 'Loads two CLIP models (used for FLUX, SDXL, etc.)',
    inputs: [
      { name: 'clip_name1', type: 'STRING', isRequired: true, isWidget: true, options: ['your_clip_model_1.safetensors'] },
      { name: 'clip_name2', type: 'STRING', isRequired: true, isWidget: true, options: ['your_clip_model_2.safetensors'] },
      { name: 'type', type: 'STRING', isRequired: true, isWidget: true, options: ['sdxl', 'sd3', 'flux'], default: 'sdxl' }
    ],
    outputs: [
      { name: 'CLIP', type: 'CLIP', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'CLIPLoader',
    displayName: 'Load CLIP',
    category: 'loaders',
    description: 'Loads a single CLIP model',
    inputs: [
      { name: 'clip_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_clip_model.safetensors'] },
      { name: 'type', type: 'STRING', isRequired: true, isWidget: true, options: ['stable_diffusion', 'stable_cascade', 'sd3', 'stable_audio'], default: 'stable_diffusion' }
    ],
    outputs: [
      { name: 'CLIP', type: 'CLIP', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'VAELoader',
    displayName: 'Load VAE',
    category: 'loaders',
    description: 'Loads a VAE model',
    inputs: [
      { name: 'vae_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_vae.safetensors'] }
    ],
    outputs: [
      { name: 'VAE', type: 'VAE', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'LoraLoader',
    displayName: 'Load LoRA',
    category: 'loaders',
    description: 'Loads a LoRA model and applies it to MODEL and CLIP',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'clip', type: 'CLIP', isRequired: true, isWidget: false },
      { name: 'lora_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_lora.safetensors'] },
      { name: 'strength_model', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: -20, max: 20 },
      { name: 'strength_clip', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: -20, max: 20 }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 },
      { name: 'CLIP', type: 'CLIP', slotIndex: 1 }
    ],
    source: 'core'
  },
  {
    name: 'LoraLoaderModelOnly',
    displayName: 'Load LoRA (Model Only)',
    category: 'loaders',
    description: 'Loads a LoRA and applies it to MODEL only',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'lora_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_lora.safetensors'] },
      { name: 'strength_model', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: -20, max: 20 }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ControlNetLoader',
    displayName: 'Load ControlNet Model',
    category: 'loaders',
    description: 'Loads a ControlNet model',
    inputs: [
      { name: 'control_net_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_controlnet.safetensors'] }
    ],
    outputs: [
      { name: 'CONTROL_NET', type: 'CONTROL_NET', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'CLIPVisionLoader',
    displayName: 'Load CLIP Vision',
    category: 'loaders',
    description: 'Loads a CLIP Vision model',
    inputs: [
      { name: 'clip_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_clip_vision.safetensors'] }
    ],
    outputs: [
      { name: 'CLIP_VISION', type: 'CLIP_VISION', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'StyleModelLoader',
    displayName: 'Load Style Model',
    category: 'loaders',
    description: 'Loads a style model (e.g., for IP-Adapter)',
    inputs: [
      { name: 'style_model_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_style_model.safetensors'] }
    ],
    outputs: [
      { name: 'STYLE_MODEL', type: 'STYLE_MODEL', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'UpscaleModelLoader',
    displayName: 'Load Upscale Model',
    category: 'loaders',
    description: 'Loads an upscale model (RealESRGAN, etc.)',
    inputs: [
      { name: 'model_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_upscale_model.pth'] }
    ],
    outputs: [
      { name: 'UPSCALE_MODEL', type: 'UPSCALE_MODEL', slotIndex: 0 }
    ],
    source: 'core'
  },

  // ===== CONDITIONING =====
  {
    name: 'CLIPTextEncode',
    displayName: 'CLIP Text Encode (Prompt)',
    category: 'conditioning',
    description: 'Encodes text using CLIP for conditioning',
    inputs: [
      { name: 'clip', type: 'CLIP', isRequired: true, isWidget: false },
      { name: 'text', type: 'STRING', isRequired: true, isWidget: true, default: '' }
    ],
    outputs: [
      { name: 'CONDITIONING', type: 'CONDITIONING', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'CLIPTextEncodeSDXL',
    displayName: 'CLIP Text Encode (SDXL)',
    category: 'conditioning',
    description: 'Encodes text using CLIP for SDXL with crop/target size',
    inputs: [
      { name: 'clip', type: 'CLIP', isRequired: true, isWidget: false },
      { name: 'width', type: 'INT', isRequired: true, isWidget: true, default: 1024 },
      { name: 'height', type: 'INT', isRequired: true, isWidget: true, default: 1024 },
      { name: 'crop_w', type: 'INT', isRequired: true, isWidget: true, default: 0 },
      { name: 'crop_h', type: 'INT', isRequired: true, isWidget: true, default: 0 },
      { name: 'target_width', type: 'INT', isRequired: true, isWidget: true, default: 1024 },
      { name: 'target_height', type: 'INT', isRequired: true, isWidget: true, default: 1024 },
      { name: 'text_g', type: 'STRING', isRequired: true, isWidget: true, default: '' },
      { name: 'text_l', type: 'STRING', isRequired: true, isWidget: true, default: '' }
    ],
    outputs: [
      { name: 'CONDITIONING', type: 'CONDITIONING', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ConditioningCombine',
    displayName: 'Conditioning (Combine)',
    category: 'conditioning',
    description: 'Combines two conditioning inputs',
    inputs: [
      { name: 'conditioning_1', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'conditioning_2', type: 'CONDITIONING', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: 'CONDITIONING', type: 'CONDITIONING', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ConditioningSetArea',
    displayName: 'Conditioning (Set Area)',
    category: 'conditioning',
    description: 'Sets the area for conditioning (regional prompting)',
    inputs: [
      { name: 'conditioning', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'width', type: 'INT', isRequired: true, isWidget: true, default: 64, min: 64, max: 8192 },
      { name: 'height', type: 'INT', isRequired: true, isWidget: true, default: 64, min: 64, max: 8192 },
      { name: 'x', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 8192 },
      { name: 'y', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 8192 },
      { name: 'strength', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: 0, max: 10 }
    ],
    outputs: [
      { name: 'CONDITIONING', type: 'CONDITIONING', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ConditioningSetMask',
    displayName: 'Conditioning (Set Mask)',
    category: 'conditioning',
    description: 'Sets a mask for conditioning',
    inputs: [
      { name: 'conditioning', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'mask', type: 'MASK', isRequired: true, isWidget: false },
      { name: 'strength', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: 0, max: 10 },
      { name: 'set_cond_area', type: 'STRING', isRequired: true, isWidget: true, options: ['default', 'mask bounds'], default: 'default' }
    ],
    outputs: [
      { name: 'CONDITIONING', type: 'CONDITIONING', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ControlNetApply',
    displayName: 'Apply ControlNet',
    category: 'conditioning',
    description: 'Applies a ControlNet model to conditioning',
    inputs: [
      { name: 'conditioning', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'control_net', type: 'CONTROL_NET', isRequired: true, isWidget: false },
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'strength', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: 0, max: 10 }
    ],
    outputs: [
      { name: 'CONDITIONING', type: 'CONDITIONING', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ControlNetApplyAdvanced',
    displayName: 'Apply ControlNet (Advanced)',
    category: 'conditioning',
    description: 'Applies ControlNet with separate positive/negative conditioning',
    inputs: [
      { name: 'positive', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'negative', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'control_net', type: 'CONTROL_NET', isRequired: true, isWidget: false },
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'strength', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: 0, max: 10 },
      { name: 'start_percent', type: 'FLOAT', isRequired: true, isWidget: true, default: 0.0, min: 0, max: 1 },
      { name: 'end_percent', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: 0, max: 1 }
    ],
    outputs: [
      { name: 'positive', type: 'CONDITIONING', slotIndex: 0 },
      { name: 'negative', type: 'CONDITIONING', slotIndex: 1 }
    ],
    source: 'core'
  },
  {
    name: 'CLIPSetLastLayer',
    displayName: 'CLIP Set Last Layer',
    category: 'conditioning',
    description: 'Sets the last CLIP layer to use (skip layers)',
    inputs: [
      { name: 'clip', type: 'CLIP', isRequired: true, isWidget: false },
      { name: 'stop_at_clip_layer', type: 'INT', isRequired: true, isWidget: true, default: -1, min: -24, max: -1 }
    ],
    outputs: [
      { name: 'CLIP', type: 'CLIP', slotIndex: 0 }
    ],
    source: 'core'
  },

  // ===== SAMPLING =====
  {
    name: 'KSampler',
    displayName: 'KSampler',
    category: 'sampling',
    description: 'The main sampling node — generates latent images',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'positive', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'negative', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'latent_image', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'seed', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 18446744073709551615 },
      { name: 'control_after_generate', type: 'STRING', isRequired: true, isWidget: true, options: ['fixed', 'increment', 'decrement', 'randomize'], default: 'randomize' },
      { name: 'steps', type: 'INT', isRequired: true, isWidget: true, default: 20, min: 1, max: 10000 },
      { name: 'cfg', type: 'FLOAT', isRequired: true, isWidget: true, default: 8.0, min: 0, max: 100 },
      { name: 'sampler_name', type: 'STRING', isRequired: true, isWidget: true, options: ['euler', 'euler_ancestral', 'heun', 'heunpp2', 'dpm_2', 'dpm_2_ancestral', 'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde', 'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde', 'dpmpp_3m_sde_gpu', 'ddpm', 'lcm', 'ddim', 'uni_pc', 'uni_pc_bh2'], default: 'euler' },
      { name: 'scheduler', type: 'STRING', isRequired: true, isWidget: true, options: ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform', 'beta'], default: 'normal' },
      { name: 'denoise', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: 0, max: 1 }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'KSamplerAdvanced',
    displayName: 'KSampler (Advanced)',
    category: 'sampling',
    description: 'Advanced sampler with start/end step control',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'positive', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'negative', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'latent_image', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'add_noise', type: 'STRING', isRequired: true, isWidget: true, options: ['enable', 'disable'], default: 'enable' },
      { name: 'noise_seed', type: 'INT', isRequired: true, isWidget: true, default: 0 },
      { name: 'control_after_generate', type: 'STRING', isRequired: true, isWidget: true, options: ['fixed', 'increment', 'decrement', 'randomize'], default: 'randomize' },
      { name: 'steps', type: 'INT', isRequired: true, isWidget: true, default: 20, min: 1, max: 10000 },
      { name: 'cfg', type: 'FLOAT', isRequired: true, isWidget: true, default: 8.0, min: 0, max: 100 },
      { name: 'sampler_name', type: 'STRING', isRequired: true, isWidget: true, options: ['euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_3m_sde', 'ddpm', 'lcm', 'uni_pc'], default: 'euler' },
      { name: 'scheduler', type: 'STRING', isRequired: true, isWidget: true, options: ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform', 'beta'], default: 'normal' },
      { name: 'start_at_step', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 10000 },
      { name: 'end_at_step', type: 'INT', isRequired: true, isWidget: true, default: 10000, min: 0, max: 10000 },
      { name: 'return_with_leftover_noise', type: 'STRING', isRequired: true, isWidget: true, options: ['disable', 'enable'], default: 'disable' }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },

  // ===== LATENT =====
  {
    name: 'EmptyLatentImage',
    displayName: 'Empty Latent Image',
    category: 'latent',
    description: 'Creates an empty latent image of specified dimensions',
    inputs: [
      { name: 'width', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 16, max: 16384 },
      { name: 'height', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 16, max: 16384 },
      { name: 'batch_size', type: 'INT', isRequired: true, isWidget: true, default: 1, min: 1, max: 4096 }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'LatentUpscale',
    displayName: 'Upscale Latent',
    category: 'latent',
    description: 'Upscales a latent image to specific dimensions',
    inputs: [
      { name: 'samples', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'upscale_method', type: 'STRING', isRequired: true, isWidget: true, options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'bislerp'], default: 'nearest-exact' },
      { name: 'width', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 0, max: 16384 },
      { name: 'height', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 0, max: 16384 },
      { name: 'crop', type: 'STRING', isRequired: true, isWidget: true, options: ['disabled', 'center'], default: 'disabled' }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'LatentUpscaleBy',
    displayName: 'Upscale Latent By',
    category: 'latent',
    description: 'Upscales a latent image by a scale factor',
    inputs: [
      { name: 'samples', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'upscale_method', type: 'STRING', isRequired: true, isWidget: true, options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'bislerp'], default: 'nearest-exact' },
      { name: 'scale_by', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.5, min: 0.01, max: 8.0 }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'LatentComposite',
    displayName: 'Latent Composite',
    category: 'latent',
    description: 'Composites two latent images together',
    inputs: [
      { name: 'samples_to', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'samples_from', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'x', type: 'INT', isRequired: true, isWidget: true, default: 0 },
      { name: 'y', type: 'INT', isRequired: true, isWidget: true, default: 0 },
      { name: 'feather', type: 'INT', isRequired: true, isWidget: true, default: 0 }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'RepeatLatentBatch',
    displayName: 'Repeat Latent Batch',
    category: 'latent',
    description: 'Repeats a latent image batch N times',
    inputs: [
      { name: 'samples', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'amount', type: 'INT', isRequired: true, isWidget: true, default: 1, min: 1, max: 64 }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },

  // ===== IMAGE =====
  {
    name: 'LoadImage',
    displayName: 'Load Image',
    category: 'image',
    description: 'Loads an image from the input directory',
    inputs: [
      { name: 'image', type: 'STRING', isRequired: true, isWidget: true, options: ['example.png'] },
      { name: 'upload', type: 'STRING', isRequired: false, isWidget: true }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 },
      { name: 'MASK', type: 'MASK', slotIndex: 1 }
    ],
    source: 'core'
  },
  {
    name: 'SaveImage',
    displayName: 'Save Image',
    category: 'image',
    description: 'Saves an image to the output directory',
    inputs: [
      { name: 'images', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'filename_prefix', type: 'STRING', isRequired: true, isWidget: true, default: 'ComfyUI' }
    ],
    outputs: [],
    source: 'core'
  },
  {
    name: 'PreviewImage',
    displayName: 'Preview Image',
    category: 'image',
    description: 'Previews an image (temp file, not saved permanently)',
    inputs: [
      { name: 'images', type: 'IMAGE', isRequired: true, isWidget: false }
    ],
    outputs: [],
    source: 'core'
  },
  {
    name: 'ImageScale',
    displayName: 'Scale Image',
    category: 'image',
    description: 'Scales an image to specific dimensions',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'upscale_method', type: 'STRING', isRequired: true, isWidget: true, options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos'], default: 'nearest-exact' },
      { name: 'width', type: 'INT', isRequired: true, isWidget: true, default: 512 },
      { name: 'height', type: 'INT', isRequired: true, isWidget: true, default: 512 },
      { name: 'crop', type: 'STRING', isRequired: true, isWidget: true, options: ['disabled', 'center'], default: 'disabled' }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ImageScaleBy',
    displayName: 'Scale Image By',
    category: 'image',
    description: 'Scales an image by a factor',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'upscale_method', type: 'STRING', isRequired: true, isWidget: true, options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos'], default: 'nearest-exact' },
      { name: 'scale_by', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.5, min: 0.01, max: 8.0 }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ImageUpscaleWithModel',
    displayName: 'Upscale Image (Using Model)',
    category: 'image',
    description: 'Upscales image using an upscale model (e.g. RealESRGAN)',
    inputs: [
      { name: 'upscale_model', type: 'UPSCALE_MODEL', isRequired: true, isWidget: false },
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ImageInvert',
    displayName: 'Invert Image',
    category: 'image',
    description: 'Inverts an image',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ImageBatch',
    displayName: 'Batch Images',
    category: 'image',
    description: 'Combines multiple images into a batch',
    inputs: [
      { name: 'image1', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'image2', type: 'IMAGE', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ImagePadForOutpaint',
    displayName: 'Pad Image for Outpainting',
    category: 'image',
    description: 'Pads an image for outpainting with feathered edges',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'left', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 8192 },
      { name: 'top', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 8192 },
      { name: 'right', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 8192 },
      { name: 'bottom', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 8192 },
      { name: 'feathering', type: 'INT', isRequired: true, isWidget: true, default: 40, min: 0, max: 8192 }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 },
      { name: 'MASK', type: 'MASK', slotIndex: 1 }
    ],
    source: 'core'
  },

  // ===== VAE =====
  {
    name: 'VAEDecode',
    displayName: 'VAE Decode',
    category: 'vae',
    description: 'Decodes latent images to pixel images using VAE',
    inputs: [
      { name: 'samples', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'vae', type: 'VAE', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'VAEEncode',
    displayName: 'VAE Encode',
    category: 'vae',
    description: 'Encodes pixel images to latent space using VAE',
    inputs: [
      { name: 'pixels', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'vae', type: 'VAE', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'VAEEncodeForInpaint',
    displayName: 'VAE Encode (for Inpainting)',
    category: 'vae',
    description: 'Encodes image with mask for inpainting',
    inputs: [
      { name: 'pixels', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'vae', type: 'VAE', isRequired: true, isWidget: false },
      { name: 'mask', type: 'MASK', isRequired: true, isWidget: false },
      { name: 'grow_mask_by', type: 'INT', isRequired: true, isWidget: true, default: 6, min: 0, max: 64 }
    ],
    outputs: [
      { name: 'LATENT', type: 'LATENT', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'VAEDecodeTiled',
    displayName: 'VAE Decode (Tiled)',
    category: 'vae',
    description: 'Decodes large latent images in tiles to save VRAM',
    inputs: [
      { name: 'samples', type: 'LATENT', isRequired: true, isWidget: false },
      { name: 'vae', type: 'VAE', isRequired: true, isWidget: false },
      { name: 'tile_size', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 320, max: 4096 }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'core'
  },

  // ===== MASK =====
  {
    name: 'MaskToImage',
    displayName: 'Convert Mask to Image',
    category: 'mask',
    description: 'Converts a mask to a grayscale image',
    inputs: [
      { name: 'mask', type: 'MASK', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ImageToMask',
    displayName: 'Convert Image to Mask',
    category: 'mask',
    description: 'Converts an image channel to a mask',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'channel', type: 'STRING', isRequired: true, isWidget: true, options: ['red', 'green', 'blue', 'alpha'], default: 'red' }
    ],
    outputs: [
      { name: 'MASK', type: 'MASK', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'SolidMask',
    displayName: 'Solid Mask',
    category: 'mask',
    description: 'Creates a solid-color mask',
    inputs: [
      { name: 'value', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: 0, max: 1 },
      { name: 'width', type: 'INT', isRequired: true, isWidget: true, default: 512 },
      { name: 'height', type: 'INT', isRequired: true, isWidget: true, default: 512 }
    ],
    outputs: [
      { name: 'MASK', type: 'MASK', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'InvertMask',
    displayName: 'Invert Mask',
    category: 'mask',
    description: 'Inverts a mask',
    inputs: [
      { name: 'mask', type: 'MASK', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: 'MASK', type: 'MASK', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'GrowMask',
    displayName: 'Grow Mask',
    category: 'mask',
    description: 'Expands or contracts a mask',
    inputs: [
      { name: 'mask', type: 'MASK', isRequired: true, isWidget: false },
      { name: 'expand', type: 'INT', isRequired: true, isWidget: true, default: 0, min: -8192, max: 8192 },
      { name: 'tapered_corners', type: 'BOOLEAN', isRequired: true, isWidget: true, default: true }
    ],
    outputs: [
      { name: 'MASK', type: 'MASK', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'FeatherMask',
    displayName: 'Feather Mask',
    category: 'mask',
    description: 'Feathers (softens edges of) a mask',
    inputs: [
      { name: 'mask', type: 'MASK', isRequired: true, isWidget: false },
      { name: 'left', type: 'INT', isRequired: true, isWidget: true, default: 0 },
      { name: 'top', type: 'INT', isRequired: true, isWidget: true, default: 0 },
      { name: 'right', type: 'INT', isRequired: true, isWidget: true, default: 0 },
      { name: 'bottom', type: 'INT', isRequired: true, isWidget: true, default: 0 }
    ],
    outputs: [
      { name: 'MASK', type: 'MASK', slotIndex: 0 }
    ],
    source: 'core'
  },

  // ===== MODEL PATCHES =====
  {
    name: 'FreeU_V2',
    displayName: 'FreeU V2',
    category: 'model_patches',
    description: 'Applies FreeU V2 to improve image quality without training',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'b1', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.3, min: 0, max: 10 },
      { name: 'b2', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.4, min: 0, max: 10 },
      { name: 's1', type: 'FLOAT', isRequired: true, isWidget: true, default: 0.9, min: 0, max: 10 },
      { name: 's2', type: 'FLOAT', isRequired: true, isWidget: true, default: 0.2, min: 0, max: 10 }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'ModelSamplingDiscrete',
    displayName: 'Model Sampling Discrete',
    category: 'model_patches',
    description: 'Changes the sampling type of a model',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'sampling', type: 'STRING', isRequired: true, isWidget: true, options: ['eps', 'v_prediction', 'lcm', 'x0'], default: 'eps' },
      { name: 'zsnr', type: 'BOOLEAN', isRequired: false, isWidget: true, default: false }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'RescaleCFG',
    displayName: 'Rescale CFG',
    category: 'model_patches',
    description: 'Rescales CFG to reduce color saturation issues',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'multiplier', type: 'FLOAT', isRequired: true, isWidget: true, default: 0.7, min: 0, max: 1 }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 }
    ],
    source: 'core'
  },

  // ===== UTILITY =====
  {
    name: 'Note',
    displayName: 'Note',
    category: 'utility',
    description: 'A text note for documentation purposes',
    inputs: [
      { name: 'text', type: 'STRING', isRequired: false, isWidget: true, default: '' }
    ],
    outputs: [],
    source: 'core'
  },
  {
    name: 'PrimitiveNode',
    displayName: 'Primitive',
    category: 'utility',
    description: 'A primitive value node (can output any widget value)',
    inputs: [],
    outputs: [
      { name: '*', type: '*', slotIndex: 0 }
    ],
    source: 'core'
  },
  {
    name: 'Reroute',
    displayName: 'Reroute',
    category: 'utility',
    description: 'Reroutes a connection for cleaner wiring',
    inputs: [
      { name: '', type: '*', isRequired: true, isWidget: false }
    ],
    outputs: [
      { name: '', type: '*', slotIndex: 0 }
    ],
    source: 'core'
  }
];

// Build a map for quick lookup
export const CORE_NODES_MAP = new Map<string, NodeSchema>(
  CORE_NODES.map(n => [n.name, n])
);

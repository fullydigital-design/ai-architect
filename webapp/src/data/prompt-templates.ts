export interface PromptTemplate {
  label: string;
  icon: string;
  prompt: string;
  category: 'basic' | 'advanced' | 'video';
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    label: 'SD 1.5 Basic',
    icon: '🎨',
    prompt: 'Build a basic Stable Diffusion 1.5 text-to-image workflow with KSampler, positive and negative prompts, and image saving.',
    category: 'basic'
  },
  {
    label: 'SDXL Standard',
    icon: '🖼',
    prompt: 'Build an SDXL text-to-image workflow at 1024x1024 with proper SDXL prompting (text_g and text_l), euler sampler, karras scheduler, 25 steps.',
    category: 'basic'
  },
  {
    label: 'FLUX Dev',
    icon: '⚡',
    prompt: 'Build a FLUX.1 Dev workflow using UNETLoader and DualCLIPLoader with proper FLUX settings (euler sampler, simple scheduler, cfg 1.0, 20 steps, 1024x1024).',
    category: 'basic'
  },
  {
    label: 'ControlNet Canny',
    icon: '🔲',
    prompt: 'Build an SDXL workflow with ControlNet using Canny edge detection from an input image. Include the Canny preprocessor node and ControlNetApplyAdvanced.',
    category: 'advanced'
  },
  {
    label: 'IP-Adapter Style',
    icon: '🎭',
    prompt: 'Build an SDXL workflow with IP-Adapter for style transfer from a reference image. Use IPAdapterUnifiedLoader and IPAdapterAdvanced.',
    category: 'advanced'
  },
  {
    label: 'Inpainting',
    icon: '🖌',
    prompt: 'Build an inpainting workflow that takes an image and mask, and regenerates the masked area using VAEEncodeForInpaint. Include LoadImage nodes for both image and mask.',
    category: 'advanced'
  },
  {
    label: 'Upscale 2x',
    icon: '🔍',
    prompt: 'Build a 2-pass upscaling workflow: first upscale with an upscale model (ImageUpscaleWithModel), then encode back to latent and do a second KSampler pass at 0.4 denoise for refinement.',
    category: 'advanced'
  },
  {
    label: 'LoRA Workflow',
    icon: '🧩',
    prompt: 'Build an SDXL workflow with a LoRA model applied. Insert LoraLoader between CheckpointLoaderSimple and the CLIPTextEncode/KSampler nodes.',
    category: 'advanced'
  },
  {
    label: 'AnimateDiff',
    icon: '🎬',
    prompt: 'Build an AnimateDiff video generation workflow with 16 frames output as a GIF. Use ADE_AnimateDiffLoaderGen1 and ADE_AnimateDiffCombine.',
    category: 'video'
  },
  {
    label: 'Depth ControlNet',
    icon: '🗺',
    prompt: 'Build an SDXL workflow with ControlNet using Depth Anything preprocessor for depth-guided generation from a reference image.',
    category: 'advanced'
  }
];

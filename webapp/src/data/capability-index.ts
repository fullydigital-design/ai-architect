/**
 * Capability Index — maps ~30 functional categories to keywords and known packs.
 *
 * Used by the pack-suggester to determine which of the user's pinned packs
 * (or which packs from the full registry) are relevant to a given request.
 */

export interface Capability {
  /** Human-readable category name */
  label: string;
  /** Keywords/phrases that indicate this capability is needed */
  keywords: string[];
  /** GitHub repo names or pack titles (lowercased) that provide this capability */
  packs: string[];
}

export const CAPABILITY_INDEX: Record<string, Capability> = {
  face_detection: {
    label: 'Face Detection',
    keywords: ['face', 'facial', 'portrait', 'headshot', 'person detection', 'face detection'],
    packs: [
      'comfyui-impact-pack',
      'comfyui-faceanalysis',
      'comfyui-reactor-node',
      'comfyui-instantid',
    ],
  },
  face_swap: {
    label: 'Face Swap',
    keywords: ['face swap', 'face replace', 'identity swap', 'deepfake', 'face transfer', 'swap face'],
    packs: [
      'comfyui-reactor-node',
      'comfyui-ipadapter-faceid',
      'comfyui-instantid',
    ],
  },
  face_restore: {
    label: 'Face Restoration',
    keywords: ['face restore', 'face fix', 'face enhance', 'gfpgan', 'codeformer', 'face detail'],
    packs: [
      'comfyui-impact-pack',
      'comfyui-reactor-node',
      'comfyui-facerestore',
    ],
  },
  upscaling: {
    label: 'Upscaling',
    keywords: ['upscale', '4k', '8k', 'super resolution', 'enhance resolution', 'high res', 'hires', 'upscaler', 'magnify'],
    packs: [
      'comfyui-supir',
      'comfyui_essentials',
      'comfyui-art-venture',
      'comfyui-kjnodes',
    ],
  },
  style_transfer: {
    label: 'Style Transfer',
    keywords: ['style transfer', 'artistic style', 'art style', 'stylize', 'painting style', 'reference style', 'ip-adapter', 'ipadapter'],
    packs: [
      'comfyui_ipadapter_plus',
      'comfyui-style-aligned',
    ],
  },
  controlnet: {
    label: 'ControlNet',
    keywords: ['controlnet', 'control net', 'pose', 'depth map', 'canny', 'edge detection', 'skeleton', 'openpose', 'lineart', 'scribble', 'guide image'],
    packs: [
      'comfyui-advanced-controlnet',
      'comfyui_controlnet_aux',
      'comfyui-controlnet-preprocessors',
    ],
  },
  inpainting: {
    label: 'Inpainting',
    keywords: ['inpaint', 'fill', 'repair', 'restore', 'fix area', 'mask fill', 'brushnet', 'paint over'],
    packs: [
      'comfyui-impact-pack',
      'comfyui-brushnet',
      'comfyui-inpaint-nodes',
    ],
  },
  outpainting: {
    label: 'Outpainting',
    keywords: ['outpaint', 'extend', 'expand image', 'canvas extend', 'uncrop'],
    packs: [
      'comfyui-impact-pack',
      'comfyui_essentials',
    ],
  },
  segmentation: {
    label: 'Segmentation',
    keywords: ['segment', 'mask', 'cutout', 'background removal', 'background remove', 'sam', 'segment anything', 'select area', 'foreground'],
    packs: [
      'comfyui-impact-pack',
      'comfyui-segment-anything',
      'comfyui-florence2',
    ],
  },
  video: {
    label: 'Video Generation',
    keywords: ['video', 'animation', 'animate', 'motion', 'frames', 'gif', 'animatediff', 'frame interpolation', 'temporal'],
    packs: [
      'comfyui-animatediff-evolved',
      'comfyui-frame-interpolation',
      'comfyui-videohelperSuite',
      'comfyui-advanced-controlnet',
    ],
  },
  video_processing: {
    label: 'Video Processing',
    keywords: ['video edit', 'video process', 'extract frames', 'video to frames', 'frames to video', 'video helper'],
    packs: [
      'comfyui-videohelperSuite',
      'comfyui-frame-interpolation',
    ],
  },
  image_to_image: {
    label: 'Image-to-Image',
    keywords: ['img2img', 'image to image', 'transform image', 'restyle', 'reimagine'],
    packs: [
      'comfyui_ipadapter_plus',
      'comfyui_essentials',
    ],
  },
  text_generation: {
    label: 'Text/Caption',
    keywords: ['caption', 'describe image', 'ocr', 'text recognition', 'image caption', 'florence', 'blip'],
    packs: [
      'comfyui-florence2',
      'comfyui-art-venture',
      'comfyui-llm',
    ],
  },
  lora: {
    label: 'LoRA Management',
    keywords: ['lora', 'lora loader', 'multiple lora', 'lora stack', 'lora weight'],
    packs: [
      'comfyui-impact-pack',
      'comfyui_essentials',
      'comfyui-kjnodes',
      'rgthree-comfy',
    ],
  },
  conditioning: {
    label: 'Advanced Conditioning',
    keywords: ['conditioning', 'prompt weight', 'area conditioning', 'regional prompt', 'attention couple', 'compositing'],
    packs: [
      'comfyui-impact-pack',
      'comfyui_essentials',
      'comfyui-cutoff',
    ],
  },
  latent_ops: {
    label: 'Latent Operations',
    keywords: ['latent', 'latent composite', 'latent blend', 'latent batch', 'noise injection'],
    packs: [
      'comfyui_essentials',
      'comfyui-kjnodes',
      'comfyui-latent-tools',
    ],
  },
  image_processing: {
    label: 'Image Processing',
    keywords: ['crop', 'resize', 'flip', 'rotate', 'blur', 'sharpen', 'brightness', 'contrast', 'color adjust', 'hue', 'saturation'],
    packs: [
      'comfyui_essentials',
      'was-node-suite-comfyui',
      'comfyui-kjnodes',
      'comfyui-art-venture',
    ],
  },
  tiling: {
    label: 'Tiling / Seamless',
    keywords: ['tile', 'tiling', 'seamless', 'pattern', 'tileable', 'texture'],
    packs: [
      'comfyui-tiled-diffusion',
      'comfyui_essentials',
    ],
  },
  flux: {
    label: 'FLUX',
    keywords: ['flux', 'flux.1', 'flux dev', 'flux schnell', 'flux pro'],
    packs: [
      'comfyui-gguf',
      'comfyui-kjnodes',
      'rgthree-comfy',
    ],
  },
  sdxl: {
    label: 'SDXL',
    keywords: ['sdxl', 'sd xl', 'stable diffusion xl', 'xl refiner', 'sdxl turbo'],
    packs: [
      'comfyui_essentials',
      'comfyui-kjnodes',
    ],
  },
  sd3: {
    label: 'SD3 / SD3.5',
    keywords: ['sd3', 'sd 3', 'stable diffusion 3', 'sd3.5'],
    packs: [
      'comfyui_essentials',
    ],
  },
  batch_processing: {
    label: 'Batch Processing',
    keywords: ['batch', 'multiple images', 'batch process', 'queue', 'iterate', 'loop'],
    packs: [
      'comfyui-impact-pack',
      'comfyui_essentials',
      'comfyui-kjnodes',
    ],
  },
  workflow_utils: {
    label: 'Workflow Utilities',
    keywords: ['switch', 'router', 'logic', 'conditional', 'if else', 'mux', 'merge', 'utility'],
    packs: [
      'rgthree-comfy',
      'comfyui-kjnodes',
      'comfyui_essentials',
      'was-node-suite-comfyui',
    ],
  },
  prompt_engineering: {
    label: 'Prompt Engineering',
    keywords: ['wildcard', 'random prompt', 'prompt builder', 'dynamic prompt', 'prompt schedule'],
    packs: [
      'comfyui-impact-pack',
      'was-node-suite-comfyui',
      'comfyui-kjnodes',
    ],
  },
  masking: {
    label: 'Masking',
    keywords: ['mask', 'alpha', 'transparency', 'mask composite', 'mask blur', 'mask invert'],
    packs: [
      'comfyui-impact-pack',
      'comfyui_essentials',
      'was-node-suite-comfyui',
    ],
  },
  depth: {
    label: 'Depth Estimation',
    keywords: ['depth', 'depth map', 'midas', 'zoe', 'marigold', '3d', 'depth estimation'],
    packs: [
      'comfyui_controlnet_aux',
      'comfyui-marigold',
      'comfyui-depth-anything',
    ],
  },
  color_grading: {
    label: 'Color Grading',
    keywords: ['color grade', 'color correction', 'lut', 'tone map', 'white balance', 'color match'],
    packs: [
      'comfyui_essentials',
      'was-node-suite-comfyui',
      'comfyui-art-venture',
    ],
  },
  text_overlay: {
    label: 'Text Overlay',
    keywords: ['text overlay', 'watermark', 'add text', 'font', 'typography', 'label'],
    packs: [
      'was-node-suite-comfyui',
      'comfyui_essentials',
    ],
  },
  model_merging: {
    label: 'Model Merging',
    keywords: ['merge model', 'model merge', 'checkpoint merge', 'blend model'],
    packs: [
      'comfyui_essentials',
      'comfyui-kjnodes',
    ],
  },
  audio: {
    label: 'Audio',
    keywords: ['audio', 'music', 'sound', 'voice', 'tts', 'speech'],
    packs: [
      'comfyui-audio',
      'comfyui-tts',
    ],
  },
};

/**
 * Detect which capabilities are needed based on a user message.
 * Returns an array of capability keys.
 */
export function detectCapabilities(message: string): string[] {
  const msg = message.toLowerCase();
  const detected: string[] = [];

  for (const [key, cap] of Object.entries(CAPABILITY_INDEX)) {
    for (const kw of cap.keywords) {
      if (msg.includes(kw)) {
        detected.push(key);
        break;
      }
    }
  }

  return detected;
}

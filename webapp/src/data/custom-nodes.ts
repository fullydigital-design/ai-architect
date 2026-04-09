import type { NodeSchema } from '../types/comfyui';

export interface CustomNodePack {
  name: string;
  github: string;
  description: string;
  installCommand: string;
  keyNodes: string[];
}

export const CUSTOM_NODE_PACKS: CustomNodePack[] = [
  {
    name: 'ComfyUI-Impact-Pack',
    github: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack',
    description: 'Face detection, SAM segmentation, detail enhancement',
    installCommand: 'comfy node install comfyui-impact-pack',
    keyNodes: ['SAMDetectorCombined', 'BboxDetectorSEGS', 'DetailerForEach', 'FaceDetailer']
  },
  {
    name: 'ComfyUI_IPAdapter_plus',
    github: 'https://github.com/cubiq/ComfyUI_IPAdapter_plus',
    description: 'IP-Adapter for style/composition transfer from reference images',
    installCommand: 'comfy node install comfyui-ipadapter-plus',
    keyNodes: ['IPAdapterAdvanced', 'IPAdapterModelLoader', 'IPAdapterUnifiedLoader']
  },
  {
    name: 'ComfyUI-KJNodes',
    github: 'https://github.com/kijai/ComfyUI-KJNodes',
    description: 'Utility nodes for image manipulation and conditioning',
    installCommand: 'comfy node install comfyui-kjnodes',
    keyNodes: ['GetImageSizeAndCount', 'ImageConcanate', 'ConditioningSetMaskAndCombine']
  },
  {
    name: 'ComfyUI_essentials',
    github: 'https://github.com/cubiq/ComfyUI_essentials',
    description: 'Essential utility nodes for image processing',
    installCommand: 'comfy node install comfyui-essentials',
    keyNodes: ['ImageResize+', 'ImageCrop+', 'MaskFromColor+']
  },
  {
    name: 'ComfyUI-Advanced-ControlNet',
    github: 'https://github.com/Kosinkadink/ComfyUI-Advanced-ControlNet',
    description: 'Advanced ControlNet features with scheduling and masking',
    installCommand: 'comfy node install comfyui-advanced-controlnet',
    keyNodes: ['ControlNetLoaderAdvanced', 'ACN_AdvancedControlNetApply']
  },
  {
    name: 'ComfyUI-AnimateDiff-Evolved',
    github: 'https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved',
    description: 'AnimateDiff for video generation',
    installCommand: 'comfy node install comfyui-animatediff-evolved',
    keyNodes: ['ADE_AnimateDiffLoaderGen1', 'ADE_AnimateDiffCombine']
  },
  {
    name: 'comfyui_controlnet_aux',
    github: 'https://github.com/Fannovel16/comfyui_controlnet_aux',
    description: 'ControlNet preprocessors (Canny, Depth, OpenPose, etc.)',
    installCommand: 'comfy node install comfyui-controlnet-aux',
    keyNodes: ['CannyEdgePreprocessor', 'DepthAnythingPreprocessor', 'DWPreprocessor', 'LineArtPreprocessor', 'OpenPosePreprocessor']
  },
  {
    name: 'ComfyUI-Florence2',
    github: 'https://github.com/kijai/ComfyUI-Florence2',
    description: 'Florence2 vision-language model integration',
    installCommand: 'comfy node install comfyui-florence2',
    keyNodes: ['Florence2ModelLoader', 'Florence2Run']
  },
  {
    name: 'was-node-suite-comfyui',
    github: 'https://github.com/WASasquatch/was-node-suite-comfyui',
    description: 'Large collection of utility nodes',
    installCommand: 'comfy node install was-node-suite-comfyui',
    keyNodes: ['WAS_Image_Resize', 'WAS_Text_String', 'WAS_Number']
  },
  {
    name: 'rgthree-comfy',
    github: 'https://github.com/rgthree/rgthree-comfy',
    description: 'Quality-of-life nodes including Power Lora Loader and group management',
    installCommand: 'comfy node install rgthree-comfy',
    keyNodes: ['Fast Groups Muter (rgthree)', 'Seed (rgthree)', 'Power Lora Loader (rgthree)']
  },
  {
    name: 'SwarmComfyCommon',
    github: 'https://github.com/mcmonkeyprojects/SwarmComfyCommon',
    description: 'Common SwarmUI utility and workflow nodes for ComfyUI',
    installCommand: 'git clone https://github.com/mcmonkeyprojects/SwarmComfyCommon',
    keyNodes: [
      'SwarmKSampler',
      'SwarmIntAdd',
      'SwarmClipSeg',
      'SwarmMaskGrow',
      'SwarmMaskBlur',
      'SwarmImageCrop',
      'SwarmUnsampler',
      'SwarmInputText',
      'SwarmImageNoise',
      'SwarmTrimFrames',
      'SwarmImageWidth',
      'SwarmLoraLoader',
      'SwarmMaskBounds'
    ]
  },
  {
    name: 'SwarmComfyExtra',
    github: 'https://github.com/mcmonkeyprojects/SwarmComfyExtra',
    description: 'Additional SwarmUI helper nodes for ComfyUI',
    installCommand: 'git clone https://github.com/mcmonkeyprojects/SwarmComfyExtra',
    keyNodes: ['SwarmRemBg']
  }
];

export const CUSTOM_NODES: NodeSchema[] = [
  // ===== IP-Adapter =====
  {
    name: 'IPAdapterUnifiedLoader',
    displayName: 'IPAdapter Unified Loader',
    category: 'ipadapter',
    description: 'Loads IP-Adapter model with automatic preset selection',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'preset', type: 'STRING', isRequired: true, isWidget: true, options: ['LIGHT - SD1.5 only', 'STANDARD (medium strength)', 'VIT-G (medium strength)', 'PLUS (high strength)', 'PLUS FACE (portraits)', 'FULL FACE - SD1.5 only'], default: 'STANDARD (medium strength)' }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 },
      { name: 'ipadapter', type: 'IPADAPTER', slotIndex: 1 }
    ],
    source: 'custom',
    customNodePack: 'ComfyUI_IPAdapter_plus',
    githubUrl: 'https://github.com/cubiq/ComfyUI_IPAdapter_plus'
  },
  {
    name: 'IPAdapterAdvanced',
    displayName: 'IPAdapter Advanced',
    category: 'ipadapter',
    description: 'Advanced IP-Adapter application with weight and timing control',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'ipadapter', type: 'IPADAPTER', isRequired: true, isWidget: false },
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'weight', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: -1, max: 3 },
      { name: 'weight_type', type: 'STRING', isRequired: true, isWidget: true, options: ['standard', 'prompt is more important', 'style transfer'], default: 'standard' },
      { name: 'start_at', type: 'FLOAT', isRequired: true, isWidget: true, default: 0, min: 0, max: 1 },
      { name: 'end_at', type: 'FLOAT', isRequired: true, isWidget: true, default: 1.0, min: 0, max: 1 }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 }
    ],
    source: 'custom',
    customNodePack: 'ComfyUI_IPAdapter_plus',
    githubUrl: 'https://github.com/cubiq/ComfyUI_IPAdapter_plus'
  },

  // ===== ControlNet Preprocessors =====
  {
    name: 'CannyEdgePreprocessor',
    displayName: 'Canny Edge Preprocessor',
    category: 'controlnet_preprocessors',
    description: 'Detects edges using Canny algorithm',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'low_threshold', type: 'INT', isRequired: true, isWidget: true, default: 100, min: 0, max: 255 },
      { name: 'high_threshold', type: 'INT', isRequired: true, isWidget: true, default: 200, min: 0, max: 255 },
      { name: 'resolution', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 64, max: 2048 }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'custom',
    customNodePack: 'comfyui_controlnet_aux',
    githubUrl: 'https://github.com/Fannovel16/comfyui_controlnet_aux'
  },
  {
    name: 'DepthAnythingPreprocessor',
    displayName: 'Depth Anything Preprocessor',
    category: 'controlnet_preprocessors',
    description: 'Estimates depth using Depth Anything model',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'ckpt_name', type: 'STRING', isRequired: true, isWidget: true, options: ['depth_anything_vitl14.pth', 'depth_anything_vitb14.pth', 'depth_anything_vits14.pth'], default: 'depth_anything_vitl14.pth' },
      { name: 'resolution', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 64, max: 2048 }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'custom',
    customNodePack: 'comfyui_controlnet_aux',
    githubUrl: 'https://github.com/Fannovel16/comfyui_controlnet_aux'
  },
  {
    name: 'DWPreprocessor',
    displayName: 'DW Pose Preprocessor',
    category: 'controlnet_preprocessors',
    description: 'Detects human pose using DWPose',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'detect_hand', type: 'STRING', isRequired: true, isWidget: true, options: ['enable', 'disable'], default: 'enable' },
      { name: 'detect_body', type: 'STRING', isRequired: true, isWidget: true, options: ['enable', 'disable'], default: 'enable' },
      { name: 'detect_face', type: 'STRING', isRequired: true, isWidget: true, options: ['enable', 'disable'], default: 'enable' },
      { name: 'resolution', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 64, max: 2048 }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'custom',
    customNodePack: 'comfyui_controlnet_aux',
    githubUrl: 'https://github.com/Fannovel16/comfyui_controlnet_aux'
  },
  {
    name: 'LineArtPreprocessor',
    displayName: 'Line Art Preprocessor',
    category: 'controlnet_preprocessors',
    description: 'Extracts line art from an image',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'coarse', type: 'STRING', isRequired: true, isWidget: true, options: ['disable', 'enable'], default: 'disable' },
      { name: 'resolution', type: 'INT', isRequired: true, isWidget: true, default: 512, min: 64, max: 2048 }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'custom',
    customNodePack: 'comfyui_controlnet_aux',
    githubUrl: 'https://github.com/Fannovel16/comfyui_controlnet_aux'
  },

  // ===== Impact Pack =====
  {
    name: 'FaceDetailer',
    displayName: 'FaceDetailer',
    category: 'impact',
    description: 'Automatically detects and enhances faces in generated images',
    inputs: [
      { name: 'image', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'clip', type: 'CLIP', isRequired: true, isWidget: false },
      { name: 'vae', type: 'VAE', isRequired: true, isWidget: false },
      { name: 'positive', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'negative', type: 'CONDITIONING', isRequired: true, isWidget: false },
      { name: 'bbox_detector', type: 'BBOX_DETECTOR', isRequired: true, isWidget: false },
      { name: 'guide_size', type: 'FLOAT', isRequired: true, isWidget: true, default: 384, min: 64, max: 2048 },
      { name: 'steps', type: 'INT', isRequired: true, isWidget: true, default: 20 },
      { name: 'cfg', type: 'FLOAT', isRequired: true, isWidget: true, default: 8.0 },
      { name: 'denoise', type: 'FLOAT', isRequired: true, isWidget: true, default: 0.5, min: 0, max: 1 },
      { name: 'seed', type: 'INT', isRequired: true, isWidget: true, default: 0 }
    ],
    outputs: [
      { name: 'IMAGE', type: 'IMAGE', slotIndex: 0 },
      { name: 'cropped_refined', type: 'IMAGE', slotIndex: 1 },
      { name: 'mask', type: 'MASK', slotIndex: 2 }
    ],
    source: 'custom',
    customNodePack: 'ComfyUI-Impact-Pack',
    githubUrl: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack'
  },

  // ===== AnimateDiff =====
  {
    name: 'ADE_AnimateDiffLoaderGen1',
    displayName: 'AnimateDiff Loader',
    category: 'animatediff',
    description: 'Loads AnimateDiff motion model and applies to base model',
    inputs: [
      { name: 'model', type: 'MODEL', isRequired: true, isWidget: false },
      { name: 'model_name', type: 'STRING', isRequired: true, isWidget: true, options: ['your_animatediff_model.ckpt'] },
      { name: 'beta_schedule', type: 'STRING', isRequired: true, isWidget: true, options: ['sqrt_linear (AnimateDiff)', 'linear (AnimateDiff-SDXL)', 'linear (HotshotXL)'], default: 'sqrt_linear (AnimateDiff)' }
    ],
    outputs: [
      { name: 'MODEL', type: 'MODEL', slotIndex: 0 }
    ],
    source: 'custom',
    customNodePack: 'ComfyUI-AnimateDiff-Evolved',
    githubUrl: 'https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved'
  },
  {
    name: 'ADE_AnimateDiffCombine',
    displayName: 'AnimateDiff Combine',
    category: 'animatediff',
    description: 'Combines images into video/gif output',
    inputs: [
      { name: 'images', type: 'IMAGE', isRequired: true, isWidget: false },
      { name: 'frame_rate', type: 'INT', isRequired: true, isWidget: true, default: 8, min: 1, max: 60 },
      { name: 'loop_count', type: 'INT', isRequired: true, isWidget: true, default: 0, min: 0, max: 100 },
      { name: 'format', type: 'STRING', isRequired: true, isWidget: true, options: ['image/gif', 'image/webp', 'video/webm'], default: 'image/gif' },
      { name: 'save_image', type: 'BOOLEAN', isRequired: true, isWidget: true, default: true }
    ],
    outputs: [
      { name: 'GIF', type: 'IMAGE', slotIndex: 0 }
    ],
    source: 'custom',
    customNodePack: 'ComfyUI-AnimateDiff-Evolved',
    githubUrl: 'https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved'
  }
];

export const CUSTOM_NODES_MAP = new Map<string, NodeSchema>(
  CUSTOM_NODES.map(n => [n.name, n])
);

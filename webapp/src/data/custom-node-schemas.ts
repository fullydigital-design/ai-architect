/**
 * Curated Key Node Schemas — hand-authored input/output specs for the
 * most-used nodes from the top custom node packs.
 *
 * These give the AI accurate type info so it can wire connections correctly,
 * rather than guessing based on node names alone.
 *
 * Format is compact to minimise token usage when injected into prompts.
 * ~150-200 tokens per node schema.
 */

// ---- Compact schema types ---------------------------------------------------

export interface CompactInput {
  name: string;
  type: string;
  /** 'w' = widget (value), 'c' = connection, 'cw' = can be either */
  mode: 'w' | 'c' | 'cw';
  required?: boolean;        // default true
  default?: string | number | boolean;
  options?: string[];        // for combo/dropdown widgets
  min?: number;
  max?: number;
}

export interface CompactOutput {
  name: string;
  type: string;
  slot: number;
}

export interface CompactNodeSchema {
  class_type: string;        // exact ComfyUI class name
  display: string;           // human-readable name
  category: string;
  inputs: CompactInput[];
  outputs: CompactOutput[];
}

export interface PackKeyNodes {
  packId: string;            // matches registry slug / GitHub repo name
  packTitle: string;
  nodes: CompactNodeSchema[];
}

// ---- Formatting for prompt injection ----------------------------------------

export function formatCompactSchemaForPrompt(node: CompactNodeSchema): string {
  const ins = node.inputs.map(i => {
    let desc = `    - ${i.name}: ${i.type}`;
    desc += i.mode === 'w' ? ' (widget)' : i.mode === 'c' ? ' (connection)' : ' (widget/connection)';
    if (i.required === false) desc += ' [optional]';
    if (i.default !== undefined) desc += ` [default: ${i.default}]`;
    if (i.options) desc += ` [options: ${i.options.join(', ')}]`;
    if (i.min !== undefined || i.max !== undefined) desc += ` [range: ${i.min ?? ''}..${i.max ?? ''}]`;
    return desc;
  }).join('\n');

  const outs = node.outputs.map(o =>
    `    - slot ${o.slot}: ${o.name} (${o.type})`
  ).join('\n');

  return `  **${node.class_type}** (${node.display})
  Category: ${node.category}
  Inputs:
${ins}
  Outputs:
${outs}`;
}

/**
 * Format all key nodes for a pack into a prompt section.
 */
export function formatPackSchemasForPrompt(pack: PackKeyNodes): string {
  const header = `#### ${pack.packTitle} — Key Nodes (${pack.nodes.length} documented)\n\n`;
  const body = pack.nodes.map(n => formatCompactSchemaForPrompt(n)).join('\n\n');
  return header + body;
}

// ---- Lookup ----------------------------------------------------------------

const _schemasByPack = new Map<string, PackKeyNodes>();

export function getKeyNodesForPack(packId: string): PackKeyNodes | null {
  if (_schemasByPack.size === 0) _buildIndex();
  // Try exact match first, then try common variations
  return _schemasByPack.get(packId.toLowerCase())
    || _schemasByPack.get(packId.toLowerCase().replace(/_/g, '-'))
    || null;
}

export function getAllCuratedPacks(): PackKeyNodes[] {
  if (_schemasByPack.size === 0) _buildIndex();
  return Array.from(_schemasByPack.values());
}

function _buildIndex() {
  for (const pack of CURATED_PACK_SCHEMAS) {
    _schemasByPack.set(pack.packId.toLowerCase(), pack);
    // Also index with hyphens replaced
    _schemasByPack.set(pack.packId.toLowerCase().replace(/_/g, '-'), pack);
  }
}

// ---- Curated Data -----------------------------------------------------------

export const CURATED_PACK_SCHEMAS: PackKeyNodes[] = [
  // =========================================================================
  // 1. ComfyUI Impact Pack
  // =========================================================================
  {
    packId: 'comfyui-impact-pack',
    packTitle: 'ComfyUI Impact Pack',
    nodes: [
      {
        class_type: 'SAMLoader',
        display: 'SAM Model Loader',
        category: 'ImpactPack',
        inputs: [
          { name: 'model_name', type: 'STRING', mode: 'w', options: ['sam_vit_h_4b8939.pth', 'sam_vit_l_0b3195.pth', 'sam_vit_b_01ec64.pth'] },
          { name: 'device_mode', type: 'STRING', mode: 'w', default: 'AUTO', options: ['AUTO', 'Prefer GPU', 'CPU'] },
        ],
        outputs: [
          { name: 'SAM_MODEL', type: 'SAM_MODEL', slot: 0 },
        ],
      },
      {
        class_type: 'SAMDetectorCombined',
        display: 'SAM Detector (Combined)',
        category: 'ImpactPack/Detector',
        inputs: [
          { name: 'sam_model', type: 'SAM_MODEL', mode: 'c' },
          { name: 'segs', type: 'SEGS', mode: 'c' },
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'detection_hint', type: 'STRING', mode: 'w', default: 'center-1', options: ['center-1', 'horizontal-2', 'vertical-2', 'rect-4', 'diamond-4', 'mask-area', 'mask-points', 'mask-point-bbox', 'none'] },
          { name: 'dilation', type: 'INT', mode: 'w', default: 0 },
          { name: 'threshold', type: 'FLOAT', mode: 'w', default: 0.93 },
          { name: 'bbox_expansion', type: 'INT', mode: 'w', default: 0 },
          { name: 'mask_hint_threshold', type: 'FLOAT', mode: 'w', default: 0.7 },
          { name: 'mask_hint_use_negative', type: 'STRING', mode: 'w', default: 'False', options: ['False', 'Small', 'Outter'] },
        ],
        outputs: [
          { name: 'MASK', type: 'MASK', slot: 0 },
        ],
      },
      {
        class_type: 'BboxDetectorSEGS',
        display: 'BBOX Detector (SEGS)',
        category: 'ImpactPack/Detector',
        inputs: [
          { name: 'bbox_detector', type: 'BBOX_DETECTOR', mode: 'c' },
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'threshold', type: 'FLOAT', mode: 'w', default: 0.5, min: 0, max: 1 },
          { name: 'dilation', type: 'INT', mode: 'w', default: 10 },
          { name: 'crop_factor', type: 'FLOAT', mode: 'w', default: 3.0 },
          { name: 'drop_size', type: 'INT', mode: 'w', default: 10 },
          { name: 'labels', type: 'STRING', mode: 'w', default: 'all' },
        ],
        outputs: [
          { name: 'SEGS', type: 'SEGS', slot: 0 },
        ],
      },
      {
        class_type: 'UltrabboxDetector',
        display: 'ULTRA BBOX Detector',
        category: 'ImpactPack/Detector',
        inputs: [
          { name: 'bbox_model', type: 'BBOX_DETECTOR', mode: 'c' },
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'threshold', type: 'FLOAT', mode: 'w', default: 0.5 },
          { name: 'dilation', type: 'INT', mode: 'w', default: 0 },
        ],
        outputs: [
          { name: 'SEGS', type: 'SEGS', slot: 0 },
        ],
      },
      {
        class_type: 'UltralyticsDetectorProvider',
        display: 'Ultralytics Detector Provider',
        category: 'ImpactPack',
        inputs: [
          { name: 'model_name', type: 'STRING', mode: 'w', options: ['bbox/face_yolov8m.pt', 'bbox/hand_yolov8s.pt', 'segm/person_yolov8m-seg.pt'] },
        ],
        outputs: [
          { name: 'BBOX_DETECTOR', type: 'BBOX_DETECTOR', slot: 0 },
          { name: 'SEGM_DETECTOR', type: 'SEGM_DETECTOR', slot: 1 },
        ],
      },
      {
        class_type: 'FaceDetailer',
        display: 'FaceDetailer',
        category: 'ImpactPack/Detailer',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'model', type: 'MODEL', mode: 'c' },
          { name: 'clip', type: 'CLIP', mode: 'c' },
          { name: 'vae', type: 'VAE', mode: 'c' },
          { name: 'positive', type: 'CONDITIONING', mode: 'c' },
          { name: 'negative', type: 'CONDITIONING', mode: 'c' },
          { name: 'bbox_detector', type: 'BBOX_DETECTOR', mode: 'c' },
          { name: 'sam_model_opt', type: 'SAM_MODEL', mode: 'c', required: false },
          { name: 'segm_detector_opt', type: 'SEGM_DETECTOR', mode: 'c', required: false },
          { name: 'guide_size', type: 'FLOAT', mode: 'w', default: 384, min: 64, max: 2048 },
          { name: 'guide_size_for', type: 'BOOLEAN', mode: 'w', default: true },
          { name: 'max_size', type: 'FLOAT', mode: 'w', default: 1024 },
          { name: 'seed', type: 'INT', mode: 'w', default: 0 },
          { name: 'steps', type: 'INT', mode: 'w', default: 20 },
          { name: 'cfg', type: 'FLOAT', mode: 'w', default: 8.0 },
          { name: 'sampler_name', type: 'STRING', mode: 'w', options: ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_sde', 'ddim'] },
          { name: 'scheduler', type: 'STRING', mode: 'w', options: ['normal', 'karras', 'exponential', 'simple'] },
          { name: 'denoise', type: 'FLOAT', mode: 'w', default: 0.5, min: 0, max: 1 },
          { name: 'feather', type: 'INT', mode: 'w', default: 5 },
          { name: 'noise_mask', type: 'BOOLEAN', mode: 'w', default: true },
          { name: 'force_inpaint', type: 'BOOLEAN', mode: 'w', default: true },
          { name: 'bbox_threshold', type: 'FLOAT', mode: 'w', default: 0.5 },
          { name: 'bbox_dilation', type: 'INT', mode: 'w', default: 10 },
          { name: 'bbox_crop_factor', type: 'FLOAT', mode: 'w', default: 3.0 },
          { name: 'sam_detection_hint', type: 'STRING', mode: 'w', default: 'center-1' },
          { name: 'sam_dilation', type: 'INT', mode: 'w', default: 0 },
          { name: 'sam_threshold', type: 'FLOAT', mode: 'w', default: 0.93 },
          { name: 'sam_bbox_expansion', type: 'INT', mode: 'w', default: 0 },
          { name: 'sam_mask_hint_threshold', type: 'FLOAT', mode: 'w', default: 0.7 },
          { name: 'sam_mask_hint_use_negative', type: 'STRING', mode: 'w', default: 'False' },
          { name: 'drop_size', type: 'INT', mode: 'w', default: 10 },
          { name: 'wildcard', type: 'STRING', mode: 'w', default: '' },
          { name: 'cycle', type: 'INT', mode: 'w', default: 1 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
          { name: 'CROPPED_REFINED', type: 'IMAGE', slot: 1 },
          { name: 'CROPPED_ENHANCED_ALPHA', type: 'IMAGE', slot: 2 },
          { name: 'MASK', type: 'MASK', slot: 3 },
          { name: 'DETAILER_PIPE', type: 'DETAILER_PIPE', slot: 4 },
          { name: 'CNET_IMAGES', type: 'IMAGE', slot: 5 },
        ],
      },
      {
        class_type: 'UltimateSDUpscale',
        display: 'Ultimate SD Upscale',
        category: 'ImpactPack/Upscale',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'model', type: 'MODEL', mode: 'c' },
          { name: 'positive', type: 'CONDITIONING', mode: 'c' },
          { name: 'negative', type: 'CONDITIONING', mode: 'c' },
          { name: 'vae', type: 'VAE', mode: 'c' },
          { name: 'upscale_model', type: 'UPSCALE_MODEL', mode: 'c' },
          { name: 'upscale_by', type: 'FLOAT', mode: 'w', default: 2.0 },
          { name: 'seed', type: 'INT', mode: 'w' },
          { name: 'steps', type: 'INT', mode: 'w', default: 20 },
          { name: 'cfg', type: 'FLOAT', mode: 'w', default: 8.0 },
          { name: 'sampler_name', type: 'STRING', mode: 'w', options: ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_sde'] },
          { name: 'scheduler', type: 'STRING', mode: 'w', options: ['normal', 'karras', 'simple'] },
          { name: 'denoise', type: 'FLOAT', mode: 'w', default: 0.2 },
          { name: 'tile_width', type: 'INT', mode: 'w', default: 512 },
          { name: 'tile_height', type: 'INT', mode: 'w', default: 512 },
          { name: 'mask_blur', type: 'INT', mode: 'w', default: 8 },
          { name: 'tile_padding', type: 'INT', mode: 'w', default: 32 },
          { name: 'seam_fix_mode', type: 'STRING', mode: 'w', default: 'None', options: ['None', 'Band Pass', 'Half Tile', 'Half Tile + Intersections'] },
          { name: 'seam_fix_denoise', type: 'FLOAT', mode: 'w', default: 1.0 },
          { name: 'seam_fix_width', type: 'INT', mode: 'w', default: 64 },
          { name: 'seam_fix_mask_blur', type: 'INT', mode: 'w', default: 8 },
          { name: 'seam_fix_padding', type: 'INT', mode: 'w', default: 16 },
          { name: 'force_uniform_tiles', type: 'BOOLEAN', mode: 'w', default: true },
          { name: 'tiled_decode', type: 'BOOLEAN', mode: 'w', default: false },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. ComfyUI IPAdapter Plus
  // =========================================================================
  {
    packId: 'comfyui_ipadapter_plus',
    packTitle: 'ComfyUI IPAdapter Plus',
    nodes: [
      {
        class_type: 'IPAdapterUnifiedLoader',
        display: 'IPAdapter Unified Loader',
        category: 'ipadapter/loaders',
        inputs: [
          { name: 'model', type: 'MODEL', mode: 'c' },
          { name: 'preset', type: 'STRING', mode: 'w', options: ['LIGHT - SD1.5 only (low strength)', 'STANDARD (medium strength)', 'VIT-G (medium strength)', 'PLUS (high strength)', 'PLUS FACE (portraits)', 'FULL FACE - SD1.5 only (portraits stronger)'] },
          { name: 'ipadapter', type: 'IPADAPTER', mode: 'c', required: false },
        ],
        outputs: [
          { name: 'MODEL', type: 'MODEL', slot: 0 },
          { name: 'ipadapter', type: 'IPADAPTER', slot: 1 },
        ],
      },
      {
        class_type: 'IPAdapterAdvanced',
        display: 'IPAdapter Advanced',
        category: 'ipadapter',
        inputs: [
          { name: 'model', type: 'MODEL', mode: 'c' },
          { name: 'ipadapter', type: 'IPADAPTER', mode: 'c' },
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'weight', type: 'FLOAT', mode: 'w', default: 1.0, min: -1, max: 5 },
          { name: 'weight_type', type: 'STRING', mode: 'w', default: 'linear', options: ['linear', 'ease in', 'ease out', 'ease in-out', 'reverse in-out', 'weak input', 'weak output', 'weak middle', 'strong middle', 'style transfer', 'composition', 'strong style transfer'] },
          { name: 'combine_embeds', type: 'STRING', mode: 'w', default: 'concat', options: ['concat', 'add', 'subtract', 'average', 'norm average'] },
          { name: 'start_at', type: 'FLOAT', mode: 'w', default: 0.0 },
          { name: 'end_at', type: 'FLOAT', mode: 'w', default: 1.0 },
          { name: 'embeds_scaling', type: 'STRING', mode: 'w', default: 'V only', options: ['V only', 'K+V', 'K+V w/ C penalty', 'K+mean(V) w/ C penalty'] },
          { name: 'image_negative', type: 'IMAGE', mode: 'c', required: false },
          { name: 'attn_mask', type: 'MASK', mode: 'c', required: false },
          { name: 'clip_vision', type: 'CLIP_VISION', mode: 'c', required: false },
        ],
        outputs: [
          { name: 'MODEL', type: 'MODEL', slot: 0 },
        ],
      },
      {
        class_type: 'IPAdapterStyleComposition',
        display: 'IPAdapter Style & Composition',
        category: 'ipadapter',
        inputs: [
          { name: 'model', type: 'MODEL', mode: 'c' },
          { name: 'ipadapter', type: 'IPADAPTER', mode: 'c' },
          { name: 'image_style', type: 'IMAGE', mode: 'c' },
          { name: 'image_composition', type: 'IMAGE', mode: 'c' },
          { name: 'weight_style', type: 'FLOAT', mode: 'w', default: 1.0 },
          { name: 'weight_composition', type: 'FLOAT', mode: 'w', default: 1.0 },
          { name: 'expand_style', type: 'BOOLEAN', mode: 'w', default: false },
          { name: 'start_at', type: 'FLOAT', mode: 'w', default: 0.0 },
          { name: 'end_at', type: 'FLOAT', mode: 'w', default: 1.0 },
        ],
        outputs: [
          { name: 'MODEL', type: 'MODEL', slot: 0 },
        ],
      },
      {
        class_type: 'PrepImageForClipVision',
        display: 'Prep Image for ClipVision',
        category: 'ipadapter/utils',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'interpolation', type: 'STRING', mode: 'w', default: 'LANCZOS', options: ['LANCZOS', 'BICUBIC', 'HAMMING', 'BILINEAR', 'BOX', 'NEAREST'] },
          { name: 'crop_position', type: 'STRING', mode: 'w', default: 'center', options: ['top', 'bottom', 'left', 'right', 'center', 'pad'] },
          { name: 'sharpening', type: 'FLOAT', mode: 'w', default: 0.0 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
    ],
  },

  // =========================================================================
  // 3. ComfyUI ControlNet Aux Preprocessors
  // =========================================================================
  {
    packId: 'comfyui_controlnet_aux',
    packTitle: 'ComfyUI ControlNet Aux',
    nodes: [
      {
        class_type: 'CannyEdgePreprocessor',
        display: 'Canny Edge Preprocessor',
        category: 'ControlNet Preprocessors/Line Extractors',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'low_threshold', type: 'INT', mode: 'w', default: 100, min: 0, max: 255 },
          { name: 'high_threshold', type: 'INT', mode: 'w', default: 200, min: 0, max: 255 },
          { name: 'resolution', type: 'INT', mode: 'w', default: 512, min: 64, max: 2048 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
      {
        class_type: 'DepthAnythingV2Preprocessor',
        display: 'Depth Anything V2',
        category: 'ControlNet Preprocessors/Normal and Depth Estimators',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'ckpt_name', type: 'STRING', mode: 'w', default: 'depth_anything_v2_vitl.pth', options: ['depth_anything_v2_vits.pth', 'depth_anything_v2_vitb.pth', 'depth_anything_v2_vitl.pth'] },
          { name: 'resolution', type: 'INT', mode: 'w', default: 512, min: 64, max: 2048 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
      {
        class_type: 'DWPreprocessor',
        display: 'DWPose Preprocessor',
        category: 'ControlNet Preprocessors/Faces and Poses Estimators',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'detect_hand', type: 'STRING', mode: 'w', default: 'enable', options: ['enable', 'disable'] },
          { name: 'detect_body', type: 'STRING', mode: 'w', default: 'enable', options: ['enable', 'disable'] },
          { name: 'detect_face', type: 'STRING', mode: 'w', default: 'enable', options: ['enable', 'disable'] },
          { name: 'resolution', type: 'INT', mode: 'w', default: 512 },
          { name: 'bbox_detector', type: 'STRING', mode: 'w', default: 'yolox_l.onnx', options: ['yolox_l.onnx', 'yolo_nas_l_fp16.onnx'] },
          { name: 'pose_estimator', type: 'STRING', mode: 'w', default: 'dw-ll_ucoco_384_bs5.torchscript.pt' },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
      {
        class_type: 'LineArtPreprocessor',
        display: 'Line Art Preprocessor',
        category: 'ControlNet Preprocessors/Line Extractors',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'coarse', type: 'STRING', mode: 'w', default: 'disable', options: ['enable', 'disable'] },
          { name: 'resolution', type: 'INT', mode: 'w', default: 512, min: 64, max: 2048 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
      {
        class_type: 'OpenposePreprocessor',
        display: 'OpenPose Preprocessor',
        category: 'ControlNet Preprocessors/Faces and Poses Estimators',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'detect_hand', type: 'STRING', mode: 'w', default: 'enable', options: ['enable', 'disable'] },
          { name: 'detect_body', type: 'STRING', mode: 'w', default: 'enable', options: ['enable', 'disable'] },
          { name: 'detect_face', type: 'STRING', mode: 'w', default: 'enable', options: ['enable', 'disable'] },
          { name: 'resolution', type: 'INT', mode: 'w', default: 512 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
      {
        class_type: 'AIO_Preprocessor',
        display: 'AIO Aux Preprocessor',
        category: 'ControlNet Preprocessors',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'preprocessor', type: 'STRING', mode: 'w', options: ['CannyEdgePreprocessor', 'DepthAnythingV2Preprocessor', 'DWPreprocessor', 'LineArtPreprocessor', 'OpenposePreprocessor', 'NormalBAEPreprocessor', 'TilePreprocessor', 'Zoe-DepthMapPreprocessor', 'MiDaS-NormalMapPreprocessor'] },
          { name: 'resolution', type: 'INT', mode: 'w', default: 512 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
    ],
  },

  // =========================================================================
  // 4. ComfyUI KJNodes
  // =========================================================================
  {
    packId: 'comfyui-kjnodes',
    packTitle: 'ComfyUI KJNodes',
    nodes: [
      {
        class_type: 'GetImageSizeAndCount',
        display: 'Get Image Size & Count',
        category: 'KJNodes/image',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
          { name: 'width', type: 'INT', slot: 1 },
          { name: 'height', type: 'INT', slot: 2 },
          { name: 'count', type: 'INT', slot: 3 },
        ],
      },
      {
        class_type: 'ConditioningSetMaskAndCombine',
        display: 'Conditioning Set Mask and Combine',
        category: 'KJNodes/masking/conditioning',
        inputs: [
          { name: 'positive_1', type: 'CONDITIONING', mode: 'c' },
          { name: 'negative_1', type: 'CONDITIONING', mode: 'c' },
          { name: 'positive_2', type: 'CONDITIONING', mode: 'c' },
          { name: 'negative_2', type: 'CONDITIONING', mode: 'c' },
          { name: 'mask_1', type: 'MASK', mode: 'c' },
          { name: 'mask_2', type: 'MASK', mode: 'c' },
          { name: 'mask_1_strength', type: 'FLOAT', mode: 'w', default: 1.0 },
          { name: 'mask_2_strength', type: 'FLOAT', mode: 'w', default: 1.0 },
          { name: 'set_cond_area', type: 'STRING', mode: 'w', default: 'default', options: ['default', 'mask bounds'] },
        ],
        outputs: [
          { name: 'combined_positive', type: 'CONDITIONING', slot: 0 },
          { name: 'combined_negative', type: 'CONDITIONING', slot: 1 },
        ],
      },
      {
        class_type: 'CreateTextMask',
        display: 'Create Text Mask',
        category: 'KJNodes/text',
        inputs: [
          { name: 'invert', type: 'BOOLEAN', mode: 'w', default: false },
          { name: 'frames', type: 'INT', mode: 'w', default: 1 },
          { name: 'text_x', type: 'INT', mode: 'w', default: 0 },
          { name: 'text_y', type: 'INT', mode: 'w', default: 0 },
          { name: 'font_size', type: 'INT', mode: 'w', default: 32 },
          { name: 'font_color', type: 'STRING', mode: 'w', default: 'white' },
          { name: 'text', type: 'STRING', mode: 'w', default: '' },
          { name: 'font_path', type: 'STRING', mode: 'w', default: '' },
          { name: 'width', type: 'INT', mode: 'w', default: 512 },
          { name: 'height', type: 'INT', mode: 'w', default: 512 },
        ],
        outputs: [
          { name: 'MASK', type: 'MASK', slot: 0 },
          { name: 'IMAGE', type: 'IMAGE', slot: 1 },
        ],
      },
      {
        class_type: 'FlipSigmasAdjusted',
        display: 'Flip Sigmas Adjusted',
        category: 'KJNodes/noise',
        inputs: [
          { name: 'sigmas', type: 'SIGMAS', mode: 'c' },
          { name: 'divide_by_last_sigma', type: 'BOOLEAN', mode: 'w', default: false },
          { name: 'offset_by', type: 'INT', mode: 'w', default: 1 },
        ],
        outputs: [
          { name: 'SIGMAS', type: 'SIGMAS', slot: 0 },
        ],
      },
      {
        class_type: 'StringConstant',
        display: 'String Constant',
        category: 'KJNodes/constants',
        inputs: [
          { name: 'string', type: 'STRING', mode: 'w', default: '' },
        ],
        outputs: [
          { name: 'STRING', type: 'STRING', slot: 0 },
        ],
      },
    ],
  },

  // =========================================================================
  // 5. WAS Node Suite
  // =========================================================================
  {
    packId: 'was-node-suite-comfyui',
    packTitle: 'WAS Node Suite',
    nodes: [
      {
        class_type: 'WAS_Image_Resize',
        display: 'Image Resize (WAS)',
        category: 'WAS Suite/Image/Transform',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'width', type: 'INT', mode: 'w', default: 512 },
          { name: 'height', type: 'INT', mode: 'w', default: 512 },
          { name: 'interpolation', type: 'STRING', mode: 'w', default: 'lanczos', options: ['nearest', 'bilinear', 'bicubic', 'lanczos'] },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
      {
        class_type: 'WAS_Image_Save',
        display: 'Image Save (WAS)',
        category: 'WAS Suite/IO',
        inputs: [
          { name: 'images', type: 'IMAGE', mode: 'c' },
          { name: 'output_path', type: 'STRING', mode: 'w', default: './ComfyUI/output' },
          { name: 'filename_prefix', type: 'STRING', mode: 'w', default: 'ComfyUI' },
          { name: 'filename_delimiter', type: 'STRING', mode: 'w', default: '_' },
          { name: 'filename_number_padding', type: 'INT', mode: 'w', default: 4 },
          { name: 'filename_number_start', type: 'STRING', mode: 'w', default: 'false', options: ['false', 'true'] },
          { name: 'extension', type: 'STRING', mode: 'w', default: 'png', options: ['png', 'jpg', 'jpeg', 'gif', 'tiff', 'webp', 'bmp'] },
          { name: 'quality', type: 'INT', mode: 'w', default: 100, min: 1, max: 100 },
          { name: 'overwrite_mode', type: 'STRING', mode: 'w', default: 'false', options: ['false', 'prefix_as_filename'] },
        ],
        outputs: [
          { name: 'images', type: 'IMAGE', slot: 0 },
          { name: 'filepath_text', type: 'STRING', slot: 1 },
          { name: 'filename_text', type: 'STRING', slot: 2 },
        ],
      },
      {
        class_type: 'WAS_Text_String',
        display: 'Text String (WAS)',
        category: 'WAS Suite/Text',
        inputs: [
          { name: 'text', type: 'STRING', mode: 'w', default: '' },
        ],
        outputs: [
          { name: 'STRING', type: 'STRING', slot: 0 },
        ],
      },
      {
        class_type: 'WAS_Text_Concatenate',
        display: 'Text Concatenate (WAS)',
        category: 'WAS Suite/Text',
        inputs: [
          { name: 'text_a', type: 'STRING', mode: 'cw' },
          { name: 'text_b', type: 'STRING', mode: 'cw' },
          { name: 'delimiter', type: 'STRING', mode: 'w', default: ', ' },
        ],
        outputs: [
          { name: 'STRING', type: 'STRING', slot: 0 },
        ],
      },
      {
        class_type: 'WAS_Image_Blend',
        display: 'Image Blend (WAS)',
        category: 'WAS Suite/Image',
        inputs: [
          { name: 'image_a', type: 'IMAGE', mode: 'c' },
          { name: 'image_b', type: 'IMAGE', mode: 'c' },
          { name: 'blend_percentage', type: 'FLOAT', mode: 'w', default: 0.5, min: 0, max: 1 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
    ],
  },

  // =========================================================================
  // 6. ComfyUI Florence2
  // =========================================================================
  {
    packId: 'comfyui-florence2',
    packTitle: 'ComfyUI Florence2',
    nodes: [
      {
        class_type: 'DownloadAndLoadFlorence2Model',
        display: 'Florence2 Model Loader',
        category: 'Florence2',
        inputs: [
          { name: 'model', type: 'STRING', mode: 'w', default: 'microsoft/Florence-2-base', options: ['microsoft/Florence-2-base', 'microsoft/Florence-2-large', 'microsoft/Florence-2-base-ft', 'microsoft/Florence-2-large-ft'] },
          { name: 'precision', type: 'STRING', mode: 'w', default: 'fp16', options: ['fp16', 'bf16', 'fp32'] },
          { name: 'attention', type: 'STRING', mode: 'w', default: 'sdpa', options: ['sdpa', 'flash_attention_2', 'eager'] },
        ],
        outputs: [
          { name: 'florence2_model', type: 'FL2MODEL', slot: 0 },
        ],
      },
      {
        class_type: 'Florence2Run',
        display: 'Florence2 Run',
        category: 'Florence2',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'florence2_model', type: 'FL2MODEL', mode: 'c' },
          { name: 'text_input', type: 'STRING', mode: 'w', default: '' },
          { name: 'task', type: 'STRING', mode: 'w', default: 'caption', options: ['caption', 'detailed_caption', 'more_detailed_caption', 'caption_to_phrase_grounding', 'object_detection', 'dense_region_caption', 'region_proposal', 'referring_expression_segmentation', 'open_vocabulary_detection', 'ocr', 'ocr_with_region'] },
          { name: 'fill_mask', type: 'BOOLEAN', mode: 'w', default: true },
          { name: 'keep_model_loaded', type: 'BOOLEAN', mode: 'w', default: false },
          { name: 'max_new_tokens', type: 'INT', mode: 'w', default: 1024 },
          { name: 'num_beams', type: 'INT', mode: 'w', default: 3 },
          { name: 'do_sample', type: 'BOOLEAN', mode: 'w', default: false },
          { name: 'output_mask_select', type: 'STRING', mode: 'w', default: '' },
        ],
        outputs: [
          { name: 'image', type: 'IMAGE', slot: 0 },
          { name: 'mask', type: 'MASK', slot: 1 },
          { name: 'caption', type: 'STRING', slot: 2 },
          { name: 'data', type: 'JSON', slot: 3 },
        ],
      },
    ],
  },

  // =========================================================================
  // 7. ComfyUI AnimateDiff Evolved
  // =========================================================================
  {
    packId: 'comfyui-animatediff-evolved',
    packTitle: 'ComfyUI AnimateDiff Evolved',
    nodes: [
      {
        class_type: 'ADE_AnimateDiffLoaderWithContext',
        display: 'AnimateDiff Loader [Legacy]',
        category: 'Animate Diff/Legacy',
        inputs: [
          { name: 'model', type: 'MODEL', mode: 'c' },
          { name: 'context_options', type: 'CONTEXT_OPTIONS', mode: 'c', required: false },
          { name: 'motion_lora', type: 'MOTION_LORA', mode: 'c', required: false },
          { name: 'ad_settings', type: 'AD_SETTINGS', mode: 'c', required: false },
          { name: 'model_name', type: 'STRING', mode: 'w', options: ['mm_sd_v14.ckpt', 'mm_sd_v15.ckpt', 'mm_sd_v15_v2.ckpt', 'v3_sd15_mm.ckpt'] },
          { name: 'beta_schedule', type: 'STRING', mode: 'w', default: 'sqrt_linear (AnimateDiff)', options: ['sqrt_linear (AnimateDiff)', 'linear (AnimateDiff-SDXL)', 'linear (HotshotXL)', 'lcm avg(sqrt_linear,linear)', 'lcm >> sqrt_linear', 'autoselect'] },
        ],
        outputs: [
          { name: 'MODEL', type: 'MODEL', slot: 0 },
        ],
      },
      {
        class_type: 'ADE_AnimateDiffUniformContextOptions',
        display: 'Context Options (Uniform)',
        category: 'Animate Diff/context opts',
        inputs: [
          { name: 'context_length', type: 'INT', mode: 'w', default: 16, min: 1, max: 128 },
          { name: 'context_stride', type: 'INT', mode: 'w', default: 1, min: 1, max: 32 },
          { name: 'context_overlap', type: 'INT', mode: 'w', default: 4, min: 0, max: 128 },
          { name: 'closed_loop', type: 'BOOLEAN', mode: 'w', default: false },
          { name: 'fuse_method', type: 'STRING', mode: 'w', default: 'flat', options: ['flat', 'pyramid'] },
          { name: 'use_on_equal_length', type: 'BOOLEAN', mode: 'w', default: false },
          { name: 'start_percent', type: 'FLOAT', mode: 'w', default: 0.0 },
          { name: 'guarantee_steps', type: 'INT', mode: 'w', default: 1 },
          { name: 'prev_context', type: 'CONTEXT_OPTIONS', mode: 'c', required: false },
        ],
        outputs: [
          { name: 'CONTEXT_OPTIONS', type: 'CONTEXT_OPTIONS', slot: 0 },
        ],
      },
      {
        class_type: 'ADE_EmptyLatentImageLarge',
        display: 'Empty Latent Image (Big Batch)',
        category: 'Animate Diff',
        inputs: [
          { name: 'width', type: 'INT', mode: 'w', default: 512 },
          { name: 'height', type: 'INT', mode: 'w', default: 512 },
          { name: 'batch_size', type: 'INT', mode: 'w', default: 16, min: 1, max: 256 },
        ],
        outputs: [
          { name: 'LATENT', type: 'LATENT', slot: 0 },
        ],
      },
    ],
  },

  // =========================================================================
  // 8. rgthree-comfy
  // =========================================================================
  {
    packId: 'rgthree-comfy',
    packTitle: 'rgthree-comfy',
    nodes: [
      {
        class_type: 'Power Prompt (rgthree)',
        display: 'Power Prompt',
        category: 'rgthree',
        inputs: [
          { name: 'clip', type: 'CLIP', mode: 'c' },
          { name: 'prompt', type: 'STRING', mode: 'w', default: '' },
          { name: 'insert_lora', type: 'STRING', mode: 'w', default: '', required: false },
          { name: 'insert_embedding', type: 'STRING', mode: 'w', default: '', required: false },
          { name: 'insert_saved', type: 'STRING', mode: 'w', default: '', required: false },
        ],
        outputs: [
          { name: 'CONDITIONING', type: 'CONDITIONING', slot: 0 },
          { name: 'TEXT', type: 'STRING', slot: 1 },
        ],
      },
      {
        class_type: 'Seed (rgthree)',
        display: 'Seed',
        category: 'rgthree',
        inputs: [
          { name: 'seed', type: 'INT', mode: 'w', default: 0 },
        ],
        outputs: [
          { name: 'SEED', type: 'INT', slot: 0 },
        ],
      },
      {
        class_type: 'Context (rgthree)',
        display: 'Context',
        category: 'rgthree',
        inputs: [
          { name: 'base_ctx', type: 'RGTHREE_CONTEXT', mode: 'c', required: false },
          { name: 'model', type: 'MODEL', mode: 'c', required: false },
          { name: 'clip', type: 'CLIP', mode: 'c', required: false },
          { name: 'vae', type: 'VAE', mode: 'c', required: false },
          { name: 'positive', type: 'CONDITIONING', mode: 'c', required: false },
          { name: 'negative', type: 'CONDITIONING', mode: 'c', required: false },
          { name: 'latent', type: 'LATENT', mode: 'c', required: false },
          { name: 'images', type: 'IMAGE', mode: 'c', required: false },
          { name: 'seed', type: 'INT', mode: 'cw', required: false },
        ],
        outputs: [
          { name: 'CONTEXT', type: 'RGTHREE_CONTEXT', slot: 0 },
          { name: 'MODEL', type: 'MODEL', slot: 1 },
          { name: 'CLIP', type: 'CLIP', slot: 2 },
          { name: 'VAE', type: 'VAE', slot: 3 },
          { name: 'POSITIVE', type: 'CONDITIONING', slot: 4 },
          { name: 'NEGATIVE', type: 'CONDITIONING', slot: 5 },
          { name: 'LATENT', type: 'LATENT', slot: 6 },
          { name: 'IMAGE', type: 'IMAGE', slot: 7 },
          { name: 'SEED', type: 'INT', slot: 8 },
        ],
      },
      {
        class_type: 'Context Switch (rgthree)',
        display: 'Context Switch',
        category: 'rgthree',
        inputs: [
          { name: 'ctx_01', type: 'RGTHREE_CONTEXT', mode: 'c' },
          { name: 'ctx_02', type: 'RGTHREE_CONTEXT', mode: 'c', required: false },
          { name: 'ctx_03', type: 'RGTHREE_CONTEXT', mode: 'c', required: false },
          { name: 'ctx_04', type: 'RGTHREE_CONTEXT', mode: 'c', required: false },
          { name: 'ctx_05', type: 'RGTHREE_CONTEXT', mode: 'c', required: false },
        ],
        outputs: [
          { name: 'CONTEXT', type: 'RGTHREE_CONTEXT', slot: 0 },
          { name: 'MODEL', type: 'MODEL', slot: 1 },
          { name: 'CLIP', type: 'CLIP', slot: 2 },
          { name: 'VAE', type: 'VAE', slot: 3 },
          { name: 'POSITIVE', type: 'CONDITIONING', slot: 4 },
          { name: 'NEGATIVE', type: 'CONDITIONING', slot: 5 },
          { name: 'LATENT', type: 'LATENT', slot: 6 },
          { name: 'IMAGE', type: 'IMAGE', slot: 7 },
          { name: 'SEED', type: 'INT', slot: 8 },
        ],
      },
    ],
  },

  // =========================================================================
  // 9. ComfyUI Advanced ControlNet
  // =========================================================================
  {
    packId: 'comfyui-advanced-controlnet',
    packTitle: 'ComfyUI Advanced ControlNet',
    nodes: [
      {
        class_type: 'ControlNetLoaderAdvanced',
        display: 'Load ControlNet Model (Advanced)',
        category: 'Adv-ControlNet',
        inputs: [
          { name: 'control_net_name', type: 'STRING', mode: 'w' },
          { name: 'timestep_keyframe', type: 'TIMESTEP_KEYFRAME', mode: 'c', required: false },
        ],
        outputs: [
          { name: 'CONTROL_NET', type: 'CONTROL_NET', slot: 0 },
        ],
      },
      {
        class_type: 'ACN_AdvancedControlNetApply',
        display: 'Apply ControlNet (Advanced)',
        category: 'Adv-ControlNet',
        inputs: [
          { name: 'positive', type: 'CONDITIONING', mode: 'c' },
          { name: 'negative', type: 'CONDITIONING', mode: 'c' },
          { name: 'control_net', type: 'CONTROL_NET', mode: 'c' },
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'strength', type: 'FLOAT', mode: 'w', default: 1.0, min: 0, max: 10 },
          { name: 'start_percent', type: 'FLOAT', mode: 'w', default: 0.0, min: 0, max: 1 },
          { name: 'end_percent', type: 'FLOAT', mode: 'w', default: 1.0, min: 0, max: 1 },
          { name: 'mask_optional', type: 'MASK', mode: 'c', required: false },
          { name: 'timestep_kf', type: 'TIMESTEP_KEYFRAME', mode: 'c', required: false },
          { name: 'latent_kf_override', type: 'LATENT_KEYFRAME', mode: 'c', required: false },
          { name: 'weights_override', type: 'CONTROL_NET_WEIGHTS', mode: 'c', required: false },
        ],
        outputs: [
          { name: 'positive', type: 'CONDITIONING', slot: 0 },
          { name: 'negative', type: 'CONDITIONING', slot: 1 },
        ],
      },
    ],
  },

  // =========================================================================
  // 10. ComfyUI Essentials
  // =========================================================================
  {
    packId: 'comfyui_essentials',
    packTitle: 'ComfyUI Essentials',
    nodes: [
      {
        class_type: 'ImageResize+',
        display: 'Image Resize+',
        category: 'essentials/image manipulation',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'width', type: 'INT', mode: 'w', default: 512 },
          { name: 'height', type: 'INT', mode: 'w', default: 512 },
          { name: 'interpolation', type: 'STRING', mode: 'w', default: 'nearest', options: ['nearest', 'bilinear', 'bicubic', 'area', 'nearest-exact', 'lanczos'] },
          { name: 'method', type: 'STRING', mode: 'w', default: 'stretch', options: ['stretch', 'keep proportion', 'fill / crop', 'pad'] },
          { name: 'condition', type: 'STRING', mode: 'w', default: 'always', options: ['always', 'downscale if bigger', 'upscale if smaller', 'if bigger area', 'if smaller area'] },
          { name: 'multiple_of', type: 'INT', mode: 'w', default: 0 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
          { name: 'width', type: 'INT', slot: 1 },
          { name: 'height', type: 'INT', slot: 2 },
        ],
      },
      {
        class_type: 'ImageDesaturate+',
        display: 'Image Desaturate+',
        category: 'essentials/image processing',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
          { name: 'factor', type: 'FLOAT', mode: 'w', default: 1.0, min: 0, max: 1 },
          { name: 'method', type: 'STRING', mode: 'w', default: 'luminance (Rec.709)', options: ['luminance (Rec.709)', 'luminance (Rec.601)', 'average', 'lightness'] },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
        ],
      },
      {
        class_type: 'MaskBlur+',
        display: 'Mask Blur+',
        category: 'essentials/mask',
        inputs: [
          { name: 'mask', type: 'MASK', mode: 'c' },
          { name: 'amount', type: 'INT', mode: 'w', default: 6, min: 0, max: 256 },
        ],
        outputs: [
          { name: 'MASK', type: 'MASK', slot: 0 },
        ],
      },
      {
        class_type: 'GetImageSize+',
        display: 'Get Image Size+',
        category: 'essentials/image utils',
        inputs: [
          { name: 'image', type: 'IMAGE', mode: 'c' },
        ],
        outputs: [
          { name: 'width', type: 'INT', slot: 0 },
          { name: 'height', type: 'INT', slot: 1 },
          { name: 'count', type: 'INT', slot: 2 },
        ],
      },
    ],
  },

  // =========================================================================
  // 11. ComfyUI VideoHelperSuite
  // =========================================================================
  {
    packId: 'comfyui-videohelpersuite',
    packTitle: 'ComfyUI VideoHelperSuite',
    nodes: [
      {
        class_type: 'VHS_LoadVideo',
        display: 'Load Video (Upload)',
        category: 'Video Helper Suite',
        inputs: [
          { name: 'video', type: 'STRING', mode: 'w' },
          { name: 'force_rate', type: 'INT', mode: 'w', default: 0 },
          { name: 'force_size', type: 'STRING', mode: 'w', default: 'Disabled', options: ['Disabled', '256x?', '?x256', '256x256', '512x?', '?x512', '512x512', '768x?', '?x768', '768x768'] },
          { name: 'custom_width', type: 'INT', mode: 'w', default: 512 },
          { name: 'custom_height', type: 'INT', mode: 'w', default: 512 },
          { name: 'frame_load_cap', type: 'INT', mode: 'w', default: 0 },
          { name: 'skip_first_frames', type: 'INT', mode: 'w', default: 0 },
          { name: 'select_every_nth', type: 'INT', mode: 'w', default: 1 },
        ],
        outputs: [
          { name: 'IMAGE', type: 'IMAGE', slot: 0 },
          { name: 'frame_count', type: 'INT', slot: 1 },
          { name: 'audio', type: 'VHS_AUDIO', slot: 2 },
          { name: 'video_info', type: 'VHS_VIDEOINFO', slot: 3 },
        ],
      },
      {
        class_type: 'VHS_VideoCombine',
        display: 'Video Combine',
        category: 'Video Helper Suite',
        inputs: [
          { name: 'images', type: 'IMAGE', mode: 'c' },
          { name: 'frame_rate', type: 'INT', mode: 'w', default: 8, min: 1, max: 120 },
          { name: 'loop_count', type: 'INT', mode: 'w', default: 0 },
          { name: 'filename_prefix', type: 'STRING', mode: 'w', default: 'AnimateDiff' },
          { name: 'format', type: 'STRING', mode: 'w', default: 'image/gif', options: ['image/gif', 'image/webp', 'video/h264-mp4', 'video/h265-mp4', 'video/av1-webm'] },
          { name: 'pingpong', type: 'BOOLEAN', mode: 'w', default: false },
          { name: 'save_output', type: 'BOOLEAN', mode: 'w', default: true },
          { name: 'audio', type: 'VHS_AUDIO', mode: 'c', required: false },
        ],
        outputs: [
          { name: 'Filenames', type: 'VHS_FILENAMES', slot: 0 },
        ],
      },
    ],
  },
];

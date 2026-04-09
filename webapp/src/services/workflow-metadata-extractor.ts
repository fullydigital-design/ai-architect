/**
 * Phase 10G - Extracts note metadata from a workflow using existing runtime data.
 * Bridges workflow analysis into WorkflowNoteMetadata format.
 */

import { NODE_REGISTRY } from '../data/node-registry';
import { getLiveNodeCache, getRawObjectInfo } from './comfyui-backend';
import type { ModelEntry, PackEntry, WorkflowNoteMetadata, WorkflowStats } from './workflow-note-injector';

const MODEL_EXT_RE = /\.(safetensors|ckpt|pt|pth|bin|onnx|gguf)$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extracts all metadata from a workflow JSON needed for note generation.
 */
export function extractWorkflowMetadata(
  workflow: any,
  workflowName?: string,
  description?: string,
): WorkflowNoteMetadata {
  const nodes = getNodeList(workflow);
  const models = extractModelsFromWorkflow(workflow, nodes);
  const customPacks = extractPacksFromNodes(nodes);
  const settings = extractGenerationSettings(nodes);
  const stats = computeStats(nodes);
  let autoDescription = '';
  try {
    autoDescription = generateWorkflowDescription(nodes);
  } catch (err) {
    console.warn('[MetadataExtractor] Description generation failed:', err);
    autoDescription = `Workflow with ${nodes.length} nodes.`;
  }
  const finalDescription = buildFinalDescription(description, autoDescription);

  return {
    workflowName,
    description: finalDescription,
    models,
    customPacks,
    generationSettings: settings,
    stats,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
}

// ---------- Node List Normalization ----------

function getNodeList(workflow: any): any[] {
  if (Array.isArray(workflow?.nodes)) {
    return workflow.nodes;
  }

  if (!workflow || typeof workflow !== 'object') return [];
  return Object.entries(workflow)
    .filter(([key]) => /^\d+$/.test(key))
    .map(([id, node]: [string, any]) => ({
      id: Number(id),
      type: node?.class_type || 'Unknown',
      inputs: node?.inputs || {},
      widgets_values: node?.inputs ? Object.values(node.inputs) : [],
      _meta: node?._meta,
    }));
}

// ---------- Model Extraction ----------

function extractModelsFromWorkflow(workflow: any, nodes: any[]): ModelEntry[] {
  const models: ModelEntry[] = [];
  const seen = new Set<string>();

  const pushModel = (entry: ModelEntry): void => {
    const key = normalizeModelFilename(entry.filename);
    if (!key || seen.has(key)) return;
    seen.add(key);
    models.push(entry);
  };

  for (const node of nodes) {
    scanNodeModels(node, pushModel);
  }

  // H9 support: scan nested internal nodes from UI groupNodes definitions.
  const groupDefs = (workflow?.extra as Record<string, any> | undefined)?.groupNodes;
  if (groupDefs && typeof groupDefs === 'object') {
    for (const [groupName, groupDef] of Object.entries(groupDefs as Record<string, any>)) {
      const def = groupDef as Record<string, any>;
      if (!Array.isArray(def?.nodes)) continue;
      for (const internalNode of def.nodes as Array<Record<string, any>>) {
        scanNodeModels(
          {
            type: internalNode?.type || 'UnknownInternalNode',
            title: `${groupName} -> ${internalNode?.type || 'UnknownInternalNode'}`,
            inputs: internalNode?.inputs,
            widgets_values: internalNode?.widgets_values,
            _meta: internalNode?._meta,
          },
          pushModel,
        );
      }
    }
  }

  return models;
}

function scanNodeModels(node: any, pushModel: (entry: ModelEntry) => void): void {
  const nodeType = String(node?.type || node?.class_type || 'Unknown');
  const title = String(node?._meta?.title || node?.title || nodeType || 'Unknown');

  const MODEL_INPUT_MAP: Record<string, string> = {
    ckpt_name: 'Checkpoint',
    checkpoint_name: 'Checkpoint',
    model_name: 'Checkpoint',
    lora_name: 'LoRA',
    vae_name: 'VAE',
    unet_name: 'UNET',
    clip_name: 'CLIP',
    clip_name1: 'CLIP',
    clip_name2: 'CLIP',
    control_net_name: 'ControlNet',
    upscale_model_name: 'Upscale',
    style_model_name: 'Style',
    ipadapter_file: 'IPAdapter',
    instantid_file: 'InstantID',
    reactor_model: 'FaceSwap',
    sam_model_name: 'SAM',
    grounding_dino_model: 'GroundingDINO',
    detector: 'Detector',
  };

  // Strategy 1: API format inputs (named object).
  if (node?.inputs && typeof node.inputs === 'object' && !Array.isArray(node.inputs)) {
    for (const [inputNameRaw, value] of Object.entries(node.inputs as Record<string, unknown>)) {
      if (typeof value !== 'string') continue;
      const inputName = inputNameRaw.toLowerCase();
      const trimmed = value.trim();
      if (!trimmed) continue;

      const knownType = MODEL_INPUT_MAP[inputName];
      if (knownType) {
        pushModel({ type: knownType, filename: trimmed, nodeTitle: title });
        continue;
      }

      if (MODEL_EXT_RE.test(trimmed)) {
        pushModel({
          type: inferModelCategoryFromFilename(trimmed),
          filename: trimmed,
          nodeTitle: title,
        });
      }
    }
  }

  // Strategy 2: UI format widgets_values (positional array).
  if (Array.isArray(node?.widgets_values)) {
    for (const value of node.widgets_values as unknown[]) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;

      if (MODEL_EXT_RE.test(trimmed)) {
        pushModel({
          type: inferModelCategoryFromFilename(trimmed),
          filename: trimmed,
          nodeTitle: title,
        });
        continue;
      }

      const dirMatch = trimmed.match(/[\\/](checkpoints|loras|vae|unet|controlnet|clip|upscale_models)[\\/]/i);
      if (dirMatch) {
        const dirHint = dirMatch[1].toLowerCase();
        const typeMap: Record<string, string> = {
          checkpoints: 'Checkpoint',
          loras: 'LoRA',
          vae: 'VAE',
          unet: 'UNET',
          controlnet: 'ControlNet',
          clip: 'CLIP',
          upscale_models: 'Upscale',
        };
        pushModel({
          type: typeMap[dirHint] || 'Other',
          filename: trimmed,
          nodeTitle: title,
        });
      }
    }
  }
}

function normalizeModelFilename(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.toLowerCase() || value.trim().toLowerCase();
}

function inferModelCategoryFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (/checkpoint|^sd[_-]|^sdxl|^flux/i.test(lower)) return 'Checkpoint';
  if (/lora|loha|lokr|locon/i.test(lower)) return 'LoRA';
  if (/vae/i.test(lower)) return 'VAE';
  if (/unet|diffusion_model/i.test(lower)) return 'UNET';
  if (/controlnet|control[_-]net|cn[_-]/i.test(lower)) return 'ControlNet';
  if (/clip|text_encoder|t5|umt5/i.test(lower)) return 'CLIP';
  if (/upscale|esrgan|realesrgan|swinir|hat[_-]/i.test(lower)) return 'Upscale';
  if (/ipadapter|ip[_-]adapter/i.test(lower)) return 'IPAdapter';
  if (/sam[_-]|segment/i.test(lower)) return 'SAM';
  return 'Other';
}

// ---------- Pack Extraction ----------

function extractPacksFromNodes(nodes: any[]): PackEntry[] {
  const packMap = new Map<string, Set<string>>();

  for (const node of nodes) {
    const classType = String(node?.type || node?.class_type || '');
    if (!classType || classType === 'Note' || classType === 'Reroute') continue;

    const packName = lookupPackForNodeType(classType);
    if (!packMap.has(packName)) {
      packMap.set(packName, new Set());
    }
    packMap.get(packName)!.add(classType);
  }

  return Array.from(packMap.entries())
    .map(([packName, types]) => ({
      packName,
      nodeTypes: Array.from(types).sort(),
    }))
    .sort((a, b) => a.packName.localeCompare(b.packName));
}

function lookupPackForNodeType(classType: string): string {
  const liveCache = getLiveNodeCache();
  const liveEntry = liveCache?.nodes[classType];
  const rawInfo = (getRawObjectInfo() || {})[classType] as Record<string, any> | undefined;

  // 1) Strongest signal: python module path in raw /object_info when present.
  const moduleName = String(
    rawInfo?.python_module
    || rawInfo?.python_module_name
    || rawInfo?.module
    || rawInfo?.module_name
    || '',
  ).trim();
  if (moduleName) {
    const parsed = parsePackNameFromModule(moduleName);
    if (parsed) return parsed;
  }

  // 2) Live category hints.
  const category = String(liveEntry?.category || '').toLowerCase();
  if (category.includes('subgraph') || category.includes('workflow')) {
    return 'ComfyUI Subgraph';
  }

  // 3) Static registry fallback.
  const staticSchema = NODE_REGISTRY.get(classType);
  if (staticSchema?.source === 'core') return 'ComfyUI Core';
  if (staticSchema?.customNodePack) return staticSchema.customNodePack;
  if (staticSchema?.source === 'custom') return 'Custom Nodes';

  return 'Core / Unknown';
}

function parsePackNameFromModule(moduleName: string): string | null {
  // Examples:
  // custom_nodes.ComfyUI-Impact-Pack.nodes
  // custom_nodes/ComfyUI_IPAdapter_plus
  const normalized = moduleName.replace(/\\/g, '/');
  if (normalized.startsWith('custom_nodes.')) {
    const parts = normalized.split('.');
    return parts[1] || 'Unknown Pack';
  }
  const slashIdx = normalized.indexOf('custom_nodes/');
  if (slashIdx >= 0) {
    const rest = normalized.slice(slashIdx + 'custom_nodes/'.length);
    const first = rest.split(/[/.]/)[0];
    if (first) return first;
  }
  if (normalized === 'nodes' || normalized.startsWith('comfy.')) {
    return 'ComfyUI Core';
  }
  return null;
}

// ---------- Generation Settings Extraction ----------

function extractGenerationSettings(nodes: any[]): Record<string, string | number> {
  const settings: Record<string, string | number> = {};

  for (const node of nodes) {
    const classType = String(node?.type || node?.class_type || '');
    const wv = Array.isArray(node?.widgets_values) ? node.widgets_values : null;
    const inputs = (node?.inputs && typeof node.inputs === 'object' && !Array.isArray(node.inputs))
      ? node.inputs as Record<string, unknown>
      : {};

    // KSampler widgets_values:
    // [seed, control_after_generate, steps, cfg, sampler_name, scheduler, denoise]
    if (/^KSampler$/i.test(classType)) {
      if (wv && wv.length >= 7) {
        settings.Seed = wv[0] as string | number;
        settings.Steps = wv[2] as string | number;
        settings.CFG = wv[3] as string | number;
        settings.Sampler = String(wv[4] ?? '');
        settings.Scheduler = String(wv[5] ?? '');
        settings.Denoise = wv[6] as string | number;
      } else {
        if (inputs.seed !== undefined) settings.Seed = inputs.seed as string | number;
        if (inputs.steps !== undefined) settings.Steps = inputs.steps as string | number;
        if (inputs.cfg !== undefined) settings.CFG = inputs.cfg as string | number;
        if (inputs.sampler_name !== undefined) settings.Sampler = String(inputs.sampler_name);
        if (inputs.scheduler !== undefined) settings.Scheduler = String(inputs.scheduler);
        if (inputs.denoise !== undefined) settings.Denoise = inputs.denoise as string | number;
      }
    }

    // KSamplerAdvanced widgets_values:
    // [add_noise, noise_seed, control_after_generate, steps, cfg, sampler_name, scheduler, start_at_step, end_at_step, return_with_leftover_noise]
    if (/^KSamplerAdvanced$/i.test(classType)) {
      if (wv && wv.length >= 10) {
        settings.Seed = wv[1] as string | number;
        settings.Steps = wv[3] as string | number;
        settings.CFG = wv[4] as string | number;
        settings.Sampler = String(wv[5] ?? '');
        settings.Scheduler = String(wv[6] ?? '');
        settings['Start Step'] = wv[7] as string | number;
        settings['End Step'] = wv[8] as string | number;
      } else {
        if (inputs.noise_seed !== undefined) settings.Seed = inputs.noise_seed as string | number;
        if (inputs.steps !== undefined) settings.Steps = inputs.steps as string | number;
        if (inputs.cfg !== undefined) settings.CFG = inputs.cfg as string | number;
        if (inputs.sampler_name !== undefined) settings.Sampler = String(inputs.sampler_name);
        if (inputs.scheduler !== undefined) settings.Scheduler = String(inputs.scheduler);
      }
    }

    // EmptyLatentImage widgets_values: [width, height, batch_size]
    if (/EmptyLatentImage/i.test(classType)) {
      if (wv && wv.length >= 2) {
        settings.Resolution = `${wv[0]} x ${wv[1]}`;
        if (typeof wv[2] === 'number' && wv[2] > 1) {
          settings['Batch Size'] = wv[2];
        }
      } else {
        if (inputs.width !== undefined && inputs.height !== undefined) {
          settings.Resolution = `${inputs.width} x ${inputs.height}`;
        }
        if (typeof inputs.batch_size === 'number' && inputs.batch_size > 1) {
          settings['Batch Size'] = inputs.batch_size;
        }
      }
    }

    // CLIPTextEncode/SDXL prompt extraction
    if (/CLIPTextEncode/i.test(classType)) {
      const isSDXL = /SDXL/i.test(classType);
      let text = '';

      if (wv) {
        if (isSDXL && wv.length >= 7) {
          text = String(wv[6] || '');
        } else if (!isSDXL && wv.length >= 1) {
          text = String(wv[0] || '');
        }
      } else if (typeof inputs === 'object') {
        text = String(inputs.text_g || inputs.text || '');
      }

      if (text.length > 0) {
        const title = String(node?.title || node?._meta?.title || '').toLowerCase();
        const isNegative = title.includes('neg') || title.includes('negative');
        const label = isNegative ? 'Negative Prompt' : 'Positive Prompt';
        if (!settings[label]) {
          settings[label] = text.length > 120 ? `${text.slice(0, 117)}...` : text;
        }
      }
    }
  }

  return settings;
}

function buildFinalDescription(description: string | undefined, autoDescription: string): string {
  const manual = (description || '').trim();
  const generated = autoDescription.trim();
  if (!manual) return generated;
  if (!generated) return manual;
  if (manual.includes('HOW IT WORKS:') || manual.includes('WHY THIS WORKFLOW IS GREAT:')) {
    return manual;
  }
  return `${manual}\n\n${generated}`;
}

/**
 * Type-flow role classification. Roles are inferred from node input/output
 * tensor types sourced from live /object_info schemas (or static fallback).
 */
type NodeRole =
  | 'model_loader'
  | 'model_modifier'
  | 'clip_loader'
  | 'vae_loader'
  | 'text_encoder'
  | 'conditioning_modifier'
  | 'latent_generator'
  | 'sampler'
  | 'decoder'
  | 'encoder'
  | 'image_processor'
  | 'upscaler'
  | 'mask_generator'
  | 'mask_processor'
  | 'detector'
  | 'save_output'
  | 'video_animation'
  | 'utility';

interface NodeRoleDefinition {
  order: number;
  label: string;
  description: string;
  benefit?: string;
}

interface NodeRoleAssignment {
  classType: string;
  title: string;
  role: NodeRole;
  definition: NodeRoleDefinition;
}

interface RoleFlowSchema {
  inputTypes: Set<string>;
  outputTypes: Set<string>;
  category: string;
}

const FRONTEND_ONLY_NODE_TYPES = new Set(['Note', 'Reroute', 'PrimitiveNode']);

const ROLE_DEFINITIONS: Record<NodeRole, NodeRoleDefinition> = {
  model_loader:          { order: 1, label: 'Model Loading',         description: 'Loads the AI model that powers the generation', benefit: 'The model determines the overall style and capabilities of the output' },
  clip_loader:           { order: 2, label: 'CLIP Loading',          description: 'Loads the text understanding model that interprets your prompts', benefit: 'CLIP converts text descriptions into guidance signals for generation' },
  vae_loader:            { order: 3, label: 'VAE Loading',           description: 'Loads the encoder/decoder that converts between pixels and latent space', benefit: 'A good VAE improves color accuracy and fine detail reconstruction' },
  model_modifier:        { order: 4, label: 'Model Adaptation',      description: 'Adapts the base model with LoRA/merging/style injection or similar modifiers', benefit: 'Model adapters add specialized capabilities without replacing the base checkpoint' },
  text_encoder:          { order: 5, label: 'Prompt Encoding',       description: 'Converts prompts into conditioning signals that guide the model', benefit: 'Prompt encoding ensures the model follows your intent more accurately' },
  conditioning_modifier: { order: 6, label: 'Conditioning Control',  description: 'Applies additional guidance such as ControlNet, regional conditioning, or style controls', benefit: 'Extra conditioning increases structural control over composition and details' },
  latent_generator:      { order: 7, label: 'Latent Initialization', description: 'Creates the initial latent canvas where generation starts', benefit: 'A clean latent start improves generation stability and quality' },
  encoder:               { order: 7, label: 'Image Encoding',        description: 'Encodes an existing image into latent space for AI-driven transformation', benefit: 'Latent encoding enables powerful img2img edits while preserving structure' },
  sampler:               { order: 8, label: 'Diffusion Sampling',    description: 'Runs iterative denoising to transform noise into a coherent image', benefit: 'This is the core generation stage where image content is synthesized' },
  decoder:               { order: 9, label: 'Latent Decoding',       description: 'Decodes the latent result back into a visible image' },
  detector:              { order: 10, label: 'Object Detection',     description: 'Detects faces/objects/regions to enable targeted downstream processing', benefit: 'Detection enables selective enhancement for areas like faces and hands' },
  mask_generator:        { order: 10, label: 'Mask Generation',      description: 'Generates masks that define where edits should be applied', benefit: 'Masks allow precise local edits without affecting the entire image' },
  mask_processor:        { order: 11, label: 'Mask Processing',      description: 'Refines or combines masks for more precise selection' },
  image_processor:       { order: 12, label: 'Image Processing',     description: 'Enhances or transforms the image in pixel space', benefit: 'Post-processing improves clarity, detail, and overall output polish' },
  upscaler:              { order: 13, label: 'AI Upscaling',         description: 'Increases resolution using AI super-resolution and detail reconstruction', benefit: 'AI upscaling adds believable detail rather than simple interpolation blur' },
  video_animation:       { order: 14, label: 'Video/Animation',      description: 'Generates or processes frame sequences for animation/video workflows', benefit: 'Motion-aware pipelines improve temporal coherence across frames' },
  save_output:           { order: 15, label: 'Output',               description: 'Saves or previews the final result' },
  utility:               { order: 99, label: 'Utility',              description: 'Provides routing, conversion, or helper logic within the graph' },
};

/**
 * Generates a beginner-friendly workflow description using type-flow analysis.
 * Primary signal is live /object_info-derived schemas, with name-based fallback.
 */
export function generateWorkflowDescription(nodes: any[]): string {
  if (!Array.isArray(nodes) || nodes.length === 0) return '';

  const liveNodes = getLiveNodeCache()?.nodes;
  const assignments: NodeRoleAssignment[] = [];

  for (const node of nodes) {
    const classType = String(node?.type || node?.class_type || '');
    if (!classType || FRONTEND_ONLY_NODE_TYPES.has(classType)) continue;

    const flowSchema = getRoleFlowSchema(classType, liveNodes);
    const role = classifyNodeRole(classType, flowSchema);
    const title = String(node?._meta?.title || node?.title || classType);
    assignments.push({
      classType,
      title,
      role,
      definition: ROLE_DEFINITIONS[role],
    });
  }

  if (assignments.length === 0) {
    return `Workflow with ${nodes.length} nodes.`;
  }

  const roleGroups = new Map<NodeRole, Array<{ classType: string; title: string }>>();
  for (const assignment of assignments) {
    if (!roleGroups.has(assignment.role)) roleGroups.set(assignment.role, []);
    roleGroups.get(assignment.role)!.push({
      classType: assignment.classType,
      title: assignment.title,
    });
  }

  const sortedRoles = Array.from(roleGroups.entries()).sort(
    (a, b) => ROLE_DEFINITIONS[a[0]].order - ROLE_DEFINITIONS[b[0]].order,
  );

  const ecosystem = detectEcosystem(nodes, liveNodes);
  const pipelineType = detectPipelineType(roleGroups);
  const summaryFeatures = sortedRoles
    .filter(([role]) => !['utility', 'save_output', 'vae_loader', 'clip_loader'].includes(role))
    .map(([role]) => ROLE_DEFINITIONS[role].label)
    .slice(0, 6);

  const lines: string[] = [];
  lines.push(`This is a${ecosystem ? ` ${ecosystem}` : ''} ${pipelineType} workflow with ${nodes.length} nodes.`);
  if (summaryFeatures.length > 0) {
    lines.push(`Pipeline: ${summaryFeatures.join(' -> ')}`);
  }
  lines.push('');

  lines.push('HOW IT WORKS:');
  let step = 1;
  for (const [role, roleNodes] of sortedRoles) {
    if (role === 'utility') continue;
    const roleDef = ROLE_DEFINITIONS[role];
    const uniqueNames = Array.from(new Set(roleNodes.map((entry) => entry.title)));
    const shortNames = uniqueNames.length <= 3
      ? uniqueNames
      : [...uniqueNames.slice(0, 2), `+${uniqueNames.length - 2} more`];
    lines.push(`  ${step}. ${roleDef.description} [${shortNames.join(', ')}]`);
    step += 1;
  }
  lines.push('');

  const benefits = Array.from(
    new Set(
      sortedRoles
        .map(([role]) => ROLE_DEFINITIONS[role].benefit)
        .filter((benefit): benefit is string => typeof benefit === 'string' && benefit.length > 0),
    ),
  ).slice(0, 5);

  if (benefits.length > 0) {
    lines.push('WHY THIS WORKFLOW IS GREAT:');
    for (const benefit of benefits) {
      lines.push(`  + ${benefit}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function getRoleFlowSchema(
  classType: string,
  liveNodes: Record<string, any> | undefined,
): RoleFlowSchema {
  const live = liveNodes?.[classType];
  if (live) {
    return {
      inputTypes: new Set(
        (live.inputs || [])
          .map((input: any) => String(input?.type || '').toUpperCase())
          .filter(Boolean),
      ),
      outputTypes: new Set(
        (live.outputs || [])
          .map((output: any) => String(output?.type || '').toUpperCase())
          .filter(Boolean),
      ),
      category: String(live.category || '').toLowerCase(),
    };
  }

  const fallback = NODE_REGISTRY.get(classType);
  if (fallback) {
    return {
      inputTypes: new Set(fallback.inputs.map((input) => String(input.type || '').toUpperCase()).filter(Boolean)),
      outputTypes: new Set(fallback.outputs.map((output) => String(output.type || '').toUpperCase()).filter(Boolean)),
      category: String(fallback.category || '').toLowerCase(),
    };
  }

  return {
    inputTypes: new Set<string>(),
    outputTypes: new Set<string>(),
    category: '',
  };
}

function classifyNodeRole(classType: string, flow: RoleFlowSchema): NodeRole {
  const inputTypes = flow.inputTypes;
  const outputTypes = flow.outputTypes;
  const category = flow.category;
  const lowerClass = classType.toLowerCase();

  if (inputTypes.has('IMAGE') && !outputTypes.has('IMAGE')
    && (category.includes('output') || category.includes('save') || category.includes('preview')
      || /saveimage|previewimage|saveanimated/i.test(lowerClass))) {
    return 'save_output';
  }

  if (outputTypes.has('VIDEO') || inputTypes.has('VIDEO')
    || category.includes('video') || category.includes('animate')
    || /video|animate|motion|svd|wan/i.test(lowerClass)) {
    return 'video_animation';
  }

  if ((inputTypes.has('UPSCALE_MODEL') && inputTypes.has('IMAGE'))
    || (inputTypes.has('IMAGE') && outputTypes.has('IMAGE') && /upscale|esrgan|swinir/i.test(lowerClass))
    || category.includes('upscal')) {
    return 'upscaler';
  }

  if (inputTypes.has('MODEL') && inputTypes.has('CONDITIONING') && inputTypes.has('LATENT') && outputTypes.has('LATENT')) {
    return 'sampler';
  }

  if (inputTypes.has('MODEL') && inputTypes.has('CONDITIONING') && outputTypes.has('IMAGE')
    && /sampler|sample/i.test(lowerClass)) {
    return 'sampler';
  }

  if (inputTypes.has('IMAGE') && (outputTypes.has('BBOX') || outputTypes.has('SEGS') || outputTypes.has('BBOX_LIST') || outputTypes.has('SEGS_HEADER'))) {
    return 'detector';
  }

  if (outputTypes.has('BBOX_DETECTOR') || outputTypes.has('SEGM_DETECTOR') || outputTypes.has('SAM_MODEL')
    || /detector|yolo|sam/i.test(lowerClass)) {
    return 'detector';
  }

  if (inputTypes.has('LATENT') && outputTypes.has('IMAGE') && !inputTypes.has('MODEL')) {
    return 'decoder';
  }

  if (inputTypes.has('IMAGE') && outputTypes.has('LATENT') && !outputTypes.has('IMAGE')) {
    return 'encoder';
  }

  if (outputTypes.has('CONDITIONING') && !inputTypes.has('CONDITIONING')
    && (inputTypes.has('STRING') || inputTypes.has('CLIP'))) {
    return 'text_encoder';
  }

  if (inputTypes.has('CONDITIONING') && outputTypes.has('CONDITIONING')) {
    return 'conditioning_modifier';
  }

  if ((outputTypes.has('MODEL') || outputTypes.has('UPSCALE_MODEL')) && !inputTypes.has('MODEL') && !inputTypes.has('UPSCALE_MODEL')) {
    return 'model_loader';
  }

  if (inputTypes.has('MODEL') && outputTypes.has('MODEL')) {
    return 'model_modifier';
  }

  if (outputTypes.has('CLIP') && !inputTypes.has('CLIP')) {
    return 'clip_loader';
  }

  if (outputTypes.has('VAE') && !inputTypes.has('VAE')) {
    return 'vae_loader';
  }

  if (outputTypes.has('LATENT') && !inputTypes.has('LATENT')) {
    return 'latent_generator';
  }

  if (inputTypes.has('MASK') && outputTypes.has('MASK')) {
    return 'mask_processor';
  }

  if (outputTypes.has('MASK') && !inputTypes.has('MASK')) {
    return 'mask_generator';
  }

  if (inputTypes.has('IMAGE') && outputTypes.has('IMAGE')) {
    return 'image_processor';
  }

  if (inputTypes.has('IMAGE') && !outputTypes.has('IMAGE')) {
    return 'save_output';
  }

  return classifyByName(classType);
}

function classifyByName(classType: string): NodeRole {
  const ct = classType.toLowerCase();
  if (/checkpoint|unetloader|load.*model/.test(ct)) return 'model_loader';
  if (/lora|loha|lokr|modelmerge/.test(ct)) return 'model_modifier';
  if (/cliploader|dualclip/.test(ct)) return 'clip_loader';
  if (/vaeloader/.test(ct)) return 'vae_loader';
  if (/cliptext|textencode/.test(ct)) return 'text_encoder';
  if (/controlnet|ipadapter|conditioning/.test(ct)) return 'conditioning_modifier';
  if (/emptylatent/.test(ct)) return 'latent_generator';
  if (/ksampler|sampler/.test(ct)) return 'sampler';
  if (/vaedecode/.test(ct)) return 'decoder';
  if (/vaeencode/.test(ct)) return 'encoder';
  if (/ultralytic|yolo|sam.*loader|detector/.test(ct)) return 'detector';
  if (/upscale|esrgan|swinir/.test(ct)) return 'upscaler';
  if (/facedetail|facerestore|reactor/.test(ct)) return 'image_processor';
  if (/video|animate|motion|svd|wan/.test(ct)) return 'video_animation';
  if (/save|preview/.test(ct)) return 'save_output';
  return 'utility';
}

function detectEcosystem(nodes: any[], liveNodes: Record<string, any> | undefined): string {
  const classTypes: string[] = [];
  const values: string[] = [];
  const categories: string[] = [];

  for (const node of nodes) {
    const classType = String(node?.type || node?.class_type || '');
    if (classType) classTypes.push(classType.toLowerCase());
    if (Array.isArray(node?.widgets_values)) {
      for (const value of node.widgets_values as unknown[]) {
        if (typeof value === 'string') values.push(value.toLowerCase());
      }
    }
    if (node?.inputs && typeof node.inputs === 'object' && !Array.isArray(node.inputs)) {
      for (const value of Object.values(node.inputs as Record<string, unknown>)) {
        if (typeof value === 'string') values.push(value.toLowerCase());
      }
    }
    const category = String(liveNodes?.[classType]?.category || '').toLowerCase();
    if (category) categories.push(category);
  }

  const allText = `${classTypes.join(' ')} ${values.join(' ')} ${categories.join(' ')}`;

  if (/flux/.test(allText)) return 'FLUX';
  if (/hunyuan/.test(allText)) return 'HunyuanDiT';
  if (/kolors/.test(allText)) return 'Kolors';
  if (/pixart/.test(allText)) return 'PixArt';
  if (/cascade|wurstchen/.test(allText)) return 'Stable Cascade';
  if (/wan/.test(allText) && /video|animate|motion/.test(allText)) return 'Wan Video';
  if (/animatediff/.test(allText)) return 'AnimateDiff';
  if (/svd|stable.video/.test(allText)) return 'Stable Video Diffusion';
  if (/sdxl|sd_xl|stable.diffusion.xl/.test(allText)) return 'SDXL';
  if (/sd3|stable.diffusion.3/.test(allText)) return 'SD3';
  if (/sd.?1\.5|v1-5|sd_1\.5/.test(allText)) return 'SD 1.5';
  if (/qwen|llm|language.model/.test(allText)) return 'Qwen/LLM';

  return '';
}

function detectPipelineType(roleGroups: Map<NodeRole, Array<{ classType: string; title: string }>>): string {
  const hasEncoder = roleGroups.has('encoder');
  const hasSampler = roleGroups.has('sampler');
  const hasUpscaler = roleGroups.has('upscaler');
  const hasVideo = roleGroups.has('video_animation');
  const hasImageProcessor = roleGroups.has('image_processor');
  const hasDetector = roleGroups.has('detector');

  const types: string[] = [];
  if (hasVideo) {
    types.push('video generation');
  } else if (hasEncoder && hasSampler) {
    types.push('img2img');
  } else if (hasSampler) {
    types.push('text-to-image');
  } else {
    types.push('image processing');
  }

  if (hasDetector && hasImageProcessor) {
    types.push('face/detail enhancement');
  } else if (hasImageProcessor && !hasDetector) {
    types.push('image enhancement');
  }

  if (hasUpscaler) {
    types.push('AI upscaling');
  }

  return types.join(' + ');
}

// ---------- Stats Computation ----------

function computeStats(nodes: any[]): WorkflowStats {
  const typeSet = new Set<string>();
  let subgraphCount = 0;
  let groupCount = 0;

  for (const node of nodes) {
    const classType = String(node?.type || node?.class_type || '');
    if (!classType) continue;
    typeSet.add(classType);

    if (UUID_RE.test(classType)) {
      subgraphCount++;
    }

    if (/^workflow\//i.test(classType)) {
      groupCount++;
    }
  }

  return {
    totalNodes: nodes.length,
    uniqueNodeTypes: typeSet.size,
    subgraphNodes: subgraphCount,
    groupNodes: groupCount,
  };
}

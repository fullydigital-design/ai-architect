export type ModelType =
  | 'checkpoint'
  | 'vae'
  | 'lora'
  | 'controlnet'
  | 'upscaler'
  | 'ipadapter'
  | 'clip_vision'
  | 'clip'
  | 'unet'
  | 'style_model'
  | 'embedding'
  | 'hypernetwork'
  | 'gligen'
  | 'unknown';

export interface RequiredModel {
  filename: string;
  modelType: ModelType;
  modelFolder: string;
  sourceNodeId: string;
  sourceNodeType: string;
  widgetField: string;
}

export const NODE_MODEL_MAP: Array<{
  classTypes: string[];
  widgetField: string;
  modelType: ModelType;
  modelFolder: string;
}> = [
  {
    classTypes: ['CheckpointLoaderSimple', 'CheckpointLoader', 'unCLIPCheckpointLoader', 'CheckpointLoaderNF4', 'CheckpointLoaderGGUF'],
    widgetField: 'ckpt_name',
    modelType: 'checkpoint',
    modelFolder: 'checkpoints',
  },
  {
    classTypes: ['VAELoader'],
    widgetField: 'vae_name',
    modelType: 'vae',
    modelFolder: 'vae',
  },
  {
    classTypes: ['LoraLoader', 'LoraLoaderModelOnly', 'LoRAStacker', 'Power Lora Loader (rgthree)'],
    widgetField: 'lora_name',
    modelType: 'lora',
    modelFolder: 'loras',
  },
  {
    classTypes: ['ControlNetLoader', 'DiffControlNetLoader', 'ControlNetLoaderAdvanced'],
    widgetField: 'control_net_name',
    modelType: 'controlnet',
    modelFolder: 'controlnet',
  },
  {
    classTypes: ['UpscaleModelLoader', 'ImageUpscaleWithModel'],
    widgetField: 'model_name',
    modelType: 'upscaler',
    modelFolder: 'upscale_models',
  },
  {
    classTypes: ['IPAdapterModelLoader', 'IPAdapterLoader', 'IPAdapterUnifiedLoader', 'IPAdapterAdvanced'],
    widgetField: 'ipadapter_file',
    modelType: 'ipadapter',
    modelFolder: 'ipadapter',
  },
  {
    classTypes: ['CLIPVisionLoader', 'CLIPVisionEncode'],
    widgetField: 'clip_name',
    modelType: 'clip_vision',
    modelFolder: 'clip_vision',
  },
  {
    classTypes: ['CLIPLoader', 'DualCLIPLoader', 'TripleCLIPLoader'],
    widgetField: 'clip_name',
    modelType: 'clip',
    modelFolder: 'clip',
  },
  {
    classTypes: ['UNETLoader', 'UnetLoaderGGUF'],
    widgetField: 'unet_name',
    modelType: 'unet',
    modelFolder: 'diffusion_models',
  },
  {
    classTypes: ['StyleModelLoader'],
    widgetField: 'style_model_name',
    modelType: 'style_model',
    modelFolder: 'style_models',
  },
  {
    classTypes: ['HypernetworkLoader'],
    widgetField: 'hypernetwork_name',
    modelType: 'hypernetwork',
    modelFolder: 'hypernetworks',
  },
  {
    classTypes: ['GLIGENLoader'],
    widgetField: 'gligen_name',
    modelType: 'gligen',
    modelFolder: 'gligen',
  },
];

const EMBEDDING_RE = /embedding:([^\s,\(\)]+)/gi;

function normalizeFilename(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return null;
  return trimmed;
}

function addModelIfUnique(target: RequiredModel[], seen: Set<string>, model: RequiredModel): void {
  const key = model.filename.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push(model);
}

function findNodeModelRule(classType: string): Array<(typeof NODE_MODEL_MAP)[number]> {
  return NODE_MODEL_MAP.filter((entry) => entry.classTypes.includes(classType));
}

function maybeExtractEmbeddingNames(text: string): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null = EMBEDDING_RE.exec(text);
  while (match) {
    const raw = (match[1] ?? '').trim();
    if (raw) names.push(raw);
    match = EMBEDDING_RE.exec(text);
  }
  EMBEDDING_RE.lastIndex = 0;
  return names;
}

function addEmbeddingModels(
  result: RequiredModel[],
  seen: Set<string>,
  sourceNodeId: string,
  sourceNodeType: string,
  embeddingName: string,
): void {
  const base = embeddingName.replace(/\.(safetensors|pt)$/i, '');
  const candidates = [`${base}.safetensors`, `${base}.pt`, `${base}.bin`];
  for (const candidate of candidates) {
    addModelIfUnique(result, seen, {
      filename: candidate,
      modelType: 'embedding',
      modelFolder: 'embeddings',
      sourceNodeId,
      sourceNodeType,
      widgetField: 'text',
    });
  }
}

function extractFromApiFormat(workflowJson: Record<string, any>, result: RequiredModel[], seen: Set<string>): void {
  for (const [nodeId, node] of Object.entries(workflowJson)) {
    if (!node || typeof node !== 'object') continue;
    const classType = typeof node.class_type === 'string' ? node.class_type : '';
    if (!classType) continue;

    const inputs = node.inputs && typeof node.inputs === 'object' ? node.inputs as Record<string, unknown> : {};
    const rules = findNodeModelRule(classType);
    for (const rule of rules) {
      const value = normalizeFilename(inputs[rule.widgetField]);
      if (!value) continue;
      addModelIfUnique(result, seen, {
        filename: value,
        modelType: rule.modelType,
        modelFolder: rule.modelFolder,
        sourceNodeId: nodeId,
        sourceNodeType: classType,
        widgetField: rule.widgetField,
      });
    }

    for (const [field, value] of Object.entries(inputs)) {
      if (typeof value !== 'string') continue;
      if (!classType.toLowerCase().includes('cliptextencode') && field !== 'text') continue;
      for (const emb of maybeExtractEmbeddingNames(value)) {
        addEmbeddingModels(result, seen, nodeId, classType, emb);
      }
    }
  }
}

function extractFromGraphFormat(workflowJson: Record<string, any>, result: RequiredModel[], seen: Set<string>): void {
  const nodes: any[] = Array.isArray(workflowJson.nodes) ? workflowJson.nodes : [];
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const classType = typeof node.type === 'string' ? node.type : '';
    if (!classType) continue;
    const nodeId = String(node.id ?? '');
    const widgets: unknown[] = Array.isArray(node.widgets_values) ? node.widgets_values : [];

    const rules = findNodeModelRule(classType);
    for (const rule of rules) {
      const filename = widgets.find((w) => typeof w === 'string' && !!normalizeFilename(w));
      const normalized = normalizeFilename(filename);
      if (!normalized) continue;
      addModelIfUnique(result, seen, {
        filename: normalized,
        modelType: rule.modelType,
        modelFolder: rule.modelFolder,
        sourceNodeId: nodeId,
        sourceNodeType: classType,
        widgetField: rule.widgetField,
      });
    }

    const shouldScanText = classType.toLowerCase().includes('cliptextencode')
      || widgets.some((w) => typeof w === 'string' && w.toLowerCase().includes('embedding:'));
    if (!shouldScanText) continue;

    for (const widgetValue of widgets) {
      if (typeof widgetValue !== 'string') continue;
      for (const emb of maybeExtractEmbeddingNames(widgetValue)) {
        addEmbeddingModels(result, seen, nodeId, classType, emb);
      }
    }
  }
}

export function extractRequiredModels(workflowJson: Record<string, any>): RequiredModel[] {
  const result: RequiredModel[] = [];
  const seen = new Set<string>();

  if (!workflowJson || typeof workflowJson !== 'object') return result;

  if (Array.isArray(workflowJson.nodes)) {
    extractFromGraphFormat(workflowJson, result, seen);
  } else {
    extractFromApiFormat(workflowJson, result, seen);
  }

  result.sort((a, b) => {
    if (a.modelType === b.modelType) return a.filename.localeCompare(b.filename);
    return a.modelType.localeCompare(b.modelType);
  });
  return result;
}

export function formatModelType(type: ModelType): string {
  const labels: Record<ModelType, string> = {
    checkpoint: 'Checkpoint',
    vae: 'VAE',
    lora: 'LoRA',
    controlnet: 'ControlNet',
    upscaler: 'Upscaler',
    ipadapter: 'IP-Adapter',
    clip_vision: 'CLIP Vision',
    clip: 'CLIP',
    unet: 'UNET',
    style_model: 'Style Model',
    embedding: 'Embedding',
    hypernetwork: 'Hypernetwork',
    gligen: 'GLIGEN',
    unknown: 'Unknown',
  };
  return labels[type] || type;
}

export function modelTypeBadgeColor(type: ModelType): string {
  const colors: Record<ModelType, string> = {
    checkpoint: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    lora: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    vae: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    controlnet: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    upscaler: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    ipadapter: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    clip_vision: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    clip: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    unet: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    style_model: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    embedding: 'bg-red-500/15 text-red-300 border-red-500/30',
    hypernetwork: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    gligen: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
    unknown: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  };
  return colors[type] || colors.unknown;
}

import { getObjectInfo } from './comfyui-object-info-cache';
import { getComfyUIBaseUrl, resolveComfyUIBaseUrl } from './api-config';

export interface InstalledEnvironment {
  checkpoints: string[];
  loras: string[];
  vaes: string[];
  controlnets: string[];
  upscale_models: string[];
  clips: string[];
  unets: string[];
  clip_vision: string[];
  samplers: string[];
  schedulers: string[];
  nodeTypes: string[];
  totalNodes: number;
}

const NODE_MODEL_MAP: Record<string, Record<string, keyof Omit<InstalledEnvironment, 'nodeTypes' | 'totalNodes'>>> = {
  CheckpointLoaderSimple: { ckpt_name: 'checkpoints' },
  CheckpointLoader: { ckpt_name: 'checkpoints' },
  LoraLoader: { lora_name: 'loras' },
  LoraLoaderModelOnly: { lora_name: 'loras' },
  VAELoader: { vae_name: 'vaes' },
  ControlNetLoader: { control_net_name: 'controlnets' },
  UpscaleModelLoader: { model_name: 'upscale_models' },
  CLIPLoader: { clip_name: 'clips' },
  DualCLIPLoader: { clip_name1: 'clips', clip_name2: 'clips' },
  UNETLoader: { unet_name: 'unets' },
  CLIPVisionLoader: { clip_name: 'clip_vision' },
};

function createEmptyEnvironment(): InstalledEnvironment {
  return {
    checkpoints: [],
    loras: [],
    vaes: [],
    controlnets: [],
    upscale_models: [],
    clips: [],
    unets: [],
    clip_vision: [],
    samplers: [],
    schedulers: [],
    nodeTypes: [],
    totalNodes: 0,
  };
}

function normalizeUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(v => String(v)).filter(v => v.trim().length > 0))).sort((a, b) => a.localeCompare(b));
}

function getRawDropdownValues(data: Record<string, any>, nodeType: string, inputName: string): string[] {
  const node = data?.[nodeType];
  const inputDef = node?.input?.required?.[inputName] ?? node?.input?.optional?.[inputName];
  if (!Array.isArray(inputDef) || inputDef.length === 0) return [];
  const values = inputDef[0];
  return Array.isArray(values) ? values.map(String) : [];
}

function getDropdownValues(nodeInfo: any, inputName: string): string[] {
  const required = nodeInfo?.input?.required;
  const optional = nodeInfo?.input?.optional;
  const inputDef = required?.[inputName] ?? optional?.[inputName];
  if (!Array.isArray(inputDef) || inputDef.length === 0) return [];
  const values = inputDef[0];
  return Array.isArray(values) ? values.map(String) : [];
}

export function extractEnvironmentFromObjectInfo(objectInfo: Record<string, any>): InstalledEnvironment {
  const env = createEmptyEnvironment();

  for (const [nodeType, mapping] of Object.entries(NODE_MODEL_MAP)) {
    const nodeInfo = objectInfo[nodeType];
    if (!nodeInfo) continue;
    for (const [inputName, category] of Object.entries(mapping)) {
      const values = getDropdownValues(nodeInfo, inputName);
      if (values.length > 0) {
        env[category].push(...values);
      }
    }
  }

  const kSampler = objectInfo.KSampler || objectInfo.KSamplerAdvanced;
  if (kSampler) {
    env.samplers.push(...getDropdownValues(kSampler, 'sampler_name'));
    env.schedulers.push(...getDropdownValues(kSampler, 'scheduler'));
  }

  env.nodeTypes = Object.keys(objectInfo).sort((a, b) => a.localeCompare(b));
  env.totalNodes = env.nodeTypes.length;

  env.checkpoints = normalizeUnique(env.checkpoints);
  env.loras = normalizeUnique(env.loras);
  env.vaes = normalizeUnique(env.vaes);
  env.controlnets = normalizeUnique(env.controlnets);
  env.upscale_models = normalizeUnique(env.upscale_models);
  env.clips = normalizeUnique(env.clips);
  env.unets = normalizeUnique(env.unets);
  env.clip_vision = normalizeUnique(env.clip_vision);
  env.samplers = normalizeUnique(env.samplers);
  env.schedulers = normalizeUnique(env.schedulers);

  return env;
}

export async function fetchInstalledEnvironment(comfyuiUrl = getComfyUIBaseUrl()): Promise<InstalledEnvironment> {
  console.log('[Scanner] Fetching /object_info...');
  try {
    const baseUrl = resolveComfyUIBaseUrl(comfyuiUrl);
    const data = await getObjectInfo(baseUrl);
    if (!data || typeof data !== 'object') {
      console.warn('[Scanner] /object_info returned non-object data');
      return createEmptyEnvironment();
    }

    const allNodeKeys = Object.keys(data);
    console.log('[Scanner] Total top-level keys in /object_info:', allNodeKeys.length);
    const ckptRaw = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name;
    console.log('[Scanner] CheckpointLoaderSimple raw:', JSON.stringify(ckptRaw)?.substring(0, 200));

    const typedData = data as Record<string, any>;
    const checkpoints = getRawDropdownValues(typedData, 'CheckpointLoaderSimple', 'ckpt_name');
    const loras = getRawDropdownValues(typedData, 'LoraLoader', 'lora_name');
    const vaes = getRawDropdownValues(typedData, 'VAELoader', 'vae_name');
    const controlnets = getRawDropdownValues(typedData, 'ControlNetLoader', 'control_net_name');
    const upscaleModels = getRawDropdownValues(typedData, 'UpscaleModelLoader', 'model_name');
    const unets = getRawDropdownValues(typedData, 'UNETLoader', 'unet_name');
    const clips = getRawDropdownValues(typedData, 'CLIPLoader', 'clip_name');
    const clipVision = getRawDropdownValues(typedData, 'CLIPVisionLoader', 'clip_name');
    const samplers = getRawDropdownValues(typedData, 'KSampler', 'sampler_name');
    const schedulers = getRawDropdownValues(typedData, 'KSampler', 'scheduler');

    console.log('[Scanner] Checkpoints found:', checkpoints.length, checkpoints);
    console.log('[Scanner] LoRAs found:', loras.length);
    console.log('[Scanner] VAEs found:', vaes.length);
    console.log('[Scanner] Samplers found:', samplers.length);
    console.log('[Scanner] Schedulers found:', schedulers.length);

    const env: InstalledEnvironment = {
      checkpoints: normalizeUnique(checkpoints),
      loras: normalizeUnique(loras),
      vaes: normalizeUnique(vaes),
      controlnets: normalizeUnique(controlnets),
      upscale_models: normalizeUnique(upscaleModels),
      clips: normalizeUnique(clips),
      unets: normalizeUnique(unets),
      clip_vision: normalizeUnique(clipVision),
      samplers: normalizeUnique(samplers),
      schedulers: normalizeUnique(schedulers),
      nodeTypes: allNodeKeys.sort((a, b) => a.localeCompare(b)),
      totalNodes: allNodeKeys.length,
    };
    console.log('[Scanner] Total nodes:', env.totalNodes);
    return env;
  } catch (error) {
    console.warn('[Scanner] Failed to fetch installed environment:', error);
    return createEmptyEnvironment();
  }
}

export function getInstalledEnvironment(): InstalledEnvironment | null {
  return null;
}

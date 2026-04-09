import { NODE_MODEL_MAP, type RequiredModel } from '../utils/workflow-model-extractor';
import { getObjectInfo } from './comfyui-object-info-cache';
import { resolveComfyUIBaseUrl } from './api-config';
import { getInstalledModels } from './comfyui-backend';

export interface ModelAvailability extends RequiredModel {
  isAvailable: boolean;
  availableAlternatives: string[];
}

export interface ModelAvailabilityResult {
  models: ModelAvailability[];
  checkSucceeded: boolean;
  error?: string;
}

function normalizeBaseUrl(url: string): string {
  return resolveComfyUIBaseUrl(url);
}

function normalizeFilename(value: string): string {
  return value.replace(/\\/g, '/').trim().toLowerCase();
}

function normalizeModelFolder(folder: string): string {
  const normalized = String(folder || '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    vaes: 'vae',
    controlnets: 'controlnet',
    checkpoints: 'checkpoints',
    loras: 'loras',
    clip: 'clip',
    clip_vision: 'clip_vision',
    embeddings: 'embeddings',
    upscale_models: 'upscale_models',
    diffusion_models: 'diffusion_models',
    unet: 'diffusion_models',
    text_encoders: 'clip',
    ipadapter: 'ipadapter',
    instantid: 'instantid',
    style_models: 'style_models',
    gligen: 'gligen',
    hypernetworks: 'hypernetworks',
    photomaker: 'photomaker',
  };
  return aliases[normalized] || normalized;
}

function sameFilenameLoose(required: string, candidate: string): boolean {
  const req = normalizeFilename(required);
  const cand = normalizeFilename(candidate);
  if (req === cand) return true;
  const reqBase = req.split('/').pop() || req;
  const candBase = cand.split('/').pop() || cand;
  if (reqBase === candBase) return true;
  return cand.endsWith(`/${reqBase}`) || candBase.endsWith(reqBase);
}

function parseOptionsTuple(rawSpec: unknown): string[] {
  if (!Array.isArray(rawSpec) || rawSpec.length === 0) return [];
  const first = rawSpec[0];
  if (!Array.isArray(first)) return [];
  return first.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

async function fetchEmbeddingNames(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchAvailableModels(comfyuiUrl: string): Promise<Map<string, string[]>> {
  const baseUrl = normalizeBaseUrl(comfyuiUrl);
  const modelMap = new Map<string, Set<string>>();

  const addMany = (folder: string, values: string[]) => {
    const normalizedFolder = normalizeModelFolder(folder);
    if (!modelMap.has(normalizedFolder)) modelMap.set(normalizedFolder, new Set<string>());
    const bucket = modelMap.get(normalizedFolder)!;
    for (const value of values) bucket.add(value);
  };

  const data = await getObjectInfo(baseUrl);
  for (const mapping of NODE_MODEL_MAP) {
    for (const classType of mapping.classTypes) {
      const nodeInfo = data[classType];
      if (!nodeInfo || typeof nodeInfo !== 'object') continue;
      const requiredSpec = nodeInfo?.input?.required?.[mapping.widgetField];
      const optionalSpec = nodeInfo?.input?.optional?.[mapping.widgetField];
      const requiredOptions = parseOptionsTuple(requiredSpec);
      const optionalOptions = parseOptionsTuple(optionalSpec);
      addMany(mapping.modelFolder, requiredOptions);
      addMany(mapping.modelFolder, optionalOptions);
    }
  }

  const embeddings = await fetchEmbeddingNames(baseUrl);
  addMany('embeddings', embeddings);

  // Merge full model inventory cache as an additional source of truth.
  // This avoids false "missing" when /object_info dropdowns are stale or folder-formatted differently.
  const installed = getInstalledModels();
  if (installed) {
    for (const [category, files] of Object.entries(installed)) {
      if (!Array.isArray(files) || files.length === 0) continue;
      addMany(category, files);
    }
  }

  const normalized = new Map<string, string[]>();
  for (const [folder, set] of modelMap.entries()) {
    normalized.set(folder, Array.from(set).sort((a, b) => a.localeCompare(b)));
  }
  return normalized;
}

export function checkModelAvailabilityFromMap(
  requiredModels: RequiredModel[],
  availableMap: Map<string, string[]>,
): ModelAvailability[] {
  return requiredModels.map((required) => {
    const rawAvailable = availableMap.get(required.modelFolder) ?? [];
    const available = rawAvailable.slice().sort((a, b) => a.localeCompare(b));

    let isAvailable = false;
    if (required.modelType === 'embedding') {
      const requiredBase = required.filename.replace(/\.(safetensors|pt|bin)$/i, '').toLowerCase();
      isAvailable = available.some((candidate) => {
        const candidateBase = candidate.replace(/\.(safetensors|pt|bin)$/i, '').toLowerCase();
        return candidateBase === requiredBase;
      });
    } else {
      isAvailable = available.some((candidate) => sameFilenameLoose(required.filename, candidate));
    }

    const alternatives = available
      .filter((candidate) => !sameFilenameLoose(required.filename, candidate))
      .slice(0, 10);

    return {
      ...required,
      isAvailable,
      availableAlternatives: alternatives,
    };
  });
}

export async function checkModelAvailability(
  requiredModels: RequiredModel[],
  comfyuiUrl: string,
): Promise<ModelAvailabilityResult> {
  try {
    const availableMap = await fetchAvailableModels(comfyuiUrl);
    const models = checkModelAvailabilityFromMap(requiredModels, availableMap);
    return { models, checkSucceeded: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to check model availability';
    const models: ModelAvailability[] = requiredModels.map((model) => ({
      ...model,
      isAvailable: false,
      availableAlternatives: [],
    }));
    return {
      models,
      checkSucceeded: false,
      error: errorMessage,
    };
  }
}

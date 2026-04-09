/**
 * Phase 11A-H1 - Node Schema Filter
 *
 * Classifies /object_info nodes by source pack, estimates per-pack token cost,
 * and returns filtered/compressed schema subsets for prompt-context control.
 */

import { estimateJsonTokens } from './token-estimator';
import { getModelContextWindow } from './ai-provider';
import type { CustomModel } from '../types/comfyui';
import { getCachedOpenRouterModels } from '../app/services/openrouter-service';

export const LARGE_PACK_TOKEN_WARNING_THRESHOLD = 10_000;
const WIDGET_TYPES = new Set(['INT', 'FLOAT', 'STRING', 'BOOLEAN', 'COMBO']);

export type FilterPresetId =
  | 'minimal'
  | 'workflow-smart'
  | 'workflow-packs'
  | 'core-popular'
  | 'everything'
  | 'everything-compressed';

export const KNOWN_CONTEXT_LIMITS: Record<string, number> = {
  // OpenAI
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4o-audio-preview': 128_000,
  'gpt-4o-realtime-preview': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-4-turbo-preview': 128_000,
  'gpt-4': 8_192,
  'gpt-4-32k': 32_768,
  'gpt-5': 128_000,
  'gpt-5.2': 128_000,
  'gpt-5-mini': 128_000,
  'gpt-3.5-turbo': 16_385,
  'gpt-3.5-turbo-16k': 16_385,
  o1: 200_000,
  'o1-mini': 128_000,
  'o1-preview': 128_000,
  o3: 200_000,
  'o3-mini': 200_000,
  'o4-mini': 200_000,

  // Anthropic
  'claude-3-5-sonnet': 200_000,
  'claude-3-5-haiku': 200_000,
  'claude-3-7-sonnet': 200_000,
  'claude-3-opus': 200_000,
  'claude-haiku-4-5': 200_000,
  'claude-sonnet-4': 200_000,
  'claude-opus-4': 200_000,
  'claude-haiku-4': 200_000,
  'anthropic/claude-3.5-sonnet': 200_000,
  'anthropic/claude-3.5-haiku': 200_000,
  'anthropic/claude-3-opus': 200_000,
  'anthropic/claude-haiku-4-5': 200_000,

  // Google
  'google/gemini-2.0-flash': 1_000_000,
  'google/gemini-2.0-flash-exp': 1_000_000,
  'google/gemini-2.5-pro': 1_000_000,
  'google/gemini-1.5-pro': 2_000_000,
  'google/gemini-1.5-flash': 1_000_000,

  // Meta/Llama
  'meta-llama/llama-3.1-8b-instruct': 131_072,
  'meta-llama/llama-3.1-70b-instruct': 131_072,
  'meta-llama/llama-3.3-70b-instruct': 131_072,
  'meta-llama/llama-4-scout': 256_000,
  'meta-llama/llama-4-maverick': 256_000,

  // Mistral
  'mistralai/mistral-7b-instruct': 32_768,
  'mistralai/mixtral-8x7b-instruct': 32_768,
  'mistralai/mistral-small': 32_768,
  'mistralai/mistral-medium': 32_768,
  'mistralai/mistral-large': 128_000,
  'mistralai/codestral': 256_000,

  // DeepSeek
  'deepseek/deepseek-chat': 128_000,
  'deepseek/deepseek-r1': 128_000,
  'deepseek/deepseek-r1-distill-llama-70b': 128_000,

  // Liquid
  'liquid/lfm-2.2-6b': 32_768,
  'liquid/lfm-7b': 32_768,
  'liquid/lfm-40b': 32_768,

  // Cohere
  'cohere/command-r': 128_000,
  'cohere/command-r-plus': 128_000,

  // Qwen
  'qwen/qwen-2.5-72b-instruct': 131_072,
  'qwen/qwen-2-72b-instruct': 131_072,
};

export type ModelContextConfidence = 'exact' | 'provider-default' | 'family-match' | 'estimated';

export interface ModelContextResolution {
  contextLimit: number;
  confidence: ModelContextConfidence;
  isKnown: boolean;
}

export interface NodePack {
  id: string;
  displayName: string;
  nodeCount: number;
  nodeClassTypes: string[];
  estimatedTokens: number;
  category: PackCategory;
}

export type PackCategory = 'core' | 'popular' | 'custom' | 'unknown';

export type FilterMode =
  | 'all'
  | 'workflow-only'
  | 'workflow-plus'
  | 'selected-packs'
  | 'smart';

export interface FilterConfig {
  mode: FilterMode;
  selectedPackIds: Set<string>;
  manualPackAdditions: Set<string>;
  manualPackRemovals: Set<string>;
  includeRelatedNodes: boolean;
  compressSchemas: boolean;
}

export interface FilterResult {
  filteredSchemas: Record<string, any>;
  includedNodeCount: number;
  excludedNodeCount: number;
  estimatedTokens: number;
  includedPacks: string[];
  excludedPacks: string[];
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  mode: FilterMode;
  includeRelatedNodes: boolean;
  autoSelectPacks: string[];
  compress: boolean;
  estimatedSavings: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Only nodes used in the current workflow.',
    icon: '🎯',
    mode: 'workflow-only',
    includeRelatedNodes: false,
    autoSelectPacks: [],
    compress: true,
    estimatedSavings: '~95% smaller',
  },
  {
    id: 'workflow-smart',
    name: 'Workflow + Smart',
    description: 'Core nodes plus packs used by the current workflow.',
    icon: '⚡',
    mode: 'smart',
    includeRelatedNodes: true,
    autoSelectPacks: [],
    compress: true,
    estimatedSavings: '~70-80% smaller',
  },
  {
    id: 'workflow-packs',
    name: 'Workflow Packs',
    description: 'All nodes from packs used in the workflow.',
    icon: '📦',
    mode: 'workflow-plus',
    includeRelatedNodes: false,
    autoSelectPacks: [],
    compress: true,
    estimatedSavings: '~50-70% smaller',
  },
  {
    id: 'core-popular',
    name: 'Core + Popular',
    description: 'ComfyUI core and commonly used packs.',
    icon: '⭐',
    mode: 'selected-packs',
    includeRelatedNodes: false,
    autoSelectPacks: [
      'comfyui-core',
      'comfyui-impact-pack',
      'comfyui-controlnet-aux',
      'comfyui-ipadapter-plus',
      'efficiency-nodes-comfyui',
      'rgthree-comfy',
    ],
    compress: true,
    estimatedSavings: '~40-60% smaller',
  },
  {
    id: 'everything',
    name: 'Everything',
    description: 'All installed nodes, no filtering.',
    icon: '🌐',
    mode: 'all',
    includeRelatedNodes: false,
    autoSelectPacks: [],
    compress: false,
    estimatedSavings: 'No reduction',
  },
  {
    id: 'everything-compressed',
    name: 'Everything (Compressed)',
    description: 'All nodes with metadata stripped.',
    icon: '🗜️',
    mode: 'all',
    includeRelatedNodes: false,
    autoSelectPacks: [],
    compress: true,
    estimatedSavings: '~30-40% smaller',
  },
];

export function inferPresetId(config: FilterConfig): FilterPresetId {
  const direct = FILTER_PRESETS.find(
    (preset) => (
      preset.mode === config.mode
      && preset.includeRelatedNodes === config.includeRelatedNodes
      && preset.compress === config.compressSchemas
    ),
  );
  if (direct) return direct.id as FilterPresetId;
  if (config.mode === 'workflow-only') return 'minimal';
  if (config.mode === 'workflow-plus') return 'workflow-packs';
  if (config.mode === 'smart') return 'workflow-smart';
  if (config.mode === 'selected-packs') return 'core-popular';
  return config.compressSchemas ? 'everything-compressed' : 'everything';
}

function normalizeModelId(modelId: string): string {
  return String(modelId || '').trim().toLowerCase();
}

function findKnownContextLimit(modelId: string): number | null {
  const normalized = normalizeModelId(modelId);
  if (!normalized) return null;

  const exact = KNOWN_CONTEXT_LIMITS[normalized];
  if (exact) return exact;
  return null;
}

export function extractModelFamily(modelId: string): string {
  const normalized = normalizeModelId(modelId);
  if (!normalized) return '';

  const withoutDate = normalized
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')
    .replace(/-\d{8}$/, '')
    .replace(/-\d{6}$/, '');

  return withoutDate !== normalized ? withoutDate : '';
}

function findOpenRouterContextLimit(modelId: string): number | null {
  const normalized = normalizeModelId(modelId);
  if (!normalized) return null;
  const cached = getCachedOpenRouterModels().find((model) => normalizeModelId(model.id) === normalized);
  if (cached?.contextLength && cached.contextLength > 0) return cached.contextLength;
  return null;
}

export function getContextLimitWithConfidence(
  modelId: string,
  provider?: string,
  customModels?: CustomModel[],
): ModelContextResolution {
  const normalized = normalizeModelId(modelId);
  const providerNormalized = normalizeModelId(provider || '');
  if (!normalized) {
    return { contextLimit: getModelContextWindow('unknown-model'), confidence: 'estimated', isKnown: false };
  }

  const fromOpenRouter = findOpenRouterContextLimit(normalized);
  if (fromOpenRouter) {
    return { contextLimit: fromOpenRouter, confidence: 'exact', isKnown: true };
  }

  const fromCustom = (customModels || []).find((model) => (
    normalizeModelId(model.id) === normalized
    && typeof model.contextLength === 'number'
    && model.contextLength > 0
  ));
  if (fromCustom?.contextLength) {
    return { contextLimit: fromCustom.contextLength, confidence: 'exact', isKnown: true };
  }

  const fromKnown = findKnownContextLimit(normalized);
  if (fromKnown) {
    return { contextLimit: fromKnown, confidence: 'exact', isKnown: true };
  }

  if (
    providerNormalized === 'anthropic'
    || normalized.includes('anthropic/')
    || normalized.includes('claude')
  ) {
    return { contextLimit: 200_000, confidence: 'provider-default', isKnown: true };
  }

  if (
    providerNormalized === 'google'
    || normalized.includes('google/')
    || normalized.includes('gemini')
  ) {
    if (normalized.includes('1.5') && normalized.includes('pro')) {
      return { contextLimit: 2_000_000, confidence: 'provider-default', isKnown: true };
    }
    return { contextLimit: 1_000_000, confidence: 'provider-default', isKnown: true };
  }

  const family = extractModelFamily(normalized);
  if (family) {
    const familyKnown = findKnownContextLimit(family);
    if (familyKnown) {
      return { contextLimit: familyKnown, confidence: 'family-match', isKnown: true };
    }
  }

  if (normalized.startsWith('gpt-5') || normalized.includes('/gpt-5')) {
    return { contextLimit: 128_000, confidence: 'family-match', isKnown: true };
  }
  if (normalized.startsWith('gpt-4') || normalized.includes('/gpt-4')) {
    return { contextLimit: 128_000, confidence: 'family-match', isKnown: true };
  }
  if (
    normalized.startsWith('o1')
    || normalized.startsWith('o3')
    || normalized.startsWith('o4')
    || normalized.includes('/o1')
    || normalized.includes('/o3')
    || normalized.includes('/o4')
  ) {
    return { contextLimit: 200_000, confidence: 'family-match', isKnown: true };
  }
  if (normalized.startsWith('gpt-3.5')) {
    return { contextLimit: 16_385, confidence: 'family-match', isKnown: true };
  }

  return { contextLimit: getModelContextWindow(normalized), confidence: 'estimated', isKnown: false };
}

export function resolveModelContextLimit(
  modelId: string,
  provider?: string,
  customModels?: CustomModel[],
): ModelContextResolution {
  const resolved = getContextLimitWithConfidence(modelId, provider, customModels);
  return {
    contextLimit: resolved.contextLimit,
    confidence: resolved.confidence,
    isKnown: resolved.confidence !== 'estimated',
  };
}

export function getModelContextLimit(
  modelId: string,
  provider?: string,
  customModels?: CustomModel[],
): number {
  return resolveModelContextLimit(modelId, provider, customModels).contextLimit;
}

export function presetToConfig(preset: FilterPreset, extraSelectedPacks?: Set<string>): FilterConfig {
  const selectedPackIds = new Set(preset.autoSelectPacks);
  if (extraSelectedPacks) {
    for (const packId of extraSelectedPacks) selectedPackIds.add(packId);
  }
  return {
    mode: preset.mode,
    selectedPackIds,
    manualPackAdditions: new Set<string>(),
    manualPackRemovals: new Set<string>(),
    includeRelatedNodes: preset.includeRelatedNodes,
    compressSchemas: preset.compress,
  };
}

export function classifyNodesByPack(objectInfo: Record<string, any>): Map<string, NodePack> {
  const temp = new Map<string, {
    displayName: string;
    nodes: string[];
    schemas: Record<string, any>;
    category: PackCategory;
  }>();

  for (const [classType, schema] of Object.entries(objectInfo || {})) {
    const packId = detectPackId(classType, schema);
    const displayName = detectPackDisplayName(packId);
    const category = categorizePack(packId);

    if (!temp.has(packId)) {
      temp.set(packId, {
        displayName,
        nodes: [],
        schemas: {},
        category,
      });
    }
    const pack = temp.get(packId)!;
    pack.nodes.push(classType);
    pack.schemas[classType] = schema;
  }

  const result = new Map<string, NodePack>();
  for (const [packId, data] of temp.entries()) {
    result.set(packId, {
      id: packId,
      displayName: data.displayName,
      nodeCount: data.nodes.length,
      nodeClassTypes: [...data.nodes].sort(),
      estimatedTokens: estimateJsonTokens(data.schemas),
      category: data.category,
    });
  }
  return result;
}

function detectPackId(classType: string, schema: any): string {
  const moduleName = String(
    schema?.python_module ||
    schema?.python_module_name ||
    schema?.module ||
    schema?.module_name ||
    '',
  );
  if (moduleName) {
    const customMatch = moduleName.match(/^custom_nodes\.([^.]+)/);
    if (customMatch) return normalizePackId(customMatch[1]);
    if (moduleName === 'nodes' || moduleName.startsWith('comfy.') || moduleName.startsWith('comfy_extras.')) {
      return 'comfyui-core';
    }
  }

  const categoryRaw = String(schema?.category || '');
  if (categoryRaw) {
    const topCategory = categoryRaw.split('/')[0].trim();
    const mapped = mapCategoryToPack(topCategory);
    if (mapped) return mapped;
  }

  const classLower = classType.toLowerCase();
  const classPatterns: Array<[RegExp, string]> = [
    [/^(ksampler|checkpointloader|cliptext|vaedecode|vaeencode|emptylatent|saveimage|previewimage|loadimage|loraloader|controlnetloader|controlnetapply|clipvisionloader|unetloader|samplercustom|basicscheduler|basicguider|randomnoise|image|mask|latent)/i, 'comfyui-core'],
    [/^(sam|bbox|segm|segs|detailer|facedetailer|impact)/i, 'comfyui-impact-pack'],
    [/^(was|image_filter|image_blending|text_to_)/i, 'was-node-suite'],
    [/^(ipadapter|prep_image_for_clip)/i, 'comfyui-ipadapter-plus'],
    [/^(reactor|face_restore|face_swap)/i, 'comfyui-reactor-node'],
    [/^(animatediff|ad_|motion_lora)/i, 'comfyui-animatediff-evolved'],
    [/^(controlnet_aux|aux_|openpose|depth|normal|lineart|canny|hed|pidi|scribble|tile|shuffle|mediapipe|densepose|mlsd|zoe)/i, 'comfyui-controlnet-aux'],
    [/^(efficiency|tsc_|xyplot)/i, 'efficiency-nodes-comfyui'],
    [/^(cr_|comfyroll)/i, 'comfyroll-custom-nodes'],
    [/^(rgthree|fast_groups|fast_bypass|bookmark|display_any|power_lora)/i, 'rgthree-comfy'],
  ];
  for (const [pattern, packId] of classPatterns) {
    if (pattern.test(classLower)) return packId;
  }

  if (categoryRaw) return normalizePackId(categoryRaw.split('/')[0]);
  return 'unknown';
}

function mapCategoryToPack(category: string): string | null {
  const map: Record<string, string> = {
    impactpack: 'comfyui-impact-pack',
    impact: 'comfyui-impact-pack',
    'was suite': 'was-node-suite',
    kjnodes: 'comfyui-kjnodes',
    'art venture': 'comfyui-art-venture',
    derfuu: 'derfuu-comfyui-modded-nodes',
    'efficiency nodes': 'efficiency-nodes-comfyui',
    'controlnet preprocessors': 'comfyui-controlnet-aux',
    controlnet_preprocessors: 'comfyui-controlnet-aux',
    animatediff: 'comfyui-animatediff-evolved',
    ipadapter: 'comfyui-ipadapter-plus',
    ip_adapter: 'comfyui-ipadapter-plus',
    reactor: 'comfyui-reactor-node',
    image: 'comfyui-core',
    conditioning: 'comfyui-core',
    latent: 'comfyui-core',
    loaders: 'comfyui-core',
    sampling: 'comfyui-core',
    advanced: 'comfyui-core',
    _for_testing: 'comfyui-core',
  };
  const key = category.toLowerCase();
  return map[key] || null;
}

function normalizePackId(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectPackDisplayName(packId: string): string {
  const names: Record<string, string> = {
    'comfyui-core': 'ComfyUI Core',
    'comfyui-impact-pack': 'Impact Pack',
    'was-node-suite': 'WAS Node Suite',
    'comfyui-ipadapter-plus': 'IPAdapter Plus',
    'comfyui-controlnet-aux': 'ControlNet Preprocessors',
    'comfyui-animatediff-evolved': 'AnimateDiff Evolved',
    'comfyui-reactor-node': 'ReActor',
    'efficiency-nodes-comfyui': 'Efficiency Nodes',
    'comfyroll-custom-nodes': 'ComfyRoll',
    'rgthree-comfy': 'rgthree Nodes',
    'comfyui-kjnodes': 'KJNodes',
  };
  if (names[packId]) return names[packId];
  return packId
    .replace(/^comfyui-/i, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function categorizePack(packId: string): PackCategory {
  if (packId === 'comfyui-core') return 'core';
  const popular = new Set([
    'comfyui-impact-pack',
    'was-node-suite',
    'comfyui-ipadapter-plus',
    'comfyui-controlnet-aux',
    'comfyui-animatediff-evolved',
    'comfyui-reactor-node',
    'efficiency-nodes-comfyui',
    'comfyroll-custom-nodes',
    'rgthree-comfy',
    'comfyui-kjnodes',
  ]);
  if (popular.has(packId)) return 'popular';
  if (packId === 'unknown') return 'unknown';
  return 'custom';
}

export function filterNodeSchemas(
  objectInfo: Record<string, any>,
  config: FilterConfig,
  currentWorkflow?: any,
): FilterResult {
  const packs = classifyNodesByPack(objectInfo);
  let includedClassTypes: Set<string>;
  const workflowTypes = getWorkflowNodeTypes(currentWorkflow);

  switch (config.mode) {
    case 'all':
      includedClassTypes = new Set(Object.keys(objectInfo || {}));
      break;
    case 'workflow-only':
      includedClassTypes = workflowTypes;
      break;
    case 'workflow-plus':
      includedClassTypes = getWorkflowPlusRelated(objectInfo, packs, currentWorkflow);
      break;
    case 'selected-packs':
      includedClassTypes = getNodesBySelectedPacks(packs, config.selectedPackIds);
      break;
    case 'smart':
    default:
      includedClassTypes = getSmartSelection(packs, config, workflowTypes);
      break;
  }

  includedClassTypes = applyManualPackOverrides(includedClassTypes, packs, config);

  const filteredSchemas: Record<string, any> = {};
  for (const classType of includedClassTypes) {
    if (objectInfo[classType]) filteredSchemas[classType] = objectInfo[classType];
  }

  const allClassTypes = new Set(Object.keys(objectInfo || {}));
  const excludedClassTypes = new Set([...allClassTypes].filter((classType) => !includedClassTypes.has(classType)));

  const includedPackIds = new Set<string>();
  const excludedPackIds = new Set<string>();
  for (const [packId, pack] of packs.entries()) {
    const hasIncluded = pack.nodeClassTypes.some((classType) => includedClassTypes.has(classType));
    const hasExcluded = pack.nodeClassTypes.some((classType) => excludedClassTypes.has(classType));
    if (hasIncluded) includedPackIds.add(packId);
    if (hasExcluded && !hasIncluded) excludedPackIds.add(packId);
  }

  return {
    filteredSchemas,
    includedNodeCount: includedClassTypes.size,
    excludedNodeCount: excludedClassTypes.size,
    estimatedTokens: estimateJsonTokens(filteredSchemas),
    includedPacks: [...includedPackIds].sort(),
    excludedPacks: [...excludedPackIds].sort(),
  };
}

function getWorkflowNodeTypes(workflow: any): Set<string> {
  const types = new Set<string>();
  if (!workflow) return types;

  if (Array.isArray(workflow.nodes)) {
    for (const node of workflow.nodes) {
      const classType = node?.type ?? node?.class_type;
      if (classType) types.add(String(classType));
    }
  }

  for (const [key, value] of Object.entries(workflow)) {
    if (!/^\d+$/.test(key)) continue;
    const classType = (value as any)?.class_type;
    if (classType) types.add(String(classType));
  }

  return types;
}

function getWorkflowPlusRelated(
  objectInfo: Record<string, any>,
  packs: Map<string, NodePack>,
  currentWorkflow?: any,
): Set<string> {
  const workflowTypes = getWorkflowNodeTypes(currentWorkflow);
  const result = new Set(workflowTypes);

  const usedPackIds = new Set<string>();
  for (const [packId, pack] of packs.entries()) {
    if (pack.nodeClassTypes.some((classType) => workflowTypes.has(classType))) {
      usedPackIds.add(packId);
    }
  }

  for (const packId of usedPackIds) {
    const pack = packs.get(packId);
    if (!pack) continue;
    for (const classType of pack.nodeClassTypes) result.add(classType);
  }

  const corePack = packs.get('comfyui-core');
  if (corePack) {
    for (const classType of corePack.nodeClassTypes) result.add(classType);
  }

  return result;
}

function getNodesBySelectedPacks(
  packs: Map<string, NodePack>,
  selectedPackIds: Set<string>,
): Set<string> {
  const result = new Set<string>();
  const corePack = packs.get('comfyui-core');
  if (corePack) {
    for (const classType of corePack.nodeClassTypes) result.add(classType);
  }
  for (const [packId, pack] of packs.entries()) {
    if (!selectedPackIds.has(packId)) continue;
    for (const classType of pack.nodeClassTypes) result.add(classType);
  }
  return result;
}

function getWorkflowSmartPackIds(
  packs: Map<string, NodePack>,
  workflowTypes: Set<string>,
  selectedPackIds: Set<string>,
): Set<string> {
  const smartPackIds = new Set<string>();
  if (packs.has('comfyui-core')) smartPackIds.add('comfyui-core');

  for (const [packId, pack] of packs.entries()) {
    if (pack.nodeClassTypes.some((classType) => workflowTypes.has(classType))) {
      smartPackIds.add(packId);
    }
  }

  for (const packId of selectedPackIds) {
    if (packs.has(packId)) smartPackIds.add(packId);
  }

  return smartPackIds;
}

function getSmartSelection(
  packs: Map<string, NodePack>,
  config: FilterConfig,
  workflowTypes: Set<string>,
): Set<string> {
  const result = new Set<string>();
  for (const classType of workflowTypes) result.add(classType);

  const smartPackIds = getWorkflowSmartPackIds(packs, workflowTypes, config.selectedPackIds);
  for (const packId of smartPackIds) {
    const pack = packs.get(packId);
    if (!pack) continue;
    for (const classType of pack.nodeClassTypes) result.add(classType);
  }

  return result;
}

function collectIncludedPackNodes(
  objectInfo: Record<string, any>,
  packs: Map<string, NodePack>,
  included: Set<string>,
): Map<string, string[]> {
  const classTypeToPack = new Map<string, string>();
  for (const [packId, pack] of packs.entries()) {
    for (const classType of pack.nodeClassTypes) {
      classTypeToPack.set(classType, packId);
    }
  }

  const includedByPack = new Map<string, string[]>();
  for (const classType of included) {
    const schema = objectInfo[classType];
    if (!schema) continue;
    const packId = classTypeToPack.get(classType) || detectPackId(classType, schema);
    const existing = includedByPack.get(packId);
    if (existing) existing.push(classType);
    else includedByPack.set(packId, [classType]);
  }
  return includedByPack;
}

export function getPresetCandidatePackIds(
  objectInfo: Record<string, any>,
  config: FilterConfig,
  currentWorkflow?: any,
): Set<string> {
  const packs = classifyNodesByPack(objectInfo);
  const workflowTypes = getWorkflowNodeTypes(currentWorkflow);
  let includedClassTypes: Set<string>;

  switch (config.mode) {
    case 'all':
      includedClassTypes = new Set(Object.keys(objectInfo || {}));
      break;
    case 'workflow-only':
      includedClassTypes = workflowTypes;
      break;
    case 'workflow-plus':
      includedClassTypes = getWorkflowPlusRelated(objectInfo, packs, currentWorkflow);
      break;
    case 'selected-packs':
      includedClassTypes = getNodesBySelectedPacks(packs, config.selectedPackIds);
      break;
    case 'smart':
    default:
      includedClassTypes = getSmartSelection(packs, config, workflowTypes);
      break;
  }

  includedClassTypes = applyManualPackOverrides(includedClassTypes, packs, config);
  const includedByPack = collectIncludedPackNodes(objectInfo, packs, includedClassTypes);
  return new Set(includedByPack.keys());
}

function applyManualPackOverrides(
  included: Set<string>,
  packs: Map<string, NodePack>,
  config: FilterConfig,
): Set<string> {
  const result = new Set(included);
  const manualRemoved = config.manualPackRemovals || new Set<string>();
  const manualAdded = config.manualPackAdditions || new Set<string>();

  for (const packId of manualRemoved) {
    const pack = packs.get(packId);
    if (!pack) continue;
    for (const classType of pack.nodeClassTypes) {
      result.delete(classType);
    }
  }

  for (const packId of manualAdded) {
    const pack = packs.get(packId);
    if (!pack) continue;
    for (const classType of pack.nodeClassTypes) {
      result.add(classType);
    }
  }

  return result;
}

export function compressSchemas(schemas: Record<string, any>): Record<string, any> {
  const compressed: Record<string, any> = {};

  for (const [classType, schema] of Object.entries(schemas || {})) {
    const slim: Record<string, any> = {};
    const widgetOrder = getWidgetOrder(schema);

    if (schema?.input) {
      const input: Record<string, any> = {};
      if (schema.input.required && Object.keys(schema.input.required).length > 0) {
        input.required = compressInputs(schema.input.required);
      }
      if (schema.input.optional && Object.keys(schema.input.optional).length > 0) {
        input.optional = compressInputs(schema.input.optional);
      }
      if (Object.keys(input).length > 0) slim.input = input;
    }

    if (schema?.output) slim.output = schema.output;
    if (schema?.output_name) slim.output_name = schema.output_name;
    if (schema?.category) slim.cat = schema.category;
    if (widgetOrder.length > 0) slim.widgets_order = widgetOrder;
    if (Array.isArray(schema?.output_is_list) && schema.output_is_list.some((value: boolean) => value)) {
      slim.output_is_list = schema.output_is_list;
    }

    compressed[classType] = slim;
  }

  return compressed;
}

function compressInputs(inputs: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [name, config] of Object.entries(inputs || {})) {
    if (!Array.isArray(config)) {
      result[name] = config;
      continue;
    }

    const [type, options] = config;
    if (!options || Object.keys(options).length === 0) {
      result[name] = [type];
      continue;
    }

    const slimOptions: Record<string, any> = {};
    if (options.default !== undefined) slimOptions.default = options.default;
    if (options.min !== undefined) slimOptions.min = options.min;
    if (options.max !== undefined) slimOptions.max = options.max;
    if (options.step !== undefined && options.step !== 1) slimOptions.step = options.step;
    if (options.round !== undefined) slimOptions.round = options.round;

    if (Object.keys(slimOptions).length > 0) {
      result[name] = [type, slimOptions];
    } else {
      result[name] = [type];
    }
  }
  return result;
}

function getCompressedInputType(inputDef: any): string {
  if (!Array.isArray(inputDef) || inputDef.length === 0) return '*';
  if (Array.isArray(inputDef[0])) return 'COMBO';
  if (typeof inputDef[0] === 'string') return String(inputDef[0]).toUpperCase();
  return '*';
}

/**
 * Returns widget input order exactly as defined in /object_info:
 * required widget inputs first, then optional widget inputs.
 */
export function getWidgetOrder(nodeDef: Record<string, any>): string[] {
  const required = nodeDef?.input?.required || {};
  const optional = nodeDef?.input?.optional || {};

  const collectWidgets = (spec: Record<string, any>): string[] => Object.entries(spec)
    .filter(([, inputDef]) => WIDGET_TYPES.has(getCompressedInputType(inputDef)))
    .map(([name]) => name);

  return [...collectWidgets(required), ...collectWidgets(optional)];
}

export function getPackTopNodes(
  packId: string,
  objectInfo: Record<string, any>,
  limit = 8,
): string[] {
  if (!packId || !objectInfo || limit <= 0) return [];
  const packs = classifyNodesByPack(objectInfo);
  const pack = packs.get(packId);
  if (!pack) return [];
  return [...pack.nodeClassTypes].sort((left, right) => left.localeCompare(right)).slice(0, limit);
}

export function compressInputDef(name: string, inputDef: any): string {
  const type = getCompressedInputType(inputDef);
  const options = Array.isArray(inputDef) && inputDef.length > 1 && typeof inputDef[1] === 'object' && inputDef[1]
    ? inputDef[1]
    : undefined;

  if (type === 'COMBO' && Array.isArray(inputDef?.[0])) {
    return `${name}:COMBO[${inputDef[0].map(String).join('|')}]`;
  }

  if (type === 'INT' || type === 'FLOAT') {
    const parts = [type];
    if (options?.min !== undefined) parts.push(`min=${options.min}`);
    if (options?.max !== undefined) parts.push(`max=${options.max}`);
    if (options?.default !== undefined) parts.push(`default=${options.default}`);
    return `${name}:${parts.join(',')}`;
  }

  return `${name}:${type}`;
}

/**
 * Text-compact schema string that preserves enum values, numeric bounds,
 * and exact widget ordering for robust widgets_values generation.
 */
export function compressNodeSchema(nodeType: string, nodeDef: Record<string, any>): string {
  const required = nodeDef?.input?.required || {};
  const optional = nodeDef?.input?.optional || {};

  const inputParts = [
    ...Object.entries(required).map(([name, def]) => compressInputDef(name, def)),
    ...Object.entries(optional).map(([name, def]) => compressInputDef(name, def)),
  ];

  const outputs = Array.isArray(nodeDef?.output)
    ? nodeDef.output.map((type: string, index: number) => {
      const outputName = Array.isArray(nodeDef?.output_name) ? nodeDef.output_name[index] : undefined;
      return `${outputName || type}:${type}`;
    })
    : [];

  const widgetOrder = getWidgetOrder(nodeDef);
  const widgetOrderLine = widgetOrder.length > 0 ? `\n  widgets_order: [${widgetOrder.join(', ')}]` : '';

  return `${nodeType}:\n  inputs: {${inputParts.join(', ')}}\n  outputs: [${outputs.join(', ')}]${widgetOrderLine}`;
}

export function getOptimizedSchemas(
  objectInfo: Record<string, any>,
  config: FilterConfig,
  currentWorkflow?: any,
): FilterResult {
  const base = filterNodeSchemas(objectInfo, config, currentWorkflow);
  if (!config.compressSchemas) return base;

  const compressed = compressSchemas(base.filteredSchemas);
  return {
    ...base,
    filteredSchemas: compressed,
    estimatedTokens: estimateJsonTokens(compressed),
  };
}

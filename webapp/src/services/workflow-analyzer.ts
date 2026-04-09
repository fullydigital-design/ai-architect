/**
 * Workflow Analyzer — Phase 1 of Workflow Study Mode
 *
 * Takes an imported ComfyUIWorkflow and produces a rich analysis:
 *   - Architecture detection (SD1.5 / SDXL / FLUX / SD3)
 *   - Core vs custom node breakdown
 *   - Pack detection via ComfyUI-Manager registry cross-reference
 *   - Data-flow description (topological chain)
 *   - Complexity scoring
 *   - Model slot inventory (which loaders need which files)
 */

import type { ComfyUIWorkflow } from '../types/comfyui';
import { NODE_REGISTRY } from '../data/node-registry';
import type { CustomNodePackInfo } from '../data/custom-node-registry';
import { fetchCustomNodeRegistry, crossReferenceWorkflow } from '../data/custom-node-registry';
import { getLearnedPackIds } from './schema-fetcher';
import { getObjectInfo } from './comfyui-object-info-cache';
import { getLiveNodeCache } from './comfyui-backend';
import { getCachedManagerNodeList } from '../app/services/comfyui-manager-service';

// ===== Public Types ==========================================================

export type ArchitectureType = 'sd15' | 'sdxl' | 'flux' | 'sd3' | 'cascade' | 'unknown';
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'advanced';

export interface DetectedPack {
  packId: string;
  packTitle: string;
  author: string;
  reference: string;
  nodeTypesUsed: string[];
  isPinned: boolean;
  isLearned: boolean;
  installCommand: string;
  stars: number;
  managerStatus?: 'installed' | 'not-installed' | 'update-available' | 'disabled' | 'unknown';
  managerStatusSource?: 'manager-cache';
}

export interface CoreNodeGroup {
  type: string;
  count: number;
  category: string;
  displayName: string;
}

export interface CustomNodeEntry {
  type: string;
  packId: string | null;
  packTitle: string | null;
}

export interface ModelSlot {
  nodeId: number;
  nodeType: string;
  inputName: string;
  currentValue: string;
  category: 'checkpoint' | 'vae' | 'clip' | 'lora' | 'controlnet' | 'upscale' | 'ipadapter' | 'other';
}

export interface WorkflowAnalysis {
  // Architecture
  architecture: ArchitectureType;
  architectureConfidence: number; // 0-1

  // Node breakdown
  totalNodes: number;
  totalLinks: number;
  coreNodes: CoreNodeGroup[];
  customNodes: CustomNodeEntry[];
  unknownNodes: string[]; // node types not matched to any pack or registry

  // Pack detection
  detectedPacks: DetectedPack[];

  // Flow analysis
  flowDescription: string;   // "CheckpointLoader -> CLIPTextEncode -> KSampler -> VAEDecode -> SaveImage"
  branches: string[];         // ["Main generation", "ControlNet preprocessing", ...]
  complexity: ComplexityLevel;

  // Model requirements
  modelSlots: ModelSlot[];
}

// ===== Architecture Detection ================================================

/** Node types that strongly indicate a specific architecture */
const ARCH_SIGNALS: Record<string, { arch: ArchitectureType; weight: number }> = {
  // FLUX
  'UNETLoader':           { arch: 'flux', weight: 0.6 },
  'DualCLIPLoader':       { arch: 'flux', weight: 0.3 }, // also SDXL — needs widget check
  'FluxGuidance':         { arch: 'flux', weight: 0.9 },
  'ModelSamplingFlux':    { arch: 'flux', weight: 0.9 },

  // SDXL
  'CLIPTextEncodeSDXL':             { arch: 'sdxl', weight: 0.9 },
  'SDXLPromptStyler':               { arch: 'sdxl', weight: 0.8 },
  'CLIPTextEncodeSDXLRefiner':      { arch: 'sdxl', weight: 0.9 },

  // SD3
  'SD3CLIPLoader':        { arch: 'sd3', weight: 0.9 },
  'TripleCLIPLoader':     { arch: 'sd3', weight: 0.8 },

  // Cascade
  'StableCascade_StageC': { arch: 'cascade', weight: 0.9 },
  'StableCascade_StageB': { arch: 'cascade', weight: 0.9 },

  // SD 1.5 (weak signals — these also appear in SDXL)
  'CheckpointLoaderSimple': { arch: 'sd15', weight: 0.2 },
  'CLIPTextEncode':         { arch: 'sd15', weight: 0.1 },
};

function detectArchitecture(workflow: ComfyUIWorkflow): { arch: ArchitectureType; confidence: number } {
  const scores: Record<ArchitectureType, number> = {
    sd15: 0, sdxl: 0, flux: 0, sd3: 0, cascade: 0, unknown: 0,
  };

  const applyNodeSignals = (nodeType: string, widgetValues?: unknown[]): void => {
    const signal = ARCH_SIGNALS[nodeType];
    if (signal) {
      scores[signal.arch] += signal.weight;
    }

    // Special: DualCLIPLoader with type widget = "flux" is a strong FLUX signal
    if (nodeType === 'DualCLIPLoader' && Array.isArray(widgetValues)) {
      const typeVal = widgetValues.find(v => typeof v === 'string' && ['flux', 'sd3', 'sdxl'].includes(v.toLowerCase()));
      if (typeVal) {
        const mapped = (typeVal as string).toLowerCase() as ArchitectureType;
        scores[mapped === 'flux' ? 'flux' : mapped === 'sd3' ? 'sd3' : 'sdxl'] += 0.8;
      }
    }

    // EmptyLatentImage dimensions hint
    if (nodeType === 'EmptyLatentImage' && Array.isArray(widgetValues)) {
      const [w, h] = widgetValues.slice(0, 2).map(Number);
      if (w && h) {
        if (w >= 1024 || h >= 1024) scores.sdxl += 0.15;
        else if (w <= 768 && h <= 768) scores.sd15 += 0.15;
      }
    }
  };

  for (const node of workflow.nodes) {
    applyNodeSignals(node.type, node.widgets_values);
  }

  const groupDefs = (workflow.extra as Record<string, any> | undefined)?.groupNodes;
  if (groupDefs && typeof groupDefs === 'object') {
    for (const groupDef of Object.values(groupDefs as Record<string, any>)) {
      const def = groupDef as Record<string, any>;
      if (!Array.isArray(def?.nodes)) continue;
      for (const internalNode of def.nodes as Array<Record<string, any>>) {
        const internalType = typeof internalNode?.type === 'string' ? internalNode.type : '';
        if (!internalType) continue;
        applyNodeSignals(
          internalType,
          Array.isArray(internalNode?.widgets_values) ? internalNode.widgets_values : undefined,
        );
      }
    }
  }

  for (const node of workflow.nodes) {
    if (!Array.isArray(node.widgets_values)) continue;
    for (const val of node.widgets_values) {
      if (typeof val !== 'string' || !MODEL_FILE_RE.test(val)) continue;
      const lower = val.toLowerCase();
      if (lower.includes('flux')) scores.flux += 0.4;
      if (lower.includes('sdxl')) scores.sdxl += 0.3;
      if (lower.includes('sd3')) scores.sd3 += 0.3;
    }
  }

  // Pick the highest-scoring architecture
  let best: ArchitectureType = 'unknown';
  let bestScore = 0;
  for (const [arch, score] of Object.entries(scores) as [ArchitectureType, number][]) {
    if (arch === 'unknown') continue;
    if (score > bestScore) {
      bestScore = score;
      best = arch;
    }
  }

  // Confidence: normalise to 0-1 (cap at 2.0 total signals)
  const confidence = bestScore > 0 ? Math.min(1, bestScore / 1.5) : 0;
  if (confidence < 0.15) best = 'unknown';

  return { arch: best, confidence: Math.round(confidence * 100) / 100 };
}

// ===== Node Categorisation ===================================================

const LOADER_NODE_CATEGORIES: Record<string, ModelSlot['category']> = {
  'CheckpointLoaderSimple': 'checkpoint',
  'CheckpointLoader':       'checkpoint',
  'UNETLoader':             'checkpoint',
  'VAELoader':              'vae',
  'DualCLIPLoader':         'clip',
  'CLIPLoader':             'clip',
  'LoraLoader':             'lora',
  'LoraLoaderModelOnly':    'lora',
  'ControlNetLoader':       'controlnet',
  'UpscaleModelLoader':     'upscale',
  'CLIPVisionLoader':       'ipadapter',
};

const LOADER_INPUT_NAMES = new Set([
  'ckpt_name', 'unet_name', 'vae_name', 'clip_name', 'clip_name1', 'clip_name2',
  'lora_name', 'control_net_name', 'model_name', 'model_path',
]);

const MODEL_FILE_RE = /\.(safetensors|ckpt|pth|pt|bin|onnx|gguf)$/i;

function normalizeModelValue(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.toLowerCase() || value.trim().toLowerCase();
}

/**
 * Infer model category from widget name and filename when node type is unknown.
 */
function inferModelCategory(inputName: string, filename: string): ModelSlot['category'] {
  const name = inputName.toLowerCase();
  const file = filename.toLowerCase();

  if (name.includes('vae')) return 'vae';
  if (name.includes('lora')) return 'lora';
  if (name.includes('clip') || name.includes('text_encoder')) return 'clip';
  if (name.includes('unet') || name.includes('ckpt') || name.includes('checkpoint')) return 'checkpoint';
  if (name.includes('control')) return 'controlnet';
  if (name.includes('upscale')) return 'upscale';

  if (file.includes('vae') || file.startsWith('ae.')) return 'vae';
  if (file.includes('lora')) return 'lora';
  if (file.includes('clip') || file.includes('t5') || file.includes('umt5')) return 'clip';
  if (file.includes('controlnet') || file.includes('control_')) return 'controlnet';
  if (file.includes('upscale') || file.includes('esrgan')) return 'upscale';

  return 'checkpoint';
}

function extractModelSlots(workflow: ComfyUIWorkflow): ModelSlot[] {
  const slots: ModelSlot[] = [];
  const nodeSchemaCache = new Map<string, ReturnType<typeof NODE_REGISTRY.get>>();
  const seenValues = new Set<string>();
  const liveCache = getLiveNodeCache();

  const pushSlot = (slot: ModelSlot): void => {
    const key = normalizeModelValue(slot.currentValue);
    if (!key || seenValues.has(key)) return;
    seenValues.add(key);
    slots.push(slot);
  };

  const scanNodeWidgets = (
    nodeLike: { id?: unknown; type?: unknown; widgets_values?: unknown[] },
    labelType?: string,
  ): void => {
    if (!nodeLike.widgets_values || !Array.isArray(nodeLike.widgets_values) || nodeLike.widgets_values.length === 0) return;
    const nodeType = typeof nodeLike.type === 'string' ? nodeLike.type : (labelType || 'UnknownNode');

    if (!nodeSchemaCache.has(nodeType)) {
      nodeSchemaCache.set(nodeType, NODE_REGISTRY.get(nodeType));
    }
    const staticSchema = nodeSchemaCache.get(nodeType);
    const liveSchema = liveCache?.nodes[nodeType];

    const category = LOADER_NODE_CATEGORIES[nodeType] ?? 'other';
    const widgetInputs = liveSchema
      ? liveSchema.inputs.filter((input) => input.isWidget)
      : staticSchema?.inputs.filter((input) => input.isWidget) ?? [];
    const nodeId = typeof nodeLike.id === 'number' ? nodeLike.id : -1;

    for (let i = 0; i < nodeLike.widgets_values.length; i++) {
      const val = nodeLike.widgets_values[i];
      if (typeof val !== 'string') continue;

      const inputName = widgetInputs[i]?.name ?? `widget_${i}`;
      const isLoaderInput = LOADER_INPUT_NAMES.has(inputName);
      const looksLikeFile = MODEL_FILE_RE.test(val);

      if (isLoaderInput || looksLikeFile) {
        const effectiveCategory = category !== 'other'
          ? category
          : inferModelCategory(inputName, val);
        pushSlot({
          nodeId,
          nodeType: labelType || nodeType,
          inputName,
          currentValue: val,
          category: effectiveCategory,
        });
      }
    }
  };

  for (const node of workflow.nodes) {
    scanNodeWidgets(node);
  }

  const groupDefs = (workflow.extra as Record<string, any> | undefined)?.groupNodes;
  if (groupDefs && typeof groupDefs === 'object') {
    for (const [groupName, groupDef] of Object.entries(groupDefs as Record<string, any>)) {
      const def = groupDef as Record<string, any>;
      if (!Array.isArray(def?.nodes)) continue;
      for (const internalNode of def.nodes as Array<Record<string, any>>) {
        const internalType = typeof internalNode?.type === 'string' ? internalNode.type : 'UnknownInternalNode';
        scanNodeWidgets(
          {
            id: typeof internalNode?.id === 'number' ? internalNode.id : -1,
            type: internalType,
            widgets_values: Array.isArray(internalNode?.widgets_values) ? internalNode.widgets_values : [],
          },
          `${groupName} -> ${internalType}`,
        );
      }
    }
  }

  return slots;
}

function normalizeReference(reference: string): string {
  return reference.replace(/\.git$/i, '').replace(/\/+$/, '').trim().toLowerCase();
}

function normalizeManagerPackStatus(raw: any): DetectedPack['managerStatus'] {
  const installed = String(raw?.installed ?? '').toLowerCase();
  const state = String(raw?.state ?? '').toLowerCase();
  if (installed === 'update' || state === 'update') return 'update-available';
  if (state === 'disabled' || installed === 'disabled') return 'disabled';
  if (
    state === 'enabled'
    || installed === 'true'
    || installed === 'installed'
    || raw?.is_installed === true
  ) {
    return 'installed';
  }
  if (installed === 'false' || state === 'not-installed') return 'not-installed';
  return 'unknown';
}

// ===== Flow Description ======================================================

function buildFlowDescription(workflow: ComfyUIWorkflow): { flow: string; branches: string[] } {
  if (!workflow.nodes.length) return { flow: '(empty workflow)', branches: [] };

  // Build adjacency
  const outgoing = new Map<number, number[]>();
  const incoming = new Map<number, number[]>();
  for (const node of workflow.nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const [, srcId, , tgtId] of workflow.links) {
    outgoing.get(srcId)?.push(tgtId);
    incoming.get(tgtId)?.push(srcId);
  }

  // Find source nodes (no incoming)
  const sources = workflow.nodes.filter(n => (incoming.get(n.id)?.length ?? 0) === 0);
  // Find sink nodes (no outgoing)
  const sinks = workflow.nodes.filter(n => (outgoing.get(n.id)?.length ?? 0) === 0);

  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));

  // Trace the longest path from each source to get main flow chain
  const allPaths: string[][] = [];

  function tracePath(nodeId: number, visited: Set<number>): string[] {
    const node = nodeMap.get(nodeId);
    if (!node || visited.has(nodeId)) return [];
    visited.add(nodeId);
    const displayName = getShortName(node.type);
    const children = outgoing.get(nodeId) ?? [];
    if (children.length === 0) return [displayName];

    // Follow the longest child path
    let longestChild: string[] = [];
    for (const childId of children) {
      const childPath = tracePath(childId, new Set(visited));
      if (childPath.length > longestChild.length) {
        longestChild = childPath;
      }
    }
    return [displayName, ...longestChild];
  }

  // Main path: trace from first source through longest chain
  if (sources.length > 0) {
    for (const src of sources) {
      const path = tracePath(src.id, new Set());
      if (path.length > 0) allPaths.push(path);
    }
  } else {
    // Cyclic or unusual — just list node types
    const path = workflow.nodes.slice(0, 8).map(n => getShortName(n.type));
    allPaths.push(path);
  }

  // Sort paths by length (longest first) — longest is the "main" flow
  allPaths.sort((a, b) => b.length - a.length);

  // Build the main flow string from the longest path
  const mainPath = allPaths[0] ?? [];
  const flow = mainPath.length <= 10
    ? mainPath.join(' \u2192 ')
    : mainPath.slice(0, 8).join(' \u2192 ') + ` \u2192 ... +${mainPath.length - 8} more`;

  // Identify branches
  const branches: string[] = [];

  // Label the main branch
  if (sinks.length > 0) {
    const sinkTypes = sinks.map(n => n.type);
    if (sinkTypes.some(t => t.includes('Save') || t.includes('Preview'))) {
      branches.push('Main generation pipeline');
    } else {
      branches.push('Primary data flow');
    }
  }

  // Detect common branch patterns
  const nodeTypes = new Set(workflow.nodes.map(n => n.type));

  if (nodeTypes.has('ControlNetLoader') || nodeTypes.has('ControlNetApplyAdvanced') || [...nodeTypes].some(t => t.toLowerCase().includes('controlnet'))) {
    branches.push('ControlNet conditioning');
  }
  if ([...nodeTypes].some(t => t.toLowerCase().includes('ipadapter'))) {
    branches.push('IP-Adapter reference');
  }
  if (nodeTypes.has('UpscaleModelLoader') || nodeTypes.has('ImageUpscaleWithModel') || [...nodeTypes].some(t => t.toLowerCase().includes('upscale'))) {
    branches.push('Upscale / post-processing');
  }
  if ([...nodeTypes].some(t => t.toLowerCase().includes('inpaint'))) {
    branches.push('Inpainting');
  }
  if ([...nodeTypes].some(t => t.toLowerCase().includes('animatediff') || t.toLowerCase().includes('video'))) {
    branches.push('Animation / video');
  }
  if (nodeTypes.has('FaceDetailer') || [...nodeTypes].some(t => t.toLowerCase().includes('face'))) {
    branches.push('Face enhancement');
  }
  if ([...nodeTypes].some(t => t.toLowerCase().includes('lora'))) {
    branches.push('LoRA application');
  }

  return { flow, branches };
}

/** Shorten node type for display in flow chains */
function getShortName(type: string): string {
  // Known abbreviations
  const SHORT: Record<string, string> = {
    'CheckpointLoaderSimple': 'Checkpoint',
    'CLIPTextEncode': 'CLIP Encode',
    'CLIPTextEncodeSDXL': 'SDXL Encode',
    'EmptyLatentImage': 'Empty Latent',
    'VAEDecode': 'VAE Decode',
    'VAEEncode': 'VAE Encode',
    'SaveImage': 'Save',
    'PreviewImage': 'Preview',
    'KSampler': 'KSampler',
    'KSamplerAdvanced': 'KSampler+',
    'ControlNetApplyAdvanced': 'ControlNet Apply',
    'ImageUpscaleWithModel': 'Model Upscale',
    'UpscaleModelLoader': 'Upscale Loader',
    'DualCLIPLoader': 'Dual CLIP',
    'UNETLoader': 'UNET Loader',
    'LoraLoader': 'LoRA',
    'LoraLoaderModelOnly': 'LoRA (model)',
    'CLIPSetLastLayer': 'CLIP Skip',
    'ConditioningCombine': 'Cond Combine',
  };
  return SHORT[type] ?? type;
}

// ===== Complexity Scoring ====================================================

function scoreComplexity(
  workflow: ComfyUIWorkflow,
  customNodeCount: number,
  branchCount: number,
): ComplexityLevel {
  const n = workflow.nodes.length;
  const l = workflow.links.length;

  // Weighted score
  let score = 0;
  score += n * 1;           // each node contributes 1
  score += l * 0.5;         // each link contributes 0.5
  score += customNodeCount * 2; // custom nodes add complexity
  score += branchCount * 3; // multiple branches = more complex

  if (score <= 12) return 'simple';
  if (score <= 30) return 'moderate';
  if (score <= 60) return 'complex';
  return 'advanced';
}

// ===== Main Analysis Function ================================================

/**
 * Analyse a workflow. This is the primary export of Phase 1.
 *
 * @param workflow      - The imported ComfyUI workflow
 * @param isPinned      - Callback to check if a pack is already pinned
 * @param registryPacks - Optional pre-fetched registry. If omitted, will be fetched.
 */
export async function analyzeWorkflow(
  workflow: ComfyUIWorkflow,
  isPinned: (packId: string) => boolean,
  registryPacks?: CustomNodePackInfo[],
  comfyuiUrl?: string,
): Promise<WorkflowAnalysis> {
  // 1. Fetch registry if not provided
  let packs: CustomNodePackInfo[] = registryPacks ?? [];
  if (packs.length === 0) {
    try {
      packs = await fetchCustomNodeRegistry();
    } catch {
      // Offline or rate-limited — proceed with empty registry
    }
  }

  // 2. Collect all node types in the workflow
  const allNodeTypes = workflow.nodes.map(n => n.type);
  const uniqueNodeTypes = [...new Set(allNodeTypes)];

  // 3. Separate core vs custom vs unknown
  const coreGroupMap = new Map<string, CoreNodeGroup>();
  const customEntries: CustomNodeEntry[] = [];

  // Cross-reference against manager registry
  const { usedPacks, missingTypes } = crossReferenceWorkflow(packs, uniqueNodeTypes);
  let trueMissingTypes = missingTypes;
  if (comfyuiUrl?.trim() && missingTypes.length > 0) {
    try {
      const objectInfo = await getObjectInfo(comfyuiUrl);
      const availableTypes = new Set(Object.keys(objectInfo));
      trueMissingTypes = missingTypes.filter((type) => !availableTypes.has(type));
    } catch {
      // Keep fallback behavior when ComfyUI is unavailable.
    }
  }

  // Build a reverse lookup: nodeType -> pack
  const typeToPack = new Map<string, CustomNodePackInfo>();
  for (const pack of usedPacks) {
    for (const nodeName of pack.nodeNames) {
      if (uniqueNodeTypes.includes(nodeName)) {
        typeToPack.set(nodeName, pack);
      }
    }
  }

  for (const nodeType of uniqueNodeTypes) {
    const schema = NODE_REGISTRY.get(nodeType);
    const count = allNodeTypes.filter(t => t === nodeType).length;

    if (schema?.source === 'core') {
      // Core node
      coreGroupMap.set(nodeType, {
        type: nodeType,
        count,
        category: schema.category,
        displayName: schema.displayName,
      });
    } else if (schema?.source === 'custom' || typeToPack.has(nodeType)) {
      // Known custom node
      const pack = typeToPack.get(nodeType);
      customEntries.push({
        type: nodeType,
        packId: pack?.id ?? schema?.customNodePack ?? null,
        packTitle: pack?.title ?? schema?.customNodePack ?? null,
      });
      // Also count it as a core group for breakdown
      coreGroupMap.set(nodeType, {
        type: nodeType,
        count,
        category: schema?.category ?? 'custom',
        displayName: schema?.displayName ?? nodeType,
      });
    } else {
      // Unknown node — might still be from a pack we matched via crossReference
      customEntries.push({
        type: nodeType,
        packId: null,
        packTitle: null,
      });
      coreGroupMap.set(nodeType, {
        type: nodeType,
        count,
        category: 'unknown',
        displayName: nodeType,
      });
    }
  }

  // 4. Build DetectedPack list
  const learnedIds = getLearnedPackIds();
  const managerCachedNodes = getCachedManagerNodeList() ?? [];
  const managerByReference = new Map<string, any>();
  const managerByTitle = new Map<string, any>();
  for (const node of managerCachedNodes) {
    const ref = normalizeReference(String(node.reference ?? ''));
    if (ref) managerByReference.set(ref, node);
    const title = String(node.title ?? '').trim().toLowerCase();
    if (title) managerByTitle.set(title, node);
  }

  const detectedPacks: DetectedPack[] = usedPacks.map((pack) => {
    const managerPack = managerByReference.get(normalizeReference(pack.reference))
      || managerByTitle.get(pack.title.trim().toLowerCase());
    const managerStatus = managerPack ? normalizeManagerPackStatus(managerPack) : undefined;
    return {
      packId: pack.id,
      packTitle: pack.title,
      author: pack.author,
      reference: pack.reference,
      nodeTypesUsed: pack.nodeNames.filter(n => uniqueNodeTypes.includes(n)),
      isPinned: isPinned(pack.id),
      isLearned: learnedIds.has(pack.id),
      installCommand: pack.installCommand,
      stars: pack.stars,
      managerStatus,
      managerStatusSource: managerStatus ? 'manager-cache' : undefined,
    };
  });

  // Also try to match nodes from our local static CUSTOM_NODE_PACKS that
  // weren't caught by the registry (they might use different naming)
  // This is already handled by NODE_REGISTRY check above via custom-nodes.ts

  // 5. Detect architecture
  const { arch, confidence } = detectArchitecture(workflow);

  // 6. Build flow description
  const { flow, branches } = buildFlowDescription(workflow);

  // 7. Complexity
  const complexity = scoreComplexity(workflow, customEntries.length, branches.length);

  // 8. Model slots
  const modelSlots = extractModelSlots(workflow);

  return {
    architecture: arch,
    architectureConfidence: confidence,
    totalNodes: workflow.nodes.length,
    totalLinks: workflow.links.length,
    coreNodes: [...coreGroupMap.values()].sort((a, b) => b.count - a.count),
    customNodes: customEntries,
    unknownNodes: trueMissingTypes,
    detectedPacks,
    flowDescription: flow,
    branches,
    complexity,
    modelSlots,
  };
}

// ===== Utility: Human-readable summary =======================================

const ARCH_LABELS: Record<ArchitectureType, string> = {
  sd15: 'Stable Diffusion 1.5',
  sdxl: 'Stable Diffusion XL',
  flux: 'FLUX',
  sd3: 'Stable Diffusion 3',
  cascade: 'Stable Cascade',
  unknown: 'Unknown architecture',
};

/**
 * Generate a human-readable markdown summary from the analysis.
 * Used as the import message in chat.
 */
export function formatAnalysisSummary(analysis: WorkflowAnalysis, filename: string): string {
  const lines: string[] = [];

  // Header
  lines.push(`### Imported: ${filename}`);
  lines.push('');

  // Architecture badge
  const archLabel = ARCH_LABELS[analysis.architecture];
  if (analysis.architecture !== 'unknown') {
    lines.push(`**Architecture:** ${archLabel} (${Math.round(analysis.architectureConfidence * 100)}% confidence)`);
  }

  // Stats
  lines.push(`**Nodes:** ${analysis.totalNodes} | **Links:** ${analysis.totalLinks} | **Complexity:** ${analysis.complexity}`);
  lines.push('');

  // Flow
  lines.push(`**Flow:** \`${analysis.flowDescription}\``);
  lines.push('');

  // Branches
  if (analysis.branches.length > 0) {
    lines.push(`**Techniques:** ${analysis.branches.join(', ')}`);
    lines.push('');
  }

  // Custom packs detected
  if (analysis.detectedPacks.length > 0) {
    lines.push(`**Custom Node Packs Detected:** ${analysis.detectedPacks.length}`);
    for (const pack of analysis.detectedPacks) {
      const status = pack.isPinned ? ' \u2705' : '';
      const learnBadge = pack.isLearned ? ' \ud83e\udde0' : '';
      lines.push(`- **${pack.packTitle}** (${pack.nodeTypesUsed.length} node${pack.nodeTypesUsed.length > 1 ? 's' : ''} used)${status}${learnBadge}`);
    }
    lines.push('');
  }

  // Unknown nodes
  if (analysis.unknownNodes.length > 0) {
    lines.push(`**Unavailable Nodes:** ${analysis.unknownNodes.map(n => `\`${n}\``).join(', ')}`);
    lines.push('');
  }

  // Model slots
  if (analysis.modelSlots.length > 0) {
    lines.push('**Models Referenced:**');
    for (const slot of analysis.modelSlots) {
      lines.push(`- \`${slot.currentValue}\` (${slot.category} in ${slot.nodeType} #${slot.nodeId})`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('You can now ask me to **explain**, **modify**, **extend**, or **debug** this workflow.');

  return lines.join('\n');
}

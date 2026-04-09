import type {
  ComfyUIAPIWorkflow,
  ComfyUILink,
  ComfyUINode,
  ComfyUINodeInput,
  ComfyUINodeOutput,
  ComfyUIWorkflow,
  NodeInput,
  NodeOutput,
  NodeSchema,
} from '../types/comfyui';
import type { LiveNodeCache, LiveNodeSchema } from './comfyui-backend';
import { getLiveNodeCache } from './comfyui-backend';
import { NODE_REGISTRY } from '../data/node-registry';

export interface ConversionResult {
  workflow: ComfyUIWorkflow;
  warnings: string[];
  /** Node class_types whose schemas were not found */
  unknownNodes: string[];
}

interface PendingConnection {
  targetNodeId: number;
  targetNodeIdString: string;
  targetInputName: string;
  sourceNodeIdString: string;
  sourceSlot: number;
  declaredType?: string;
}

interface ConnectionSlotMatch {
  index: number;
  strategy: 'exact' | 'normalized' | 'contains' | 'synonym' | null;
}

interface NormalizedOutput {
  name: string;
  type: string;
  slotIndex: number;
}

interface NormalizedSchema {
  inputs: NodeInput[];
  outputs: NormalizedOutput[];
}

interface ResolvedSchema {
  schema: NormalizedSchema | null;
  resolvedClassType: string;
  strategy?: string;
}

interface InputMatchResult {
  found: boolean;
  value: any;
  matchedKey?: string;
  strategy?: 'exact' | 'normalized' | 'contains' | 'deep_norm';
}

const UI_ONLY_WIDGET_DEFAULTS: Record<string, any> = {
  control_after_generate: 'randomize',
  image: 'image',
};

const CONNECTION_INPUT_SYNONYMS: Record<string, string[]> = {
  samples: ['latent', 'latent_image', 'latents'],
  latent_image: ['latent', 'samples', 'latents'],
  model: ['unet', 'model_opt'],
  clip: ['clip_opt'],
  image: ['images', 'pixels'],
  images: ['image', 'pixels'],
  positive: ['positive_conditioning', 'cond_positive'],
  negative: ['negative_conditioning', 'cond_negative'],
};

const HIDDEN_API_INPUTS = new Set(['unique_id', 'extra_pnginfo', 'prompt']);
const PRIMITIVE_WIDGET_TYPES = new Set([
  'INT',
  'FLOAT',
  'STRING',
  'STRING_MULTILINE',
  'BOOLEAN',
  'COMBO',
  'NUMBER',
]);

const KNOWN_CONNECTION_TYPES = new Set([
  'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE', 'MASK',
  'CONTROL_NET', 'CLIP_VISION', 'CLIP_VISION_OUTPUT', 'STYLE_MODEL',
  'GLIGEN', 'NOISE', 'GUIDER', 'SAMPLER', 'SIGMAS', 'AUDIO',
  'UPSCALE_MODEL', 'UPSCALER', 'PK_HOOK', 'SCHEDULER_FUNC', 'DETAILER_PIPE',
  'BASIC_PIPE', 'SEGS', 'BBOX_DETECTOR', 'SAM_MODEL', 'SEGM_DETECTOR',
  'DETAILER_HOOK', 'HOOKS', 'WEBCAM', 'IPADAPTER', 'INSIGHTFACE',
  'PHOTOMAKER', 'TAESD', 'REGIONAL_PROMPTS', 'MESH', 'CAMERA', 'TRAJECTORY',
]);

function normalizeName(name: string): string {
  return String(name || '').toLowerCase().replace(/[\s_-]/g, '');
}

function normalizeClassTypeName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/concatenate/g, 'concat')
    .replace(/concanate/g, 'concat')
    .replace(/canate/g, 'concat')
    .replace(/[\s_-]/g, '');
}

function deepNormalizeName(name: string): string {
  const value = String(name || '')
    .toLowerCase()
    .replace(/^(upscale_|scale_|up_)/, '')
    .replace(/(_percent|_value|_opt|_input)$/, '');
  return normalizeName(value);
}

function normalizeType(type: string): string {
  return String(type || '').toUpperCase();
}

function isKnownConnectionType(type: string | undefined): boolean {
  const normalized = normalizeType(type || '');
  if (!normalized) return false;
  if (KNOWN_CONNECTION_TYPES.has(normalized)) return true;
  if (normalized.includes('*')) return true;
  return /^[A-Z][A-Z0-9_*]+$/.test(normalized) && !PRIMITIVE_WIDGET_TYPES.has(normalized);
}

function consumeInputByName(
  inputMap: Record<string, any>,
  targetName: string,
  options?: { allowContains?: boolean; allowDeepNorm?: boolean },
): InputMatchResult {
  const allowContains = options?.allowContains !== false;
  const allowDeepNorm = options?.allowDeepNorm !== false;

  if (Object.prototype.hasOwnProperty.call(inputMap, targetName)) {
    const value = inputMap[targetName];
    delete inputMap[targetName];
    return { found: true, value, matchedKey: targetName, strategy: 'exact' };
  }

  const normalizedTarget = normalizeName(targetName);
  const normalizedKey = Object.keys(inputMap).find((key) => normalizeName(key) === normalizedTarget);
  if (normalizedKey) {
    const value = inputMap[normalizedKey];
    delete inputMap[normalizedKey];
    return { found: true, value, matchedKey: normalizedKey, strategy: 'normalized' };
  }

  if (allowContains && normalizedTarget.length >= 3) {
    const containsKey = Object.keys(inputMap).find((key) => {
      const normalizedKeyName = normalizeName(key);
      return normalizedKeyName.includes(normalizedTarget) || normalizedTarget.includes(normalizedKeyName);
    });
    if (containsKey) {
      const value = inputMap[containsKey];
      delete inputMap[containsKey];
      return { found: true, value, matchedKey: containsKey, strategy: 'contains' };
    }
  }

  if (allowDeepNorm) {
    const deepTarget = deepNormalizeName(targetName);
    const deepNormKey = Object.keys(inputMap).find((key) => deepNormalizeName(key) === deepTarget);
    if (deepNormKey) {
      const value = inputMap[deepNormKey];
      delete inputMap[deepNormKey];
      return { found: true, value, matchedKey: deepNormKey, strategy: 'deep_norm' };
    }
  }

  return { found: false, value: undefined };
}

function getWidgetFallbackValue(input: NodeInput): any {
  if (input.default !== undefined) return input.default;
  if (input.options && input.options.length > 0) return input.options[0];
  const normalizedType = normalizeType(input.type);
  if (normalizedType === 'BOOLEAN') return false;
  if (normalizedType === 'INT' || normalizedType === 'FLOAT' || normalizedType === 'NUMBER') return 0;
  if (normalizedType === 'STRING' || normalizedType === 'STRING_MULTILINE') return '';
  return null;
}

function isConnectionTuple(value: unknown): value is [string, number] {
  return (
    Array.isArray(value)
    && value.length === 2
    && typeof value[0] === 'string'
    && typeof value[1] === 'number'
    && Number.isFinite(value[1])
  );
}

function parseConnectionTuple(value: unknown): { sourceNodeId: string; sourceSlot: number } | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const rawNodeId = value[0];
  const rawSlot = value[1];
  const sourceNodeId = typeof rawNodeId === 'string'
    ? rawNodeId
    : typeof rawNodeId === 'number'
      ? String(rawNodeId)
      : null;
  if (!sourceNodeId || typeof rawSlot !== 'number' || !Number.isFinite(rawSlot)) return null;
  return { sourceNodeId, sourceSlot: Math.trunc(rawSlot) };
}

function toWorkflowNodeIds(apiWorkflow: ComfyUIAPIWorkflow): string[] {
  return Object.keys(apiWorkflow).sort((left, right) => {
    const leftNum = Number(left);
    const rightNum = Number(right);
    const leftIsNum = Number.isFinite(leftNum);
    const rightIsNum = Number.isFinite(rightNum);
    if (leftIsNum && rightIsNum) return leftNum - rightNum;
    if (leftIsNum) return -1;
    if (rightIsNum) return 1;
    return left.localeCompare(right);
  });
}

function normalizeLiveSchema(schema: LiveNodeSchema): NormalizedSchema {
  const outputs = (schema.outputs || [])
    .map((output, index) => ({
      name: output.name || `output_${index}`,
      type: String(output.type || '*'),
      slotIndex: Number.isFinite(output.slotIndex) ? Number(output.slotIndex) : index,
    }))
    .sort((left, right) => left.slotIndex - right.slotIndex);
  return {
    inputs: schema.inputs || [],
    outputs,
  };
}

function normalizeStaticSchema(schema: NodeSchema): NormalizedSchema {
  const outputs = (schema.outputs || [])
    .map((output: NodeOutput, index) => ({
      name: output.name || `output_${index}`,
      type: String(output.type || '*'),
      slotIndex: Number.isFinite(output.slotIndex) ? Number(output.slotIndex) : index,
    }))
    .sort((left, right) => left.slotIndex - right.slotIndex);
  return {
    inputs: schema.inputs || [],
    outputs,
  };
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 999;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i += 1) matrix[i] = [i];
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function findFuzzyClassTypeMatch(classType: string, candidates: string[]): { name: string; strategy: string } | null {
  const lowerTarget = classType.toLowerCase();
  const caseMatch = candidates.find((candidate) => candidate.toLowerCase() === lowerTarget);
  if (caseMatch) return { name: caseMatch, strategy: 'case' };

  const normalizedTarget = normalizeClassTypeName(classType);
  const normalizedMatch = candidates.find((candidate) => normalizeClassTypeName(candidate) === normalizedTarget);
  if (normalizedMatch) return { name: normalizedMatch, strategy: 'normalized' };

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestName: string | null = null;
  for (const candidate of candidates) {
    const distance = levenshteinDistance(normalizedTarget, normalizeClassTypeName(candidate));
    if (distance <= 2 && distance < bestDistance) {
      bestDistance = distance;
      bestName = candidate;
    }
  }
  if (bestName) return { name: bestName, strategy: 'levenshtein' };
  return null;
}

function resolveLiveSchema(classType: string, cache: LiveNodeCache | null): ResolvedSchema | null {
  if (!cache?.nodes) return null;
  const exact = cache.nodes[classType];
  if (exact) return { schema: normalizeLiveSchema(exact), resolvedClassType: classType };

  const fuzzyMatch = findFuzzyClassTypeMatch(classType, Object.keys(cache.nodes));
  if (!fuzzyMatch) return null;
  return {
    schema: normalizeLiveSchema(cache.nodes[fuzzyMatch.name]),
    resolvedClassType: fuzzyMatch.name,
    strategy: `live-${fuzzyMatch.strategy}`,
  };
}

function resolveStaticSchema(classType: string): ResolvedSchema | null {
  const exact = NODE_REGISTRY.get(classType);
  if (exact) return { schema: normalizeStaticSchema(exact), resolvedClassType: classType };

  const fuzzyMatch = findFuzzyClassTypeMatch(classType, Array.from(NODE_REGISTRY.keys()));
  if (!fuzzyMatch) return null;
  const matched = NODE_REGISTRY.get(fuzzyMatch.name);
  if (!matched) return null;
  return {
    schema: normalizeStaticSchema(matched),
    resolvedClassType: fuzzyMatch.name,
    strategy: `static-${fuzzyMatch.strategy}`,
  };
}

function resolveSchema(classType: string): ResolvedSchema {
  const cache = getLiveNodeCache();
  const live = resolveLiveSchema(classType, cache);
  if (live) return live;

  const staticMatch = resolveStaticSchema(classType);
  if (staticMatch) return staticMatch;

  return {
    schema: null,
    resolvedClassType: classType,
  };
}

function getOutputType(node: ComfyUINode, sourceSlot: number): string | null {
  if (!node.outputs || node.outputs.length === 0) return null;
  const exact = node.outputs.find((output) => output.slot_index === sourceSlot);
  if (exact?.type) return exact.type;
  const positional = node.outputs[sourceSlot];
  if (positional?.type) return positional.type;
  return null;
}

function getOrCreateOutput(node: ComfyUINode, sourceSlot: number, fallbackType: string): ComfyUINodeOutput {
  if (!node.outputs) node.outputs = [];
  const existing = node.outputs.find((output) => output.slot_index === sourceSlot);
  if (existing) {
    if (!existing.links) existing.links = [];
    if (!existing.type || existing.type === '*') existing.type = fallbackType || '*';
    return existing;
  }
  const created: ComfyUINodeOutput = {
    name: `output_${sourceSlot}`,
    type: fallbackType || '*',
    links: [],
    slot_index: sourceSlot,
  };
  node.outputs.push(created);
  node.outputs.sort((left, right) => left.slot_index - right.slot_index);
  return created;
}

function findConnectionSlotIndex(aiKey: string, targetInputs: ComfyUINodeInput[]): ConnectionSlotMatch {
  const exact = targetInputs.findIndex((input) => input.name === aiKey);
  if (exact !== -1) return { index: exact, strategy: 'exact' };

  const normalizedKey = normalizeName(aiKey);
  const normalized = targetInputs.findIndex((input) => normalizeName(input.name) === normalizedKey);
  if (normalized !== -1) return { index: normalized, strategy: 'normalized' };

  if (normalizedKey.length >= 3) {
    const containsMatches = targetInputs
      .map((input, index) => ({ input, index }))
      .filter(({ input }) => {
        const normalizedInput = normalizeName(input.name);
        return normalizedInput.includes(normalizedKey) || normalizedKey.includes(normalizedInput);
      });
    if (containsMatches.length === 1) {
      return { index: containsMatches[0].index, strategy: 'contains' };
    }
  }

  const synonymMatches = targetInputs
    .map((input, index) => {
      const canonicalName = normalizeName(input.name);
      const synonyms = (CONNECTION_INPUT_SYNONYMS[canonicalName] || []).map((name) => normalizeName(name));
      return { index, matches: synonyms.includes(normalizedKey) };
    })
    .filter((entry) => entry.matches);
  if (synonymMatches.length === 1) {
    return { index: synonymMatches[0].index, strategy: 'synonym' };
  }

  return { index: -1, strategy: null };
}

/**
 * Convert API-format workflow (named inputs) to Graph/UI workflow
 * (widgets_values + links array). Deterministic and schema-driven.
 */
export function apiToGraph(apiWorkflow: ComfyUIAPIWorkflow): ConversionResult {
  const warnings: string[] = [];
  const unknownNodeSet = new Set<string>();
  const nodes: ComfyUINode[] = [];
  const pendingConnections: PendingConnection[] = [];
  const nodeById = new Map<number, ComfyUINode>();
  const nodeIdStringToNumeric = new Map<string, number>();
  const schemaByNodeIdString = new Map<string, NormalizedSchema | null>();
  const linkIdsByNodeInput = new Map<string, number>();
  const nodeIds = toWorkflowNodeIds(apiWorkflow);

  for (let nodeIndex = 0; nodeIndex < nodeIds.length; nodeIndex += 1) {
    const nodeIdString = nodeIds[nodeIndex];
    const apiNode = apiWorkflow[nodeIdString];
    if (!apiNode || typeof apiNode !== 'object' || typeof apiNode.class_type !== 'string') {
      warnings.push(`Node "${nodeIdString}" is not a valid API node object and was skipped.`);
      continue;
    }

    const nodeId = Number(nodeIdString);
    if (!Number.isFinite(nodeId)) {
      warnings.push(`Node "${nodeIdString}" is not numeric. It was skipped during graph conversion.`);
      continue;
    }

    const resolvedSchema = resolveSchema(apiNode.class_type);
    const schema = resolvedSchema.schema;
    const resolvedClassType = resolvedSchema.resolvedClassType;
    schemaByNodeIdString.set(nodeIdString, schema);
    if (resolvedSchema.strategy && resolvedClassType !== apiNode.class_type) {
      const message = `[apiToGraph] Fuzzy class_type match: "${apiNode.class_type}" -> "${resolvedClassType}" (${resolvedSchema.strategy})`;
      console.warn(message);
      warnings.push(message);
    }
    if (!schema) {
      unknownNodeSet.add(apiNode.class_type);
      warnings.push(`No schema found for "${apiNode.class_type}" (node ${nodeIdString}). Using best-effort mapping.`);
    }

    const widgetInputsByName: Record<string, any> = {};
    const connectionInputDefs: Array<{
      name: string;
      tuple: { sourceNodeId: string; sourceSlot: number };
      declaredType?: string;
    }> = [];
    const rawInputs = apiNode.inputs && typeof apiNode.inputs === 'object' ? apiNode.inputs : {};

    for (const [inputName, inputValue] of Object.entries(rawInputs)) {
      if (HIDDEN_API_INPUTS.has(inputName)) continue;
      const schemaInput = schema?.inputs.find((entry) => entry.name === inputName)
        || schema?.inputs.find((entry) => normalizeName(entry.name) === normalizeName(inputName));
      const schemaTreatsAsConnection = Boolean(schemaInput && (!schemaInput.isWidget || isKnownConnectionType(schemaInput.type)));
      const tuple = parseConnectionTuple(inputValue);

      // Treat tuple values as connections even when schema misclassifies custom connection types.
      if (tuple) {
        const declaredType = schemaInput?.type;
        if (schemaInput?.isWidget && !schemaTreatsAsConnection) {
          warnings.push(
            `Node ${nodeIdString} (${apiNode.class_type}) input "${inputName}" looked like a connection tuple but schema marks it as widget (${declaredType}).`,
          );
        }
        connectionInputDefs.push({ name: inputName, tuple, declaredType });
        continue;
      }

      if (schemaTreatsAsConnection) {
        warnings.push(
          `Node ${nodeIdString} (${apiNode.class_type}) input "${inputName}" should be a connection tuple [nodeId, slot].`,
        );
        continue;
      }

      if (schemaInput?.isWidget) {
        widgetInputsByName[inputName] = inputValue;
        continue;
      }

      widgetInputsByName[inputName] = inputValue;
    }

    const schemaWidgetInputs = schema
      ? schema.inputs.filter((input) => input.isWidget && !isKnownConnectionType(input.type))
      : [];
    const hasExplicitControlWidget = schemaWidgetInputs.some(
      (input) => normalizeName(input.name) === normalizeName('control_after_generate'),
    );
    const widgetsValues: any[] = [];
    if (schemaWidgetInputs.length > 0) {
      for (const input of schemaWidgetInputs) {
        const normalizedInputName = normalizeName(input.name);

        if (normalizedInputName === normalizeName('control_after_generate')) {
          widgetsValues.push(UI_ONLY_WIDGET_DEFAULTS.control_after_generate);
          continue;
        }

        const consumed = consumeInputByName(widgetInputsByName, input.name);
        if (consumed.found) {
          widgetsValues.push(consumed.value);
          if (consumed.matchedKey && (consumed.strategy === 'contains' || consumed.strategy === 'deep_norm')) {
            const strategyLabel = consumed.strategy === 'deep_norm' ? 'deep norm' : consumed.strategy;
            console.warn(
              `[apiToGraph] Fuzzy widget match: schema="${input.name}" <- AI="${consumed.matchedKey}" (${strategyLabel})`,
            );
          }
        } else {
          const fallback = getWidgetFallbackValue(input);
          widgetsValues.push(fallback);
          if (input.isRequired) {
            warnings.push(
              `Node ${nodeIdString} (${apiNode.class_type}): missing required widget "${input.name}", used fallback ${JSON.stringify(fallback)}.`,
            );
          }
        }

        const isSeedInt = normalizedInputName === normalizeName('seed') && normalizeType(input.type) === 'INT';
        const requiresControlCompanion = input.hasControlAfterGenerateWidget === true || isSeedInt;
        if (requiresControlCompanion && !hasExplicitControlWidget) {
          widgetsValues.push(UI_ONLY_WIDGET_DEFAULTS.control_after_generate);
        }

        if (input.hasUploadWidget === true) {
          const uploadCompanion = consumeInputByName(widgetInputsByName, 'upload', {
            allowContains: false,
            allowDeepNorm: false,
          });
          const imageUploadCompanion = consumeInputByName(widgetInputsByName, 'image_upload', {
            allowContains: false,
            allowDeepNorm: false,
          });
          widgetsValues.push(
            uploadCompanion.found
              ? uploadCompanion.value
              : imageUploadCompanion.found
                ? imageUploadCompanion.value
                : UI_ONLY_WIDGET_DEFAULTS.image,
          );
        }
      }
    } else {
      // No schema available. Preserve API order for non-connection values.
      for (const [name, value] of Object.entries(rawInputs)) {
        if (HIDDEN_API_INPUTS.has(name)) continue;
        if (isConnectionTuple(value)) continue;
        widgetsValues.push(value);
      }
    }

    const schemaConnectionInputs = schema
      ? schema.inputs.filter((input) => !input.isWidget || isKnownConnectionType(input.type))
      : [];
    const nodeInputs: ComfyUINodeInput[] = [];
    const nodeInputNameSet = new Set<string>();
    for (const input of schemaConnectionInputs) {
      nodeInputs.push({
        name: input.name,
        type: input.type || '*',
        link: null,
      });
      nodeInputNameSet.add(normalizeName(input.name));
    }

    // Only synthesize connection slots from AI keys when schema is unavailable.
    if (!schema) {
      for (const entry of connectionInputDefs) {
        const normalized = normalizeName(entry.name);
        if (nodeInputNameSet.has(normalized)) continue;
        nodeInputs.push({
          name: entry.name,
          type: entry.declaredType || '*',
          link: null,
        });
        nodeInputNameSet.add(normalized);
      }
    }

    const nodeOutputs: ComfyUINodeOutput[] = schema
      ? schema.outputs.map((output) => ({
        name: output.name,
        type: output.type || '*',
        links: [],
        slot_index: output.slotIndex,
      }))
      : [];

    const col = Math.floor(nodeIndex / 4);
    const row = nodeIndex % 4;
    const node: ComfyUINode = {
      id: nodeId,
      type: resolvedClassType,
      pos: [50 + col * 400, 50 + row * 300],
      size: [350, 250],
      flags: {},
      order: nodeIndex,
      mode: 0,
      inputs: nodeInputs.length > 0 ? nodeInputs : undefined,
      outputs: nodeOutputs.length > 0 ? nodeOutputs : undefined,
      widgets_values: widgetsValues.length > 0 ? widgetsValues : undefined,
      properties: { 'Node name for S&R': resolvedClassType },
      title: apiNode._meta?.title,
    };

    nodes.push(node);
    nodeById.set(nodeId, node);
    nodeIdStringToNumeric.set(nodeIdString, nodeId);

    for (const entry of connectionInputDefs) {
      pendingConnections.push({
        targetNodeId: nodeId,
        targetNodeIdString: nodeIdString,
        targetInputName: entry.name,
        sourceNodeIdString: entry.tuple.sourceNodeId,
        sourceSlot: entry.tuple.sourceSlot,
        declaredType: entry.declaredType,
      });
    }

    if (import.meta.env.DEV) {
      const unresolvedWidgetKeys = Object.keys(widgetInputsByName);
      console.log(`[apiToGraph] Node ${nodeIdString} (${apiNode.class_type})`);
      console.log('  Schema widgets:', schemaWidgetInputs.map((input) => `${input.name}(${input.type})`));
      console.log('  Built widgets_values:', widgetsValues);
      const slotNames = (node.inputs || []).map((input, idx) => `slot${idx}: ${input.name}(${input.type}) link=${input.link}`);
      console.log('  Connection slots:', slotNames);
      if (schema) {
        const schemaOrder = schemaConnectionInputs.map((input) => input.name);
        const graphOrder = (node.inputs || []).map((input) => input.name);
        const orderMatch = JSON.stringify(schemaOrder) === JSON.stringify(graphOrder);
        console.log('  Slot order matches schema:', orderMatch ? '✅' : '❌ MISMATCH');
      }
      if (unresolvedWidgetKeys.length > 0) {
        console.warn('  Unmatched AI widget keys:', unresolvedWidgetKeys);
      }
    }
  }

  const links: ComfyUILink[] = [];
  let nextLinkId = 1;

  for (const pending of pendingConnections) {
    const targetNode = nodeById.get(pending.targetNodeId);
    if (!targetNode || !targetNode.inputs) continue;

    const sourceNodeId = nodeIdStringToNumeric.get(pending.sourceNodeIdString);
    if (sourceNodeId === undefined) {
      warnings.push(
        `Node ${pending.targetNodeIdString}: source node "${pending.sourceNodeIdString}" not found for "${pending.targetInputName}".`,
      );
      continue;
    }

    const sourceNode = nodeById.get(sourceNodeId);
    if (!sourceNode) continue;

    const sourceSchema = schemaByNodeIdString.get(pending.sourceNodeIdString);
    const sourceOutputType = sourceSchema?.outputs.find((output) => output.slotIndex === pending.sourceSlot)?.type
      || getOutputType(sourceNode, pending.sourceSlot)
      || pending.declaredType
      || '*';

    const slotMatch = findConnectionSlotIndex(pending.targetInputName, targetNode.inputs);
    let targetSlot = slotMatch.index;
    if (targetSlot !== -1 && slotMatch.strategy && slotMatch.strategy !== 'exact') {
      warnings.push(
        `Node ${pending.targetNodeIdString}: fuzzy-matched "${pending.targetInputName}" to "${targetNode.inputs[targetSlot].name}" by ${slotMatch.strategy}.`,
      );
    }
    if (targetSlot === -1) {
      const typeMatched = targetNode.inputs
        .map((input, index) => ({ input, index }))
        .filter(({ input }) => input.link == null && normalizeType(input.type) === normalizeType(sourceOutputType));
      if (typeMatched.length === 1) {
        targetSlot = typeMatched[0].index;
        warnings.push(
          `Node ${pending.targetNodeIdString}: fuzzy-matched "${pending.targetInputName}" to "${targetNode.inputs[targetSlot].name}" by type ${sourceOutputType}.`,
        );
      }
    }
    if (targetSlot === -1) {
      warnings.push(
        `Node ${pending.targetNodeIdString}: input "${pending.targetInputName}" not found for connection from ${pending.sourceNodeIdString}:${pending.sourceSlot}.`,
      );
      continue;
    }

    const linkId = nextLinkId;
    nextLinkId += 1;
    links.push([
      linkId,
      sourceNodeId,
      pending.sourceSlot,
      pending.targetNodeId,
      targetSlot,
      sourceOutputType || '*',
    ]);

    targetNode.inputs[targetSlot].link = linkId;
    linkIdsByNodeInput.set(`${pending.targetNodeId}:${targetSlot}`, linkId);

    const output = getOrCreateOutput(sourceNode, pending.sourceSlot, sourceOutputType || '*');
    if (!output.links) output.links = [];
    output.links.push(linkId);
  }

  // Ensure inputs preserve any unresolved links as null and outputs have null when empty.
  for (const node of nodes) {
    if (node.inputs) {
      node.inputs = node.inputs.map((input, index) => ({
        ...input,
        link: linkIdsByNodeInput.get(`${node.id}:${index}`) ?? null,
      }));
    }
    if (node.outputs) {
      node.outputs = node.outputs
        .sort((left, right) => left.slot_index - right.slot_index)
        .map((output) => ({
          ...output,
          links: output.links && output.links.length > 0 ? output.links : null,
        }));
    }
  }

  const maxNodeId = nodes.reduce((max, node) => Math.max(max, node.id), 0);
  const maxLinkId = links.reduce((max, link) => Math.max(max, link[0]), 0);

  return {
    workflow: {
      last_node_id: maxNodeId,
      last_link_id: maxLinkId,
      nodes,
      links,
      groups: [],
      config: {},
      extra: { ds: { scale: 1, offset: [0, 0] } },
      version: 0.4,
    },
    warnings,
    unknownNodes: [...unknownNodeSet].sort((left, right) => left.localeCompare(right)),
  };
}

import type {
  ComfyUIWorkflow,
  FragmentType,
  PipelineStage,
  WorkflowCategory,
  WorkflowTemplate,
} from '../types/comfyui';

const STORAGE_KEY = 'architector-workflow-library';

// ===== Auto-extraction helpers =====

/**
 * Extract all unique node class_types from a workflow.
 */
export function extractNodeClassTypes(workflow: ComfyUIWorkflow): string[] {
  return [...new Set(workflow.nodes.map((node) => node.type).filter(Boolean))].sort();
}

/**
 * Extract model filenames from widgets_values of loader-type nodes.
 * Looks for common loader class_types and grabs string widgets that end with a model extension.
 */
export function extractModelsUsed(workflow: ComfyUIWorkflow): string[] {
  const modelExtensions = ['.safetensors', '.ckpt', '.pt', '.pth', '.bin', '.onnx', '.gguf'];
  const loaderTypes = [
    'CheckpointLoaderSimple',
    'CheckpointLoader',
    'UNETLoader',
    'DualCLIPLoader',
    'CLIPLoader',
    'TripleCLIPLoader',
    'VAELoader',
    'LoraLoader',
    'LoraLoaderModelOnly',
    'ControlNetLoader',
    'UpscaleModelLoader',
    'IPAdapterModelLoader',
    'CLIPVisionLoader',
    'StyleModelLoader',
    'unCLIPCheckpointLoader',
    'PhotoMakerLoader',
    'InstantIDModelLoader',
    'AnimateDiffModelLoader',
    'AnimateDiffLoRALoader',
  ];

  const models = new Set<string>();

  for (const node of workflow.nodes) {
    const isKnownLoader = loaderTypes.some((loaderType) => node.type.includes(loaderType));
    const isGenericLoader = node.type.toLowerCase().includes('loader');
    if ((!isKnownLoader && !isGenericLoader) || !node.widgets_values) {
      continue;
    }

    for (const value of node.widgets_values) {
      if (
        typeof value === 'string' &&
        modelExtensions.some((ext) => value.toLowerCase().endsWith(ext))
      ) {
        models.add(value);
      }
    }
  }

  return [...models].sort();
}

/**
 * Auto-detect the primary category from node types.
 */
export function detectCategory(workflow: ComfyUIWorkflow): WorkflowCategory {
  const types = new Set(workflow.nodes.map((node) => node.type));

  // Check in order of specificity.
  if (types.has('AnimateDiffCombine') || types.has('ADE_AnimateDiffLoaderWithContext')) {
    return 'video';
  }
  if (types.has('IPAdapterAdvanced') || types.has('IPAdapterUnifiedLoader')) {
    return 'ipadapter';
  }
  if (types.has('FaceDetailer') || types.has('DetailerForEach')) {
    return 'face-detailer';
  }
  if (types.has('ControlNetApplyAdvanced') || types.has('ControlNetApply')) {
    return 'controlnet';
  }
  if (types.has('VAEEncodeForInpaint') || types.has('InpaintModelConditioning')) {
    return 'inpaint';
  }
  if (types.has('LoraLoader') || types.has('LoraLoaderModelOnly')) {
    return 'lora';
  }
  if (types.has('ImageUpscaleWithModel') || types.has('UpscaleModelLoader')) {
    return 'upscale';
  }
  if (types.has('LoadImage') && types.has('KSampler')) {
    return 'img2img';
  }
  if (types.has('EmptyLatentImage') || types.has('EmptySD3LatentImage')) {
    return 'txt2img';
  }

  return 'custom';
}

/**
 * Generate a URL-safe slug from a name.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 64);
}

// ===== CRUD Operations =====

/**
 * Load all workflow templates from localStorage.
 */
export function loadWorkflowLibrary(): WorkflowTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WorkflowTemplate[]) : [];
  } catch (error) {
    console.error('[WorkflowLibrary] Failed to load:', error);
    return [];
  }
}

/**
 * Save the full library to localStorage.
 */
function saveWorkflowLibrary(library: WorkflowTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (error) {
    console.error('[WorkflowLibrary] Failed to save:', error);
  }
}

/**
 * Save a workflow to the library with auto-extracted metadata.
 * If a template with the same ID already exists, it is updated.
 */
export function saveWorkflowToLibrary(
  workflow: ComfyUIWorkflow,
  name: string,
  description: string,
  options?: {
    tags?: string[];
    category?: WorkflowCategory;
    isFragment?: boolean;
    fragmentType?: FragmentType;
    pipelineStages?: PipelineStage[];
  },
): WorkflowTemplate {
  const library = loadWorkflowLibrary();
  const now = Date.now();
  const id = generateSlug(name);

  const nodeClassTypes = extractNodeClassTypes(workflow);
  const modelsUsed = extractModelsUsed(workflow);
  const category = options?.category || detectCategory(workflow);

  const tags =
    options?.tags ||
    [
      category,
      ...nodeClassTypes
        .filter((type) =>
          [
            'KSampler',
            'UNETLoader',
            'CheckpointLoaderSimple',
            'ControlNetApplyAdvanced',
            'IPAdapterAdvanced',
            'FaceDetailer',
            'ImageUpscaleWithModel',
            'AnimateDiffCombine',
          ].includes(type),
        )
        .map((type) =>
          type
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .replace(/^-/, ''),
        ),
    ];

  const template: WorkflowTemplate = {
    id,
    name,
    description,
    tags: [...new Set(tags)],
    category,
    workflow,
    pipelineStages: options?.pipelineStages,
    nodeClassTypes,
    modelsUsed,
    isFragment: options?.isFragment ?? false,
    fragmentType: options?.fragmentType,
    createdAt: now,
    updatedAt: now,
  };

  const existingIndex = library.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    template.createdAt = library[existingIndex].createdAt;
    library[existingIndex] = template;
  } else {
    library.push(template);
  }

  saveWorkflowLibrary(library);
  return template;
}

/**
 * Delete a workflow template by ID.
 */
export function deleteWorkflowFromLibrary(id: string): boolean {
  const library = loadWorkflowLibrary();
  const filtered = library.filter((template) => template.id !== id);
  if (filtered.length === library.length) {
    return false;
  }
  saveWorkflowLibrary(filtered);
  return true;
}

/**
 * Get a single template by ID.
 */
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return loadWorkflowLibrary().find((template) => template.id === id);
}

/**
 * Update a template's metadata without replacing the workflow itself.
 */
export function updateWorkflowMetadata(
  id: string,
  updates: Partial<
    Pick<
      WorkflowTemplate,
      'name' | 'description' | 'tags' | 'category' | 'isFragment' | 'fragmentType' | 'pipelineStages'
    >
  >,
): WorkflowTemplate | null {
  const library = loadWorkflowLibrary();
  const index = library.findIndex((template) => template.id === id);
  if (index < 0) {
    return null;
  }

  library[index] = {
    ...library[index],
    ...updates,
    updatedAt: Date.now(),
  };

  saveWorkflowLibrary(library);
  return library[index];
}

// ===== Search & Filter =====

/**
 * Search the library by query string (matches name, description, tags, node types, model names).
 */
export function searchWorkflowLibrary(
  query: string,
  filters?: {
    category?: WorkflowCategory;
    isFragment?: boolean;
    tags?: string[];
  },
): WorkflowTemplate[] {
  let results = loadWorkflowLibrary();
  const q = query.toLowerCase().trim();

  if (q) {
    results = results.filter(
      (template) =>
        template.name.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        template.nodeClassTypes.some((classType) => classType.toLowerCase().includes(q)) ||
        template.modelsUsed.some((model) => model.toLowerCase().includes(q)),
    );
  }

  if (filters?.category) {
    results = results.filter((template) => template.category === filters.category);
  }

  if (filters?.isFragment !== undefined) {
    results = results.filter((template) => template.isFragment === filters.isFragment);
  }

  if (filters?.tags?.length) {
    results = results.filter((template) =>
      filters.tags!.every((tag) => template.tags.includes(tag)),
    );
  }

  return results.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get all unique tags across the entire library.
 */
export function getAllLibraryTags(): string[] {
  const library = loadWorkflowLibrary();
  const tags = new Set<string>();
  for (const template of library) {
    template.tags.forEach((tag) => tags.add(tag));
  }
  return [...tags].sort();
}

/**
 * Get library stats for display.
 */
export function getLibraryStats(): {
  total: number;
  workflows: number;
  fragments: number;
  categories: Record<string, number>;
} {
  const library = loadWorkflowLibrary();
  const categories: Record<string, number> = {};
  let fragments = 0;

  for (const template of library) {
    categories[template.category] = (categories[template.category] || 0) + 1;
    if (template.isFragment) {
      fragments += 1;
    }
  }

  return {
    total: library.length,
    workflows: library.length - fragments,
    fragments,
    categories,
  };
}

/**
 * Extract a subgraph from a workflow using selected node IDs.
 * Keeps only internal links and nulls external node link refs.
 */
export function extractSubgraph(
  workflow: ComfyUIWorkflow,
  selectedNodeIds: Set<number>,
): ComfyUIWorkflow {
  const nodes = workflow.nodes.filter((node) => selectedNodeIds.has(node.id));
  const links = workflow.links.filter((link) => {
    const [, sourceId, , targetId] = link;
    return selectedNodeIds.has(sourceId) && selectedNodeIds.has(targetId);
  });

  const internalLinkIds = new Set(links.map((link) => link[0]));

  const cleanedNodes = nodes.map((node) => {
    const cleanedInputs = node.inputs?.map((input) => ({
      ...input,
      link: input.link !== null && internalLinkIds.has(input.link) ? input.link : null,
    }));

    const cleanedOutputs = node.outputs?.map((output) => {
      const filteredLinks = output.links?.filter((linkId) => internalLinkIds.has(linkId)) ?? [];
      return {
        ...output,
        links: filteredLinks.length > 0 ? filteredLinks : null,
      };
    });

    return {
      ...node,
      inputs: cleanedInputs,
      outputs: cleanedOutputs,
    };
  });

  return {
    last_node_id: Math.max(0, ...cleanedNodes.map((node) => node.id)),
    last_link_id: links.length > 0 ? Math.max(0, ...links.map((link) => link[0])) : 0,
    nodes: cleanedNodes,
    links,
    groups: [],
    config: {},
    extra: { ds: { scale: 1, offset: [0, 0] } },
    version: 0.4,
  };
}

/**
 * Auto-detect a fragment type from node classes in a subgraph workflow.
 */
export function detectFragmentType(workflow: ComfyUIWorkflow): FragmentType {
  const types = new Set(workflow.nodes.map((node) => node.type));

  const hasOutput = types.has('SaveImage') || types.has('PreviewImage');
  const hasInput = types.has('LoadImage') || types.has('LoadImageMask');
  const hasSampler = types.has('KSampler') || types.has('KSamplerAdvanced') || types.has('SamplerCustom');
  const hasUpscale = types.has('ImageUpscaleWithModel') || types.has('UpscaleModelLoader');
  const hasControlNet = types.has('ControlNetApplyAdvanced') || types.has('ControlNetApply') || types.has('ControlNetLoader');
  const hasIPAdapter = types.has('IPAdapterAdvanced') || types.has('IPAdapterUnifiedLoader');
  const hasLoRA = types.has('LoraLoader') || types.has('LoraLoaderModelOnly');
  const hasFaceDetailer = types.has('FaceDetailer') || types.has('DetailerForEach');

  if (hasOutput && !hasSampler) return 'output';
  if (hasInput && !hasSampler) return 'input';
  if (hasFaceDetailer || (types.has('SAMLoader') && !hasSampler)) return 'postprocess';
  if (hasUpscale) return 'upscaling';
  if (hasControlNet || hasIPAdapter || hasLoRA) return 'conditioning';
  if (hasSampler) return 'generation';

  return 'custom';
}

// ===== AI Reference Injection =====

/**
 * Build a compact summary of a workflow template for AI context injection.
 * This intentionally avoids full workflow JSON.
 */
export function buildTemplateSummary(template: WorkflowTemplate): string {
  const lines: string[] = [];
  lines.push(
    `### ${template.name} [${template.category}${template.isFragment ? ', fragment' : ''}]`,
  );
  lines.push(`> ${template.description}`);
  lines.push('');

  const nodesByX = [...template.workflow.nodes].sort(
    (a, b) => (a.pos?.[0] ?? 0) - (b.pos?.[0] ?? 0),
  );
  const nodeChain = nodesByX.map((node) => `${node.type} #${node.id}`).join(' -> ');
  lines.push(`**Flow:** ${nodeChain}`);
  lines.push('');

  if (template.pipelineStages && template.pipelineStages.length > 0) {
    lines.push('| Stage | Nodes | Purpose | Settings |');
    lines.push('|---|---|---|---|');
    for (const stage of template.pipelineStages) {
      const nodes = stage.nodeTypes
        .map((nodeType, index) => `\`${nodeType}\` #${stage.nodeIds[index] ?? '?'}`)
        .join(' + ');
      lines.push(
        `| ${stage.order} | ${nodes} | ${stage.purpose} | ${stage.keySettings || '-'} |`,
      );
    }
    lines.push('');
  }

  if (template.modelsUsed.length > 0) {
    lines.push(`**Models:** ${template.modelsUsed.map((model) => `\`${model}\``).join(', ')}`);
    lines.push('');
  }

  const samplerNodes = template.workflow.nodes.filter(
    (node) => node.type.includes('KSampler') || node.type.includes('SamplerCustom'),
  );
  if (samplerNodes.length > 0) {
    for (const samplerNode of samplerNodes) {
      if (samplerNode.widgets_values && samplerNode.widgets_values.length >= 5) {
        const values = samplerNode.widgets_values;
        const settings = `steps=${values[2]}, cfg=${values[3]}, sampler=${values[4]}, scheduler=${values[5]}${
          values[6] !== undefined ? `, denoise=${values[6]}` : ''
        }`;
        lines.push(`**${samplerNode.type} #${samplerNode.id} settings:** ${settings}`);
      }
    }
    lines.push('');
  }

  const linkCount = template.workflow.links?.length ?? 0;
  lines.push(`*${template.workflow.nodes.length} nodes, ${linkCount} connections*`);
  return lines.join('\n');
}

/**
 * Find relevant workflows from the user's saved library for the current query.
 */
export function findRelevantReferences(
  query: string,
  maxResults = 3,
): WorkflowTemplate[] {
  const library = loadWorkflowLibrary();
  if (library.length === 0) {
    return [];
  }

  const q = query.toLowerCase();
  const scored = library.map((template) => {
    let score = 0;

    const categoryKeywords: Record<WorkflowCategory, string[]> = {
      txt2img: ['text to image', 'txt2img', 'generate', 'create image', 'new image'],
      img2img: ['image to image', 'img2img', 'transform', 'convert'],
      upscale: ['upscale', 'upscaling', 'super resolution', 'enhance', 'high res', 'hires'],
      controlnet: ['controlnet', 'control net', 'canny', 'depth', 'openpose', 'pose'],
      inpaint: ['inpaint', 'inpainting', 'mask', 'fill'],
      video: ['video', 'animate', 'animation', 'animatediff', 'motion'],
      ipadapter: ['ipadapter', 'ip-adapter', 'image reference', 'style transfer', 'reference image'],
      lora: ['lora', 'style', 'character'],
      'face-detailer': ['face', 'face fix', 'face detailer', 'facedetailer', 'portrait'],
      custom: ['custom'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((kw) => q.includes(kw)) && template.category === category) {
        score += 10;
      }
    }

    for (const tag of template.tags) {
      if (q.includes(tag.toLowerCase())) {
        score += 5;
      }
    }

    for (const nodeType of template.nodeClassTypes) {
      if (q.includes(nodeType.toLowerCase())) {
        score += 8;
      }
    }

    for (const model of template.modelsUsed) {
      const modelBase = model.split('/').pop()?.split('.')[0]?.toLowerCase() ?? '';
      if (modelBase && q.includes(modelBase)) {
        score += 7;
      }
    }

    const nameWords = template.name.toLowerCase().split(/\s+/);
    const descWords = template.description.toLowerCase().split(/\s+/);
    const queryWords = q.split(/\s+/);
    for (const queryWord of queryWords) {
      if (queryWord.length < 3) continue;
      if (nameWords.some((word) => word.includes(queryWord) || queryWord.includes(word))) {
        score += 3;
      }
      if (descWords.some((word) => word.includes(queryWord) || queryWord.includes(word))) {
        score += 1;
      }
    }

    if (q.includes('flux') && template.nodeClassTypes.some((n) => n.includes('UNET') || n.includes('DualCLIP'))) {
      score += 6;
    }
    if (q.includes('sdxl') && template.modelsUsed.some((m) => m.toLowerCase().includes('xl'))) {
      score += 6;
    }
    if ((q.includes('sd 1.5') || q.includes('sd1.5'))
      && template.modelsUsed.some((m) => m.toLowerCase().includes('v1-5') || m.toLowerCase().includes('1.5'))) {
      score += 6;
    }

    return { template, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((entry) => entry.template);
}

/**
 * Build the full library reference section for system prompt injection.
 */
export function buildWorkflowReferenceSection(
  query: string,
  maxRefs = 2,
): string {
  const refs = findRelevantReferences(query, maxRefs);
  if (refs.length === 0) {
    return '';
  }

  const sections = refs.map((ref) => buildTemplateSummary(ref)).join('\n\n---\n\n');
  return `

## Reference Workflows from User's Library

The user has saved these proven workflows. Study their architecture, node choices, model selections, and parameter values. Use them as reference patterns when building the new workflow.

${sections}

**Instructions:** Use these references to guide architectural decisions. If the request matches a saved workflow, replicate its proven structure. If combining multiple references, merge their patterns intelligently.
`;
}

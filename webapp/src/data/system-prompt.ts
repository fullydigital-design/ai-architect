import type { NodeSchema } from '../types/comfyui';
import type { ComfyUIWorkflow } from '../types/comfyui';
import { buildEnvironmentPromptFromComfyUI } from '../utils/build-environment-prompt';
import { buildWorkflowContext, type WorkflowContext } from '../services/workflow-serializer';
import {
  getModelCategoryLabel,
  getModelIntelligence,
  formatLiveNodeForPrompt,
  type InstalledModels,
  type LiveNodeSchema,
} from '../services/comfyui-backend';
import { buildWorkflowReferenceSection } from '../services/workflow-library';

const NODE_CONTEXT_INSTRUCTION = `
### Selected Node Guidance
When the user references selected nodes:
- Explain what each selected node does in plain language.
- Describe how the selected nodes connect and affect output quality.
- If asked to modify, return a complete updated workflow in \`json:workflow-api\`.
- Suggest safer or higher-quality alternatives when relevant.
`;

function normalizeInputType(type: string): string {
  if (type === 'STRING_MULTILINE') return 'STRING';
  return type;
}

function formatNodeForPrompt(node: NodeSchema): string {
  const inputs = node.inputs.map((input) => {
    const type = normalizeInputType(input.type);
    const isUiOnly = input.name === 'control_after_generate';
    let desc = `    - ${input.name}: ${type}${input.isWidget ? ' (widget)' : ' (connection)'}`;
    if (isUiOnly) desc += ' [NOT IN API - skip this]';
    if (!input.isRequired) desc += ' [optional]';
    if (input.default !== undefined) desc += ` [default: ${JSON.stringify(input.default)}]`;
    if (input.options) desc += ` [options: ${input.options.join(', ')}]`;
    if (input.min !== undefined || input.max !== undefined) {
      desc += ` [range: ${input.min ?? ''}..${input.max ?? ''}]`;
    }
    return desc;
  }).join('\n');

  const outputs = node.outputs.map((output) => (
    `    - slot ${output.slotIndex}: ${output.name} (${output.type})`
  )).join('\n');

  let header = `### ${node.name}`;
  if (node.source === 'custom' && node.customNodePack) {
    header += ` [Custom: ${node.customNodePack}]`;
  }

  const descriptionLine = node.description ? `  Description: ${node.description}\n` : '';

  return `${header}
  Category: ${node.category}
${descriptionLine}  Inputs:
${inputs || '    - (none)'}
  Outputs:
${outputs || '    - (none)'}`;
}

function buildWorkflowModificationContext(workflowContext: WorkflowContext): string {
  const compactHint = workflowContext.usedCompactJson
    ? '\nNOTE: CURRENT WORKFLOW JSON below is compacted for token limits. Preserve behavior and structure as much as possible.'
    : '';

  return `
## MODIFICATION MODE - READ CAREFULLY

You are modifying an EXISTING workflow, not building from scratch.
The current workflow is provided below in Graph/UI JSON for reference.
Your response must still be API format.

### ABSOLUTE RULES FOR MODIFICATION
1. Preserve existing node IDs for all nodes that remain.
2. Only add, remove, or reconnect what the user asked for.
3. Preserve unchanged node behavior and parameter values.
4. New nodes should use new sequential string IDs starting from ${workflowContext.nextNodeId}.
5. Return the COMPLETE modified workflow in a \`\`\`json:workflow-api block.
6. Use named inputs only. Do not output Graph/UI fields like \`nodes\`, \`links\`, or positions.

### STRUCTURAL SUMMARY OF CURRENT WORKFLOW:
${compactHint}

${workflowContext.structuralSummary}

## CURRENT WORKFLOW JSON (reference only):
\`\`\`json
${workflowContext.workflowJson}
\`\`\`
`;
}

export function buildModelLibraryPrompt(
  selectedCategories: Set<string>,
  inventory: InstalledModels | null,
): string {
  if (!inventory || selectedCategories.size === 0) return '';

  const sections: string[] = [];

  for (const category of [...selectedCategories].sort((a, b) => a.localeCompare(b))) {
    const files = inventory[category];
    if (!Array.isArray(files) || files.length === 0) continue;

    const entries = files
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .map((filename) => {
        const intelligence = getModelIntelligence(filename, category);
        const parts: string[] = [];
        if (intelligence.description) parts.push(intelligence.description);
        if (intelligence.resolution) parts.push(intelligence.resolution);
        if (intelligence.cfgRange) parts.push(`cfg ${intelligence.cfgRange}`);
        const suffix = parts.length > 0 ? ` - ${parts.join(', ')}` : '';
        return `  "${filename}"${suffix}`;
      });

    sections.push(`${getModelCategoryLabel(category)}:\n${entries.join('\n')}`);
  }

  if (sections.length === 0) return '';

  return `
### Installed Models (from user's ComfyUI)
IMPORTANT: Use these EXACT filenames - they are confirmed installed.
When choosing models, match architecture to workflow type.

${sections.join('\n\n')}
`;
}

export async function buildSystemPrompt(
  nodeSchemas: NodeSchema[],
  currentWorkflow?: ComfyUIWorkflow,
  liveNodeSchemas?: LiveNodeSchema[] | null,
  liveSchemaMode: 'compact' | 'full' = 'compact',
): Promise<string> {
  return buildSystemPromptWithPacks(nodeSchemas, '', currentWorkflow, '', false, liveNodeSchemas, liveSchemaMode);
}

/**
 * Build the full system prompt, optionally including a dynamic section
 * for the user's pinned custom node packs.
 */
export async function buildSystemPromptWithPacks(
  nodeSchemas: NodeSchema[],
  packsSection: string,
  currentWorkflow?: ComfyUIWorkflow,
  modelLibrarySection = '',
  hasSelectedNodes = false,
  liveNodeSchemas?: LiveNodeSchema[] | null,
  liveSchemaMode: 'compact' | 'full' = 'compact',
  userQuery?: string,
  includeLibraryReferences = true,
): Promise<string> {
  const { prompt: liveEnvironmentSection, environment } = await buildEnvironmentPromptFromComfyUI(undefined, {
    includeModelLists: false,
  });
  const workflowSection = currentWorkflow?.nodes?.length
    ? buildWorkflowModificationContext(buildWorkflowContext(currentWorkflow))
    : '';

  console.log('[Environment] Injected into system prompt:', {
    checkpoints: environment.checkpoints.length,
    loras: environment.loras.length,
    unets: environment.unets.length,
    clips: environment.clips.length,
    totalNodes: environment.totalNodes,
  });

  const hasLiveNodeSchemas = Array.isArray(liveNodeSchemas);
  const availableNodeCount = hasLiveNodeSchemas ? liveNodeSchemas.length : nodeSchemas.length;
  const libraryReferenceSection = includeLibraryReferences && userQuery
    ? buildWorkflowReferenceSection(userQuery, 2)
    : '';
  const availableNodeTypesSection = hasLiveNodeSchemas
    ? (liveSchemaMode === 'full'
      ? liveNodeSchemas.map((schema) => formatNodeForPrompt({
        name: schema.class_type,
        displayName: schema.display_name,
        category: schema.category,
        description: schema.description,
        inputs: schema.inputs,
        outputs: schema.outputs,
        source: 'custom',
      })).join('\n\n')
      : liveNodeSchemas.map((schema) => formatLiveNodeForPrompt(schema)).join(''))
    : nodeSchemas.map((node) => formatNodeForPrompt(node)).join('\n\n');

  const prompt = `You are ComfyUI Workflow Architect, an expert AI that generates valid, production-ready ComfyUI workflows from natural language descriptions.

## Your Role
- Generate complete, valid ComfyUI workflows in API format
- Explain your design decisions and node choices
- Suggest optimal settings for the requested use case
- List any custom nodes that need to be installed
- Handle user modifications to existing workflows

## CRITICAL RULES - FOLLOW EXACTLY

### Connection Rules
1. Connections are strictly TYPE-MATCHED. A MODEL output can only connect to a MODEL input.
2. Every required connection input on every node must be connected.
3. Use exact output slot indices from schema. Never guess.
4. Before returning, verify all required connection inputs are satisfied.

### Widget Value Rules
1. Use exact input names as keys in the \`inputs\` object.
2. For COMBO inputs, use only allowed options.
3. For seed inputs, use a random large integer (12-16 digits).
4. Respect numeric bounds from schema (min/max/default).
5. Optional inputs may be omitted.

### API Format Rules
1. Node IDs are STRING keys (e.g. "1", "2", "3"). Use sequential integers as strings.
2. Connection inputs are [source_node_id_string, output_slot_index_integer] tuples.
   Example: "model": ["1", 0] means connect to node "1" output slot 0.
3. Widget inputs are direct values matching their types.
4. Do not include hidden system inputs: unique_id, extra_pnginfo, prompt.
5. Do not include "control_after_generate" - it is a UI-only widget, not an API input.
6. Include all required inputs. Missing required connections means broken workflow.
7. Optional inputs can be omitted to use defaults.
8. The "_meta" field is optional and only used for display titles.
9. Always include all widget inputs for every node. If unsure, use schema defaults.

### Workflow Modification Rules
When modifying an existing workflow (when current workflow JSON appears in the conversation):
1. Preserve all existing class_type values EXACTLY. Never replace a custom node with a "standard equivalent".
2. SwarmKSampler must stay SwarmKSampler (not KSampler).
3. SwarmClipTextEncodeAdvanced must stay SwarmClipTextEncodeAdvanced (not CLIPTextEncode).
4. SwarmSaveImageWS must stay SwarmSaveImageWS (not SaveImage).
5. Preserve node IDs for all unchanged nodes.
6. Preserve unchanged connections and widget values.
7. Only change what the user requested.
8. New node IDs must be higher than the current maximum node ID.
9. New link IDs must be higher than the current maximum link ID.

### Model Filename & Sample Data Rules
1. Prefer installed model filenames when they match the user's request.
2. If the user requests an architecture whose models are missing, still generate the full workflow using canonical filenames.
3. Never refuse generation because models are missing.
4. Use realistic, widely available defaults.
5. Default model filenames by architecture:
   - SD 1.5 Checkpoint: "v1-5-pruned-emaonly.safetensors" or "dreamshaper_8.safetensors"
   - SDXL Checkpoint: "sd_xl_base_1.0.safetensors" or "dreamshaperXL_v21TurboDPMSDE.safetensors"
   - SDXL Refiner: "sd_xl_refiner_1.0.safetensors"
   - FLUX Checkpoint: "flux1-dev.safetensors"
   - FLUX CLIP: "t5xxl_fp8_e4m3fn.safetensors" + "clip_l.safetensors"
   - VAE (SD1.5/SDXL): "vae-ft-mse-840000-ema-pruned.safetensors" or "sdxl_vae.safetensors"
   - VAE (FLUX): "ae.safetensors"
   - LoRA: "your_lora.safetensors"
   - ControlNet SD1.5: "control_v11p_sd15_canny.pth", "control_v11f1p_sd15_depth.pth", "control_v11p_sd15_openpose.pth"
   - ControlNet SDXL: "diffusers_xl_canny_mid.safetensors"
   - Upscale model: "RealESRGAN_x4plus.pth" or "4x-UltraSharp.pth"
   - SAM: "sam_vit_b_01ec64.pth"
   - BBOX detector: "bbox/face_yolov8m.pt"
   - IPAdapter SD1.5: "ip-adapter-plus_sd15.safetensors"
   - IPAdapter SDXL: "ip-adapter-plus_sdxl_vit-h.safetensors"
   - CLIP Vision: "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"
   - AnimateDiff: "v3_sd15_mm.ckpt"
6. For LoadImage nodes, use "example.png" as filename.
7. Explain which models should be downloaded/replaced in "Recommended Models".

### Node Input Structure (API Format)
Each node is identified by a string ID and has:
- "class_type": exact node class name
- "inputs": object with named key-value pairs:
  - Widget inputs: direct values (for example "seed": 8566257)
  - Connection inputs: [source_node_id, source_output_slot]

Connection tuples use STRING node IDs and INTEGER output slot indices.
Example: "model": ["4", 0].

### Output Format
Always respond with this exact structure. The workflow JSON must be in a code block tagged with \`json:workflow-api\`:

\`\`\`json:workflow-api
{
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "v1-5-pruned-emaonly.safetensors"
    },
    "_meta": { "title": "Load Checkpoint" }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "beautiful sunset over mountains, 8k, masterpiece",
      "clip": ["1", 1]
    },
    "_meta": { "title": "Positive Prompt" }
  },
  "3": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "ugly, blurry, low quality",
      "clip": ["1", 1]
    },
    "_meta": { "title": "Negative Prompt" }
  },
  "4": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    }
  },
  "5": {
    "class_type": "KSampler",
    "inputs": {
      "model": ["1", 0],
      "positive": ["2", 0],
      "negative": ["3", 0],
      "latent_image": ["4", 0],
      "seed": 156680208700286,
      "steps": 20,
      "cfg": 7.0,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1.0
    }
  },
  "6": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["5", 0],
      "vae": ["1", 2]
    }
  },
  "7": {
    "class_type": "SaveImage",
    "inputs": {
      "images": ["6", 0],
      "filename_prefix": "ComfyUI"
    }
  }
}
\`\`\`

After the workflow JSON, ALWAYS include these 4 structured sections. Use markdown tables and bold key terms. Be specific - reference actual node names, IDs, values, and filenames from the workflow you just generated.

**🔷 Full Pipeline Summary**

| Stage | Node | Purpose | Key Settings |
|---|---|---|---|
| 1 | \`NodeType\` **#ID** | What this stage does | key param value, another param value |
| 2 | \`NodeType\` **#ID** + \`NodeType\` **#ID** | What this stage does | denoise 0.30, steps 25 |
| ... | ... | ... | ... |

List EVERY stage of the pipeline from input to output. Group tightly-coupled nodes on the same row (for example "KSampler #15 + VAEDecode #17"). Include the actual node class_type in backtick code and the **#ID** number. Key Settings should list the 2-3 most important parameter values for that stage.

**🔶 Why This Architecture Wins**

| Benefit | Explanation |
|---|---|
| **Short benefit name** | 1-2 sentence explanation of why this design choice matters |
| **Another benefit** | Why this is better than alternatives |

Give 3-5 rows explaining the architectural decisions. Bold the benefit name. Reference specific nodes/stages. Examples: "**FLUX structure**", "**Gemini polish**", "**Upscale quality**", "**LoRA consistency**", "**Two-pass refinement**".

**⚙️ Tuning Tips**

| Parameter | Current | Try This For... |
|---|---|---|
| Stage N param_name | \`current_value\` | \`alt_value_1\` = effect, \`alt_value_2\` = different effect |
| Stage N param_name | \`current_value\` | \`alt_value_1\` = effect description |

Give 3-6 rows of the most impactful parameters the user should experiment with. Show the current value in backtick code, and 2-3 alternative values with what effect they produce. Reference which stage the parameter belongs to.

**🔧 Required Models**

| Model | File | Used In |
|---|---|---|
| Model display name | \`subfolder/filename.safetensors\` | Stage N description |
| Another model | \`subfolder/filename.safetensors\` | Stage N & M |

List ALL models referenced in the workflow. Use the actual filename from widget values in backtick code. Include the subfolder path if relevant (for example \`Flux1/flux1-dev-fp8.safetensors\`). "Used In" should reference stage numbers and a brief purpose.

If custom node packs are required, add a final note:
**Required Packs:** {{pack:pack-slug-1}}, {{pack:pack-slug-2}}

## Pack Recommendation Tags

When recommending or mentioning custom node packs (workflow explanations, brainstorming, or pack suggestions), wrap each pack name in \`{{pack:slug}}\` using lowercase GitHub-style slugs.

Examples:
- "I recommend {{pack:comfyui-ipadapter-plus}} for image reference conditioning."
- "Use {{pack:comfyui-controlnet-aux}} and {{pack:comfyui-advanced-controlnet}} for ControlNet workflows."
- "{{pack:was-node-suite-comfyui}} provides useful image processing utilities."
- "For video workflows, use {{pack:comfyui-animatediff-evolved}} and {{pack:comfyui-videohelperSuite}}."
- "{{pack:comfyui-impact-pack}} adds detection and segmentation helpers."
- "{{pack:rgthree-comfy}} provides workflow utility nodes."
- "{{pack:comfyui-kjnodes}} has many helper nodes for FLUX and general workflows."

Always use this syntax when naming specific custom node packs.

${libraryReferenceSection}

## Available Node Types (${availableNodeCount} nodes)

${availableNodeTypesSection}
${packsSection}
${modelLibrarySection}
${liveEnvironmentSection}
${hasSelectedNodes ? NODE_CONTEXT_INSTRUCTION : ''}
## Common Workflow Patterns

### SD 1.5 Basic (API format)
CheckpointLoaderSimple("1") -> model to KSampler("5"), clip to CLIPTextEncode("2","3"), vae to VAEDecode("6")
EmptyLatentImage("4") -> latent_image to KSampler("5")
KSampler("5") -> samples to VAEDecode("6") -> images to SaveImage("7")
Connection notation: "model": ["1", 0]

### SDXL Basic (API format)
CheckpointLoaderSimple("1") -> model/clip/vae fan-out
CLIPTextEncodeSDXL("2","3") -> KSampler("5") positive/negative
EmptyLatentImage("4") -> KSampler("5") -> VAEDecode("6") -> SaveImage("7")

### FLUX Basic (API format)
UNETLoader("1") -> model["1",0] to KSampler
DualCLIPLoader("2") type="flux" -> clip["2",0] to CLIPTextEncode("3")
CLIPTextEncode("3") -> positive["3",0] to KSampler("5")
CLIPTextEncode("4") -> negative["4",0] to KSampler("5")
EmptyLatentImage("6") -> latent_image["6",0] to KSampler("5")
KSampler("5") -> samples["5",0] to VAEDecode("7")
VAELoader("8") -> vae["8",0] to VAEDecode("7")
VAEDecode("7") -> images["7",0] to SaveImage("9")

### ControlNet Addition
ControlNetLoader -> ControlNetApplyAdvanced
LoadImage -> preprocessor -> ControlNetApplyAdvanced
ControlNetApplyAdvanced outputs modified positive and negative conditioning

### LoRA Addition
CheckpointLoaderSimple -> LoraLoader -> (MODEL to KSampler, CLIP to CLIPTextEncode)

### Upscale (2-pass)
VAEDecode -> ImageUpscaleWithModel -> VAEEncode -> second KSampler(denoise 0.3-0.5) -> VAEDecode -> SaveImage

### IP-Adapter
IPAdapterUnifiedLoader(model) -> IPAdapterAdvanced(model, ipadapter, image) -> KSampler
LoadImage -> IPAdapterAdvanced

### Inpainting
LoadImage(image) + LoadImage(mask) -> VAEEncodeForInpaint -> KSampler -> VAEDecode -> SaveImage

${workflowSection}`;

  console.log('[SystemPrompt] Final prompt length:', prompt.length, {
    nodeCount: availableNodeCount,
    liveSchemas: hasLiveNodeSchemas,
  });

  return prompt;
}

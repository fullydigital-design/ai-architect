import type { WorkflowAnalysis, DetectedPack } from '../services/workflow-analyzer';
import type { WorkflowRecommendation } from '../services/brainstorm-parser';

// ===== Node Schema Types =====

export interface NodeInput {
  name: string;
  type: string;
  isRequired: boolean;
  default?: any;
  min?: number;
  max?: number;
  options?: string[];
  tooltip?: string;
  /** ComfyUI graph-only companion widget follows this widget in widgets_values */
  hasControlAfterGenerateWidget?: boolean;
  /** ComfyUI image upload companion widget follows this widget in widgets_values */
  hasUploadWidget?: boolean;
  isWidget: boolean; // true if it's a widget (value) input, false if it's a connection input
}

export interface NodeOutput {
  name: string;
  type: string;
  slotIndex: number;
}

export interface NodeSchema {
  name: string;
  displayName: string;
  category: string;
  description: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  source: 'core' | 'custom';
  customNodePack?: string;
  githubUrl?: string;
}

// ===== ComfyUI Workflow Types (Graph/UI Format) =====

export interface ComfyUINodeInput {
  name: string;
  type: string;
  link: number | null;
}

export interface ComfyUINodeOutput {
  name: string;
  type: string;
  links: number[] | null;
  slot_index: number;
}

export interface ComfyUINode {
  id: number;
  type: string;
  pos: [number, number];
  size: [number, number];
  flags: Record<string, any>;
  order: number;
  mode: number;
  inputs?: ComfyUINodeInput[];
  outputs?: ComfyUINodeOutput[];
  widgets_values?: any[];
  properties?: Record<string, any>;
  title?: string;
  color?: string;
  bgcolor?: string;
}

export interface ComfyUIGroup {
  title: string;
  bounding: [number, number, number, number]; // [x, y, width, height]
  color?: string;
  font_size?: number;
  flags?: Record<string, any>;
}

// [link_id, source_node_id, source_slot, target_node_id, target_slot, type]
export type ComfyUILink = [number, number, number, number, number, string];

export interface ComfyUIWorkflow {
  last_node_id: number;
  last_link_id: number;
  nodes: ComfyUINode[];
  links: ComfyUILink[];
  groups: ComfyUIGroup[];
  config: Record<string, any>;
  extra: Record<string, any>;
  version: number;
}

// ===== ComfyUI Workflow Types (API Format) =====

/**
 * A single node in API format.
 * Connection inputs are [sourceNodeId, sourceOutputSlot] tuples.
 * Widget inputs are named key-value pairs (no positional ambiguity).
 */
export interface ComfyUIAPINode {
  class_type: string;
  inputs: Record<string, any>;
  /** Optional metadata used by the graph converter/UI only. */
  _meta?: {
    title?: string;
  };
}

/**
 * Full workflow in API format.
 * Keys are string node IDs (for example "1", "2", "3").
 */
export type ComfyUIAPIWorkflow = Record<string, ComfyUIAPINode>;

// ===== API Types =====

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  workflow?: ComfyUIWorkflow;
  requiredNodes?: RequiredNode[];
  recommendedModels?: ModelRecommendation[];
  validationResult?: ValidationResult;
  isStreaming?: boolean;
  /** Phase 1: Rich workflow analysis attached to import summary messages */
  workflowAnalysis?: WorkflowAnalysis;
  /** Phase 2: Detected packs for auto-pin UI */
  detectedPacks?: DetectedPack[];
  /** Brainstorm planner recommendations parsed from json:recommended-nodes blocks */
  recommendation?: WorkflowRecommendation;
}

export interface RequiredNode {
  name: string;
  installCommand: string;
  githubUrl: string;
  reason: string;
}

export interface ModelRecommendation {
  nodeId: number;
  nodeType: string;
  placeholder: string;
  recommended: string[];
  downloadUrl?: string;
}

// ===== Validation Types =====

export interface ValidationError {
  type: 'missing_connection' | 'type_mismatch' | 'invalid_slot' | 'unknown_node' | 'circular_dependency' | 'duplicate_id' | 'invalid_widget_value';
  nodeId: number;
  nodeName: string;
  details: string;
}

export interface ValidationWarning {
  type: 'missing_optional' | 'unusual_value' | 'deprecated_node' | 'unknown_custom_node' | 'missing_model' | 'widget_out_of_range';
  nodeId: number;
  details: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ===== Settings =====

export interface APIKeys {
  openai: string;
  anthropic: string;
  google: string;
  openrouter: string;
}

export interface CustomModel {
  id: string;
  name: string;
  provider: AIProvider;
  contextLength?: number;
}

export interface ProviderSettings {
  keys: APIKeys;
  selectedModel: string;
  customModels: CustomModel[];
  /** Optional GitHub Personal Access Token - boosts rate limit from 60 to 5,000 req/hr */
  githubToken?: string;
  /** Local ComfyUI backend URL (e.g. http://127.0.0.1:8188) */
  comfyuiUrl?: string;
  /** Optional HuggingFace token for gated/private model downloads */
  huggingfaceApiKey?: string;
  /** Optional CivitAI API key for direct model downloads */
  civitaiApiKey?: string;
}

// ===== Phase 2: Model Search Types =====

export interface CivitAIModelResult {
  id: number;
  name: string;
  type: string;
  creator: { username: string };
  stats: {
    downloadCount: number;
    favoriteCount: number;
    rating: number;
    ratingCount: number;
  };
  modelVersions: CivitAIModelVersion[];
  tags: string[];
  nsfw: boolean;
}

export interface CivitAIModelVersion {
  id: number;
  name: string;
  baseModel: string;
  files: CivitAIFile[];
  images: { url: string; width: number; height: number; nsfw: string }[];
  downloadUrl: string;
}

export interface CivitAIFile {
  id: number;
  name: string;
  sizeKB: number;
  type: string;
  downloadUrl: string;
}

export interface HuggingFaceModelResult {
  modelId: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag?: string;
}

export interface ModelSearchResult {
  source: 'civitai' | 'huggingface';
  id: string;
  name: string;
  author: string;
  type: string;
  baseModel?: string;
  downloads: number;
  rating?: number;
  previewUrl?: string;
  pageUrl: string;
  downloadUrl?: string;
  fileSizeGB?: number;
  tags: string[];
}

// ===== Phase 2: ComfyUI-Manager Types =====

export type ManagerNodeStatus = 'installed' | 'not-installed' | 'update-available' | 'disabled' | 'installing' | 'unknown';

// ===== Phase 5: App Preferences =====

export interface AppPreferences {
  /** Theme: only dark for now, but future-proofed */
  theme: 'dark';
  /** Auto-validate workflows after AI generation */
  autoValidate: boolean;
  /** Deprecated: kept for backward compatibility with stored settings */
  autoModifyMode: boolean;
  /** Show node widget values in the graph */
  showWidgetValues: boolean;
  /** Enable workflow edit animations */
  graphAnimations: boolean;
  /** Single chat mode */
  defaultChatMode: 'architect';
  /** History page size */
  historyPageSize: number;
  /** Auto-save workflow to localStorage */
  autoSaveWorkflow: boolean;
  /** Show keyboard shortcut hints in sidebar */
  showShortcutHints: boolean;
  /** ComfyUI image preview quality */
  imagePreviewSize: 'small' | 'medium' | 'large';
  /** Gallery columns override (0 = auto) */
  galleryColumns: number;
  /** NSFW filter for model search */
  nsfwFilter: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'dark',
  autoValidate: true,
  autoModifyMode: false,
  showWidgetValues: true,
  graphAnimations: true,
  defaultChatMode: 'architect',
  historyPageSize: 50,
  autoSaveWorkflow: true,
  showShortcutHints: true,
  imagePreviewSize: 'medium',
  galleryColumns: 0,
  nsfwFilter: true,
};

// ===== Workflow Library Types =====

export interface WorkflowTemplate {
  id: string; // unique slug, e.g. "flux-upscale-2pass"
  name: string; // "FLUX Dev + 2-Pass Upscale"
  description: string; // short summary of what it does
  tags: string[]; // ["flux", "upscale", "txt2img", "2-pass"]
  category: WorkflowCategory; // primary category
  workflow: ComfyUIWorkflow; // the actual ComfyUI workflow JSON
  pipelineStages?: PipelineStage[]; // extracted stage summary (optional, auto-generated)
  nodeClassTypes: string[]; // auto-extracted: ["KSampler", "VAEDecode", ...]
  modelsUsed: string[]; // auto-extracted: ["flux1-dev-fp8.safetensors", ...]
  isFragment: boolean; // false = full workflow, true = partial pipeline
  fragmentType?: FragmentType; // only if isFragment
  createdAt: number; // Date.now()
  updatedAt: number; // Date.now()
}

export type WorkflowCategory =
  | 'txt2img'
  | 'img2img'
  | 'upscale'
  | 'controlnet'
  | 'inpaint'
  | 'video'
  | 'ipadapter'
  | 'lora'
  | 'face-detailer'
  | 'custom';

export type FragmentType =
  | 'generation' // txt2img core (checkpoint -> sampler -> decode)
  | 'conditioning' // controlnet / ipadapter / lora chain
  | 'upscaling' // upscale -> refine chain
  | 'postprocess' // face fix, color correct, etc.
  | 'input' // image/mask loaders
  | 'output' // save/preview nodes
  | 'custom';

export interface PipelineStage {
  order: number;
  nodeTypes: string[]; // class_types in this stage
  nodeIds: number[]; // node IDs in this stage
  purpose: string; // "Base generation with FLUX"
  keySettings?: string; // "steps 25, cfg 1.0, euler/simple"
}


import { Suspense, lazy, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { ReactFlowProvider } from 'reactflow';
import { GripVertical } from 'lucide-react';
import type {
  Message,
  ProviderSettings,
  ComfyUIWorkflow,
  RequiredNode,
  ValidationResult as LegacyValidationResult,
  AppPreferences,
  // WorkflowTemplate, // REMOVED: Templates feature
} from '../types/comfyui';
import { DEFAULT_PREFERENCES } from '../types/comfyui';
import { callAI, getAPIKeyForModel, PROVIDER_INFO, getAllModels, getProviderForModel } from '../services/ai-provider';
import { parseAIResponse, extractMarkdownSections, detectRequiredNodes } from '../services/workflow-parser';
import { parseOperationsFromAIOutput, getOperationFormatReference, type ModificationResult } from '../services/workflow-operations';
import { executeOperations } from '../services/workflow-operation-executor';
import { summarizeWorkflow } from '../services/workflow-summarizer';
import { getModificationExamples } from '../services/workflow-modification-examples';
import { detectRequestMode } from '../services/workflow-modification-utils';
import {
  DEFAULT_VALIDATION_OPTIONS,
  quickValidate,
  validateWorkflow as validateWorkflowLegacy,
  validateWorkflowAgainstSchema,
  validateWorkflowPipeline,
  type PipelineValidationOptions,
  type PipelineValidationResult,
  type SchemaValidationError,
  type SchemaValidationResult,
} from '../services/workflow-validator';
import { autoLayoutWorkflow, resolveOverlaps } from '../utils/auto-layout';
import { readWorkflowFile, enrichWorkflowNodes, detectWorkflowFormat, convertAPIToGraph } from '../utils/workflow-import';
import { ALL_NODES } from '../data/node-registry';
import { buildModelLibraryPrompt, buildSystemPromptWithPacks } from '../data/system-prompt';
import { buildBrainstormSystemPrompt } from '../data/brainstorm-system-prompt';
import {
  buildNodeExtractionPrompt,
  parseRecommendedNodes,
  stripRecommendationBlock,
  type RecommendedNode,
  type WorkflowRecommendation,
  validateRecommendedNodes,
} from '../services/brainstorm-parser';
import { buildPacksPromptSection } from '../services/pack-suggester';
import { getTypeSystemCheatSheet, getWorkflowPatterns } from '../services/workflow-patterns';
import {
  fetchCustomNodeRegistry,
  detectInstalledPacks,
  type CustomNodePackInfo,
} from '../data/custom-node-registry';
import {
  FILTER_PRESETS,
  classifyNodesByPack,
  inferPresetId,
  getPackTopNodes,
  getOptimizedSchemas,
  presetToConfig,
  resolveModelContextLimit,
  type FilterConfig,
  type FilterPresetId,
} from '../services/node-schema-filter';
import {
  buildSelectedLiveNodeMap,
  classifyNodesIntoPacks,
  countSelectedNodesForPack,
  createNodeSelectionFromRecommendation,
  estimateSchemaTokens,
  getSelectedPackIds,
  loadSelectorState,
  pruneStalePackEntries,
  sanitizeZombiePackStates,
  saveSelectorState,
  type ClassifiedPack,
  type SelectorState,
} from '../services/node-schema-selector';
import { useNodeLibrary, type PinnedNodePack } from '../hooks/useNodeLibrary';
import { useModelLibrary } from '../hooks/useModelLibrary';
import { useTokenUsage } from '../hooks/useTokenUsage';
import { useComfyWebSocket } from '../hooks/useComfyWebSocket';
import { useWorkflowHistory } from '../hooks/useWorkflowHistory';
import { useManagerAPI } from '../hooks/useManagerAPI';
import { useComfyUIStatus } from '../hooks/useComfyUIStatus';
import { useTheme } from '../hooks/useTheme';
import { learnPackSchemas, getLearnedPackIds, getLearnedSchemas, clearLearnedSchemas as clearLearnedSchemasCache } from '../services/schema-fetcher';
import { analyzeWorkflow, formatAnalysisSummary } from '../services/workflow-analyzer';
import type { WorkflowAnalysis } from '../services/workflow-analyzer';
import type { DetectedPack } from '../services/workflow-analyzer';
import { getObjectInfo } from '../services/comfyui-object-info-cache';
import {
  buildNodeAvailabilitySummary,
  buildSchemaDrawerSection,
  convertGraphToAPI,
  fetchAndCacheObjectInfo,
  getCacheStatus,
  getLiveNodeCache,
  getRawObjectInfo,
  type LiveNodeCache,
} from '../services/comfyui-backend';
import { executeWorkflow, interruptExecution, buildDebugPrompt, type ExecutionProgress, type ExecutionResult } from '../services/comfyui-execution';
import { diffWorkflows, formatDiffMarkdown } from '../services/workflow-diff';
import { attemptIdRecovery, detectIdRewrite, mergeWorkflows, type MergeReport } from '../services/workflow-merge';
import { extractWorkflowMetadata } from '../services/workflow-metadata-extractor';
import { injectWorkflowNote } from '../services/workflow-note-injector';
import { sanitizeWorkflow } from '../services/workflow-sanitizer';
import {
  listComfyUIWorkflows,
  loadComfyUIWorkflow,
  saveComfyUIWorkflow,
} from '../services/comfyui-workflow-sync';
import { AppHeader } from './components/workflow-architect/AppHeader';
import { ChatPanel } from './components/workflow-architect/ChatPanel';
import { SchemaDrawerPanel } from './components/workflow-architect/SchemaDrawerPanel';
import { WorkflowVisualizer } from './components/workflow-architect/WorkflowVisualizer';
import { TokenUsageHUD } from './components/workflow-architect/TokenUsageHUD';
import { WorkflowActions } from './components/workflow-architect/WorkflowActions';
import { ProviderConfig } from './components/workflow-architect/ProviderConfig';
import { ExecutionPanel } from './components/workflow-architect/ExecutionPanel';
import { ExperimentPanel } from './components/workflow-architect/ExperimentPanel';
import { MergeWizardPanel } from './components/workflow-merger/MergeWizardPanel';
import { ValidationReportPanel } from './components/validation-report/ValidationReportPanel';
import { ValidationBadge } from './components/validation-report/ValidationBadge';
import { ValidationSettingsDropdown } from './components/validation-report/ValidationSettingsDropdown';
import { ModificationReportPanel } from './components/modification-report/ModificationReportPanel';
import { ValidationPanel } from './components/workflow-architect/ValidationPanel';
import CommandCenter from './components/CommandCenter';

const MAX_SELF_CORRECTION_RETRIES = 2;
const EMPTY_DETECTED_PACKS: DetectedPack[] = [];
const LIVE_NODE_CACHE_FRESH_MS = 60 * 60 * 1000;
// Max tokens allowed for schema injection. If 'full' mode would exceed this,
// auto-downgrade to 'compact' to prevent model context overflow.
const SCHEMA_TOKEN_HARD_CAP = 25_000;
type ChatMode = 'build' | 'brainstorm';
type WorkflowRecommendationWithAvailability = WorkflowRecommendation & {
  nodes: Array<RecommendedNode & { available: boolean }>;
};
const CustomNodesBrowser = lazy(() => import('./components/workflow-architect/CustomNodesBrowser').then((mod) => ({ default: mod.CustomNodesBrowser })));

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function buildCorrectionPrompt(workflow: ComfyUIWorkflow, validation: LegacyValidationResult): string {
  const errorList = validation.errors.map((e, i) => `${i + 1}. [${e.type}] ${e.details}`).join('\n');
  const warningList = validation.warnings.length > 0
    ? '\n\nWarnings:\n' + validation.warnings.map((w, i) => `${i + 1}. [${w.type}] ${w.details}`).join('\n')
    : '';

  return `The workflow you generated has ${validation.errors.length} validation error(s) that need to be fixed:

${errorList}${warningList}

Please fix ALL of the above issues and return the corrected workflow. Common fixes:
- "missing_connection": Make sure you add a link from an appropriate output to the disconnected input. For example, if PreviewImage's "images" (IMAGE) input is unconnected, connect the VAEDecode IMAGE output to it.
- "type_mismatch": Change the connection to use matching types (e.g., MODELâ†’MODEL, not MODELâ†’CLIP).
- "invalid_slot": Check the slot indices match the node schema exactly.

Here is the current (broken) workflow JSON for reference:
\`\`\`json
${JSON.stringify(workflow, null, 2)}
\`\`\`

Return the COMPLETE fixed workflow in a \`\`\`json:workflow-api block. Use named \`inputs\` and connection tuples [\"nodeId\", slot].`;
}

function buildSchemaFixPrompt(workflow: ComfyUIWorkflow, errors: SchemaValidationError[]): string {
  const summary = errors
    .map((error) => `- ${error.nodeType} node (ID: ${error.nodeId}) field "${error.field}": ${error.message}`)
    .join('\n');

  return `The workflow failed live ComfyUI schema validation with these errors:

${summary}

Please fix ONLY these errors with minimal surgical edits:
1. Type mismatches: reconnect to compatible source types.
2. Missing required links: add the required upstream nodes/connections.
3. Widget value issues: use valid enum values and in-range numeric values.
4. Preserve existing structure and node IDs for unchanged parts.

Return the complete corrected workflow in a \`\`\`json:workflow-api block.

Current workflow:
\`\`\`json
${JSON.stringify(workflow, null, 2)}
\`\`\``;
}

function isTextInputFocused(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || active.isContentEditable;
}

function isWorkflowModificationRequest(message: string): boolean {
  const text = message.toLowerCase();
  const mentionsCurrentWorkflow = text.includes('this workflow') || text.includes('current workflow');
  const structuralVerb = /(add|modify|change|remove|replace|insert|update|swap|connect|rewire|merge)/.test(text);
  return mentionsCurrentWorkflow || structuralVerb;
}

function getMaxNodeId(workflow: ComfyUIWorkflow): number {
  const maxNode = (workflow.nodes || []).reduce((max, node) => Math.max(max, node.id), 0);
  return Math.max(maxNode, workflow.last_node_id || 0);
}

function getMaxLinkId(workflow: ComfyUIWorkflow): number {
  const maxLink = (workflow.links || []).reduce((max, link) => Math.max(max, link[0]), 0);
  return Math.max(maxLink, workflow.last_link_id || 0);
}

function logModifyContextDiagnosis(workflow: ComfyUIWorkflow, systemPromptOverride?: string): void {
  const nodeIds = (workflow.nodes || []).map((node) => `${node.id}:${node.type}`).join(', ');
  console.log('[Modify] === MODIFICATION CONTEXT DIAGNOSIS ===');
  console.log('[Modify] Current workflow nodes:', workflow.nodes.length);
  console.log('[Modify] Current workflow links:', workflow.links.length);
  console.log('[Modify] Node IDs:', nodeIds);
  console.log('[Modify] Max node ID:', getMaxNodeId(workflow));
  console.log('[Modify] Max link ID:', getMaxLinkId(workflow));
  console.log('[Modify] System prompt length:', systemPromptOverride?.length, 'chars');
  const modifySection = systemPromptOverride?.indexOf('## CURRENT WORKFLOW') ?? -1;
  if (modifySection > -1) {
    console.log(
      '[Modify] Modification section preview:',
      systemPromptOverride?.substring(modifySection, modifySection + 500),
    );
  }
}

function logPostModificationDiagnosis(
  original: ComfyUIWorkflow,
  modified: ComfyUIWorkflow,
): { preserveRate: number; preservedCount: number; totalOriginal: number } {
  const oldIds = new Set((original.nodes || []).map((node) => node.id));
  const newIds = new Set((modified.nodes || []).map((node) => node.id));
  const oldNodeMap = new Map((original.nodes || []).map((node) => [node.id, node]));
  const newNodeMap = new Map((modified.nodes || []).map((node) => [node.id, node]));

  const preserved = [...oldIds].filter((id) => newIds.has(id));
  const removed = [...oldIds].filter((id) => !newIds.has(id));
  const added = [...newIds].filter((id) => !oldIds.has(id));

  console.log('[Modify] === POST-MODIFICATION DIAGNOSIS ===');
  console.log('[Modify] Original nodes:', oldIds.size, '-> New nodes:', newIds.size);

  const preserveRate = oldIds.size > 0 ? preserved.length / oldIds.size : 1;
  const preservePercent = Math.round(preserveRate * 100);
  console.log('[Modify] Preserved node IDs:', preserved.length, '/', oldIds.size, `(${preservePercent}%)`);
  console.log('[Modify] Removed nodes:', removed);
  console.log('[Modify] Added nodes:', added);

  let widgetChanges = 0;
  for (const id of preserved) {
    const oldNode = oldNodeMap.get(id);
    const newNode = newNodeMap.get(id);
    if (!oldNode || !newNode) continue;
    if (JSON.stringify(oldNode.widgets_values) !== JSON.stringify(newNode.widgets_values)) {
      widgetChanges += 1;
      console.log(`[Modify] Widget values changed on node ${id} (${oldNode.type})`);
    }
    if (oldNode.type !== newNode.type) {
      console.log(`[Modify] NODE TYPE CHANGED: ${id} was ${oldNode.type} -> now ${newNode.type}`);
    }
  }
  console.log('[Modify] Nodes with widget changes:', widgetChanges, '/', preserved.length);

  let positionDrifts = 0;
  for (const id of preserved) {
    const oldNode = oldNodeMap.get(id);
    const newNode = newNodeMap.get(id);
    if (!oldNode || !newNode) continue;
    const dx = Math.abs((oldNode.pos?.[0] || 0) - (newNode.pos?.[0] || 0));
    const dy = Math.abs((oldNode.pos?.[1] || 0) - (newNode.pos?.[1] || 0));
    if (dx > 10 || dy > 10) positionDrifts += 1;
  }
  console.log('[Modify] Nodes with position drift:', positionDrifts, '/', preserved.length);

  if (preserveRate < 0.5) {
    console.warn('[Modify] AI REWROTE MOST OF THE WORKFLOW - preserve rate below 50%');
  } else if (preserveRate < 0.8) {
    console.warn('[Modify] AI changed more than expected - preserve rate', `${preservePercent}%`);
  } else {
    console.log('[Modify] Good preservation rate:', `${preservePercent}%`);
  }

  return {
    preserveRate,
    preservedCount: preserved.length,
    totalOriginal: oldIds.size,
  };
}

function formatMergeSummary(report: MergeReport): string {
  return [
    report.addedNodes > 0 ? `+${report.addedNodes} node(s) added` : '',
    report.removedNodes > 0 ? `-${report.removedNodes} node(s) removed` : '',
    report.reconnectedLinks > 0 ? `~${report.reconnectedLinks} connection(s) changed` : '',
    `${report.preservedNodes} node(s) preserved`,
  ].filter(Boolean).join(' Â· ');
}

function cloneWorkflow(workflow: ComfyUIWorkflow): ComfyUIWorkflow {
  if (typeof structuredClone === 'function') {
    return structuredClone(workflow);
  }
  return JSON.parse(JSON.stringify(workflow)) as ComfyUIWorkflow;
}

function applyAutoWorkflowNote(
  workflow: ComfyUIWorkflow,
  workflowName?: string,
  description?: string,
): ComfyUIWorkflow {
  const cloned = cloneWorkflow(workflow);
  const metadata = extractWorkflowMetadata(cloned, workflowName, description);
  return injectWorkflowNote(cloned, metadata) as ComfyUIWorkflow;
}

export default function App() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode>('build');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [correctionStatus, setCorrectionStatus] = useState('');
  const [currentWorkflow, setCurrentWorkflow] = useState<ComfyUIWorkflow | null>(() => {
    try {
      const saved = localStorage.getItem('comfyui-architect-autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.nodes && Array.isArray(parsed.nodes)) {
          return parsed as ComfyUIWorkflow;
        }
      }
    } catch {}
    return null;
  });
  const [currentAnalysis, setCurrentAnalysis] = useState<WorkflowAnalysis | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [requiredNodes, setRequiredNodes] = useState<RequiredNode[]>([]);
  const [showNodesBrowser, setShowNodesBrowser] = useState(false);
  // const [showTemplateManager, setShowTemplateManager] = useState(false); // REMOVED: Templates feature
  const [showWorkflowMerger, setShowWorkflowMerger] = useState(false);
  // const [combineTemplates, setCombineTemplates] = useState<WorkflowTemplate[]>([]); // REMOVED: Templates feature
  // const [showCombineDialog, setShowCombineDialog] = useState(false); // REMOVED: Templates feature
  const [openChatTabSignal, setOpenChatTabSignal] = useState(0);
  const [useLibraryReferences, setUseLibraryReferences] = useState(() => {
    try {
      const saved = localStorage.getItem('workflow-library-ref-enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });
  // Phase 5: Experiment Engine
  const [showExperimentPanel, setShowExperimentPanel] = useState(false);
  const [lastSystemPrompt, setLastSystemPrompt] = useState('');
  const [lastSchemaSelectorAppliedAt, setLastSchemaSelectorAppliedAt] = useState(0);
  const [pendingContextMessage, setPendingContextMessage] = useState<string | null>(null);
  const [pendingBuildApplyMessage, setPendingBuildApplyMessage] = useState<string | null>(null);

  const handleToggleNodeSelection = useCallback((nodeId: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleClearNodeSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
  }, []);

  useEffect(() => {
    if (!currentWorkflow || selectedNodeIds.size === 0) return;
    const validIds = new Set(currentWorkflow.nodes.map((node) => String(node.id)));
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedNodeIds) {
      if (validIds.has(id)) {
        next.add(id);
      } else {
        changed = true;
      }
    }
    if (changed) {
      setSelectedNodeIds(next);
    }
  }, [currentWorkflow, selectedNodeIds]);

  const handleOpenExperiment = useCallback(() => {
    setShowExperimentPanel(true);
  }, []);

  const [settings, setSettings] = useState<ProviderSettings>(() => {
    const hfStandalone = localStorage.getItem('huggingface-api-key') || '';
    const civitaiStandalone = localStorage.getItem('civitai-api-key') || '';
    const saved = localStorage.getItem('comfyui-architect-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: if old format, convert to new
        if (parsed.provider && parsed.apiKey !== undefined && !parsed.keys) {
          return {
            keys: {
              openai: parsed.provider === 'openai' ? parsed.apiKey : '',
              anthropic: '',
              google: '',
              openrouter: parsed.provider === 'openrouter' ? parsed.apiKey : '',
            },
            selectedModel: parsed.model || 'gpt-5.2-2025-12-11',
            customModels: [],
          };
        }
        // New format â€” ensure all fields exist
        return {
          keys: {
            openai: parsed.keys?.openai || '',
            anthropic: parsed.keys?.anthropic || '',
            google: parsed.keys?.google || '',
            openrouter: parsed.keys?.openrouter || '',
            lmstudio: parsed.keys?.lmstudio || 'http://localhost:1234/v1',
          },
          selectedModel: parsed.selectedModel || 'gpt-5.2-2025-12-11',
          customModels: parsed.customModels || [],
          githubToken: parsed.githubToken || '',
          comfyuiUrl: parsed.comfyuiUrl || 'http://127.0.0.1:8188',
          huggingfaceApiKey: parsed.huggingfaceApiKey || hfStandalone,
          civitaiApiKey: parsed.civitaiApiKey || civitaiStandalone,
        };
      } catch {}
    }
    return {
      keys: { openai: '', anthropic: '', google: '', openrouter: '', lmstudio: 'http://localhost:1234/v1' },
      selectedModel: 'gpt-5.2-2025-12-11',
      customModels: [],
      githubToken: '',
      comfyuiUrl: 'http://127.0.0.1:8188',
      huggingfaceApiKey: hfStandalone,
      civitaiApiKey: civitaiStandalone,
    };
  });

  useEffect(() => {
    const migrationKey = 'comfyui-path-migration-2026-02-24';
    if (!localStorage.getItem(migrationKey)) {
      localStorage.removeItem('comfyui-architect-live-nodes');
      localStorage.removeItem('comfyui-manager-node-list');
      localStorage.removeItem('comfyui-manager-node-map');
      localStorage.setItem(migrationKey, 'done');
      console.log('[Migration] Cleared stale ComfyUI caches for Python 3.12 migration');
    }
  }, []);

  // Node library (pinned packs + manual context overrides)
  const nodeLibrary = useNodeLibrary();
  const modelLibrary = useModelLibrary();
  const { usage: sessionTokenUsage, addUsage: addTokenUsage, resetUsage: resetTokenUsage } = useTokenUsage();

  const trackTokenUsage = useCallback((
    modelId: string,
    usage: { inputTokens: number; outputTokens: number; totalTokens: number; estimated?: boolean } | null | undefined,
    inputChars: number,
    outputChars: number,
  ) => {
    const provider = getProviderForModel(modelId, settings.customModels);
    if (usage) {
      addTokenUsage({
        model: modelId,
        provider,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        estimated: usage.estimated,
      });
      return;
    }

    const estimatedInput = Math.max(0, Math.round(inputChars * 0.75));
    const estimatedOutput = Math.max(0, Math.round(outputChars * 0.75));
    addTokenUsage({
      model: modelId,
      provider,
      inputTokens: estimatedInput,
      outputTokens: estimatedOutput,
      totalTokens: estimatedInput + estimatedOutput,
      estimated: true,
    });
  }, [addTokenUsage, settings.customModels]);

  const [schemaFilterConfig, setSchemaFilterConfig] = useState<FilterConfig>(() => {
    const workflowSmartPreset = FILTER_PRESETS.find((preset) => preset.id === 'workflow-smart') || FILTER_PRESETS[1];
    const libraryPreset = FILTER_PRESETS.find((preset) => preset.id === nodeLibrary.contextFilterMode) || workflowSmartPreset;
    const saved = localStorage.getItem('fdp-schema-filter-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          mode?: FilterConfig['mode'];
          includeRelatedNodes?: boolean;
          compressSchemas?: boolean;
          selectedPackIds?: string[];
          manualPackAdditions?: string[];
          manualPackRemovals?: string[];
        };
        return {
          mode: parsed.mode || libraryPreset.mode,
          includeRelatedNodes: parsed.includeRelatedNodes ?? libraryPreset.includeRelatedNodes,
          compressSchemas: parsed.compressSchemas ?? true,
          selectedPackIds: new Set(parsed.selectedPackIds || []),
          manualPackAdditions: new Set(parsed.manualPackAdditions || nodeLibrary.manuallyAdded || []),
          manualPackRemovals: new Set(parsed.manualPackRemovals || nodeLibrary.manuallyRemoved || []),
        };
      } catch {
        // fall through to default
      }
    }
    const base = presetToConfig(libraryPreset);
    return {
      ...base,
      manualPackAdditions: new Set(nodeLibrary.manuallyAdded || []),
      manualPackRemovals: new Set(nodeLibrary.manuallyRemoved || []),
    };
  });

  const [schemaSelectorState, setSchemaSelectorState] = useState<SelectorState>(() => loadSelectorState());
  const [isExtractingNodes, setIsExtractingNodes] = useState(false);
  const [pendingRecommendation, setPendingRecommendation] = useState<WorkflowRecommendationWithAvailability | null>(null);

  // Live ComfyUI backend connection state
  const [liveNodeCount, setLiveNodeCount] = useState<number>(() => {
    const cache = getCacheStatus();
    return cache?.nodeCount ?? 0;
  });
  const [installedPacks, setInstalledPacks] = useState<CustomNodePackInfo[]>([]);

  useEffect(() => {
    const cache = getLiveNodeCache();

    let cancelled = false;
    fetchCustomNodeRegistry()
      .then(async (packs) => {
        if (cancelled) return;
        const detected = await detectInstalledPacks(cache, packs);
        if (!cancelled) setInstalledPacks(detected);
      })
      .catch(() => {
        // Best-effort warm start; ignore registry failures here.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    const saved = localStorage.getItem('comfyui-architect-preferences');
    if (saved) {
      try {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_PREFERENCES;
      }
    }
    return DEFAULT_PREFERENCES;
  });
  const [hasRestoredWorkflow] = useState(() => {
    try {
      return !!localStorage.getItem('comfyui-architect-autosave');
    } catch {
      return false;
    }
  });
  const comfyWS = useComfyWebSocket(settings.comfyuiUrl);
  const manager = useManagerAPI(settings.comfyuiUrl);
  const comfyuiStatus = useComfyUIStatus({
    comfyuiUrl: settings.comfyuiUrl,
    enabled: !!settings.comfyuiUrl?.trim(),
  });
  const workflowHistory = useWorkflowHistory();
  const historyInitializedRef = useRef(false);
  const statusRecoverySeenRef = useRef(0);
  const managerListRevisionSeenRef = useRef(0);
  const autoLiveSyncInFlightRef = useRef(false);

  // Execution state (Phase 2)
  const [executionProgress, setExecutionProgress] = useState<ExecutionProgress | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [sessionPromptIds, setSessionPromptIds] = useState<Set<string>>(() => new Set());
  const [comfyuiWorkflowSubfolders, setComfyuiWorkflowSubfolders] = useState<string[]>([]);
  const [lastExecutedWorkflowRef, setLastExecutedWorkflowRef] = useState<ComfyUIWorkflow | null>(null);
  const cancelExecutionRef = useRef<(() => void) | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const [validationResult, setValidationResult] = useState<PipelineValidationResult | null>(null);
  const [showValidationReport, setShowValidationReport] = useState(false);
  const [schemaValidationGate, setSchemaValidationGate] = useState<{
    workflow: ComfyUIWorkflow;
    result: SchemaValidationResult;
  } | null>(null);
  const [modificationResult, setModificationResult] = useState<ModificationResult | null>(null);
  const [showModificationReport, setShowModificationReport] = useState(false);
  const [pendingModifiedWorkflow, setPendingModifiedWorkflow] = useState<ComfyUIWorkflow | null>(null);
  const [quickValidationStatus, setQuickValidationStatus] = useState<{
    valid: boolean;
    errorCount: number;
    warningCount: number;
  } | null>(null);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [validationOptions, setValidationOptions] = useState<Required<PipelineValidationOptions>>(() => {
    const migrationKey = 'fdp-validation-migrated-11b-h1';
    const migrated = localStorage.getItem(migrationKey);
    if (!migrated) {
      localStorage.removeItem('fdp-validation-options');
      localStorage.setItem(migrationKey, 'true');
    }

    const saved = localStorage.getItem('fdp-validation-options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_VALIDATION_OPTIONS,
          ...parsed,
          allowUnknownNodes: parsed.allowUnknownNodes ?? true,
          skipValidationForUnknown: parsed.skipValidationForUnknown ?? true,
          safeMode: parsed.safeMode ?? true,
          removeOrphans: false,
          autoConnect: false,
          fuzzyThreshold: Math.max(Number(parsed.fuzzyThreshold ?? 0.85), 0.85),
        };
      } catch {
        // Fall through to defaults.
      }
    }
    return {
      ...DEFAULT_VALIDATION_OPTIONS,
      autoFix: true,
      fuzzyMatch: true,
      fuzzyThreshold: 0.85,
      autoConnect: false,
      autoClamp: true,
      removeOrphans: false,
      deduplicateLoaders: false,
      strict: false,
      allowUnknownNodes: true,
      skipValidationForUnknown: true,
      safeMode: true,
    };
  });

  // Learn Nodes state
  const [learningPackId, setLearningPackId] = useState<string | null>(null);
  const [learningProgress, setLearningProgress] = useState('');
  const [learnedPackIds, setLearnedPackIds] = useState<Set<string>>(() => getLearnedPackIds());
  const [learnedNodeCounts, setLearnedNodeCounts] = useState<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const packId of getLearnedPackIds()) {
      const schemas = getLearnedSchemas(packId);
      if (schemas) counts.set(packId, schemas.nodeCount);
    }
    return counts;
  });

  // Resizable split panel
  const [splitPosition, setSplitPosition] = useState(38);
  const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(() => {
    try {
      return localStorage.getItem('schema-drawer-open') === 'true';
    } catch {
      return false;
    }
  });
  const [schemaDrawerWidth, setSchemaDrawerWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('schema-drawer-width');
      const parsed = saved ? Number.parseInt(saved, 10) : 280;
      return Math.max(220, Math.min(400, Number.isFinite(parsed) ? parsed : 280));
    } catch {
      return 280;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('workflow-library-ref-enabled', String(useLibraryReferences));
    } catch {}
  }, [useLibraryReferences]);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleSchemaDrawer = useCallback(() => {
    setSchemaDrawerOpen((prev) => !prev);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPos = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.max(20, Math.min(70, newPos)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleSettingsChange = useCallback((newSettings: ProviderSettings) => {
    setSettings(newSettings);
    localStorage.setItem('comfyui-architect-settings', JSON.stringify(newSettings));
    localStorage.setItem('huggingface-api-key', newSettings.huggingfaceApiKey || '');
    localStorage.setItem('civitai-api-key', newSettings.civitaiApiKey || '');
  }, []);

  const handleComfyUrlChange = useCallback((url: string) => {
    setSettings((prev) => {
      const next = { ...prev, comfyuiUrl: url };
      localStorage.setItem('comfyui-architect-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const handlePreferencesChange = useCallback((prefs: AppPreferences) => {
    setPreferences(prefs);
    localStorage.setItem('comfyui-architect-preferences', JSON.stringify(prefs));
  }, []);

  useEffect(() => {
    const serializable = {
      ...schemaFilterConfig,
      selectedPackIds: [...schemaFilterConfig.selectedPackIds],
      manualPackAdditions: [...schemaFilterConfig.manualPackAdditions],
      manualPackRemovals: [...schemaFilterConfig.manualPackRemovals],
    };
    localStorage.setItem('fdp-schema-filter-config', JSON.stringify(serializable));
  }, [schemaFilterConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('schema-drawer-open', String(schemaDrawerOpen));
    } catch {}
  }, [schemaDrawerOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('schema-drawer-width', String(schemaDrawerWidth));
    } catch {}
  }, [schemaDrawerWidth]);

  useEffect(() => {
    saveSelectorState(schemaSelectorState);
  }, [schemaSelectorState]);

  useEffect(() => {
    localStorage.setItem('fdp-validation-options', JSON.stringify(validationOptions));
  }, [validationOptions]);

  useEffect(() => {
    const migrated = localStorage.getItem('fdp-validation-migrated-11b-h1');
    if (!migrated) {
      localStorage.removeItem('fdp-validation-options');
      localStorage.setItem('fdp-validation-migrated-11b-h1', 'true');
    }
  }, []);

  useEffect(() => {
    if (currentWorkflow && preferences.autoSaveWorkflow) {
      try {
        localStorage.setItem('comfyui-architect-autosave', JSON.stringify(currentWorkflow));
      } catch {
        // localStorage may be full or blocked
      }
    }
  }, [currentWorkflow, preferences.autoSaveWorkflow]);

  useEffect(() => {
    if (hasRestoredWorkflow && currentWorkflow) {
      toast.info(`Restored auto-saved workflow (${currentWorkflow.nodes.length} nodes)`);
    }
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (historyInitializedRef.current) return;
    if (currentWorkflow) {
      workflowHistory.push(currentWorkflow, 'Initial workflow');
    }
    historyInitializedRef.current = true;
  }, [currentWorkflow, workflowHistory]);

  useEffect(() => {
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    validationTimerRef.current = setTimeout(() => {
      if (!currentWorkflow) {
        setQuickValidationStatus(null);
        return;
      }
      setQuickValidationStatus(quickValidate(currentWorkflow));
    }, 500);

    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [currentWorkflow]);

  const commitWorkflowChange = useCallback((nextWorkflow: ComfyUIWorkflow, label: string) => {
    if (currentWorkflow) {
      workflowHistory.push(currentWorkflow, `Before: ${label}`);
    }
    setCurrentWorkflow(nextWorkflow);
    workflowHistory.push(nextWorkflow, label);
  }, [currentWorkflow, workflowHistory]);

  const allNodeSchemas = useMemo<Record<string, any> | null>(() => {
    const raw = getRawObjectInfo();
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      return raw;
    }
    const liveNodes = getLiveNodeCache()?.nodes;
    if (!liveNodes || Object.keys(liveNodes).length === 0) return null;
    return liveNodes as unknown as Record<string, any>;
  }, [liveNodeCount, settings.comfyuiUrl]);

  const optimizedSchemaResult = useMemo(() => {
    if (!allNodeSchemas) {
      return {
        filteredSchemas: {} as Record<string, any>,
        includedNodeCount: 0,
        excludedNodeCount: 0,
        estimatedTokens: 0,
        includedPacks: [] as string[],
        excludedPacks: [] as string[],
      };
    }
    return getOptimizedSchemas(allNodeSchemas, schemaFilterConfig, currentWorkflow);
  }, [allNodeSchemas, schemaFilterConfig, currentWorkflow]);

  const currentWorkflowNodeTypes = useMemo(() => (
    [...new Set((currentWorkflow?.nodes || [])
      .map((node) => String(node?.type || '').trim())
      .filter((type) => type.length > 0))]
  ), [currentWorkflow]);

  const selectorClassifiedPacks = useMemo<ClassifiedPack[]>(() => {
    const liveCache = getLiveNodeCache();
    if (!liveCache) return [];
    return classifyNodesIntoPacks(liveCache, installedPacks);
  }, [liveNodeCount, settings.comfyuiUrl, installedPacks]);

  useEffect(() => {
    if (selectorClassifiedPacks.length === 0) return;
    const availablePackIds = selectorClassifiedPacks.map((p) => p.id);
    setSchemaSelectorState((prev) => {
      const pruned = pruneStalePackEntries(prev, availablePackIds);
      return sanitizeZombiePackStates(pruned);
    });
  }, [selectorClassifiedPacks]);

  const filteredLiveNodeSchemasForPrompt = useMemo(() => {
    const liveCache = getLiveNodeCache();
    if (!liveCache) return {};
    return buildSelectedLiveNodeMap(schemaSelectorState, liveCache, selectorClassifiedPacks);
  }, [
    schemaSelectorState,
    selectorClassifiedPacks,
    liveNodeCount,
    settings.comfyuiUrl,
  ]);

  const contextNodeSchemasByPack = useMemo(() => {
    if (!allNodeSchemas) return [];
    const packs = classifyNodesByPack(allNodeSchemas);
    const included = new Set(Object.keys(filteredLiveNodeSchemasForPrompt || {}));
    return [...packs.values()]
      .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
      .map((pack) => ({
        packId: pack.id,
        packName: pack.displayName,
        tokens: pack.estimatedTokens,
        nodeCount: pack.nodeCount,
        included: pack.nodeClassTypes.some((classType) => included.has(classType)),
        category: pack.category,
      }));
  }, [allNodeSchemas, filteredLiveNodeSchemasForPrompt]);

  const modelLibraryPromptSection = useMemo(
    () => buildModelLibraryPrompt(modelLibrary.selectedCategories, modelLibrary.inventory),
    [modelLibrary.selectedCategories, modelLibrary.inventory],
  );

  const fullModelLibraryPromptSection = useMemo(() => {
    if (!modelLibrary.inventory) return '';
    const allCategories = Object.entries(modelLibrary.inventory)
      .filter(([, files]) => Array.isArray(files) && files.length > 0)
      .map(([category]) => category);
    return buildModelLibraryPrompt(new Set(allCategories), modelLibrary.inventory);
  }, [modelLibrary.inventory]);

  const schemaSelectedPackIds = useMemo(() => {
    const selectedIds = new Set<string>();
    if (!getLiveNodeCache()) return selectedIds;

    for (const packId of getSelectedPackIds(schemaSelectorState, selectorClassifiedPacks)) {
      if (packId && packId !== 'comfyui-core') selectedIds.add(packId);
    }
    for (const packId of nodeLibrary.manuallyAdded) selectedIds.add(packId);
    for (const packId of nodeLibrary.manuallyRemoved) selectedIds.delete(packId);

    return selectedIds;
  }, [
    schemaSelectorState,
    selectorClassifiedPacks,
    nodeLibrary.manuallyAdded,
    nodeLibrary.manuallyRemoved,
    liveNodeCount,
    settings.comfyuiUrl,
  ]);

  const effectivePromptPacks = useMemo<PinnedNodePack[]>(() => {
    const hasLiveCache = !!getLiveNodeCache();
    if (!hasLiveCache) return nodeLibrary.pinnedPacks;
    if (schemaSelectorState.mode === 'off') return nodeLibrary.pinnedPacks;
    if (schemaSelectedPackIds.size === 0) return [];

    const installedById = new Map(installedPacks.map((pack) => [pack.id, pack]));
    const classifiedById = new Map(selectorClassifiedPacks.map((pack) => [pack.id, pack]));

    const selected = [...schemaSelectedPackIds]
      .sort((a, b) => a.localeCompare(b))
      .map((packId) => {
        const installed = installedById.get(packId);
        if (installed) {
          return {
            id: installed.id,
            title: installed.title,
            reference: installed.reference,
            description: installed.description,
            nodeNames: installed.nodeNames,
            nodeCount: installed.nodeCount,
            installCommand: installed.installCommand,
            author: installed.author,
            stars: installed.stars,
            pinnedAt: 0,
          } satisfies PinnedNodePack;
        }

        const classified = classifiedById.get(packId);
        if (!classified) return null;
        return {
          id: classified.id,
          title: classified.title,
          reference: '',
          description: 'Live-synced pack selection from Schema Drawer',
          nodeNames: classified.nodeNames,
          nodeCount: classified.nodeCount,
          installCommand: `comfy node install ${classified.id}`,
          author: 'Unknown',
          stars: 0,
          pinnedAt: 0,
        } satisfies PinnedNodePack;
      })
      .filter((pack): pack is PinnedNodePack => pack !== null);

    return selected;
  }, [
    installedPacks,
    schemaSelectorState.mode,
    schemaSelectedPackIds,
    selectorClassifiedPacks,
    nodeLibrary.pinnedPacks,
    liveNodeCount,
    settings.comfyuiUrl,
  ]);

  /**
   * Build a dynamic system prompt that includes the user's pinned pack context.
   * This is called for each AI request so the prompt reflects the latest library.
   */
  const getEffectivePromptLibraryMode = useCallback((hasLiveCache: boolean) => {
    if (!hasLiveCache) return nodeLibrary.mode;
    if (
      nodeLibrary.contextFilterMode === 'everything'
      || nodeLibrary.contextFilterMode === 'everything-compressed'
      || nodeLibrary.contextFilterMode === 'core-popular'
      || nodeLibrary.manuallyAdded.length > 0
      || nodeLibrary.manuallyRemoved.length > 0
      || schemaSelectorState.mode !== 'off'
    ) {
      return 'discover';
    }
    return nodeLibrary.mode;
  }, [
    nodeLibrary.mode,
    nodeLibrary.contextFilterMode,
    nodeLibrary.manuallyAdded,
    nodeLibrary.manuallyRemoved,
    schemaSelectorState.mode,
  ]);

  const buildSchemaSection = useCallback(() => {
    const liveCache = getLiveNodeCache();
    if (!liveCache || schemaSelectorState.mode === 'off') {
      return {
        section: '',
        selectedNodeMap: {} as Record<string, any>,
        selectedNodeCount: 0,
        loadedPackTitles: [] as string[],
        liveSchemaMode: 'compact' as 'compact' | 'full',
      };
    }

    const selectedNodeMap = buildSelectedLiveNodeMap(schemaSelectorState, liveCache, selectorClassifiedPacks);
    const nodeToPackTitle = new Map<string, string>();
    const loadedPackTitles: string[] = [];

    for (const pack of selectorClassifiedPacks) {
      const selectedCount = countSelectedNodesForPack(schemaSelectorState, pack);
      if (selectedCount <= 0) continue;
      if (!pack.isCore) loadedPackTitles.push(pack.title);
      for (const nodeName of pack.nodeNames) {
        if (selectedNodeMap[nodeName]) {
          nodeToPackTitle.set(nodeName, pack.title);
        }
      }
    }

    let liveSchemaMode: 'compact' | 'full' = schemaSelectorState.mode === 'full' ? 'full' : 'compact';
    let section = buildSchemaDrawerSection(selectedNodeMap, {
      mode: liveSchemaMode,
      nodeToPackTitle,
    });

    // === Token budget enforcement (3 tiers) ===
    // Goal: keep schema injection under SCHEMA_TOKEN_HARD_CAP tokens per request.
    // Selector state is never mutated — these are prompt-time adaptations only.

    // Tier 1: full → compact
    if (liveSchemaMode === 'full' && Math.ceil(section.length / 4) > SCHEMA_TOKEN_HARD_CAP) {
      console.warn(
        `[SchemaDrawer] Tier 1: full→compact (~${Math.ceil(section.length / 4)} tokens > ${SCHEMA_TOKEN_HARD_CAP} cap)`,
      );
      liveSchemaMode = 'compact';
      section = buildSchemaDrawerSection(selectedNodeMap, {
        mode: 'compact',
        nodeToPackTitle,
        log: false,
      });
    }

    // Tier 2: compact but too many nodes → drop core ComfyUI packs (AI knows them intrinsically)
    if (Math.ceil(section.length / 4) > SCHEMA_TOKEN_HARD_CAP) {
      const coreTitles = new Set(selectorClassifiedPacks.filter((p) => p.isCore).map((p) => p.title));
      const customOnly: typeof selectedNodeMap = Object.fromEntries(
        Object.entries(selectedNodeMap).filter(([nodeName]) => {
          const packTitle = nodeToPackTitle.get(nodeName);
          return !packTitle || !coreTitles.has(packTitle);
        }),
      );
      console.warn(
        `[SchemaDrawer] Tier 2: trimmed to ${Object.keys(customOnly).length} custom-pack nodes (dropped ${Object.keys(selectedNodeMap).length - Object.keys(customOnly).length} core nodes)`,
      );
      section = buildSchemaDrawerSection(customOnly, {
        mode: 'compact',
        nodeToPackTitle,
        log: false,
      });
    }

    // Tier 3: still over cap → skip entirely with a brief notice
    if (Math.ceil(section.length / 4) > SCHEMA_TOKEN_HARD_CAP) {
      console.warn(
        `[SchemaDrawer] Tier 3: skipping schema injection (${Object.keys(selectedNodeMap).length} nodes still too large)`,
      );
      section = `\n## Live Node Schemas\n\n> Schema injection skipped: ${Object.keys(selectedNodeMap).length} nodes selected exceeds context budget. Reduce selection in the Schema Drawer.\n`;
    }

    return {
      section,
      selectedNodeMap,
      selectedNodeCount: Object.keys(selectedNodeMap).length,
      loadedPackTitles: [...new Set(loadedPackTitles)].sort((a, b) => a.localeCompare(b)),
      liveSchemaMode,
    };
  }, [
    schemaSelectorState,
    selectorClassifiedPacks,
    liveNodeCount,
    settings.comfyuiUrl,
  ]);

  const buildDynamicSystemPrompt = useCallback(async (
    userMessage: string,
    includeCurrentWorkflow = false,
    hasSelectedNodes = false,
  ): Promise<string> => {
    const liveCache = getLiveNodeCache();
    const schemaContext = buildSchemaSection();
    const effectiveMode = getEffectivePromptLibraryMode(!!liveCache);
    const availabilitySection = liveCache
      ? buildNodeAvailabilitySummary({
        loadedPackTitles: schemaContext.loadedPackTitles,
        loadedNodeCount: schemaContext.selectedNodeCount,
        schemaMode: schemaSelectorState.mode,
      })
      : '';
    const packsSection = `${availabilitySection}${schemaContext.section}${buildPacksPromptSection(
      userMessage,
      effectivePromptPacks,
      effectiveMode,
      liveCache ? schemaContext.selectedNodeMap : undefined,
      currentWorkflowNodeTypes,
    )}`;

    console.log('[SystemPrompt] Building with schema selection:', {
      checkedPacks: [...schemaSelectedPackIds],
      mode: schemaSelectorState.mode,
      pinnedPacks: nodeLibrary.pinnedPacks.map((pack) => pack.title),
      liveCacheAvailable: !!liveCache,
      selectedLiveNodeCount: schemaContext.selectedNodeCount,
    });

    const basePrompt = await buildSystemPromptWithPacks(
      ALL_NODES,
      packsSection,
      includeCurrentWorkflow ? currentWorkflow || undefined : undefined,
      modelLibraryPromptSection,
      hasSelectedNodes,
      null,
      schemaContext.liveSchemaMode,
      userMessage,
      useLibraryReferences,
    );
    const finalPrompt = `${basePrompt}\n\n${getTypeSystemCheatSheet()}\n\n${getWorkflowPatterns()}`;
    console.log(
      '[SystemPrompt] Final prompt length:',
      finalPrompt.length,
      'chars, ~',
      Math.ceil(finalPrompt.length / 4),
      'tokens',
    );
    return finalPrompt;
  }, [
    effectivePromptPacks,
    buildSchemaSection,
    getEffectivePromptLibraryMode,
    currentWorkflow,
    currentWorkflowNodeTypes,
    modelLibraryPromptSection,
    nodeLibrary.pinnedPacks,
    schemaSelectedPackIds,
    schemaSelectorState,
    useLibraryReferences,
  ]);

  const buildModificationSystemPrompt = useCallback(async (
    userMessage: string,
    workflow: ComfyUIWorkflow,
    hasSelectedNodes = false,
  ): Promise<string> => {
    const liveCache = getLiveNodeCache();
    const schemaContext = buildSchemaSection();
    const effectiveMode = getEffectivePromptLibraryMode(!!liveCache);
    const availabilitySection = liveCache
      ? buildNodeAvailabilitySummary({
        loadedPackTitles: schemaContext.loadedPackTitles,
        loadedNodeCount: schemaContext.selectedNodeCount,
        schemaMode: schemaSelectorState.mode,
      })
      : '';
    const packsSection = `${availabilitySection}${schemaContext.section}${buildPacksPromptSection(
      userMessage,
      effectivePromptPacks,
      effectiveMode,
      liveCache ? schemaContext.selectedNodeMap : undefined,
      [...new Set((workflow.nodes || [])
        .map((node) => String(node?.type || '').trim())
        .filter((type) => type.length > 0))],
    )}`;

    const basePrompt = await buildSystemPromptWithPacks(
      ALL_NODES,
      packsSection,
      undefined,
      modelLibraryPromptSection,
      hasSelectedNodes,
      null,
      schemaContext.liveSchemaMode,
      userMessage,
      useLibraryReferences,
    );
    const summary = summarizeWorkflow(workflow);
    const nodeTypes = [...new Set((workflow.nodes || []).map((node) => node.type))]
      .filter((type): type is string => typeof type === 'string' && type.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
    const swarmTypesMissingPackContext = nodeTypes.filter(
      (type) => type.startsWith('Swarm') && !packsSection.includes(type),
    );
    const maxNodeId = getMaxNodeId(workflow);
    const maxLinkId = getMaxLinkId(workflow);
    const preservationManifest = `## PRESERVATION RULES FOR THIS WORKFLOW
You MUST use these EXACT class_type values:
${nodeTypes.map((type) => `- ${type}`).join('\n')}

Current max node ID: ${maxNodeId} (new nodes must use IDs > ${maxNodeId})
Current max link ID: ${maxLinkId} (new links must use IDs > ${maxLinkId})

Do NOT replace any listed class_type with a standard equivalent.`;
    const swarmNativeMappingNote = swarmTypesMissingPackContext.length > 0
      ? `## Swarm Wrapper Conversion Note
Some workflow node types are from packs not present in the current prompt context:
${swarmTypesMissingPackContext.map((type) => `- ${type}`).join('\n')}

If the user asks to convert to native ComfyUI, use this mapping:
- SwarmKSampler → KSampler
- SwarmClipTextEncodeAdvanced → CLIPTextEncode
- SwarmSaveImageWS → SaveImage`
      : '';

    return `${basePrompt}

You are modifying an EXISTING workflow.
Output ONLY a JSON array of operations. Do NOT output full workflow JSON.

${summary.text}

${preservationManifest}
${swarmNativeMappingNote ? `\n\n${swarmNativeMappingNote}` : ''}

${getOperationFormatReference()}

${getModificationExamples()}
`;
  }, [
    effectivePromptPacks,
    buildSchemaSection,
    getEffectivePromptLibraryMode,
    modelLibraryPromptSection,
    schemaSelectorState,
    useLibraryReferences,
  ]);

  const buildBrainstormPrompt = useCallback((userMessage: string): string => {
    const liveCache = getLiveNodeCache();
    const schemaContext = buildSchemaSection();
    const effectiveMode = getEffectivePromptLibraryMode(!!liveCache);
    const availabilitySection = liveCache
      ? buildNodeAvailabilitySummary({
        loadedPackTitles: schemaContext.loadedPackTitles,
        loadedNodeCount: schemaContext.selectedNodeCount,
        schemaMode: schemaSelectorState.mode,
      })
      : '';
    const packsSection = `${availabilitySection}${schemaContext.section}${buildPacksPromptSection(
      userMessage,
      effectivePromptPacks,
      effectiveMode,
      liveCache ? schemaContext.selectedNodeMap : undefined,
      currentWorkflowNodeTypes,
    )}`;
    const installedPackSection = installedPacks.length > 0
      ? `\n### Installed Node Pack Inventory\n${installedPacks
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((pack) => `- ${pack.title} (${pack.nodeCount} nodes) - ${pack.reference}`)
        .join('\n')}`
      : '';
    const workflowSummary = currentAnalysis
      ? formatAnalysisSummary(currentAnalysis, 'Current workflow')
      : (currentWorkflow ? summarizeWorkflow(currentWorkflow).text : undefined);
    const includeRecommendationFormat = availabilitySection.trim().length > 0;
    return buildBrainstormSystemPrompt(
      `${packsSection}${installedPackSection}`,
      fullModelLibraryPromptSection || modelLibraryPromptSection,
      workflowSummary,
      { includeRecommendationFormat },
    );
  }, [
    effectivePromptPacks,
    buildSchemaSection,
    getEffectivePromptLibraryMode,
    currentWorkflowNodeTypes,
    installedPacks,
    currentAnalysis,
    currentWorkflow,
    fullModelLibraryPromptSection,
    modelLibraryPromptSection,
    schemaSelectorState.mode,
  ]);

  // Core AI call that returns the parsed workflow + response text
  const callAIAndParse = useCallback(async (
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPromptOverride?: string,
  ): Promise<{ finalResponse: string; workflow: ComfyUIWorkflow | null; parsed: ReturnType<typeof parseAIResponse> }> => {
    let fullResponse = '';
    setStreamingContent('');

    const abortController = new AbortController();
    aiAbortControllerRef.current = abortController;

    const response = await callAI({
      settings,
      messages: conversationHistory,
      onChunk: (chunk) => {
        fullResponse += chunk;
        setStreamingContent(prev => prev + chunk);
      },
      systemPromptOverride,
      signal: abortController.signal,
    });

    const finalResponse = fullResponse || response.text;
    const inputChars = (systemPromptOverride?.length ?? 0)
      + conversationHistory.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);
    trackTokenUsage(
      settings.selectedModel,
      response.usage,
      inputChars,
      finalResponse.length,
    );
    const parsed = parseAIResponse(finalResponse);

    let workflow = parsed.workflow;
    if (workflow) {
      const allZero = workflow.nodes.every(n => n.pos[0] === 0 && n.pos[1] === 0);
      if (allZero) {
        workflow = autoLayoutWorkflow(workflow);
      }
      // Enrich unknown/custom nodes to ensure handles match links
      workflow = enrichWorkflowNodes(workflow);
      // Always resolve any remaining overlaps (AI positions are often unreliable)
      workflow = resolveOverlaps(workflow);
      const { sanitized, fixes } = sanitizeWorkflow(workflow);
      if (fixes.length > 0) {
        console.log('[Sanitizer] Auto-fixed:', fixes);
      }
      workflow = sanitized;
    }

    if (typeof window !== 'undefined') {
      const debugState = (window as any).__debug || {};
      (window as any).__debug = {
        ...debugState,
        lastApiWorkflow: parsed.apiWorkflow ?? null,
        lastGraphWorkflow: workflow ?? null,
        conversionWarnings: parsed.conversionWarnings ?? [],
      };
    }

    return { finalResponse, workflow, parsed };
  }, [settings, trackTokenUsage]);

  /** Wrapper for ExperimentPanel to call AI with custom prompts */
  const handleExperimentAICall = useCallback(async (
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> => {
    const response = await callAI({
      settings,
      messages: [{ role: 'user', content: userMessage }],
      systemPromptOverride: systemPrompt,
    });
    trackTokenUsage(
      settings.selectedModel,
      response.usage,
      systemPrompt.length + userMessage.length,
      response.text.length,
    );
    return response.text;
  }, [settings, trackTokenUsage]);

  // Self-correction loop: validate â†’ if errors, ask AI to fix â†’ repeat
  const selfCorrectWorkflow = useCallback(async (
    workflow: ComfyUIWorkflow,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    originalResponse: string,
    systemPromptOverride?: string,
  ): Promise<{
    workflow: ComfyUIWorkflow;
    validation: LegacyValidationResult;
    correctionMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
    attempts: number;
  }> => {
    let currentWf = workflow;
    let validation = validateWorkflowLegacy(currentWf);
    const correctionMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    let attempts = 0;

    while (!validation.isValid && attempts < MAX_SELF_CORRECTION_RETRIES) {
      attempts++;
      setCorrectionStatus(`Auto-fixing: attempt ${attempts}/${MAX_SELF_CORRECTION_RETRIES} (${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''})â€¦`);

      const correctionPrompt = buildCorrectionPrompt(currentWf, validation);

      // Build the conversation for correction: original history + assistant response + correction request
      const correctionHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...conversationHistory,
        { role: 'assistant', content: originalResponse },
        { role: 'user', content: correctionPrompt },
      ];

      try {
        const result = await callAIAndParse(correctionHistory, systemPromptOverride);

        if (result.workflow) {
          currentWf = result.workflow;
          validation = validateWorkflowLegacy(currentWf);
          correctionMessages.push(
            { role: 'user', content: correctionPrompt },
            { role: 'assistant', content: result.finalResponse },
          );
          originalResponse = result.finalResponse;
        } else {
          // AI didn't return a workflow in the correction â€” stop trying
          break;
        }
      } catch (err) {
        console.error('Self-correction attempt failed:', err);
        break;
      }
    }

    setCorrectionStatus('');
    return { workflow: currentWf, validation, correctionMessages, attempts };
  }, [callAIAndParse]);

  const handleSendMessage = useCallback(async (content: string) => {
    // Check that the active provider has an API key
    const activeKey = getAPIKeyForModel(settings);
    const provider = getProviderForModel(settings.selectedModel, settings.customModels);
    if (!activeKey) {
      toast.error(`No API key set for ${PROVIDER_INFO[provider].name}. Add it in the Keys tab.`);
      return;
    }

    setIsLoading(true);
    setStreamingContent('');

    const selectedNodesForMessage = chatMode === 'build' && currentWorkflow
      ? currentWorkflow.nodes.filter((node) => selectedNodeIds.has(String(node.id)))
      : [];
    const hasSelectedNodes = selectedNodesForMessage.length > 0;
    let augmentedContent = content;
    if (hasSelectedNodes) {
      const nodeContext = selectedNodesForMessage.map((node) => {
        const widgetSettings = Array.isArray(node.widgets_values) && node.widgets_values.length > 0
          ? ` settings=${JSON.stringify(node.widgets_values).slice(0, 200)}`
          : '';
        return `- ${node.type} (node #${node.id})${widgetSettings}`;
      }).join('\n');
      augmentedContent = `[Selected canvas nodes (${selectedNodesForMessage.length}):\n${nodeContext}\n]\n\n${content}`;
      handleClearNodeSelection();
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const beforeWorkflow = currentWorkflow;

      // Build conversation history
      let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: augmentedContent },
      ];

      const requestMode = detectRequestMode(content, !!beforeWorkflow);
      const useOperationModify = chatMode === 'build' && requestMode === 'modify' && !!beforeWorkflow;

      // For modification requests, trim history to the last 6 messages (3 exchanges).
      // The modification system prompt already embeds the full workflow + preservation rules,
      // so older history is mostly noise and inflates the input past the model's context limit.
      if (useOperationModify && conversationHistory.length > 7) {
        const currentMsg = conversationHistory[conversationHistory.length - 1];
        const trimmed = conversationHistory.slice(0, -1).slice(-6);
        console.log(
          `[Modify] Trimmed history: ${conversationHistory.length - 1} → ${trimmed.length} messages (kept last 3 exchanges)`,
        );
        conversationHistory = [...trimmed, currentMsg];
      }

      let systemPromptOverride: string | undefined;
      if (chatMode === 'brainstorm') {
        systemPromptOverride = buildBrainstormPrompt(content);
      } else if (useOperationModify && beforeWorkflow) {
        systemPromptOverride = await buildModificationSystemPrompt(content, beforeWorkflow, hasSelectedNodes);
      } else {
        const includeWorkflowContext = !!currentWorkflow && isWorkflowModificationRequest(content);
        systemPromptOverride = await buildDynamicSystemPrompt(content, includeWorkflowContext, hasSelectedNodes);
      }
      setLastSystemPrompt(systemPromptOverride || '');
      setLastSchemaSelectorAppliedAt(schemaSelectorState.lastUpdated || Date.now());

      if (useOperationModify && beforeWorkflow) {
        logModifyContextDiagnosis(beforeWorkflow, systemPromptOverride);
      }

      if (chatMode === 'brainstorm') {
        let fullResponse = '';
        const abortController = new AbortController();
        aiAbortControllerRef.current = abortController;
        const response = await callAI({
          settings,
          messages: conversationHistory,
          onChunk: (chunk) => {
            fullResponse += chunk;
            setStreamingContent((prev) => prev + chunk);
          },
          systemPromptOverride,
          signal: abortController.signal,
        });
        const finalResponse = fullResponse || response.text;
        const inputChars = (systemPromptOverride?.length ?? 0)
          + conversationHistory.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);
        trackTokenUsage(
          settings.selectedModel,
          response.usage,
          inputChars,
          finalResponse.length,
        );
        const parsedRecommendation = parseRecommendedNodes(finalResponse);
        const displayText = stripRecommendationBlock(finalResponse);
        const liveNodeMap = new Map<string, unknown>(
          Object.keys(getLiveNodeCache()?.nodes || {}).map((classType) => [classType, true]),
        );
        const recommendation = parsedRecommendation
          ? {
            ...parsedRecommendation,
            nodes: validateRecommendedNodes(parsedRecommendation.nodes, liveNodeMap),
          }
          : undefined;
        const brainstormDisplayContent = displayText
          || (recommendation ? 'Recommended workflow nodes captured.' : finalResponse);
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: brainstormDisplayContent,
          timestamp: Date.now(),
          recommendation,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      const { finalResponse, workflow, parsed } = await callAIAndParse(conversationHistory, systemPromptOverride);
      let responseWorkflow = workflow;
      let requiredNodesFromResponse = parsed.requiredNodes;
      let skipMergeWithOriginal = false;
      if (parsed.conversionWarnings && parsed.conversionWarnings.length > 0) {
        console.warn('[API->Graph] Conversion warnings:', parsed.conversionWarnings);
      }
      const unknownSchemaCount = parsed.unknownNodes?.length ?? 0;
      if (unknownSchemaCount > 0) {
        toast.warning(
          `${unknownSchemaCount} node type(s) had no schema - widget values may be approximate. Sync nodes from ComfyUI for best accuracy.`,
        );
      }

      if (useOperationModify && beforeWorkflow) {
        const { operations, parseErrors } = parseOperationsFromAIOutput(finalResponse);

        if (operations.length === 0) {
          console.warn('[Modify] No operations found; trying full-workflow fallback parse.');
          const fallbackParsed = parseAIResponse(finalResponse);
          let fallbackWorkflow = fallbackParsed.workflow || responseWorkflow;
          if (fallbackParsed.requiredNodes.length > 0) {
            requiredNodesFromResponse = fallbackParsed.requiredNodes;
          }
          if (fallbackParsed.workflow) {
            const allZero = fallbackWorkflow.nodes.every((node) => node.pos[0] === 0 && node.pos[1] === 0);
            if (allZero) {
              fallbackWorkflow = autoLayoutWorkflow(fallbackWorkflow);
            }
            fallbackWorkflow = enrichWorkflowNodes(fallbackWorkflow);
            fallbackWorkflow = resolveOverlaps(fallbackWorkflow);
          }

          // Guard: detect when the AI generated a fresh workflow instead of modifying ours.
          // Two scenarios produce type-mismatched IDs in a fallback:
          //   A) Confused rewrite: AI kept original node IDs but changed their types
          //      → Bad output, reject with error.
          //   B) Fresh replacement: AI started from ID=1; coincidental ID collision with original
          //      → Valid (e.g., "Core Node Swap" produces entirely new structure)
          //      → Accept but apply as a full replacement (skip merge).
          // Distinguishing signal: if max(fallback IDs) is much smaller than max(original IDs),
          // the AI generated sequential IDs from scratch — it's a fresh workflow.
          if (fallbackWorkflow && beforeWorkflow) {
            const origMap = new Map((beforeWorkflow.nodes || []).map((n) => [n.id, n]));
            const origMaxId = Math.max(...(beforeWorkflow.nodes || []).map((n) => n.id), 0);
            const fallbackMaxId = Math.max(...(fallbackWorkflow.nodes || []).map((n) => n.id), 0);
            const typeChanges = (fallbackWorkflow.nodes || []).filter((n) => {
              const orig = origMap.get(n.id);
              return orig && orig.type !== n.type;
            });

            const isFreshWorkflow = origMaxId > 20 && fallbackMaxId <= 20;

            if (typeChanges.length > 1 && !isFreshWorkflow) {
              // Case A: confused partial rewrite — reject
              const changed = typeChanges.map((n) => {
                const orig = origMap.get(n.id)!;
                return `${orig.type}→${n.type}`;
              }).join(', ');
              console.warn(`[Modify] Fallback rejected: ${typeChanges.length} node type(s) changed (${changed}). AI likely ignored preservation rules due to context overflow.`);
              toast.error(`Modification failed: AI rewrote ${typeChanges.length} node type(s) instead of modifying the workflow. Try shortening the conversation or retrying.`);
              const assistantMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: `${extractMarkdownSections(finalResponse) || finalResponse}\n\n---\n*Modification rejected: the AI generated a new workflow with different node types (${changed}). This usually means the model ran out of context. Try clearing some messages or retrying.*`,
                timestamp: Date.now(),
              };
              setMessages(prev => [...prev, assistantMessage]);
              return;
            }

            if (isFreshWorkflow && fallbackWorkflow) {
              // Case B: clean fresh workflow — apply directly, skip merge with original
              console.log(`[Modify] Fallback is a fresh workflow (max IDs: orig=${origMaxId}, new=${fallbackMaxId}), applying as replacement.`);
              toast.info('Applied AI-generated workflow (full replacement).');
              responseWorkflow = fallbackWorkflow;
              skipMergeWithOriginal = true;
            }
          }

          if (fallbackWorkflow) {
            responseWorkflow = fallbackWorkflow;
            toast.info('Modification fallback: parsed full workflow JSON from AI response.');
          } else {
            const parseMessage = parseErrors.length > 0
              ? parseErrors.join('; ')
              : 'No operations found in AI response.';
            toast.error(`Modification parse failed: ${parseMessage}`);

            const assistantMessage: Message = {
              id: generateId(),
              role: 'assistant',
              content: `${extractMarkdownSections(finalResponse) || finalResponse}\n\n---\n*Could not parse modification operations: ${parseMessage}*`,
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, assistantMessage]);
            return;
          }
        }

        if (operations.length > 0) {
          const modResult = executeOperations(beforeWorkflow, operations);
          const pipelineResult = validateWorkflowPipeline(modResult.workflow, validationOptions);

          const previewWorkflow = (pipelineResult.fixedWorkflow || modResult.workflow) as ComfyUIWorkflow;
          if (requiredNodesFromResponse.length > 0) {
            setRequiredNodes(requiredNodesFromResponse);
          }
          setModificationResult(modResult);
          setValidationResult(pipelineResult);
          setPendingModifiedWorkflow(previewWorkflow);
          setShowModificationReport(true);
          setQuickValidationStatus({
            valid: pipelineResult.isValid,
            errorCount: pipelineResult.stats.unfixable,
            warningCount: pipelineResult.issues.filter((issue) => issue.severity === 'warning').length,
          });

          const displayContent = extractMarkdownSections(finalResponse) || finalResponse;
          const opSummary = `${modResult.successCount}/${operations.length} op(s) succeeded`;
          const validationSummary = pipelineResult.isValid
            ? `validation ${pipelineResult.confidence}%`
            : `${pipelineResult.stats.unfixable} unfixable validation error(s)`;

          const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: `${displayContent}\n\n---\n*Operation modify mode: ${opSummary}; ${validationSummary}.*`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          return;
        }
      }

      let resultWorkflow = responseWorkflow;
      let resultValidation: LegacyValidationResult | undefined;
      let mergeReport: MergeReport | null = null;
      let lowPreservationWarning = false;

      if (resultWorkflow) {
        const correctionResult = await selfCorrectWorkflow(
          resultWorkflow,
          conversationHistory,
          finalResponse,
          systemPromptOverride,
        );
        resultWorkflow = correctionResult.workflow;
        resultValidation = correctionResult.validation;
      }

      if (requestMode === 'modify' && beforeWorkflow && resultWorkflow && !skipMergeWithOriginal) {
        logPostModificationDiagnosis(beforeWorkflow, resultWorkflow);

        if (detectIdRewrite(beforeWorkflow, resultWorkflow)) {
          console.warn('[Modify] AI rewrote node IDs - attempting recovery...');
          const recoveredWorkflow = attemptIdRecovery(beforeWorkflow, resultWorkflow);
          if (recoveredWorkflow) {
            resultWorkflow = recoveredWorkflow;
            console.log('[Modify] ID recovery successful');
          } else {
            console.warn('[Modify] ID recovery failed - using AI output as-is');
          }
        }

        const mergeResult = mergeWorkflows(beforeWorkflow, resultWorkflow, content);
        mergeReport = mergeResult.report;
        console.log('[Modify] Merge report:', mergeReport);
        resultWorkflow = mergeResult.workflow;
        resultValidation = validateWorkflowLegacy(resultWorkflow);

        const postMergeDiagnosis = logPostModificationDiagnosis(beforeWorkflow, resultWorkflow);
        if (postMergeDiagnosis.totalOriginal > 3 && postMergeDiagnosis.preserveRate < 0.5) {
          lowPreservationWarning = true;
          console.warn('[Modify] Low preservation rate after merge - AI likely rewrote too much');
        }
      }

      // Update state
      if (resultWorkflow) {
        const workflowLabel = requestMode === 'modify' && beforeWorkflow
          ? 'AI modified workflow'
          : 'AI generated workflow';
        resultWorkflow = applyAutoWorkflowNote(resultWorkflow, workflowLabel, workflowLabel);
        commitWorkflowChange(resultWorkflow, workflowLabel);

        // Run workflow analysis
        try {
          const analysis = await analyzeWorkflow(resultWorkflow, nodeLibrary.isPinned, undefined, settings.comfyuiUrl);
          if (analysis) setCurrentAnalysis(analysis);
        } catch (err) {
          console.warn('Workflow analysis failed (non-critical):', err);
        }
      }

      if (requiredNodesFromResponse.length > 0) {
        setRequiredNodes(requiredNodesFromResponse);

        // Auto-pin new packs from AI recommendations
        for (const req of requiredNodesFromResponse) {
          if (req.githubUrl && !nodeLibrary.isPinned(req.name)) {
            // Try to auto-pin â€” this is a best-effort feature
          }
        }
      }

      const displayContent = extractMarkdownSections(finalResponse);

      let statusNote = '';
      if (resultValidation && !resultValidation.isValid) {
        statusNote = `\n\n---\n*${resultValidation.errors.length} validation error(s) remain. Use "Ask AI to Fix" or fix manually.*`;
      } else if (resultValidation?.isValid && resultWorkflow) {
        statusNote = '\n\n---\n*Workflow validated successfully.*';
      }

      if (mergeReport) {
        statusNote = `\n\n---\n*Modification: ${formatMergeSummary(mergeReport)}*${statusNote}`;
        if (mergeReport.warnings.length > 0) {
          statusNote = `\n\n---\n*Merge warnings: ${mergeReport.warnings.join(' | ')}*${statusNote}`;
        }
      }

      if (lowPreservationWarning) {
        statusNote = `\n\n---\n*Warning: AI preserved less than 50% of original node IDs. Review changes carefully.*${statusNote}`;
      }

      if (requestMode === 'modify' && resultWorkflow && beforeWorkflow) {
        const diff = diffWorkflows(beforeWorkflow, resultWorkflow);
        if (diff.addedNodes.length > 0 || diff.removedNodes.length > 0 || diff.modifiedNodes.length > 0) {
          statusNote = `\n\n---\n${formatDiffMarkdown(diff)}${statusNote}`;
        }
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: (displayContent || finalResponse) + statusNote,
        timestamp: Date.now(),
        workflow: resultWorkflow || undefined,
        validationResult: resultValidation,
        requiredNodes: requiredNodesFromResponse.length > 0 ? requiredNodesFromResponse : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      // AbortError = user clicked Stop — show nothing
      if (error?.name === 'AbortError' || error?.message === 'signal is aborted without reason') {
        console.log('[AI] Generation stopped by user.');
      } else {
        console.error('AI call failed:', error);
        toast.error(error.message || 'Failed to generate workflow');
        const errorMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: `Error: ${error.message || 'Failed to generate workflow. Please check your API key and try again.'}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      setCorrectionStatus('');
      aiAbortControllerRef.current = null;
    }
  }, [
    settings,
    messages,
    chatMode,
    currentWorkflow,
    selectedNodeIds,
    handleClearNodeSelection,
    callAIAndParse,
    selfCorrectWorkflow,
    buildDynamicSystemPrompt,
    buildModificationSystemPrompt,
    buildBrainstormPrompt,
    trackTokenUsage,
    nodeLibrary.isPinned,
    commitWorkflowChange,
    validationOptions,
    schemaSelectorState,
  ]);

  const handleStopGeneration = useCallback(() => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }
  }, []);

  // “Ask AI to Fix” callback — triggered from WorkflowActions validation panel
  const handleRequestFix = useCallback(async (workflow: ComfyUIWorkflow, validation: LegacyValidationResult) => {
    const activeKey = getAPIKeyForModel(settings);
    const provider = getProviderForModel(settings.selectedModel, settings.customModels);
    if (!activeKey) {
      toast.error(`No API key set for ${PROVIDER_INFO[provider].name}. Add it in the Keys tab.`);
      return;
    }

    setIsLoading(true);
    setStreamingContent('');

    const correctionPrompt = buildCorrectionPrompt(workflow, validation);

    // Build dynamic system prompt
    const dynamicSystemPrompt = await buildDynamicSystemPrompt(correctionPrompt);
    setLastSystemPrompt(dynamicSystemPrompt || '');
    setLastSchemaSelectorAppliedAt(schemaSelectorState.lastUpdated || Date.now());

    // Add a visible user message
    const fixMessage: Message = {
      id: generateId(),
      role: 'user',
      content: `Fix ${validation.errors.length} validation error(s) in the current workflow.`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, fixMessage]);

    try {
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: correctionPrompt },
      ];

      const { finalResponse, workflow: fixedWf, parsed } = await callAIAndParse(conversationHistory, dynamicSystemPrompt);

      let resultWorkflow = fixedWf || workflow;
      resultWorkflow = applyAutoWorkflowNote(resultWorkflow, 'AI fixed workflow', 'AI fixed workflow');
      const resultValidation = validateWorkflowLegacy(resultWorkflow);

      commitWorkflowChange(resultWorkflow, 'AI fixed workflow');
      if (parsed.requiredNodes.length > 0) setRequiredNodes(parsed.requiredNodes);

      const displayContent = extractMarkdownSections(finalResponse);
      let statusNote = '';
      if (resultValidation.isValid) {
        toast.success('All validation errors fixed!');
        statusNote = '\n\n---\n*All validation errors resolved.*';
      } else {
        toast.warning(`${resultValidation.errors.length} error(s) remain.`);
        statusNote = `\n\n---\n*${resultValidation.errors.length} error(s) still remain.*`;
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: (displayContent || finalResponse) + statusNote,
        timestamp: Date.now(),
        workflow: resultWorkflow,
        validationResult: resultValidation,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Fix request failed:', error);
      toast.error(error.message || 'Failed to fix workflow');
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Error during fix attempt: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [settings, messages, callAIAndParse, buildDynamicSystemPrompt, commitWorkflowChange, schemaSelectorState]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setCurrentWorkflow(null);
    setExecutionResult(null);
    setLastExecutedWorkflowRef(null);
    setRequiredNodes([]);
    setStreamingContent('');
  }, []);

  const handlePasteDocs = useCallback((docs: string) => {
    // Docs are handled in ChatPanel directly
  }, []);
  const loadWorkflowIntoApp = useCallback(async (
    workflowToLoad: ComfyUIWorkflow,
    sourceName: string,
    options?: {
      summaryFallback?: string;
      unknownNodeCount?: number;
      toastMessage?: string;
      noteName?: string;
      noteDescription?: string;
      commitLabel?: string;
    },
  ) => {
    const noteName = options?.noteName || sourceName;
    const noteDescription = options?.noteDescription || `Loaded from ${sourceName}`;
    const commitLabel = options?.commitLabel || `Loaded: ${sourceName}`;

    const withNote = applyAutoWorkflowNote(workflowToLoad, noteName, noteDescription);
    commitWorkflowChange(withNote, commitLabel);

    const detectedNodes = detectRequiredNodes(withNote);
    setRequiredNodes(detectedNodes);

    let analysis: WorkflowAnalysis | undefined;
    try {
      analysis = await analyzeWorkflow(withNote, nodeLibrary.isPinned, undefined, settings.comfyuiUrl);
    } catch (err) {
      console.warn('Workflow analysis failed (non-critical):', err);
    }

    if (analysis) {
      setCurrentAnalysis(analysis);
    }

    const summaryContent = analysis
      ? formatAnalysisSummary(analysis, sourceName)
      : (options?.summaryFallback || `Loaded workflow: ${sourceName}`);

    const summaryMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: summaryContent,
      timestamp: Date.now(),
      workflow: withNote,
      validationResult: validateWorkflowLegacy(withNote),
      workflowAnalysis: analysis,
      detectedPacks: analysis?.detectedPacks,
    };

    setMessages((prev) => [...prev, summaryMessage]);
    toast.success(options?.toastMessage || `Loaded workflow: ${sourceName}`);

    if (analysis?.detectedPacks && analysis.detectedPacks.length > 0) {
      const unpinned = analysis.detectedPacks.filter((pack) => !pack.isPinned);
      if (unpinned.length > 0) {
        toast.info(`${unpinned.length} custom node pack(s) detected — pin them for better AI context.`);
      }
    } else if ((options?.unknownNodeCount || 0) > 0) {
      toast.warning(`${options?.unknownNodeCount} unknown node type(s) — may need custom node packs.`);
    }
  }, [commitWorkflowChange, nodeLibrary.isPinned, settings.comfyuiUrl]);

  const handleImportWorkflow = useCallback(async (file: File) => {
    try {
      const result = await readWorkflowFile(file);

      if (!result.success || !result.workflow) {
        toast.error(result.errorMessage || 'Failed to import workflow.');
        return;
      }

      await loadWorkflowIntoApp(result.workflow, file.name, {
        summaryFallback: result.summary,
        unknownNodeCount: result.unknownNodes.length,
        toastMessage: `Imported ${result.nodeCount} nodes from ${file.name}`,
        noteName: file.name,
        noteDescription: `Imported from ${file.name}`,
        commitLabel: `Imported: ${file.name}`,
      });
    } catch (error: any) {
      console.error('Failed to import workflow:', error);
      toast.error(error.message || 'Failed to import workflow.');
    }
  }, [loadWorkflowIntoApp]);

  // REMOVED: Templates feature — handleLoadTemplateWorkflow, handleOpenTemplateManager

  const handleOpenWorkflowMerger = useCallback(() => {
    setShowWorkflowMerger(true);
  }, []);

  const handleWorkflowSendToChat = useCallback((workflowName: string) => {
    setPendingContextMessage(`"${workflowName}" — `);
    setOpenChatTabSignal((prev) => prev + 1);
  }, []);

  // REMOVED: Templates feature — handleSaveCurrentAsTemplate

  const handleOpenNodesBrowser = useCallback(() => {
    setShowNodesBrowser(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'z') {
        if (isTextInputFocused()) return;
        event.preventDefault();
        const label = workflowHistory.undoLabel || 'previous state';
        const prev = workflowHistory.undo();
        if (prev) {
          setCurrentWorkflow(prev);
          toast.info(`Undo: ${label}`);
        }
      // Ctrl+Shift+T removed — Templates feature removed
      } else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        setShowWorkflowMerger((prev) => !prev);
      } else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        if (!currentWorkflow) return;
        const result = validateWorkflowPipeline(currentWorkflow, validationOptions);
        setValidationResult(result);
        setShowValidationReport(true);
        setQuickValidationStatus({
          valid: result.isValid,
          errorCount: result.stats.unfixable,
          warningCount: result.issues.filter((issue) => issue.severity === 'warning').length,
        });
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        setSchemaDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentWorkflow, validationOptions, workflowHistory]);

  // Learn Nodes handler â€” fetches schemas from GitHub via AI
  const handleLearnPack = useCallback(async (packId: string, packTitle: string, reference: string) => {
    if (learningPackId) {
      toast.error('Already learning a pack â€” please wait');
      return;
    }
    setLearningPackId(packId);
    setLearningProgress('Starting...');

    try {
      const result = await learnPackSchemas(
        packId,
        packTitle,
        reference,
        settings,
        (progress) => {
          setLearningProgress(progress.detail);
        },
      );

      // Update learned state
      setLearnedPackIds(prev => new Set([...prev, packId]));
      setLearnedNodeCounts(prev => {
        const next = new Map(prev);
        next.set(packId, result.nodeCount);
        return next;
      });

      toast.success(`Learned ${result.nodeCount} node schemas from ${packTitle}`);
    } catch (error: any) {
      console.error('Failed to learn pack schemas:', error);
      toast.error(`Failed to learn ${packTitle}: ${error.message}`);
    } finally {
      setLearningPackId(null);
      setLearningProgress('');
    }
  }, [learningPackId, settings]);

  // Clear learned schemas for a pack
  const handleClearLearnedSchemas = useCallback((packId: string) => {
    clearLearnedSchemasCache(packId);
    setLearnedPackIds(prev => {
      const next = new Set(prev);
      next.delete(packId);
      return next;
    });
    setLearnedNodeCounts(prev => {
      const next = new Map(prev);
      next.delete(packId);
      return next;
    });
  }, []);

  const handleLoadMergedWorkflow = useCallback(async (workflow: any, name: string) => {
    if (!workflow || typeof workflow !== 'object') {
      toast.error('Merged workflow payload is invalid.');
      return;
    }
    await loadWorkflowIntoApp(workflow as ComfyUIWorkflow, name, {
      summaryFallback: `Merged workflow loaded: ${name}`,
      toastMessage: `Loaded merged workflow: ${name}`,
      noteName: name,
      noteDescription: `Merged from workflow merger: ${name}`,
      commitLabel: name,
    });
  }, [loadWorkflowIntoApp]);

  const contextWorkflowMetadata = useMemo(() => {
    if (!currentWorkflow) return '';
    try {
      return extractWorkflowMetadata(currentWorkflow).description || '';
    } catch {
      return '';
    }
  }, [currentWorkflow]);

  const contextNodeSchemas = useMemo(() => {
    return filteredLiveNodeSchemasForPrompt;
  }, [filteredLiveNodeSchemasForPrompt]);

  // Live node sync callback â€” updates liveNodeCount when ComfyUI backend is synced
  const handleLiveNodesSync = useCallback((cache: LiveNodeCache) => {
    setLiveNodeCount(cache.nodeCount);
    modelLibrary.refreshInventory();
  }, [modelLibrary.refreshInventory]);
  const handleInstalledPacksDetected = useCallback((packs: CustomNodePackInfo[]) => {
    setInstalledPacks(packs);
  }, []);

  const handleContextManualOverridesChange = useCallback((
    manuallyAdded: string[],
    manuallyRemoved: string[],
    mode: FilterPresetId,
  ) => {
    const nextAdded = [...new Set(manuallyAdded)];
    const nextRemoved = [...new Set(manuallyRemoved)].filter((id) => !nextAdded.includes(id));

    nodeLibrary.setContextManualOverrides(nextAdded, nextRemoved, mode);
    setSchemaFilterConfig((prev) => ({
      ...prev,
      manualPackAdditions: new Set(nextAdded),
      manualPackRemovals: new Set(nextRemoved),
    }));
  }, [nodeLibrary]);

  const handleContextManualOverridesReset = useCallback((mode: FilterPresetId) => {
    nodeLibrary.resetContextManualOverrides(mode);
    setSchemaFilterConfig((prev) => ({
      ...prev,
      manualPackAdditions: new Set<string>(),
      manualPackRemovals: new Set<string>(),
    }));
  }, [nodeLibrary]);

  const handleEnhanceWithPack = useCallback((pack: {
    packId: string;
    packName: string;
    nodeCount: number;
  }) => {
    const nextAdded = new Set(schemaFilterConfig.manualPackAdditions);
    const nextRemoved = new Set(schemaFilterConfig.manualPackRemovals);
    nextAdded.add(pack.packId);
    nextRemoved.delete(pack.packId);

    const nextConfig: FilterConfig = {
      ...schemaFilterConfig,
      manualPackAdditions: nextAdded,
      manualPackRemovals: nextRemoved,
    };

    setSchemaFilterConfig(nextConfig);
    nodeLibrary.setContextManualOverrides(
      [...nextAdded],
      [...nextRemoved],
      inferPresetId(nextConfig) as FilterPresetId,
    );

    const topNodes = allNodeSchemas
      ? getPackTopNodes(pack.packId, allNodeSchemas as Record<string, any>, 8)
      : [];
    const nodeExamples = topNodes.length > 0
      ? `Key nodes available: ${topNodes.join(', ')}`
      : '';

    const prompt = [
      `I've added **${pack.packName}** (${pack.nodeCount} nodes) to the schema context.`,
      'Could you analyze my current workflow and suggest specific enhancements using nodes from this pack?',
      nodeExamples,
      'Please:',
      '1. Identify where in the workflow these nodes would add the most value.',
      '2. Show the exact connections (which node -> which input).',
      '3. Explain what quality or capability improvement each addition provides.',
    ].filter(Boolean).join('\n\n');

    setPendingContextMessage(prompt);
    toast.success(`${pack.packName} added to context — enhancement prompt ready`, { duration: 3000 });
  }, [schemaFilterConfig, nodeLibrary, allNodeSchemas]);

  const handleContextMentionModel = useCallback((filename: string, categoryLabel: string) => {
    setPendingContextMessage(`Use my installed ${categoryLabel} model: "${filename}"`);
    toast.message(`Prepared chat message with ${filename}`);
  }, []);

  const handleSchemaSelectorStateChange = useCallback((next: SelectorState) => {
    const selectedNodes = selectorClassifiedPacks.reduce(
      (sum, pack) => sum + countSelectedNodesForPack(next, pack),
      0,
    );
    setSchemaSelectorState(next);
  }, [selectorClassifiedPacks]);

  const schemaSelectorStale = lastSchemaSelectorAppliedAt > 0
    && schemaSelectorState.lastUpdated > lastSchemaSelectorAppliedAt;

  const handleApplyBrainstormToBuild = useCallback((brainstormContext: string) => {
    const trimmedContext = brainstormContext.trim();
    if (!trimmedContext) {
      toast.error('No brainstorm context found to apply.');
      return;
    }

    const modifyPrompt = [
      'Apply the following changes to my current workflow.',
      'Generate the actual workflow modifications.',
      '',
      trimmedContext,
    ].join('\n');

    setChatMode('build');
    setPendingBuildApplyMessage(modifyPrompt);
  }, []);

  const handleBrainstormBuild = useCallback((
    selectedClassTypes: string[],
    workflowTitle: string,
    workflowSummary: string,
  ) => {
    const normalizedClassTypes = [...new Set(
      selectedClassTypes
        .map((classType) => String(classType || '').trim())
        .filter((classType) => classType.length > 0),
    )];

    if (normalizedClassTypes.length === 0) {
      toast.error('No valid nodes selected for build.');
      return;
    }

    console.log(
      `[BrainstormBuild] Building "${workflowTitle || 'Untitled Workflow'}" with ${normalizedClassTypes.length} nodes:`,
      normalizedClassTypes,
    );

    const newSelectorState = createNodeSelectionFromRecommendation(
      normalizedClassTypes,
      selectorClassifiedPacks,
      'full',
    );
    const selectedNodes = selectorClassifiedPacks.reduce(
      (sum, pack) => sum + countSelectedNodesForPack(newSelectorState, pack),
      0,
    );
    console.log('[BrainstormBuild] Applying selector state:', {
      mode: newSelectorState.mode,
      selectedNodes,
    });

    setSchemaSelectorState(newSelectorState);
    setSchemaDrawerOpen(true);
    setChatMode('build');

    const recentBrainstormContext = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-6)
      .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content.trim()}`)
      .filter((line) => line.length > 0)
      .slice(-3)
      .join('\n\n');

    const buildPrompt = [
      `Build the following workflow: "${workflowTitle || 'Untitled Workflow'}"`,
      '',
      workflowSummary || 'Use the selected recommended nodes and produce a production-ready workflow.',
      '',
      `Use exactly these nodes (schemas are loaded): ${normalizedClassTypes.join(', ')}`,
      '',
      'Generate the complete workflow with all connections and correct parameter values.',
      'Use real model filenames from the available models list.',
      recentBrainstormContext ? `\n--- Brainstorm Context ---\n${recentBrainstormContext}` : '',
    ].filter(Boolean).join('\n');

    setPendingBuildApplyMessage(buildPrompt);
  }, [messages, selectorClassifiedPacks]);

  const handleCloseExtraction = useCallback(() => {
    setPendingRecommendation(null);
  }, []);

  const handleApplyAndBuild = useCallback((
    selectedClassTypes: string[],
    workflowTitle: string,
    workflowSummary: string,
  ) => {
    setPendingRecommendation(null);
    handleBrainstormBuild(selectedClassTypes, workflowTitle, workflowSummary);
  }, [handleBrainstormBuild]);

  const handleExtractNodes = useCallback(async () => {
    if (isExtractingNodes) return;

    const activeKey = getAPIKeyForModel(settings);
    const provider = getProviderForModel(settings.selectedModel, settings.customModels);
    if (!activeKey) {
      toast.error(`No API key set for ${PROVIDER_INFO[provider].name}. Add it in the Keys tab.`);
      return;
    }

    const brainstormMessages = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));

    if (brainstormMessages.length < 2) {
      toast.error('Need more brainstorm context before extracting nodes.');
      return;
    }

    setIsExtractingNodes(true);
    try {
      const extractionPrompt = buildNodeExtractionPrompt();
      const liveCache = getLiveNodeCache();
      const availableClassTypes = liveCache
        ? Object.keys(liveCache.nodes).sort().join(', ')
        : '';
      const enrichedExtractionPrompt = availableClassTypes
        ? `${extractionPrompt}\n\nAVAILABLE NODE CLASS_TYPES (use exact spelling):\n${availableClassTypes}`
        : extractionPrompt;
      const extractionMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...brainstormMessages,
        { role: 'user', content: enrichedExtractionPrompt },
      ];

      const systemPromptOverride = buildBrainstormPrompt(extractionPrompt);
      const response = await callAI({
        settings,
        messages: extractionMessages,
        systemPromptOverride,
      });

      const responseText = response.text || '';
      const inputChars = (systemPromptOverride?.length ?? 0)
        + extractionMessages.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);
      trackTokenUsage(
        settings.selectedModel,
        response.usage,
        inputChars,
        responseText.length,
      );

      const recommendation = parseRecommendedNodes(responseText);
      if (!recommendation) {
        toast.error('Could not extract node list. Try making the brainstorm plan more specific.');
        return;
      }

      const liveNodeMap = new Map<string, unknown>(
        Object.keys(getLiveNodeCache()?.nodes || {}).map((classType) => [classType, true]),
      );
      const validatedNodes = validateRecommendedNodes(recommendation.nodes, liveNodeMap);
      const availableCount = validatedNodes.filter((node) => node.available).length;

      console.log(
        `[ExtractNodes] Found ${validatedNodes.length} nodes (${availableCount} available) for "${recommendation.workflow_title}"`,
      );

      setPendingRecommendation({
        ...recommendation,
        nodes: validatedNodes,
      });
      toast.success(`Extracted ${validatedNodes.length} nodes (${availableCount} available).`);
    } catch (error) {
      console.error('[ExtractNodes] Extraction failed:', error);
      toast.error('Node extraction failed. Please try again.');
    } finally {
      setIsExtractingNodes(false);
    }
  }, [buildBrainstormPrompt, isExtractingNodes, messages, settings, trackTokenUsage]);

  useEffect(() => {
    if (!pendingBuildApplyMessage) return;
    if (chatMode !== 'build') return;
    if (isLoading) return;

    void handleSendMessage(pendingBuildApplyMessage);
    setPendingBuildApplyMessage(null);
    // After dispatching the build request, downgrade schema mode from 'full' → 'compact'
    // so subsequent chat/modify messages don't re-inject the full node schema corpus.
    setSchemaSelectorState((prev) =>
      prev.mode === 'full'
        ? { ...prev, mode: 'compact', lastUpdated: Date.now() }
        : prev,
    );
  }, [pendingBuildApplyMessage, chatMode, isLoading, handleSendMessage]);

  useEffect(() => {
    const comfyUrl = settings.comfyuiUrl?.trim();
    if (!comfyUrl || !comfyuiStatus.isOnline) return;
    if (autoLiveSyncInFlightRef.current) return;

    const cache = getLiveNodeCache();
    const cacheAgeMs = cache ? Date.now() - cache.timestamp : Number.POSITIVE_INFINITY;
    const cacheTarget = cache?.url || '';
    const isSameTarget = cacheTarget === comfyUrl || (comfyUrl.startsWith('/') && cacheTarget.endsWith(comfyUrl));
    const isFresh = !!cache && isSameTarget && cacheAgeMs < LIVE_NODE_CACHE_FRESH_MS;
    if (isFresh) return;

    autoLiveSyncInFlightRef.current = true;
    void fetchAndCacheObjectInfo(comfyUrl)
      .then((synced) => {
        setLiveNodeCount(synced.nodeCount);
      })
      .catch(() => {
        // Silent background sync: avoid noisy errors in normal app usage.
      })
      .finally(() => {
        autoLiveSyncInFlightRef.current = false;
      });
  }, [settings.comfyuiUrl, comfyuiStatus.isOnline]);

  useEffect(() => {
    const comfyUrl = settings.comfyuiUrl?.trim();
    if (!comfyUrl) return;
    if (!(comfyWS.connected || liveNodeCount > 0)) return;

    void getObjectInfo(comfyUrl).catch(() => {});
  }, [settings.comfyuiUrl, comfyWS.connected, liveNodeCount]);

  useEffect(() => {
    modelLibrary.refreshInventory();
  }, [liveNodeCount, modelLibrary.refreshInventory]);

  useEffect(() => {
    if (comfyuiStatus.recoveryCount <= statusRecoverySeenRef.current) return;
    statusRecoverySeenRef.current = comfyuiStatus.recoveryCount;

    void manager.recheckManager();

    if (!currentWorkflow) return;
    void analyzeWorkflow(currentWorkflow, nodeLibrary.isPinned, undefined, settings.comfyuiUrl)
      .then((analysis) => {
        setCurrentAnalysis(analysis);
      })
      .catch(() => {
        // keep refresh best-effort
      });
  }, [
    comfyuiStatus.recoveryCount,
    manager,
    currentWorkflow,
    nodeLibrary.isPinned,
    settings.comfyuiUrl,
  ]);

  useEffect(() => {
    if (comfyuiStatus.managerListRevision <= managerListRevisionSeenRef.current) return;
    managerListRevisionSeenRef.current = comfyuiStatus.managerListRevision;

    void fetchCustomNodeRegistry()
      .then(async (packs) => {
        const detected = await detectInstalledPacks(undefined, packs);
        setInstalledPacks(detected);
      })
      .catch(() => {
        // Keep installed-pack detection best effort.
      });

    if (!currentWorkflow) return;

    void analyzeWorkflow(currentWorkflow, nodeLibrary.isPinned, undefined, settings.comfyuiUrl)
      .then((analysis) => {
        setCurrentAnalysis(analysis);
      })
      .catch(() => {
        // keep refresh best-effort
      });
  }, [
    comfyuiStatus.managerListRevision,
    currentWorkflow,
    nodeLibrary.isPinned,
    settings.comfyuiUrl,
  ]);

  // â”€â”€ Phase 2: Execute workflow on ComfyUI â”€â”€

  const comfyuiConnected = liveNodeCount > 0 && !!settings.comfyuiUrl?.trim();
  const stableDetectedPacks = currentAnalysis?.detectedPacks ?? EMPTY_DETECTED_PACKS;
  const selectedModelProvider = useMemo(
    () => getProviderForModel(settings.selectedModel, settings.customModels),
    [settings.selectedModel, settings.customModels],
  );
  const selectedModelDisplayName = useMemo(() => {
    const models = getAllModels(settings.customModels);
    const selected = models.find((entry) => entry.id === settings.selectedModel);
    return selected?.name || settings.selectedModel || 'No model selected';
  }, [settings.customModels, settings.selectedModel]);
  const schemaRailTokenCount = useMemo(
    () => estimateSchemaTokens(schemaSelectorState, selectorClassifiedPacks),
    [schemaSelectorState, selectorClassifiedPacks],
  );
  const schemaRailSelectedPackCount = useMemo(
    () => getSelectedPackIds(schemaSelectorState, selectorClassifiedPacks).length,
    [schemaSelectorState, selectorClassifiedPacks],
  );
  const schemaRailTokenLimit = useMemo(
    () => resolveModelContextLimit(settings.selectedModel || '', selectedModelProvider, settings.customModels).contextLimit,
    [settings.selectedModel, selectedModelProvider, settings.customModels],
  );

  const executeOnComfyUI = useCallback((workflowToExecute: ComfyUIWorkflow) => {
    if (!settings.comfyuiUrl) {
      toast.error('No ComfyUI URL configured');
      return;
    }

    setExecutionResult(null);
    setLastExecutedWorkflowRef(null);
    setExecutionProgress({ status: 'queued', completedNodes: [] });

    const { promise, cancel } = executeWorkflow(
      settings.comfyuiUrl,
      workflowToExecute,
      (progress) => {
        setExecutionProgress(progress);
      },
    );

    cancelExecutionRef.current = cancel;

    promise
      .then((result) => {
        setExecutionResult(result);
        setLastExecutedWorkflowRef(result.success ? workflowToExecute : null);
        setExecutionProgress(null);
        cancelExecutionRef.current = null;
        if (result.success && result.promptId) {
          setSessionPromptIds((prev) => {
            if (prev.has(result.promptId)) return prev;
            const next = new Set(prev);
            next.add(result.promptId);
            return next;
          });
        }

        if (result.success) {
          toast.success(`Workflow complete! ${result.images.length} image${result.images.length !== 1 ? 's' : ''} generated`);
        } else {
          toast.error(result.error || 'Execution failed');
        }
      })
      .catch((err) => {
        setExecutionProgress(null);
        cancelExecutionRef.current = null;
        setLastExecutedWorkflowRef(null);
        setExecutionResult({
          success: false,
          promptId: '',
          images: [],
          error: err.message || 'Execution failed',
          durationMs: 0,
        });
        toast.error(err.message || 'Execution failed');
      });
  }, [settings.comfyuiUrl]);

  const runValidation = useCallback((workflowToValidate: ComfyUIWorkflow) => {
    const result = validateWorkflowPipeline(workflowToValidate, validationOptions);
    setValidationResult(result);
    return result;
  }, [validationOptions]);

  const runLiveSchemaPreflight = useCallback((workflowToValidate: ComfyUIWorkflow): SchemaValidationResult | null => {
    const liveObjectInfo = getRawObjectInfo() || getLiveNodeCache()?.nodes;
    if (!liveObjectInfo || Object.keys(liveObjectInfo).length === 0) {
      return null;
    }
    const apiWorkflow = convertGraphToAPI(workflowToValidate);
    return validateWorkflowAgainstSchema(apiWorkflow, liveObjectInfo as Record<string, unknown>);
  }, []);

  const injectErrorContextIntoChat = useCallback((errorContext: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'system',
        content: errorContext,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const handleSchemaValidationFix = useCallback(() => {
    if (!schemaValidationGate) return;
    const fixPrompt = buildSchemaFixPrompt(
      schemaValidationGate.workflow,
      schemaValidationGate.result.errors,
    );
    setSchemaValidationGate(null);
    void handleSendMessage(fixPrompt);
  }, [schemaValidationGate, handleSendMessage]);

  const handleSchemaValidationProceed = useCallback(() => {
    if (!schemaValidationGate) return;
    const workflowToExecute = schemaValidationGate.workflow;
    setSchemaValidationGate(null);
    toast.warning('Queued despite schema validation errors.');
    executeOnComfyUI(workflowToExecute);
  }, [schemaValidationGate, executeOnComfyUI]);

  const handleExecuteWorkflow = useCallback(() => {
    if (!currentWorkflow) {
      toast.error('No workflow loaded.');
      return;
    }

    const result = runValidation(currentWorkflow);
    if (result.isValid && !result.wasModified) {
      const schemaPreflight = runLiveSchemaPreflight(currentWorkflow);
      if (schemaPreflight && !schemaPreflight.valid) {
        setSchemaValidationGate({
          workflow: currentWorkflow,
          result: schemaPreflight,
        });
        toast.error(`Schema validation blocked queue (${schemaPreflight.errors.length} error${schemaPreflight.errors.length === 1 ? '' : 's'}).`);
        return;
      }
      executeOnComfyUI(currentWorkflow);
      return;
    }

    setShowValidationReport(true);
    if (result.isValid) {
      toast.info(`Validation auto-fixed ${result.stats.autoFixed} issue(s). Review and execute.`);
    } else {
      toast.error(`Validation blocked execution (${result.stats.unfixable} unfixable error${result.stats.unfixable !== 1 ? 's' : ''}).`);
    }
  }, [currentWorkflow, executeOnComfyUI, runValidation, runLiveSchemaPreflight]);

  const handleCancelExecution = useCallback(() => {
    if (cancelExecutionRef.current) {
      cancelExecutionRef.current();
      cancelExecutionRef.current = null;
    }
    // Also send interrupt to ComfyUI
    if (settings.comfyuiUrl) {
      interruptExecution(settings.comfyuiUrl).catch(() => {});
    }
    setExecutionProgress(null);
    toast.info('Execution cancelled');
  }, [settings.comfyuiUrl]);

  const handleCloseExecutionPanel = useCallback(() => {
    setExecutionProgress(null);
    setExecutionResult(null);
  }, []);

  const isExecuting = executionProgress?.status === 'queued' || executionProgress?.status === 'running';

  // â”€â”€ Phase 4: Debug execution errors with AI â”€â”€

  const errorNodeId = executionResult?.errorDetails?.nodeId || null;

  const handleDebugError = useCallback(async () => {
    if (!executionResult || !currentWorkflow) return;

    const debugPrompt = buildDebugPrompt(executionResult, currentWorkflow);

    // Send the debug prompt through the normal chat flow
    await handleSendMessage(debugPrompt);
  }, [executionResult, currentWorkflow, handleSendMessage]);

  const handleLoadWorkflow = useCallback((workflow: Record<string, unknown>, sourceLabel?: string) => {
    if (
      workflow &&
      typeof workflow === 'object' &&
      Array.isArray((workflow as { nodes?: unknown }).nodes)
    ) {
      commitWorkflowChange(
        workflow as unknown as ComfyUIWorkflow,
        sourceLabel || 'Loaded from history',
      );
      toast.success(sourceLabel || 'Workflow loaded from history');
    } else {
      toast.warning('History entry does not contain a graph-format workflow');
    }
  }, [commitWorkflowChange]);

  const handleLoadWorkflowFromGallery = useCallback((workflowJson: Record<string, unknown>, sourceLabel?: string) => {
    void (async () => {
      if (!workflowJson || typeof workflowJson !== 'object') {
        toast.error('No workflow data available for this image');
        return;
      }

      const format = detectWorkflowFormat(workflowJson);
      let graphWorkflow: ComfyUIWorkflow;

      try {
        if (format === 'graph') {
          graphWorkflow = workflowJson as unknown as ComfyUIWorkflow;
        } else if (format === 'api') {
          graphWorkflow = convertAPIToGraph(workflowJson as Record<string, any>);
        } else {
          toast.error('Unsupported workflow format in gallery metadata');
          return;
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to decode workflow from gallery');
        return;
      }

      const enriched = enrichWorkflowNodes(graphWorkflow);
      const laidOut = resolveOverlaps(autoLayoutWorkflow(enriched));

      await loadWorkflowIntoApp(laidOut, sourceLabel || 'Gallery history', {
        summaryFallback: 'Loaded workflow from gallery history',
        toastMessage: 'Workflow loaded from gallery',
        noteName: 'Gallery history',
        noteDescription: 'Loaded from gallery history',
        commitLabel: 'Loaded from gallery history',
      });
    })();
  }, [loadWorkflowIntoApp]);

  const refreshComfyUIWorkflowFolders = useCallback(async (): Promise<string[]> => {
    const comfyUrl = settings.comfyuiUrl || '';
    if (!comfyUrl.trim()) {
      setComfyuiWorkflowSubfolders([]);
      return [];
    }
    try {
      const files = await listComfyUIWorkflows(comfyUrl);
      const folders = Array.from(new Set(files.map((file) => file.subfolder).filter(Boolean))).sort();
      setComfyuiWorkflowSubfolders(folders);
      return folders;
    } catch (error) {
      console.warn('[ComfyUI Sync] Failed to refresh workflow folders:', error);
      setComfyuiWorkflowSubfolders([]);
      return [];
    }
  }, [settings.comfyuiUrl]);

  useEffect(() => {
    void refreshComfyUIWorkflowFolders();
  }, [refreshComfyUIWorkflowFolders]);

  const handleLoadComfyUIWorkflow = useCallback(async (path: string): Promise<boolean> => {
    const comfyUrl = settings.comfyuiUrl || '';
    if (!comfyUrl.trim()) {
      toast.error('ComfyUI not connected');
      return false;
    }

    try {
      const workflowJson = await loadComfyUIWorkflow(comfyUrl, path);
      const format = detectWorkflowFormat(workflowJson);

      let graphWorkflow: ComfyUIWorkflow;
      if (format === 'graph') {
        graphWorkflow = workflowJson as unknown as ComfyUIWorkflow;
      } else if (format === 'api') {
        graphWorkflow = convertAPIToGraph(workflowJson as Record<string, any>);
      } else {
        toast.error('Unrecognized workflow format');
        return false;
      }

      const enriched = enrichWorkflowNodes(graphWorkflow);
      const laidOut = resolveOverlaps(autoLayoutWorkflow(enriched));

      await loadWorkflowIntoApp(laidOut, path, {
        summaryFallback: `Loaded workflow from ComfyUI folder: ${path}`,
        toastMessage: `Loaded: ${path}`,
        noteName: `ComfyUI Folder: ${path}`,
        noteDescription: `Loaded from ComfyUI folder: ${path}`,
        commitLabel: `Loaded from ComfyUI folder: ${path}`,
      });

      return true;
    } catch (err: any) {
      toast.error(`Failed to load: ${err?.message || path}`);
      return false;
    }
  }, [loadWorkflowIntoApp, settings.comfyuiUrl]);

  const handleSaveToComfyUI = useCallback(async (filename: string) => {
    const comfyUrl = settings.comfyuiUrl || '';
    if (!comfyUrl.trim()) {
      toast.error('ComfyUI not connected');
      return;
    }
    if (!currentWorkflow) {
      toast.error('No workflow to save');
      return;
    }

    const savedName = await saveComfyUIWorkflow(
      comfyUrl,
      filename,
      currentWorkflow as unknown as Record<string, unknown>,
      false,
    );
    toast.success(`Saved to ComfyUI: ${savedName}`);
    void refreshComfyUIWorkflowFolders();
  }, [currentWorkflow, refreshComfyUIWorkflowFolders, settings.comfyuiUrl]);

  const handleRerun = useCallback((workflow: Record<string, unknown>) => {
    const rerunWorkflow = workflow as ComfyUIWorkflow;
    commitWorkflowChange(rerunWorkflow, 'Loaded from history (rerun)');
    const result = runValidation(rerunWorkflow);
    if (result.isValid && !result.wasModified) {
      const schemaPreflight = runLiveSchemaPreflight(rerunWorkflow);
      if (schemaPreflight && !schemaPreflight.valid) {
        setSchemaValidationGate({
          workflow: rerunWorkflow,
          result: schemaPreflight,
        });
        toast.error(`Schema validation blocked queue (${schemaPreflight.errors.length} error${schemaPreflight.errors.length === 1 ? '' : 's'}).`);
        return;
      }
      executeOnComfyUI(rerunWorkflow);
      return;
    }

    setShowValidationReport(true);
  }, [commitWorkflowChange, executeOnComfyUI, runValidation, runLiveSchemaPreflight]);

  const handleUndo = useCallback(() => {
    const label = workflowHistory.undoLabel || 'previous state';
    const prev = workflowHistory.undo();
    if (prev) {
      setCurrentWorkflow(prev);
      toast.info(`Undo: ${label}`);
    }
  }, [workflowHistory]);

  const handleRedo = useCallback(() => {
    const label = workflowHistory.redoLabel || 'next state';
    const next = workflowHistory.redo();
    if (next) {
      setCurrentWorkflow(next);
      toast.info(`Redo: ${label}`);
    }
  }, [workflowHistory]);

  const handleWorkflowChange = useCallback((workflow: ComfyUIWorkflow, label: string) => {
    commitWorkflowChange(workflow, label);
  }, [commitWorkflowChange]);

  const handleAutoLayout = useCallback(() => {
    if (!currentWorkflow) return;
    const layouted = resolveOverlaps(autoLayoutWorkflow(currentWorkflow));
    commitWorkflowChange(layouted, 'Auto layout');
    toast.success('Layout applied');
  }, [currentWorkflow, commitWorkflowChange]);

  const handleAcceptOptimizedWorkflow = useCallback((optimizedWorkflow: ComfyUIWorkflow) => {
    setCurrentWorkflow(optimizedWorkflow);
    setShowExperimentPanel(false);
    toast.success('Optimized workflow applied to canvas');
  }, []);

  const handleApplyOptimizedWorkflow = useCallback((optimizedWorkflow: ComfyUIWorkflow) => {
    setCurrentWorkflow(optimizedWorkflow);
  }, []);

  // REMOVED: Templates feature — handleCombineWorkflowsRequest, handleConfirmCombineWorkflows

  return (
    <>
    <CommandCenter
      currentWorkflow={currentWorkflow ?? undefined}
      onLoadWorkflow={handleLoadWorkflow}
      onLoadGalleryWorkflow={handleLoadWorkflowFromGallery}
      onLoadComfyUIWorkflow={handleLoadComfyUIWorkflow}
      onRerun={handleRerun}
      openChatTabSignal={openChatTabSignal}
      comfyuiUrl={settings.comfyuiUrl}
      onComfyUrlChange={handleComfyUrlChange}
      wsConnected={comfyWS.connected}
      wsQueueRunning={comfyWS.queueRunning}
      wsQueuePending={comfyWS.queuePending}
      onWsReconnect={comfyWS.reconnect}
      managerAvailable={manager.managerAvailable}
      preferences={preferences}
      onPreferencesChange={handlePreferencesChange}
      onUndo={handleUndo}
      onRedo={handleRedo}
      sessionPromptIds={sessionPromptIds}
      onComfyUIWorkflowFoldersChange={setComfyuiWorkflowSubfolders}
      onWorkflowSendToChat={handleWorkflowSendToChat}
    >
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <AppHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        comfyuiOnline={comfyWS.connected || liveNodeCount > 0}
        comfyuiUrl={settings.comfyuiUrl}
        wsConnected={comfyWS.connected}
        wsQueueRunning={comfyWS.queueRunning}
        wsQueuePending={comfyWS.queuePending}
        wsExecution={comfyWS.execution}
        onOpenWorkflowMerger={handleOpenWorkflowMerger}
      />

      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Schema Drawer + Chat */}
        <div className="flex overflow-hidden" style={{ width: `${splitPosition}%` }}>
          <SchemaDrawerPanel
            isOpen={schemaDrawerOpen}
            onToggle={toggleSchemaDrawer}
            width={schemaDrawerWidth}
            onWidthChange={setSchemaDrawerWidth}
            tokenCount={schemaRailTokenCount}
            tokenLimit={schemaRailTokenLimit}
            selectedPackCount={schemaRailSelectedPackCount}
            schemaSelectorState={schemaSelectorState}
            schemaSelectorPacks={selectorClassifiedPacks}
            onSchemaSelectorStateChange={handleSchemaSelectorStateChange}
            schemaSelectorStale={schemaSelectorStale}
            modelInventory={modelLibrary.inventory}
            modelCategories={modelLibrary.allCategories}
            modelSelectedCategories={modelLibrary.selectedCategories}
            modelActivePreset={modelLibrary.activePreset}
            modelCategoryTokens={modelLibrary.categoryTokens}
            modelLibraryTokens={modelLibrary.totalTokens}
            modelLibraryFiles={modelLibrary.totalFiles}
            modelLibraryLoading={modelLibrary.isLoading}
            onApplyModelPreset={modelLibrary.applyPreset}
            onToggleModelCategory={modelLibrary.setCategorySelected}
            onResetModelCategories={modelLibrary.resetSelectedCategories}
            onMentionModel={handleContextMentionModel}
            comfyuiUrl={settings.comfyuiUrl}
            onLoadWorkflowPath={handleLoadComfyUIWorkflow}
            onSendWorkflowToChat={handleWorkflowSendToChat}
          />

          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <ProviderConfig
              settings={settings}
              onSettingsChange={handleSettingsChange}
              pinnedPacks={nodeLibrary.pinnedPacks}
              libraryMode={nodeLibrary.mode}
              onUnpinPack={nodeLibrary.unpinPack}
              onToggleLibraryMode={nodeLibrary.toggleMode}
              onClearLibrary={nodeLibrary.clearAll}
              onOpenNodesBrowser={handleOpenNodesBrowser}
              onExportLibrary={nodeLibrary.exportLibrary}
              onImportLibrary={nodeLibrary.importLibrary}
              learnedPackIds={learnedPackIds}
              learningPackId={learningPackId}
              learningProgress={learningProgress}
              onLearnPack={handleLearnPack}
              onClearLearnedSchemas={handleClearLearnedSchemas}
              learnedNodeCounts={learnedNodeCounts}
              liveNodeCount={liveNodeCount}
              onLiveNodesSync={handleLiveNodesSync}
              onInstalledPacksDetected={handleInstalledPacksDetected}
              installedPacksCount={installedPacks.length}
            />
            <div className="flex-1 overflow-hidden">
              <ChatPanel
                messages={messages}
                isLoading={isLoading}
                streamingContent={streamingContent}
                chatMode={chatMode}
                onChatModeChange={setChatMode}
                onSendMessage={handleSendMessage}
                onStop={handleStopGeneration}
                onApplyBrainstormToBuild={handleApplyBrainstormToBuild}
                onBrainstormBuild={handleBrainstormBuild}
                onExtractNodes={handleExtractNodes}
                isExtracting={isExtractingNodes}
                pendingRecommendation={pendingRecommendation}
                onApplyAndBuild={handleApplyAndBuild}
                onCloseExtraction={handleCloseExtraction}
                onClearChat={handleClearChat}
                onPasteDocs={handlePasteDocs}
                useLibraryReferences={useLibraryReferences}
                onToggleLibraryReferences={() => setUseLibraryReferences((prev) => !prev)}
                correctionStatus={correctionStatus}
                onImportWorkflow={handleImportWorkflow}
                isPinned={nodeLibrary.isPinned}
                onPinPack={nodeLibrary.pinPack}
                onUnpinPack={nodeLibrary.unpinPack}
                onPinMultiple={nodeLibrary.pinMultiple}
                pinnedPacks={nodeLibrary.pinnedPacks}
                libraryMode={nodeLibrary.mode}
                onToggleMode={nodeLibrary.toggleMode}
                onOpenNodesBrowser={handleOpenNodesBrowser}
                onLearnPack={handleLearnPack}
                learnedPackIds={learnedPackIds}
                learningPackId={learningPackId}
                selectedNodeCount={selectedNodeIds.size}
                onClearSelection={handleClearNodeSelection}
                currentWorkflow={currentWorkflow}
                detectedPacks={stableDetectedPacks}
                modelSlots={currentAnalysis?.modelSlots || []}
                comfyuiUrl={settings.comfyuiUrl}
                huggingfaceApiKey={settings.huggingfaceApiKey}
                civitaiApiKey={settings.civitaiApiKey}
                onExecuteWorkflow={handleExecuteWorkflow}
                managerApi={manager}
                comfyuiStatus={comfyuiStatus}
                contextSystemPrompt={lastSystemPrompt}
                contextWorkflowMetadata={contextWorkflowMetadata}
                contextNodeSchemas={contextNodeSchemas}
                contextAllNodeSchemas={allNodeSchemas}
                contextNodeSchemasByPack={contextNodeSchemasByPack}
                contextConversationHistory={messages.map((message) => message.content)}
                contextSelectedModelId={settings.selectedModel}
                contextSelectedModelName={selectedModelDisplayName}
                contextSelectedModelProvider={selectedModelProvider}
                contextCustomModels={settings.customModels}
                contextFilterConfig={schemaFilterConfig}
                onContextFilterConfigChange={setSchemaFilterConfig}
                contextManualPackAdditions={nodeLibrary.manuallyAdded}
                contextManualPackRemovals={nodeLibrary.manuallyRemoved}
                onContextManualOverridesChange={handleContextManualOverridesChange}
                onContextManualOverridesReset={handleContextManualOverridesReset}
                onContextEnhanceWithPack={handleEnhanceWithPack}
                contextModelLibraryPrompt={modelLibraryPromptSection}
                contextModelInventory={modelLibrary.inventory}
                contextModelCategories={modelLibrary.allCategories}
                contextModelSelectedCategories={modelLibrary.selectedCategories}
                contextModelActivePreset={modelLibrary.activePreset}
                contextModelCategoryTokens={modelLibrary.categoryTokens}
                contextModelLibraryTokens={modelLibrary.totalTokens}
                contextModelLibraryFiles={modelLibrary.totalFiles}
                contextModelLibraryLoading={modelLibrary.isLoading}
                onContextModelPresetApply={modelLibrary.applyPreset}
                onContextModelCategoryToggle={modelLibrary.setCategorySelected}
                onContextModelCategoriesReset={modelLibrary.resetSelectedCategories}
                onContextMentionModel={handleContextMentionModel}
                onToggleSchemaDrawer={toggleSchemaDrawer}
                schemaDrawerOpen={schemaDrawerOpen}
                pendingMessage={pendingContextMessage}
                onPendingMessageHandled={() => setPendingContextMessage(null)}
              />
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div
          className="w-1 shrink-0 bg-border hover:bg-primary/30 cursor-col-resize relative group transition-colors"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-primary" />
          </div>
        </div>

        {/* Right Panel: Visualizer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--surface-200)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontSize: '13px',
              },
            }}
            containerStyle={{ top: 12, right: 12, zIndex: 50 }}
          />
          <ReactFlowProvider>
            <div className="flex-1 overflow-hidden relative">
              <WorkflowVisualizer
                workflow={currentWorkflow}
                onImportWorkflow={handleImportWorkflow}
                onAutoLayout={handleAutoLayout}
                selectedNodeIds={selectedNodeIds}
                onToggleNodeSelection={handleToggleNodeSelection}
                onClearSelection={handleClearNodeSelection}
                onWorkflowChange={handleWorkflowChange}
                errorNodeId={errorNodeId}
                comfyuiUrl={settings.comfyuiUrl}
                providerSettings={settings}
                architectureHint={currentAnalysis?.architecture}
              />
              <TokenUsageHUD usage={sessionTokenUsage} onReset={resetTokenUsage} />
            </div>
          </ReactFlowProvider>

          {/* Execution results panel â€” overlays above the actions bar */}
          <ExecutionPanel
            progress={executionProgress}
            result={executionResult}
            onClose={handleCloseExecutionPanel}
            onCancel={handleCancelExecution}
            onDebugError={handleDebugError}
            isDebugging={isLoading}
          />

          <div className="px-3 pt-2 flex items-center justify-end gap-2">
            <ValidationBadge
              workflow={currentWorkflow}
              onClick={() => {
                if (!currentWorkflow) return;
                const result = runValidation(currentWorkflow);
                setShowValidationReport(true);
                setQuickValidationStatus({
                  valid: result.isValid,
                  errorCount: result.stats.unfixable,
                  warningCount: result.issues.filter((issue) => issue.severity === 'warning').length,
                });
              }}
              lastValidation={validationResult
                ? {
                    confidence: validationResult.confidence,
                    autoFixed: validationResult.stats.autoFixed,
                    unfixable: validationResult.stats.unfixable,
                  }
                : quickValidationStatus && quickValidationStatus.errorCount > 0
                  ? {
                      confidence: 0,
                      autoFixed: 0,
                      unfixable: quickValidationStatus.errorCount,
                    }
                : undefined}
            />
            <ValidationSettingsDropdown
              options={validationOptions}
              onChange={setValidationOptions}
            />
          </div>

          <WorkflowActions
            workflow={currentWorkflow}
            requiredNodes={requiredNodes}
            onRequestFix={handleRequestFix}
            onImportWorkflow={handleImportWorkflow}
            onOpenNodesBrowser={handleOpenNodesBrowser}
            onSaveToComfyUI={handleSaveToComfyUI}
            comfyuiWorkflowSubfolders={comfyuiWorkflowSubfolders}
            isLoading={isLoading}
            comfyuiConnected={comfyuiConnected}
            isExecuting={isExecuting}
            onExecute={handleExecuteWorkflow}
            onCancelExecution={handleCancelExecution}
            onOpenExperiment={handleOpenExperiment}
            canUndo={workflowHistory.canUndo}
            canRedo={workflowHistory.canRedo}
            undoLabel={workflowHistory.undoLabel}
            redoLabel={workflowHistory.redoLabel}
            onUndo={handleUndo}
            onRedo={handleRedo}
            workflowAnalysis={currentAnalysis}
          />
        </div>
      </div>

      {/* Custom Nodes Browser modal — rendered at root level */}

      {showWorkflowMerger && (
        <MergeWizardPanel
          onLoadMergedWorkflow={handleLoadMergedWorkflow}
          onClose={() => setShowWorkflowMerger(false)}
          currentWorkflow={currentWorkflow}
          currentWorkflowName="Current Workflow"
        />
      )}

      {schemaValidationGate && (
        <ValidationPanel
          errors={schemaValidationGate.result.errors}
          warnings={schemaValidationGate.result.warnings}
          onFix={handleSchemaValidationFix}
          onProceed={handleSchemaValidationProceed}
          onCancel={() => setSchemaValidationGate(null)}
        />
      )}

      {showValidationReport && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <ValidationReportPanel
            result={validationResult}
            onProceed={() => {
              if (!validationResult) return;
              executeOnComfyUI(validationResult.fixedWorkflow as ComfyUIWorkflow);
              setShowValidationReport(false);
            }}
            onRetryWithAI={() => {
              if (validationResult.errorContextForAI) {
                injectErrorContextIntoChat(validationResult.errorContextForAI);
                toast.info('Validation errors added to chat context. Ask AI to regenerate the workflow.');
              }
              setShowValidationReport(false);
            }}
            onCancel={() => setShowValidationReport(false)}
            onDismiss={() => setShowValidationReport(false)}
          />
        </div>
      )}

      {showModificationReport && modificationResult && pendingModifiedWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <ModificationReportPanel
            modResult={modificationResult}
            validationResult={validationResult}
            onAccept={async () => {
              const labeled = applyAutoWorkflowNote(
                pendingModifiedWorkflow,
                'AI modified workflow',
                'AI modified workflow',
              );
              commitWorkflowChange(labeled, 'AI modified workflow');
              setShowModificationReport(false);
              setPendingModifiedWorkflow(null);
              setModificationResult(null);

              try {
                const analysis = await analyzeWorkflow(labeled, nodeLibrary.isPinned, undefined, settings.comfyuiUrl);
                if (analysis) setCurrentAnalysis(analysis);
              } catch (err) {
                console.warn('Workflow analysis failed (non-critical):', err);
              }
            }}
            onReject={() => {
              setShowModificationReport(false);
              setPendingModifiedWorkflow(null);
              setModificationResult(null);
              toast.info('Modification rejected.');
            }}
            onRetryWithAI={() => {
              const failedOps = modificationResult.operationResults
                .filter((result) => !result.success)
                .map((result) => `FAILED ${result.op.op}: ${result.message}${result.error ? ` (${result.error})` : ''}`);
              const validationErrors = validationResult?.errorContextForAI
                ? [validationResult.errorContextForAI]
                : [];
              const context = [...failedOps, ...validationErrors].join('\n');
              if (context.trim().length > 0) {
                injectErrorContextIntoChat(context);
                toast.info('Modification errors added to chat context.');
              }
              setShowModificationReport(false);
            }}
          />
        </div>
      )}

      {/* Custom Nodes Browser modal â€” rendered at root level */}
      {showNodesBrowser && (
        <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center text-xs text-text-secondary">Loading browser...</div>}>
          <CustomNodesBrowser
            isOpen={showNodesBrowser}
            onClose={() => setShowNodesBrowser(false)}
            workflow={currentWorkflow}
            comfyuiUrl={settings.comfyuiUrl}
            installedPacks={installedPacks}
            isPinned={nodeLibrary.isPinned}
            onPinPack={nodeLibrary.pinPack}
            onUnpinPack={nodeLibrary.unpinPack}
            pinnedCount={nodeLibrary.packCount}
          />
        </Suspense>
      )}

      {/* Experiment Panel modal â€” rendered at root level */}
      <ExperimentPanel
        isOpen={showExperimentPanel}
        onClose={() => setShowExperimentPanel(false)}
        workflow={currentWorkflow}
        comfyuiUrl={settings.comfyuiUrl || ''}
        lastExecutionImages={
          executionResult?.success && currentWorkflow && lastExecutedWorkflowRef === currentWorkflow
            ? executionResult.images
            : []
        }
        onCallAI={handleExperimentAICall}
        onAcceptOptimized={handleAcceptOptimizedWorkflow}
        onApplyOptimized={handleApplyOptimizedWorkflow}
      />
      </div>
    </CommandCenter>

    </>
  );
}








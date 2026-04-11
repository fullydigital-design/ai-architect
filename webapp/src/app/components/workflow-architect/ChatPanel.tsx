import { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Loader2, Square, Trash2, FileText, Plus, Wand2, Upload, Lightbulb, Wrench, Zap, Library as LibraryIcon, Puzzle } from 'lucide-react';
import { defaultUrlTransform } from 'react-markdown';
import type { Components } from 'react-markdown';
import type { ComfyUIWorkflow, Message } from '../../../types/comfyui';
import type { CustomModel } from '../../../types/comfyui';
import { getLiveNodeCache, type InstalledModels } from '../../../services/comfyui-backend';
import type { ModelPreset } from '../../../hooks/useModelLibrary';
import type { CustomNodePackInfo } from '../../../data/custom-node-registry';
import type { DetectedPack, ModelSlot } from '../../../services/workflow-analyzer';
import { fetchCustomNodeRegistry, buildPackLookup, findPackBySlug } from '../../../data/custom-node-registry';
import type { PinnedNodePack, LibraryMode } from '../../../hooks/useNodeLibrary';
import { PROMPT_TEMPLATES } from '../../../data/prompt-templates';
import { PackChip } from './PackChip';
import { PackActionBar } from './PackActionBar';
import { ActiveContextBar } from './ActiveContextBar';
import { WorkflowRequirementsPanel } from './WorkflowRequirementsPanel';
import { ComfyUIStatusBar } from './ComfyUIStatusBar';
import { SuggestedQuestions } from './SuggestedQuestions';
import { BrainstormChipsBar, BRAINSTORM_CHIPS, getContextualChips } from './BrainstormChips';
import type { BrainstormChip } from './BrainstormChips';
import { RichMessage } from './RichMessage';
import { ContextTokenIndicator } from '../context-token-indicator/ContextTokenIndicator';
import { generateSuggestedQuestions } from '../../../services/question-suggester';
import type { SuggestedQuestion } from '../../../services/question-suggester';
import { getObjectInfo } from '../../../services/comfyui-object-info-cache';
import {
  type RecommendedNode,
  type WorkflowRecommendation,
  stripRecommendationBlock,
  validateRecommendedNodes,
} from '../../../services/brainstorm-parser';
import type { FilterConfig, FilterPresetId } from '../../../services/node-schema-filter';
import type { UseManagerAPIReturn } from '../../../hooks/useManagerAPI';
import type { UseComfyUIStatusResult } from '../../../hooks/useComfyUIStatus';
import { RecommendationCard } from '../RecommendationCard';
import { NodeExtractionPanel } from '../NodeExtractionPanel';

// ---- URL transform that allows pack:// protocol -----------------------------

function packUrlTransform(url: string): string {
  if (url.startsWith('pack://')) return url;
  return defaultUrlTransform(url);
}

// ---- Pack tag helpers -------------------------------------------------------

const PACK_TAG_RE = /\{\{pack:([^}]+)\}\}/g;

/** Extract all unique slugs from a message content string */
function extractPackSlugs(content: string): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  let match;
  const re = new RegExp(PACK_TAG_RE.source, 'g');
  while ((match = re.exec(content)) !== null) {
    const slug = match[1].trim();
    if (!seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs;
}

/**
 * Replace {{pack:slug}} with a markdown link [pack-chip:slug](pack://slug)
 * so ReactMarkdown can render it as an <a> tag that we intercept.
 */
function preprocessPackTags(content: string): string {
  return content.replace(PACK_TAG_RE, (_full, slug: string) => {
    const s = slug.trim();
    return `[pack-chip:${s}](pack://${s})`;
  });
}

// ---- Props ------------------------------------------------------------------

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  chatMode: 'build' | 'brainstorm';
  onChatModeChange?: (mode: 'build' | 'brainstorm') => void;
  onSendMessage: (message: string) => void;
  onStop?: () => void;
  onApplyBrainstormToBuild?: (brainstormContext: string) => void;
  onBrainstormBuild?: (selectedClassTypes: string[], workflowTitle: string, workflowSummary: string) => void;
  onExtractNodes?: () => void;
  isExtracting?: boolean;
  pendingRecommendation?: (WorkflowRecommendation & { nodes: Array<RecommendedNode & { available: boolean }> }) | null;
  onApplyAndBuild?: (selectedClassTypes: string[], workflowTitle: string, workflowSummary: string) => void;
  onCloseExtraction?: () => void;
  onSaveSelectionAsFragment?: () => void;
  onClearChat: () => void;
  onPasteDocs: (docs: string) => void;
  useLibraryReferences?: boolean;
  onToggleLibraryReferences?: () => void;
  correctionStatus?: string;
  onImportWorkflow?: (file: File) => void;
  // Pack library integration
  isPinned?: (packId: string) => boolean;
  onPinPack?: (pack: CustomNodePackInfo) => void;
  onUnpinPack?: (packId: string) => void;
  onPinMultiple?: (packs: CustomNodePackInfo[]) => void;
  // Active context bar
  pinnedPacks?: PinnedNodePack[];
  libraryMode?: LibraryMode;
  onToggleMode?: () => void;
  onOpenNodesBrowser?: () => void;
  // Phase 2: Learn Nodes support for DetectedPacksCard
  onLearnPack?: (packId: string, packTitle: string, reference: string) => void;
  learnedPackIds?: Set<string>;
  learningPackId?: string | null;
  selectedNodeCount?: number;
  onClearSelection?: () => void;
  currentWorkflow?: ComfyUIWorkflow | null;
  detectedPacks?: DetectedPack[];
  modelSlots?: ModelSlot[];
  comfyuiUrl?: string;
  huggingfaceApiKey?: string;
  civitaiApiKey?: string;
  onExecuteWorkflow?: () => void;
  managerApi: UseManagerAPIReturn;
  comfyuiStatus?: UseComfyUIStatusResult;
  contextSystemPrompt?: string;
  contextWorkflowMetadata?: string;
  contextNodeSchemas?: any;
  contextAllNodeSchemas?: Record<string, any> | null;
  contextNodeSchemasByPack?: Array<{
    packId: string;
    packName: string;
    tokens: number;
    nodeCount: number;
    included: boolean;
    category: 'core' | 'popular' | 'custom' | 'unknown';
  }>;
  contextConversationHistory?: string[];
  contextSelectedModelId?: string;
  contextSelectedModelName?: string;
  contextSelectedModelProvider?: string;
  contextCustomModels?: CustomModel[];
  contextFilterConfig?: FilterConfig;
  onContextFilterConfigChange?: (config: FilterConfig) => void;
  contextManualPackAdditions?: string[];
  contextManualPackRemovals?: string[];
  onContextManualOverridesChange?: (
    manuallyAdded: string[],
    manuallyRemoved: string[],
    mode: FilterPresetId,
  ) => void;
  onContextManualOverridesReset?: (mode: FilterPresetId) => void;
  onContextEnhanceWithPack?: (pack: { packId: string; packName: string; nodeCount: number }) => void;
  contextModelLibraryPrompt?: string;
  contextModelInventory?: InstalledModels | null;
  contextModelCategories?: string[];
  contextModelSelectedCategories?: Set<string>;
  contextModelActivePreset?: ModelPreset;
  contextModelCategoryTokens?: Record<string, number>;
  contextModelLibraryTokens?: number;
  contextModelLibraryFiles?: number;
  contextModelLibraryLoading?: boolean;
  onContextModelPresetApply?: (preset: Exclude<ModelPreset, 'custom'>) => void;
  onContextModelCategoryToggle?: (category: string, selected: boolean) => void;
  onContextModelCategoriesReset?: () => void;
  onContextMentionModel?: (filename: string, categoryLabel: string) => void;
  onToggleSchemaDrawer?: () => void;
  schemaDrawerOpen?: boolean;
  pendingMessage?: string | null;
  onPendingMessageHandled?: () => void;
}

// ---- Main component ---------------------------------------------------------

export function ChatPanel({
  messages,
  isLoading,
  streamingContent,
  chatMode,
  onChatModeChange,
  onSendMessage,
  onStop,
  onApplyBrainstormToBuild,
  onBrainstormBuild,
  onExtractNodes,
  isExtracting = false,
  pendingRecommendation,
  onApplyAndBuild,
  onCloseExtraction,
  onSaveSelectionAsFragment,
  onClearChat,
  onPasteDocs,
  useLibraryReferences = true,
  onToggleLibraryReferences,
  correctionStatus,
  onImportWorkflow,
  isPinned,
  onPinPack,
  onUnpinPack,
  onPinMultiple,
  pinnedPacks,
  libraryMode,
  onToggleMode,
  onOpenNodesBrowser,
  onLearnPack,
  learnedPackIds,
  learningPackId,
  selectedNodeCount = 0,
  onClearSelection,
  currentWorkflow,
  detectedPacks = [],
  modelSlots = [],
  comfyuiUrl,
  huggingfaceApiKey,
  civitaiApiKey,
  onExecuteWorkflow,
  managerApi,
  comfyuiStatus,
  contextSystemPrompt,
  contextWorkflowMetadata,
  contextNodeSchemas,
  contextAllNodeSchemas,
  contextNodeSchemasByPack,
  contextConversationHistory,
  contextSelectedModelId,
  contextSelectedModelName,
  contextSelectedModelProvider,
  contextCustomModels,
  contextFilterConfig,
  onContextFilterConfigChange,
  contextManualPackAdditions,
  contextManualPackRemovals,
  onContextManualOverridesChange,
  onContextManualOverridesReset,
  onContextEnhanceWithPack,
  contextModelLibraryPrompt,
  contextModelInventory,
  contextModelCategories,
  contextModelSelectedCategories,
  contextModelActivePreset,
  contextModelCategoryTokens,
  contextModelLibraryTokens,
  contextModelLibraryFiles,
  contextModelLibraryLoading,
  onContextModelPresetApply,
  onContextModelCategoryToggle,
  onContextModelCategoriesReset,
  onContextMentionModel,
  onToggleSchemaDrawer,
  schemaDrawerOpen,
  pendingMessage,
  onPendingMessageHandled,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showDocs, setShowDocs] = useState(false);
  const [docsContent, setDocsContent] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [queuedBuildPrompt, setQueuedBuildPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load registry for pack slug resolution (cached — zero cost after first fetch)
  const [registryPacks, setRegistryPacks] = useState<CustomNodePackInfo[]>([]);
  useEffect(() => {
    fetchCustomNodeRegistry()
      .then(setRegistryPacks)
      .catch(() => {}); // Silently fail — chips show as unknown
  }, []);

  const packLookup = useMemo(() => buildPackLookup(registryPacks), [registryPacks]);

  const resolveSlug = useCallback(
    (slug: string): CustomNodePackInfo | null => {
      const s = slug.toLowerCase().trim();
      const direct = packLookup.get(s);
      if (direct) return direct;
      return findPackBySlug(registryPacks, s);
    },
    [packLookup, registryPacks],
  );

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    if (!pendingMessage) return;
    setInput(pendingMessage);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    });
    onPendingMessageHandled?.();
  }, [pendingMessage, onPendingMessageHandled]);

  useEffect(() => {
    if (!queuedBuildPrompt) return;
    if (chatMode !== 'build') return;
    if (isLoading) return;
    onSendMessage(queuedBuildPrompt);
    setQueuedBuildPrompt(null);
  }, [queuedBuildPrompt, chatMode, isLoading, onSendMessage]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    let finalMessage = trimmed;
    if (docsContent.trim()) {
      finalMessage = `## Custom Node Documentation\n\`\`\`\n${docsContent.trim()}\n\`\`\`\n\n## Request\n${trimmed}`;
      setDocsContent('');
      setShowDocs(false);
    }

    userScrolledUpRef.current = false;
    onSendMessage(finalMessage);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const handleTemplateClick = (prompt: string) => {
    setInput(prompt);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleBrainstormChipSelect = useCallback((chip: BrainstormChip, brainstormContext?: string) => {
    if (chip.id === 'apply-to-workflow') {
      const fallbackContext = [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';
      const context = brainstormContext?.trim() || fallbackContext.trim();
      if (context && onApplyBrainstormToBuild) {
        onApplyBrainstormToBuild(context);
        return;
      }
    }

    if (chip.forceBuildMode && chatMode !== 'build') {
      setQueuedBuildPrompt(chip.prompt);
      onChatModeChange?.('build');
      return;
    }
    onSendMessage(chip.prompt);
  }, [chatMode, messages, onApplyBrainstormToBuild, onChatModeChange, onSendMessage]);

  const handleRecommendationBuild = useCallback((
    selectedClassTypes: string[],
    workflowTitle: string,
    workflowSummary: string,
  ) => {
    if (onBrainstormBuild) {
      onBrainstormBuild(selectedClassTypes, workflowTitle, workflowSummary);
      return;
    }

    if (selectedClassTypes.length === 0) return;

    const buildPrompt = [
      `Build this workflow: ${workflowTitle || 'Untitled Workflow'}`,
      workflowSummary ? `Summary: ${workflowSummary}` : '',
      'Use these exact node class_types (in this order where possible):',
      ...selectedClassTypes.map((classType) => `- ${classType}`),
      'Generate a complete ComfyUI workflow-api JSON.',
    ].filter(Boolean).join('\n');

    if (chatMode !== 'build') {
      setQueuedBuildPrompt(buildPrompt);
      onChatModeChange?.('build');
      return;
    }

    onSendMessage(buildPrompt);
  }, [chatMode, onBrainstormBuild, onChatModeChange, onSendMessage]);

  const isEmpty = messages.length === 0;
  const hasWorkflow = !!currentWorkflow;
  const hasPackSupport = !!isPinned && !!onPinPack && !!onUnpinPack && !!onPinMultiple;
  const lastAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
  }, [messages]);
  const modifyQuestions = useMemo<SuggestedQuestion[]>(
    () => [
      { label: 'Add LoRA loader', question: 'Add a LoRA loader for style control', category: 'improve' },
      { label: 'Change sampler', question: 'Change the sampler to DPM++ 2M Karras', category: 'technique' },
      { label: 'Add ControlNet', question: 'Add ControlNet for pose guidance', category: 'node' },
      { label: 'Increase resolution', question: 'Increase resolution to 1024x1024', category: 'improve' },
      { label: 'Add upscaler', question: 'Add an upscaler after generation', category: 'node' },
      { label: 'Switch checkpoint', question: 'Switch to a different checkpoint', category: 'model' },
    ],
    [],
  );
  return (
    <div className="relative flex h-full flex-col bg-surface-200">
      {/* Header */}
      <div className="shrink-0 border-b border-border-default">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm text-content-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Chat
          </h2>
          <div className="flex items-center gap-1.5">
            <ContextTokenIndicator
              systemPrompt={contextSystemPrompt}
              workflowJson={currentWorkflow}
              workflowMetadata={contextWorkflowMetadata}
              nodeSchemas={contextNodeSchemas}
              allNodeSchemas={contextAllNodeSchemas}
              conversationHistory={contextConversationHistory}
              selectedModelId={contextSelectedModelId}
              selectedModelName={contextSelectedModelName}
              selectedModelProvider={contextSelectedModelProvider}
              customModels={contextCustomModels}
              currentFilterConfig={contextFilterConfig}
              onFilterConfigChange={onContextFilterConfigChange}
              currentWorkflow={currentWorkflow}
              manualPackAdditions={contextManualPackAdditions}
              manualPackRemovals={contextManualPackRemovals}
              onManualPackOverridesChange={(added, removed, mode) => onContextManualOverridesChange?.(added, removed, mode)}
              onResetManualPackOverrides={onContextManualOverridesReset}
              onEnhanceWithPack={onContextEnhanceWithPack}
              modelLibraryPrompt={contextModelLibraryPrompt}
              modelInventory={contextModelInventory}
              modelCategories={contextModelCategories}
              modelSelectedCategories={contextModelSelectedCategories}
              modelActivePreset={contextModelActivePreset}
              modelCategoryTokens={contextModelCategoryTokens}
              modelLibraryTokens={contextModelLibraryTokens}
              modelLibraryFiles={contextModelLibraryFiles}
              modelLibraryLoading={contextModelLibraryLoading}
              onApplyModelPreset={onContextModelPresetApply}
              onToggleModelCategory={onContextModelCategoryToggle}
              onResetModelCategories={onContextModelCategoriesReset}
              onMentionModel={onContextMentionModel}
              onToggleSchemaDrawer={onToggleSchemaDrawer}
              schemaDrawerOpen={schemaDrawerOpen}
            />
            <button
              onClick={onClearChat}
              className="p-1.5 rounded-sm text-content-muted hover:text-content-primary hover:bg-surface-secondary transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 bg-surface-100 border-b border-border">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChatModeChange?.('build')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors text-sm ${
                chatMode === 'build'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Wrench className="w-3 h-3" />
              Build
            </button>
            <button
              onClick={() => onChatModeChange?.('brainstorm')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors text-sm ${
                chatMode === 'brainstorm'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Lightbulb className="w-3 h-3" />
              Brainstorm
            </button>
          </div>
          {chatMode === 'brainstorm' && messages.length >= 2 && onExtractNodes && (
            <button
              onClick={onExtractNodes}
              disabled={isExtracting}
              className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-sm bg-accent px-3 py-1 text-xs text-accent-contrast transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              title="Extract recommended node list from brainstorm and prepare build"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Extracting nodes...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Extract Nodes & Build
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {comfyuiStatus && (
        <div className="shrink-0">
          <ComfyUIStatusBar status={comfyuiStatus} />
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
        onScroll={() => {
          const el = scrollContainerRef.current;
          if (!el) return;
          const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          userScrolledUpRef.current = !isNearBottom;
        }}
      >
        {isEmpty ? (
          chatMode === 'brainstorm' ? (
            <div className="px-4 py-6 space-y-4">
              <div className="text-center space-y-2">
                <Lightbulb className="w-8 h-8 text-accent-text/40 mx-auto" />
                <p className="text-sm text-content-secondary">Brainstorm workflow ideas</p>
                <p className="text-xs text-content-faint">Ask about models, techniques, node packs - AI knows your setup</p>
              </div>
              <BrainstormChipsBar
                chips={BRAINSTORM_CHIPS}
                onSelect={handleBrainstormChipSelect}
                label="Quick actions"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-4 py-8 space-y-6">
              <div className="text-center space-y-2">
                <p className="text-content-secondary text-sm">Describe the ComfyUI workflow you want to build</p>
                <p className="text-content-muted text-xs">Or pick a template below to get started</p>
              </div>

              <div className="w-full space-y-1.5 max-w-sm">
                {PROMPT_TEMPLATES.slice(0, 6).map((t) => (
                  <button
                    key={t.label}
                    onClick={() => handleTemplateClick(t.prompt)}
                    className="w-full text-left px-3 py-2 rounded-sm bg-surface-elevated hover:bg-surface-secondary border border-border-default hover:border-border-strong text-xs text-content-secondary hover:text-content-primary transition-all group"
                  >
                    <span className="mr-2">{t.icon}</span>
                    {t.label}
                    <span className="ml-2 text-content-faint group-hover:text-content-secondary">→</span>
                  </button>
                ))}
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="w-full text-center py-1.5 text-xs text-content-faint hover:text-content-secondary transition-colors"
                >
                  {showTemplates ? 'Show less' : `+${PROMPT_TEMPLATES.length - 6} more templates`}
                </button>
                {showTemplates && PROMPT_TEMPLATES.slice(6).map((t) => (
                  <button
                    key={t.label}
                    onClick={() => handleTemplateClick(t.prompt)}
                    className="w-full text-left px-3 py-2 rounded-sm bg-surface-elevated hover:bg-surface-secondary border border-border-default hover:border-border-strong text-xs text-content-secondary hover:text-content-primary transition-all"
                  >
                    <span className="mr-2">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="space-y-1 p-3">
            {messages.map((msg) => (
              <MemoizedChatMessage
                key={msg.id}
                message={msg}
                chatMode={chatMode}
                onSendMessage={onSendMessage}
                onSelectChip={handleBrainstormChipSelect}
                hasWorkflow={hasWorkflow}
                currentWorkflow={currentWorkflow}
                isLastAssistantMessage={msg.role === 'assistant' && msg.id === lastAssistantMessageId}
                resolveSlug={resolveSlug}
                isPinned={isPinned}
                onPinPack={onPinPack}
                onUnpinPack={onUnpinPack}
                onPinMultiple={onPinMultiple}
                hasPackSupport={hasPackSupport}
                onLearnPack={onLearnPack}
                learnedPackIds={learnedPackIds}
                learningPackId={learningPackId}
                comfyuiUrl={comfyuiUrl}
                onBrainstormBuild={handleRecommendationBuild}
              />
            ))}
            {isLoading && streamingContent && (
              <div className="rounded-sm p-3 bg-surface-secondary border border-border-default">
                <div className="text-xs text-accent-text mb-1">AI</div>
                <div className="text-sm text-content-primary max-w-none">
                  <RichMessage content={streamingContent} isStreaming />
                </div>
              </div>
            )}
            {isLoading && !streamingContent && (
              <div className="flex items-center gap-2 p-3 text-content-secondary text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span>Working on your request...</span>
              </div>
            )}
            {/* Self-correction status */}
            {correctionStatus && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-state-warning-muted border border-state-warning/20">
                <Wand2 className="w-3.5 h-3.5 text-state-warning animate-pulse" />
                <span className="text-xs text-state-warning">{correctionStatus}</span>
              </div>
            )}
            {!isLoading && (() => {
              const analysisMsg = [...messages].reverse().find(m => m.workflowAnalysis);
              if (!analysisMsg?.workflowAnalysis) return null;
              if (chatMode !== 'build') return null;
              const questions = generateSuggestedQuestions(analysisMsg.workflowAnalysis);
              return (
                <SuggestedQuestions
                  questions={questions}
                  onSelect={(q) => onSendMessage(q)}
                />
              );
            })()}
            {hasWorkflow && !isLoading && chatMode === 'build' && (
              <SuggestedQuestions
                questions={modifyQuestions}
                onSelect={(q) => onSendMessage(q)}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {hasWorkflow && currentWorkflow && hasPackSupport && isPinned && onPinPack && onUnpinPack && onPinMultiple && (
        <div className="shrink-0 border-t border-border-default px-3 pb-2 pt-2 max-h-[42%] overflow-y-auto scrollbar-thin">
          <WorkflowRequirementsPanel
            workflow={currentWorkflow}
            detectedPacks={detectedPacks}
            modelSlots={modelSlots}
            comfyuiUrl={comfyuiUrl}
            huggingfaceApiKey={huggingfaceApiKey}
            civitaiApiKey={civitaiApiKey}
            isPinned={isPinned}
            onPinPack={onPinPack}
            onUnpinPack={onUnpinPack}
            onPinMultiple={onPinMultiple}
            onLearnPack={onLearnPack}
            learnedPackIds={learnedPackIds}
            learningPackId={learningPackId}
            onExecuteWorkflow={onExecuteWorkflow}
            managerApi={managerApi}
          />
        </div>
      )}

      {/* Docs paste panel */}
      {showDocs && (
        <div className="shrink-0 border-t border-border-default p-3 bg-surface-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-content-secondary">Paste custom node documentation</span>
            <button onClick={() => setShowDocs(false)} className="text-xs text-content-faint hover:text-content-secondary">Close</button>
          </div>
          <textarea
            value={docsContent}
            onChange={(e) => setDocsContent(e.target.value)}
            placeholder="Paste node README, documentation, or example workflows here..."
            className="w-full h-24 bg-surface-100 border border-border rounded-sm text-xs text-content-primary p-2 resize-none focus:outline-none focus:border-primary"
            style={{ fontFamily: 'monospace' }}
          />
        </div>
      )}

      {/* Active context bar — above input */}
      {pinnedPacks && libraryMode && onToggleMode && (
        <ActiveContextBar
          pinnedPacks={pinnedPacks}
          libraryMode={libraryMode}
          onToggleMode={onToggleMode}
          onOpenNodesBrowser={onOpenNodesBrowser}
        />
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border-default bg-surface-200 p-3">
        {chatMode === 'build' && selectedNodeCount > 0 && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-accent-muted border border-accent/20 rounded-sm">
            <span className="text-[11px] text-accent-text">
              {selectedNodeCount} node{selectedNodeCount !== 1 ? 's' : ''} selected
            </span>
            <span className="text-[10px] text-content-secondary">
              your message will reference these nodes
            </span>
            <div className="ml-auto flex items-center gap-2">
              {selectedNodeCount >= 2 && onSaveSelectionAsFragment && (
                <button
                  onClick={onSaveSelectionAsFragment}
                  className="text-[10px] text-state-warning bg-state-warning-muted border border-state-warning/30 rounded px-2 py-0.5 hover:border-state-warning/40 transition-colors"
                  title="Save selected nodes as a reusable fragment"
                >
                  <span className="inline-flex items-center gap-1">
                    <Puzzle className="w-3 h-3" />
                    Save Fragment
                  </span>
                </button>
              )}
              {onClearSelection && (
                <button
                  onClick={onClearSelection}
                  className="text-[10px] text-content-faint hover:text-content-secondary transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setShowDocs(!showDocs)}
              className={`p-2 rounded-sm transition-colors ${showDocs ? 'bg-accent-muted text-accent-text' : 'text-content-faint hover:text-content-secondary hover:bg-surface-secondary'}`}
              title="Paste custom node docs"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 rounded-sm text-content-faint hover:text-content-secondary hover:bg-surface-secondary transition-colors"
              title="Templates"
            >
              <Plus className="w-4 h-4" />
            </button>
            {onImportWorkflow && (
              <label
                htmlFor="chat-import-workflow"
                className="p-2 rounded-sm text-content-faint hover:text-content-secondary hover:bg-surface-secondary transition-colors cursor-pointer"
                title="Import workflow JSON"
              >
                <Upload className="w-4 h-4" />
                <input
                  id="chat-import-workflow"
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportWorkflow(file);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            )}
            {chatMode === 'build' && onToggleLibraryReferences && (
              <button
                onClick={onToggleLibraryReferences}
                className={`p-2 rounded-sm transition-colors ${
                  useLibraryReferences
                    ? 'text-accent-text bg-accent-muted'
                    : 'text-content-faint hover:text-content-secondary hover:bg-surface-secondary'
                }`}
                title={useLibraryReferences ? 'Library references ON' : 'Library references OFF'}
              >
                <LibraryIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                chatMode === 'brainstorm'
                  ? 'Ask about models, nodes, techniques...'
                  : selectedNodeCount > 0
                  ? `Ask about the ${selectedNodeCount} selected node${selectedNodeCount !== 1 ? 's' : ''}, or describe what to change...`
                  : 'Describe your workflow...'
              }
              rows={1}
              className="w-full bg-surface-100 border border-border rounded-sm text-sm text-content-primary px-3 py-2.5 pr-10 resize-none focus:outline-none focus:border-primary placeholder:text-content-faint"
              disabled={isLoading}
              style={{ maxHeight: '160px' }}
            />
          </div>
          <button
            onClick={isLoading ? onStop : handleSubmit}
            disabled={isLoading ? !onStop : !input.trim()}
            className={`p-2.5 rounded-sm transition-colors shrink-0 ${
              isLoading
                ? 'bg-red-600 hover:bg-red-500 text-white disabled:opacity-30'
                : 'bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:bg-surface-300 disabled:hover:bg-surface-300 text-primary-foreground'
            }`}
            title={isLoading ? 'Stop generation' : 'Send message'}
          >
            {isLoading ? (
              <Square className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        {docsContent && (
          <div className="mt-2 text-xs text-accent-text flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Custom docs attached — will be included with next message
          </div>
        )}
      </div>

      {pendingRecommendation && onApplyAndBuild && onCloseExtraction && (
        <NodeExtractionPanel
          recommendation={pendingRecommendation}
          onApplyAndBuild={onApplyAndBuild}
          onClose={onCloseExtraction}
        />
      )}
    </div>
  );
}

// ---- ChatMessage with pack tag support --------------------------------------

interface ChatMessageProps {
  message: Message;
  chatMode: 'build' | 'brainstorm';
  onSendMessage: (message: string) => void;
  onBrainstormBuild: (selectedClassTypes: string[], workflowTitle: string, workflowSummary: string) => void;
  onSelectChip: (chip: BrainstormChip, brainstormContext?: string) => void;
  hasWorkflow: boolean;
  currentWorkflow?: ComfyUIWorkflow | null;
  isLastAssistantMessage: boolean;
  resolveSlug: (slug: string) => CustomNodePackInfo | null;
  isPinned?: (packId: string) => boolean;
  onPinPack?: (pack: CustomNodePackInfo) => void;
  onUnpinPack?: (packId: string) => void;
  onPinMultiple?: (packs: CustomNodePackInfo[]) => void;
  hasPackSupport: boolean;
  onLearnPack?: (packId: string, packTitle: string, reference: string) => void;
  learnedPackIds?: Set<string>;
  learningPackId?: string | null;
  comfyuiUrl?: string;
}

function ChatMessage({
  message,
  chatMode,
  onSendMessage,
  onBrainstormBuild,
  onSelectChip,
  hasWorkflow,
  currentWorkflow,
  isLastAssistantMessage,
  resolveSlug,
  isPinned,
  onPinPack,
  onUnpinPack,
  onPinMultiple,
  hasPackSupport,
  onLearnPack,
  learnedPackIds,
  learningPackId,
  comfyuiUrl,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const modelSlots = message.workflowAnalysis?.modelSlots ?? [];
  const [modelAvailability, setModelAvailability] = useState<Map<string, boolean>>(new Map());
  const [isCheckingModels, setIsCheckingModels] = useState(false);
  const modelSlotsKey = useMemo(
    () => modelSlots
      .map((slot) => `${slot.nodeType}:${slot.inputName}:${slot.currentValue}`)
      .sort((a, b) => a.localeCompare(b))
      .join('|'),
    [modelSlots],
  );

  // For user messages, strip the docs prefix for display
  let displayContent = message.content;
  if (isUser && message.content.includes('## Request\n')) {
    const parts = message.content.split('## Request\n');
    displayContent = parts[parts.length - 1];
  }
  if (!isUser && message.recommendation) {
    displayContent = stripRecommendationBlock(displayContent);
  }

  const validatedRecommendationNodes = useMemo(
    () => {
      if (isUser || !message.recommendation) return [];
      const liveNodeMap = new Map<string, unknown>(
        Object.keys(getLiveNodeCache()?.nodes || {}).map((classType) => [classType, true]),
      );
      return validateRecommendedNodes(message.recommendation.nodes, liveNodeMap);
    },
    [isUser, message.recommendation],
  );

  // Extract pack slugs from AI messages
  const packSlugs = useMemo(
    () => (!isUser ? extractPackSlugs(displayContent) : []),
    [isUser, displayContent],
  );

  // Resolve slugs to pack info
  const resolvedPacks = useMemo(
    () =>
      packSlugs.map(slug => ({
        slug,
        packInfo: resolveSlug(slug),
        pinned: false as boolean,
      })),
    [packSlugs, resolveSlug],
  );

  // Update pinned status reactively
  const resolvedPacksWithPinStatus = useMemo(
    () =>
      resolvedPacks.map(rp => ({
        ...rp,
        pinned: rp.packInfo ? (isPinned?.(rp.packInfo.id) ?? false) : false,
      })),
    [resolvedPacks, isPinned],
  );

  // Pre-process content: convert {{pack:slug}} → markdown link
  const processedContent = useMemo(
    () => (!isUser && packSlugs.length > 0 ? preprocessPackTags(displayContent) : displayContent),
    [isUser, packSlugs, displayContent],
  );

  // Custom ReactMarkdown components with pack link interception
  const markdownComponents = useMemo<Components>(() => {
    if (!hasPackSupport || isUser) return {};

    return {
      a: ({ href, children, ...rest }: any) => {
        if (href?.startsWith('pack://')) {
          const slug = href.replace('pack://', '');
          const packInfo = resolveSlug(slug);
          const pinned = packInfo ? (isPinned?.(packInfo.id) ?? false) : false;
          return (
            <PackChip
              slug={slug}
              packInfo={packInfo}
              isPinned={pinned}
              onPin={onPinPack || (() => {})}
              onUnpin={onUnpinPack || (() => {})}
            />
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-text hover:text-content-primary underline" {...rest}>
            {children}
          </a>
        );
      },
    };
  }, [hasPackSupport, isUser, resolveSlug, isPinned, onPinPack, onUnpinPack]);

  const hasPackTags = packSlugs.length > 0 && hasPackSupport;

  useEffect(() => {
    if (!comfyuiUrl || modelSlots.length === 0) {
      setModelAvailability(new Map());
      setIsCheckingModels(false);
      return;
    }
    let cancelled = false;
    setIsCheckingModels(true);
    getObjectInfo(comfyuiUrl)
      .then((objectInfo) => {
        if (cancelled) return;
        const availability = new Map<string, boolean>();
        for (const slot of modelSlots) {
          const key = `${slot.nodeId}:${slot.inputName}:${slot.currentValue}`;
          const nodeInfo = objectInfo[slot.nodeType];
          const requiredSpec = nodeInfo?.input?.required?.[slot.inputName];
          const optionalSpec = nodeInfo?.input?.optional?.[slot.inputName];
          const requiredOptions = Array.isArray(requiredSpec?.[0]) ? requiredSpec[0] : [];
          const optionalOptions = Array.isArray(optionalSpec?.[0]) ? optionalSpec[0] : [];
          const options: string[] = [...requiredOptions, ...optionalOptions];
          const target = slot.currentValue.toLowerCase();
          const found = options.some((candidate) => {
            const c = String(candidate).toLowerCase();
            return c === target || c.endsWith(`/${target}`) || target.endsWith(`/${c}`);
          });
          availability.set(key, found);
        }
        setModelAvailability(availability);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsCheckingModels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [comfyuiUrl, modelSlotsKey]);

  const modelCounts = useMemo(() => {
    let available = 0;
    let missing = 0;
    for (const slot of modelSlots) {
      const key = `${slot.nodeId}:${slot.inputName}:${slot.currentValue}`;
      const status = modelAvailability.get(key);
      if (status === true) available += 1;
      if (status === false) missing += 1;
    }
    return { available, missing };
  }, [modelSlots, modelAvailability]);

  return (
    <div className={`rounded-sm p-3 border ${isUser ? 'bg-primary/10 border-primary/20' : 'bg-surface-200 border-border'}`}>
      <div className={`text-xs mb-1 ${isUser ? 'text-primary' : 'text-muted-foreground'}`}>
        {isUser ? 'You' : chatMode === 'brainstorm' ? 'AI Brainstorm' : 'AI Architect'}
      </div>
      {isUser ? (
        <div className="text-sm text-content-primary">
          {processedContent}
        </div>
      ) : (
        <div className="text-sm text-content-primary max-w-none">
          <RichMessage
            content={processedContent}
            extraComponents={markdownComponents}
            urlTransform={packUrlTransform}
          />
        </div>
      )}
      {!isUser && message.recommendation && (
        <RecommendationCard
          recommendation={message.recommendation}
          validatedNodes={validatedRecommendationNodes}
          onBuild={onBrainstormBuild}
        />
      )}
      {chatMode === 'brainstorm' && !isUser && isLastAssistantMessage && (
        <BrainstormChipsBar
          chips={getContextualChips(displayContent, hasWorkflow, currentWorkflow)}
          onSelect={(chip) => onSelectChip(chip, displayContent)}
        />
      )}
      {/* Pack Action Bar for messages with pack recommendations */}
      {hasPackTags && onPinPack && onUnpinPack && onPinMultiple && (
        <PackActionBar
          resolvedPacks={resolvedPacksWithPinStatus}
          onPin={onPinPack}
          onUnpin={onUnpinPack}
          onPinMultiple={onPinMultiple}
        />
      )}
      {message.validationResult && !message.validationResult.isValid && (
        <div className="mt-2 p-2 rounded bg-state-error-muted border border-state-error/20">
          <div className="text-xs text-state-error">
            {message.validationResult.errors.length} validation error(s) found
          </div>
        </div>
      )}
      {!isUser && modelSlots.length > 0 && (
        <div className="mt-2 rounded-sm border border-border-default bg-surface-primary p-2.5">
          <div className="text-[11px] text-content-primary">
            Models Referenced: ({modelSlots.length} total - {modelCounts.available} available, {modelCounts.missing} missing)
          </div>
          {isCheckingModels && (
            <div className="mt-1 text-[10px] text-content-secondary">Checking local model availability...</div>
          )}
          <div className="mt-1.5 space-y-1">
            {modelSlots.map((slot) => {
              const key = `${slot.nodeId}:${slot.inputName}:${slot.currentValue}`;
              const available = modelAvailability.get(key);
              const query = slot.currentValue.replace(/\.(safetensors|pth|pt|ckpt|bin)$/i, '');
              return (
                <div key={key} className="text-[10px] text-content-primary">
                  <span className={available === true ? 'text-state-success' : available === false ? 'text-state-error' : 'text-content-secondary'}>
                    {available === true ? '🟢' : available === false ? '🔴' : '⏳'}
                  </span>{' '}
                  <span className="font-mono">{slot.currentValue}</span>{' '}
                  <span className="text-content-secondary">({slot.category} in {slot.nodeType} #{slot.nodeId})</span>
                  {available === false && (
                    <span className="ml-2 inline-flex items-center gap-2">
                      <a
                        href={`https://civitai.com/search/models?query=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-state-info hover:text-state-info underline"
                      >
                        Search CivitAI
                      </a>
                      <a
                        href={`https://huggingface.co/models?search=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-text hover:text-content-primary underline"
                      >
                        Search HuggingFace
                      </a>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const MemoizedChatMessage = memo(ChatMessage);






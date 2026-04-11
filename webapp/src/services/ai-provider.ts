import type { AIProvider, ProviderSettings, CustomModel } from '../types/comfyui';
import { ALL_NODES } from '../data/node-registry';
import { buildSystemPrompt } from '../data/system-prompt';

// Known model context windows (in tokens)
// Conservative estimates — actual may be higher.
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // === OpenAI ===
  'gpt-5.2': 128_000,
  'gpt-5-mini': 128_000,
  'gpt-5-nano': 128_000,
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-4': 8_192,
  'gpt-3.5-turbo': 16_384,
  'o1': 200_000,
  'o1-mini': 128_000,
  'o3': 200_000,
  'o3-mini': 200_000,
  'o4-mini': 200_000,
  // === Anthropic ===
  'claude-opus-4': 200_000,
  'claude-sonnet-4': 200_000,
  'claude-haiku-4': 200_000,
  'claude-3-5-sonnet': 200_000,
  'claude-3-5-haiku': 200_000,
  'claude-3-opus': 200_000,
  // === Google ===
  'gemini-3-pro': 1_000_000,
  'gemini-3-flash': 1_000_000,
  'gemini-2.5-pro': 1_000_000,
  'gemini-2.5-flash': 1_000_000,
  'gemini-2.0-flash': 1_000_000,
  'gemini-1.5-pro': 2_000_000,
  'gemini-1.5-flash': 1_000_000,
  // === OpenRouter / LM Studio — Qwen3 ===
  'qwen/qwen3-coder-480b': 262_144,
  'qwen/qwen3-coder-30b':  32_768,
  'qwen/qwen3-235b':       131_072,
  'qwen/qwen3-32b':        32_768,
  'qwen/qwen3-14b':        32_768,
  'qwen/qwen3-8b':         32_768,
  'qwen/qwen3.5-plus': 128_000,
  'qwen/qwen3.5-397b': 128_000,
  // === OpenRouter common ===
  'minimax/minimax-m2.5': 128_000,
  'deepseek/deepseek-chat': 128_000,
  'deepseek/deepseek-r1': 128_000,
  'meta-llama/llama-4': 256_000,
  'mistralai/mistral-large': 128_000,
};

/**
 * Maximum OUTPUT tokens per model.
 * These are model generation limits, not context window limits.
 */
const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  // === Anthropic ===
  'claude-opus-4': 32_000,
  'claude-sonnet-4': 64_000,
  'claude-sonnet-4.5': 64_000,
  'claude-haiku-4': 16_384,
  'claude-haiku-4.5': 16_384,
  'claude-3.5-sonnet': 8_192,
  'claude-3-opus': 4_096,
  'claude-3-haiku': 4_096,
  'claude-3-sonnet': 4_096,
  // === OpenAI ===
  'gpt-5.2': 32_768,
  'gpt-5': 32_768,
  'gpt-5-mini': 16_384,
  'gpt-5-nano': 16_384,
  'gpt-4.1': 32_768,
  'gpt-4.1-mini': 16_384,
  'gpt-4.1-nano': 16_384,
  'gpt-4o': 16_384,
  'gpt-4o-mini': 16_384,
  'o1': 100_000,
  'o1-mini': 65_536,
  'o3': 100_000,
  'o3-mini': 65_536,
  'o4-mini': 100_000,
  // === Google ===
  'gemini-3-pro': 65_536,
  'gemini-3-flash': 65_536,
  'gemini-2.5-pro': 65_536,
  'gemini-2.5-flash': 65_536,
  'gemini-2.0-flash': 8_192,
  'gemini-1.5-pro': 8_192,
  'gemini-1.5-flash': 8_192,
  // === OpenRouter / LM Studio — Qwen3 ===
  'qwen/qwen3-coder-480b': 32_768,
  'qwen/qwen3-coder-30b':  32_768,
  'qwen/qwen3-235b':       32_768,
  'qwen/qwen3-32b':        32_768,
  'qwen/qwen3-14b':        32_768,
  'qwen/qwen3-8b':         32_768,
  'qwen/qwen3.5-plus': 32_768,
  'qwen/qwen3.5-397b': 32_768,
  // === OpenRouter common ===
  'minimax/minimax-m2.5': 16_384,
  'deepseek/deepseek-r1': 65_536,
  'deepseek/deepseek-v3': 65_536,
};

const DEFAULT_CONTEXT_WINDOW = 128_000;
const _warnedModels = new Set<string>();

/**
 * Normalize model IDs for matching:
 * - strip date suffixes (YYYYMMDD or YYYY-MM-DD)
 * - strip -preview
 * - convert numeric dash versions to dotted versions
 */
function normalizeModelId(modelId: string): string {
  return modelId
    .toLowerCase()
    .trim()
    .replace(/-\d{4}[-]?\d{2}[-]?\d{2}$/, '')
    .replace(/-preview$/, '')
    .replace(/(\d)-(\d)/g, '$1.$2');
}

/**
 * Rough token estimate from string size (~3.5 chars/token for prompt+JSON heavy text).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Resolve model context window by exact/prefix match with fallback.
 */
export function getModelContextWindow(modelId: string): number {
  if (MODEL_CONTEXT_WINDOWS[modelId]) return MODEL_CONTEXT_WINDOWS[modelId];

  for (const [key, value] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
    if (modelId.startsWith(key)) return value;
  }

  if (modelId.includes('/')) {
    const modelPart = modelId.split('/').pop() || '';
    for (const [key, value] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
      if (modelPart.startsWith(key)) return value;
    }
  }

  // Provider-level safety net for newer model IDs not yet in the registry.
  const lower = modelId.toLowerCase();
  if (lower.includes('claude')) return 200_000;
  if (lower.includes('gemini')) return 1_000_000;
  if (lower.startsWith('gpt-5') || lower.startsWith('gpt-4')) return 128_000;
  if (lower.startsWith('o1') || lower.startsWith('o3') || lower.startsWith('o4')) return 200_000;

  return DEFAULT_CONTEXT_WINDOW;
}

/**
 * Get maximum output tokens for a given model.
 * Uses model-specific limits with fuzzy matching and safe fallback.
 */
export function getMaxOutputTokens(modelId: string): number {
  if (MODEL_MAX_OUTPUT_TOKENS[modelId]) {
    return MODEL_MAX_OUTPUT_TOKENS[modelId];
  }

  const normalized = normalizeModelId(modelId);
  if (MODEL_MAX_OUTPUT_TOKENS[normalized]) {
    return MODEL_MAX_OUTPUT_TOKENS[normalized];
  }

  const sortedEntries = Object.entries(MODEL_MAX_OUTPUT_TOKENS)
    .sort(([a], [b]) => b.length - a.length);
  for (const [key, value] of sortedEntries) {
    if (modelId.startsWith(key) || normalized.startsWith(key)) {
      return value;
    }
  }

  if (modelId.includes('/')) {
    const modelPart = modelId.split('/').pop() || '';
    const normalizedPart = normalizeModelId(modelPart);
    for (const [key, value] of sortedEntries) {
      const keyPart = key.includes('/') ? (key.split('/').pop() || key) : key;
      if (
        modelPart.startsWith(key)
        || normalizedPart.startsWith(key)
        || modelPart.startsWith(keyPart)
        || normalizedPart.startsWith(keyPart)
      ) {
        return value;
      }
    }
  }

  const fallback = getModelContextWindow(modelId);
  const warnKey = modelId || '(empty-model-id)';
  if (!_warnedModels.has(warnKey)) {
    _warnedModels.add(warnKey);
    console.warn(`[AI] Unknown model output limit for "${modelId}", falling back to context window ${fallback}`);
  }
  return fallback;
}

/**
 * Calculate dynamic output tokens based on model context and input size.
 */
export function calculateMaxTokens(
  inputText: string,
  modelId: string,
): { maxTokens: number; inputTokens: number; contextWindow: number; fits: boolean; error?: string } {
  const contextWindow = getModelContextWindow(modelId);
  const modelMaxOutput = getMaxOutputTokens(modelId);
  const inputTokens = estimateTokens(inputText);
  const availableForOutput = contextWindow - inputTokens;

  if (availableForOutput <= 0) {
    return {
      maxTokens: 0,
      inputTokens,
      contextWindow,
      fits: false,
      error:
        `Workflow too large for ${modelId} (${contextWindow.toLocaleString()} token context). ` +
        `Input uses ~${inputTokens.toLocaleString()} tokens, leaving only ~${Math.max(0, availableForOutput).toLocaleString()} for output. ` +
        `Use a model with a larger context window.`,
    };
  }

  const maxTokens = Math.min(availableForOutput, modelMaxOutput);

  return { maxTokens: Math.floor(maxTokens), inputTokens, contextWindow, fits: true };
}

const systemPromptPromise = buildSystemPrompt(ALL_NODES);

// ===== Default Models per Provider =====

export interface ModelEntry {
  id: string;
  name: string;
  provider: AIProvider;
}

export const DEFAULT_MODELS: ModelEntry[] = [
  // OpenAI
  { id: 'gpt-5.2-2025-12-11', name: 'GPT-5.2', provider: 'openai' },
  { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini', provider: 'openai' },
  { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano', provider: 'openai' },
  // Anthropic
  { id: 'claude-opus-4-6', name: 'Claude Opus 4', provider: 'anthropic' },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic' },
  // Google
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'google' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google' },
  // OpenRouter
  { id: 'qwen/qwen3.5-plus-02-15', name: 'Qwen 3.5 Plus', provider: 'openrouter' },
  { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen 3.5 397B', provider: 'openrouter' },
  { id: 'minimax/minimax-m2.5', name: 'MiniMax M2.5', provider: 'openrouter' },
];

export function getAllModels(customModels: CustomModel[]): ModelEntry[] {
  const customs: ModelEntry[] = customModels.map(m => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
  }));
  // Merge: custom models override defaults with the same id
  const customIds = new Set(customs.map(c => c.id));
  const defaults = DEFAULT_MODELS.filter(d => !customIds.has(d.id));
  return [...defaults, ...customs];
}

export function getModelsByProvider(customModels: CustomModel[]): Record<AIProvider, ModelEntry[]> {
  const all = getAllModels(customModels);
  const result: Record<AIProvider, ModelEntry[]> = {
    openai: [],
    anthropic: [],
    google: [],
    openrouter: [],
    lmstudio: [],
  };
  for (const m of all) {
    result[m.provider].push(m);
  }
  return result;
}

export function getProviderForModel(modelId: string, customModels: CustomModel[]): AIProvider {
  // Check custom models first
  const custom = customModels.find(m => m.id === modelId);
  if (custom) return custom.provider;
  // Check defaults
  const def = DEFAULT_MODELS.find(m => m.id === modelId);
  if (def) return def.provider;
  // Heuristic fallback
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1-') || modelId.startsWith('o3-')) return 'openai';
  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gemini-')) return 'google';
  return 'openrouter';
}

export function getAPIKeyForModel(settings: ProviderSettings): string {
  const provider = getProviderForModel(settings.selectedModel, settings.customModels);
  return settings.keys[provider];
}

// ===== Provider display info =====

export const PROVIDER_INFO: Record<AIProvider, { name: string; keyPrefix: string; keyUrl: string; keyUrlLabel: string }> = {
  openai: {
    name: 'OpenAI',
    keyPrefix: 'sk-',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'Get OpenAI API key',
  },
  anthropic: {
    name: 'Anthropic',
    keyPrefix: 'sk-ant-',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyUrlLabel: 'Get Anthropic API key',
  },
  google: {
    name: 'Google',
    keyPrefix: 'AIza',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyUrlLabel: 'Get Google API key',
  },
  openrouter: {
    name: 'OpenRouter',
    keyPrefix: 'sk-or-',
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlLabel: 'Get OpenRouter API key',
  },
  lmstudio: {
    name: 'LM Studio',
    keyPrefix: 'http',
    keyUrl: 'https://lmstudio.ai',
    keyUrlLabel: 'LM Studio — local OpenAI-compatible server',
  },
};

export const PROVIDER_ORDER: AIProvider[] = ['openai', 'anthropic', 'google', 'openrouter', 'lmstudio'];

// ===== Model discovery links =====

export const MODEL_DISCOVERY_URLS: Record<AIProvider, { url: string; label: string }> = {
  openai: { url: 'https://platform.openai.com/docs/models', label: 'OpenAI Models' },
  anthropic: { url: 'https://docs.anthropic.com/en/docs/about-claude/models', label: 'Anthropic Models' },
  google: { url: 'https://ai.google.dev/gemini-api/docs/models', label: 'Google Models' },
  openrouter: { url: 'https://openrouter.ai/models', label: 'OpenRouter Models' },
  lmstudio: { url: 'https://lmstudio.ai/models', label: 'LM Studio Model Catalog' },
};

// ===== AI Call Logic =====

interface AICallOptions {
  settings: ProviderSettings;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  onChunk?: (chunk: string) => void;
  /** Optional override for the system prompt (e.g. with dynamic pack context) */
  systemPromptOverride?: string;
  /** AbortSignal for cancelling the in-flight request */
  signal?: AbortSignal;
}

export interface AITokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated?: boolean;
}

export interface AICallResult {
  text: string;
  usage: AITokenUsage | null;
}

// ===== Think-block filtering (Qwen3 / reasoning models) =====
// Some models (Qwen3, DeepSeek-R1, etc.) output <think>...</think> blocks before
// their actual response. The markdown renderer silently drops unknown HTML tags,
// making the response appear blank. We strip these blocks both in the streaming
// path (so users don't see raw think content) and in the final text.

/** Strip all <think>...</think> blocks from a completed response. */
function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\n?/gi, '').trimStart();
}

/**
 * Returns the length of the longest suffix of `str` that is a prefix of `tag`.
 * Used to detect partial tag matches at chunk boundaries.
 */
function longestTagSuffixLen(str: string, tag: string): number {
  const max = Math.min(tag.length - 1, str.length);
  for (let len = max; len > 0; len--) {
    if (str.endsWith(tag.slice(0, len))) return len;
  }
  return 0;
}

/**
 * Wraps an onChunk callback with a stateful filter that suppresses
 * <think>...</think> content during streaming.
 */
function makeThinkStreamFilter(onChunk: (chunk: string) => void): (chunk: string) => void {
  let inThink = false;
  let tail = ''; // partial tag buffered across chunk boundaries

  return (rawChunk: string) => {
    let text = tail + rawChunk;
    tail = '';
    let out = '';

    while (text.length > 0) {
      if (inThink) {
        const endTag = '</think>';
        const idx = text.indexOf(endTag);
        if (idx !== -1) {
          // Found the closing tag — resume normal output after it
          text = text.slice(idx + endTag.length);
          if (text.startsWith('\n')) text = text.slice(1); // strip trailing newline
          inThink = false;
        } else {
          // Might have a partial </think> split across the chunk boundary
          const partialLen = longestTagSuffixLen(text, endTag);
          if (partialLen > 0) tail = text.slice(text.length - partialLen);
          text = '';
        }
      } else {
        const startTag = '<think>';
        const idx = text.indexOf(startTag);
        if (idx !== -1) {
          out += text.slice(0, idx);
          text = text.slice(idx + startTag.length);
          inThink = true;
        } else {
          // Check for partial <think> split at the end
          const partialLen = longestTagSuffixLen(text, startTag);
          if (partialLen > 0) {
            out += text.slice(0, text.length - partialLen);
            tail = text.slice(text.length - partialLen);
          } else {
            out += text;
          }
          text = '';
        }
      }
    }

    if (out.length > 0) onChunk(out);
  };
}

export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const { settings, messages, onChunk, systemPromptOverride, signal } = options;
  const provider = getProviderForModel(settings.selectedModel, settings.customModels);
  const apiKey = settings.keys[provider];
  const contextWindow = getModelContextWindow(settings.selectedModel);
  const maxOutput = getMaxOutputTokens(settings.selectedModel);

  console.log(
    `[AI] Model: ${settings.selectedModel} | Context: ${contextWindow.toLocaleString()} | Max output: ${maxOutput.toLocaleString()} | Provider: ${provider}`,
  );

  if (!apiKey && provider !== 'lmstudio') {
    throw new Error(`No API key configured for ${PROVIDER_INFO[provider].name}. Please add your key in the Keys tab.`);
  }

  const prompt = systemPromptOverride || await systemPromptPromise;
  console.log('[SystemPrompt] Final prompt length:', prompt.length);
  console.log('[SystemPrompt] Contains checkpoints:', prompt.includes('safetensors'));
  console.log('[SystemPrompt] Prompt preview (first 500 chars):', prompt.substring(0, 500));

  const allMessages = [
    { role: 'system' as const, content: prompt },
    ...messages,
  ];

  const joinedInput = allMessages.map((m) => m.content || '').join('\n');
  const tokenCalc = calculateMaxTokens(joinedInput, settings.selectedModel);

  if (!tokenCalc.fits) {
    console.warn('[AI] Input may exceed model context budget:', tokenCalc.error);
  }
  console.log('[AI] Token budget:', {
    model: settings.selectedModel,
    inputTokens: tokenCalc.inputTokens,
    contextWindow: tokenCalc.contextWindow,
    maxOutputTokens: maxOutput,
  });

  // Filter <think>...</think> blocks from streaming output (Qwen3, DeepSeek-R1, etc.)
  const filteredOnChunk = onChunk ? makeThinkStreamFilter(onChunk) : undefined;

  let result: AICallResult;
  switch (provider) {
    case 'openai':
      result = await callOpenAI(apiKey, settings.selectedModel, allMessages, filteredOnChunk, undefined, signal);
      break;
    case 'anthropic':
      result = await callAnthropic(apiKey, settings.selectedModel, allMessages, filteredOnChunk, signal);
      break;
    case 'google':
      result = await callGoogle(apiKey, settings.selectedModel, allMessages, filteredOnChunk, signal);
      break;
    case 'openrouter':
      result = await callOpenRouter(apiKey, settings.selectedModel, allMessages, filteredOnChunk, signal);
      break;
    case 'lmstudio': {
      // LM Studio 0.3.x used /v1, version 0.4.x uses /api/v1 for its native API.
      // Both versions expose OpenAI-compatible endpoints — we probe /v1/models first
      // and fall back to /api/v1 if it fails.
      const lmHost = (settings.keys.lmstudio || 'http://localhost:1234')
        .trim()
        .replace(/\/$/, '')
        .replace(/\/(api\/)?v1$/, ''); // strip any existing path so we control it
      let lmBase = `${lmHost}/v1`;
      try {
        const probe = await fetch(`${lmHost}/v1/models`, { signal: AbortSignal.timeout(2000) });
        if (!probe.ok) lmBase = `${lmHost}/api/v1`;
      } catch {
        lmBase = `${lmHost}/api/v1`;
      }
      result = await callOpenAI('lm-studio', settings.selectedModel, allMessages, filteredOnChunk, lmBase, signal);
      break;
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  // Strip any residual <think>...</think> blocks from the final text.
  // This covers: non-streaming calls, and streaming calls where the streamer
  // accumulates raw deltas independently of the filtered onChunk callback.
  const cleanText = stripThinkBlocks(result.text);

  if (result.usage) {
    return { ...result, text: cleanText };
  }

  const estimatedInput = Math.max(0, Math.round(joinedInput.length * 0.75));
  const estimatedOutput = Math.max(0, Math.round(cleanText.length * 0.75));
  const estimatedUsage: AITokenUsage = {
    inputTokens: estimatedInput,
    outputTokens: estimatedOutput,
    totalTokens: estimatedInput + estimatedOutput,
    estimated: true,
  };
  console.log('[AI] Usage metadata missing; estimated token usage:', estimatedUsage);
  return {
    text: cleanText,
    usage: estimatedUsage,
  };
}

// ===== Provider Implementations =====

type ChatMessage = { role: string; content: string };

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void,
  baseUrl = 'https://api.openai.com/v1',
  signal?: AbortSignal,
): Promise<AICallResult> {
  const maxOutput = getMaxOutputTokens(model);
  const isOfficialOpenAI = baseUrl.includes('api.openai.com');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: !!onChunk,
      // stream_options and max_completion_tokens are OpenAI-specific — local servers use max_tokens
      ...(isOfficialOpenAI
        ? { stream_options: onChunk ? { include_usage: true } : undefined, max_completion_tokens: maxOutput }
        : { max_tokens: maxOutput }
      ),
      temperature: 0.3,
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errorBody}`);
  }

  if (onChunk && res.body) {
    return readOpenAIStream(res.body, onChunk);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage ? {
    inputTokens: data.usage.prompt_tokens ?? 0,
    outputTokens: data.usage.completion_tokens ?? 0,
    totalTokens: data.usage.total_tokens ?? ((data.usage.prompt_tokens ?? 0) + (data.usage.completion_tokens ?? 0)),
  } : null;
  return { text, usage };
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<AICallResult> {
  const maxOutput = getMaxOutputTokens(model);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ComfyUI Workflow Architect',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: !!onChunk,
      stream_options: onChunk ? { include_usage: true } : undefined,
      max_completion_tokens: maxOutput,
      temperature: 0.3,
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${errorBody}`);
  }

  if (onChunk && res.body) {
    return readOpenAIStream(res.body, onChunk);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const usage = data.usage ? {
    inputTokens: data.usage.prompt_tokens ?? 0,
    outputTokens: data.usage.completion_tokens ?? 0,
    totalTokens: data.usage.total_tokens ?? ((data.usage.prompt_tokens ?? 0) + (data.usage.completion_tokens ?? 0)),
  } : null;
  return { text, usage };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<AICallResult> {
  const maxOutput = getMaxOutputTokens(model);

  // Anthropic uses a separate system param and only user/assistant messages
  const systemContent = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Ensure first message is from user (Anthropic requirement)
  if (chatMessages.length > 0 && chatMessages[0].role !== 'user') {
    chatMessages.unshift({ role: 'user', content: 'Hello' });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      system: systemContent,
      messages: chatMessages,
      stream: !!onChunk,
      max_tokens: maxOutput,
      temperature: 0.3,
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errorBody}`);
  }

  if (onChunk && res.body) {
    return readAnthropicStream(res.body, onChunk);
  }

  const data = await res.json();
  const text = data.content?.map((b: any) => b.text).join('') || '';
  const usage = data.usage ? {
    inputTokens: data.usage.input_tokens ?? 0,
    outputTokens: data.usage.output_tokens ?? 0,
    totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
  } : null;
  return { text, usage };
}

async function callGoogle(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<AICallResult> {
  const maxOutput = getMaxOutputTokens(model);

  // Convert OpenAI-style messages to Gemini format
  const systemContent = messages.find(m => m.role === 'system')?.content || '';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  // Ensure starts with user
  if (contents.length > 0 && contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  const endpoint = onChunk ? 'streamGenerateContent' : 'generateContent';
  const altParam = onChunk ? '&alt=sse' : '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}${altParam}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: systemContent ? { parts: [{ text: systemContent }] } : undefined,
      contents,
      generationConfig: {
        maxOutputTokens: maxOutput,
        temperature: 0.3,
      },
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google API error ${res.status}: ${errorBody}`);
  }

  if (onChunk && res.body) {
    return readGoogleStream(res.body, onChunk);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
  const usage = data.usageMetadata ? {
    inputTokens: data.usageMetadata.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata.candidatesTokenCount ?? 0,
    totalTokens: data.usageMetadata.totalTokenCount
      ?? ((data.usageMetadata.promptTokenCount ?? 0) + (data.usageMetadata.candidatesTokenCount ?? 0)),
  } : null;
  return { text, usage };
}

// ===== Stream Readers =====

async function readOpenAIStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void,
): Promise<AICallResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  let streamUsage: AITokenUsage | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.usage) {
          streamUsage = {
            inputTokens: parsed.usage.prompt_tokens ?? 0,
            outputTokens: parsed.usage.completion_tokens ?? 0,
            totalTokens: parsed.usage.total_tokens
              ?? ((parsed.usage.prompt_tokens ?? 0) + (parsed.usage.completion_tokens ?? 0)),
          };
        }
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk(delta);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return { text: full, usage: streamUsage };
}

async function readAnthropicStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void,
): Promise<AICallResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let hasUsage = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);

      try {
        const parsed = JSON.parse(payload);
        if (parsed.type === 'message_start' && parsed.message?.usage) {
          inputTokens = parsed.message.usage.input_tokens ?? inputTokens;
          hasUsage = true;
        }
        if (parsed.type === 'message_delta' && parsed.usage) {
          outputTokens = parsed.usage.output_tokens ?? outputTokens;
          hasUsage = true;
        }
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          full += parsed.delta.text;
          onChunk(parsed.delta.text);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return {
    text: full,
    usage: hasUsage
      ? {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        }
      : null,
  };
}

async function readGoogleStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void,
): Promise<AICallResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  let streamUsage: AITokenUsage | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);

      try {
        const parsed = JSON.parse(payload);
        if (parsed.usageMetadata) {
          streamUsage = {
            inputTokens: parsed.usageMetadata.promptTokenCount ?? 0,
            outputTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: parsed.usageMetadata.totalTokenCount
              ?? ((parsed.usageMetadata.promptTokenCount ?? 0) + (parsed.usageMetadata.candidatesTokenCount ?? 0)),
          };
        }
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          full += text;
          onChunk(text);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return { text: full, usage: streamUsage };
}




/**
 * Phase 11A - Context Token Estimator
 *
 * Provides lightweight token usage estimates for UI context monitoring.
 * This uses character heuristics, not an exact tokenizer.
 */

import { getMaxOutputTokens, getModelContextWindow } from './ai-provider';

export interface TokenEstimate {
  total: number;
  breakdown: TokenBreakdown;
  modelLimit: number;
  usagePercent: number;
  status: 'ok' | 'warning' | 'critical';
  statusMessage: string;
}

export interface TokenBreakdown {
  systemPrompt: number;
  workflowJson: number;
  workflowMetadata: number;
  nodeSchemas: number;
  modelLibrary: number;
  nodeSchemasByPack: Array<{
    packId: string;
    packName: string;
    tokens: number;
    nodeCount: number;
    included: boolean;
    category: 'core' | 'popular' | 'custom' | 'unknown';
  }>;
  conversationHistory: number;
  other: number;
}

export interface ModelContextInfo {
  name: string;
  maxTokens: number;
  outputReserve: number;
}

export const KNOWN_MODELS: Record<string, ModelContextInfo> = {};

const CHARS_PER_TOKEN = 4;
const CHARS_PER_TOKEN_JSON = 3.5;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateJsonTokens(value: any): number {
  if (value == null) return 0;
  try {
    const json = typeof value === 'string' ? value : JSON.stringify(value);
    return Math.ceil(json.length / CHARS_PER_TOKEN_JSON);
  } catch {
    return 0;
  }
}

export function resolveModelContext(selectedModel?: string): ModelContextInfo {
  const key = (selectedModel || '').trim();
  const modelId = key || 'unknown-model';
  return {
    name: key || 'Default',
    maxTokens: getModelContextWindow(modelId),
    outputReserve: getMaxOutputTokens(modelId),
  };
}

export function estimateContextUsage(params: {
  systemPrompt?: string;
  workflowJson?: any;
  workflowMetadata?: string;
  nodeSchemas?: any;
  modelLibraryPrompt?: string;
  nodeSchemasByPack?: Array<{
    packId: string;
    packName: string;
    tokens: number;
    nodeCount: number;
    included: boolean;
    category: 'core' | 'popular' | 'custom' | 'unknown';
  }>;
  conversationHistory?: string[];
  selectedModel?: string;
  modelLimitOverride?: number;
}): TokenEstimate {
  const model = resolveModelContext(params.selectedModel);
  const modelLibraryTokens = estimateTokens(params.modelLibraryPrompt || '');
  const rawSystemPromptTokens = estimateTokens(params.systemPrompt || '');
  const systemIncludesModelLibrary = Boolean(
    params.modelLibraryPrompt
    && params.systemPrompt
    && params.systemPrompt.includes(params.modelLibraryPrompt.trim()),
  );
  const breakdown: TokenBreakdown = {
    systemPrompt: systemIncludesModelLibrary
      ? Math.max(0, rawSystemPromptTokens - modelLibraryTokens)
      : rawSystemPromptTokens,
    workflowJson: estimateJsonTokens(params.workflowJson),
    workflowMetadata: estimateTokens(params.workflowMetadata || ''),
    nodeSchemas: estimateJsonTokens(params.nodeSchemas),
    modelLibrary: modelLibraryTokens,
    nodeSchemasByPack: params.nodeSchemasByPack || [],
    conversationHistory: (params.conversationHistory || []).reduce(
      (sum, message) => sum + estimateTokens(message),
      0,
    ),
    other: 500,
  };

  const total =
    breakdown.systemPrompt +
    breakdown.workflowJson +
    breakdown.workflowMetadata +
    breakdown.nodeSchemas +
    breakdown.modelLibrary +
    breakdown.conversationHistory +
    breakdown.other;
  const modelLimit = params.modelLimitOverride && params.modelLimitOverride > 0
    ? Math.max(1, Math.floor(params.modelLimitOverride))
    : Math.max(1, model.maxTokens - model.outputReserve);
  const usagePercent = Math.round((total / modelLimit) * 100);

  if (usagePercent < 60) {
    return {
      total,
      breakdown,
      modelLimit,
      usagePercent: Math.min(usagePercent, 100),
      status: 'ok',
      statusMessage: 'Plenty of context space remaining.',
    };
  }
  if (usagePercent < 85) {
    return {
      total,
      breakdown,
      modelLimit,
      usagePercent: Math.min(usagePercent, 100),
      status: 'warning',
      statusMessage: 'Context is getting full. Consider switching to a larger context model.',
    };
  }
  return {
    total,
    breakdown,
    modelLimit,
    usagePercent: Math.min(usagePercent, 100),
    status: 'critical',
    statusMessage: 'Context is near limit. Switch model or reduce workflow/context payload.',
  };
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

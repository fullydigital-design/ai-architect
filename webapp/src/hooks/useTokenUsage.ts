import { useCallback, useState } from 'react';

export interface TokenUsageEntry {
  timestamp: number;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated?: boolean;
}

export interface SessionTokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  messageCount: number;
  entries: TokenUsageEntry[];
}

/**
 * Tracks token usage for the current page session.
 */
export function useTokenUsage() {
  const [usage, setUsage] = useState<SessionTokenUsage>({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    messageCount: 0,
    entries: [],
  });

  const addUsage = useCallback((entry: Omit<TokenUsageEntry, 'timestamp'>) => {
    setUsage((prev) => {
      const nextEntry: TokenUsageEntry = {
        ...entry,
        timestamp: Date.now(),
      };
      return {
        totalInputTokens: prev.totalInputTokens + entry.inputTokens,
        totalOutputTokens: prev.totalOutputTokens + entry.outputTokens,
        totalTokens: prev.totalTokens + entry.totalTokens,
        messageCount: prev.messageCount + 1,
        entries: [...prev.entries, nextEntry],
      };
    });
  }, []);

  const resetUsage = useCallback(() => {
    setUsage({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      messageCount: 0,
      entries: [],
    });
  }, []);

  return { usage, addUsage, resetUsage };
}


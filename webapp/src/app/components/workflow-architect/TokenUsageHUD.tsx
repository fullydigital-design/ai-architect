import { useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { SessionTokenUsage } from '../../../hooks/useTokenUsage';

interface TokenUsageHUDProps {
  usage: SessionTokenUsage;
  onReset?: () => void;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function TokenUsageHUD({ usage, onReset }: TokenUsageHUDProps) {
  const [expanded, setExpanded] = useState(false);
  const hasEstimated = useMemo(
    () => usage.entries.some((entry) => entry.estimated),
    [usage.entries],
  );

  if (usage.messageCount === 0) return null;

  const last = usage.entries.length > 0 ? usage.entries[usage.entries.length - 1] : null;
  const avgTokens = usage.messageCount > 0
    ? Math.round(usage.totalTokens / usage.messageCount)
    : 0;

  return (
    <div
      className="absolute top-14 left-3 z-50 select-none"
      style={{ pointerEvents: 'auto' }}
    >
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-200/90 backdrop-blur-sm border border-border text-[11px] text-content-secondary hover:text-content-primary hover:border-border-strong transition-all cursor-pointer"
      >
        <Activity className="w-3 h-3 text-primary" />
        <span className="text-content-primary font-mono">
          {hasEstimated ? '~' : ''}
          {formatTokens(usage.totalTokens)}
        </span>
        <span className="text-content-faint">tokens</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-content-faint" />
        ) : (
          <ChevronDown className="w-3 h-3 text-content-faint" />
        )}
      </button>

      {expanded && (
        <div className="mt-1 px-3 py-2 rounded bg-surface-200/95 backdrop-blur-sm border border-border text-[10px] space-y-1.5 min-w-[210px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-content-muted">↑ Input</span>
            <span className="text-content-primary font-mono">{formatTokens(usage.totalInputTokens)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-content-muted">↓ Output</span>
            <span className="text-content-primary font-mono">{formatTokens(usage.totalOutputTokens)}</span>
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between gap-4">
            <span className="text-content-muted">Messages</span>
            <span className="text-content-primary font-mono">{usage.messageCount}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-content-muted">Avg / msg</span>
            <span className="text-content-primary font-mono">{formatTokens(avgTokens)}</span>
          </div>

          {last && (
            <>
              <div className="border-t border-border" />
              <div className="text-content-faint">Last call:</div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-content-muted truncate max-w-[110px]" title={last.model}>{last.model}</span>
                <span className="text-content-secondary font-mono">
                  {formatTokens(last.inputTokens)} → {formatTokens(last.outputTokens)}
                </span>
              </div>
              {last.estimated && (
                <div className="text-[9px] text-content-faint">Estimated usage (provider did not return token metadata)</div>
              )}
            </>
          )}

          {onReset && (
            <>
              <div className="border-t border-border" />
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onReset();
                }}
                className="flex items-center gap-1 text-content-faint hover:text-content-secondary transition-colors w-full"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset counter</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

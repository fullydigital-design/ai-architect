/**
 * ActiveContextBar - compact status bar above the chat input showing:
 * - Current library mode (My Packs Only / Discover)
 * - Number of pinned packs
 * - Estimated token overhead
 * - Quick mode toggle
 */

import { useMemo, useState } from 'react';
import { Lock, Globe, Package, ChevronRight, Settings2 } from 'lucide-react';
import type { PinnedNodePack, LibraryMode } from '../../../hooks/useNodeLibrary';
import { estimatePacksTokens } from '../../../services/pack-suggester';

interface ActiveContextBarProps {
  pinnedPacks: PinnedNodePack[];
  libraryMode: LibraryMode;
  onToggleMode: () => void;
  onOpenNodesBrowser?: () => void;
}

export function ActiveContextBar({
  pinnedPacks,
  libraryMode,
  onToggleMode,
  onOpenNodesBrowser,
}: ActiveContextBarProps) {
  const [showPacks, setShowPacks] = useState(false);

  const tokenEstimate = useMemo(
    () => estimatePacksTokens(pinnedPacks),
    [pinnedPacks],
  );

  const isMyPacks = libraryMode === 'my-packs';
  const packCount = pinnedPacks.length;
  const hasContent = packCount > 0 || isMyPacks;

  if (!hasContent) return null;

  const formattedTokens =
    tokenEstimate >= 1000
      ? `~${(tokenEstimate / 1000).toFixed(1)}k`
      : `~${tokenEstimate}`;

  return (
    <div className="shrink-0 border-t border-border bg-surface-200">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button
          onClick={onToggleMode}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] border transition-all duration-150 bg-primary/10 border-primary/25 text-primary hover:bg-primary/15 hover:border-primary/35"
          title={
            isMyPacks
              ? 'My Packs Only - AI restricted to pinned packs + core nodes. Click to switch to Discover.'
              : 'Discover Mode - AI prefers pinned packs but may suggest others. Click to switch to My Packs Only.'
          }
        >
          {isMyPacks ? (
            <Lock className="w-2.5 h-2.5" />
          ) : (
            <Globe className="w-2.5 h-2.5" />
          )}
          {isMyPacks ? 'My Packs Only' : 'Discover'}
        </button>

        {packCount > 0 ? (
          <button
            onClick={() => setShowPacks(!showPacks)}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title="Click to see pinned packs"
          >
            <Package className="w-2.5 h-2.5 text-text-muted" />
            <span>
              <span className="text-muted-foreground">{packCount}</span> pack{packCount !== 1 ? 's' : ''}
            </span>
            <ChevronRight
              className={`w-2.5 h-2.5 text-text-muted transition-transform duration-150 ${
                showPacks ? 'rotate-90' : ''
              }`}
            />
          </button>
        ) : (
          <span className="text-[10px] text-text-muted flex items-center gap-1">
            <Package className="w-2.5 h-2.5" />
            No packs pinned
          </span>
        )}

        <div className="flex-1" />

        {packCount > 0 && (
          <span
            className="inline-flex items-center rounded-sm border border-border bg-accent px-1.5 py-0.5 text-[9px] text-muted-foreground tabular-nums"
            title={`Estimated ${tokenEstimate} extra tokens added to system prompt for pack context`}
          >
            {formattedTokens} tok
          </span>
        )}

        {onOpenNodesBrowser && (
          <button
            onClick={onOpenNodesBrowser}
            className="p-1 rounded-sm text-text-muted hover:text-muted-foreground hover:bg-accent transition-colors"
            title="Open Custom Nodes Browser"
          >
            <Settings2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {showPacks && packCount > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {pinnedPacks.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-accent border border-border text-[9px] text-muted-foreground"
              title={`${p.title} - ${p.nodeCount} nodes`}
            >
              <span className="w-1 h-1 rounded-full bg-emerald-500/60 shrink-0" />
              <span className="truncate max-w-[140px]">{p.title}</span>
              <span className="text-text-muted">{p.nodeCount}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


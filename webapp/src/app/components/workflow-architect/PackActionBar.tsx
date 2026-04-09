/**
 * PackActionBar — batch action bar shown below AI messages that contain
 * {{pack:slug}} recommendations. Allows "Pin All" or individual toggling.
 */

import { useState } from 'react';
import { Package, Check, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { toast } from 'sonner';
import type { CustomNodePackInfo } from '../../../data/custom-node-registry';

interface ResolvedPack {
  slug: string;
  packInfo: CustomNodePackInfo | null;
  pinned: boolean;
}

interface PackActionBarProps {
  resolvedPacks: ResolvedPack[];
  onPin: (pack: CustomNodePackInfo) => void;
  onUnpin: (packId: string) => void;
  onPinMultiple: (packs: CustomNodePackInfo[]) => void;
}

export function PackActionBar({
  resolvedPacks,
  onPin,
  onUnpin,
  onPinMultiple,
}: PackActionBarProps) {
  const [expanded, setExpanded] = useState(false);

  // Only show packs that exist in the registry
  const available = resolvedPacks.filter(p => p.packInfo !== null);
  const unpinned = available.filter(p => !p.pinned);
  const pinnedCount = available.filter(p => p.pinned).length;
  const allPinned = unpinned.length === 0 && available.length > 0;

  if (available.length === 0) return null;

  const handlePinAll = () => {
    const toPinPacks = unpinned
      .map(p => p.packInfo)
      .filter((p): p is CustomNodePackInfo => p !== null);
    if (toPinPacks.length === 0) return;
    onPinMultiple(toPinPacks);
    toast.success(`${toPinPacks.length} pack(s) added to AI scope`);
  };

  const handleToggle = (rp: ResolvedPack) => {
    if (!rp.packInfo) return;
    if (rp.pinned) {
      onUnpin(rp.packInfo.id);
      toast.success(`Unpinned ${rp.packInfo.title}`);
    } else {
      onPin(rp.packInfo);
      toast.success(`${rp.packInfo.title} added to AI scope`);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-accent/20 bg-indigo-500/[0.04] overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[11px] text-content-secondary hover:text-content-primary transition-colors"
        >
          <Package className="w-3.5 h-3.5 text-accent-text" />
          <span>
            <span className="text-accent-text">{available.length}</span> pack{available.length !== 1 ? 's' : ''} recommended
            {pinnedCount > 0 && (
              <span className="text-emerald-400/70 ml-1.5">
                ({pinnedCount} pinned)
              </span>
            )}
          </span>
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-content-faint" />
          ) : (
            <ChevronDown className="w-3 h-3 text-content-faint" />
          )}
        </button>

        {allPinned ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
            <Check className="w-3 h-3" />
            All added
          </span>
        ) : (
          <button
            onClick={handlePinAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-accent-text text-[10px] border border-indigo-500/25 hover:border-indigo-400/40 transition-all"
          >
            <Pin className="w-3 h-3" />
            Pin all {unpinned.length}
          </button>
        )}
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="px-3 pb-2.5 pt-0.5 border-t border-indigo-500/10 space-y-1">
          {available.map(rp => (
            <div
              key={rp.slug}
              className="flex items-center justify-between py-1 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => handleToggle(rp)}
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                    rp.pinned
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'border-border-strong hover:border-indigo-400 text-transparent hover:text-accent-text'
                  }`}
                >
                  <Check className="w-2.5 h-2.5" />
                </button>
                <span className={`text-[11px] truncate ${rp.pinned ? 'text-emerald-300/80' : 'text-content-secondary'}`}>
                  {rp.packInfo?.title || rp.slug}
                </span>
                {rp.packInfo && rp.packInfo.nodeCount > 0 && (
                  <span className="text-[9px] text-content-faint shrink-0">
                    {rp.packInfo.nodeCount} nodes
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

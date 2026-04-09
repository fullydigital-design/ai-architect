/**
 * PackChip — inline interactive chip rendered inside AI chat messages
 * when the AI recommends a custom node pack using {{pack:slug}} syntax.
 *
 * States:
 *   - Pinned: green/teal fill with checkmark — click to unpin
 *   - Available (unpinned): blue/purple border with + icon — click to pin
 *   - Unknown: gray, non-interactive — pack not found in registry
 */

import { Package, Plus, Check, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { CustomNodePackInfo } from '../../../data/custom-node-registry';

interface PackChipProps {
  slug: string;
  packInfo: CustomNodePackInfo | null;
  isPinned: boolean;
  onPin: (pack: CustomNodePackInfo) => void;
  onUnpin: (packId: string) => void;
}

export function PackChip({ slug, packInfo, isPinned, onPin, onUnpin }: PackChipProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!packInfo) return; // unknown pack — non-interactive

    if (isPinned) {
      onUnpin(packInfo.id);
      toast.success(`Unpinned ${packInfo.title}`);
    } else {
      onPin(packInfo);
      toast.success(`${packInfo.title} added to AI scope`);
    }
  };

  // Unknown pack — not in registry
  if (!packInfo) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-surface-elevated/50 border border-border-strong/50 text-content-muted text-[11px] cursor-default align-middle"
        title={`Pack "${slug}" not found in registry`}
      >
        <HelpCircle className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[180px]">{slug}</span>
      </span>
    );
  }

  // Pinned state
  if (isPinned) {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] hover:bg-emerald-500/25 hover:border-emerald-400/40 transition-all duration-150 cursor-pointer align-middle group"
        title={`${packInfo.title} — pinned (${packInfo.nodeCount} nodes). Click to unpin.`}
      >
        <Check className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[180px]">{packInfo.title}</span>
        {packInfo.nodeCount > 0 && (
          <span className="text-emerald-500/60 text-[9px] ml-0.5 shrink-0">
            {packInfo.nodeCount}
          </span>
        )}
      </button>
    );
  }

  // Available (unpinned) state
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-accent-muted border border-accent/30 text-accent-text text-[11px] hover:bg-accent-muted hover:border-indigo-400/40 transition-all duration-150 cursor-pointer align-middle group"
      title={`${packInfo.title} (${packInfo.nodeCount} nodes). Click to add to AI scope.`}
    >
      <Package className="w-3 h-3 shrink-0 group-hover:hidden" />
      <Plus className="w-3 h-3 shrink-0 hidden group-hover:block" />
      <span className="truncate max-w-[180px]">{packInfo.title}</span>
      {packInfo.nodeCount > 0 && (
        <span className="text-accent-text/50 text-[9px] ml-0.5 shrink-0">
          {packInfo.nodeCount}
        </span>
      )}
    </button>
  );
}

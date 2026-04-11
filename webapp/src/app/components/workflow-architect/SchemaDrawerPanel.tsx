import { useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { GripVertical, X } from 'lucide-react';
import type { InstalledModels } from '@/services/comfyui-backend';
import type { ModelPreset } from '@/hooks/useModelLibrary';
import type { ClassifiedPack, SelectorState } from '@/services/node-schema-selector';
import { NodeSchemaSelector } from './NodeSchemaSelector';

interface SchemaDrawerPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  tokenCount: number;
  tokenLimit: number;
  selectedPackCount: number;
  schemaSelectorState: SelectorState;
  schemaSelectorPacks: ClassifiedPack[];
  onSchemaSelectorStateChange: (state: SelectorState) => void;
  schemaSelectorStale?: boolean;
  modelInventory?: InstalledModels | null;
  modelCategories?: string[];
  modelSelectedCategories?: Set<string>;
  modelActivePreset?: ModelPreset;
  modelCategoryTokens?: Record<string, number>;
  modelLibraryTokens?: number;
  modelLibraryFiles?: number;
  modelLibraryLoading?: boolean;
  onApplyModelPreset?: (preset: Exclude<ModelPreset, 'custom'>) => void;
  onToggleModelCategory?: (category: string, selected: boolean) => void;
  onResetModelCategories?: () => void;
  onMentionModel?: (filename: string, categoryLabel: string) => void;
  comfyuiUrl?: string;
  onLoadWorkflowPath?: (path: string) => Promise<boolean> | boolean;
  onSendWorkflowToChat?: (workflowName: string) => void;
}

export function SchemaDrawerPanel({
  isOpen,
  onToggle,
  width,
  onWidthChange,
  tokenCount,
  tokenLimit,
  selectedPackCount,
  schemaSelectorState,
  schemaSelectorPacks,
  onSchemaSelectorStateChange,
  schemaSelectorStale,
  modelInventory,
  modelCategories,
  modelSelectedCategories,
  modelActivePreset,
  modelCategoryTokens,
  modelLibraryTokens,
  modelLibraryFiles,
  modelLibraryLoading,
  onApplyModelPreset,
  onToggleModelCategory,
  onResetModelCategories,
  onMentionModel,
  comfyuiUrl,
  onLoadWorkflowPath,
  onSendWorkflowToChat,
}: SchemaDrawerPanelProps) {
  const handleResizeStart = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(220, Math.min(400, startWidth + delta));
      onWidthChange(nextWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onWidthChange, width]);

  if (!isOpen) {
    const ratio = tokenLimit > 0 ? tokenCount / tokenLimit : 0;
    const progressHeight = Math.max(0, Math.min(100, ratio * 100));
    const progressColor = getProgressColor(tokenCount, tokenLimit);

    return (
      <div
        className="flex h-full w-10 shrink-0 cursor-pointer select-none flex-col items-center gap-3 border-r border-border bg-surface-1 py-3"
        onClick={onToggle}
        title="Open schema panel (Ctrl+Shift+S)"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="rounded-md bg-surface-2 p-1.5 text-text-tertiary transition-colors hover:bg-surface-3 hover:text-accent-text">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
          </svg>
        </div>

        <div
          className="whitespace-nowrap font-mono text-[10px] text-text-tertiary"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {formatRailTokenCount(tokenCount)}
        </div>

        <div className="flex w-1.5 max-h-20 flex-1 flex-col-reverse overflow-hidden rounded-full bg-surface-3">
          <div
            className={`w-full rounded-full transition-all ${progressColor}`}
            style={{ height: `${progressHeight}%` }}
          />
        </div>

        <div className="text-center text-[10px] leading-tight text-text-tertiary">
          <div className="font-mono">{selectedPackCount}</div>
          <div>pks</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-1"
      style={{ width: `${width}px` }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Node Schemas
        </span>
        <button
          onClick={onToggle}
          className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
          title="Close schema panel (Ctrl+Shift+S)"
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <NodeSchemaSelector
          state={schemaSelectorState}
          packs={schemaSelectorPacks}
          onChange={onSchemaSelectorStateChange}
          isStale={schemaSelectorStale}
          layout="panel"
          modelInventory={modelInventory}
          modelCategories={modelCategories}
          modelSelectedCategories={modelSelectedCategories}
          modelActivePreset={modelActivePreset}
          modelCategoryTokens={modelCategoryTokens}
          modelLibraryTokens={modelLibraryTokens}
          modelLibraryFiles={modelLibraryFiles}
          modelLibraryLoading={modelLibraryLoading}
          onApplyModelPreset={onApplyModelPreset}
          onToggleModelCategory={onToggleModelCategory}
          onResetModelCategories={onResetModelCategories}
          onMentionModel={onMentionModel}
          comfyuiUrl={comfyuiUrl}
          onLoadWorkflowPath={onLoadWorkflowPath}
          onSendWorkflowToChat={onSendWorkflowToChat}
        />
      </div>

      <div
        className="group absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-accent/30"
        onMouseDown={handleResizeStart}
        title="Resize schema panel"
      >
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-3 w-3 text-accent-text" />
        </div>
      </div>
    </div>
  );
}

function formatRailTokenCount(tokens: number): string {
  const rounded = Math.max(0, Math.round(tokens));
  if (rounded >= 1000) return `${Math.round(rounded / 1000)}k`;
  return String(rounded);
}

function getProgressColor(count: number, limit: number): string {
  if (limit <= 0) return 'bg-emerald-500';
  const ratio = count / limit;
  if (ratio < 0.5) return 'bg-emerald-500';
  if (ratio < 0.8) return 'bg-amber-500';
  return 'bg-red-500';
}

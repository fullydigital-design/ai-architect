import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  ChevronDown,
  ChevronRight,
  Copy,
  Library,
  Play,
  Puzzle,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ComfyUIWorkflow, WorkflowCategory, WorkflowTemplate } from '../../../types/comfyui';
import {
  deleteWorkflowFromLibrary,
  getAllLibraryTags,
  getLibraryStats,
  searchWorkflowLibrary,
} from '../../../services/workflow-library';

interface WorkflowLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadWorkflow: (workflow: ComfyUIWorkflow) => void;
  onCombineSelected?: (templates: WorkflowTemplate[]) => void;
  currentWorkflow?: ComfyUIWorkflow | null;
  onSaveCurrentWorkflow?: () => void;
  hideCloseButton?: boolean;
}

const CATEGORY_ORDER: WorkflowCategory[] = [
  'txt2img',
  'img2img',
  'upscale',
  'controlnet',
  'inpaint',
  'video',
  'ipadapter',
  'lora',
  'face-detailer',
  'custom',
];

const CATEGORY_COLORS: Record<WorkflowCategory, string> = {
  txt2img: 'bg-state-info-muted text-state-info',
  img2img: 'bg-state-info-muted text-state-info',
  upscale: 'bg-state-success-muted text-state-success',
  controlnet: 'bg-state-warning-muted text-state-warning',
  inpaint: 'bg-state-error-muted text-state-error',
  video: 'bg-accent-muted text-accent-text',
  ipadapter: 'bg-accent-muted text-accent-text',
  lora: 'bg-state-warning-muted text-state-warning',
  'face-detailer': 'bg-state-error-muted text-state-error',
  custom: 'bg-surface-elevated text-content-secondary',
};

export function WorkflowLibraryPanel({
  isOpen,
  onClose,
  onLoadWorkflow,
  onCombineSelected,
  currentWorkflow,
  onSaveCurrentWorkflow,
  hideCloseButton = false,
}: WorkflowLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<WorkflowCategory | null>(null);
  const [fragmentFilter, setFragmentFilter] = useState<'all' | 'workflows' | 'fragments'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [combineMode, setCombineMode] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const library = useMemo(() => {
    return searchWorkflowLibrary(searchQuery, {
      category: categoryFilter || undefined,
      isFragment: fragmentFilter === 'all' ? undefined : fragmentFilter === 'fragments',
    });
  }, [searchQuery, categoryFilter, fragmentFilter, refreshTick]);

  const stats = useMemo(() => getLibraryStats(), [refreshTick, library.length]);
  const allTags = useMemo(() => getAllLibraryTags(), [refreshTick, library.length]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<WorkflowCategory, number>> = {};
    for (const category of CATEGORY_ORDER) {
      counts[category] = stats.categories[category] || 0;
    }
    return counts;
  }, [stats.categories]);

  const handleDelete = useCallback((id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" from library?`)) {
      return;
    }
    const deleted = deleteWorkflowFromLibrary(id);
    if (!deleted) {
      toast.error(`Could not delete "${name}"`);
      return;
    }
    toast.success(`Deleted "${name}"`);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setRefreshTick((v) => v + 1);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCombine = useCallback(() => {
    const selected = library.filter((template) => selectedIds.has(template.id));
    if (selected.length < 2) {
      toast.error('Select at least 2 workflows to combine');
      return;
    }
    if (onCombineSelected) {
      onCombineSelected(selected);
    } else {
      toast.info('Combine feature coming soon');
    }
  }, [library, onCombineSelected, selectedIds]);

  const handleLoad = useCallback((template: WorkflowTemplate) => {
    onLoadWorkflow(template.workflow);
    toast.success(`Loaded "${template.name}"`);
    onClose();
  }, [onClose, onLoadWorkflow]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-surface-secondary text-content-primary">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-default">
        <div className="flex items-center gap-2 min-w-0">
          <Library className="w-4 h-4 text-accent shrink-0" />
          <span className="text-xs font-medium truncate">Workflow Library</span>
          <span className="text-[10px] text-content-faint">({stats.total})</span>
        </div>
        <div className="flex items-center gap-1">
          {combineMode && selectedIds.size >= 2 && (
            <button
              type="button"
              onClick={handleCombine}
              className="px-2 py-1 text-[10px] rounded bg-accent text-accent-contrast hover:bg-accent-hover transition-colors"
            >
              Combine ({selectedIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setCombineMode((prev) => !prev);
              setSelectedIds(new Set());
            }}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              combineMode
                ? 'bg-accent-muted text-accent-text'
                : 'text-content-faint hover:text-content-secondary hover:bg-surface-elevated'
            }`}
          >
            {combineMode ? 'Cancel' : 'Combine'}
          </button>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-content-faint hover:text-content-secondary hover:bg-surface-elevated transition-colors"
              title="Close library"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-content-faint" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            type="text"
            placeholder="Search workflows, nodes, models..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2 space-y-2">
        <div className="flex gap-0.5 bg-surface-elevated rounded-md p-0.5 w-fit">
          {(['all', 'workflows', 'fragments'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFragmentFilter(mode)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                fragmentFilter === mode
                  ? 'bg-accent-muted text-accent-text'
                  : 'text-content-faint hover:text-content-secondary'
              }`}
            >
              {mode === 'all'
                ? `All (${stats.total})`
                : mode === 'workflows'
                  ? `Full (${stats.workflows})`
                  : `Parts (${stats.fragments})`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {CATEGORY_ORDER.map((category) => {
            const count = categoryCounts[category] || 0;
            const selected = categoryFilter === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter((prev) => (prev === category ? null : category))}
                className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                  selected
                    ? 'border-accent/40 bg-accent-muted text-accent-text'
                    : 'border-border-default bg-surface-elevated text-content-faint hover:text-content-secondary'
                }`}
              >
                {category} ({count})
              </button>
            );
          })}
          {categoryFilter && (
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className="px-2 py-0.5 text-[10px] rounded-full bg-accent-muted text-accent-text hover:bg-accent-muted transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setCategoryFilter(null);
                  setSearchQuery(tag);
                }}
                className="px-1.5 py-0 text-[9px] rounded bg-surface-elevated text-content-faint hover:text-content-secondary transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-2">
        {library.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-5">
            <Library className="w-10 h-10 text-content-faint mb-3" />
            <p className="text-xs text-content-secondary mb-1">
              {searchQuery ? 'No workflows match your search' : 'Your workflow library is empty'}
            </p>
            <p className="text-[10px] text-content-faint mb-4">
              {searchQuery
                ? 'Try different search terms or clear filters.'
                : 'Save your current workflow to start building your reusable library.'}
            </p>
            {!searchQuery && currentWorkflow && onSaveCurrentWorkflow && (
              <button
                type="button"
                onClick={onSaveCurrentWorkflow}
                className="px-3 py-1.5 text-xs rounded-lg bg-accent text-accent-contrast hover:bg-accent-hover transition-colors"
              >
                Save Current Workflow
              </button>
            )}
          </div>
        ) : (
          library.map((template) => {
            const isExpanded = expandedId === template.id;
            const isSelected = selectedIds.has(template.id);
            return (
              <div
                key={template.id}
                className={`rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-accent/45 bg-accent-muted'
                    : 'border-border-default bg-surface-elevated'
                } ${combineMode ? 'cursor-pointer' : ''}`}
                onClick={combineMode ? () => handleToggleSelect(template.id) : undefined}
              >
                <div className="flex items-start gap-2 p-2.5">
                  {combineMode && (
                    <div
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-accent border-accent text-accent-contrast' : 'border-border-default'
                      }`}
                    >
                      {isSelected && <span className="text-[10px]">OK</span>}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {template.isFragment ? (
                        <Puzzle className="w-3 h-3 text-state-warning shrink-0" />
                      ) : (
                        <Box className="w-3 h-3 text-state-info shrink-0" />
                      )}
                      <span className="text-xs font-medium truncate">{template.name}</span>
                      <span className={`px-1.5 py-0 text-[9px] rounded-full ${CATEGORY_COLORS[template.category]}`}>
                        {template.category}
                      </span>
                    </div>

                    <p className="text-[10px] text-content-secondary line-clamp-2 mb-1.5">
                      {template.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {template.tags.slice(0, 5).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCategoryFilter(null);
                            setSearchQuery(tag);
                          }}
                          className="px-1 py-0 text-[9px] rounded bg-surface-inset text-content-faint hover:text-content-secondary transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                      {template.tags.length > 5 && (
                        <span className="text-[9px] text-content-faint">+{template.tags.length - 5}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[9px] text-content-faint">
                      <span>{template.nodeClassTypes.length} node types</span>
                      <span>{template.modelsUsed.length} models</span>
                      <span>{template.workflow.nodes.length} nodes</span>
                      <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {!combineMode && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoad(template)}
                        title="Load to canvas"
                        className="p-1 rounded text-content-faint hover:text-state-success hover:bg-state-success-muted transition-colors"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : template.id)}
                        title="Details"
                        className="p-1 rounded text-content-faint hover:text-state-info hover:bg-state-info-muted transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(template.id, template.name)}
                        title="Delete"
                        className="p-1 rounded text-content-faint hover:text-state-error hover:bg-state-error-muted transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && !combineMode && (
                  <div className="px-2.5 pb-2.5 border-t border-border-default pt-2 space-y-2">
                    <div>
                      <p className="text-[10px] text-content-faint mb-1">Node Types</p>
                      <div className="flex flex-wrap gap-1">
                        {template.nodeClassTypes.map((nodeType) => (
                          <span key={nodeType} className="px-1.5 py-0 text-[9px] rounded bg-state-info-muted text-state-info">
                            {nodeType}
                          </span>
                        ))}
                      </div>
                    </div>

                    {template.modelsUsed.length > 0 && (
                      <div>
                        <p className="text-[10px] text-content-faint mb-1">Models</p>
                        <div className="flex flex-col gap-0.5">
                          {template.modelsUsed.map((model) => (
                            <span key={model} className="text-[9px] text-state-warning/85 font-mono truncate">
                              {model}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {template.pipelineStages && template.pipelineStages.length > 0 && (
                      <div>
                        <p className="text-[10px] text-content-faint mb-1">Pipeline</p>
                        <div className="space-y-0.5">
                          {template.pipelineStages.map((stage) => (
                            <div key={stage.order} className="flex gap-2 text-[9px]">
                              <span className="text-content-faint shrink-0">#{stage.order}</span>
                              <span className="text-content-secondary">{stage.purpose}</span>
                              {stage.keySettings && (
                                <span className="text-content-faint truncate">{stage.keySettings}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {template.isFragment && template.fragmentType && (
                      <p className="text-[10px] text-state-warning/80">Fragment type: {template.fragmentType}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {currentWorkflow && onSaveCurrentWorkflow && !combineMode && library.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-t border-border-default">
          <button
            type="button"
            onClick={onSaveCurrentWorkflow}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-muted hover:bg-accent-muted text-accent-text text-xs transition-colors"
          >
            <Copy className="w-3 h-3" />
            Save Current Workflow to Library
          </button>
        </div>
      )}
    </div>
  );
}

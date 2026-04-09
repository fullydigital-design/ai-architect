import { useMemo } from 'react';
import { AlertTriangle, Box, GitMerge, Puzzle, X } from 'lucide-react';
import type { WorkflowTemplate } from '../../../types/comfyui';
import {
  estimateCombineTokens,
  validateCombination,
} from '../../../services/workflow-combiner';

interface CombineWorkflowsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WorkflowTemplate[];
  onConfirm: (templates: WorkflowTemplate[]) => void;
}

export function CombineWorkflowsDialog({
  isOpen,
  onClose,
  templates,
  onConfirm,
}: CombineWorkflowsDialogProps) {
  const validation = useMemo(() => validateCombination(templates), [templates]);
  const estimatedTokens = useMemo(() => estimateCombineTokens(templates), [templates]);
  const totalNodes = useMemo(
    () => templates.reduce((sum, template) => sum + template.workflow.nodes.length, 0),
    [templates],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-elevated border border-border-default rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-content-primary">Combine Workflows</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-content-faint hover:text-content-secondary hover:bg-surface-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-content-secondary">
            AI will merge these {templates.length} workflows into one unified pipeline, chaining
            outputs to inputs, reusing shared loaders, and resolving IDs.
          </p>

          <div className="space-y-2">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className="flex items-center gap-2 p-2 rounded-md bg-surface-secondary border border-border-default"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/25 text-accent-text text-[10px] font-medium shrink-0">
                  {String.fromCharCode(65 + index)}
                </span>
                {template.isFragment ? (
                  <Puzzle className="w-3 h-3 text-state-warning shrink-0" />
                ) : (
                  <Box className="w-3 h-3 text-state-info shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-content-primary truncate">{template.name}</p>
                  <p className="text-[10px] text-content-faint">
                    {template.workflow.nodes.length} nodes | {template.category}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-content-faint">
            <span>Combined: ~{totalNodes} nodes</span>
            <span>Est. tokens: ~{estimatedTokens.toLocaleString()}</span>
          </div>

          {validation && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-state-warning-muted border border-state-warning/20">
              <AlertTriangle className="w-3.5 h-3.5 text-state-warning shrink-0 mt-0.5" />
              <p className="text-[10px] text-state-warning">{validation}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-default">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-content-faint hover:text-content-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(templates)}
            disabled={!!validation}
            className="px-4 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-accent-contrast disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Combine with AI
          </button>
        </div>
      </div>
    </div>
  );
}

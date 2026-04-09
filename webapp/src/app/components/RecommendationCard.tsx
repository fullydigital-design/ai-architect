import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Package, Zap } from 'lucide-react';
import type { WorkflowRecommendation, RecommendedNode } from '../../services/brainstorm-parser';

export interface ValidatedRecommendedNode extends RecommendedNode {
  available: boolean;
}

interface RecommendationCardProps {
  recommendation: WorkflowRecommendation;
  validatedNodes: ValidatedRecommendedNode[];
  onBuild: (selectedClassTypes: string[], workflowTitle: string, workflowSummary: string) => void;
}

export function RecommendationCard({
  recommendation,
  validatedNodes,
  onBuild,
}: RecommendationCardProps) {
  const [checkedNodes, setCheckedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = new Set<string>();
    for (const node of validatedNodes) {
      if (node.available) next.add(node.class_type);
    }
    setCheckedNodes(next);
  }, [validatedNodes, recommendation.workflow_title]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ValidatedRecommendedNode[]>();
    for (const node of validatedNodes) {
      const pack = node.pack || 'Unknown';
      const bucket = groups.get(pack) || [];
      bucket.push(node);
      groups.set(pack, bucket);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [validatedNodes]);

  const availableNodes = useMemo(
    () => validatedNodes.filter((node) => node.available),
    [validatedNodes],
  );

  const allChecked = availableNodes.length > 0
    && availableNodes.every((node) => checkedNodes.has(node.class_type));

  const toggleNode = (classType: string) => {
    setCheckedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(classType)) next.delete(classType);
      else next.add(classType);
      return next;
    });
  };

  const selectAll = () => {
    setCheckedNodes(new Set(availableNodes.map((node) => node.class_type)));
  };

  const deselectAll = () => {
    setCheckedNodes(new Set());
  };

  const handleBuild = () => {
    const selected = [...checkedNodes];
    if (selected.length === 0) return;
    onBuild(selected, recommendation.workflow_title, recommendation.workflow_summary);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-sm border border-border bg-surface-1">
      <div className="border-b border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          <span className="text-sm text-text-primary">{recommendation.workflow_title}</span>
        </div>
        {recommendation.workflow_summary && (
          <p className="mt-1 text-xs text-text-secondary">{recommendation.workflow_summary}</p>
        )}
      </div>

      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <button
          onClick={allChecked ? deselectAll : selectAll}
          className="cursor-pointer text-xs text-accent-text transition-colors hover:text-text-primary"
        >
          {allChecked ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-xs text-text-tertiary">
          {checkedNodes.size} of {validatedNodes.length} nodes selected
        </span>
      </div>

      <div className="max-h-[300px] space-y-3 overflow-y-auto px-4 py-2">
        {grouped.map(([packName, nodes]) => (
          <div key={packName}>
            <div className="mb-1 flex items-center gap-1.5">
              <Package className="h-3 w-3 text-text-tertiary" />
              <span className="text-xs text-text-secondary">{packName}</span>
            </div>

            {nodes.map((node) => (
              <label
                key={`${packName}:${node.class_type}`}
                className={`flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1 transition-colors hover:bg-surface-2 ${
                  !node.available ? 'opacity-60' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checkedNodes.has(node.class_type)}
                  onChange={() => toggleNode(node.class_type)}
                  disabled={!node.available}
                  className="mt-0.5 accent-accent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm text-text-primary">{node.display_name}</span>
                    {node.available ? (
                      <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                    )}
                  </div>
                  {node.role && (
                    <span className="text-xs text-text-tertiary">{node.role}</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-border px-4 py-3">
        <button
          onClick={handleBuild}
          disabled={checkedNodes.size === 0}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
        >
          <Zap className="h-4 w-4" />
          Build This Workflow ({checkedNodes.size} nodes with full schemas)
        </button>
        {checkedNodes.size > 0 && (
          <p className="mt-1.5 text-center text-xs text-text-tertiary">
            ~{Math.round(checkedNodes.size * 400)} tokens of schema context will be loaded
          </p>
        )}
      </div>
    </div>
  );
}

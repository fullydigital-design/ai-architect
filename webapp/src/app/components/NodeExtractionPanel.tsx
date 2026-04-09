import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Package, X, Zap } from 'lucide-react';
import type { RecommendedNode, WorkflowRecommendation } from '../../services/brainstorm-parser';

type ValidatedNode = RecommendedNode & { available: boolean };

interface NodeExtractionPanelProps {
  recommendation: WorkflowRecommendation & { nodes: ValidatedNode[] };
  onApplyAndBuild: (selectedClassTypes: string[], workflowTitle: string, workflowSummary: string) => void;
  onClose: () => void;
}

export function NodeExtractionPanel({
  recommendation,
  onApplyAndBuild,
  onClose,
}: NodeExtractionPanelProps) {
  const [enabledNodes, setEnabledNodes] = useState<Set<string>>(new Set());

  const uniqueNodes = useMemo(() => {
    const byClassType = new Map<string, { node: ValidatedNode; roles: Set<string> }>();
    for (const node of recommendation.nodes) {
      const classType = String(node.class_type || '').trim();
      if (!classType) continue;

      const role = String(node.role || '').trim();
      const existing = byClassType.get(classType);
      if (!existing) {
        byClassType.set(classType, {
          node: { ...node, class_type: classType },
          roles: new Set(role ? [role] : []),
        });
        continue;
      }

      if (!existing.node.available && node.available) existing.node.available = true;
      if ((!existing.node.pack || existing.node.pack === 'Unknown') && node.pack) existing.node.pack = node.pack;
      if ((!existing.node.display_name || existing.node.display_name === existing.node.class_type) && node.display_name) {
        existing.node.display_name = node.display_name;
      }
      if (role) existing.roles.add(role);
    }

    return [...byClassType.values()].map(({ node, roles }) => ({
      ...node,
      role: roles.size > 0 ? [...roles].join(' / ') : node.role,
    }));
  }, [recommendation.nodes]);

  useEffect(() => {
    const initial = new Set<string>();
    for (const node of uniqueNodes) {
      if (node.available) initial.add(node.class_type);
    }
    setEnabledNodes(initial);
  }, [uniqueNodes, recommendation.workflow_title]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ValidatedNode[]>();
    for (const node of uniqueNodes) {
      const pack = node.pack || 'Unknown';
      const bucket = groups.get(pack) || [];
      bucket.push(node);
      groups.set(pack, bucket);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [uniqueNodes]);

  const availableNodes = useMemo(
    () => uniqueNodes.filter((node) => node.available),
    [uniqueNodes],
  );
  const unavailableNodes = useMemo(
    () => uniqueNodes.filter((node) => !node.available),
    [uniqueNodes],
  );

  const allAvailableEnabled = availableNodes.length > 0
    && availableNodes.every((node) => enabledNodes.has(node.class_type));

  const toggleNode = (classType: string) => {
    setEnabledNodes((prev) => {
      const next = new Set(prev);
      if (next.has(classType)) next.delete(classType);
      else next.add(classType);
      return next;
    });
  };

  const toggleAll = () => {
    if (allAvailableEnabled) {
      setEnabledNodes(new Set());
      return;
    }
    setEnabledNodes(new Set(availableNodes.map((node) => node.class_type)));
  };

  const handleApply = () => {
    const selected = [...enabledNodes];
    if (selected.length === 0) return;
    onApplyAndBuild(selected, recommendation.workflow_title, recommendation.workflow_summary);
  };

  const estimatedTokens = enabledNodes.size * 400;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden rounded-sm border border-border bg-surface-0 shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 shrink-0 text-accent" />
            <h3 className="truncate text-sm text-text-primary">{recommendation.workflow_title}</h3>
          </div>
          {recommendation.workflow_summary && (
            <p className="mt-1 truncate text-xs text-text-secondary">{recommendation.workflow_summary}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-sm p-1 text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-secondary"
          title="Close extraction panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-2 text-xs">
        <div className="flex items-center gap-4 text-text-secondary">
          <span>{enabledNodes.size} of {uniqueNodes.length} nodes selected</span>
          <span>~{(estimatedTokens / 1000).toFixed(1)}k schema tokens</span>
          {unavailableNodes.length > 0 && (
            <span className="text-amber-400">{unavailableNodes.length} not installed</span>
          )}
        </div>
        <button
          onClick={toggleAll}
          className="cursor-pointer text-accent-text transition-colors hover:text-text-primary"
        >
          {allAvailableEnabled ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="max-h-[calc(100%-130px)] overflow-y-auto px-4 py-3">
        {grouped.map(([packName, nodes]) => {
          const enabledCount = nodes.filter((node) => enabledNodes.has(node.class_type)).length;
          return (
            <div key={packName} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center gap-2 text-xs">
                <Package className="h-3.5 w-3.5 text-accent" />
                <span className="text-text-secondary">{packName}</span>
                <span className="text-text-tertiary">({enabledCount}/{nodes.length})</span>
              </div>
              <div className="ml-1 space-y-1">
                {nodes.map((node, idx) => {
                  const isEnabled = enabledNodes.has(node.class_type);
                  return (
                    <button
                      key={`${packName}:${node.class_type}-${idx}`}
                      onClick={() => node.available && toggleNode(node.class_type)}
                      disabled={!node.available}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors ${
                        isEnabled
                          ? 'border border-accent/30 bg-accent/10'
                          : 'border border-transparent bg-surface-1 hover:border-border'
                      } ${!node.available ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <div className={`flex h-5 w-8 shrink-0 items-center rounded-full transition-colors ${
                        isEnabled ? 'justify-end bg-accent' : 'justify-start bg-surface-2'
                      }`}>
                        <div className="mx-0.5 h-4 w-4 rounded-full bg-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm text-text-primary">{node.display_name}</span>
                          <code className="hidden truncate text-xs text-text-tertiary sm:inline">
                            {node.class_type}
                          </code>
                        </div>
                        {node.role && (
                          <span className="line-clamp-1 text-xs text-text-tertiary">{node.role}</span>
                        )}
                      </div>
                      {node.available ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-surface-1 px-4 py-3">
        <button
          onClick={handleApply}
          disabled={enabledNodes.size === 0}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-sm text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
        >
          <Zap className="h-4 w-4" />
          Apply & Build ({enabledNodes.size} nodes)
        </button>
      </div>
    </div>
  );
}

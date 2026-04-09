/**
 * WorkflowDiffView.tsx — Visual diff between original and optimized workflow
 * Shows a table: Node | Parameter | Original | Optimized | Change
 */
import React, { useMemo } from 'react';
import { ArrowRight, Plus, Minus, RefreshCw } from 'lucide-react';

interface WorkflowDiffEntry {
  nodeId: string;
  nodeType: string;
  paramName: string;
  originalValue: string;
  optimizedValue: string;
  changeType: 'modified' | 'added' | 'removed';
}

interface WorkflowDiffViewProps {
  originalWorkflow: Record<string, any> | null;
  optimizedWorkflow: Record<string, any> | null;
}

function normalizeWorkflowMap(workflow: Record<string, any>): Record<string, any> {
  // Graph/UI format: { nodes: [...] }
  if (Array.isArray(workflow.nodes)) {
    const map: Record<string, any> = {};
    for (const node of workflow.nodes) {
      map[String(node.id)] = {
        class_type: node.type,
        widgets_values: node.widgets_values,
        inputs: node.inputs,
      };
    }
    return map;
  }

  // API format: { "1": { class_type, inputs, ... } }
  return workflow;
}

export function WorkflowDiffView({ originalWorkflow, optimizedWorkflow }: WorkflowDiffViewProps) {
  const diffs = useMemo(() => {
    if (!originalWorkflow || !optimizedWorkflow) return [];

    const entries: WorkflowDiffEntry[] = [];
    const originalMap = normalizeWorkflowMap(originalWorkflow);
    const optimizedMap = normalizeWorkflowMap(optimizedWorkflow);

    const allNodeIds = new Set([
      ...Object.keys(originalMap),
      ...Object.keys(optimizedMap),
    ]);

    for (const nodeId of allNodeIds) {
      const origNode = originalMap[nodeId];
      const optNode = optimizedMap[nodeId];

      if (!origNode && optNode) {
        entries.push({
          nodeId,
          nodeType: optNode.class_type || 'Unknown',
          paramName: '(entire node)',
          originalValue: '—',
          optimizedValue: 'Added',
          changeType: 'added',
        });
        continue;
      }

      if (origNode && !optNode) {
        entries.push({
          nodeId,
          nodeType: origNode.class_type || 'Unknown',
          paramName: '(entire node)',
          originalValue: 'Present',
          optimizedValue: '—',
          changeType: 'removed',
        });
        continue;
      }

      if (!origNode || !optNode) continue;

      const nodeType = origNode.class_type || optNode.class_type || 'Unknown';

      if (origNode.inputs && optNode.inputs) {
        const allKeys = new Set([
          ...Object.keys(origNode.inputs),
          ...Object.keys(optNode.inputs),
        ]);

        for (const key of allKeys) {
          const origVal = origNode.inputs[key];
          const optVal = optNode.inputs[key];

          // Skip connection arrays (e.g. ["5", 0] or graph input descriptors)
          if (Array.isArray(origVal) || Array.isArray(optVal)) continue;
          if (
            (origVal && typeof origVal === 'object' && 'link' in origVal)
            || (optVal && typeof optVal === 'object' && 'link' in optVal)
          ) {
            continue;
          }

          const origStr = origVal !== undefined ? String(origVal) : '—';
          const optStr = optVal !== undefined ? String(optVal) : '—';

          if (origStr !== optStr) {
            entries.push({
              nodeId,
              nodeType,
              paramName: key,
              originalValue: origStr,
              optimizedValue: optStr,
              changeType: origVal === undefined ? 'added' : optVal === undefined ? 'removed' : 'modified',
            });
          }
        }
      }

      const origWidgets = origNode.widgets_values;
      const optWidgets = optNode.widgets_values;
      if (Array.isArray(origWidgets) && Array.isArray(optWidgets)) {
        const maxLen = Math.max(origWidgets.length, optWidgets.length);
        for (let i = 0; i < maxLen; i++) {
          const origStr = i < origWidgets.length ? String(origWidgets[i]) : '—';
          const optStr = i < optWidgets.length ? String(optWidgets[i]) : '—';
          if (origStr !== optStr) {
            entries.push({
              nodeId,
              nodeType,
              paramName: `widget[${i}]`,
              originalValue: origStr,
              optimizedValue: optStr,
              changeType: 'modified',
            });
          }
        }
      }
    }

    return entries;
  }, [originalWorkflow, optimizedWorkflow]);

  if (diffs.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-[11px] text-content-muted">No differences found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default/50 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[60px_1fr_1fr_80px_80px] gap-px bg-surface-elevated/30 text-[9px] text-content-muted uppercase tracking-wider">
        <div className="px-2 py-1.5 bg-surface-inset/50">Node</div>
        <div className="px-2 py-1.5 bg-surface-inset/50">Type</div>
        <div className="px-2 py-1.5 bg-surface-inset/50">Param</div>
        <div className="px-2 py-1.5 bg-surface-inset/50">Original</div>
        <div className="px-2 py-1.5 bg-surface-inset/50">Optimized</div>
      </div>
      {/* Rows */}
      <div className="max-h-[260px] overflow-auto">
        {diffs.map((diff, idx) => (
          <div
            key={`${diff.nodeId}-${diff.paramName}-${idx}`}
            className={`grid grid-cols-[60px_1fr_1fr_80px_80px] gap-px text-[10px] border-t border-border-subtle ${
              diff.changeType === 'added' ? 'bg-green-500/5' :
              diff.changeType === 'removed' ? 'bg-red-500/5' :
              'bg-surface-inset/20'
            }`}
          >
            <div className="px-2 py-1 text-content-muted font-mono">#{diff.nodeId}</div>
            <div className="px-2 py-1 text-content-secondary truncate" title={diff.nodeType}>{diff.nodeType}</div>
            <div className="px-2 py-1 text-content-primary font-mono truncate" title={diff.paramName}>{diff.paramName}</div>
            <div className="px-2 py-1 text-red-300/70 font-mono truncate" title={diff.originalValue}>
              {diff.changeType === 'added' ? '—' : diff.originalValue}
            </div>
            <div className="px-2 py-1 text-green-300/70 font-mono truncate" title={diff.optimizedValue}>
              {diff.changeType === 'removed' ? '—' : diff.optimizedValue}
            </div>
          </div>
        ))}
      </div>
      {/* Summary */}
      <div className="px-2 py-1.5 bg-surface-inset/30 border-t border-border-subtle flex items-center gap-3 text-[9px] text-content-muted">
        <span className="flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5 text-amber-400/50" /> {diffs.filter((d) => d.changeType === 'modified').length} modified</span>
        <span className="flex items-center gap-1"><Plus className="w-2.5 h-2.5 text-green-400/50" /> {diffs.filter((d) => d.changeType === 'added').length} added</span>
        <span className="flex items-center gap-1"><Minus className="w-2.5 h-2.5 text-red-400/50" /> {diffs.filter((d) => d.changeType === 'removed').length} removed</span>
        <span className="flex items-center gap-1"><ArrowRight className="w-2.5 h-2.5 text-purple-400/50" /> {diffs.length} total</span>
      </div>
    </div>
  );
}

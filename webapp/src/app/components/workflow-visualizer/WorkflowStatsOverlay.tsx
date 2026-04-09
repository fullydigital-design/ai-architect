/**
 * Phase 10G - Floating stats overlay for WorkflowVisualizer canvas.
 * Shows compact stats badge (bottom-left), expands on click for full breakdown.
 */

import { useState } from 'react';
import type { WorkflowStats, ModelEntry, PackEntry } from '@/services/workflow-note-injector';

interface WorkflowStatsOverlayProps {
  stats: WorkflowStats;
  models: ModelEntry[];
  packs: PackEntry[];
  className?: string;
}

export function WorkflowStatsOverlay({
  stats,
  models,
  packs,
  className = '',
}: WorkflowStatsOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  const modelCount = models.length;
  const customPacks = packs.filter((p) => p.packName !== 'Core / Unknown');
  const packCount = customPacks.length;

  if (!expanded) {
    return (
      <div
        className={`absolute bottom-12 left-3 z-20 ${className}`}
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full cursor-pointer hover:bg-black/55 transition-colors text-[10px] text-white/30">
          <span>{stats.totalNodes}</span> {stats.totalNodes === 1 ? 'node' : 'nodes'}
          {modelCount > 0 && (
            <>
              <span>{'\u00B7'}</span>
              <span>{modelCount}</span> {modelCount === 1 ? 'model' : 'models'}
            </>
          )}
          {packCount > 0 && (
            <>
              <span>{'\u00B7'}</span>
              <span>{packCount}</span> {packCount === 1 ? 'pack' : 'packs'}
            </>
          )}
          {stats.subgraphNodes > 0 && (
            <>
              <span>{'\u00B7'}</span>
              <span>{stats.subgraphNodes}</span> {stats.subgraphNodes === 1 ? 'subgraph' : 'subgraphs'}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute bottom-12 left-3 z-20 ${className}`}>
      <div className="w-80 bg-surface-inset/95 backdrop-blur-sm rounded-xl border border-border-strong/50 shadow-xl overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-border-strong/50 cursor-pointer hover:bg-surface-elevated/50"
          onClick={() => setExpanded(false)}
        >
          <span className="text-sm text-white">Workflow Stats</span>
          <span className="text-xs text-content-muted">click to collapse</span>
        </div>

        <div className="p-3 space-y-3 max-h-64 overflow-y-auto text-xs">
          <div>
            <div className="text-content-muted uppercase tracking-wider mb-1">Nodes</div>
            <div className="grid grid-cols-2 gap-1">
              <StatRow label="Total" value={stats.totalNodes} />
              <StatRow label="Unique Types" value={stats.uniqueNodeTypes} />
              {stats.subgraphNodes > 0 && (
                <StatRow label="Subgraphs" value={stats.subgraphNodes} accent="amber" />
              )}
              {stats.groupNodes > 0 && (
                <StatRow label="Groups" value={stats.groupNodes} />
              )}
            </div>
          </div>

          {models.length > 0 && (
            <div>
              <div className="text-content-muted uppercase tracking-wider mb-1">Models ({modelCount})</div>
              <div className="space-y-0.5">
                {models.map((m, i) => (
                  <div key={`${m.type}:${m.filename}:${i}`} className="flex items-center gap-2 text-content-primary">
                    <span className="text-content-muted w-20 shrink-0 truncate">{m.type}</span>
                    <span className="truncate">{m.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customPacks.length > 0 && (
            <div>
              <div className="text-content-muted uppercase tracking-wider mb-1">Custom Packs ({packCount})</div>
              <div className="space-y-0.5">
                {customPacks.map((p, i) => (
                  <div key={`${p.packName}:${i}`} className="flex items-center gap-2 text-content-primary">
                    <span className="truncate">{p.packName}</span>
                    <span className="text-content-faint shrink-0">({p.nodeTypes.length} nodes)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.missingModels !== undefined && stats.missingModels > 0 && (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-900/20 px-2 py-1 rounded">
              <span>Missing Models: {stats.missingModels}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'amber';
}) {
  const valueColor = accent === 'amber' ? 'text-amber-400' : 'text-white';
  return (
    <div className="flex justify-between text-content-secondary">
      <span>{label}</span>
      <span className={valueColor}>{value}</span>
    </div>
  );
}

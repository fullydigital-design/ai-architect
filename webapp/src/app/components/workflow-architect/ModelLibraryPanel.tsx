import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import {
  getModelCategoryLabel,
  getModelIntelligence,
  type InstalledModels,
  type ModelArchitecture,
} from '@/services/comfyui-backend';
import { formatTokenCount } from '@/services/token-estimator';
import { MODEL_PRESETS, type ModelPreset } from '@/hooks/useModelLibrary';

const ARCH_BADGE_COLORS: Record<ModelArchitecture, string> = {
  'SD 1.5': 'bg-blue-500/20 text-blue-300',
  'SD 2.x': 'bg-blue-500/20 text-blue-200',
  SDXL: 'bg-purple-500/20 text-purple-300',
  'SDXL Turbo': 'bg-purple-500/20 text-purple-200',
  'SD 3': 'bg-fuchsia-500/20 text-fuchsia-300',
  FLUX: 'bg-cyan-500/20 text-cyan-300',
  'FLUX Schnell': 'bg-cyan-500/20 text-cyan-200',
  Pony: 'bg-pink-500/20 text-pink-300',
  Cascade: 'bg-orange-500/20 text-orange-300',
  PixArt: 'bg-amber-500/20 text-amber-300',
  Kolors: 'bg-rose-500/20 text-rose-300',
  Hunyuan: 'bg-teal-500/20 text-teal-300',
  AuraFlow: 'bg-accent-muted text-accent-text',
  ZImage: 'bg-emerald-500/20 text-emerald-300',
  Unknown: 'bg-surface-secondary/60 text-content-secondary',
};

interface ModelLibraryPanelProps {
  inventory: InstalledModels | null;
  allCategories: string[];
  selectedCategories: Set<string>;
  activePreset: ModelPreset;
  categoryTokens: Record<string, number>;
  totalTokens: number;
  totalFiles: number;
  isLoading?: boolean;
  onApplyPreset: (preset: Exclude<ModelPreset, 'custom'>) => void;
  onToggleCategory: (category: string, selected: boolean) => void;
  onResetSelection: () => void;
  onMentionModel?: (filename: string, categoryLabel: string) => void;
  layout?: 'dropdown' | 'panel';
}

function getDominantArchitecture(category: string, files: string[]): ModelArchitecture {
  const counts = new Map<ModelArchitecture, number>();
  for (const file of files) {
    const arch = getModelIntelligence(file, category).architecture;
    counts.set(arch, (counts.get(arch) || 0) + 1);
  }
  let best: ModelArchitecture = 'Unknown';
  let bestCount = -1;
  for (const [arch, count] of counts.entries()) {
    if (count > bestCount && arch !== 'Unknown') {
      best = arch;
      bestCount = count;
    }
  }
  return best;
}

export function ModelLibraryPanel({
  inventory,
  allCategories,
  selectedCategories,
  activePreset,
  categoryTokens,
  totalTokens,
  totalFiles,
  isLoading = false,
  onApplyPreset,
  onToggleCategory,
  onResetSelection,
  onMentionModel,
  layout = 'dropdown',
}: ModelLibraryPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const isPanel = layout === 'panel';
  const nonEmptyCategories = useMemo(
    () => allCategories.filter((category) => Array.isArray(inventory?.[category]) && (inventory?.[category]?.length ?? 0) > 0),
    [allCategories, inventory],
  );

  const rows = useMemo(() => {
    return nonEmptyCategories.map((category) => {
      const files = (inventory?.[category] || []).slice().sort((a, b) => a.localeCompare(b));
      const count = files.length;
      const selected = selectedCategories.has(category);
      const dominantArch = count > 0 ? getDominantArchitecture(category, files) : 'Unknown';
      const tokens = categoryTokens[category] || 0;
      return {
        category,
        label: getModelCategoryLabel(category),
        files,
        count,
        selected,
        dominantArch,
        tokens,
      };
    });
  }, [nonEmptyCategories, categoryTokens, inventory, selectedCategories]);

  const toggleExpanded = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className={isPanel ? 'h-full min-h-0 flex flex-col px-2 pb-2' : 'mb-3'}>
      <div className="mb-1.5 flex items-center justify-between shrink-0">
        <h4 className="text-[10px] text-content-muted uppercase tracking-wider">
          Model Library ({nonEmptyCategories.length} folders)
        </h4>
        <button
          onClick={onResetSelection}
          className="text-[10px] text-blue-400 hover:text-blue-300"
        >
          Reset
        </button>
      </div>

      <div className="mb-1 shrink-0 flex flex-wrap items-center gap-1 px-1">
        {MODEL_PRESETS.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset.id)}
              title={preset.description}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                isActive
                  ? 'border-indigo-500/40 bg-accent-muted text-indigo-200'
                  : 'border-border-strong bg-transparent text-content-secondary hover:border-border-strong hover:text-content-primary'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className={isPanel ? 'min-h-0 flex-1 overflow-y-auto space-y-0.5 pr-1' : 'max-h-56 overflow-y-auto space-y-0.5 pr-1'}>
        {rows.map((row) => {
          const expanded = expandedCategories.has(row.category);
          const disabled = row.count === 0;
          return (
            <div key={row.category} className={`rounded-lg ${disabled ? 'opacity-50' : ''}`}>
              <div className="group flex items-center gap-2 px-2 py-1.5 hover:bg-surface-elevated/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={row.selected}
                  disabled={disabled}
                  onChange={(event) => onToggleCategory(row.category, event.target.checked)}
                  className="w-3 h-3 rounded border-border-strong bg-surface-elevated accent-blue-500"
                />
                <button
                  disabled={disabled}
                  onClick={() => toggleExpanded(row.category)}
                  className="text-content-muted hover:text-content-primary disabled:opacity-30"
                >
                  {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[11px] text-content-primary">{row.label}</span>
                    {row.dominantArch !== 'Unknown' && (
                      <span className={`px-1 py-0.5 rounded text-[9px] ${ARCH_BADGE_COLORS[row.dominantArch]}`}>
                        {row.dominantArch}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-content-faint">{row.count} file{row.count === 1 ? '' : 's'}</div>
                </div>
                <div className="text-[10px] text-content-muted tabular-nums">
                  {row.selected ? formatTokenCount(row.tokens) : '0'}
                </div>
              </div>

              {expanded && row.count > 0 && (
                <div className="ml-8 mr-2 mb-1 rounded border border-border-default/70 bg-surface-inset/50 p-1.5 space-y-1">
                  {row.files.map((file) => {
                    const intel = getModelIntelligence(file, row.category);
                    const details = [intel.description, intel.resolution, intel.cfgRange ? `cfg ${intel.cfgRange}` : '']
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <div key={`${row.category}:${file}`} className="group/item flex items-start gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10px] text-content-primary font-mono" title={file}>{file}</div>
                          {details && <div className="text-[9px] text-content-muted">{details}</div>}
                        </div>
                        {onMentionModel && (
                          <button
                            onClick={() => onMentionModel(file, row.label)}
                            className="opacity-0 group-hover/item:opacity-100 transition-opacity text-cyan-400 hover:text-cyan-300"
                            title="Mention in chat"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 shrink-0 rounded-lg border border-border-default bg-surface-inset/40 px-2 py-1.5 text-[10px] text-content-secondary flex items-center justify-between">
        <span>{isLoading ? 'Refreshing model inventory...' : `Include in AI context: ${totalFiles} files`}</span>
        <span className="tabular-nums text-content-primary">{formatTokenCount(totalTokens)} tokens</span>
      </div>
    </div>
  );
}

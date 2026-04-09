/**
 * InstalledModelsPanel â€” displays all models installed on the user's ComfyUI,
 * grouped by category with architecture badges and search/filter.
 *
 * Rendered inside the ProviderConfig "Keys" tab below the ComfyUI connection panel.
 */

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  HardDrive,
  MessageSquare,
  Copy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getInstalledModels,
  getInstalledModelsWithInfo,
  getModelCategorySummary,
  detectModelArchitecture,
  type ModelInfo,
  type ModelArchitecture,
} from '../../../services/comfyui-backend';

interface InstalledModelsPanelProps {
  /** Callback to insert a model reference into the chat input */
  onMentionModel?: (text: string) => void;
}

// Architecture â†’ color mapping
const ARCH_COLORS: Record<ModelArchitecture, string> = {
  'SD 1.5':       'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'SD 2.x':       'bg-blue-500/15 text-blue-300 border-blue-500/20',
  'SDXL':         'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'SDXL Turbo':   'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'SD 3':         'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'FLUX':         'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'FLUX Schnell': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  'Pony':         'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'Cascade':      'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'PixArt':       'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Kolors':       'bg-rose-500/15 text-rose-400 border-rose-500/20',
  'Hunyuan':      'bg-teal-500/15 text-teal-400 border-teal-500/20',
  'AuraFlow':     'bg-accent/15 text-accent-text border-accent/20',
  'ZImage':       'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Unknown':      'bg-surface-3/20 text-text-secondary border-border-default/50',
};

// Category icons (emoji for compactness)
const CATEGORY_ICONS: Record<string, string> = {
  checkpoints: '\u{1F9CA}',
  loras: '\u{1F9E9}',
  vaes: '\u{1F504}',
  controlnets: '\u{1F3AF}',
  clip: '\u{1F4CE}',
  clip_vision: '\u{1F441}',
  upscale_models: '\u{1F50D}',
  embeddings: '\u{1F4AC}',
  ipadapter: '\u{1F5BC}',
  instantid: '\u{1F464}',
  style_models: '\u{1F3A8}',
  gligen: '\u{1F4CC}',
  photomaker: '\u{1F4F7}',
};

export function InstalledModelsPanel({ onMentionModel }: InstalledModelsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [archFilter, setArchFilter] = useState<ModelArchitecture | null>(null);

  const allModels = useMemo(() => getInstalledModelsWithInfo(), []);
  const categorySummary = useMemo(() => getModelCategorySummary(), []);
  const totalModels = allModels.length;

  // Unique architectures for filter chips
  const architectures = useMemo(() => {
    const archSet = new Set<ModelArchitecture>();
    for (const m of allModels) {
      if (m.architecture !== 'Unknown') archSet.add(m.architecture);
    }
    return Array.from(archSet).sort();
  }, [allModels]);

  // Filtered + grouped models
  const filteredByCategory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const grouped = new Map<string, ModelInfo[]>();

    for (const model of allModels) {
      // Apply search filter
      if (q && !model.filename.toLowerCase().includes(q)) continue;
      // Apply architecture filter
      if (archFilter && model.architecture !== archFilter) continue;

      if (!grouped.has(model.category)) {
        grouped.set(model.category, []);
      }
      grouped.get(model.category)!.push(model);
    }

    return grouped;
  }, [allModels, searchQuery, archFilter]);

  const filteredTotal = useMemo(() => {
    let count = 0;
    for (const models of filteredByCategory.values()) count += models.length;
    return count;
  }, [filteredByCategory]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleCopyFilename = (filename: string) => {
    navigator.clipboard.writeText(filename);
    toast.success('Filename copied');
  };

  const handleMention = (filename: string, category: string) => {
    if (onMentionModel) {
      onMentionModel(`Use my installed ${category} model: "${filename}"`);
    }
  };

  if (totalModels === 0) return null;

  return (
    <div className="space-y-1.5 pt-2 border-t border-border/50">
      {/* Collapsed header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3 h-3 text-cyan-500/70" />
          <span className="text-[10px] text-text-secondary uppercase tracking-wider">
            Installed Models
          </span>
          <span className="text-[9px] text-text-tertiary">
            ({totalModels})
          </span>
        </div>
        {isExpanded
          ? <ChevronDown className="w-3 h-3 text-text-tertiary" />
          : <ChevronRight className="w-3 h-3 text-text-tertiary" />
        }
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter models..."
              className="w-full pl-6 pr-2 py-1.5 bg-surface-2/40 border border-border-default/50 rounded-lg text-[10px] text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Architecture filter chips */}
          {architectures.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {archFilter && (
                <button
                  onClick={() => setArchFilter(null)}
                  className="px-1.5 py-0.5 rounded text-[8px] bg-surface-2 text-text-secondary hover:text-text-primary border border-border-default/50 transition-colors"
                >
                  All
                </button>
              )}
              {architectures.map(arch => (
                <button
                  key={arch}
                  onClick={() => setArchFilter(archFilter === arch ? null : arch)}
                  className={`px-1.5 py-0.5 rounded text-[8px] border transition-colors ${
                    archFilter === arch
                      ? ARCH_COLORS[arch]
                      : 'bg-surface-2/50 text-text-tertiary border-border-default/30 hover:text-text-secondary'
                  }`}
                >
                  {arch}
                </button>
              ))}
            </div>
          )}

          {/* Results count when filtering */}
          {(searchQuery || archFilter) && (
            <div className="text-[9px] text-text-disabled">
              {filteredTotal} of {totalModels} models
            </div>
          )}

          {/* Category groups */}
          <div className="space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-thin pr-0.5">
            {categorySummary.map(({ category, label, count }) => {
              const catModels = filteredByCategory.get(category);
              if (!catModels || catModels.length === 0) return null;

              const isOpen = expandedCategories.has(category);
              const icon = CATEGORY_ICONS[category] || '\u{1F4E6}';

              return (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-surface-2/40 transition-colors text-left"
                  >
                    <span className="text-[10px]">{icon}</span>
                    {isOpen
                      ? <ChevronDown className="w-2.5 h-2.5 text-text-tertiary" />
                      : <ChevronRight className="w-2.5 h-2.5 text-text-tertiary" />
                    }
                    <span className="text-[10px] text-text-primary flex-1">{label}</span>
                    <span className="text-[9px] text-text-tertiary">{catModels.length}</span>
                  </button>

                  {isOpen && (
                    <div className="ml-4 space-y-0.5 pb-1">
                      {catModels.map((model, idx) => (
                        <ModelRow
                          key={`${model.filename}-${idx}`}
                          model={model}
                          onCopy={handleCopyFilename}
                          onMention={onMentionModel ? handleMention : undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ Sub-component: Model Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ModelRow({
  model,
  onCopy,
  onMention,
}: {
  model: ModelInfo;
  onCopy: (filename: string) => void;
  onMention?: (filename: string, category: string) => void;
}) {
  return (
    <div className="group flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-2/30 transition-colors">
      {/* Filename */}
      <span
        className="flex-1 min-w-0 text-[10px] text-text-secondary font-mono truncate"
        title={model.filename}
      >
        {model.filename}
      </span>

      {/* Architecture badge */}
      {model.architecture !== 'Unknown' && (
        <span className={`shrink-0 px-1 py-0 rounded text-[7px] border ${ARCH_COLORS[model.architecture]}`}>
          {model.architecture}
        </span>
      )}

      {/* Action buttons (visible on hover) */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onCopy(model.filename)}
          className="p-0.5 rounded text-text-tertiary hover:text-text-primary transition-colors"
          title="Copy filename"
        >
          <Copy className="w-2.5 h-2.5" />
        </button>
        {onMention && (
          <button
            onClick={() => onMention(model.filename, model.categoryLabel)}
            className="p-0.5 rounded text-text-tertiary hover:text-cyan-400 transition-colors"
            title="Mention in chat"
          >
            <MessageSquare className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

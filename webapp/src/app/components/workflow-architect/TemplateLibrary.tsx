import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Layers, Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  WORKFLOW_TEMPLATES,
  type WorkflowTemplate,
  type WorkflowTemplateCategory,
} from '../../../data/workflow-templates';

interface TemplateLibraryProps {
  onLoadTemplate: (workflow: Record<string, unknown>, templateName: string) => void;
  installedModels?: string[];
}

type CategoryFilter = 'all' | WorkflowTemplateCategory;
type DifficultyFilter = 'all' | WorkflowTemplate['difficulty'];

const CATEGORY_OPTIONS: Array<{ key: CategoryFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'text-to-image', label: 'Text-to-Image' },
  { key: 'image-to-image', label: 'Image-to-Image' },
  { key: 'inpainting', label: 'Inpainting' },
  { key: 'upscaling', label: 'Upscaling' },
  { key: 'controlnet', label: 'ControlNet' },
  { key: 'lora', label: 'LoRA' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'flux', label: 'FLUX' },
  { key: 'video', label: 'Video' },
];

function topBarClass(baseModel: string): string {
  const m = baseModel.toLowerCase();
  if (m.includes('sdxl')) return 'bg-gradient-to-r from-violet-500/70 to-fuchsia-500/70';
  if (m.includes('sd 1.5') || m.includes('sd1.5') || m.includes('sd15')) {
    return 'bg-gradient-to-r from-blue-500/70 to-cyan-500/70';
  }
  if (m.includes('flux')) return 'bg-gradient-to-r from-cyan-500/70 to-sky-500/70';
  return 'bg-gradient-to-r from-surface-300 to-border-strong';
}

function difficultyClass(difficulty: WorkflowTemplate['difficulty']): string {
  if (difficulty === 'beginner') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (difficulty === 'intermediate') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-red-500/15 text-red-300 border-red-500/30';
}

function baseModelClass(baseModel: string): string {
  const m = baseModel.toLowerCase();
  if (m.includes('sdxl')) return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
  if (m.includes('sd 1.5') || m.includes('sd1.5') || m.includes('sd15')) {
    return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  }
  if (m.includes('flux')) return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  return 'bg-surface-secondary/40 text-content-primary border-border-strong/50';
}

function hasTemplateModelInstalled(template: WorkflowTemplate, installedModels?: string[]): boolean {
  if (!installedModels || installedModels.length === 0) return true;
  const normalized = installedModels.map((m) => m.toLowerCase());
  const needle = template.baseModel.toLowerCase();
  return normalized.some((item) => item.includes(needle));
}

export function TemplateLibrary({ onLoadTemplate, installedModels }: TemplateLibraryProps) {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [query, setQuery] = useState('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();

    return WORKFLOW_TEMPLATES.filter((template) => {
      if (category !== 'all' && template.category !== category) return false;
      if (difficulty !== 'all' && template.difficulty !== difficulty) return false;

      if (!q) return true;

      const inName = template.name.toLowerCase().includes(q);
      const inDescription = template.description.toLowerCase().includes(q);
      const inTags = template.tags.some((tag) => tag.toLowerCase().includes(q));
      return inName || inDescription || inTags;
    });
  }, [category, difficulty, query]);

  const onLoad = (template: WorkflowTemplate) => {
    onLoadTemplate(template.workflow, template.name);
    toast.success(`Template '${template.name}' loaded - customize it in the editor`);
  };

  const onPreviewToggle = (templateId: string) => {
    setExpandedTemplateId((prev) => (prev === templateId ? null : templateId));
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-inset text-content-primary">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-4">
        <div className="rounded-xl border border-border-default bg-surface-secondary p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-content-primary">
            <Sparkles className="w-4 h-4 text-accent-text" />
            Workflow Templates
          </div>
          <p className="text-xs text-content-muted">Pre-built workflows for common ComfyUI pipelines</p>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => setCategory(option.key)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] border transition-colors ${
                  category === option.key
                    ? 'bg-accent-muted text-accent-text border-accent/30'
                    : 'bg-surface-inset text-content-muted border-border-default hover:text-content-primary'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-2.5 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates by name, description, or tags..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-inset border border-border-default text-sm text-content-primary placeholder:text-content-faint focus:outline-none focus:border-accent/40"
              />
            </div>

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
              className="px-2.5 py-2 rounded-lg bg-surface-inset border border-border-default text-xs text-content-primary focus:outline-none focus:border-accent/40"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="rounded-xl border border-border-default bg-surface-secondary px-5 py-12 text-center text-content-muted">
            No templates match your filters
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const isExpanded = expandedTemplateId === template.id;
              const modelInstalled = hasTemplateModelInstalled(template, installedModels);
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-border-default/50 bg-surface-secondary hover:border-border-strong transition-all overflow-hidden"
                >
                  <div className={`h-1.5 ${topBarClass(template.baseModel)}`} />

                  <div className="p-3.5 space-y-2.5">
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary truncate" title={template.name}>
                        {template.name}
                      </h3>
                      <p className="text-[11px] text-content-muted line-clamp-2 min-h-[32px]">{template.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${baseModelClass(template.baseModel)}`}>
                        {template.baseModel}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${difficultyClass(template.difficulty)}`}>
                        {template.difficulty}
                      </span>
                      {template.builtInOnly && (
                        <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          Built-in Only
                        </span>
                      )}
                      {!modelInstalled && (
                        <span className="text-[10px] px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                          Model may be missing
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-content-muted">
                      {template.nodeTypes.length} nodes
                    </div>

                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={`${template.id}-${tag}`}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-border-strong bg-surface-elevated/60 text-content-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {!template.builtInOnly && (template.requiredPacks?.length ?? 0) > 0 && (
                      <p className="text-[11px] text-amber-300">
                        Requires {template.requiredPacks?.length ?? 0} custom pack(s)
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onLoad(template)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-[11px] text-accent-contrast transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Load Template
                      </button>
                      <button
                        onClick={() => onPreviewToggle(template.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-strong text-[11px] text-content-primary hover:bg-surface-elevated/70 transition-colors"
                      >
                        {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        Preview
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="rounded-lg border border-border-default bg-surface-inset px-2.5 py-2">
                        <div className="text-[10px] text-content-muted mb-1">Node types</div>
                        <div className="text-[11px] text-content-primary leading-relaxed">
                          {template.nodeTypes.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

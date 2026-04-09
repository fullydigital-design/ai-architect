import type { WorkflowTemplate } from '@/services/template-service';

interface TemplateCardProps {
  template: WorkflowTemplate;
  onSelect: (template: WorkflowTemplate) => void;
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/15 text-green-700 border border-green-500/25 dark:text-green-400',
  intermediate: 'bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-400',
  advanced: 'bg-red-500/15 text-red-700 border border-red-500/25 dark:text-red-400',
};

const sourceLabels: Record<string, string> = {
  official: 'Official',
  local: 'Local',
  saved: 'My Template',
  community: 'Community',
};

const sourceColors: Record<string, string> = {
  official: 'bg-blue-500/15 text-blue-400 border border-blue-500/25 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25',
  local: 'bg-violet-500/15 text-violet-600 border border-violet-500/25 dark:text-violet-400',
  saved: 'bg-violet-500/15 text-violet-600 border border-violet-500/25 dark:text-violet-400',
  community: 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 dark:text-emerald-400',
};

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="group w-full text-left rounded-lg border border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-800/60 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-gray-900 dark:text-white transition-colors truncate">
          {template.name}
        </h3>
        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${sourceColors[template.source] || sourceColors.official}`}>
          {sourceLabels[template.source] || template.source}
        </span>
      </div>

      <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">
        {template.description}
      </p>

      <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-500 mb-2">
        <span>{template.nodeCount} nodes</span>
        {template.modelCount > 0 && <span>{template.modelCount} models</span>}
        {template.ecosystem && (
          <span className="px-2 py-0.5 rounded text-[10px] bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
            {template.ecosystem}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {template.difficulty && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${difficultyColors[template.difficulty] || difficultyColors.intermediate}`}>
            {template.difficulty}
          </span>
        )}
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-[10px] bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="text-[10px] text-gray-500 dark:text-gray-500">+{template.tags.length - 3}</span>
        )}
      </div>
    </button>
  );
}

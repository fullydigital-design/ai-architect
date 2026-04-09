import { useState, useEffect, useMemo, useCallback } from 'react';
import { TemplateCard } from './TemplateCard';
import { TemplateDetailModal } from './TemplateDetailModal';
import {
  getAllTemplates,
  filterTemplates,
  getAvailableEcosystems,
  saveAsTemplate,
  deleteSavedTemplate,
  CATEGORY_LABELS,
} from '@/services/template-service';
import type {
  WorkflowTemplate,
  TemplateFilter,
  TemplateCategory,
} from '@/services/template-service';

interface TemplateManagerPanelProps {
  onLoadWorkflow: (workflow: any, name: string) => void;
  onClose: () => void;
  currentWorkflow?: any;
}

const DEFAULT_FILTER: TemplateFilter = {
  search: '',
  category: 'all',
  source: 'all',
  ecosystem: 'all',
  difficulty: 'all',
  sortBy: 'difficulty',
};

export function TemplateManagerPanel({
  onLoadWorkflow,
  onClose,
  currentWorkflow,
}: TemplateManagerPanelProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TemplateFilter>(DEFAULT_FILTER);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  const refreshTemplates = useCallback(async (forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllTemplates(forceRefresh);
      setTemplates(result);
    } catch (err) {
      console.error('[TemplateManager]', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAllTemplates()
      .then((result) => {
        if (cancelled) return;
        setTemplates(result);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[TemplateManager]', err);
        setError('Failed to load templates');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTemplates = useMemo(
    () => filterTemplates(templates, filter),
    [templates, filter],
  );

  const ecosystems = useMemo(
    () => getAvailableEcosystems(templates),
    [templates],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    for (const template of templates) {
      counts[template.category] = (counts[template.category] || 0) + 1;
    }
    return counts;
  }, [templates]);

  const handleLoad = useCallback((template: WorkflowTemplate) => {
    if (!template.workflow) return;
    onLoadWorkflow(template.workflow, template.name);
    onClose();
  }, [onClose, onLoadWorkflow]);

  const handleSaveAs = useCallback(async (template: WorkflowTemplate) => {
    if (!template.workflow) return;
    saveAsTemplate(template.workflow, template.name, template.category);
    await refreshTemplates(true);
  }, [refreshTemplates]);

  const handleDelete = useCallback((templateId: string) => {
    deleteSavedTemplate(templateId);
    setTemplates((previous) => previous.filter((template) => template.id !== templateId));
  }, []);

  const handleSaveCurrent = useCallback(async () => {
    if (!currentWorkflow) return;
    const name = window.prompt('Template name:');
    if (!name) return;
    saveAsTemplate(currentWorkflow, name);
    await refreshTemplates(true);
  }, [currentWorkflow, refreshTemplates]);

  const updateFilter = useCallback((patch: Partial<TemplateFilter>) => {
    setFilter((previous) => ({ ...previous, ...patch }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-4xl m-auto max-h-[90vh] bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Template Manager</h1>
            <span className="text-sm text-gray-500 dark:text-gray-500">
              {filteredTemplates.length} of {templates.length} templates
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentWorkflow && (
              <button
                onClick={handleSaveCurrent}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                Save Current Workflow
              </button>
            )}
            <button
              onClick={() => { void refreshTemplates(true); }}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700/60 space-y-3">
          <input
            type="text"
            placeholder="Search templates..."
            value={filter.search}
            onChange={(event) => updateFilter({ search: event.target.value })}
            className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm focus:outline-none focus:border-violet-500"
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.entries(CATEGORY_LABELS) as [TemplateCategory, string][])
              .filter(([category]) => category === 'all' || (categoryCounts[category] || 0) > 0)
              .map(([category, label]) => (
                <button
                  key={category}
                  onClick={() => updateFilter({ category })}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                    filter.category === category
                      ? 'font-medium bg-violet-600 text-white border-violet-600'
                      : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  {label}
                  {categoryCounts[category] !== undefined && (
                    <span className="ml-1 text-[10px] opacity-60">{categoryCounts[category]}</span>
                  )}
                </button>
              ))}
          </div>

          <div className="flex items-center gap-3">
            {ecosystems.length > 1 && (
              <select
                value={filter.ecosystem}
                onChange={(event) => updateFilter({ ecosystem: event.target.value })}
                className="px-3 py-1.5 rounded-md text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="all">All Models</option>
                {ecosystems.map((ecosystem) => (
                  <option key={ecosystem} value={ecosystem}>{ecosystem}</option>
                ))}
              </select>
            )}

            <select
              value={filter.difficulty}
              onChange={(event) => updateFilter({ difficulty: event.target.value })}
              className="px-3 py-1.5 rounded-md text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <select
              value={filter.source}
              onChange={(event) => updateFilter({ source: event.target.value as TemplateFilter['source'] })}
              className="px-3 py-1.5 rounded-md text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="official">Official</option>
              <option value="local">Local</option>
              <option value="saved">My Templates</option>
            </select>

            <select
              value={filter.sortBy}
              onChange={(event) => updateFilter({ sortBy: event.target.value as TemplateFilter['sortBy'] })}
              className="px-3 py-1.5 rounded-md text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none ml-auto"
            >
              <option value="difficulty">Sort: Difficulty</option>
              <option value="name">Sort: Name</option>
              <option value="nodeCount">Sort: Node Count</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-100/60 dark:bg-gray-800/40 p-4 animate-pulse">
                  <div className="h-4 bg-gray-300/70 dark:bg-gray-700 rounded w-2/3 mb-3" />
                  <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-5/6 mb-4" />
                  <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center h-40 text-red-600 dark:text-red-400 text-sm gap-3">
              <span>{error}</span>
              <button
                onClick={() => { void refreshTemplates(true); }}
                className="px-3 py-1.5 rounded-md text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-500 text-sm">
              <span>No templates found</span>
              {filter.search && (
                <button
                  onClick={() => updateFilter({ search: '' })}
                  className="mt-2 text-violet-600 dark:text-violet-400 hover:text-violet-500 text-xs"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredTemplates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={setSelectedTemplate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onLoad={handleLoad}
          onClose={() => setSelectedTemplate(null)}
          onSaveAs={handleSaveAs}
          onDelete={selectedTemplate.source === 'saved' ? handleDelete : undefined}
        />
      )}
    </div>
  );
}

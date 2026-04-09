import { useMemo } from 'react';
import type { WorkflowTemplate } from '@/services/template-service';

interface TemplateDetailModalProps {
  template: WorkflowTemplate;
  onLoad: (template: WorkflowTemplate) => void;
  onClose: () => void;
  onSaveAs?: (template: WorkflowTemplate) => void;
  onDelete?: (templateId: string) => void;
}

export function TemplateDetailModal({
  template,
  onLoad,
  onClose,
  onSaveAs,
  onDelete,
}: TemplateDetailModalProps) {
  const description = useMemo(
    () => template.fullDescription || template.description || '',
    [template],
  );

  const sections = useMemo(() => {
    const result: { summary: string; howItWorks: string[]; benefits: string[] } = {
      summary: '',
      howItWorks: [],
      benefits: [],
    };

    const lines = description.split('\n');
    let section: 'summary' | 'how' | 'why' = 'summary';

    for (const line of lines) {
      if (line.startsWith('HOW IT WORKS:')) {
        section = 'how';
        continue;
      }
      if (line.startsWith('WHY THIS WORKFLOW IS GREAT:')) {
        section = 'why';
        continue;
      }

      const trimmed = line.trim();
      if (!trimmed) continue;

      if (section === 'summary') {
        result.summary += (result.summary ? '\n' : '') + trimmed;
      } else if (section === 'how') {
        result.howItWorks.push(trimmed.replace(/^\d+\.\s*/, ''));
      } else {
        result.benefits.push(trimmed.replace(/^\+\s*/, ''));
      }
    }

    return result;
  }, [description]);

  const requiredPacks = (template.metadata?.customPacks || []).filter((pack) => (
    pack.packName !== 'ComfyUI Core'
    && pack.packName !== 'Core / Unknown'
    && pack.packName !== 'Unknown'
  ));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-surface-inset border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-strong/50">
          <div>
            <h2 className="text-white text-lg">{template.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-content-muted">
              <span>{template.nodeCount} nodes</span>
              <span>|</span>
              <span>{template.modelCount} models</span>
              {template.ecosystem && (
                <>
                  <span>|</span>
                  <span className="text-content-secondary">{template.ecosystem}</span>
                </>
              )}
              {template.difficulty && (
                <>
                  <span>|</span>
                  <span className="capitalize">{template.difficulty}</span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-white p-1 text-lg">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {sections.summary && (
            <p className="text-content-primary text-sm whitespace-pre-wrap">{sections.summary}</p>
          )}

          {sections.howItWorks.length > 0 && (
            <div>
              <h3 className="text-content-secondary text-xs uppercase tracking-wider mb-2">How it works</h3>
              <ol className="space-y-1.5">
                {sections.howItWorks.map((step, index) => (
                  <li key={`${step}-${index}`} className="flex gap-2 text-sm text-content-primary">
                    <span className="text-content-faint shrink-0 w-5 text-right">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {sections.benefits.length > 0 && (
            <div>
              <h3 className="text-content-secondary text-xs uppercase tracking-wider mb-2">Benefits</h3>
              <ul className="space-y-1">
                {sections.benefits.map((benefit, index) => (
                  <li key={`${benefit}-${index}`} className="flex gap-2 text-sm text-content-primary">
                    <span className="text-green-500 shrink-0">+</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!template.metadata?.models?.length && (
            <div>
              <h3 className="text-content-secondary text-xs uppercase tracking-wider mb-2">
                Models required ({template.metadata.models.length})
              </h3>
              <div className="space-y-1">
                {template.metadata.models.map((model, index) => (
                  <div key={`${model.filename}-${index}`} className="flex items-center gap-2 text-xs">
                    <span className="text-content-muted w-20 shrink-0">{model.type}</span>
                    <span className="text-content-primary truncate">{model.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requiredPacks.length > 0 && (
            <div>
              <h3 className="text-content-secondary text-xs uppercase tracking-wider mb-2">Custom nodes required</h3>
              <div className="space-y-1">
                {requiredPacks.map((pack, index) => (
                  <div key={`${pack.packName}-${index}`} className="text-xs text-content-primary">
                    <span className="text-content-secondary">{pack.packName}</span>
                    <span className="text-content-faint"> - {pack.nodeTypes.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {template.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {template.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-content-secondary border border-border-strong/50">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border-strong/50 bg-surface-inset/50">
          <div className="flex items-center gap-2">
            {template.source !== 'saved' && onSaveAs && (
              <button
                onClick={() => onSaveAs(template)}
                className="px-3 py-1.5 text-xs text-content-secondary hover:text-white border border-border-strong hover:border-gray-500 rounded-lg transition-colors"
              >
                Save to My Templates
              </button>
            )}
            {template.source === 'saved' && onDelete && (
              <button
                onClick={() => {
                  onDelete(template.id);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 rounded-lg transition-colors"
              >
                Delete Template
              </button>
            )}
          </div>
          <button
            onClick={() => onLoad(template)}
            className="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Load Workflow
          </button>
        </div>
      </div>
    </div>
  );
}

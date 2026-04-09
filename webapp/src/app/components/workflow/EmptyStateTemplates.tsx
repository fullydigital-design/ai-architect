import { Sparkles } from 'lucide-react';
import { GOOGLE_TEMPLATES, WorkflowTemplate } from './templates';

interface EmptyStateTemplatesProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

export function EmptyStateTemplates({ onSelectTemplate }: EmptyStateTemplatesProps) {
  // Show top 3 FULL-FEATURED templates (the ones with all controls)
  const popularTemplates = GOOGLE_TEMPLATES.filter(t => 
    t.id === 'full-concept' || t.id === 'full-image' || t.id === 'full-video'
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
      <div className="bg-white/95 backdrop-blur-sm px-8 py-6 rounded-3xl shadow-2xl border-2 border-purple-200 max-w-4xl pointer-events-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-xl font-black text-gray-900">Welcome to PRO Workflow Builder</h2>
            <p className="text-sm text-content-faint font-medium mt-1">
              Start from scratch or choose a template to get started quickly
            </p>
          </div>
        </div>

        {/* Quick Start Templates */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {popularTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="p-4 rounded-2xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all group text-left"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center text-2xl mb-3`}>
                {template.icon}
              </div>
              <h3 className="text-sm font-black text-gray-900 group-hover:text-purple-700 transition-colors mb-1">
                {template.name}
              </h3>
              <p className="text-xs text-content-muted font-medium leading-relaxed">
                {template.description}
              </p>
            </button>
          ))}
        </div>

        {/* Manual Instructions */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-content-faint font-medium mb-2">
            <strong className="text-gray-900">Or build from scratch:</strong>
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-purple-600 font-black">1.</span>
              <span className="text-content-faint font-medium">Drag nodes from the left sidebar</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600 font-black">2.</span>
              <span className="text-content-faint font-medium">Connect handles to build workflow</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600 font-black">3.</span>
              <span className="text-content-faint font-medium">Configure each node's settings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { GOOGLE_TEMPLATES, WorkflowTemplate } from './templates';

interface TemplateDropdownProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

export function TemplateDropdown({ onSelectTemplate }: TemplateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const categories = [
    { key: 'concept', label: 'Concept (AI)', icon: '🤖' },
    { key: 'image', label: 'Image', icon: '🖼️' },
    { key: 'video', label: 'Video', icon: '🎬' },
    { key: 'advanced', label: 'Advanced', icon: '🚀' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-content-faint bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Templates
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 bg-gradient-to-r from-fuchsia-50 to-purple-50 border-b border-purple-100">
            <p className="text-xs font-black text-purple-900 uppercase tracking-wider">Quick Start Templates</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {categories.map(({ key, label, icon }) => {
              const templates = GOOGLE_TEMPLATES.filter(t => t.category === key);
              if (templates.length === 0) return null;

              return (
                <div key={key} className="border-b border-gray-100 last:border-0">
                  <div className="px-4 py-2 bg-gray-50">
                    <p className="text-xs font-black text-content-faint uppercase tracking-wider">
                      {icon} {label}
                    </p>
                  </div>
                  <div className="p-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          onSelectTemplate(template);
                          setIsOpen(false);
                        }}
                        className="w-full p-3 rounded-xl hover:bg-gray-50 transition-all text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.gradient} flex items-center justify-center text-xl flex-shrink-0`}>
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-900 group-hover:text-purple-700 transition-colors">
                              {template.name}
                            </p>
                            <p className="text-xs text-content-muted font-medium mt-0.5">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-purple-50 border-t border-purple-100">
            <p className="text-xs text-purple-700 font-medium">
              💡 <strong>Tip:</strong> Templates add pre-configured nodes to your canvas
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

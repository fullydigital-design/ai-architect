import { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { GOOGLE_NODES, getNodesByCategory } from './nodeDefinitions';
import { NodeCategory, Provider } from './types';

interface NodeLibraryProps {
  onDragStart: (nodeType: string) => void;
}

export function NodeLibrary({ onDragStart }: NodeLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set([NodeCategory.INPUT, NodeCategory.MODEL, NodeCategory.OUTPUT])
  );

  const toggleCategory = (category: NodeCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredNodes = GOOGLE_NODES.filter(node =>
    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [
    { key: NodeCategory.INPUT, label: 'Input Nodes', icon: '📥' },
    { key: NodeCategory.MODEL, label: 'AI Models', icon: '🤖' },
    { key: NodeCategory.OUTPUT, label: 'Output Nodes', icon: '📤' },
  ];

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    onDragStart(nodeType);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-black text-gray-900 mb-3">Node Library</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
        </div>
      </div>

      {/* Provider Badge */}
      <div className="px-4 py-3 bg-gradient-to-r from-fuchsia-50 to-purple-50 border-b border-purple-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600"></div>
          <span className="text-xs font-black text-purple-900 uppercase tracking-wider">Google API</span>
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto">
        {categories.map(({ key, label, icon }) => {
          const categoryNodes = getNodesByCategory(key).filter(node =>
            filteredNodes.includes(node)
          );
          const isExpanded = expandedCategories.has(key);

          if (categoryNodes.length === 0) return null;

          return (
            <div key={key} className="border-b border-gray-100">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    {label} ({categoryNodes.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-content-secondary" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-content-secondary" />
                )}
              </button>

              {/* Category Nodes */}
              {isExpanded && (
                <div className="pb-2">
                  {categoryNodes.map((node) => {
                    const Icon = node.icon;
                    return (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.type)}
                        className="mx-3 mb-2 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-purple-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${node.gradient} flex items-center justify-center`}>
                            <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                          </div>
                          <div className="text-xs font-black text-gray-900">{node.label}</div>
                        </div>
                        <div className="text-xs text-content-muted font-medium leading-relaxed">
                          {node.description}
                        </div>

                        {/* Handle indicators */}
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          {node.handles.inputs.length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                              <span className="text-content-secondary font-medium">In: {node.handles.inputs.length}</span>
                            </div>
                          )}
                          {node.handles.outputs.length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                              <span className="text-content-secondary font-medium">Out: {node.handles.outputs.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Hint */}
      <div className="p-4 border-t border-gray-200 bg-purple-50">
        <div className="text-xs text-purple-700 font-medium">
          💡 <strong>Tip:</strong> Drag nodes onto the canvas to build your workflow
        </div>
      </div>
    </div>
  );
}

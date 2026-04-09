import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeDefinition } from './nodeDefinitions';
import { HANDLE_COLORS, DataType } from './types';
import { Settings } from 'lucide-react';

function CustomNodeComponent({ id, type, data, selected }: NodeProps) {
  const nodeDefinition = getNodeDefinition(type);

  if (!nodeDefinition) {
    return <div>Unknown node type: {type}</div>;
  }

  const Icon = nodeDefinition.icon;

  return (
    <div
      className={`rounded-xl shadow-lg transition-all ${
        selected
          ? 'ring-4 ring-purple-400 shadow-2xl'
          : 'shadow-md hover:shadow-xl'
      }`}
      style={{ minWidth: '200px' }}
    >
      {/* Header */}
      <div className={`px-4 py-3 rounded-t-xl bg-gradient-to-br ${nodeDefinition.gradient}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-xs font-black text-white truncate">{nodeDefinition.label}</div>
          </div>
          {nodeDefinition.configurable && (
            <Settings className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 bg-white rounded-b-xl border-2 border-gray-200">
        {/* Node-specific content */}
        {type === 'textPrompt' && (
          <div>
            <textarea
              value={data.value || ''}
              onChange={(e) => {
                if (data.onUpdate) {
                  data.onUpdate(id, {
                    ...data,
                    value: e.target.value,
                  });
                }
              }}
              placeholder="Enter prompt..."
              rows={3}
              className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none bg-white"
            />
            <div className="mt-1 text-xs text-content-muted text-right">
              {data.value?.length || 0} characters
            </div>
          </div>
        )}

        {type === 'gemini' && (
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-900">
              {data.model === 'gemini-pro' ? 'Gemini Pro' : 'Gemini 2.0 Flash'}
            </div>
            <div className="text-xs text-content-muted capitalize">{data.goalType || 'general'}</div>
          </div>
        )}

        {type === 'nanoBanana' && (
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-900">
              {data.resolution || '1K'} • {data.aspectRatio || '1:1'}
            </div>
            {data.styleReferences?.length > 0 && (
              <div className="text-xs text-content-muted">
                {data.styleReferences.length} style refs
              </div>
            )}
          </div>
        )}

        {type === 'veo' && (
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-900">
              {data.resolution || '720p'} • {data.duration || '5s'}
            </div>
            <div className="text-xs text-content-muted capitalize">
              {data.mode?.replace(/-/g, ' ') || 'text to video'}
            </div>
          </div>
        )}

        {(type === 'imagePreview' || type === 'videoPreview' || type === 'download') && (
          <div className="text-xs text-content-muted font-medium">{nodeDefinition.description}</div>
        )}

        {(type === 'imageUpload' || type === 'styleReference') && (
          <div className="mt-2">
            {data.image ? (
              <div className="space-y-2">
                <img 
                  src={data.image} 
                  alt="Uploaded" 
                  className="w-full h-24 rounded-lg object-cover border-2 border-pink-200"
                />
                <div className="flex items-center justify-center gap-1">
                  <span className="text-green-600 font-bold text-xs">✓</span>
                  <span className="text-xs font-bold text-content-faint">Image Uploaded</span>
                </div>
                <label className="block text-center">
                  <span className="text-xs text-content-muted hover:text-pink-600 cursor-pointer underline">
                    Click to change
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && data.onUpdate) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          data.onUpdate(id, {
                            ...data,
                            image: event.target?.result,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            ) : data.styles?.length > 0 ? (
              <div className="flex items-center justify-center gap-1">
                <span className="text-green-600 font-bold text-xs">✓</span>
                <span className="text-xs font-bold text-content-faint">{data.styles.length} Uploaded</span>
              </div>
            ) : (
              <label className="cursor-pointer hover:text-pink-600 transition-colors block text-center">
                <span className="text-content-secondary text-xs italic">No files - Click to upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && data.onUpdate) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        data.onUpdate(id, {
                          ...data,
                          image: event.target?.result,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Input Handles */}
      {nodeDefinition.handles.inputs.map((handle, index) => {
        const color = HANDLE_COLORS[handle.dataType];
        const topPosition = nodeDefinition.handles.inputs.length === 1 
          ? 50 
          : (100 / (nodeDefinition.handles.inputs.length + 1)) * (index + 1);

        return (
          <Handle
            key={handle.id}
            type="target"
            position={Position.Left}
            id={handle.id}
            style={{
              top: `${topPosition}%`,
              background: color,
              width: '12px',
              height: '12px',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
            className="transition-transform hover:scale-125"
          >
            {/* Handle label */}
            <div
              className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-surface-inset text-white text-xs font-bold rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
              style={{ fontSize: '10px' }}
            >
              {handle.label} ({handle.dataType})
            </div>
          </Handle>
        );
      })}

      {/* Output Handles */}
      {nodeDefinition.handles.outputs.map((handle, index) => {
        const color = HANDLE_COLORS[handle.dataType];
        const topPosition = nodeDefinition.handles.outputs.length === 1 
          ? 50 
          : (100 / (nodeDefinition.handles.outputs.length + 1)) * (index + 1);

        return (
          <Handle
            key={handle.id}
            type="source"
            position={Position.Right}
            id={handle.id}
            style={{
              top: `${topPosition}%`,
              background: color,
              width: '12px',
              height: '12px',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
            className="transition-transform hover:scale-125"
          >
            {/* Handle label */}
            <div
              className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-surface-inset text-white text-xs font-bold rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
              style={{ fontSize: '10px' }}
            >
              {handle.label} ({handle.dataType})
            </div>
          </Handle>
        );
      })}

      {/* Provider badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-black shadow-lg" style={{ fontSize: '9px' }}>
        GOOGLE
      </div>
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
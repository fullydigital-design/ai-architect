import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeDefinition } from '../nodeDefinitions';
import { HANDLE_COLORS } from '../types';

export const UniversalNode = memo(({ id, type, data, selected, isConnectable }: NodeProps) => {
  const nodeDefinition = getNodeDefinition(type);

  if (!nodeDefinition) {
    return null;
  }

  const Icon = nodeDefinition.icon;

  return (
    <div 
      className={`px-5 py-4 shadow-lg rounded-2xl bg-white border-2 min-w-[220px] transition-all ${
        selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
      }`}
    >
      {/* Node Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${nodeDefinition.gradient} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-sm font-black text-gray-900">{nodeDefinition.label}</div>
      </div>
      
      {/* Node Description */}
      <div className="text-xs text-content-faint font-medium mb-3">
        {nodeDefinition.description}
      </div>
      
      {/* Node Content - Type specific */}
      <div className="space-y-2">
        {/* Text Prompt Input */}
        {type === 'textPrompt' && (
          <textarea
            value={data.value || ''}
            readOnly
            placeholder="Configure in settings →"
            className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 resize-none font-medium cursor-pointer"
            rows={2}
            onClick={() => {
              // Settings panel will open on node selection
            }}
          />
        )}

        {/* Model Nodes - Show Config */}
        {(type === 'gemini' || type === 'nanoBanana' || type === 'veo') && (
          <div className="flex flex-col gap-2 text-xs">
            {type === 'gemini' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-content-muted font-medium">Model:</span>
                  <span className="font-bold text-gray-900">{data.model || 'Flash'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-content-muted font-medium">Goal:</span>
                  <span className="font-bold text-gray-900">{data.goalType || 'General'}</span>
                </div>
              </>
            )}
            {type === 'nanoBanana' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-content-muted font-medium">Resolution:</span>
                  <span className="font-bold text-gray-900">{data.resolution || '1K'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-content-muted font-medium">Aspect:</span>
                  <span className="font-bold text-gray-900">{data.aspectRatio || '1:1'}</span>
                </div>
              </>
            )}
            {type === 'veo' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-content-muted font-medium">Mode:</span>
                  <span className="font-bold text-gray-900 text-[10px]">{data.mode || 'T2V'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-content-muted font-medium">Resolution:</span>
                  <span className="font-bold text-gray-900">{data.resolution || '720p'}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview Nodes */}
        {(type === 'imagePreview' || type === 'videoPreview') && (
          <div className="w-full h-24 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
            <span className="text-xs text-content-secondary font-medium">
              {type === 'imagePreview' ? 'Image preview' : 'Video preview'}
            </span>
          </div>
        )}

        {/* Download Node */}
        {type === 'download' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-content-muted font-medium">Format:</span>
            <span className="font-bold text-gray-900">{data.format || 'PNG'}</span>
          </div>
        )}

        {/* Upload Nodes */}
        {(type === 'imageUpload' || type === 'styleReference') && (
          <div className="w-full h-20 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-xs text-content-secondary font-medium">
              {type === 'imageUpload' ? 'Upload image' : 'Upload styles'}
            </span>
          </div>
        )}
      </div>
      
      {/* Input Handles */}
      {nodeDefinition.handles.inputs.map((handle, index) => (
        <Handle
          key={handle.id}
          type="target"
          position={Position.Left}
          id={handle.id}
          style={{
            top: `${50 + (index - (nodeDefinition.handles.inputs.length - 1) / 2) * 30}%`,
            background: HANDLE_COLORS[handle.dataType],
          }}
          className="!w-3 !h-3 !border-2 !border-white"
          isConnectable={isConnectable}
        />
      ))}
      
      {/* Output Handles */}
      {nodeDefinition.handles.outputs.map((handle, index) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Right}
          id={handle.id}
          style={{
            top: `${50 + (index - (nodeDefinition.handles.outputs.length - 1) / 2) * 30}%`,
            background: HANDLE_COLORS[handle.dataType],
          }}
          className="!w-3 !h-3 !border-2 !border-white"
          isConnectable={isConnectable}
        />
      ))}
    </div>
  );
});

UniversalNode.displayName = 'UniversalNode';

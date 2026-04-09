import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Eye } from 'lucide-react';

export const PreviewNode = memo(({ data, isConnectable }: NodeProps) => {
  return (
    <div className="px-5 py-4 shadow-lg rounded-2xl bg-white border-2 border-blue-300 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Eye className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-sm font-black text-gray-900">Preview</div>
      </div>
      
      <div className="text-xs text-content-faint font-medium mb-3">
        View generated output
      </div>
      
      <div className="w-full h-24 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
        <span className="text-xs text-content-secondary font-medium">Output preview</span>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
        isConnectable={isConnectable}
      />
    </div>
  );
});

PreviewNode.displayName = 'PreviewNode';

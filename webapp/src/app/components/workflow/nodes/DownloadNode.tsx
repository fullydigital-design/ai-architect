import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Download } from 'lucide-react';

export const DownloadNode = memo(({ data, isConnectable }: NodeProps) => {
  return (
    <div className="px-5 py-4 shadow-lg rounded-2xl bg-white border-2 border-green-300 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <Download className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-sm font-black text-gray-900">Download</div>
      </div>
      
      <div className="text-xs text-content-faint font-medium mb-3">
        Save output to device
      </div>
      
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-content-muted font-medium">Format:</span>
          <span className="font-bold text-gray-900">PNG</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-content-muted font-medium">Status:</span>
          <span className="font-bold text-blue-600">Ready</span>
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        isConnectable={isConnectable}
      />
    </div>
  );
});

DownloadNode.displayName = 'DownloadNode';

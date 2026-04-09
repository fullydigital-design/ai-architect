import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Image } from 'lucide-react';

export const ImagenNode = memo(({ data, isConnectable }: NodeProps) => {
  return (
    <div className="px-5 py-4 shadow-lg rounded-2xl bg-white border-2 border-pink-300 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
          <Image className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-sm font-black text-gray-900">Imagen</div>
      </div>
      
      <div className="text-xs text-content-faint font-medium mb-3">
        Generate images from text
      </div>
      
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-content-muted font-medium">Size:</span>
          <span className="font-bold text-gray-900">1024x1024</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-content-muted font-medium">Quality:</span>
          <span className="font-bold text-gray-900">High</span>
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-white"
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-white"
        isConnectable={isConnectable}
      />
    </div>
  );
});

ImagenNode.displayName = 'ImagenNode';

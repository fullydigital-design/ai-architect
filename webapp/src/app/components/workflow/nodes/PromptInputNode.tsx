import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare } from 'lucide-react';

export const PromptInputNode = memo(({ data, id }: NodeProps) => {
  const handleChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    // This will update the node data through React Flow
    if (data.onChange) {
      data.onChange(id, evt.target.value);
    }
  }, [data, id]);

  return (
    <div className="px-5 py-4 shadow-lg rounded-2xl bg-white border-2 border-purple-300 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-sm font-black text-gray-900">Prompt Input</div>
      </div>
      
      <div className="text-xs text-content-faint font-medium mb-3">
        Enter your text prompt
      </div>
      
      <textarea
        value={data.value || ''}
        onChange={handleChange}
        placeholder="Type your prompt..."
        className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none font-medium"
        rows={3}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />
    </div>
  );
});

PromptInputNode.displayName = 'PromptInputNode';

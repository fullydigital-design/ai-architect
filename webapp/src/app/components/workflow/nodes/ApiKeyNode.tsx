import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { KeyRound, Check, AlertCircle } from 'lucide-react';
import { HANDLE_COLORS, DataType } from '../types';

function ApiKeyNodeComponent({ id, data, selected }: NodeProps) {
  const [apiKey, setApiKey] = useState(data.apiKey || '');
  const [isValid, setIsValid] = useState(false);

  const handleValidate = () => {
    // Simple validation - just check if key exists
    if (apiKey && apiKey.length > 10) {
      setIsValid(true);
      data.apiKey = apiKey;
      data.isValid = true;
    } else {
      setIsValid(false);
      data.isValid = false;
    }
  };

  return (
    <div
      className={`rounded-xl shadow-lg transition-all bg-white ${
        selected ? 'ring-4 ring-purple-400 shadow-2xl' : 'shadow-md hover:shadow-xl'
      }`}
      style={{ minWidth: '280px' }}
    >
      {/* Header */}
      <div className="px-4 py-3 rounded-t-xl bg-gradient-to-br from-green-500 to-emerald-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <KeyRound className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-xs font-black text-white">Google API Key</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 bg-white rounded-b-xl border-2 border-gray-200">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-content-faint mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google API key..."
              className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 font-mono"
            />
          </div>

          <button
            onClick={handleValidate}
            className="nodrag w-full px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all"
          >
            Validate Key
          </button>

          {isValid && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-green-700">API Key Valid!</span>
            </div>
          )}

          {apiKey && !isValid && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">Click validate to check</span>
            </div>
          )}
        </div>
      </div>

      {/* Output Handle - Always visible */}
      <Handle
        type="source"
        position={Position.Right}
        id="api-output"
        style={{
          top: '50%',
          background: isValid ? HANDLE_COLORS[DataType.TEXT] : '#9ca3af',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
        className="transition-all hover:scale-125"
      />

      {/* Provider badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-black shadow-lg" style={{ fontSize: '9px' }}>
        SETUP
      </div>
    </div>
  );
}

export const ApiKeyNode = memo(ApiKeyNodeComponent);
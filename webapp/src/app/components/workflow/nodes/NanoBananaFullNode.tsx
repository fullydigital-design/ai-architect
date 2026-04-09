import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Image, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { HANDLE_COLORS, DataType } from '../types';

function NanoBananaFullNodeComponent({ id, data, selected }: NodeProps) {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? true);
  const [mode, setMode] = useState(data.mode || 'generate');

  return (
    <div
      className={`rounded-xl shadow-lg transition-all bg-white ${
        selected ? 'ring-4 ring-purple-400 shadow-2xl' : 'shadow-md hover:shadow-xl'
      }`}
      style={{ width: isExpanded ? '320px' : '220px' }}
    >
      {/* Header */}
      <div className="px-4 py-3 rounded-t-xl bg-gradient-to-br from-pink-500 to-rose-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Image className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-xs font-black text-white">IMAGE (Imagen 3)</div>
          </div>
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              data.isExpanded = !isExpanded;
            }}
            className="nodrag p-1 hover:bg-white/20 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-white" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 bg-white rounded-b-xl border-2 border-gray-200">
        {isExpanded ? (
          <div className="space-y-3">
            {/* Model */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">MODEL</label>
              <select
                value={data.model || 'nano-banana-pro'}
                onChange={(e) => (data.model = e.target.value)}
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              >
                <option value="nano-banana-pro">Imagen 3 (Pro)</option>
              </select>
            </div>

            {/* Mode Toggle */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">MODE</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMode('generate');
                    data.mode = 'generate';
                  }}
                  className={`nodrag px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    mode === 'generate'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                  }`}
                >
                  ⚡ Generate
                </button>
                <button
                  onClick={() => {
                    setMode('edit');
                    data.mode = 'edit';
                  }}
                  className={`nodrag px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    mode === 'edit'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                  }`}
                >
                  ✏️ Edit
                </button>
              </div>
            </div>

            {/* Subject Image */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">
                SUBJECT IMAGE (OPTIONAL)
              </label>
              <div className="nodrag border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-content-secondary mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Upload Subject</p>
                <p className="text-xs text-content-muted">Optional Reference</p>
              </div>
            </div>

            {/* Style Images */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">
                STYLE IMAGES (UP TO 14)
              </label>
              <div className="nodrag border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-content-secondary mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Add Style</p>
                <p className="text-xs text-content-muted">0 / 14</p>
              </div>
              <p className="text-xs text-content-muted mt-1">
                💡 Up to 6 objects / 5 people recommended
              </p>
            </div>

            {/* Scene Description */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">SCENE DESCRIPTION</label>
              <textarea
                value={data.prompt || ''}
                onChange={(e) => (data.prompt = e.target.value)}
                placeholder='e.g. "A futuristic cityscape at sunset..."'
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none"
                rows={3}
              />
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">RESOLUTION</label>
              <div className="grid grid-cols-3 gap-2">
                {['1K', '2K', '4K'].map((res) => (
                  <button
                    key={res}
                    onClick={() => (data.resolution = res)}
                    className={`nodrag px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                      (data.resolution || '1K') === res
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-200 text-content-faint hover:border-gray-300'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">ASPECT RATIO</label>
              <select
                value={data.aspectRatio || '1:1'}
                onChange={(e) => (data.aspectRatio = e.target.value)}
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              >
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="3:2">3:2</option>
              </select>
            </div>

            {/* Web Search Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs font-bold text-gray-900">WEB SEARCH</p>
                <p className="text-xs text-content-muted">Use real-time grounding</p>
              </div>
              <label className="nodrag relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.webSearch || false}
                  onChange={(e) => (data.webSearch = e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        ) : (
          <div className="text-xs text-content-faint font-medium">
            <div className="font-bold text-gray-900 mb-1">
              {data.resolution || '1K'} • {data.aspectRatio || '1:1'}
            </div>
            <div className="text-content-muted">{mode === 'generate' ? 'Generate' : 'Edit'} mode</div>
          </div>
        )}
      </div>

      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="text-input"
        style={{
          top: '30%',
          background: HANDLE_COLORS[DataType.TEXT],
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
        className="transition-transform hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="style-input"
        style={{
          top: '70%',
          background: HANDLE_COLORS[DataType.STYLE],
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
        className="transition-transform hover:scale-125"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-output"
        style={{
          top: '50%',
          background: HANDLE_COLORS[DataType.IMAGE],
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
        className="transition-transform hover:scale-125"
      />

      {/* Provider badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-black shadow-lg" style={{ fontSize: '9px' }}>
        GOOGLE
      </div>
    </div>
  );
}

export const NanoBananaFullNode = memo(NanoBananaFullNodeComponent);

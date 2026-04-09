import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Video, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { HANDLE_COLORS, DataType } from '../types';

function VeoFullNodeComponent({ id, data, selected }: NodeProps) {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? true);

  return (
    <div
      className={`rounded-xl shadow-lg transition-all bg-white ${
        selected ? 'ring-4 ring-purple-400 shadow-2xl' : 'shadow-md hover:shadow-xl'
      }`}
      style={{ width: isExpanded ? '320px' : '220px' }}
    >
      {/* Header */}
      <div className="px-4 py-3 rounded-t-xl bg-gradient-to-br from-blue-500 to-cyan-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Video className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-xs font-black text-white">VIDEO (Veo 3.1)</div>
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
      <div className="px-4 py-4 bg-white rounded-b-xl border-2 border-gray-200 max-h-[600px] overflow-y-auto">
        {isExpanded ? (
          <div className="space-y-3">
            {/* Model */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">MODEL</label>
              <select
                value={data.model || 'veo-3.1'}
                onChange={(e) => (data.model = e.target.value)}
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              >
                <option value="veo-3.1">Veo 3.1 Fast (Speed)</option>
                <option value="veo-3.1-quality">Veo 3.1 Quality</option>
              </select>
            </div>

            {/* Generation Mode */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">GENERATION MODE</label>
              <select
                value={data.generationMode || 'text-to-video'}
                onChange={(e) => (data.generationMode = e.target.value)}
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              >
                <option value="text-to-video">Text → Video</option>
                <option value="image-to-video">Image → Video</option>
                <option value="video-extend">Extend Video</option>
                <option value="video-interpolate">Interpolate Video</option>
              </select>
            </div>

            {/* Start Frame */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">
                START FRAME (OPTIONAL)
              </label>
              <div className="nodrag border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-content-secondary mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Upload Image</p>
                <p className="text-xs text-content-muted">Image → Video, starting frame</p>
              </div>
            </div>

            {/* Reference Images */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">
                REFERENCE IMAGES (UP TO 3)
              </label>
              <div className="nodrag border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-content-secondary mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Add Reference</p>
                <p className="text-xs text-content-muted">0 / 3</p>
              </div>
            </div>

            {/* Describe Video */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">DESCRIBE THE VIDEO</label>
              <textarea
                value={data.prompt || ''}
                onChange={(e) => (data.prompt = e.target.value)}
                placeholder='e.g. "Cinematic close-up of a sports car driving through rain, neon reflections, slow motion..."'
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none"
                rows={4}
              />
              <p className="text-xs text-content-muted mt-1">
                💡 For subtle subject + action + style + camera + lighting
              </p>
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">
                NEGATIVE PROMPT (OPTIONAL)
              </label>
              <textarea
                value={data.negativePrompt || ''}
                onChange={(e) => (data.negativePrompt = e.target.value)}
                placeholder='e.g. "Cartoon, low quality, blurry, distorted..."'
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none"
                rows={2}
              />
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">RESOLUTION</label>
              <div className="grid grid-cols-3 gap-2">
                {['720p', '1080p', '4K'].map((res) => (
                  <button
                    key={res}
                    onClick={() => (data.resolution = res)}
                    className={`nodrag px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                      (data.resolution || '720p') === res
                        ? 'bg-pink-500 text-white border-pink-500'
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
              <div className="grid grid-cols-3 gap-2">
                {['16:9', '9:16', '1:1'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => (data.aspectRatio = ratio)}
                    className={`nodrag px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                      (data.aspectRatio || '16:9') === ratio
                        ? 'bg-pink-500 text-white border-pink-500'
                        : 'border-gray-200 text-content-faint hover:border-gray-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">DURATION</label>
              <div className="grid grid-cols-3 gap-2">
                {['4s', '6s', '8s'].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => (data.duration = dur)}
                    className={`nodrag px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                      (data.duration || '6s') === dur
                        ? 'bg-pink-500 text-white border-pink-500'
                        : 'border-gray-200 text-content-faint hover:border-gray-300'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced */}
            <div className="border-t pt-3">
              <label className="block text-xs font-bold text-content-faint mb-1">ADVANCED</label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-content-faint mb-1">Variations (1-4)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={data.variations || 1}
                    onChange={(e) => (data.variations = parseInt(e.target.value))}
                    className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-content-faint mb-1">Seed (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave empty for random"
                    value={data.seed || ''}
                    onChange={(e) => (data.seed = e.target.value)}
                    className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
                  />
                  <p className="text-xs text-content-muted mt-1">Improves repeatability</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-content-faint font-medium">
            <div className="font-bold text-gray-900 mb-1">
              {data.resolution || '720p'} • {data.aspectRatio || '16:9'}
            </div>
            <div className="text-content-muted">{data.duration || '6s'}</div>
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
        id="image-input"
        style={{
          top: '70%',
          background: HANDLE_COLORS[DataType.IMAGE],
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
        id="video-output"
        style={{
          top: '50%',
          background: HANDLE_COLORS[DataType.VIDEO],
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
        className="transition-transform hover:scale-125"
      />

      {/* Provider badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-black shadow-lg" style={{ fontSize: '9px' }}>
        GOOGLE
      </div>
    </div>
  );
}

export const VeoFullNode = memo(VeoFullNodeComponent);

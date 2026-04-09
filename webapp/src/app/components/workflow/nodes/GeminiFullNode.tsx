import { memo, useState, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Sparkles, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { HANDLE_COLORS, DataType } from '../types';

function GeminiFullNodeComponent({ id, data, selected }: NodeProps) {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(data.uploadedImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setUploadedImage(imageUrl);
        data.uploadedImage = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedImage(null);
    data.uploadedImage = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Prevent drag on interactive elements
  const handleInteraction = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`rounded-xl shadow-lg transition-all bg-white ${
        selected ? 'ring-4 ring-purple-400 shadow-2xl' : 'shadow-md hover:shadow-xl'
      }`}
      style={{ width: isExpanded ? '320px' : '220px' }}
    >
      {/* Header */}
      <div className="px-4 py-3 rounded-t-xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-xs font-black text-white">CONCEPT (Gemini)</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
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
                value={data.model || 'gemini-2.0-flash-exp'}
                onChange={(e) => {
                  data.model = e.target.value;
                }}
                onMouseDown={handleInteraction}
                onFocus={handleInteraction}
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                <option value="gemini-pro">Gemini Pro (Best)</option>
              </select>
            </div>

            {/* Goal */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">GOAL</label>
              <select
                value={data.goalType || 'general'}
                onChange={(e) => {
                  data.goalType = e.target.value;
                }}
                onMouseDown={handleInteraction}
                onFocus={handleInteraction}
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="general">General</option>
                <option value="marketing">Marketing Campaign</option>
                <option value="social">Social Media</option>
                <option value="product">Product Description</option>
                <option value="blog">Blog Post</option>
                <option value="ad">Ad Copy</option>
                <option value="email">Email</option>
                <option value="creative">Creative Writing</option>
                <option value="describe">Describe Image</option>
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">TONE</label>
              <select
                value={data.tone || 'clean'}
                onChange={(e) => {
                  data.tone = e.target.value;
                }}
                onMouseDown={handleInteraction}
                onFocus={handleInteraction}
                className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="clean">Clean / Premium</option>
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="playful">Playful</option>
              </select>
            </div>

            {/* Platform & Language */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-content-faint mb-1">PLATFORM</label>
                <select
                  value={data.platform || 'instagram'}
                  onChange={(e) => {
                    data.platform = e.target.value;
                  }}
                  onMouseDown={handleInteraction}
                  onFocus={handleInteraction}
                  className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="instagram">Instagram Reel</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-content-faint mb-1">LANGUAGE</label>
                <select
                  value={data.language || 'english'}
                  onChange={(e) => {
                    data.language = e.target.value;
                  }}
                  onMouseDown={handleInteraction}
                  onFocus={handleInteraction}
                  className="nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                </select>
              </div>
            </div>

            {/* Input Image */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">
                INPUT IMAGE (OPTIONAL)
              </label>
              
              {!uploadedImage ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="nodrag border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-content-secondary mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-900">Attach Image</p>
                  <p className="text-xs text-content-muted">Optional Reference</p>
                </div>
              ) : (
                <div className="nodrag relative rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={uploadedImage}
                    alt="Uploaded reference"
                    className="w-full h-auto object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Web Search Toggle */}
            <div 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              onMouseDown={handleInteraction}
            >
              <div>
                <p className="text-xs font-bold text-gray-900">WEB SEARCH</p>
                <p className="text-xs text-content-muted">Use real-time grounding</p>
              </div>
              <label className="nodrag relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.webSearch || false}
                  onChange={(e) => {
                    data.webSearch = e.target.checked;
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Concept Prompt */}
            <div>
              <label className="block text-xs font-bold text-content-faint mb-1">
                CONCEPT PROMPT
                {data.promptFromConnection && (
                  <span className="ml-2 text-purple-600 text-xs font-medium">
                    • Connected
                  </span>
                )}
              </label>
              <textarea
                value={data.prompt || ''}
                onChange={(e) => {
                  if (!data.promptFromConnection) {
                    if (data.onUpdate) {
                      data.onUpdate(id, {
                        ...data,
                        prompt: e.target.value,
                      });
                    } else {
                      data.prompt = e.target.value;
                    }
                  }
                }}
                onMouseDown={handleInteraction}
                onFocus={handleInteraction}
                disabled={data.promptFromConnection}
                placeholder={
                  data.promptFromConnection
                    ? 'Prompt from connected Text Prompt node...'
                    : uploadedImage
                    ? 'Describe what you want AI to create based on this image...'
                    : 'Describe your product, audience, and goal... e.g. "Luxury car campaign for Reels, night mood, premium look."'
                }
                className={`nodrag w-full px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none ${
                  data.promptFromConnection
                    ? 'bg-purple-50 border-purple-300 text-content-faint cursor-not-allowed'
                    : 'bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                }`}
                rows={4}
              />
              {data.promptFromConnection && (
                <p className="text-xs text-purple-600 font-medium mt-1">
                  📌 Prompt is controlled by connected Text Prompt node
                </p>
              )}
              {uploadedImage && !data.promptFromConnection && (
                <p className="text-xs text-purple-600 font-medium mt-1">
                  💡 Image attached - AI will analyze and describe it
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-content-faint font-medium">
            <div className="font-bold text-gray-900 mb-1">{data.model || 'Gemini Flash'}</div>
            <div className="text-content-muted capitalize">{data.goalType || 'general'}</div>
            {uploadedImage && (
              <div className="mt-2">
                <img
                  src={uploadedImage}
                  alt="Reference"
                  className="w-full h-16 object-cover rounded"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="text-input"
        style={{
          top: '50%',
          background: HANDLE_COLORS[DataType.TEXT],
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
        id="text-output"
        style={{
          top: '50%',
          background: HANDLE_COLORS[DataType.TEXT],
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
        className="transition-transform hover:scale-125"
      />

      {/* Provider badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-black shadow-lg" style={{ fontSize: '9px' }}>
        GOOGLE
      </div>
    </div>
  );
}

export const GeminiFullNode = memo(GeminiFullNodeComponent);
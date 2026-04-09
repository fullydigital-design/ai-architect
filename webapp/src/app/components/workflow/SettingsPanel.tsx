import { X, Settings } from 'lucide-react';
import { Node } from 'reactflow';
import { getNodeDefinition } from './nodeDefinitions';

// Rich text formatter component (same as TextDisplayNode)
function FormattedText({ text }: { text: string }) {
  const formatText = (input: string) => {
    const lines = input.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, lineIndex) => {
      // Skip empty lines but add spacing
      if (line.trim() === '') {
        elements.push(<div key={`spacer-${lineIndex}`} className="h-2" />);
        return;
      }

      // Headers with ** (bold)
      if (line.includes('**')) {
        const parts = line.split('**');
        const formatted = parts.map((part, i) => {
          if (i % 2 === 1) {
            // This is between ** markers - make it bold
            return <strong key={i} className="font-black text-gray-900">{part}</strong>;
          }
          return <span key={i}>{part}</span>;
        });
        
        elements.push(
          <div key={lineIndex} className="mb-3">
            {formatted}
          </div>
        );
        return;
      }

      // Bullet points (lines starting with -)
      if (line.trim().startsWith('-')) {
        const content = line.trim().substring(1).trim();
        elements.push(
          <div key={lineIndex} className="flex gap-2 mb-2 ml-4">
            <span className="text-purple-600 font-black">•</span>
            <span className="flex-1">{content}</span>
          </div>
        );
        return;
      }

      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        elements.push(
          <div key={lineIndex} className="flex gap-2 mb-2 ml-4">
            <span className="text-purple-600 font-black">{numberedMatch[1]}.</span>
            <span className="flex-1">{numberedMatch[2]}</span>
          </div>
        );
        return;
      }

      // Section headers with emojis (lines starting with emoji)
      const emojiMatch = line.match(/^([🎯💬🎬🎨🎵💡📋✨🌿🚀⚡🔥💎📱🎪🌟💫⭐🎁🎉🎊]+)\s+(.+)/);
      if (emojiMatch) {
        elements.push(
          <div key={lineIndex} className="mb-3 mt-4">
            <span className="text-xl mr-2">{emojiMatch[1]}</span>
            <span className="font-black text-gray-900">{emojiMatch[2]}</span>
          </div>
        );
        return;
      }

      // Regular text
      elements.push(
        <div key={lineIndex} className="mb-2 leading-relaxed">
          {line}
        </div>
      );
    });

    return elements;
  };

  return <div className="text-sm text-content-faint">{formatText(text)}</div>;
}

interface SettingsPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, data: any) => void;
}

export function SettingsPanel({ selectedNode, onClose, onUpdateNode }: SettingsPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Settings className="w-12 h-12 text-content-primary mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-900 mb-1">No Node Selected</p>
            <p className="text-xs text-content-muted">
              Click on a node to configure its settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  const nodeDefinition = getNodeDefinition(selectedNode.type);

  if (!nodeDefinition) {
    return null;
  }

  const handleChange = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      [key]: value,
    });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-content-faint" />
          <h2 className="text-sm font-black text-gray-900">Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-content-muted" />
        </button>
      </div>

      {/* Node Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${nodeDefinition.gradient} flex items-center justify-center`}>
            {nodeDefinition.icon && <nodeDefinition.icon className="w-4 h-4 text-white" strokeWidth={2.5} />}
          </div>
          <div>
            <div className="text-sm font-black text-gray-900">{nodeDefinition.label}</div>
            <div className="text-xs text-content-muted font-medium">{nodeDefinition.description}</div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Text Display (Output) - Show Preview */}
        {selectedNode.type === 'textDisplay' && (
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-3">
              Output Preview
            </label>
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl max-h-[500px] overflow-y-auto">
              {selectedNode.data.result ? (
                <div className="prose prose-sm max-w-none">
                  <FormattedText text={selectedNode.data.result} />
                  <div className="mt-4 pt-3 border-t border-purple-200 flex items-center justify-between">
                    <span className="text-xs text-purple-600 font-medium">
                      {selectedNode.data.result.split(' ').filter((w: string) => w.length > 0).length} words
                    </span>
                    <span className="text-xs text-purple-600 font-medium">
                      {selectedNode.data.result.length} characters
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-purple-400 italic">No output generated yet</p>
                  <p className="text-xs text-content-muted mt-1">Connect and run workflow to see results</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!nodeDefinition.configurable && selectedNode.type !== 'textDisplay' ? (
          <div className="text-center py-8">
            <p className="text-xs text-content-muted">This node has no configurable settings</p>
          </div>
        ) : selectedNode.type !== 'textDisplay' ? (
          <div className="space-y-4">
            {/* Image Upload Settings */}
            {selectedNode.type === 'imageUpload' && (
              <div>
                <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                  Input Image (Optional)
                </label>
                <label className="block cursor-pointer">
                  <div className="relative p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-400 transition-colors bg-gray-50">
                    {selectedNode.data.image ? (
                      <div className="space-y-2">
                        <img 
                          src={selectedNode.data.image} 
                          alt="Uploaded" 
                          className="w-full h-40 rounded-lg object-cover"
                        />
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-900">✓ Image Uploaded</p>
                          <p className="text-xs text-content-muted">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-pink-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm font-bold text-gray-900">Attach Image</p>
                        <p className="text-xs text-content-muted mt-1">Optional Reference</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          handleChange('image', event.target?.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            )}

            {/* Style Reference Settings */}
            {selectedNode.type === 'styleReference' && (
              <div>
                <label className="block text-xs font-bold text-content-faint mb-2">
                  Style Images
                </label>
                <label className="block cursor-pointer">
                  <div className="relative p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors bg-gray-50">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-yellow-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-gray-900">Upload Style Images</p>
                      <p className="text-xs text-content-muted mt-1">Up to 14 images</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        const readers = files.map(file => {
                          return new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              resolve(event.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          });
                        });
                        
                        Promise.all(readers).then(images => {
                          handleChange('styles', images.slice(0, 14));
                        });
                      }
                    }}
                  />
                </label>
              </div>
            )}

            {/* Text Prompt Settings */}
            {selectedNode.type === 'textPrompt' && (
              <div>
                <label className="block text-xs font-bold text-content-faint mb-2">
                  Prompt Text
                </label>
                <textarea
                  value={selectedNode.data.value || ''}
                  onChange={(e) => handleChange('value', e.target.value)}
                  placeholder="Enter your prompt..."
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none"
                  rows={4}
                />
              </div>
            )}

            {/* Gemini Settings */}
            {selectedNode.type === 'gemini' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-2">
                    Model
                  </label>
                  <select
                    value={selectedNode.data.model || 'gemini-2.0-flash-exp'}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                    <option value="gemini-pro">Gemini Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-2">
                    Goal Type
                  </label>
                  <select
                    value={selectedNode.data.goalType || 'general'}
                    onChange={(e) => handleChange('goalType', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="general">General</option>
                    <option value="marketing">Marketing</option>
                    <option value="social">Social Media</option>
                    <option value="product">Product Description</option>
                    <option value="blog">Blog Post</option>
                    <option value="ad">Ad Copy</option>
                    <option value="email">Email</option>
                    <option value="creative">Creative Writing</option>
                  </select>
                </div>
              </>
            )}

            {/* Nano Banana Settings */}
            {selectedNode.type === 'nanoBanana' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-2">
                    Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['1K', '2K', '4K'].map((res) => (
                      <button
                        key={res}
                        onClick={() => handleChange('resolution', res)}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                          selectedNode.data.resolution === res
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-content-faint hover:border-gray-300'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-2">
                    Aspect Ratio
                  </label>
                  <select
                    value={selectedNode.data.aspectRatio || '1:1'}
                    onChange={(e) => handleChange('aspectRatio', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="1:1">1:1 (Square)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="4:3">4:3 (Standard)</option>
                    <option value="3:2">3:2 (Photo)</option>
                  </select>
                </div>
              </>
            )}

            {/* Veo Settings */}
            {selectedNode.type === 'veo' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-2">
                    Generation Mode
                  </label>
                  <select
                    value={selectedNode.data.mode || 'text-to-video'}
                    onChange={(e) => handleChange('mode', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="text-to-video">Text to Video</option>
                    <option value="image-to-video">Image to Video</option>
                    <option value="video-extend">Extend Video</option>
                    <option value="video-interpolate">Interpolate Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-2">
                    Resolution
                  </label>
                  <select
                    value={selectedNode.data.resolution || '720p'}
                    onChange={(e) => handleChange('resolution', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="480p">480p</option>
                    <option value="720p">720p (HD)</option>
                    <option value="1080p">1080p (Full HD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-2">
                    Duration
                  </label>
                  <select
                    value={selectedNode.data.duration || '5s'}
                    onChange={(e) => handleChange('duration', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="5s">5 seconds</option>
                    <option value="10s">10 seconds</option>
                  </select>
                </div>
              </>
            )}

            {/* Download Settings */}
            {selectedNode.type === 'download' && (
              <div>
                <label className="block text-xs font-bold text-content-faint mb-2">
                  Output Format
                </label>
                <select
                  value={selectedNode.data.format || 'png'}
                  onChange={(e) => handleChange('format', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                </select>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Provider Badge */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-fuchsia-50 to-purple-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600"></div>
          <span className="text-xs font-black text-purple-900 uppercase tracking-wider">
            {nodeDefinition.provider} API
          </span>
        </div>
      </div>
    </div>
  );
}
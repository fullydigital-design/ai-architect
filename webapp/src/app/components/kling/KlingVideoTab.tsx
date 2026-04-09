import { useState } from 'react';
import { Sparkles, Download, Copy, Trash2, ChevronDown, ChevronUp, Upload } from 'lucide-react';

interface KlingVideoTabProps {
  apiKey: string;
}

export function KlingVideoTab({ apiKey }: KlingVideoTabProps) {
  // State for all Kling AI parameters
  const [mode, setMode] = useState('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState('5s');
  const [fps, setFps] = useState(24);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [seed, setSeed] = useState<number | null>(null);
  
  // Camera controls
  const [cameraType, setCameraType] = useState('none');
  const [cameraHorizontal, setCameraHorizontal] = useState(0);
  const [cameraVertical, setCameraVertical] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(0);
  const [cameraTilt, setCameraTilt] = useState(0);
  const [cameraPan, setCameraPan] = useState(0);
  const [cameraRoll, setCameraRoll] = useState(0);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Generation modes
  const modes = [
    { value: 'text-to-video', label: 'Text → Video', icon: '📝' },
    { value: 'image-to-video', label: 'Image → Video', icon: '🖼️' },
    { value: 'video-extend', label: 'Extend Video', icon: '➡️' },
  ];

  // Aspect ratios
  const aspectRatios = [
    { value: '16:9', label: '16:9 (Landscape)' },
    { value: '9:16', label: '9:16 (Portrait)' },
    { value: '1:1', label: '1:1 (Square)' },
    { value: '21:9', label: '21:9 (Cinematic)' },
  ];

  // Durations
  const durations = [
    { value: '5s', label: '5 seconds' },
    { value: '10s', label: '10 seconds' },
  ];

  // Camera movement presets
  const cameraTypes = [
    { value: 'none', label: 'None' },
    { value: 'pan', label: 'Pan' },
    { value: 'tilt', label: 'Tilt' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'track', label: 'Track' },
    { value: 'orbit', label: 'Orbit' },
    { value: 'crane', label: 'Crane' },
    { value: 'dolly', label: 'Dolly' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // This is a mock - in production, you'd call the real Kling API
      const mockGeneratedVideo = 'https://via.placeholder.com/1280x720/3B82F6/FFFFFF?text=Kling+AI+Generated+Video';
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setGeneratedVideos(prev => [mockGeneratedVideo, ...prev]);
      setIsGenerating(false);
    } catch (err) {
      setError('Generation failed. Please check your API key and try again.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left Sidebar - Controls */}
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">VIDEO Generation</h2>
            <p className="text-sm text-content-muted font-medium">Kling AI Professional</p>
          </div>

          {/* Generation Mode */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Generation Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`p-2 rounded-lg text-xs font-bold transition-all ${
                    mode === m.value
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                  }`}
                >
                  <div className="text-lg mb-1">{m.icon}</div>
                  <div>{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload (if image-to-video mode) */}
          {mode === 'image-to-video' && (
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Start Frame
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-content-secondary mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-900">Upload Image</p>
                <p className="text-xs text-content-muted font-medium">First frame of your video</p>
              </div>
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Video Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate... e.g., 'Cinematic drone shot flying over a coastal city at sunset, camera moving forward smoothly'"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none font-medium text-sm"
              rows={5}
            />
            <p className="mt-2 text-xs text-content-muted font-medium">
              💡 Tip: Describe motion, camera movement, and scene details
            </p>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setAspectRatio(ratio.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    aspectRatio === ratio.value
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Video Duration
            </label>
            <div className="grid grid-cols-2 gap-2">
              {durations.map((dur) => (
                <button
                  key={dur.value}
                  onClick={() => setDuration(dur.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    duration === dur.value
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Controls */}
          <div className="border-2 border-blue-200 rounded-2xl p-4 bg-blue-50">
            <h3 className="text-sm font-black text-gray-900 mb-3">🎥 Camera Controls</h3>
            
            {/* Camera Type */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-content-faint mb-2">
                Camera Movement Preset
              </label>
              <select
                value={cameraType}
                onChange={(e) => setCameraType(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 text-sm font-medium"
              >
                {cameraTypes.map((cam) => (
                  <option key={cam.value} value={cam.value}>{cam.label}</option>
                ))}
              </select>
            </div>

            {/* Fine Controls */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-content-faint mb-1">
                  Horizontal: {cameraHorizontal}
                </label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={cameraHorizontal}
                  onChange={(e) => setCameraHorizontal(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-content-faint mb-1">
                  Vertical: {cameraVertical}
                </label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={cameraVertical}
                  onChange={(e) => setCameraVertical(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-content-faint mb-1">
                  Zoom: {cameraZoom}
                </label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={cameraZoom}
                  onChange={(e) => setCameraZoom(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold text-gray-900">Advanced Settings</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-content-faint" />
            ) : (
              <ChevronDown className="w-4 h-4 text-content-faint" />
            )}
          </button>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-6 pt-2">
              {/* Negative Prompt */}
              <div>
                <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                  Negative Prompt (Optional)
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="What to avoid... e.g., 'blurry, shaky, low quality, distorted motion'"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none font-medium text-sm"
                  rows={3}
                />
              </div>

              {/* FPS */}
              <div>
                <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                  Frame Rate (FPS)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 30, 60].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFps(f)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                        fps === f
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                          : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                      }`}
                    >
                      {f} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* CFG Scale */}
              <div>
                <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                  CFG Scale: {cfgScale}
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={cfgScale}
                  onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-content-muted font-medium mt-1">
                  <span>Creative</span>
                  <span>Precise</span>
                </div>
              </div>

              {/* Seed */}
              <div>
                <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                  Seed (Optional)
                </label>
                <input
                  type="number"
                  value={seed || ''}
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Random"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 font-medium text-sm"
                />
              </div>

              {/* Additional Camera Controls */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-1">
                    Pan: {cameraPan}
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={cameraPan}
                    onChange={(e) => setCameraPan(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-content-faint mb-1">
                    Tilt: {cameraTilt}
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={cameraTilt}
                    onChange={(e) => setCameraTilt(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-content-faint mb-1">
                    Roll: {cameraRoll}
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={cameraRoll}
                    onChange={(e) => setCameraRoll(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm font-bold text-red-900">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Video
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Side - Gallery */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-8">
          {generatedVideos.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Ready to Generate
                </h3>
                <p className="text-content-faint font-medium max-w-md">
                  Configure your settings and click "Generate Video" to create professional AI video with Kling AI
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {generatedVideos.map((video, index) => (
                <div key={index} className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all">
                  <div className="aspect-video bg-surface-inset flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                      </div>
                      <p className="text-white text-sm font-bold">Video #{index + 1}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
                          <Download className="w-4 h-4 text-white" />
                        </button>
                        <button className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
                          <Copy className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <button className="p-2 rounded-lg bg-red-500/80 backdrop-blur-sm hover:bg-red-600 transition-colors">
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

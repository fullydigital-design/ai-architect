import { useState } from 'react';
import { 
  Video, 
  Workflow, 
  Download,
  Sparkles,
  Grid3x3,
  X,
  Copy,
  Trash2,
  Play,
  Film
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface KlingStudioProps {
  onBackToHome: () => void;
  onNavigate: (page: string) => void;
}

export function KlingStudio({ onBackToHome, onNavigate }: KlingStudioProps) {
  // Demo mode - API key pre-set
  const [klingApiKey] = useState<string>('demo_kling_api_key');

  // Generation Parameters
  const [model, setModel] = useState('kling-v1');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [cameraMotion, setCameraMotion] = useState('auto');
  const [motionBrush, setMotionBrush] = useState(false);

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGallery, setShowGallery] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const mockVideo = 'https://placehold.co/1920x1080/10B981/FFFFFF?text=Kling+AI+Video';
      setGeneratedVideos(prev => [mockVideo, ...prev]);
      setIsGenerating(false);
    } catch (err) {
      setError('Generation failed.');
      setIsGenerating(false);
    }
  };

  const modelOptions = [
    { value: 'kling-v1', label: 'Kling v1.0 (Standard)' },
    { value: 'kling-v1-pro', label: 'Kling v1.0 Pro (High Quality)' },
  ];

  const aspectRatios = [
    '16:9', '9:16', '1:1', '4:3', '21:9'
  ];

  const cameraMotions = [
    { value: 'auto', label: 'Auto (AI Decides)' },
    { value: 'static', label: 'Static' },
    { value: 'horizontal', label: 'Horizontal Pan' },
    { value: 'vertical', label: 'Vertical Pan' },
    { value: 'zoom_in', label: 'Zoom In' },
    { value: 'zoom_out', label: 'Zoom Out' },
    { value: 'crane_up', label: 'Crane Up' },
    { value: 'crane_down', label: 'Crane Down' },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col overflow-hidden">
      {/* Header - EXACT from Google */}
      <header className="flex-none bg-white/80 backdrop-blur-xl border-b border-gray-200 z-50">
        <div className="px-4 lg:px-6 py-3 grid grid-cols-3 items-center">
          {/* Left: Logo */}
          <div 
            onClick={onBackToHome}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <span className="text-white font-bold text-sm">WB</span>
            </div>
            <span className="text-gray-900 font-bold text-base lg:text-lg tracking-tight hidden sm:inline">
              fullydigital.pictures
            </span>
          </div>

          {/* Center: VIDEO Mode Button */}
          <div className="flex items-center justify-center gap-1.5 lg:gap-2">
            <button
              className="px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-medium text-xs lg:text-sm uppercase tracking-wide transition-all bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg"
            >
              <Video className="w-3 h-3 lg:w-4 lg:h-4 inline mr-1" />
              <span className="hidden md:inline">VIDEO</span>
            </button>
          </div>

          {/* Right: Workflows & Export */}
          <div className="flex items-center justify-end gap-1.5 lg:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('workflow-selection')}
              className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-400 text-xs lg:text-sm font-bold"
            >
              <Workflow className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1.5" />
              <span className="hidden lg:inline">Workflows</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
              disabled={generatedVideos.length === 0}
              className="border-gray-300 text-content-faint hover:bg-gray-50 disabled:opacity-30 text-xs lg:text-sm"
            >
              <Download className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1.5" />
              <span className="hidden lg:inline">Export</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Left: CONTROLS Panel */}
        <div className="w-96 p-3 overflow-y-auto flex-shrink-0">
          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-5 h-5 text-content-secondary" strokeWidth={1.5} />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">CONTROLS</h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-6 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
              {/* Model Selection */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  MODEL
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                  style={{ border: 'none', boxShadow: 'none' }}
                >
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prompt */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  PROMPT
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A cinematic drone shot flying through a futuristic city at sunset, neon lights reflecting off glass buildings, smooth camera movement, ultra high quality"
                  rows={4}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                  style={{ border: 'none', boxShadow: 'none' }}
                />
                <p className="mt-2 text-xs text-emerald-600 font-medium flex items-start gap-1">
                  <span>💡</span>
                  <span>Kling AI creates cinematic videos with professional motion and physics</span>
                </p>
              </div>

              {/* Duration */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  DURATION: {duration}s
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-emerald-200 to-green-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(16, 185, 129) 0%, rgb(16, 185, 129) ${(duration / 10) * 100}%, rgb(209, 250, 229) ${(duration / 10) * 100}%, rgb(209, 250, 229) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-content-muted font-medium">1s</span>
                  <span className="text-xs text-content-muted font-medium">10s</span>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  ASPECT RATIO
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        aspectRatio === ratio
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                          : 'bg-white text-content-faint hover:bg-gray-50'
                      }`}
                      style={aspectRatio !== ratio ? { border: 'none' } : undefined}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Motion */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  CAMERA MOTION
                </label>
                <select
                  value={cameraMotion}
                  onChange={(e) => setCameraMotion(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                  style={{ border: 'none', boxShadow: 'none' }}
                >
                  {cameraMotions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Motion Brush */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-content-muted uppercase tracking-wide mb-1">
                      MOTION BRUSH
                    </div>
                    <p className="text-xs text-content-muted font-medium">
                      Paint motion directions on objects
                    </p>
                  </div>
                  <button
                    onClick={() => setMotionBrush(!motionBrush)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      motionBrush ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        motionBrush ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm font-bold text-red-900">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black text-base hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        </div>

        {/* Center: Canvas/Gallery Area */}
        <div className="flex-1 bg-gray-50 overflow-hidden flex items-center justify-center relative">
          {generatedVideos.length === 0 ? (
            // Empty State
            <div className="text-center max-w-2xl px-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                <Film className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-3">
                Professional Video Generation
              </h2>
              <p className="text-content-faint font-medium text-lg mb-8">
                Create cinematic AI videos with Kling's advanced motion controls and camera movements
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-600 mb-1">STEP 1</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Write Prompt</p>
                  <p className="text-xs text-content-faint">Describe the scene</p>
                </div>
                <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-600 mb-1">STEP 2</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Configure</p>
                  <p className="text-xs text-content-faint">Set duration & camera</p>
                </div>
                <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-600 mb-1">STEP 3</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Generate</p>
                  <p className="text-xs text-content-faint">Get cinematic video</p>
                </div>
              </div>
            </div>
          ) : (
            // Gallery
            <div className="w-full h-full overflow-y-auto p-8">
              <div className="grid grid-cols-2 gap-6">
                {generatedVideos.map((video, index) => (
                  <div key={index} className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all aspect-video">
                    <img src={video} alt={`Generated ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-emerald-600 ml-1" fill="currentColor" />
                      </button>
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
            </div>
          )}
        </div>

        {/* Right: SETTINGS Panel */}
        {rightPanelOpen && (
          <div className="w-96 p-3 overflow-y-auto flex-shrink-0">
            <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden h-full">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-5 h-5 text-content-secondary" strokeWidth={1.5} />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">SETTINGS</h2>
                </div>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-content-secondary" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="px-6 py-6 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
                {/* Gallery Toggle */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowGallery(!showGallery)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                      showGallery
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                        : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                    }`}
                  >
                    All ({generatedVideos.length})
                  </button>
                </div>

                {/* Gallery Grid */}
                {showGallery && generatedVideos.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-content-muted uppercase tracking-wide">
                      GENERATED VIDEOS
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {generatedVideos.map((video, index) => (
                        <div
                          key={index}
                          className="group relative aspect-video rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                        >
                          <img
                            src={video}
                            alt={`Generated ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                              <Play className="w-5 h-5 text-emerald-600 ml-0.5" fill="currentColor" />
                            </button>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-3">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button className="p-2 rounded-lg bg-white/90 hover:bg-white transition-colors">
                                <Download className="w-4 h-4 text-gray-900" />
                              </button>
                              <button className="p-2 rounded-lg bg-white/90 hover:bg-white transition-colors">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {generatedVideos.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Video className="w-8 h-8 text-content-secondary" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">No Videos Yet</p>
                    <p className="text-xs text-content-muted">
                      Generated videos will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating Button to Open Settings Panel */}
        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Grid3x3 className="w-5 h-5 text-content-faint" />
          </button>
        )}
      </div>
    </div>
  );
}
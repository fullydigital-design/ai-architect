import { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Workflow, 
  Settings, 
  Download,
  Sparkles,
  Grid3x3,
  X,
  Copy,
  Trash2
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface GoogleTemplateImageProps {
  onBackToHome: () => void;
  onNavigate: (page: string) => void;
}

export function GoogleTemplateImage({ onBackToHome, onNavigate }: GoogleTemplateImageProps) {
  // Generation Parameters
  const [model, setModel] = useState('gemini-3-pro-image-preview');
  const[prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numImages, setNumImages] = useState(1);
  const [safetyFilter, setSafetyFilter] = useState('medium');

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
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
      await new Promise(resolve => setTimeout(resolve, 3000));
      const mockImage = 'https://placehold.co/1024x1024/4285F4/FFFFFF?text=Google+Imagen+3.0';
      setGeneratedImages(prev => [mockImage, ...prev]);
      setIsGenerating(false);
    } catch (err) {
      setError('Generation failed.');
      setIsGenerating(false);
    }
  };

  const modelOptions = [
    { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro (High Quality)' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (Fast)' },
  ];

  const aspectRatios = [
    '1:1', '16:9', '9:16', '4:3', '3:4', '3:2'
  ];

  const safetyFilters = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium (Recommended)' },
    { value: 'high', label: 'High' },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex flex-col overflow-hidden">
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
              WayBetter.ai
            </span>
          </div>

          {/* Center: IMAGE Mode Button */}
          <div className="flex items-center justify-center gap-1.5 lg:gap-2">
            <button
              className="px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-medium text-xs lg:text-sm uppercase tracking-wide transition-all bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
            >
              <ImageIcon className="w-3 h-3 lg:w-4 lg:h-4 inline mr-1" />
              <span className="hidden md:inline">IMAGE</span>
            </button>
          </div>

          {/* Right: Workflows & API */}
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
              className="border-gray-300 text-content-faint hover:bg-gray-50 text-xs lg:text-sm"
            >
              <Settings className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1.5" />
              <span className="hidden lg:inline">API</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
              disabled={generatedImages.length === 0}
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
                  placeholder="A photorealistic product shot of a smartphone on a clean white background, professional studio lighting, high detail, 8k resolution"
                  rows={4}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                  style={{ border: 'none', boxShadow: 'none' }}
                />
                <p className="mt-2 text-xs text-blue-600 font-medium flex items-start gap-1">
                  <span>💡</span>
                  <span>Google Imagen creates photorealistic images with stunning detail</span>
                </p>
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
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                          : 'bg-white text-content-faint hover:bg-gray-50'
                      }`}
                      style={aspectRatio !== ratio ? { border: 'none' } : undefined}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Images */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  NUMBER OF IMAGES
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumImages(num)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        numImages === num
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                          : 'bg-white text-content-faint hover:bg-gray-50'
                      }`}
                      style={numImages !== num ? { border: 'none' } : undefined}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Safety Filter */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  SAFETY FILTER
                </label>
                <select
                  value={safetyFilter}
                  onChange={(e) => setSafetyFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                  style={{ border: 'none', boxShadow: 'none' }}
                >
                  {safetyFilters.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-base hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Canvas/Gallery Area */}
        <div className="flex-1 bg-gray-50 overflow-hidden flex items-center justify-center relative">
          {generatedImages.length === 0 ? (
            // Empty State
            <div className="text-center max-w-2xl px-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
                <ImageIcon className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">
                Google Imagen 3.0
              </h2>
              <p className="text-content-faint font-medium text-lg mb-8">
                Create photorealistic images with Google's most advanced image generation AI
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white border-2 border-blue-200 rounded-2xl">
                  <p className="text-xs font-bold text-blue-600 mb-1">STEP 1</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Write Prompt</p>
                  <p className="text-xs text-content-faint">Describe your vision</p>
                </div>
                <div className="p-4 bg-white border-2 border-blue-200 rounded-2xl">
                  <p className="text-xs font-bold text-blue-600 mb-1">STEP 2</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Configure</p>
                  <p className="text-xs text-content-faint">Choose settings</p>
                </div>
                <div className="p-4 bg-white border-2 border-blue-200 rounded-2xl">
                  <p className="text-xs font-bold text-blue-600 mb-1">STEP 3</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Generate</p>
                  <p className="text-xs text-content-faint">Get stunning results</p>
                </div>
              </div>
            </div>
          ) : (
            // Gallery
            <div className="w-full h-full overflow-y-auto p-8">
              <div className="grid grid-cols-2 gap-6">
                {generatedImages.map((image, index) => (
                  <div key={index} className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all">
                    <img src={image} alt={`Generated ${index + 1}`} className="w-full h-auto" />
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
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                        : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                    }`}
                  >
                    All ({generatedImages.length})
                  </button>
                </div>

                {/* Gallery Grid */}
                {showGallery && generatedImages.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-content-muted uppercase tracking-wide">
                      GENERATED IMAGES
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {generatedImages.map((image, index) => (
                        <div
                          key={index}
                          className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        >
                          <img
                            src={image}
                            alt={`Generated ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
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
                {generatedImages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-8 h-8 text-content-secondary" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">No Images Yet</p>
                    <p className="text-xs text-content-muted">
                      Generated images will appear here
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
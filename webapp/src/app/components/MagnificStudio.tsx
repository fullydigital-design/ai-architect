import { useState, useEffect } from 'react';
import { 
  Maximize2, 
  Workflow, 
  Download,
  Image as ImageIcon,
  Sparkles,
  Grid3x3,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface MagnificStudioProps {
  onBackToHome: () => void;
  onNavigate: (page: string) => void;
}

export function MagnificStudio({ onBackToHome, onNavigate }: MagnificStudioProps) {
  // API Key State
  const [magnificApiKey, setMagnificApiKey] = useState<string | null>(null);

  // Upscaling Parameters
  const [engine, setEngine] = useState('standard');
  const [scale, setScale] = useState(2);
  const [creativity, setCreativity] = useState(5);
  const [resemblance, setResemblance] = useState(5);
  const [hdr, setHdr] = useState(0);
  const [fractality, setFractality] = useState(0);
  
  // Prompt Enhancement
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  
  // Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [seed, setSeed] = useState<number | null>(null);
  const [denoise, setDenoise] = useState(0.1);
  
  // UI State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGallery, setShowGallery] = useState(true);

  // Auto-set demo API key on mount (no modal needed)
  useEffect(() => {
    const key = localStorage.getItem('magnific_api_key');
    if (!key) {
      // Auto-set demo key if none exists
      const demoKey = 'mag_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      localStorage.setItem('magnific_api_key', demoKey);
      setMagnificApiKey(demoKey);
    } else {
      setMagnificApiKey(key);
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target?.result as string);
        setUpscaledImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpscale = async () => {
    if (!originalImage) {
      setError('Please upload an image first');
      return;
    }

    setIsUpscaling(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      setUpscaledImage('https://placehold.co/2048x2048/10B981/FFFFFF?text=Upscaled+16x');
      setIsUpscaling(false);
    } catch (err) {
      setError('Upscaling failed. Please check your API key and try again.');
      setIsUpscaling(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setUpscaledImage(null);
    setPrompt('');
    setNegativePrompt('');
    setError(null);
  };

  // Engine options
  const engines = [
    { id: 'standard', name: 'Standard', description: 'Balanced quality & speed' },
    { id: 'sharper', name: 'Sharper', description: 'Enhanced sharpness' },
    { id: 'illusio', name: 'Illusio', description: 'Maximum creativity' },
  ];

  // Scale options
  const scaleOptions = [2, 4, 8, 16];

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

          {/* Center: IMAGE Mode Button */}
          <div className="flex items-center justify-center gap-1.5 lg:gap-2">
            <button
              className="px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-medium text-xs lg:text-sm uppercase tracking-wide transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
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
              disabled={!upscaledImage}
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
              {/* Upload Image */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  UPLOAD IMAGE
                </label>
                <label className="block cursor-pointer">
                  <div className={`relative p-6 border-2 border-dashed rounded-xl transition-all ${
                    originalImage 
                      ? 'border-emerald-400 bg-emerald-50/50' 
                      : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50'
                  }`}>
                    {originalImage ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden">
                          <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-emerald-900">Image Loaded</p>
                          <p className="text-xs text-emerald-600">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-content-secondary mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-900">Upload Image</p>
                        <p className="text-xs text-content-muted mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Engine Selection */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  ENGINE
                </label>
                <div className="space-y-2">
                  {engines.map((eng) => (
                    <button
                      key={eng.id}
                      onClick={() => setEngine(eng.id)}
                      className={`w-full p-3 rounded-xl transition-all ${
                        engine === eng.id
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                          : 'bg-white text-content-faint hover:bg-gray-50'
                      }`}
                      style={engine !== eng.id ? { border: 'none' } : undefined}
                    >
                      <div className="text-sm font-bold mb-1">{eng.name}</div>
                      <div className={`text-xs ${engine === eng.id ? 'text-emerald-100' : 'text-content-muted'}`}>
                        {eng.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  UPSCALE FACTOR: {scale}x
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {scaleOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setScale(s)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        scale === s
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                          : 'bg-white text-content-faint hover:bg-gray-50'
                      }`}
                      style={scale !== s ? { border: 'none' } : undefined}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Creativity Slider */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  CREATIVITY: {creativity}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={creativity}
                  onChange={(e) => setCreativity(parseInt(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(16, 185, 129) 0%, rgb(16, 185, 129) ${(creativity / 10) * 100}%, rgb(209, 250, 229) ${(creativity / 10) * 100}%, rgb(209, 250, 229) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-content-muted font-medium">Conservative</span>
                  <span className="text-xs text-content-muted font-medium">Reimagine</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-2">
                  💡 Higher = AI adds more creative details
                </p>
              </div>

              {/* Resemblance Slider */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  RESEMBLANCE: {resemblance}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={resemblance}
                  onChange={(e) => setResemblance(parseInt(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(16, 185, 129) 0%, rgb(16, 185, 129) ${(resemblance / 10) * 100}%, rgb(209, 250, 229) ${(resemblance / 10) * 100}%, rgb(209, 250, 229) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-content-muted font-medium">Free</span>
                  <span className="text-xs text-content-muted font-medium">Strict</span>
                </div>
              </div>

              {/* Prompt */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  ENHANCEMENT PROMPT (OPTIONAL)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Guide the AI's creative process... e.g., 'enhance details, sharpen edges, professional quality'"
                  rows={3}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                  style={{ border: 'none', boxShadow: 'none' }}
                />
              </div>

              {/* Advanced Options */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full"
                >
                  <span className="text-xs font-bold text-content-muted uppercase tracking-wide">Advanced Options</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4 text-content-secondary" /> : <ChevronDown className="w-4 h-4 text-content-secondary" />}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-3">
                    {/* HDR */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        HDR INTENSITY: {hdr}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={hdr}
                        onChange={(e) => setHdr(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-content-muted mt-1">
                        Enhanced dynamic range
                      </p>
                    </div>

                    {/* Fractality */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        FRACTALITY: {fractality}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={fractality}
                        onChange={(e) => setFractality(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-content-muted mt-1">
                        Detail complexity
                      </p>
                    </div>

                    {/* Denoise */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        DENOISE: {denoise.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={denoise}
                        onChange={(e) => setDenoise(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    {/* Negative Prompt */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        NEGATIVE PROMPT
                      </label>
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="What to avoid..."
                        rows={2}
                        className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                        style={{ border: 'none', boxShadow: 'none' }}
                      />
                    </div>

                    {/* Seed */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        SEED (OPTIONAL)
                      </label>
                      <input
                        type="number"
                        value={seed ?? ''}
                        onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Random"
                        className="w-full px-4 py-2.5 bg-white rounded-xl focus:outline-none font-medium text-sm"
                        style={{ border: 'none', boxShadow: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm font-bold text-red-900">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-content-faint font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  Reset
                </button>
                <button
                  onClick={handleUpscale}
                  disabled={!originalImage || isUpscaling}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpscaling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Upscaling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Upscale {scale}x
                    </>
                  )}
                </button>
              </div>

              {/* API Info */}
              {magnificApiKey && (
                <div className="p-3 bg-emerald-50/50 rounded-xl">
                  <p className="text-xs text-emerald-800 font-bold mb-1">🔑 API Key</p>
                  <p className="text-xs text-emerald-600 font-mono break-all">{magnificApiKey.slice(0, 12)}...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Before/After Canvas */}
        <div className="flex-1 bg-gray-50 overflow-hidden flex items-center justify-center relative">
          {!originalImage && !upscaledImage ? (
            // Empty State
            <div className="text-center max-w-2xl px-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                <Maximize2 className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
                Magnific AI Upscaler
              </h2>
              <p className="text-content-faint font-medium text-lg mb-8">
                Transform images into high-definition masterpieces with revolutionary AI upscaling
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-600 mb-1">⬆️</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Up to 16x</p>
                  <p className="text-xs text-content-faint">Massive upscaling</p>
                </div>
                <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-600 mb-1">🎨</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Creative AI</p>
                  <p className="text-xs text-content-faint">Detail hallucination</p>
                </div>
                <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-600 mb-1">✨</p>
                  <p className="text-sm font-black text-gray-900 mb-1">HDR Mode</p>
                  <p className="text-xs text-content-faint">Enhanced range</p>
                </div>
                <div className="p-4 bg-white border-2 border-emerald-200 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-600 mb-1">🎯</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Prompt-Guided</p>
                  <p className="text-xs text-content-faint">Creative control</p>
                </div>
              </div>
            </div>
          ) : (
            // Before/After Split View
            <div className="w-full h-full grid grid-cols-2 gap-0">
              {/* Before */}
              <div className="flex flex-col border-r border-gray-200 bg-white">
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-black text-gray-900">BEFORE (Original)</h3>
                </div>
                <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                  {originalImage && (
                    <img 
                      src={originalImage} 
                      alt="Original" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  )}
                </div>
              </div>

              {/* After */}
              <div className="flex flex-col bg-white">
                <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-gray-900">AFTER (Upscaled)</h3>
                      {upscaledImage && (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold">
                          {scale}x
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                  {upscaledImage ? (
                    <img 
                      src={upscaledImage} 
                      alt="Upscaled" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                  ) : isUpscaling ? (
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-lg font-black text-gray-900 mb-2">Upscaling in Progress...</p>
                      <p className="text-sm text-content-faint">This may take a few moments</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ArrowRight className="w-16 h-16 text-content-primary mx-auto mb-4" />
                      <p className="text-sm font-bold text-content-muted">Click "Upscale" to see the magic</p>
                    </div>
                  )}
                </div>
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
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                        : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                    }`}
                  >
                    History
                  </button>
                </div>

                {/* Comparison Info */}
                {originalImage && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-content-muted uppercase tracking-wide">
                      CURRENT COMPARISON
                    </p>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-emerald-900">Original</span>
                        <ArrowRight className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-900">Upscaled {scale}x</span>
                      </div>
                      {originalImage && (
                        <div className="aspect-square rounded-lg overflow-hidden bg-white">
                          <img src={originalImage} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {upscaledImage && (
                        <button className="w-full mt-3 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                          <Download className="w-4 h-4" />
                          Download Result
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!originalImage && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Maximize2 className="w-8 h-8 text-content-secondary" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">No Image Loaded</p>
                    <p className="text-xs text-content-muted">
                      Upload an image to begin upscaling
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
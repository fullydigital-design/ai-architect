import { useState } from 'react';
import { Sparkles, Upload, Download, ChevronDown, ChevronUp, ArrowRight, Maximize2 } from 'lucide-react';

interface MagnificUpscaleTabProps {
  apiKey: string;
}

export function MagnificUpscaleTab({ apiKey }: MagnificUpscaleTabProps) {
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

  // Engine options
  const engines = [
    { id: 'standard', name: 'Standard', description: 'Balanced quality & speed' },
    { id: 'sharper', name: 'Sharper', description: 'Enhanced sharpness' },
    { id: 'illusio', name: 'Illusio', description: 'Maximum creativity' },
  ];

  // Scale options
  const scaleOptions = [2, 4, 8, 16];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target?.result as string);
        setUpscaledImage(null); // Clear previous result
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
      // Mock upscaling - replace with actual Magnific API call
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // For demo, use placeholder (in production, this would be the actual upscaled image)
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

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-50">
      {/* Top Control Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">AI Upscaler & Enhancer</h2>
            <p className="text-xs text-content-muted font-medium">Transform images with revolutionary AI</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-sm font-bold text-content-faint bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleUpscale}
              disabled={isUpscaling || !originalImage}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isUpscaling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Controls */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Upload Image */}
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Upload Image
              </label>
              <label className="block cursor-pointer">
                <div className={`relative p-8 border-2 border-dashed rounded-2xl transition-all ${
                  originalImage 
                    ? 'border-emerald-400 bg-emerald-50' 
                    : 'border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50'
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
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Engine
              </label>
              <div className="space-y-2">
                {engines.map((eng) => (
                  <button
                    key={eng.id}
                    onClick={() => setEngine(eng.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      engine === eng.id
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-sm font-black mb-1">{eng.name}</div>
                    <div className={`text-xs ${engine === eng.id ? 'text-emerald-100' : 'text-content-muted'}`}>
                      {eng.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scale */}
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Upscale Factor: {scale}x
              </label>
              <div className="grid grid-cols-4 gap-2">
                {scaleOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                      scale === s
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Creativity Slider */}
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Creativity: {creativity}
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={creativity}
                onChange={(e) => setCreativity(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>Conservative</span>
                <span>Reimagine</span>
              </div>
              <p className="text-xs text-content-muted font-medium mt-2">
                Higher = AI adds more creative details
              </p>
            </div>

            {/* Resemblance Slider */}
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Resemblance: {resemblance}
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={resemblance}
                onChange={(e) => setResemblance(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>Free</span>
                <span>Strict</span>
              </div>
              <p className="text-xs text-content-muted font-medium mt-2">
                How closely to match original structure
              </p>
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Enhancement Prompt (Optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Guide the AI's creative process... e.g., 'enhance details, sharpen edges, professional quality'"
                className="w-full h-20 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 resize-none font-medium text-sm"
              />
            </div>

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-bold text-gray-900">Advanced Options</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
                  {/* HDR */}
                  <div>
                    <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                      HDR Intensity: {hdr}
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
                    <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                      Fractality: {fractality}
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
                    <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                      Denoise: {denoise.toFixed(1)}
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
                    <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                      Negative Prompt
                    </label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="What to avoid..."
                      className="w-full h-16 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 resize-none font-medium text-sm"
                    />
                  </div>

                  {/* Seed */}
                  <div>
                    <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                      Seed (Optional)
                    </label>
                    <input
                      type="number"
                      value={seed ?? ''}
                      onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Random"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 font-medium text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <p className="text-sm text-red-600 font-bold">{error}</p>
              </div>
            )}

            {/* API Info */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
              <p className="text-xs text-emerald-800 font-bold mb-1">🔑 Using Magnific AI</p>
              <p className="text-xs text-emerald-600">Key: {apiKey.slice(0, 12)}...</p>
              <p className="text-xs text-emerald-600 mt-1">Engine: {engines.find(e => e.id === engine)?.name}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Before/After Comparison */}
        <div className="flex-1 flex flex-col">
          {!originalImage && !upscaledImage ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                  <Maximize2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Ready to Upscale
                </h3>
                <p className="text-content-faint font-medium mb-6">
                  Upload an image and let Magnific AI transform it into a high-definition masterpiece
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                    <p className="font-bold text-emerald-600 mb-1">⬆️ Up to 16x</p>
                    <p className="text-content-faint">Massive upscaling</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                    <p className="font-bold text-emerald-600 mb-1">🎨 Creative AI</p>
                    <p className="text-content-faint">Detail hallucination</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                    <p className="font-bold text-emerald-600 mb-1">✨ HDR Mode</p>
                    <p className="text-content-faint">Enhanced range</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                    <p className="font-bold text-emerald-600 mb-1">🎯 Prompt-Guided</p>
                    <p className="text-content-faint">Creative control</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 gap-0">
              {/* Before */}
              <div className="flex flex-col border-r border-gray-200 bg-white">
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-900">BEFORE (Original)</h3>
                    {originalImage && (
                      <span className="text-xs font-bold text-content-muted">
                        Original Resolution
                      </span>
                    )}
                  </div>
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
                    {upscaledImage && (
                      <button className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors">
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    )}
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
      </div>
    </div>
  );
}

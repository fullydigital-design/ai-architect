import { useState, useEffect } from 'react';
import { 
  Layers, 
  Workflow, 
  Download,
  Image as ImageIcon,
  Sparkles,
  Grid3x3,
  X,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  FileJson
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ComfyUIStudioProps {
  onBackToHome: () => void;
  onNavigate: (page: string) => void;
}

export function ComfyUIStudio({ onBackToHome, onNavigate }: ComfyUIStudioProps) {
  // API URL State
  const [comfyUIApiUrl, setComfyUIApiUrl] = useState<string | null>(null);

  // Workflow selection
  const [selectedWorkflow, setSelectedWorkflow] = useState('txt2img');
  
  // Common parameters
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  
  // Model settings
  const [checkpointModel, setCheckpointModel] = useState('sd_xl_base_1.0.safetensors');
  const [vae, setVAE] = useState('sdxl_vae.safetensors');
  const [sampler, setSampler] = useState('euler_ancestral');
  const [scheduler, setScheduler] = useState('normal');
  
  // Generation parameters
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7.0);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [batchSize, setBatchSize] = useState(1);
  const [seed, setSeed] = useState<number | null>(null);
  
  // LoRA settings
  const [enableLora, setEnableLora] = useState(false);
  const [loraModel, setLoraModel] = useState('');
  const [loraStrength, setLoraStrength] = useState(0.7);
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customWorkflowJSON, setCustomWorkflowJSON] = useState<string>('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGallery, setShowGallery] = useState(true);

  // Auto-set demo API URL on mount (no modal needed)
  useEffect(() => {
    const url = localStorage.getItem('comfyui_api_url');
    if (!url) {
      // Auto-set demo URL if none exists
      const demoUrl = 'http://127.0.0.1:8188';
      localStorage.setItem('comfyui_api_url', demoUrl);
      setComfyUIApiUrl(demoUrl);
    } else {
      setComfyUIApiUrl(url);
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() && selectedWorkflow !== 'custom') {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 4000));
      const mockImage = 'https://placehold.co/1024x1024/6366F1/FFFFFF?text=ComfyUI+Generated';
      setGeneratedImages(prev => [mockImage, ...prev]);
      setIsGenerating(false);
    } catch (err) {
      setError('Generation failed. Check if ComfyUI server is running.');
      setIsGenerating(false);
    }
  };

  const handleUploadWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          setCustomWorkflowJSON(json);
          setSelectedWorkflow('custom');
        } catch (err) {
          setError('Invalid workflow JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  // Preset workflows
  const workflows = [
    { id: 'txt2img', name: 'Text to Image' },
    { id: 'img2img', name: 'Image to Image' },
    { id: 'controlnet', name: 'ControlNet' },
    { id: 'inpainting', name: 'Inpainting' },
    { id: 'upscale', name: 'Upscale' },
    { id: 'custom', name: 'Custom JSON' },
  ];

  // Sampler options
  const samplers = [
    'euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpm_2_ancestral',
    'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral',
    'dpmpp_sde', 'dpmpp_2m', 'ddim', 'uni_pc'
  ];

  // Scheduler options
  const schedulers = ['normal', 'karras', 'exponential', 'simple'];

  // Resolution presets
  const resolutionPresets = [
    { name: '1:1', width: 1024, height: 1024 },
    { name: '16:9', width: 1344, height: 768 },
    { name: '9:16', width: 768, height: 1344 },
    { name: '4:3', width: 1152, height: 896 },
    { name: '3:4', width: 896, height: 1152 },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 flex flex-col overflow-hidden">
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
              className="px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-medium text-xs lg:text-sm uppercase tracking-wide transition-all bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
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
              {/* Workflow Type Selection */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  WORKFLOW TYPE
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {workflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => setSelectedWorkflow(workflow.id)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        selectedWorkflow === workflow.id
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                          : 'bg-white text-content-faint hover:bg-gray-50'
                      }`}
                      style={selectedWorkflow !== workflow.id ? { border: 'none' } : undefined}
                    >
                      {workflow.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Workflow Upload */}
              {selectedWorkflow === 'custom' && (
                <div className="bg-purple-50/50 rounded-2xl p-4">
                  <label className="block cursor-pointer">
                    <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-purple-300 rounded-xl hover:bg-purple-100/50 transition-colors">
                      <Upload className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-bold text-purple-600">Upload Workflow JSON</span>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadWorkflow}
                      className="hidden"
                    />
                  </label>
                  {customWorkflowJSON && (
                    <div className="mt-2 p-2 bg-white rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <FileJson className="w-4 h-4" />
                        <span className="font-bold">Workflow loaded ✓</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checkpoint Model */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  CHECKPOINT MODEL
                </label>
                <select
                  value={checkpointModel}
                  onChange={(e) => setCheckpointModel(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                  style={{ border: 'none', boxShadow: 'none' }}
                >
                  <option value="sd_xl_base_1.0.safetensors">SDXL Base 1.0</option>
                  <option value="sd_xl_refiner_1.0.safetensors">SDXL Refiner 1.0</option>
                  <option value="v1-5-pruned-emaonly.safetensors">SD 1.5</option>
                  <option value="dreamshaper_8.safetensors">DreamShaper 8</option>
                  <option value="realisticVisionV51_v51VAE.safetensors">Realistic Vision V5.1</option>
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
                  placeholder="A professional advertising photo of a product on white background, studio lighting, ultra detailed"
                  rows={4}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                  style={{ border: 'none', boxShadow: 'none' }}
                />
                <p className="mt-2 text-xs text-indigo-600 font-medium flex items-start gap-1">
                  <span>💡</span>
                  <span>ComfyUI gives you complete control with node-based workflows</span>
                </p>
              </div>

              {/* Negative Prompt */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  NEGATIVE PROMPT
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="low quality, blurry, distorted, watermark"
                  rows={2}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                  style={{ border: 'none', boxShadow: 'none' }}
                />
              </div>

              {/* Resolution */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  RESOLUTION
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {resolutionPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setWidth(preset.width);
                        setHeight(preset.height);
                      }}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        width === preset.width && height === preset.height
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                          : 'bg-white text-content-faint hover:bg-gray-50'
                      }`}
                      style={width !== preset.width || height !== preset.height ? { border: 'none' } : undefined}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-content-muted font-bold mb-1">Width</label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white rounded-xl text-sm font-medium"
                      style={{ border: 'none' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-content-muted font-bold mb-1">Height</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white rounded-xl text-sm font-medium"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sampler & Scheduler */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                      SAMPLER
                    </label>
                    <select
                      value={sampler}
                      onChange={(e) => setSampler(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                      style={{ border: 'none', boxShadow: 'none' }}
                    >
                      {samplers.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                      SCHEDULER
                    </label>
                    <select
                      value={scheduler}
                      onChange={(e) => setScheduler(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                      style={{ border: 'none', boxShadow: 'none' }}
                    >
                      {schedulers.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Steps & CFG Scale */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                      STEPS: {steps}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="150"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value))}
                      className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${(steps / 150) * 100}%, rgb(224, 231, 255) ${(steps / 150) * 100}%, rgb(224, 231, 255) 100%)`
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-content-muted font-medium">1</span>
                      <span className="text-xs text-content-muted font-medium">150</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                      CFG: {cfgScale.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="0.5"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${(cfgScale / 30) * 100}%, rgb(224, 231, 255) ${(cfgScale / 30) * 100}%, rgb(224, 231, 255) 100%)`
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-content-muted font-medium">1</span>
                      <span className="text-xs text-content-muted font-medium">30</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LoRA Toggle */}
              <div className="bg-indigo-50/50 rounded-2xl p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-content-muted uppercase tracking-wide mb-1">
                      ENABLE LORA
                    </div>
                    <p className="text-xs text-content-muted font-medium">
                      Custom style adapters
                    </p>
                  </div>
                  <button
                    onClick={() => setEnableLora(!enableLora)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      enableLora ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        enableLora ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
                {enableLora && (
                  <div className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={loraModel}
                      onChange={(e) => setLoraModel(e.target.value)}
                      placeholder="LoRA model name..."
                      className="w-full px-3 py-2 bg-white rounded-xl text-sm font-medium"
                      style={{ border: 'none' }}
                    />
                    <div>
                      <label className="block text-xs font-bold text-content-muted mb-1">
                        Strength: {loraStrength.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={loraStrength}
                        onChange={(e) => setLoraStrength(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
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
                    {/* VAE */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        VAE MODEL
                      </label>
                      <select
                        value={vae}
                        onChange={(e) => setVAE(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                        style={{ border: 'none', boxShadow: 'none' }}
                      >
                        <option value="sdxl_vae.safetensors">SDXL VAE</option>
                        <option value="vae-ft-mse-840000-ema-pruned.safetensors">VAE MSE</option>
                      </select>
                    </div>

                    {/* Batch Size */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        BATCH SIZE: {batchSize}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value))}
                        className="w-full"
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

                    {/* Denoising Strength (for img2img) */}
                    {selectedWorkflow === 'img2img' && (
                      <div>
                        <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                          DENOISING: {denoisingStrength.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={denoisingStrength}
                          onChange={(e) => setDenoisingStrength(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
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
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-base hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

              {/* Server Info */}
              {comfyUIApiUrl && (
                <div className="p-3 bg-indigo-50/50 rounded-xl">
                  <p className="text-xs text-indigo-800 font-bold mb-1">🔌 Server</p>
                  <p className="text-xs text-indigo-600 font-mono break-all">{comfyUIApiUrl}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Canvas/Gallery Area */}
        <div className="flex-1 bg-gray-50 overflow-hidden flex items-center justify-center relative">
          {generatedImages.length === 0 ? (
            // Empty State
            <div className="text-center max-w-2xl px-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
                <Layers className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Node-Based Workflows
              </h2>
              <p className="text-content-faint font-medium text-lg mb-8">
                Complete control over AI generation with ComfyUI's powerful node-based system
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white border-2 border-indigo-200 rounded-2xl">
                  <p className="text-xs font-bold text-indigo-600 mb-1">STEP 1</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Choose Workflow</p>
                  <p className="text-xs text-content-faint">Select preset or custom</p>
                </div>
                <div className="p-4 bg-white border-2 border-indigo-200 rounded-2xl">
                  <p className="text-xs font-bold text-indigo-600 mb-1">STEP 2</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Configure</p>
                  <p className="text-xs text-content-faint">Fine-tune parameters</p>
                </div>
                <div className="p-4 bg-white border-2 border-indigo-200 rounded-2xl">
                  <p className="text-xs font-bold text-indigo-600 mb-1">STEP 3</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Generate</p>
                  <p className="text-xs text-content-faint">Advanced AI results</p>
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
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
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
                          className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
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
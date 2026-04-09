import { useState } from 'react';
import { Sparkles, Download, Copy, Trash2, ChevronDown, ChevronUp, Upload, FileJson } from 'lucide-react';

interface ComfyUIWorkflowTabProps {
  apiUrl: string;
}

export function ComfyUIWorkflowTab({ apiUrl }: ComfyUIWorkflowTabProps) {
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
  
  // ControlNet settings
  const [enableControlNet, setEnableControlNet] = useState(false);
  const [controlNetModel, setControlNetModel] = useState('control_sd15_canny.pth');
  const [controlNetStrength, setControlNetStrength] = useState(1.0);
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customWorkflowJSON, setCustomWorkflowJSON] = useState<string>('');

  // Preset workflows
  const workflows = [
    { id: 'txt2img', name: 'Text to Image', description: 'Generate images from text prompts' },
    { id: 'img2img', name: 'Image to Image', description: 'Transform existing images' },
    { id: 'controlnet', name: 'ControlNet', description: 'Precise pose/edge control' },
    { id: 'inpainting', name: 'Inpainting', description: 'Edit specific image areas' },
    { id: 'upscale', name: 'Upscale', description: 'Enhance image resolution' },
    { id: 'custom', name: 'Custom Workflow', description: 'Load your own workflow JSON' },
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

  const handleGenerate = async () => {
    if (!prompt.trim() && selectedWorkflow !== 'custom') {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Mock generation - in production, call real ComfyUI API
      const mockGeneratedImage = 'https://placehold.co/1024x1024/6366F1/FFFFFF?text=ComfyUI+Generated';
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      setGeneratedImages(prev => [mockGeneratedImage, ...prev]);
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

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left Sidebar - Controls */}
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">Workflow Studio</h2>
            <p className="text-sm text-content-muted font-medium">Node-Based AI Generation</p>
          </div>

          {/* Workflow Type Selection */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Workflow Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {workflows.map((workflow) => (
                <button
                  key={workflow.id}
                  onClick={() => setSelectedWorkflow(workflow.id)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    selectedWorkflow === workflow.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                  }`}
                >
                  <div className="text-xs font-black mb-1">{workflow.name}</div>
                  <div className={`text-xs ${selectedWorkflow === workflow.id ? 'text-indigo-100' : 'text-content-muted'}`}>
                    {workflow.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Workflow Upload */}
          {selectedWorkflow === 'custom' && (
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <label className="block cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100 transition-colors">
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
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Checkpoint Model
            </label>
            <select
              value={checkpointModel}
              onChange={(e) => setCheckpointModel(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 font-medium text-sm"
            >
              <option value="sd_xl_base_1.0.safetensors">SDXL Base 1.0</option>
              <option value="sd_xl_refiner_1.0.safetensors">SDXL Refiner 1.0</option>
              <option value="v1-5-pruned-emaonly.safetensors">SD 1.5</option>
              <option value="dreamshaper_8.safetensors">DreamShaper 8</option>
              <option value="realisticVisionV51_v51VAE.safetensors">Realistic Vision V5.1</option>
            </select>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A professional advertising photo of a product..."
              className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none font-medium text-sm"
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
              placeholder="low quality, blurry, distorted..."
              className="w-full h-20 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none font-medium text-sm"
            />
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Resolution
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {resolutionPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setWidth(preset.width);
                    setHeight(preset.height);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    width === preset.width && height === preset.height
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                      : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-content-faint font-bold mb-1">Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs text-content-faint font-bold mb-1">Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Sampler & Scheduler */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Sampler
              </label>
              <select
                value={sampler}
                onChange={(e) => setSampler(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 font-medium text-sm"
              >
                {samplers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Scheduler
              </label>
              <select
                value={scheduler}
                onChange={(e) => setScheduler(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 font-medium text-sm"
              >
                {schedulers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Steps & CFG Scale */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                Steps: {steps}
              </label>
              <input
                type="range"
                min="1"
                max="150"
                value={steps}
                onChange={(e) => setSteps(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>1</span>
                <span>150</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                CFG Scale: {cfgScale.toFixed(1)}
              </label>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={cfgScale}
                onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>1</span>
                <span>30</span>
              </div>
            </div>
          </div>

          {/* LoRA Toggle */}
          <div className="border-2 border-indigo-200 rounded-2xl p-4 bg-indigo-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900">✨ Enable LoRA</h3>
                <p className="text-xs text-content-faint font-medium">Custom style adapters</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableLora}
                  onChange={(e) => setEnableLora(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            {enableLora && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={loraModel}
                  onChange={(e) => setLoraModel(e.target.value)}
                  placeholder="LoRA model name..."
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg text-sm font-medium"
                />
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-1">
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
                {/* VAE */}
                <div>
                  <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                    VAE Model
                  </label>
                  <select
                    value={vae}
                    onChange={(e) => setVAE(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 font-medium text-sm"
                  >
                    <option value="sdxl_vae.safetensors">SDXL VAE</option>
                    <option value="vae-ft-mse-840000-ema-pruned.safetensors">VAE MSE</option>
                  </select>
                </div>

                {/* Batch Size */}
                <div>
                  <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                    Batch Size: {batchSize}
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
                  <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                    Seed (Optional)
                  </label>
                  <input
                    type="number"
                    value={seed ?? ''}
                    onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Random"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 font-medium text-sm"
                  />
                </div>

                {/* Denoising Strength (for img2img) */}
                {selectedWorkflow === 'img2img' && (
                  <div>
                    <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                      Denoising: {denoisingStrength.toFixed(2)}
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

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-600 font-bold">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && selectedWorkflow !== 'custom')}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-sm uppercase tracking-wider hover:shadow-2xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate with ComfyUI
              </>
            )}
          </button>

          {/* Server Info */}
          <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
            <p className="text-xs text-indigo-800 font-bold mb-1">🔌 Connected Server</p>
            <p className="text-xs text-indigo-600 font-mono break-all">{apiUrl}</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-8">
          {generatedImages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="text-center">
                <Sparkles className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Ready to Generate
                </h3>
                <p className="text-content-faint font-medium max-w-md">
                  Configure your workflow settings and click Generate to create AI images with ComfyUI
                </p>
                <p className="text-sm text-indigo-600 font-bold mt-4">
                  🎨 Complete control with node-based workflows
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {generatedImages.map((image, index) => (
                <div key={index} className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all">
                  <img src={image} alt={`Generated ${index + 1}`} className="w-full h-auto" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-white/90 hover:bg-white rounded-lg text-sm font-bold text-gray-900 flex items-center justify-center gap-2 transition-colors">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button className="px-4 py-2 bg-white/90 hover:bg-white rounded-lg text-sm font-bold text-gray-900 transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="px-4 py-2 bg-red-500/90 hover:bg-red-500 rounded-lg text-sm font-bold text-white transition-colors">
                        <Trash2 className="w-4 h-4" />
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

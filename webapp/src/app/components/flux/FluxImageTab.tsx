import { useState } from 'react';
import { Sparkles, Download, Copy, Trash2 } from 'lucide-react';
import { 
  ControlsTemplate, 
  SectionCard, 
  Label, 
  SelectField,
  TextareaField,
  ButtonGrid,
  GenerateButton,
  HelperText
} from '@/app/components/studio/ControlsTemplate';

interface FluxImageTabProps {
  apiKey: string;
}

export function FluxImageTab({ apiKey }: FluxImageTabProps) {
  // Flux Pro parameters
  const [model, setModel] = useState('flux-pro');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numImages, setNumImages] = useState(1);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Model options
  const modelOptions = [
    { value: 'flux-pro', label: 'Flux.1 Pro (Highest Quality)' },
    { value: 'flux-dev', label: 'Flux.1 Dev (Balanced)' },
    { value: 'flux-schnell', label: 'Flux Schnell (Ultra-Fast)' },
  ];

  // Aspect ratio options
  const aspectRatioOptions = [
    { value: '1:1', label: '1:1' },
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '21:9', label: '21:9' },
    { value: '4:5', label: '4:5' },
    { value: '5:4', label: '5:4' },
  ];

  // Number of images options
  const numImagesOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      const mockImage = 'https://placehold.co/1024x1024/FF6B35/FFFFFF?text=Flux+Pro+Generated';
      setGeneratedImages(prev => [mockImage, ...prev]);
      setIsGenerating(false);
    } catch (err) {
      setError('Generation failed. Please check your API key.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: CONTROLS - Using Google Template! */}
      <ControlsTemplate>
        {/* Model Selection */}
        <SectionCard>
          <Label>MODEL</Label>
          <SelectField
            value={model}
            onChange={setModel}
            options={modelOptions}
          />
        </SectionCard>

        {/* Prompt */}
        <SectionCard>
          <Label>PROMPT</Label>
          <TextareaField
            value={prompt}
            onChange={setPrompt}
            placeholder="A professional product photo on white background, studio lighting, ultra detailed, 8k resolution"
            rows={4}
          />
          <HelperText emoji="💡">
            Flux excels at rendering text in images! Try "sign that says..."
          </HelperText>
        </SectionCard>

        {/* Aspect Ratio */}
        <SectionCard>
          <Label>ASPECT RATIO</Label>
          <ButtonGrid
            options={aspectRatioOptions}
            selected={aspectRatio}
            onChange={setAspectRatio}
            columns={3}
            gradient="from-orange-500 to-yellow-500"
          />
        </SectionCard>

        {/* Number of Images */}
        <SectionCard>
          <Label>NUMBER OF IMAGES</Label>
          <ButtonGrid
            options={numImagesOptions}
            selected={numImages.toString()}
            onChange={(val) => setNumImages(parseInt(val))}
            columns={4}
            gradient="from-orange-500 to-yellow-500"
          />
        </SectionCard>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm font-bold text-red-900">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <GenerateButton
          onClick={handleGenerate}
          disabled={!prompt.trim()}
          loading={isGenerating}
          text="Generate Image"
          gradient="from-orange-500 to-yellow-500"
        />
      </ControlsTemplate>

      {/* Right: Gallery */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-8">
          {generatedImages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Ready to Generate
                </h3>
                <p className="text-content-faint font-medium max-w-md">
                  Enter your prompt and click Generate to create stunning images with Flux Pro
                </p>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Sparkles, Download, Copy, Trash2, ChevronDown, ChevronUp, Upload } from 'lucide-react';

export function RunwayVideoTab({ apiKey }: { apiKey: string }) {
  const [mode, setMode] = useState('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState('5s');
  const [directorMode, setDirectorMode] = useState(false);
  const [cameraMotion, setCameraMotion] = useState('none');
  const [motionAmount, setMotionAmount] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);

  const modes = [
    { value: 'text-to-video', label: 'Text → Video', icon: '📝' },
    { value: 'image-to-video', label: 'Image → Video', icon: '🖼️' },
  ];

  const aspectRatios = [
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '1:1', label: '1:1' },
  ];

  const cameraMotions = [
    { value: 'none', label: 'None' },
    { value: 'pan-left', label: 'Pan Left' },
    { value: 'pan-right', label: 'Pan Right' },
    { value: 'tilt-up', label: 'Tilt Up' },
    { value: 'tilt-down', label: 'Tilt Down' },
    { value: 'zoom-in', label: 'Zoom In' },
    { value: 'zoom-out', label: 'Zoom Out' },
    { value: 'dolly-forward', label: 'Dolly Forward' },
    { value: 'dolly-back', label: 'Dolly Back' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 5000));
    setGeneratedVideos(prev => ['https://via.placeholder.com/1280x720/10B981/FFFFFF?text=Runway+Gen-3', ...prev]);
    setIsGenerating(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)]">
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">VIDEO Generation</h2>
            <p className="text-sm text-content-muted font-medium">Runway Alpha</p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">Generation Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((m) => (
                <button key={m.value} onClick={() => setMode(m.value)} className={`p-2 rounded-lg text-xs font-bold transition-all ${mode === m.value ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-content-faint hover:bg-gray-200'}`}>
                  <div className="text-lg mb-1">{m.icon}</div>
                  <div>{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {mode === 'image-to-video' && (
            <div>
              <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">Start Frame</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-content-secondary mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-900">Upload Image</p>
                <p className="text-xs text-content-muted font-medium">First frame</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">Video Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Cinematic shot of a futuristic city at sunset, drone camera moving forward..." className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-100 resize-none font-medium text-sm" rows={5} />
          </div>

          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              {aspectRatios.map((ratio) => (
                <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${aspectRatio === ratio.value ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-content-faint hover:bg-gray-200'}`}>
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">Duration</label>
            <div className="grid grid-cols-2 gap-2">
              {['5s', '10s'].map((dur) => (
                <button key={dur} onClick={() => setDuration(dur)} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${duration === dur ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-content-faint hover:bg-gray-200'}`}>
                  {dur}
                </button>
              ))}
            </div>
          </div>

          <div className="border-2 border-green-200 rounded-2xl p-4 bg-green-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-gray-900">🎬 Director Mode</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={directorMode} onChange={(e) => setDirectorMode(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            
            {directorMode && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-2">Camera Motion</label>
                  <select value={cameraMotion} onChange={(e) => setCameraMotion(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-400 text-sm font-medium">
                    {cameraMotions.map((cam) => (
                      <option key={cam.value} value={cam.value}>{cam.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-content-faint mb-1">Motion Amount: {motionAmount}</label>
                  <input type="range" min="1" max="10" value={motionAmount} onChange={(e) => setMotionAmount(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500" />
                  <div className="flex justify-between text-xs text-content-muted font-medium mt-1">
                    <span>Subtle</span>
                    <span>Dynamic</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
            <span className="text-sm font-bold text-gray-900">Advanced Settings</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4 text-content-faint" /> : <ChevronDown className="w-4 h-4 text-content-faint" />}
          </button>

          <button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-lg hover:shadow-2xl hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
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

      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-8">
          {generatedVideos.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Ready to Create</h3>
                <p className="text-content-faint font-medium max-w-md">Configure settings and generate professional videos with Runway</p>
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
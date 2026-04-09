import { useState } from 'react';
import { 
  Mic, 
  Workflow, 
  Download,
  Sparkles,
  Grid3x3,
  X,
  Copy,
  Trash2,
  Play,
  Pause,
  Volume2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ElevenLabsStudioProps {
  onBackToHome: () => void;
  onNavigate: (page: string) => void;
}

interface GeneratedAudio {
  id: string;
  text: string;
  voiceName: string;
  url: string;
  timestamp: Date;
}

export function ElevenLabsStudio({ onBackToHome, onNavigate }: ElevenLabsStudioProps) {
  // Demo mode - API key pre-set
  const [elevenLabsApiKey] = useState<string>('demo_elevenlabs_api_key');
  
  // Voice and Model Settings
  const [selectedVoice, setSelectedVoice] = useState('21m00Tcm4TlvDq8ikWAM'); // Rachel
  const [modelId, setModelId] = useState('eleven_multilingual_v2');
  
  // Text Input
  const [text, setText] = useState('');
  
  // Voice Settings
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [style, setStyle] = useState(0.0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  
  // Output Settings
  const [outputFormat, setOutputFormat] = useState('mp3_44100_128');
  
  // Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGallery, setShowGallery] = useState(true);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter text to convert to speech');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newAudio: GeneratedAudio = {
        id: Date.now().toString(),
        text: text,
        voiceName: presetVoices.find(v => v.id === selectedVoice)?.name || 'Unknown',
        url: '', // Would be actual audio URL from API
        timestamp: new Date(),
      };

      setGeneratedAudios(prev => [newAudio, ...prev]);
      setIsGenerating(false);
    } catch (err) {
      setError('Generation failed. Please check your API key and try again.');
      setIsGenerating(false);
    }
  };

  const handlePlayPause = (audioId: string) => {
    if (playingAudioId === audioId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(audioId);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDelete = (audioId: string) => {
    setGeneratedAudios(prev => prev.filter(audio => audio.id !== audioId));
  };

  const handleSampleScript = (script: string) => {
    setText(script);
  };

  // Preset Voices (ElevenLabs popular voices)
  const presetVoices = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Young, calm American female' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong confident American female' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft expressive American female' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded American male' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp authoritative American male' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep resonant American male' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Dynamic raspy American male' },
    { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Serena', description: 'Pleasant calm British female' },
  ];

  // Model options
  const models = [
    { id: 'eleven_multilingual_v2', name: 'Multilingual v2' },
    { id: 'eleven_turbo_v2', name: 'Turbo v2' },
    { id: 'eleven_monolingual_v1', name: 'English v1' },
  ];

  // Output format options
  const outputFormats = [
    { id: 'mp3_44100_128', name: 'MP3 44.1kHz 128kbps' },
    { id: 'mp3_44100_192', name: 'MP3 44.1kHz 192kbps' },
    { id: 'pcm_44100', name: 'PCM 44.1kHz (CD quality)' },
  ];

  // Sample scripts for different use cases
  const sampleScripts = [
    {
      title: 'Product Commercial',
      text: 'Introducing the revolutionary new product that will change your life. Experience innovation like never before. Available now at select retailers.',
    },
    {
      title: 'Brand Message',
      text: 'At our company, we believe in making a difference. Every day, we work to create products that inspire and empower people around the world.',
    },
    {
      title: 'Call to Action',
      text: 'Don\'t miss out on this limited-time offer. Visit our website today and discover amazing deals. Your journey to excellence starts now.',
    },
    {
      title: 'Podcast Intro',
      text: 'Welcome to the show where we explore the latest trends in technology, business, and innovation. I\'m your host, and today we have an incredible episode lined up.',
    },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/30 flex flex-col overflow-hidden">
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

          {/* Center: AUDIO Mode Button */}
          <div className="flex items-center justify-center gap-1.5 lg:gap-2">
            <button
              className="px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-medium text-xs lg:text-sm uppercase tracking-wide transition-all bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg"
            >
              <Mic className="w-3 h-3 lg:w-4 lg:h-4 inline mr-1" />
              <span className="hidden md:inline">AUDIO</span>
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
              disabled={generatedAudios.length === 0}
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
                  AI MODEL
                </label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                  style={{ border: 'none', boxShadow: 'none' }}
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Selection */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  VOICE SELECTION
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                  style={{ border: 'none', boxShadow: 'none' }}
                >
                  {presetVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sample Scripts */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  SAMPLE SCRIPTS
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {sampleScripts.map((sample, index) => (
                    <button
                      key={index}
                      onClick={() => handleSampleScript(sample.text)}
                      className="p-2.5 rounded-xl bg-white hover:bg-violet-50 text-left transition-colors"
                      style={{ border: 'none' }}
                    >
                      <div className="text-xs font-bold text-gray-900">{sample.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  TEXT TO CONVERT
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want to convert to speech..."
                  rows={6}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                  style={{ border: 'none', boxShadow: 'none' }}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-content-muted font-medium">
                    {text.length} characters
                  </p>
                  <p className="text-xs text-violet-600 font-bold">
                    ~{Math.ceil(text.length / 5)} words
                  </p>
                </div>
              </div>

              {/* Voice Settings */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  STABILITY: {stability.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={stability}
                  onChange={(e) => setStability(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-violet-200 to-purple-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${stability * 100}%, rgb(237, 233, 254) ${stability * 100}%, rgb(237, 233, 254) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-content-muted font-medium">Variable</span>
                  <span className="text-xs text-content-muted font-medium">Stable</span>
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  CLARITY: {similarityBoost.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={similarityBoost}
                  onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-violet-200 to-purple-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${similarityBoost * 100}%, rgb(237, 233, 254) ${similarityBoost * 100}%, rgb(237, 233, 254) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-content-muted font-medium">Low</span>
                  <span className="text-xs text-content-muted font-medium">High</span>
                </div>
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
                    {/* Style Exaggeration */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        STYLE: {style.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={style}
                        onChange={(e) => setStyle(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-content-muted mt-1">
                        Amplifies the voice's natural style
                      </p>
                    </div>

                    {/* Speaker Boost */}
                    <div className="bg-violet-50/50 rounded-xl p-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-content-muted uppercase tracking-wide mb-1">
                            SPEAKER BOOST
                          </div>
                          <p className="text-xs text-content-muted font-medium">
                            Enhances voice quality
                          </p>
                        </div>
                        <button
                          onClick={() => setUseSpeakerBoost(!useSpeakerBoost)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            useSpeakerBoost ? 'bg-gradient-to-r from-violet-500 to-purple-500' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                              useSpeakerBoost ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </label>
                    </div>

                    {/* Output Format */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        OUTPUT FORMAT
                      </label>
                      <select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                        style={{ border: 'none', boxShadow: 'none' }}
                      >
                        {outputFormats.map((format) => (
                          <option key={format.id} value={format.id}>
                            {format.name}
                          </option>
                        ))}
                      </select>
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

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!text.trim() || isGenerating}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-black text-base hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Voice
                  </>
                )}
              </button>

              {/* API Info */}
              {elevenLabsApiKey && (
                <div className="p-3 bg-violet-50/50 rounded-xl">
                  <p className="text-xs text-violet-800 font-bold mb-1">🔑 API Key</p>
                  <p className="text-xs text-violet-600 font-mono break-all">{elevenLabsApiKey.slice(0, 12)}...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Audio Library */}
        <div className="flex-1 bg-gray-50 overflow-hidden flex items-center justify-center relative">
          {generatedAudios.length === 0 ? (
            // Empty State
            <div className="text-center max-w-2xl px-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30">
                <Volume2 className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Professional AI Voiceovers
              </h2>
              <p className="text-content-faint font-medium text-lg mb-8">
                Create natural-sounding voice recordings with ElevenLabs' advanced AI
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border-2 border-violet-200 rounded-2xl">
                  <p className="text-xs font-bold text-violet-600 mb-1">🎙️</p>
                  <p className="text-sm font-black text-gray-900 mb-1">100+ Voices</p>
                  <p className="text-xs text-content-faint">Professional quality</p>
                </div>
                <div className="p-4 bg-white border-2 border-violet-200 rounded-2xl">
                  <p className="text-xs font-bold text-violet-600 mb-1">🌍</p>
                  <p className="text-sm font-black text-gray-900 mb-1">29 Languages</p>
                  <p className="text-xs text-content-faint">Multilingual support</p>
                </div>
                <div className="p-4 bg-white border-2 border-violet-200 rounded-2xl">
                  <p className="text-xs font-bold text-violet-600 mb-1">🎨</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Voice Cloning</p>
                  <p className="text-xs text-content-faint">Custom brand voices</p>
                </div>
                <div className="p-4 bg-white border-2 border-violet-200 rounded-2xl">
                  <p className="text-xs font-bold text-violet-600 mb-1">⚡</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Fast Generation</p>
                  <p className="text-xs text-content-faint">Real-time synthesis</p>
                </div>
              </div>
            </div>
          ) : (
            // Audio Library
            <div className="w-full h-full overflow-y-auto p-8">
              <div className="space-y-4 max-w-4xl mx-auto">
                {generatedAudios.map((audio) => (
                  <div key={audio.id} className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{audio.voiceName}</p>
                          <p className="text-xs text-content-muted">{audio.timestamp.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-content-faint font-medium leading-relaxed mb-4">
                      {audio.text}
                    </p>

                    {/* Audio Player Placeholder */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                      <button
                        onClick={() => handlePlayPause(audio.id)}
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center hover:shadow-lg transition-shadow"
                      >
                        {playingAudioId === audio.id ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 w-0"></div>
                      </div>
                      <span className="text-xs font-mono text-content-muted">0:00</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-violet-50 hover:bg-violet-100 rounded-lg text-sm font-bold text-violet-600 flex items-center justify-center gap-2 transition-colors">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => handleCopyText(audio.text)}
                        className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-bold text-content-faint transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(audio.id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                    }`}
                  >
                    All ({generatedAudios.length})
                  </button>
                </div>

                {/* Audio Gallery */}
                {showGallery && generatedAudios.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-content-muted uppercase tracking-wide">
                      GENERATED AUDIO
                    </p>
                    <div className="space-y-2">
                      {generatedAudios.map((audio) => (
                        <div
                          key={audio.id}
                          className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Volume2 className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900">{audio.voiceName}</p>
                              <p className="text-xs text-content-faint line-clamp-2 mt-1">
                                {audio.text.substring(0, 60)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {generatedAudios.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Volume2 className="w-8 h-8 text-content-secondary" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">No Audio Yet</p>
                    <p className="text-xs text-content-muted">
                      Generated audio will appear here
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
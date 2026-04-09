import { useState } from 'react';
import { Sparkles, Download, Copy, Trash2, ChevronDown, ChevronUp, Play, Pause, Volume2 } from 'lucide-react';

interface ElevenLabsAudioTabProps {
  apiKey: string;
}

interface GeneratedAudio {
  id: string;
  text: string;
  voiceName: string;
  url: string;
  timestamp: Date;
}

export function ElevenLabsAudioTab({ apiKey }: ElevenLabsAudioTabProps) {
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

  // Preset Voices (ElevenLabs popular voices)
  const presetVoices = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Young, calm American female', category: 'Female' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong confident American female', category: 'Female' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft expressive American female', category: 'Female' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded American male', category: 'Male' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp authoritative American male', category: 'Male' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep resonant American male', category: 'Male' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Dynamic raspy American male', category: 'Male' },
    { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Serena', description: 'Pleasant calm British female', category: 'Female' },
  ];

  // Model options
  const models = [
    { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: '29 languages, most versatile' },
    { id: 'eleven_turbo_v2', name: 'Turbo v2', description: 'Fastest, English only' },
    { id: 'eleven_monolingual_v1', name: 'English v1', description: 'Original English model' },
  ];

  // Output format options
  const outputFormats = [
    { id: 'mp3_44100_128', name: 'MP3 44.1kHz 128kbps', description: 'Standard quality' },
    { id: 'mp3_44100_192', name: 'MP3 44.1kHz 192kbps', description: 'High quality' },
    { id: 'pcm_16000', name: 'PCM 16kHz', description: 'Low bandwidth' },
    { id: 'pcm_22050', name: 'PCM 22.05kHz', description: 'Phone quality' },
    { id: 'pcm_24000', name: 'PCM 24kHz', description: 'Podcast quality' },
    { id: 'pcm_44100', name: 'PCM 44.1kHz', description: 'CD quality' },
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

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter text to convert to speech');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Mock generation - replace with actual ElevenLabs API call
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

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left Sidebar - Controls */}
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">AUDIO Generation</h2>
            <p className="text-sm text-content-muted font-medium">Professional AI Voiceovers</p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              AI Model
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 font-medium text-sm"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-content-muted font-medium mt-2">
              {models.find(m => m.id === modelId)?.description}
            </p>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Voice Selection
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 font-medium text-sm"
            >
              {presetVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} - {voice.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-content-muted font-medium mt-2">
              Category: {presetVoices.find(v => v.id === selectedVoice)?.category}
            </p>
          </div>

          {/* Sample Scripts */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Sample Scripts
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sampleScripts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleScript(sample.text)}
                  className="p-2 rounded-lg bg-violet-50 hover:bg-violet-100 border-2 border-violet-200 text-left transition-colors"
                >
                  <div className="text-xs font-bold text-violet-900">{sample.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Text to Convert
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to convert to speech..."
              className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 resize-none font-medium text-sm"
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
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Stability: {stability.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={stability}
              onChange={(e) => setStability(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-content-muted mt-1">
              <span>Variable</span>
              <span>Stable</span>
            </div>
            <p className="text-xs text-content-muted font-medium mt-2">
              Lower = more expressive, Higher = more consistent
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Clarity + Similarity: {similarityBoost.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={similarityBoost}
              onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-content-muted mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
            <p className="text-xs text-content-muted font-medium mt-2">
              Enhances voice clarity and similarity to original
            </p>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-bold text-gray-900">Advanced Settings</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
                {/* Style Exaggeration */}
                <div>
                  <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                    Style Exaggeration: {style.toFixed(2)}
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
                <div className="border-2 border-violet-200 rounded-xl p-3 bg-violet-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Speaker Boost</h3>
                      <p className="text-xs text-content-faint font-medium">Enhances voice quality</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSpeakerBoost}
                        onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                    Output Format
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 font-medium text-sm"
                  >
                    {outputFormats.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-content-muted mt-1">
                    {outputFormats.find(f => f.id === outputFormat)?.description}
                  </p>
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

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-black text-sm uppercase tracking-wider hover:shadow-2xl hover:shadow-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating Audio...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Voice
              </>
            )}
          </button>

          {/* API Info */}
          <div className="p-4 bg-violet-50 border-2 border-violet-200 rounded-xl">
            <p className="text-xs text-violet-800 font-bold mb-1">🔑 Using ElevenLabs API</p>
            <p className="text-xs text-violet-600">Key: {apiKey.slice(0, 12)}...</p>
            <p className="text-xs text-violet-600 mt-1">Model: {modelId}</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Generated Audio Library */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-8">
          {generatedAudios.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                  <Volume2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Ready to Generate
                </h3>
                <p className="text-content-faint font-medium mb-6">
                  Enter your text, select a voice, and click Generate to create professional AI voiceovers
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                    <p className="font-bold text-violet-600 mb-1">🎙️ Professional Voices</p>
                    <p className="text-content-faint">100+ natural voices</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                    <p className="font-bold text-violet-600 mb-1">🌍 29 Languages</p>
                    <p className="text-content-faint">Multilingual support</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                    <p className="font-bold text-violet-600 mb-1">🎨 Voice Cloning</p>
                    <p className="text-content-faint">Custom brand voices</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                    <p className="font-bold text-violet-600 mb-1">⚡ Fast Generation</p>
                    <p className="text-content-faint">Real-time synthesis</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-gray-900 mb-4">Generated Audio Library</h3>
              {generatedAudios.map((audio) => (
                <div key={audio.id} className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{audio.voiceName}</p>
                          <p className="text-xs text-content-muted">{audio.timestamp.toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-content-faint font-medium leading-relaxed mb-4">
                        {audio.text}
                      </p>
                    </div>
                  </div>

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
                    <button className="flex-1 px-4 py-2 bg-violet-50 hover:bg-violet-100 border-2 border-violet-200 rounded-lg text-sm font-bold text-violet-600 flex items-center justify-center gap-2 transition-colors">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleCopyText(audio.text)}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-lg text-sm font-bold text-content-faint transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(audio.id)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-lg text-sm font-bold text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

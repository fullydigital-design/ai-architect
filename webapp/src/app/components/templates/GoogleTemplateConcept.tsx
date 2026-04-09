import { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Workflow, 
  Settings, 
  Download,
  Sparkles,
  Grid3x3,
  X,
  Copy,
  FileText
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface GoogleTemplateConceptProps {
  onBackToHome: () => void;
  onNavigate: (page: string) => void;
}

export function GoogleTemplateConcept({ onBackToHome, onNavigate }: GoogleTemplateConceptProps) {
  // Generation Parameters
  const [model, setModel] = useState('gemini-2.0-flash-exp');
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(8192);

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConcepts, setGeneratedConcepts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockConcept = "🎯 **Campaign Concept: 'Future Forward'**\n\n**Target Audience:** Tech-savvy millennials and Gen Z\n\n**Core Message:** Innovation meets sustainability\n\n**Visual Direction:** Minimalist, vibrant colors, dynamic motion\n\n**Channels:** Social media, digital billboards, influencer partnerships\n\n**Call to Action:** 'Join the Movement'";
      setGeneratedConcepts(prev => [mockConcept, ...prev]);
      setIsGenerating(false);
    } catch (err) {
      setError('Generation failed.');
      setIsGenerating(false);
    }
  };

  const modelOptions = [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex flex-col overflow-hidden">
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

          {/* Center: CONCEPT Mode Button */}
          <div className="flex items-center justify-center gap-1.5 lg:gap-2">
            <button
              className="px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-medium text-xs lg:text-sm uppercase tracking-wide transition-all bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
            >
              <Lightbulb className="w-3 h-3 lg:w-4 lg:h-4 inline mr-1" />
              <span className="hidden md:inline">CONCEPT</span>
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
              disabled={generatedConcepts.length === 0}
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
                  CAMPAIGN BRIEF
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Create a creative campaign concept for a sustainable tech startup launching a new eco-friendly smartphone. Target audience: environmentally conscious millennials."
                  rows={6}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                  style={{ border: 'none', boxShadow: 'none' }}
                />
                <p className="mt-2 text-xs text-purple-600 font-medium flex items-start gap-1">
                  <span>💡</span>
                  <span>Include target audience, key message, and desired outcomes</span>
                </p>
              </div>

              {/* Temperature */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  CREATIVITY LEVEL: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${(temperature / 2) * 100}%, rgb(243, 232, 255) ${(temperature / 2) * 100}%, rgb(243, 232, 255) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-content-muted font-medium">Focused</span>
                  <span className="text-xs text-content-muted font-medium">Creative</span>
                </div>
              </div>

              {/* Max Output Length */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  MAX OUTPUT LENGTH
                </label>
                <select
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                  style={{ border: 'none', boxShadow: 'none' }}
                >
                  <option value={2048}>Short (~500 words)</option>
                  <option value={4096}>Medium (~1000 words)</option>
                  <option value={8192}>Long (~2000 words)</option>
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
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-base hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Concept...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Concept
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Canvas Area */}
        <div className="flex-1 bg-gray-50 overflow-hidden flex items-center justify-center relative">
          {generatedConcepts.length === 0 ? (
            // Empty State
            <div className="text-center max-w-2xl px-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/30">
                <Lightbulb className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                AI-Powered Campaign Strategy
              </h2>
              <p className="text-content-faint font-medium text-lg mb-8">
                Generate creative advertising concepts powered by Google Gemini AI
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white border-2 border-purple-200 rounded-2xl">
                  <p className="text-xs font-bold text-purple-600 mb-1">STEP 1</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Write Brief</p>
                  <p className="text-xs text-content-faint">Describe campaign goals</p>
                </div>
                <div className="p-4 bg-white border-2 border-purple-200 rounded-2xl">
                  <p className="text-xs font-bold text-purple-600 mb-1">STEP 2</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Set Parameters</p>
                  <p className="text-xs text-content-faint">Adjust creativity level</p>
                </div>
                <div className="p-4 bg-white border-2 border-purple-200 rounded-2xl">
                  <p className="text-xs font-bold text-purple-600 mb-1">STEP 3</p>
                  <p className="text-sm font-black text-gray-900 mb-1">Generate</p>
                  <p className="text-xs text-content-faint">Get strategic concepts</p>
                </div>
              </div>
            </div>
          ) : (
            // Concepts Display
            <div className="w-full h-full overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                {generatedConcepts.map((concept, index) => (
                  <div key={index} className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-200">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                        <Copy className="w-4 h-4 text-content-faint" />
                      </button>
                      <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                        <Download className="w-4 h-4 text-content-faint" />
                      </button>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                        {concept}
                      </pre>
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
                {/* Concepts History */}
                {generatedConcepts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-content-muted uppercase tracking-wide">
                      GENERATED CONCEPTS ({generatedConcepts.length})
                    </p>
                    <div className="space-y-2">
                      {generatedConcepts.map((concept, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <FileText className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">Concept #{index + 1}</p>
                              <p className="text-xs text-content-faint line-clamp-2 mt-1">
                                {concept.substring(0, 60)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-8 h-8 text-content-secondary" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">No Concepts Yet</p>
                    <p className="text-xs text-content-muted">
                      Generated concepts will appear here
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

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Workflow,
  Download,
  Sparkles,
  User,
  Bot,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Lightbulb,
  Grid3x3,
  X,
  FileText
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ClaudeStudioProps {
  onBackToHome: () => void;
  onNavigate: (page: string) => void;
}

export function ClaudeStudio({ onBackToHome, onNavigate }: ClaudeStudioProps) {
  // Demo mode - API key pre-set
  const [claudeApiKey] = useState<string>('demo_claude_api_key');

  // Claude API parameters
  const [model, setModel] = useState('claude-3-5-sonnet-20241022');
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [topP, setTopP] = useState(1.0);
  const [topK, setTopK] = useState(0);
  
  // System prompt
  const [systemPrompt, setSystemPrompt] = useState('You are a creative advertising strategist helping to develop compelling ad campaigns.');
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  // UI State
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);
    setError(null);

    try {
      // Mock API call - replace with actual Claude API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: `This is a mock response from Claude ${model}. In production, this would be the actual API response with strategic insights, creative suggestions, and detailed analysis based on your prompt.\n\nThe response would include:\n• Strategic recommendations\n• Creative concepts\n• Data-driven insights\n• Actionable next steps`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsGenerating(false);
    } catch (err) {
      setError('Failed to generate response. Please check your API key.');
      setIsGenerating(false);
    }
  };

  const handlePresetClick = (prompt: string) => {
    setInputMessage(prompt);
    textareaRef.current?.focus();
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Claude model options
  const models = [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ];

  // Preset prompts for advertising
  const presetPrompts = [
    {
      title: 'Campaign Strategy',
      prompt: 'Help me develop a comprehensive advertising campaign strategy for a new product launch. Include target audience analysis, key messaging, and channel recommendations.'
    },
    {
      title: 'Ad Copy Writing',
      prompt: 'Write compelling ad copy for a social media campaign. The copy should be attention-grabbing, benefit-focused, and include a clear call-to-action.'
    },
    {
      title: 'Brand Positioning',
      prompt: 'Analyze and suggest brand positioning strategies that differentiate us from competitors while resonating with our target audience.'
    },
    {
      title: 'Content Ideas',
      prompt: 'Generate 10 creative content ideas for our advertising campaign that would work across multiple platforms (social, video, print).'
    },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 flex flex-col overflow-hidden">
      {/* Header */}
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

          {/* Center: Claude AI Label */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-black text-gray-900">Claude AI</span>
          </div>

          {/* Right: Workflows & Export */}
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
              disabled={messages.length === 0}
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
                  CLAUDE MODEL
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
                  style={{ border: 'none', boxShadow: 'none' }}
                >
                  {models.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset Prompts */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  QUICK START PROMPTS
                </label>
                <div className="space-y-2">
                  {presetPrompts.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handlePresetClick(preset.prompt)}
                      className="w-full p-3 rounded-xl bg-white hover:bg-amber-50 text-left transition-colors"
                      style={{ border: 'none' }}
                    >
                      <div className="text-sm font-bold text-gray-900 mb-1">{preset.title}</div>
                      <div className="text-xs text-content-faint line-clamp-2">{preset.prompt}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* System Prompt */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <button
                  onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                  className="flex items-center justify-between w-full"
                >
                  <span className="text-xs font-bold text-content-muted uppercase tracking-wide">System Prompt</span>
                  {showSystemPrompt ? <ChevronUp className="w-4 h-4 text-content-secondary" /> : <ChevronDown className="w-4 h-4 text-content-secondary" />}
                </button>

                {showSystemPrompt && (
                  <div className="mt-3">
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Define Claude's role and behavior..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
                      style={{ border: 'none', boxShadow: 'none' }}
                    />
                    <p className="text-xs text-content-muted font-medium mt-2">
                      Sets Claude's role and personality
                    </p>
                  </div>
                )}
              </div>

              {/* Temperature */}
              <div className="bg-gray-50/50 rounded-2xl p-4">
                <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
                  CREATIVITY LEVEL: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-amber-200 to-orange-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(245, 158, 11) 0%, rgb(245, 158, 11) ${temperature * 100}%, rgb(254, 243, 199) ${temperature * 100}%, rgb(254, 243, 199) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-content-muted font-medium">Precise</span>
                  <span className="text-xs text-content-muted font-medium">Creative</span>
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
                    {/* Max Tokens */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        MAX TOKENS: {maxTokens}
                      </label>
                      <input
                        type="range"
                        min="256"
                        max="8192"
                        step="256"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-content-muted mt-1">
                        <span>256</span>
                        <span>8192</span>
                      </div>
                    </div>

                    {/* Top P */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        TOP P: {topP.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={topP}
                        onChange={(e) => setTopP(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    {/* Top K */}
                    <div>
                      <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-2">
                        TOP K: {topK === 0 ? 'Disabled' : topK}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={topK}
                        onChange={(e) => setTopK(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Clear Chat */}
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="w-full py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Chat
                </button>
              )}

              {/* API Info */}
              <div className="p-3 bg-amber-50/50 rounded-xl">
                <p className="text-xs text-amber-800 font-bold mb-1">🔑 Demo Mode</p>
                <p className="text-xs text-amber-600 font-mono break-all">{claudeApiKey}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Chat Area */}
        <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col relative">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-2xl px-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30">
                    <MessageSquare className="w-12 h-12 text-white" strokeWidth={2} />
                  </div>
                  <h2 className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-3">
                    AI Strategy Assistant
                  </h2>
                  <p className="text-content-faint font-medium text-lg mb-8">
                    Chat with Claude for campaign strategy, copywriting, and creative brainstorming
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white border-2 border-amber-200 rounded-2xl">
                      <p className="text-xs font-bold text-amber-600 mb-1">💡</p>
                      <p className="text-sm font-black text-gray-900">Strategic Planning</p>
                    </div>
                    <div className="p-4 bg-white border-2 border-amber-200 rounded-2xl">
                      <p className="text-xs font-bold text-amber-600 mb-1">✍️</p>
                      <p className="text-sm font-black text-gray-900">Copywriting</p>
                    </div>
                    <div className="p-4 bg-white border-2 border-amber-200 rounded-2xl">
                      <p className="text-xs font-bold text-amber-600 mb-1">🎯</p>
                      <p className="text-sm font-black text-gray-900">Brand Positioning</p>
                    </div>
                    <div className="p-4 bg-white border-2 border-amber-200 rounded-2xl">
                      <p className="text-xs font-bold text-amber-600 mb-1">🚀</p>
                      <p className="text-sm font-black text-gray-900">Creative Ideas</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-2xl rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : 'bg-white border-2 border-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className={`text-xs font-bold uppercase tracking-wider ${
                          message.role === 'user' ? 'text-amber-100' : 'text-content-muted'
                        }`}>
                          {message.role === 'user' ? 'You' : 'Claude'}
                        </p>
                        <button
                          onClick={() => handleCopyMessage(message.content)}
                          className={`p-1 rounded ${
                            message.role === 'user' ? 'hover:bg-white/20' : 'hover:bg-gray-100'
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                      <p className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-amber-100' : 'text-content-secondary'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center flex-shrink-0 text-sm font-bold text-content-faint">
                        U
                      </div>
                    )}
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="max-w-2xl rounded-2xl p-4 bg-white border-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 pb-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl max-w-4xl mx-auto">
                <p className="text-sm text-red-600 font-bold">{error}</p>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-6">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Claude anything... (Shift+Enter for new line)"
                className="flex-1 px-4 py-3 bg-gray-50 rounded-xl focus:outline-none resize-none font-medium text-sm"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '200px', border: 'none' }}
              />
              <button
                onClick={handleSend}
                disabled={isGenerating || !inputMessage.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
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
                {/* Conversation History */}
                {messages.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-content-muted uppercase tracking-wide">
                      CONVERSATION ({messages.length})
                    </p>
                    <div className="space-y-2">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900">{message.role === 'user' ? 'You' : 'Claude'}</p>
                              <p className="text-xs text-content-faint line-clamp-2 mt-1">
                                {message.content.substring(0, 60)}...
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
                    <p className="text-sm font-bold text-gray-900 mb-1">No Messages Yet</p>
                    <p className="text-xs text-content-muted">
                      Start chatting with Claude
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

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Copy, Download, Trash2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

interface ClaudeConceptTabProps {
  apiKey: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ClaudeConceptTab({ apiKey }: ClaudeConceptTabProps) {
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
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Claude model options
  const models = [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)', description: 'Best balance' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: 'Most powerful' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', description: 'Balanced' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Fastest' },
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

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left Sidebar - Controls */}
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">CONCEPT Studio</h2>
            <p className="text-sm text-content-muted font-medium">Strategic AI Assistant</p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Claude Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 font-medium text-sm"
            >
              {models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-content-muted font-medium mt-2">
              {models.find(m => m.value === model)?.description}
            </p>
          </div>

          {/* Preset Prompts */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Quick Start Prompts
            </label>
            <div className="space-y-2">
              {presetPrompts.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetClick(preset.prompt)}
                  className="w-full p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 text-left transition-colors"
                >
                  <div className="text-sm font-bold text-gray-900 mb-1">{preset.title}</div>
                  <div className="text-xs text-content-faint line-clamp-2">{preset.prompt}</div>
                </button>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <button
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-bold text-gray-900">System Prompt</span>
              {showSystemPrompt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSystemPrompt && (
              <div className="mt-3">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Define Claude's role and behavior..."
                  className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 resize-none font-medium text-sm"
                />
                <p className="text-xs text-content-muted font-medium mt-2">
                  Sets Claude's role, personality, and behavior for this conversation
                </p>
              </div>
            )}
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Temperature: {temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-content-muted mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
            <p className="text-xs text-content-muted font-medium mt-2">
              Higher = more creative, Lower = more focused
            </p>
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
                {/* Max Tokens */}
                <div>
                  <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                    Max Tokens: {maxTokens}
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
                  <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                    Top P: {topP.toFixed(2)}
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
                  <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
                    Top K: {topK === 0 ? 'Disabled' : topK}
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
              className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Chat History
            </button>
          )}

          {/* API Info */}
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <p className="text-xs text-amber-800 font-bold mb-1">🔑 Using Claude API</p>
            <p className="text-xs text-amber-600">Key: {apiKey.slice(0, 12)}...</p>
            <p className="text-xs text-amber-600 mt-1">Model: {model.split('-').slice(0, 3).join(' ')}</p>
          </div>
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Start Your Strategy Session
                </h3>
                <p className="text-content-faint font-medium mb-6">
                  Ask Claude to help with campaign strategy, copywriting, brand positioning, or creative brainstorming
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <p className="font-bold text-gray-900">💡 Strategic Planning</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <p className="font-bold text-gray-900">✍️ Copywriting</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <p className="font-bold text-gray-900">🎯 Brand Positioning</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <p className="font-bold text-gray-900">🚀 Creative Ideas</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 pb-2">
            <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-600 font-bold">{error}</p>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-6">
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Claude anything... (Shift+Enter for new line)"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 resize-none font-medium text-sm"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            <button
              onClick={handleSend}
              disabled={isGenerating || !inputMessage.trim()}
              className="px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-xl hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

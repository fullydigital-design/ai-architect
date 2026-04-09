import { useState } from 'react';
import { X, Mic, ExternalLink } from 'lucide-react';

export function ElevenLabsApiSetup({ onClose, onSave, existingKey }: { onClose: () => void; onSave: (key: string) => void; existingKey: string | null }) {
  const [apiKey, setApiKey] = useState(existingKey || 'elevenlabs_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  const [showKey, setShowKey] = useState(false);
  const isDemoMode = true; // Always in demo mode

  const handleSave = () => {
    // In demo mode, always proceed with fake key
    onSave(apiKey.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-5 rounded-t-3xl flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">ElevenLabs API Setup</h2>
              <p className="text-sm text-violet-100 font-medium">Professional AI Voice Generation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          {/* Demo Mode Banner */}
          {isDemoMode && (
            <div className="mb-6 bg-gradient-to-r from-purple-500 to-fuchsia-600 border-2 border-purple-400 rounded-2xl p-4">
              <div className="flex gap-3">
                <div className="text-2xl">🎭</div>
                <div>
                  <p className="text-sm font-black text-white mb-1">
                    DEMO MODE - UI Preview Only
                  </p>
                  <p className="text-sm text-purple-100 font-medium">
                    This workflow is in demo mode. You can explore the interface, but API functionality is not yet available. The API key field is pre-filled for UI demonstration purposes only.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What is ElevenLabs */}
          <div className="mb-6 p-4 bg-violet-50 border-2 border-violet-200 rounded-xl">
            <h3 className="text-sm font-black text-violet-900 mb-2">🎤 What is ElevenLabs?</h3>
            <p className="text-sm text-violet-700 font-medium leading-relaxed mb-3">
              ElevenLabs is the leading AI voice platform for creating professional voiceovers, dubbing, 
              and speech synthesis. Perfect for advertising voiceovers, podcasts, video narration, 
              and multilingual content with natural-sounding voices.
            </p>
            <a 
              href="https://elevenlabs.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-700"
            >
              Learn more about ElevenLabs
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* API Key Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              ElevenLabs API Key
            </label>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your ElevenLabs API key..."
              disabled={isDemoMode}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-content-muted"
            />
            <p className="text-xs text-content-muted font-medium mt-2">
              {isDemoMode ? '🎭 Demo API key pre-filled for UI preview' : 'Find your API key in the ElevenLabs dashboard under Profile Settings'}
            </p>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-xs text-content-muted font-medium mt-1"
            >
              {showKey ? "Hide Key" : "Show Key"}
            </button>
          </div>

          {/* How to Get API Key */}
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-black text-gray-900">🔑 How to Get Your API Key</h3>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Create ElevenLabs Account</p>
                  <a 
                    href="https://elevenlabs.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                  >
                    elevenlabs.io
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Go to Profile Settings</p>
                  <p className="text-xs text-content-faint font-medium">Click your profile icon → Settings</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Copy Your API Key</p>
                  <p className="text-xs text-content-faint font-medium">Find the API section and copy your key</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Paste Key Above</p>
                  <p className="text-xs text-content-faint font-medium">Your key is stored locally in your browser</p>
                </div>
              </div>
            </div>
          </div>

          {/* ElevenLabs Features */}
          <div className="mb-6 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl">
            <h3 className="text-sm font-black text-violet-900 mb-3">🎙️ What You Can Do</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-violet-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">Text to Speech</span>
                  <p className="text-xs text-content-faint">Convert text to natural-sounding voice</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-violet-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">Voice Library</span>
                  <p className="text-xs text-content-faint">Access 100+ professional voices</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-violet-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">Voice Cloning</span>
                  <p className="text-xs text-content-faint">Create custom branded voices</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-violet-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">Multilingual Support</span>
                  <p className="text-xs text-content-faint">29+ languages available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <h3 className="text-sm font-black text-amber-900 mb-2">💳 Pricing Tiers</h3>
            <p className="text-sm text-amber-700 font-medium leading-relaxed">
              ElevenLabs offers a free tier with 10,000 characters/month. 
              Paid plans start at $5/month for 30,000 characters. 
              Professional and enterprise tiers available with voice cloning and commercial licenses.
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <h3 className="text-sm font-black text-blue-900 mb-2">🔒 Privacy & Security</h3>
            <p className="text-sm text-blue-700 font-medium leading-relaxed">
              Your API key is stored locally in your browser and is never sent to fullydigital.pictures servers. 
              All API calls go directly from your browser to ElevenLabs. 
              You maintain complete control over your voice generation and usage.
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-black text-sm uppercase tracking-wider hover:shadow-2xl hover:shadow-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Save API Key & Start
          </button>
        </div>
      </div>
    </div>
  );
}
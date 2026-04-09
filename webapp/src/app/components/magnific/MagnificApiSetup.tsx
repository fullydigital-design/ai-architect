import { useState } from 'react';
import { X, Maximize2, ExternalLink, AlertCircle, Check } from 'lucide-react';

export function MagnificApiSetup({ onClose, onSave, existingKey }: { onClose: () => void; onSave: (key: string) => void; existingKey: string | null }) {
  const [apiKey, setApiKey] = useState('mag_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  const [showKey, setShowKey] = useState(false);
  const isDemoMode = true; // Always in demo mode

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 rounded-t-3xl flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Maximize2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Magnific AI API Setup</h2>
              <p className="text-sm text-emerald-100 font-medium">Revolutionary Image Upscaler</p>
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

          {/* What is Magnific AI */}
          <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
            <h3 className="text-sm font-black text-emerald-900 mb-2">✨ What is Magnific AI?</h3>
            <p className="text-sm text-emerald-700 font-medium leading-relaxed mb-3">
              Magnific AI is a revolutionary image upscaler that doesn't just enlarge images—it reimagines them with AI. 
              Transform low-resolution images into stunning high-definition masterpieces with creative enhancement, 
              detail hallucination, and intelligent upscaling up to 16x. Perfect for product photography, advertising, and creative work.
            </p>
            <a 
              href="https://magnific.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              Learn more about Magnific AI
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* API Key Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              Magnific AI API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="mag-..."
                disabled={isDemoMode}
                className="w-full px-4 py-3 pr-24 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-content-muted"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-bold text-content-faint hover:text-gray-900 transition-colors"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-content-muted font-medium mt-2">
              {isDemoMode ? '🎭 Demo API key pre-filled for UI preview' : 'Your API key starts with "mag-" and can be found in your Magnific dashboard'}
            </p>
          </div>

          {/* How to Get API Key */}
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-black text-gray-900">🔑 How to Get Your API Key</h3>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Create Magnific Account</p>
                  <a 
                    href="https://magnific.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    magnific.ai
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Navigate to API Settings</p>
                  <p className="text-xs text-content-faint font-medium">Go to Account → API Access</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Generate API Key</p>
                  <p className="text-xs text-content-faint font-medium">Click "Create Key" and copy the generated key</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Paste Key Above</p>
                  <p className="text-xs text-content-faint font-medium">Your key is stored locally in your browser</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="mb-6 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl">
            <h3 className="text-sm font-black text-emerald-900 mb-3">🎨 Revolutionary Features</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">Up to 16x Upscaling</span>
                  <p className="text-xs text-content-faint">Massive resolution increases</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">Creative Reimagining</span>
                  <p className="text-xs text-content-faint">AI hallucinates missing details</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">HDR Processing</span>
                  <p className="text-xs text-content-faint">Enhanced dynamic range</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">Prompt-Guided Enhancement</span>
                  <p className="text-xs text-content-faint">Direct the AI's creativity</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <div>
                  <span className="text-sm font-bold text-gray-900">Multiple Engines</span>
                  <p className="text-xs text-content-faint">Standard, Sharper, Illusio</p>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mb-6 p-4 bg-teal-50 border-2 border-teal-200 rounded-xl">
            <h3 className="text-sm font-black text-teal-900 mb-3">💡 Perfect For</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-start gap-2">
                <span className="text-teal-600 mt-0.5">✓</span>
                <span className="text-xs font-bold text-gray-900">Product Photography</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 mt-0.5">✓</span>
                <span className="text-xs font-bold text-gray-900">Advertising Creative</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 mt-0.5">✓</span>
                <span className="text-xs font-bold text-gray-900">Print Materials</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 mt-0.5">✓</span>
                <span className="text-xs font-bold text-gray-900">Image Restoration</span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-900 mb-1">
                  Your API key stays local
                </p>
                <p className="text-sm text-emerald-700 font-medium">
                  Keys are stored in your browser and never sent to our servers. All API calls go directly from your device to Magnific AI.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={() => {
              if (apiKey.trim()) {
                onSave(apiKey.trim());
              }
            }}
            disabled={!apiKey.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm uppercase tracking-wider hover:shadow-2xl hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Save API Key & Start
          </button>
        </div>
      </div>
    </div>
  );
}
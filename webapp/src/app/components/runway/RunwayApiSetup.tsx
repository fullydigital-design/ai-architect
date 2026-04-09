import { useState } from 'react';
import { X, Film, ExternalLink, Check, AlertCircle } from 'lucide-react';

export function RunwayApiSetup({ onClose, onSave, existingKey }: { onClose: () => void; onSave: (key: string) => void; existingKey: string | null }) {
  const [apiKey, setApiKey] = useState(existingKey || 'runway_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  const [showKey, setShowKey] = useState(false);
  const isDemoMode = true; // Always in demo mode

  const handleSave = () => {
    // In demo mode, always proceed with fake key
    onSave(apiKey.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-5 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Film className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Runway API Setup</h2>
              <p className="text-sm text-green-100 font-medium">Professional Video Generation</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Demo Mode Banner */}
          {isDemoMode && (
            <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 border-2 border-purple-400 rounded-2xl p-4">
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

          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-900 mb-1">Your API key stays local</p>
                <p className="text-sm text-green-700 font-medium">Keys are stored in your browser and never sent to our servers.</p>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-black">1</div>
              <h3 className="text-lg font-black text-gray-900">Get Your API Key</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <a href="https://runwayml.com/api" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-green-300 transition-colors group">
                <div>
                  <p className="text-sm font-bold text-gray-900 group-hover:text-green-600">Runway ML API</p>
                  <p className="text-xs text-content-muted font-medium">Get your Gen-3 Alpha API key</p>
                </div>
                <ExternalLink className="w-4 h-4 text-content-secondary group-hover:text-green-500" />
              </a>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-black">2</div>
              <h3 className="text-lg font-black text-gray-900">Enter Your API Key</h3>
            </div>
            <div className="relative">
              <input 
                type={showKey ? 'text' : 'password'} 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder="runway_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                disabled={isDemoMode}
                className="w-full px-4 py-3 pr-24 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-100 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-content-muted" 
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-bold text-content-faint hover:text-gray-900">{showKey ? 'Hide' : 'Show'}</button>
            </div>
            <p className="text-xs text-content-muted font-medium mt-2">
              {isDemoMode ? '🎭 Demo API key pre-filled for UI preview' : '💡 Check Runway documentation for API key format'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
            <h4 className="text-sm font-black text-gray-900 mb-3">What You Get:</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5" /><span className="text-sm text-content-faint font-medium">Director Mode</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5" /><span className="text-sm text-content-faint font-medium">Cinematic controls</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5" /><span className="text-sm text-content-faint font-medium">10s videos</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5" /><span className="text-sm text-content-faint font-medium">Motion brush</span></div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 text-content-faint font-bold hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={!apiKey.trim()} className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50">Save & Continue</button>
          </div>
        </div>
      </div>
    </div>
  );
}
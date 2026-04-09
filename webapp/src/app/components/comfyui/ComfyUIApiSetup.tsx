import { useState } from 'react';
import { X, Layers, ExternalLink } from 'lucide-react';

export function ComfyUIApiSetup({ onClose, onSave, existingUrl }: { onClose: () => void; onSave: (url: string) => void; existingUrl: string | null }) {
  const [apiUrl, setApiUrl] = useState(existingUrl || 'http://127.0.0.1:8188');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-5 rounded-t-3xl flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">ComfyUI Server Setup</h2>
              <p className="text-sm text-indigo-100 font-medium">Connect to your ComfyUI instance</p>
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
          {/* What is ComfyUI */}
          <div className="mb-6 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
            <h3 className="text-sm font-black text-indigo-900 mb-2">📌 What is ComfyUI?</h3>
            <p className="text-sm text-indigo-700 font-medium leading-relaxed mb-3">
              ComfyUI is a powerful node-based interface for Stable Diffusion that runs locally on your machine. 
              It provides complete control over AI generation pipelines with custom workflows, models, and LoRAs.
            </p>
            <a 
              href="https://github.com/comfyanonymous/ComfyUI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              Learn more about ComfyUI
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Server URL Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-content-faint uppercase tracking-wider mb-2">
              ComfyUI Server URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://127.0.0.1:8188"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 font-mono text-sm"
            />
            <p className="text-xs text-content-muted font-medium mt-2">
              Default: http://127.0.0.1:8188 (for local ComfyUI instance)
            </p>
          </div>

          {/* Quick Setup Guide */}
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-black text-gray-900">⚡ Quick Setup Guide</h3>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Install ComfyUI</p>
                  <p className="text-xs text-content-faint font-medium">Download from GitHub and follow installation instructions</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Start ComfyUI Server</p>
                  <p className="text-xs text-content-faint font-medium">Run: <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">python main.py</code></p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Enable API Access</p>
                  <p className="text-xs text-content-faint font-medium">Make sure ComfyUI is running with API enabled (default port 8188)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Connect fullydigital.pictures</p>
                  <p className="text-xs text-content-faint font-medium">Enter your ComfyUI server URL above and click Save</p>
                </div>
              </div>
            </div>
          </div>

          {/* Remote Server Note */}
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <h3 className="text-sm font-black text-amber-900 mb-2">🌐 Using Remote Server?</h3>
            <p className="text-sm text-amber-700 font-medium leading-relaxed">
              If your ComfyUI is on a remote server, use its IP address and port (e.g., <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">http://192.168.1.100:8188</code>). 
              Make sure CORS is properly configured and the server is accessible from your network.
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={() => {
              if (apiUrl.trim()) {
                onSave(apiUrl.trim());
              }
            }}
            disabled={!apiUrl.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-sm uppercase tracking-wider hover:shadow-2xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}

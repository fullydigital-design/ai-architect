import { useState } from 'react';
import { Zap, Workflow, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { FluxImageTab } from './flux/FluxImageTab';

export function FluxStudio({ onBackToHome, onNavigate }: { onBackToHome: () => void; onNavigate: (page: string) => void }) {
  // Demo mode - no API key needed
  const [fluxApiKey] = useState<string>('demo_flux_api_key');

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex flex-col overflow-hidden">
      {/* Single Header Row - Matching Google Gemini Exactly */}
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

          {/* Center: IMAGE Mode Button + Flux Pro Label */}
          <div className="flex items-center justify-center gap-1.5 lg:gap-2">
            {/* IMAGE Mode Button - Like Google's tabs */}
            <button
              className="px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-medium text-xs lg:text-sm uppercase tracking-wide transition-all bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
            >
              <ImageIcon className="w-3 h-3 lg:w-4 lg:h-4 inline mr-1" />
              <span className="hidden md:inline">IMAGE</span>
            </button>
            
            {/* Flux Pro Label */}
            <div className="hidden lg:flex items-center gap-2 ml-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-black text-gray-900">Flux Pro</span>
            </div>
          </div>

          {/* Right: Workflows Link */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('workflow-selection')}
              className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-400 text-xs lg:text-sm font-bold"
            >
              <Workflow className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1.5" />
              <span className="hidden lg:inline">Workflows</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <FluxImageTab apiKey={fluxApiKey} />
      </main>
    </div>
  );
}
import { Workflow, Settings } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface StudioNavigationProps {
  onNavigateHome: () => void;
  onNavigateWorkflows: () => void;
  onOpenApiSettings: () => void;
  providerName: string;
  providerIcon: React.ReactNode;
  providerGradient: string;
}

export function StudioNavigation({ 
  onNavigateHome, 
  onNavigateWorkflows, 
  onOpenApiSettings,
  providerName,
  providerIcon,
  providerGradient
}: StudioNavigationProps) {
  return (
    <header className="flex-none bg-white/80 backdrop-blur-xl border-b border-gray-200 z-50">
      <div className="px-4 lg:px-6 py-3 grid grid-cols-3 items-center">
        {/* Left: Logo */}
        <div 
          onClick={onNavigateHome}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <span className="text-white font-bold text-sm">WB</span>
          </div>
          <span className="text-gray-900 font-bold text-base lg:text-lg tracking-tight hidden sm:inline">
            WayBetter.ai
          </span>
        </div>

        {/* Center: Provider Name & WORKFLOWS Button */}
        <div className="flex items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateWorkflows}
            className="border-2 border-fuchsia-300 text-fuchsia-700 hover:bg-fuchsia-50 hover:border-fuchsia-400 text-xs lg:text-sm font-black uppercase tracking-wider px-6"
          >
            <Workflow className="w-4 h-4 mr-2" />
            WORKFLOWS
          </Button>
        </div>

        {/* Right: Workflows & API Links */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateWorkflows}
            className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-400 text-xs lg:text-sm font-bold"
          >
            <Workflow className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1.5" />
            <span className="hidden lg:inline">Workflows</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenApiSettings}
            className="border-gray-300 text-content-faint hover:bg-gray-50 text-xs lg:text-sm"
          >
            <Settings className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1.5" />
            <span className="hidden lg:inline">API</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

import { Github, GitMerge, LayoutGrid, Moon, Sun } from 'lucide-react';
import { QueueMonitor } from './QueueMonitor';
import type { Theme } from '../../../hooks/useTheme';

interface AppHeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  comfyuiOnline?: boolean;
  comfyuiUrl?: string;
  wsConnected?: boolean;
  wsQueueRunning?: number;
  wsQueuePending?: number;
  wsExecution?: {
    isRunning: boolean;
    currentNode: string | null;
    progress: { step: number; max: number } | null;
  };
  onOpenTemplateManager?: () => void;
  onOpenWorkflowMerger?: () => void;
}

export function AppHeader({
  theme,
  onToggleTheme,
  comfyuiOnline = false,
  comfyuiUrl,
  wsConnected,
  wsQueueRunning,
  wsQueuePending,
  wsExecution,
  onOpenTemplateManager,
  onOpenWorkflowMerger,
}: AppHeaderProps) {
  const fallbackStatusText = comfyuiOnline ? 'ComfyUI Connected' : 'ComfyUI Offline';
  const fallbackDotClass = comfyuiOnline ? 'bg-status-success' : 'bg-status-error';

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-surface-200 border-b border-border">
      <div className="flex items-center">
        <h1 className="text-sm text-foreground tracking-tight leading-none">
          ComfyUI Workflow <span className="text-primary">Architect</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] text-text-muted hidden sm:block">
          Generate valid ComfyUI workflows from natural language
        </span>
        <button
          onClick={onOpenTemplateManager}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11px] text-content-secondary border border-border-default hover:text-content-primary hover:border-border-strong hover:bg-surface-secondary transition-colors"
          title="Open Template Manager (Ctrl+Shift+T)"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Templates
        </button>
        <button
          onClick={onOpenWorkflowMerger}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11px] text-content-secondary border border-border-default hover:text-content-primary hover:border-border-strong hover:bg-surface-secondary transition-colors"
          title="Open Workflow Merger (Ctrl+Shift+M)"
        >
          <GitMerge className="w-3.5 h-3.5" />
          Merge
        </button>
        {comfyuiUrl ? (
          <QueueMonitor
            comfyuiUrl={comfyuiUrl}
            compact
            pollInterval={3000}
            wsConnected={wsConnected}
            wsQueueRunning={wsQueueRunning}
            wsQueuePending={wsQueuePending}
            wsExecution={wsExecution}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${fallbackDotClass}`} />
            <span className="text-[10px] text-content-secondary">{fallbackStatusText}</span>
          </div>
        )}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <a
          href="https://github.com/comfyanonymous/ComfyUI"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="ComfyUI GitHub"
        >
          <Github className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}



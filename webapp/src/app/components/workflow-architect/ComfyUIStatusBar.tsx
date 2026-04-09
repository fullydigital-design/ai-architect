import { CheckCircle2, Loader2, WifiOff, AlertTriangle, Activity } from 'lucide-react';
import type { UseComfyUIStatusResult } from '../../../hooks/useComfyUIStatus';

interface ComfyUIStatusBarProps {
  status: UseComfyUIStatusResult;
}

function getTone(phase: UseComfyUIStatusResult['phase']): { box: string; text: string; icon: JSX.Element } {
  if (phase === 'online') {
    return {
      box: 'border-emerald-500/25 bg-emerald-500/10',
      text: 'text-emerald-200',
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    };
  }
  if (phase === 'queueing' || phase === 'installing' || phase === 'restarting') {
    return {
      box: 'border-sky-500/25 bg-sky-500/10',
      text: 'text-sky-200',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />,
    };
  }
  if (phase === 'offline') {
    return {
      box: 'border-amber-500/25 bg-amber-500/10',
      text: 'text-amber-200',
      icon: <WifiOff className="h-3.5 w-3.5 text-amber-300" />,
    };
  }
  if (phase === 'error') {
    return {
      box: 'border-red-500/25 bg-red-500/10',
      text: 'text-red-200',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-red-300" />,
    };
  }
  return {
    box: 'border-border-strong/70 bg-surface-elevated/50',
    text: 'text-content-primary',
    icon: <Activity className="h-3.5 w-3.5 text-content-secondary" />,
  };
}

export function ComfyUIStatusBar({ status }: ComfyUIStatusBarProps) {
  const tone = getTone(status.phase);
  const updatedAgoSec = Math.max(0, Math.round((Date.now() - status.lastUpdated) / 1000));

  return (
    <div className={`mx-3 mt-2 rounded-md border px-2.5 py-1.5 text-[10px] ${tone.box} ${tone.text}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex min-w-0 items-center gap-2">
          {tone.icon}
          <span className="truncate">{status.message}</span>
        </div>
        <span className="shrink-0 text-[9px] text-content-secondary">updated {updatedAgoSec}s ago</span>
      </div>
    </div>
  );
}


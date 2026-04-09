import { useMemo } from 'react';
import { quickValidate } from '@/services/workflow-validator';

interface ValidationBadgeProps {
  workflow: any;
  onClick: () => void;
  lastValidation?: {
    confidence: number;
    autoFixed: number;
    unfixable: number;
  };
}

export function ValidationBadge({ workflow, onClick, lastValidation }: ValidationBadgeProps) {
  const quickResult = useMemo(() => {
    if (!workflow) return null;
    return quickValidate(workflow);
  }, [workflow]);

  if (!quickResult) return null;

  let color = 'text-green-400';
  let bg = 'bg-green-900/20 border-green-800/30';
  let label = 'Valid';

  if (lastValidation) {
    if (lastValidation.unfixable > 0) {
      color = 'text-red-400';
      bg = 'bg-red-900/20 border-red-800/30';
      label = `${lastValidation.unfixable} error${lastValidation.unfixable !== 1 ? 's' : ''}`;
    } else if (lastValidation.autoFixed > 0) {
      color = 'text-yellow-400';
      bg = 'bg-yellow-900/20 border-yellow-800/30';
      label = `${lastValidation.confidence}% (${lastValidation.autoFixed} fixed)`;
    } else {
      color = 'text-green-400';
      bg = 'bg-green-900/20 border-green-800/30';
      label = `${lastValidation.confidence}%`;
    }
  } else if (quickResult) {
    if (quickResult.errorCount > 0) {
      color = 'text-red-400';
      bg = 'bg-red-900/20 border-red-800/30';
      label = `${quickResult.errorCount} error${quickResult.errorCount !== 1 ? 's' : ''}`;
    } else if (quickResult.warningCount > 0) {
      color = 'text-yellow-400';
      bg = 'bg-yellow-900/20 border-yellow-800/30';
      label = `${quickResult.warningCount} custom node${quickResult.warningCount !== 1 ? 's' : ''}`;
    } else {
      color = 'text-green-400';
      bg = 'bg-green-900/20 border-green-800/30';
      label = 'Valid';
    }
  }

  const dotClass = color.includes('green') ? 'bg-green-500' : color.includes('yellow') ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-[10px] rounded-lg border ${bg} ${color} hover:opacity-80 transition-opacity flex items-center gap-1.5 tabular-nums`}
      title="Click to run full validation"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {label}
    </button>
  );
}

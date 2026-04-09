import { useMemo, useState } from 'react';
import type {
  PipelineValidationIssue as ValidationIssue,
  PipelineValidationResult as ValidationResult,
  IssueSeverity,
} from '@/services/workflow-validator';

interface ValidationReportPanelProps {
  result: ValidationResult;
  onProceed: () => void;
  onRetryWithAI?: () => void;
  onCancel: () => void;
  onDismiss?: () => void;
}

export function ValidationReportPanel({
  result,
  onProceed,
  onRetryWithAI,
  onCancel,
  onDismiss,
}: ValidationReportPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<IssueSeverity | 'all'>('all');

  const filteredIssues = useMemo(() => {
    if (filterSeverity === 'all') return result.issues;
    return result.issues.filter((issue) => issue.severity === filterSeverity);
  }, [result.issues, filterSeverity]);

  const errorCount = result.issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = result.issues.filter((issue) => issue.severity === 'warning').length;
  const infoCount = result.issues.filter((issue) => issue.severity === 'info').length;

  const confidenceBar = result.confidence >= 80 ? 'bg-green-500' : result.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const confidenceText = result.confidence >= 80 ? 'text-green-400' : result.confidence >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gray-950 border border-border-strong/50 rounded-xl shadow-2xl overflow-hidden max-w-2xl w-full">
      <div className={`px-5 py-3 border-b ${result.isValid ? 'border-green-800/50 bg-green-900/10' : 'border-red-800/50 bg-red-900/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{result.isValid ? '✓' : '✗'}</span>
            <div>
              <h3 className={`text-sm ${result.isValid ? 'text-green-300' : 'text-red-300'}`}>
                {result.isValid ? 'Workflow Valid' : 'Validation Failed'}
              </h3>
              <p className="text-xs text-content-muted">{result.summary}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg tabular-nums ${confidenceText}`}>{result.confidence}%</div>
            <div className="w-16 h-1 bg-surface-elevated rounded-full overflow-hidden mt-0.5">
              <div className={`h-full rounded-full ${confidenceBar}`} style={{ width: `${result.confidence}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 py-2 border-b border-border-default text-[11px]">
        <span className="text-content-muted">{result.validationTimeMs.toFixed(0)}ms</span>
        <span className="text-content-faint">|</span>
        {result.stats.autoFixed > 0 && <span className="text-blue-400">{result.stats.autoFixed} auto-fixed</span>}
        {errorCount > 0 && (
          <button
            onClick={() => setFilterSeverity('error')}
            className={`px-1.5 py-0.5 rounded ${filterSeverity === 'error' ? 'bg-red-900/30' : ''} text-red-400`}
          >
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </button>
        )}
        {warningCount > 0 && (
          <button
            onClick={() => setFilterSeverity('warning')}
            className={`px-1.5 py-0.5 rounded ${filterSeverity === 'warning' ? 'bg-yellow-900/30' : ''} text-yellow-400`}
          >
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </button>
        )}
        {infoCount > 0 && (
          <button
            onClick={() => setFilterSeverity('info')}
            className={`px-1.5 py-0.5 rounded ${filterSeverity === 'info' ? 'bg-blue-900/30' : ''} text-blue-400`}
          >
            {infoCount} info
          </button>
        )}
        {filterSeverity !== 'all' && (
          <button onClick={() => setFilterSeverity('all')} className="text-content-muted hover:text-content-primary">
            Show all
          </button>
        )}
      </div>

      {result.issues.length > 0 && (
        <div className="max-h-64 overflow-y-auto">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-5 py-2 text-left text-xs text-content-secondary hover:text-content-primary flex items-center gap-2 sticky top-0 bg-gray-950 z-10"
          >
            <span className={`transition-transform ${showDetails ? 'rotate-90' : ''}`}>▶</span>
            {showDetails ? 'Hide' : 'Show'} {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
          </button>
          {showDetails && (
            <div className="px-3 pb-3 space-y-1">
              {filteredIssues.map((issue) => <IssueRow key={issue.id} issue={issue} />)}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 border-t border-border-default">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-content-secondary hover:text-white border border-border-strong rounded-lg"
          >
            Cancel
          </button>
          {onDismiss && result.isValid && (
            <button onClick={onDismiss} className="px-3 py-1.5 text-xs text-content-muted hover:text-content-primary">
              Don&apos;t show again
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!result.isValid && onRetryWithAI && (
            <button
              onClick={onRetryWithAI}
              className="px-4 py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-700 rounded-lg"
            >
              Retry with AI
            </button>
          )}
          {result.isValid && (
            <button
              onClick={onProceed}
              className="px-4 py-1.5 text-xs text-white bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-1.5"
            >
              {result.wasModified ? 'Execute (with fixes)' : 'Execute'}
              {result.wasModified && (
                <span className="text-[10px] bg-green-500/30 px-1 rounded">{result.stats.autoFixed} fixed</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const [expanded, setExpanded] = useState(false);
  const severityStyle = {
    error: { icon: '✗', bg: 'bg-red-900/10', border: 'border-red-900/30', text: 'text-red-300' },
    warning: { icon: '⚠', bg: 'bg-yellow-900/10', border: 'border-yellow-900/30', text: 'text-yellow-300' },
    info: { icon: 'ℹ', bg: 'bg-blue-900/10', border: 'border-blue-900/30', text: 'text-blue-300' },
  }[issue.severity];
  const fixStyle = {
    'auto-fixed': { text: 'text-green-400', label: 'Auto-fixed' },
    'unfixable': { text: 'text-red-400', label: 'Unfixable' },
    'manual-review': { text: 'text-yellow-400', label: 'Review' },
  }[issue.fixStatus];

  return (
    <div className={`rounded-lg border px-3 py-2 ${severityStyle.bg} ${severityStyle.border} cursor-pointer`} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-2">
        <span className={`text-xs mt-0.5 ${severityStyle.text}`}>{severityStyle.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs ${severityStyle.text}`}>{issue.message}</p>
          {expanded && (
            <div className="mt-1.5 space-y-1">
              {issue.nodeId && <p className="text-[10px] text-content-muted">Node: #{issue.nodeId} ({issue.nodeClassType})</p>}
              {issue.details && <p className="text-[10px] text-content-muted">{issue.details}</p>}
              {issue.fix && (
                <p className="text-[10px] text-green-400/70">
                  Fix: {issue.fix.description} - {JSON.stringify(issue.fix.original)} → {JSON.stringify(issue.fix.corrected)}
                </p>
              )}
            </div>
          )}
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${fixStyle.text} bg-surface-inset/50`}>{fixStyle.label}</span>
      </div>
    </div>
  );
}


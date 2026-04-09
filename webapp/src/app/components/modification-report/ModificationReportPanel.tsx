import { useState } from 'react';
import type { ModificationResult } from '@/services/workflow-operations';
import type { PipelineValidationResult } from '@/services/workflow-validator';

interface ModificationReportPanelProps {
  modResult: ModificationResult;
  validationResult?: PipelineValidationResult | null;
  onAccept: () => void;
  onReject: () => void;
  onRetryWithAI?: () => void;
}

export function ModificationReportPanel({
  modResult,
  validationResult,
  onAccept,
  onReject,
  onRetryWithAI,
}: ModificationReportPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const allOk = modResult.allSucceeded && (validationResult?.isValid ?? true);

  return (
    <div className="bg-gray-950 border border-border-strong/50 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
      <div className={`px-5 py-3 border-b ${allOk ? 'border-green-800/50 bg-green-900/10' : 'border-yellow-800/50 bg-yellow-900/10'}`}>
        <h3 className={`text-sm ${allOk ? 'text-green-300' : 'text-yellow-300'}`}>
          {allOk ? 'Modification Applied' : 'Modification Needs Review'}
        </h3>
        <p className="text-xs text-content-muted mt-0.5">{modResult.summary}</p>
      </div>

      <div className="px-5 py-3">
        <button
          onClick={() => setShowDetails((prev) => !prev)}
          className="text-xs text-content-secondary hover:text-content-primary flex items-center gap-2"
        >
          <span className={`transition-transform text-[10px] ${showDetails ? 'rotate-90' : ''}`}>▶</span>
          {modResult.operationResults.length} operation{modResult.operationResults.length !== 1 ? 's' : ''}
        </button>

        {showDetails && (
          <div className="mt-2 space-y-1 max-h-56 overflow-y-auto pr-1">
            {modResult.operationResults.map((result, index) => (
              <div
                key={`${result.op.op}-${index}`}
                className={`text-[11px] px-3 py-1.5 rounded-lg border ${
                  result.success
                    ? 'border-green-900/40 bg-green-900/10 text-green-300'
                    : 'border-red-900/40 bg-red-900/10 text-red-300'
                }`}
              >
                <span className="mr-1.5">{result.success ? '✓' : '✗'}</span>
                {result.message}
                {result.error && <p className="text-[10px] text-red-400/80 mt-0.5">{result.error}</p>}
              </div>
            ))}
          </div>
        )}

        {validationResult && validationResult.issues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-default text-[11px] text-content-secondary">
            Post-validation: {validationResult.stats.autoFixed} auto-fixed, {validationResult.stats.unfixable} unfixable.
            Confidence: {validationResult.confidence}%
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-border-default">
        <button
          onClick={onReject}
          className="px-3 py-1.5 text-xs text-content-secondary hover:text-white border border-border-strong rounded-lg"
        >
          Reject
        </button>
        <div className="flex items-center gap-2">
          {!allOk && onRetryWithAI && (
            <button
              onClick={onRetryWithAI}
              className="px-3 py-1.5 text-xs text-blue-400 border border-blue-700 rounded-lg hover:text-blue-300"
            >
              Retry with AI
            </button>
          )}
          <button
            onClick={onAccept}
            className={`px-4 py-1.5 text-xs rounded-lg ${
              allOk ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white'
            }`}
          >
            {allOk ? 'Accept' : 'Accept Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}


import type { SchemaValidationError } from '../../../services/workflow-validator';

interface ValidationPanelProps {
  errors: SchemaValidationError[];
  warnings: SchemaValidationError[];
  onFix: () => void;
  onProceed: () => void;
  onCancel: () => void;
}

export function ValidationPanel({
  errors,
  warnings,
  onFix,
  onProceed,
  onCancel,
}: ValidationPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border-strong bg-surface-200/95 backdrop-blur-sm p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-state-error">Validation</span>
          <h3 className="text-sm font-medium text-foreground">
            Workflow validation found {errors.length} error{errors.length === 1 ? '' : 's'}
            {warnings.length > 0 ? ` and ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}
          </h3>
        </div>

        <div className="mb-5 max-h-80 space-y-2 overflow-y-auto pr-1">
          {errors.map((error, index) => (
            <div key={`${error.nodeId}-${error.field}-${index}`} className="rounded-lg border border-red-900/50 bg-red-950/30 p-3">
              <div className="text-xs text-content-primary">
                <span className="font-mono text-red-300">{error.nodeType}</span>
                <span className="text-content-muted"> {'->'} </span>
                <span className="font-mono text-amber-300">{error.field}</span>
              </div>
              <div className="mt-0.5 text-xs text-content-secondary">{error.message}</div>
              {error.fix && (
                <div className="mt-1 text-xs text-blue-300">Suggested fix: {error.fix}</div>
              )}
            </div>
          ))}
          {warnings.map((warning, index) => (
            <div key={`${warning.nodeId}-${warning.field}-${index}`} className="rounded-lg border border-yellow-900/50 bg-yellow-950/30 p-3">
              <div className="text-xs text-content-primary">
                <span className="font-mono text-yellow-300">{warning.nodeType}</span>
                <span className="text-content-muted"> {'->'} </span>
                <span className="font-mono text-amber-300">{warning.field}</span>
              </div>
              <div className="mt-0.5 text-xs text-content-secondary">{warning.message}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onFix}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Ask AI to Fix These Errors
          </button>
          <button
            onClick={onProceed}
            className="rounded-lg bg-surface-300 px-4 py-2.5 text-sm text-content-primary hover:bg-accent"
          >
            Queue Anyway
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg bg-surface-elevated px-3 py-2.5 text-sm text-content-secondary hover:bg-surface-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

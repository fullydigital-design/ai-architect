import { useEffect, useMemo, useState } from 'react';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useWorkflowValidator } from '../../hooks/useWorkflowValidator';

interface WorkflowValidatorProps {
  initialWorkflow?: Record<string, unknown>;
}

export default function WorkflowValidator({ initialWorkflow }: WorkflowValidatorProps) {
  const { report, loading, error, validate, reset } = useWorkflowValidator();
  const [workflowText, setWorkflowText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [installedOpen, setInstalledOpen] = useState(false);
  const [builtInOpen, setBuiltInOpen] = useState(false);

  useEffect(() => {
    if (initialWorkflow) {
      setWorkflowText(JSON.stringify(initialWorkflow, null, 2));
      setParseError(null);
    }
  }, [initialWorkflow]);

  const { missing, installed, builtIn } = useMemo(() => {
    const results = report?.results ?? [];
    return {
      missing: results.filter((r) => r.status === 'missing'),
      installed: results.filter((r) => r.status === 'installed'),
      builtIn: results.filter((r) => r.status === 'built-in'),
    };
  }, [report]);

  const onValidate = async () => {
    setParseError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(workflowText) as Record<string, unknown>;
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }
    await validate(parsed);
  };

  const onDropFile = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const text = await file.text();
    setWorkflowText(text);
    setParseError(null);
    reset();
  };

  const onExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'validation-report.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="rounded-lg border border-border-default bg-gray-950 p-4 space-y-3">
        <div className="relative" onDragOver={(e) => e.preventDefault()} onDrop={onDropFile}>
          <textarea
            value={workflowText}
            onChange={(e) => {
              setWorkflowText(e.target.value);
              setParseError(null);
            }}
            placeholder="Paste workflow JSON here..."
            className="min-h-[200px] w-full rounded-md border border-border-strong bg-surface-inset p-3 font-mono text-xs outline-none focus:border-gray-500"
          />
          <div className="pointer-events-none absolute inset-0 rounded-md border border-dashed border-transparent hover:border-border-strong" />
        </div>

        {parseError && <p className="text-sm text-red-400">{parseError}</p>}

        {error && (
          <div className="flex items-center justify-between rounded-md border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-red-400/40 px-2 py-1 text-xs"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setWorkflowText('');
              setParseError(null);
              reset();
            }}
            className="rounded-md border border-border-strong px-3 py-2 text-sm"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={loading || !workflowText.trim()}
            onClick={onValidate}
            className="rounded-md border border-border-strong bg-gray-100 px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Validating...' : 'Validate'}
          </button>
        </div>
      </div>

      {report && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-content-primary">{report.totalNodes} nodes</span>
            <span className="rounded-full bg-green-900/40 px-3 py-1 text-xs text-green-300">{report.validNodes} valid</span>
            <span className={`rounded-full px-3 py-1 text-xs ${report.missingNodes === 0 ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
              {report.missingNodes} missing
            </span>
          </div>

          <section className="space-y-2">
            {missing.length > 0 ? (
              missing.map((item) => (
                <div key={item.nodeType} className="rounded-md border-l-4 border-red-500 bg-red-950/20 p-3">
                  <div className="font-medium text-red-200">{item.nodeType}</div>
                  {item.suggestedPack && (
                    <span className="mt-2 inline-block rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-200">
                      Install: {item.suggestedPack}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-md border border-green-500/40 bg-green-950/20 p-3 text-sm text-green-200">
                All nodes are installed ✓
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border-default bg-gray-950">
            <button
              type="button"
              onClick={() => setInstalledOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
            >
              <span>Installed ({installed.length})</span>
              {installedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {installedOpen && (
              <div className="space-y-1 border-t border-border-default p-3">
                {installed.map((item) => (
                  <div key={item.nodeType} className="flex flex-wrap items-center gap-2 text-sm">
                    <span>{item.nodeType}</span>
                    <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-300">Installed</span>
                    <span className="text-xs text-content-muted">{item.providedBy}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border-default bg-gray-950">
            <button
              type="button"
              onClick={() => setBuiltInOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
            >
              <span>Built-in ({builtIn.length})</span>
              {builtInOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {builtInOpen && (
              <div className="space-y-1 border-t border-border-default p-3">
                {builtIn.map((item) => (
                  <div key={item.nodeType} className="flex flex-wrap items-center gap-2 text-sm">
                    <span>{item.nodeType}</span>
                    <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-content-primary">Built-in</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-md border border-border-strong px-3 py-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
            <span className="text-xs text-content-muted">Scanned {report.scannedAt}</span>
          </div>
        </div>
      )}
    </div>
  );
}

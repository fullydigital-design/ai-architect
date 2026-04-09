import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Download, ExternalLink, HelpCircle, XCircle } from 'lucide-react';
import type { ModelSlot } from '../../../services/workflow-analyzer';
import { checkModelRequirements, type ModelCheckResult } from '../../../services/model-checker';

interface MissingModelsCardProps {
  modelSlots: ModelSlot[];
  installedModels: Map<string, Set<string>>;
  isLoading?: boolean;
}

function baseName(filename: string): string {
  return filename.split('/').pop()?.split('\\').pop() || filename;
}

function statusSortWeight(status: ModelCheckResult['status']): number {
  if (status === 'missing') return 0;
  if (status === 'unknown') return 1;
  return 2;
}

function statusBadge(status: ModelCheckResult['status']) {
  if (status === 'installed') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Installed
      </span>
    );
  }
  if (status === 'missing') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">
        <XCircle className="h-3 w-3" />
        Missing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
      <HelpCircle className="h-3 w-3" />
      Unknown
    </span>
  );
}

function renderRows(results: ModelCheckResult[]) {
  return results.map((result) => (
    <div key={result.filename.toLowerCase()} className="rounded border border-border-default bg-surface-primary p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] text-content-primary" title={result.filename}>
            {baseName(result.filename)}
          </div>
          <div className="text-[10px] text-content-muted">
            {result.category}
          </div>
        </div>
        {statusBadge(result.status)}
      </div>

      {(result.downloadUrl || result.status !== 'installed') && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {result.downloadUrl ? (
            <a
              href={result.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-accent/30 bg-indigo-500/15 px-2 py-1 text-[10px] text-indigo-200 hover:bg-indigo-500/25"
            >
              <Download className="h-3 w-3" />
              Direct Download
            </a>
          ) : null}
          {result.searchUrls.map((link) => (
            <a
              key={`${result.filename}-${link.label}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[10px] text-content-primary hover:bg-surface-elevated/60"
            >
              <ExternalLink className="h-3 w-3" />
              {link.label}
            </a>
          ))}
        </div>
      )}

      {(result.downloadSize || result.notes) && (
        <div className="mt-1 text-[10px] text-content-muted">
          {result.downloadSize ? <span>Size: {result.downloadSize}</span> : null}
          {result.downloadSize && result.notes ? <span> . </span> : null}
          {result.notes ? <span>{result.notes}</span> : null}
        </div>
      )}
    </div>
  ));
}

export function MissingModelsCard({ modelSlots, installedModels, isLoading = false }: MissingModelsCardProps) {
  const [showInstalled, setShowInstalled] = useState(false);
  const [showMissing, setShowMissing] = useState(true);
  const [showUnknown, setShowUnknown] = useState(true);

  const summary = useMemo(
    () => checkModelRequirements(modelSlots, installedModels),
    [modelSlots, installedModels],
  );

  const sortedResults = useMemo(
    () => [...summary.results].sort((a, b) => {
      const byStatus = statusSortWeight(a.status) - statusSortWeight(b.status);
      return byStatus !== 0 ? byStatus : a.filename.localeCompare(b.filename);
    }),
    [summary.results],
  );

  const missing = sortedResults.filter((item) => item.status === 'missing');
  const unknown = sortedResults.filter((item) => item.status === 'unknown');
  const installed = sortedResults.filter((item) => item.status === 'installed');

  if (summary.total === 0) return null;

  const installedPct = Math.round((summary.installed / summary.total) * 100);
  const missingPct = Math.round((summary.missing / summary.total) * 100);
  const unknownPct = Math.max(0, 100 - installedPct - missingPct);

  return (
    <div className="mt-3 rounded-lg border border-accent/20 bg-indigo-500/[0.04] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="text-xs text-content-primary inline-flex items-center gap-2">
            <Download className="w-4 h-4 text-accent-text" />
            Model Requirements
          </div>
          <div className="text-[10px] text-content-secondary">
            {summary.installed}/{summary.total} installed
          </div>
        </div>
        <div className="mt-1 text-[10px] text-content-secondary">
          {summary.total} models: <span className="text-emerald-300">{summary.installed} installed</span>, <span className="text-red-300">{summary.missing} missing</span>, <span className="text-amber-300">{summary.unknown} unknown</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-surface-elevated">
          <div className="flex h-full w-full">
            <div className="h-full bg-emerald-500/80" style={{ width: `${installedPct}%` }} />
            <div className="h-full bg-red-500/80" style={{ width: `${missingPct}%` }} />
            <div className="h-full bg-amber-500/80" style={{ width: `${unknownPct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-3.5 py-2 space-y-2">
        {isLoading && (
          <p className="text-[11px] text-content-muted">Scanning installed models from ComfyUI...</p>
        )}

        <div className="rounded border border-border-default/70 bg-surface-inset">
          <button
            onClick={() => setShowMissing((prev) => !prev)}
            className="w-full px-2.5 py-2 text-left text-[11px] text-red-200 inline-flex items-center justify-between"
          >
            <span>Missing ({missing.length})</span>
            {showMissing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showMissing && (
            <div className="px-2 pb-2 space-y-1.5">
              {missing.length === 0 ? <p className="text-[10px] text-content-muted">No missing models.</p> : renderRows(missing)}
            </div>
          )}
        </div>

        <div className="rounded border border-border-default/70 bg-surface-inset">
          <button
            onClick={() => setShowUnknown((prev) => !prev)}
            className="w-full px-2.5 py-2 text-left text-[11px] text-amber-200 inline-flex items-center justify-between"
          >
            <span>Unknown ({unknown.length})</span>
            {showUnknown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showUnknown && (
            <div className="px-2 pb-2 space-y-1.5">
              {unknown.length === 0 ? <p className="text-[10px] text-content-muted">No unknown model statuses.</p> : renderRows(unknown)}
            </div>
          )}
        </div>

        <div className="rounded border border-border-default/70 bg-surface-inset">
          <button
            onClick={() => setShowInstalled((prev) => !prev)}
            className="w-full px-2.5 py-2 text-left text-[11px] text-emerald-200 inline-flex items-center justify-between"
          >
            <span>Installed ({installed.length})</span>
            {showInstalled ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showInstalled && (
            <div className="px-2 pb-2 space-y-1.5">
              {installed.length === 0 ? <p className="text-[10px] text-content-muted">No installed models detected.</p> : renderRows(installed)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

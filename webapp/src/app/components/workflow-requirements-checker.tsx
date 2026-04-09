import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileJson,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import type { ComfyUIWorkflow } from '../../types/comfyui';
import { convertGraphToAPI } from '../../services/comfyui-backend';
import { apiToGraph } from '../../services/api-to-graph-converter';
import { validateWorkflow } from '../../services/workflow-validator';
import { usePackInstaller } from '../../hooks/usePackInstaller';
import { parseWorkflowFile, parseWorkflowJSON, type ParsedWorkflow } from '../services/workflow-parser';
import { analyzeWorkflowRequirements, type NodeRequirement, type WorkflowRequirements } from '../services/workflow-requirements';
import type { PackInfo } from '../services/node-pack-mapper';

interface RequirementsCheckerProps {
  initialWorkflowJSON?: string;
  currentWorkflow?: Record<string, unknown>;
  comfyuiUrl?: string;
  managerAvailable?: boolean;
  onAnalysisComplete?: (requirements: WorkflowRequirements) => void;
}

function isGraphWorkflow(workflow: unknown): workflow is ComfyUIWorkflow {
  if (!workflow || typeof workflow !== 'object') return false;
  const typed = workflow as Record<string, unknown>;
  return Array.isArray(typed.nodes) && Array.isArray(typed.links);
}

function getRequirementSortRank(requirement: NodeRequirement): number {
  if (requirement.source === 'custom_pack' && requirement.isMissing) return 0;
  if (requirement.source === 'unknown') return 1;
  if (requirement.source === 'custom_pack' && requirement.isAvailable) return 2;
  return 3;
}

function getRequirementRowClass(requirement: NodeRequirement): string {
  if (requirement.source === 'custom_pack' && requirement.isMissing) return 'border-l-2 border-red-500/80 bg-red-950/20';
  if (requirement.source === 'unknown') return 'border-l-2 border-amber-500/80 bg-amber-950/20';
  if (requirement.source === 'custom_pack' && requirement.isAvailable) return 'border-l-2 border-blue-500/80 bg-blue-950/20';
  return 'border-l-2 border-green-500/80 bg-green-950/20';
}

function getSourceLabel(requirement: NodeRequirement): string {
  if (requirement.source === 'builtin') return 'Built-in';
  if (requirement.source === 'custom_pack') return 'Pack';
  return 'Unknown';
}

function getStatusLabel(requirement: NodeRequirement): string {
  if (requirement.source === 'builtin') return 'Ready';
  if (requirement.source === 'custom_pack' && requirement.isAvailable) return 'Installed';
  if (requirement.source === 'custom_pack' && requirement.isMissing) return 'Missing';
  return 'Unknown';
}

function getStatusClass(requirement: NodeRequirement): string {
  if (requirement.source === 'builtin') return 'bg-green-900/40 text-green-300';
  if (requirement.source === 'custom_pack' && requirement.isAvailable) return 'bg-blue-900/40 text-blue-300';
  if (requirement.source === 'custom_pack' && requirement.isMissing) return 'bg-red-900/40 text-red-300';
  return 'bg-amber-900/40 text-amber-300';
}

export default function WorkflowRequirementsChecker({
  initialWorkflowJSON,
  currentWorkflow,
  comfyuiUrl,
  managerAvailable = true,
  onAnalysisComplete,
}: RequirementsCheckerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedJson, setPastedJson] = useState(initialWorkflowJSON || '');
  const [parsedWorkflow, setParsedWorkflow] = useState<ParsedWorkflow | null>(null);
  const [requirements, setRequirements] = useState<WorkflowRequirements | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] } | null>(null);
  const [lastParsedForRetry, setLastParsedForRetry] = useState<ParsedWorkflow | null>(null);
  const [loadedLabel, setLoadedLabel] = useState<string>('');
  const [bulkInstallStatus, setBulkInstallStatus] = useState<string>('');

  const runAnalysis = useCallback(async (parsed: ParsedWorkflow, sourceLabel: string) => {
    setAnalysisError(null);
    setParsedWorkflow(parsed);
    setRequirements(null);
    setLoadedLabel(sourceLabel);
    setLastParsedForRetry(parsed);
    setValidationResult(null);

    if (parsed.errors.length > 0 || parsed.format === 'unknown') {
      const parseError = parsed.errors[0] || 'Could not detect supported workflow format';
      setAnalysisError(parseError);
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeWorkflowRequirements(parsed);
      setRequirements(result);
      onAnalysisComplete?.(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze workflow requirements';
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [onAnalysisComplete]);

  const handleFile = useCallback(async (file: File) => {
    setAnalysisError(null);
    const parsed = await parseWorkflowFile(file);
    await runAnalysis(parsed, file.name);
  }, [runAnalysis]);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleFile(file);
  }, [handleFile]);

  const handleBrowseChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFile(file);
    event.target.value = '';
  }, [handleFile]);

  const handleAnalyzePasted = useCallback(async () => {
    const parsed = parseWorkflowJSON(pastedJson);
    await runAnalysis(parsed, 'Pasted JSON');
  }, [pastedJson, runAnalysis]);

  const handleCheckCurrentWorkflow = useCallback(async () => {
    if (!currentWorkflow) {
      setAnalysisError('No active workflow loaded');
      return;
    }

    let parsed: ParsedWorkflow;
    if (isGraphWorkflow(currentWorkflow)) {
      const apiWorkflow = convertGraphToAPI(currentWorkflow);
      parsed = parseWorkflowJSON(JSON.stringify(apiWorkflow));
    } else {
      parsed = parseWorkflowJSON(JSON.stringify(currentWorkflow));
    }

    await runAnalysis(parsed, 'Current workflow');
  }, [currentWorkflow, runAnalysis]);

  const handleValidateWorkflow = useCallback(() => {
    const validationSource = currentWorkflow ?? parsedWorkflow?.raw;

    if (!validationSource) {
      setValidationResult({
        isValid: false,
        errors: ['No workflow available. Load or paste a workflow first.'],
      });
      return;
    }

    let graphWorkflow: ComfyUIWorkflow | null = null;
    if (isGraphWorkflow(validationSource)) {
      graphWorkflow = validationSource;
    } else {
      try {
        graphWorkflow = apiToGraph(validationSource as Record<string, any>).workflow;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not convert workflow to graph format';
        setValidationResult({
          isValid: false,
          errors: [message],
        });
        return;
      }
    }

    const result = validateWorkflow(graphWorkflow);
    setValidationResult({
      isValid: result.isValid,
      errors: result.errors.map((err) => err.details),
    });
  }, [currentWorkflow, parsedWorkflow]);

  const sortedRequirements = useMemo(() => {
    if (!requirements) return [];
    return [...requirements.requirements].sort((a, b) => {
      const rankDiff = getRequirementSortRank(a) - getRequirementSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.nodeClass.localeCompare(b.nodeClass);
    });
  }, [requirements]);

  const missingPackNodes = useMemo(() => {
    if (!requirements) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const requirement of requirements.requirements) {
      if (!requirement.pack || !requirement.isMissing) continue;
      const packKey = requirement.pack.id || requirement.pack.reference || requirement.pack.repository || requirement.pack.title;
      const existing = map.get(packKey) || [];
      if (!existing.includes(requirement.nodeClass)) existing.push(requirement.nodeClass);
      map.set(packKey, existing);
    }
    return map;
  }, [requirements]);

  const rerunCurrentAnalysis = useCallback(async () => {
    if (!parsedWorkflow) return;
    await runAnalysis(parsedWorkflow, loadedLabel || 'Current workflow');
  }, [loadedLabel, parsedWorkflow, runAnalysis]);

  const {
    performAction,
    installAllMissing,
    triggerRestart,
    getPackState,
    restartNeeded,
    isRestarting,
    progressText,
    lastError,
  } = usePackInstaller({
    comfyuiUrl,
    managerAvailable,
    onAfterRestart: rerunCurrentAnalysis,
  });

  const handleInstallPack = useCallback(async (pack: PackInfo) => {
    setBulkInstallStatus('');
    await performAction('install', pack);
  }, [performAction]);

  const handleInstallAllMissing = useCallback(async () => {
    if (!requirements || requirements.missingPacks.length === 0) return;
    setBulkInstallStatus('');
    const summary = await installAllMissing(requirements.missingPacks);
    setBulkInstallStatus(
      summary.failed > 0
        ? `Installed ${summary.completed}/${summary.total}, ${summary.failed} failed`
        : `Installed ${summary.completed}/${summary.total} packs successfully`,
    );
  }, [installAllMissing, requirements]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="rounded-sm border border-border-default bg-surface-secondary p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-accent-text" />
              Workflow Requirements Checker
            </h2>
            <p className="text-xs text-content-faint mt-1">Analyze built-in nodes, installed packs, and missing requirements</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCheckCurrentWorkflow}
              className="rounded-sm border border-border-default px-3 py-2 text-xs text-content-primary hover:bg-surface-secondary"
            >
              Check Current Workflow
            </button>
            <button
              type="button"
              onClick={() => setShowPaste((prev) => !prev)}
              className="rounded-sm border border-border-default px-3 py-2 text-xs text-content-primary hover:bg-surface-secondary"
            >
              {showPaste ? 'Use File Upload' : 'Paste JSON'}
            </button>
            <button
              type="button"
              onClick={handleValidateWorkflow}
              className="rounded-sm border border-accent/30 bg-accent-muted px-3 py-2 text-xs text-accent-text hover:bg-accent-muted/80"
            >Validate</button>
          </div>
        </div>

        {validationResult && (
          <div
            className={`mb-3 rounded-sm border p-3 text-sm ${
              validationResult.isValid
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <span>{validationResult.isValid ? 'OK' : 'ERR'}</span>
              <span className="font-medium">
                {validationResult.isValid ? 'Workflow is valid' : `${validationResult.errors.length} issue(s) found`}
              </span>
            </div>
            {!validationResult.isValid && (
              <ul className="ml-5 mt-1 space-y-0.5 text-xs text-red-300/80">
                {validationResult.errors.map((err, index) => (
                  <li key={`${err}-${index}`}>- {err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!showPaste ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-sm border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-accent bg-accent-muted'
                : 'border-border-default hover:border-border-strong bg-surface-inset'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.workflow,application/json"
              className="hidden"
              onChange={handleBrowseChange}
            />
            <Upload className="h-8 w-8 text-content-faint mx-auto mb-2" />
            <p className="text-sm text-content-secondary">Drop workflow JSON here</p>
            <p className="text-xs text-content-faint mt-1">or click to browse (.json, .workflow)</p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={pastedJson}
              onChange={(event) => setPastedJson(event.target.value)}
              placeholder="Paste ComfyUI workflow JSON here..."
              className="min-h-[180px] w-full rounded-sm border border-border-default bg-surface-inset p-3 font-mono text-xs text-content-primary outline-none focus:border-accent/40"
            />
            <button
              type="button"
              onClick={handleAnalyzePasted}
              disabled={!pastedJson.trim() || isAnalyzing}
              className="rounded-sm border border-border-default bg-surface-elevated px-3 py-2 text-xs text-content-primary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Analyze Pasted JSON
            </button>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="rounded-sm border border-accent/30 bg-accent-muted p-4 text-sm text-accent-text flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing workflow requirements...
        </div>
      )}

      {analysisError && !isAnalyzing && (
        <div className="rounded-sm border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Analysis error</p>
                <p className="text-xs text-red-200/80 mt-1">{analysisError}</p>
              </div>
            </div>
            {lastParsedForRetry && (
              <button
                type="button"
                onClick={() => runAnalysis(lastParsedForRetry, loadedLabel || 'Retry')}
                className="rounded-sm border border-red-400/30 px-2 py-1 text-xs hover:bg-red-900/30"
              >
                <RefreshCw className="h-3 w-3 inline mr-1" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {requirements && parsedWorkflow && !isAnalyzing && (
        <div className="space-y-4">
          <div className="rounded-sm border border-border-default bg-surface-inset p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-content-primary">Summary</h3>
              <div className="flex items-center gap-2">
                {loadedLabel && (
                  <span className="rounded-sm bg-surface-elevated px-2.5 py-1 text-[10px] text-content-secondary">{loadedLabel}</span>
                )}
                <span className={`rounded-sm px-2.5 py-1 text-[10px] ${
                  parsedWorkflow.format === 'ui'
                    ? 'bg-blue-900/40 text-blue-300'
                    : parsedWorkflow.format === 'api'
                      ? 'bg-accent-muted text-accent-text'
                      : 'bg-amber-900/40 text-amber-300'
                }`}
                >
                  {parsedWorkflow.format === 'ui' ? 'UI Format' : parsedWorkflow.format === 'api' ? 'API Format' : 'Unknown'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="rounded-sm border border-border-default bg-surface-secondary p-3">
                <p className="text-[11px] text-content-faint uppercase tracking-wide">Node Types</p>
                <p className="text-lg font-semibold text-content-primary">{requirements.uniqueNodeTypes}</p>
                <p className="text-[10px] text-content-faint mt-1">{requirements.totalNodes} total nodes</p>
              </div>
              <div className="rounded-sm border border-green-700/40 bg-green-950/20 p-3">
                <p className="text-[11px] text-green-300 uppercase tracking-wide">Built-in</p>
                <p className="text-lg font-semibold text-green-200">{requirements.builtinCount}</p>
              </div>
              <div className="rounded-sm border border-blue-700/40 bg-blue-950/20 p-3">
                <p className="text-[11px] text-blue-300 uppercase tracking-wide">Installed</p>
                <p className="text-lg font-semibold text-blue-200">{requirements.installedCount}</p>
              </div>
              <div className="rounded-sm border border-red-700/40 bg-red-950/20 p-3">
                <p className="text-[11px] text-red-300 uppercase tracking-wide">Missing</p>
                <p className="text-lg font-semibold text-red-200">{requirements.missingCount}</p>
              </div>
              <div className={`rounded-sm border p-3 ${requirements.unknownCount > 0 ? 'border-amber-700/40 bg-amber-950/20' : 'border-border-default bg-surface-secondary'}`}>
                <p className={`text-[11px] uppercase tracking-wide ${requirements.unknownCount > 0 ? 'text-amber-300' : 'text-content-faint'}`}>Unknown</p>
                <p className={`text-lg font-semibold ${requirements.unknownCount > 0 ? 'text-amber-200' : 'text-content-primary'}`}>{requirements.unknownCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-border-default bg-surface-inset overflow-hidden">
            <div className="px-4 py-3 border-b border-border-default">
              <h3 className="text-sm font-semibold text-content-primary">Node Requirements</h3>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-surface-secondary/80 text-content-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Node Type</th>
                    <th className="px-3 py-2 text-left font-medium">Usage</th>
                    <th className="px-3 py-2 text-left font-medium">Source</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Pack</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRequirements.map((requirement) => (
                    <tr key={requirement.nodeClass} className={getRequirementRowClass(requirement)}>
                      <td className="px-3 py-2 text-content-primary font-medium">{requirement.nodeClass}</td>
                      <td className="px-3 py-2 text-content-secondary">{requirement.usageCount}</td>
                      <td className="px-3 py-2 text-content-secondary">{getSourceLabel(requirement)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-sm px-2 py-0.5 text-[10px] ${getStatusClass(requirement)}`}>
                          {getStatusLabel(requirement)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-content-secondary">
                        {requirement.pack?.title || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-sm border border-border-default bg-surface-inset p-4 space-y-3">
            <h3 className="text-sm font-semibold text-content-primary">Missing Packs</h3>
            {!managerAvailable && (
              <div className="rounded-sm border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-200">
                ComfyUI-Manager not detected. Install actions are disabled.
              </div>
            )}
            {restartNeeded && (
              <div className="rounded-sm border border-amber-500/40 bg-amber-950/20 p-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-amber-200">ComfyUI restart required to activate installed packs.</span>
                <button
                  type="button"
                  onClick={() => void triggerRestart()}
                  disabled={isRestarting}
                  className="rounded-sm border border-amber-400/40 px-2.5 py-1 text-xs text-amber-100 hover:bg-amber-900/30 disabled:opacity-40"
                >
                  {isRestarting ? 'Restarting...' : 'Restart ComfyUI Now'}
                </button>
              </div>
            )}
            {(progressText || bulkInstallStatus || lastError) && (
              <div className="rounded-sm border border-border-default bg-surface-secondary p-3 space-y-1">
                {progressText && <p className="text-xs text-content-secondary">{progressText}</p>}
                {bulkInstallStatus && <p className="text-xs text-blue-300">{bulkInstallStatus}</p>}
                {lastError && <p className="text-xs text-red-300">{lastError}</p>}
              </div>
            )}
            {requirements.missingPacks.length === 0 ? (
              <div className="rounded-sm border border-green-500/40 bg-green-950/20 p-3 text-sm text-green-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                All required packs are installed.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => void handleInstallAllMissing()}
                    disabled={!managerAvailable || isRestarting}
                    className="rounded-sm border border-accent/40 px-2.5 py-1 text-xs text-accent-text hover:bg-accent-muted disabled:opacity-40"
                  >
                    Install All Missing
                  </button>
                </div>
                {requirements.missingPacks.map((pack) => {
                const packKey = pack.id || pack.reference || pack.repository || pack.title;
                const neededNodes = missingPackNodes.get(packKey) || [];
                const repoUrl = pack.repository || pack.reference;
                const packState = getPackState(packKey);
                const isInstalling = packState.status === 'installing';
                const isActionLocked = isInstalling || isRestarting;
                return (
                  <div key={packKey} className="rounded-sm border border-red-700/40 bg-red-950/15 p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-red-100">{pack.title}</p>
                        <p className="text-xs text-red-200/80 mt-0.5">by {pack.author || 'Unknown'}{pack.stars > 0 ? ` * ${pack.stars}` : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleInstallPack(pack)}
                        disabled={!managerAvailable || isActionLocked}
                        className="rounded-sm border border-border-default px-2.5 py-1 text-xs text-content-primary hover:bg-surface-secondary disabled:opacity-40"
                      >
                        {packState.status === 'idle' && 'Install'}
                        {packState.status === 'installing' && 'Installing...'}
                        {packState.status === 'restart-needed' && 'Installed - Restart needed'}
                        {packState.status === 'success' && 'Installed'}
                        {packState.status === 'error' && 'Retry Install'}
                        {(packState.status === 'uninstalling' || packState.status === 'updating') && 'Working...'}
                      </button>
                    </div>
                    {packState.status === 'error' && packState.error && (
                      <p className="text-xs text-red-300">{packState.error}</p>
                    )}
                    {repoUrl && (
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                      >
                        <FileJson className="h-3 w-3" />
                        {repoUrl}
                      </a>
                    )}
                    {neededNodes.length > 0 && (
                      <p className="text-xs text-red-100/90">
                        Provides: {neededNodes.join(', ')}
                      </p>
                    )}
                  </div>
                );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}








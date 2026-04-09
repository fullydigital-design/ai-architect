import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, ExternalLink, Loader2, PackageCheck, RefreshCw, Rocket, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ComfyUIWorkflow } from '../../../types/comfyui';
import type { DetectedPack, ModelSlot } from '../../../services/workflow-analyzer';
import type { CustomNodePackInfo } from '../../../data/custom-node-registry';
import { usePackInstallationStatus } from '../../../hooks/usePackInstallationStatus';
import { useRequiredModels } from '../../../hooks/useRequiredModels';
import type { UseManagerAPIReturn } from '../../../hooks/useManagerAPI';
import { useInstallEverything } from '../../../hooks/useInstallEverything';
import { DetectedPacksCard } from './DetectedPacksCard';
import {
  detectMissingPacks,
  getManagerNodeListStatus,
  subscribeComfyUIStatus,
  type MissingPackInfo,
} from '../../services/comfyui-manager-service';
import { getComfyUIBaseUrl } from '../../../services/api-config';

interface WorkflowRequirementsPanelProps {
  workflow: ComfyUIWorkflow | null | undefined;
  detectedPacks: DetectedPack[];
  modelSlots?: ModelSlot[];
  comfyuiUrl?: string;
  huggingfaceApiKey?: string;
  civitaiApiKey?: string;
  isPinned: (packId: string) => boolean;
  onPinPack: (pack: CustomNodePackInfo) => void;
  onUnpinPack: (packId: string) => void;
  onPinMultiple: (packs: CustomNodePackInfo[]) => void;
  onLearnPack?: (packId: string, packTitle: string, reference: string) => void;
  learnedPackIds?: Set<string>;
  learningPackId?: string | null;
  onExecuteWorkflow?: () => void;
  managerApi: UseManagerAPIReturn;
}

export const WorkflowRequirementsPanel = memo(function WorkflowRequirementsPanel({
  workflow,
  detectedPacks,
  modelSlots = [],
  comfyuiUrl,
  huggingfaceApiKey,
  civitaiApiKey,
  isPinned,
  onPinPack,
  onUnpinPack,
  onPinMultiple,
  onLearnPack,
  learnedPackIds,
  learningPackId,
  onExecuteWorkflow,
  managerApi,
}: WorkflowRequirementsPanelProps) {
  const baseUrl = comfyuiUrl?.trim() || getComfyUIBaseUrl();
  const manager = managerApi;
  const [requirementsTab, setRequirementsTab] = useState<'nodes' | 'models'>('nodes');
  const [inferredMissingPacks, setInferredMissingPacks] = useState<MissingPackInfo[]>([]);
  const [managerNodeListWarning, setManagerNodeListWarning] = useState<string | null>(null);
  const [isDownloadingMissingModels, setIsDownloadingMissingModels] = useState(false);

  const mergedDetectedPacks = useMemo(() => {
    const out: DetectedPack[] = [...detectedPacks];
    const known = new Set(detectedPacks.map((p) => (p.reference || p.packTitle).trim().toLowerCase()));

    for (const inferred of inferredMissingPacks) {
      const key = (inferred.reference || inferred.packTitle).trim().toLowerCase();
      if (!key || known.has(key)) continue;
      out.push({
        packId: `inferred-${inferred.packTitle.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`,
        packTitle: inferred.packTitle,
        author: 'Unknown',
        reference: inferred.reference || '',
        nodeTypesUsed: inferred.missingNodes,
        isPinned: false,
        isLearned: false,
        installCommand: inferred.reference ? `git clone ${inferred.reference}` : '',
        stars: 0,
      });
      known.add(key);
    }

    return out;
  }, [detectedPacks, inferredMissingPacks]);

  const workflowNodeKey = useMemo(() => {
    if (!workflow) return '';
    const source = Array.isArray((workflow as any).nodes)
      ? (workflow as any).nodes
      : Object.values(workflow as Record<string, any>);
    const types = source
      .map((n: any) => n?.class_type || n?.type)
      .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
    return types.join(',');
  }, [workflow]);

  const detectedPackInputs = useMemo(
    () => mergedDetectedPacks.map((p) => ({
      name: p.packTitle,
      reference: p.reference,
      nodeTypes: p.nodeTypesUsed,
    })),
    [mergedDetectedPacks],
  );

  const packStatus = usePackInstallationStatus({
    comfyuiUrl: baseUrl,
    detectedPacks: detectedPackInputs,
    enabled: mergedDetectedPacks.length > 0,
  });

  useEffect(() => {
    if (!workflowNodeKey) {
      setInferredMissingPacks([]);
      setManagerNodeListWarning(manager.managerAvailable ? getManagerNodeListStatus(baseUrl).warning : null);
      return;
    }
    let cancelled = false;
    const minimalWorkflow = {
      nodes: workflowNodeKey.split(',').map((type) => ({ type })),
    };

    detectMissingPacks(baseUrl, minimalWorkflow, {
      includeManagerLookup: manager.managerAvailable,
    })
      .then((missing) => {
        if (cancelled) return;
        setInferredMissingPacks(missing);
        setManagerNodeListWarning(manager.managerAvailable ? getManagerNodeListStatus(baseUrl).warning : null);
      })
      .catch(() => {
        if (cancelled) return;
        setInferredMissingPacks([]);
        setManagerNodeListWarning(manager.managerAvailable ? getManagerNodeListStatus(baseUrl).warning : null);
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, workflowNodeKey, manager.managerAvailable]);

  useEffect(() => {
    if (!manager.managerAvailable) {
      setManagerNodeListWarning(null);
      return;
    }
    setManagerNodeListWarning(getManagerNodeListStatus(baseUrl).warning);
  }, [baseUrl, manager.managerAvailable]);

  const requiredModels = useRequiredModels({
    workflowJson: (workflow as unknown as Record<string, any>) || null,
    comfyuiUrl: baseUrl,
    enabled: !!workflow,
  });
  const refreshPackInstallStatus = packStatus.refresh;
  const refreshRequiredModels = requiredModels.refresh;
  const missingModels = requiredModels.missingModels;
  const downloadableMissingModels = useMemo(
    () => missingModels.filter((model) => !!requiredModels.sources.get(model.filename)?.downloadUrl),
    [missingModels, requiredModels.sources],
  );

  const normalizeSearchTerm = useCallback((filename: string) => (
    filename.replace(/\.(safetensors|ckpt|pth|pt|bin|onnx|gguf)$/i, '')
  ), []);

  const handleDownloadAllMissing = useCallback(async () => {
    if (missingModels.length === 0) return;
    if (!manager.managerAvailable) {
      toast.error('ComfyUI-Manager is required for one-click downloads.');
      return;
    }
    if (downloadableMissingModels.length === 0) {
      toast.warning('No direct download URLs available. Use search links for manual download.');
      return;
    }

    setIsDownloadingMissingModels(true);
    try {
      const hfToken = localStorage.getItem('huggingface-api-key') || huggingfaceApiKey || '';
      const civitaiKey = localStorage.getItem('civitai-api-key') || civitaiApiKey || '';
      let started = 0;

      for (const model of downloadableMissingModels) {
        const source = requiredModels.sources.get(model.filename);
        if (!source?.downloadUrl) continue;
        const ok = await manager.installModel(
          baseUrl,
          source.downloadUrl,
          model.modelFolder,
          model.filename,
          {
            huggingfaceToken: hfToken,
            civitaiApiKey: civitaiKey,
          },
        );
        if (ok) started += 1;
      }

      if (started > 0) {
        toast.success(`Started ${started} model download${started === 1 ? '' : 's'}.`);
      } else {
        toast.error(manager.error || 'Failed to start model downloads.');
      }
      refreshRequiredModels();
    } finally {
      setIsDownloadingMissingModels(false);
    }
  }, [
    missingModels.length,
    downloadableMissingModels,
    manager,
    huggingfaceApiKey,
    civitaiApiKey,
    requiredModels.sources,
    refreshRequiredModels,
    baseUrl,
  ]);

  useEffect(() => {
    if (!manager.managerAvailable) return;
    let lastRefreshAt = 0;
    return subscribeComfyUIStatus((event) => {
      if (event.baseUrl !== baseUrl) return;
      if (event.phase !== 'manager-node-list-updated' && event.phase !== 'online') return;

      const now = Date.now();
      if (now - lastRefreshAt < 1200) return;
      lastRefreshAt = now;

      refreshPackInstallStatus();
      refreshRequiredModels();
    });
  }, [
    baseUrl,
    manager.managerAvailable,
    refreshPackInstallStatus,
    refreshRequiredModels,
  ]);

  const installEverything = useInstallEverything({
    missingPacks: packStatus.missingPacks,
    missingModels: requiredModels.missingModels,
    modelSources: requiredModels.sources,
    comfyuiUrl: baseUrl,
    installPackFn: manager.installPack,
    installModelFn: (url, sourceUrl, modelDir, filename) => {
      const hfToken = localStorage.getItem('huggingface-api-key') || huggingfaceApiKey || '';
      const civitaiKey = localStorage.getItem('civitai-api-key') || civitaiApiKey || '';
      return manager.installModel(url, sourceUrl, modelDir, filename, {
        huggingfaceToken: hfToken,
        civitaiApiKey: civitaiKey,
      });
    },
    rebootFn: manager.rebootComfyUI,
    recheckManager: manager.recheckManager,
    onRefreshAll: () => {
      void manager.recheckManager();
      refreshPackInstallStatus();
      refreshRequiredModels();
    },
  });

  const ready =
    packStatus.checkSucceeded &&
    !requiredModels.checkFailed &&
    packStatus.missingPacks.length === 0 &&
    requiredModels.missingModels.length === 0;

  const missingNodeCount = useMemo(
    () => new Set(packStatus.missingPacks.flatMap((pack) => pack.missingNodes)).size,
    [packStatus.missingPacks],
  );
  const installedPackCount = packStatus.installedPacks.length;
  const missingSummary = `${missingNodeCount} node${missingNodeCount === 1 ? '' : 's'} + ${requiredModels.missingModels.length} model${requiredModels.missingModels.length === 1 ? '' : 's'}`;
  const anyMissing = missingNodeCount > 0 || requiredModels.missingModels.length > 0;
  const hasAttention = anyMissing || !packStatus.checkSucceeded || requiredModels.checkFailed;
  const [isCollapsed, setIsCollapsed] = useState(!hasAttention);

  useEffect(() => {
    if (hasAttention) {
      setIsCollapsed(false);
      return;
    }
    setIsCollapsed(true);
  }, [hasAttention]);

  if (!workflow || (mergedDetectedPacks.length === 0 && requiredModels.models.length === 0 && modelSlots.length === 0)) return null;

  if (isCollapsed) {
    return (
      <div className="mt-3 rounded-lg border border-accent/20 bg-accent-muted overflow-hidden">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-content-muted hover:text-content-primary transition-colors"
        >
          <div className="flex items-center gap-1.5">
            {hasAttention ? (
              <XCircle className="w-3 h-3 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            )}
            <span>Workflow Requirements</span>
            <span className={hasAttention ? 'text-state-warning' : 'text-state-success'}>
              {hasAttention ? `- ${missingSummary}` : '- All OK'}
            </span>
          </div>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-accent/20 bg-accent-muted overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-accent/10">
        <div className="flex items-center justify-between">
          <div className="text-xs text-content-primary inline-flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-accent-text" />
            Workflow Requirements
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                void manager.recheckManager();
                refreshPackInstallStatus();
                refreshRequiredModels();
              }}
              className="text-[10px] px-2 py-1 rounded border border-border-default text-content-primary hover:bg-surface-secondary"
            >
              Refresh All
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded text-content-faint hover:text-content-secondary transition-colors"
              title="Minimize"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="mt-1 text-[10px] text-content-secondary">
          {missingNodeCount} missing node{missingNodeCount === 1 ? '' : 's'} - {installedPackCount} installed pack{installedPackCount === 1 ? '' : 's'} . {requiredModels.models.length} models ({requiredModels.missingModels.length} missing{requiredModels.totalMissingSize > 0 ? `, ~${requiredModels.totalMissingSizeFormatted}` : ''})
        </div>
      </div>

      <div className="px-3.5 py-2 space-y-2">
        {!packStatus.checkSucceeded || requiredModels.checkFailed ? (
          <div className="rounded border border-red-500/25 bg-red-500/10 p-2 text-[11px] text-red-200 inline-flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5" />
            Cannot verify requirements - ComfyUI is offline.
          </div>
        ) : ready ? (
          <div className="rounded border border-emerald-500/25 bg-emerald-500/10 p-2">
            <div className="text-[11px] text-emerald-200 inline-flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Workflow Ready - All requirements satisfied
            </div>
            {onExecuteWorkflow && (
              <button
                onClick={onExecuteWorkflow}
                className="mt-2 rounded border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-1 text-[10px] text-emerald-100 hover:bg-emerald-500/30"
              >
                Execute Workflow
              </button>
            )}
          </div>
        ) : (
          <div className="rounded border border-amber-500/25 bg-amber-500/10 p-2 text-[11px] text-amber-200">
            Workflow Not Ready - {missingSummary} missing
          </div>
        )}

        {anyMissing && (
          <div className="rounded border border-accent/25 bg-accent-muted p-2">
            <button
              onClick={() => void installEverything.installEverything()}
              className="w-full rounded border border-accent/30 bg-accent-muted px-3 py-2 text-xs text-accent-text hover:bg-accent-muted/80 inline-flex items-center justify-center gap-2"
              disabled={
                (installEverything.phase !== 'idle' && installEverything.phase !== 'done') ||
                !packStatus.checkSucceeded ||
                requiredModels.checkFailed ||
                !manager.managerAvailable
              }
            >
              <Rocket className="w-3.5 h-3.5" />
              Install & Download Everything Missing
            </button>
            <p className="mt-1 text-[10px] text-content-secondary">
              {missingSummary}{requiredModels.totalMissingSize > 0 ? ` (~${requiredModels.totalMissingSizeFormatted})` : ''}
            </p>
            {!manager.managerAvailable && (
              <p className="mt-1 text-[10px] text-amber-300">
                Requires ComfyUI-Manager for one-click install/download. Install: https://github.com/ltdrdata/ComfyUI-Manager
              </p>
            )}
            {installEverything.phase === 'installing_packs' && (
              <p className="mt-1 text-[10px] text-blue-300">
                Installing packs: {installEverything.packProgress.current}/{installEverything.packProgress.total} {installEverything.packProgress.name}
              </p>
            )}
            {installEverything.phase === 'restarting' && (
              <p className="mt-1 text-[10px] text-blue-300 inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Restarting ComfyUI... waiting for server
              </p>
            )}
            {installEverything.phase === 'downloading_models' && (
              <p className="mt-1 text-[10px] text-blue-300">
                Downloading models: {installEverything.modelProgress.current}/{installEverything.modelProgress.total} {installEverything.modelProgress.name}
              </p>
            )}
            {installEverything.phase === 'error' && installEverything.currentAction && (
              <p className="mt-1 text-[10px] text-red-300">
                {installEverything.currentAction}
              </p>
            )}
            {installEverything.phase === 'done' && installEverything.currentAction && (
              <p className="mt-1 text-[10px] text-emerald-300">
                {installEverything.currentAction}
              </p>
            )}
            {installEverything.currentAction && installEverything.phase !== 'done' && installEverything.phase !== 'error' && (
              <p className="mt-1 text-[10px] text-content-primary">
                {installEverything.currentAction}
              </p>
            )}
          </div>
        )}

        {manager.managerAvailable && managerNodeListWarning && (
          <div className="rounded border border-amber-500/25 bg-amber-500/10 p-2 text-[10px] text-amber-200">
            {managerNodeListWarning}
          </div>
        )}

        <div className="rounded border border-border-default bg-surface-secondary p-1">
          <div className="flex items-center gap-1 rounded bg-surface-inset p-1">
            <button
              onClick={() => setRequirementsTab('nodes')}
              className={`flex-1 rounded px-2.5 py-1.5 text-[11px] transition-colors ${requirementsTab === 'nodes' ? 'bg-surface-elevated text-content-primary border border-border-default' : 'text-content-muted hover:text-content-primary'}`}
            >
              {missingNodeCount > 0 ? `Nodes (${missingNodeCount} missing)` : 'Nodes OK'}
            </button>
            <button
              onClick={() => setRequirementsTab('models')}
              className={`flex-1 rounded px-2.5 py-1.5 text-[11px] transition-colors ${requirementsTab === 'models' ? 'bg-surface-elevated text-content-primary border border-border-default' : 'text-content-muted hover:text-content-primary'}`}
            >
              Models ({requiredModels.models.length})
              {requiredModels.missingModels.length > 0 && (
                <span className="ml-1 text-state-warning">[{requiredModels.missingModels.length} missing]</span>
              )}
            </button>
          </div>

          {requirementsTab === 'nodes' ? (
            <div className="px-1 pb-1">
              <DetectedPacksCard
                detectedPacks={mergedDetectedPacks}
                comfyuiUrl={baseUrl}
                managerAvailable={manager.managerAvailable}
                installPackFn={manager.installPack}
                rebootFn={manager.rebootComfyUI}
                isPinned={isPinned}
                onPinPack={onPinPack}
                onUnpinPack={onUnpinPack}
                onPinMultiple={onPinMultiple}
                onLearnPack={onLearnPack}
                learnedPackIds={learnedPackIds}
                learningPackId={learningPackId}
                installationStatuses={packStatus.statuses}
                isCheckingInstallation={packStatus.isChecking}
                installationCheckSucceeded={packStatus.checkSucceeded}
                onRefreshInstallation={packStatus.refresh}
                managerNodeListWarning={managerNodeListWarning}
              />
            </div>
          ) : (
            <div className="px-2 pb-2 pt-1 space-y-2">
              <div className="flex items-center justify-end px-1">
                <button
                  onClick={refreshRequiredModels}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border-default text-content-primary hover:bg-surface-secondary"
                  title="Refresh model checks"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>

              {requiredModels.checkFailed && (
                <div className="rounded border border-amber-500/25 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                  Unable to verify model availability right now. Showing best-effort results.
                </div>
              )}

              {missingModels.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-400/90">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All {requiredModels.models.length} models available</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-400/90">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {missingModels.length} missing model{missingModels.length > 1 ? 's' : ''}
                      {requiredModels.totalMissingSize > 0 ? ` (~${requiredModels.totalMissingSizeFormatted})` : ''}
                    </span>
                  </div>

                  <div className="space-y-2 px-3 pb-1">
                    {missingModels.map((model) => {
                      const source = requiredModels.sources.get(model.filename);
                      const hasDirectDownload = !!source?.downloadUrl;
                      const term = normalizeSearchTerm(model.filename);
                      return (
                        <div
                          key={`${model.modelType}-${model.filename}`}
                          className="p-2.5 rounded-lg bg-surface-secondary border border-border-subtle"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="text-sm text-content-primary font-mono truncate" title={model.filename}>
                              {model.filename}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-content-muted border border-border-subtle">
                              {model.modelType}
                            </span>
                          </div>

                          {source && source.source !== 'not_found' && (
                            <div className="mt-1.5 text-xs text-content-muted">
                              <span>Source: {source.source}</span>
                              {source.fileSizeFormatted && <span>{` - ${source.fileSizeFormatted}`}</span>}
                            </div>
                          )}

                          {source?.downloadUrl && (
                            <div className="mt-1.5">
                              <a
                                href={source.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-accent-text hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Download from {source.source}
                              </a>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <a
                              href={`https://civitai.com/search/models?sortBy=Highest_Rated&query=${encodeURIComponent(term)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-border-subtle text-content-muted hover:text-content-secondary hover:border-border-default transition-colors"
                            >
                              <Search className="w-3 h-3" />
                              Search CivitAI
                            </a>
                            <a
                              href={`https://huggingface.co/models?search=${encodeURIComponent(term)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-border-subtle text-content-muted hover:text-content-secondary hover:border-border-default transition-colors"
                            >
                              <Search className="w-3 h-3" />
                              Search HuggingFace
                            </a>
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(`${term} safetensors download`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-border-subtle text-content-muted hover:text-content-secondary hover:border-border-default transition-colors"
                            >
                              <Search className="w-3 h-3" />
                              Search Google
                            </a>
                          </div>

                          {!hasDirectDownload && (
                            <div className="mt-1.5 text-[10px] text-amber-300/90">
                              No direct download URL found. Use search links above.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-3 pb-2">
                    <button
                      onClick={() => void handleDownloadAllMissing()}
                      disabled={isDownloadingMissingModels || !manager.managerAvailable || downloadableMissingModels.length === 0}
                      className="w-full py-2 rounded-lg bg-accent-muted hover:bg-accent-muted/80 text-accent-text text-xs border border-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                      title={downloadableMissingModels.length === 0 ? 'No direct download URLs available for current missing models' : undefined}
                    >
                      {isDownloadingMissingModels ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Download All Missing ({missingModels.length} model{missingModels.length > 1 ? 's' : ''})
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});



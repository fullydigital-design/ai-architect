import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Globe,
  HardDrive,
  Loader2,
  Package,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ComfyUIWorkflow } from '../../../types/comfyui';
import type { WorkflowAnalysis } from '../../../services/workflow-analyzer';
import {
  buildDefaultConfig,
  downloadDeploymentPackage,
  type DeploymentPackageConfig,
} from '../../../services/deployment-package-generator';
import { lookupKnownModel } from '../../../data/known-models-db';

interface DeploymentPackageDialogProps {
  workflow: ComfyUIWorkflow;
  analysis: WorkflowAnalysis;
  onClose: () => void;
}

export function DeploymentPackageDialog({
  workflow,
  analysis,
  onClose,
}: DeploymentPackageDialogProps) {
  const [config, setConfig] = useState<DeploymentPackageConfig>(() => buildDefaultConfig(analysis));
  const [generating, setGenerating] = useState(false);
  const [showPacks, setShowPacks] = useState(true);
  const [showModels, setShowModels] = useState(true);

  const modelStats = useMemo(() => {
    const known = config.modelOverrides.filter((item) => {
      const model = lookupKnownModel(item.filename);
      return Boolean(model?.downloadUrl || item.downloadUrl);
    }).length;
    return {
      total: config.modelOverrides.length,
      known,
      manual: Math.max(config.modelOverrides.length - known, 0),
    };
  }, [config.modelOverrides]);

  const updateModelUrl = useCallback((index: number, url: string) => {
    setConfig((prev) => ({
      ...prev,
      modelOverrides: prev.modelOverrides.map((item, itemIndex) => (
        itemIndex === index ? { ...item, downloadUrl: url } : item
      )),
    }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await downloadDeploymentPackage(workflow, analysis, config);
      toast.success('Deployment package downloaded');
      onClose();
    } catch (error: any) {
      console.error('[DeploymentPackage] Failed to generate package', error);
      toast.error(`Failed to generate package: ${error?.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  }, [workflow, analysis, config, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Archive className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm text-white">Export Deployment Package</h2>
              <p className="mt-0.5 text-xs text-zinc-500">workflow.json + setup_workflow.bat + README.txt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">Workflow Name</label>
            <input
              type="text"
              value={config.workflowName}
              onChange={(event) => setConfig((prev) => ({ ...prev, workflowName: event.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500/50"
              placeholder="My Workflow"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">Description (optional)</label>
            <input
              type="text"
              value={config.description || ''}
              onChange={(event) => setConfig((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500/50"
              placeholder="Workflow setup package"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2 text-xs text-zinc-400">
            <span>{analysis.totalNodes} nodes</span>
            <span className="h-4 w-px bg-zinc-700" />
            <span>{analysis.detectedPacks.length} packs</span>
            <span className="h-4 w-px bg-zinc-700" />
            <span>
              {modelStats.total} models
              {modelStats.known > 0 ? <span className="ml-1 text-emerald-400">({modelStats.known} auto)</span> : null}
              {modelStats.manual > 0 ? <span className="ml-1 text-amber-400">({modelStats.manual} manual)</span> : null}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <button
              onClick={() => setShowPacks((prev) => !prev)}
              className="flex w-full items-center justify-between bg-zinc-800/50 px-3 py-2.5 transition-colors hover:bg-zinc-800"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Package className="h-3.5 w-3.5 text-violet-400" />
                <span>Custom Node Packs ({analysis.detectedPacks.length})</span>
              </div>
              {showPacks ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
            </button>

            {showPacks ? (
              <div className="divide-y divide-zinc-800/60">
                {analysis.detectedPacks.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-zinc-500">No custom packs detected.</div>
                ) : (
                  analysis.detectedPacks.map((pack) => (
                    <div key={pack.packId} className="flex items-center justify-between px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs text-white">{pack.packTitle}</div>
                        <div className="text-[11px] text-zinc-500">by {pack.author}</div>
                      </div>
                      {pack.reference ? (
                        <a
                          href={pack.reference}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-zinc-500 transition-colors hover:text-zinc-300"
                          title="Open repository"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          {config.modelOverrides.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              <button
                onClick={() => setShowModels((prev) => !prev)}
                className="flex w-full items-center justify-between bg-zinc-800/50 px-3 py-2.5 transition-colors hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <HardDrive className="h-3.5 w-3.5 text-amber-400" />
                  <span>Models ({modelStats.total})</span>
                  {modelStats.manual > 0 ? (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">{modelStats.manual} need URL</span>
                  ) : null}
                </div>
                {showModels ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
              </button>

              {showModels ? (
                <div className="divide-y divide-zinc-800/60">
                  {config.modelOverrides.map((item, index) => {
                    const known = lookupKnownModel(item.filename);
                    const hasUrl = Boolean(known?.downloadUrl || item.downloadUrl);
                    const basename = item.filename.includes('\\') ? item.filename.split('\\').pop() : item.filename.split('/').pop();
                    const label = basename || item.filename;

                    return (
                      <div key={`${item.filename}-${index}`} className="space-y-1.5 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {hasUrl ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          )}
                          <span className="truncate text-xs text-white">{label}</span>
                          {known?.size ? <span className="text-[10px] text-zinc-500">{known.size}</span> : null}
                          {known?.source ? <span className="ml-auto text-[10px] text-zinc-600">{known.source}</span> : null}
                        </div>

                        {known?.downloadUrl ? (
                          <div className="flex items-center gap-2 pl-5 text-[10px] text-zinc-500">
                            <Globe className="h-3 w-3 text-emerald-500/70" />
                            <span className="truncate">{known.downloadUrl}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pl-5">
                            <Globe className="h-3 w-3 shrink-0 text-zinc-500" />
                            <input
                              type="url"
                              value={item.downloadUrl}
                              onChange={(event) => updateModelUrl(index, event.target.value)}
                              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/50"
                              placeholder="Paste model download URL (optional)"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={config.includeModels}
                onChange={(event) => setConfig((prev) => ({ ...prev, includeModels: event.target.checked }))}
              />
              Include model downloads
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={config.includePipDeps}
                onChange={(event) => setConfig((prev) => ({ ...prev, includePipDeps: event.target.checked }))}
              />
              Include pip dependencies
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
          <div className="text-[10px] text-zinc-600">Package includes workflow + setup script + docs</div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !config.workflowName.trim()}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-600/20 px-4 py-1.5 text-xs text-violet-300 transition-colors hover:bg-violet-600/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Download .zip
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

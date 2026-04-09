import { lazy, Suspense, useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
  Archive,
  Download,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Package,
  Terminal,
  ExternalLink,
  ChevronDown,
  X,
  Wand2,
  Loader2,
  Upload,
  Search,
  Play,
  Square,
  FlaskConical,
  Undo2,
  Redo2,
  BookmarkPlus,
  MoreHorizontal,
  Spline,
  LayoutGrid,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ComfyUIWorkflow, RequiredNode, ValidationResult } from '../../../types/comfyui';
import type { WorkflowAnalysis } from '../../../services/workflow-analyzer';
import { exportGraphFormat, exportAPIFormat, exportInstallScript, exportEnhancedGraphFormat, downloadFile, copyToClipboard } from '../../../utils/comfyui-export';
import { validateWorkflow } from '../../../services/workflow-validator';
import { extractWorkflowMetadata } from '../../../services/workflow-metadata-extractor';
import { injectWorkflowNote } from '../../../services/workflow-note-injector';

const DeploymentPackageDialog = lazy(() =>
  import('./DeploymentPackageDialog').then((module) => ({ default: module.DeploymentPackageDialog })),
);

interface WorkflowActionsProps {
  workflow: ComfyUIWorkflow | null;
  requiredNodes: RequiredNode[];
  onRequestFix?: (workflow: ComfyUIWorkflow, validation: ValidationResult) => void;
  onImportWorkflow?: (file: File) => void;
  onOpenNodesBrowser?: () => void;
  isLoading?: boolean;
  /** ComfyUI backend connection state */
  comfyuiConnected?: boolean;
  isExecuting?: boolean;
  onExecute?: () => void;
  onCancelExecution?: () => void;
  /** Phase 5: Open experiment panel */
  onOpenExperiment?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoLabel?: string | null;
  redoLabel?: string | null;
  onUndo?: () => void;
  onRedo?: () => void;
  workflowAnalysis?: WorkflowAnalysis | null;
  onSaveAsTemplate?: () => void;
  onSaveToComfyUI?: (targetPath: string) => Promise<void> | void;
  comfyuiWorkflowSubfolders?: string[];
}

const NEW_COMFYUI_FOLDER_OPTION = '__create_new_folder__';

export function WorkflowActions({
  workflow,
  requiredNodes,
  onRequestFix,
  onImportWorkflow,
  onOpenNodesBrowser,
  isLoading,
  comfyuiConnected,
  isExecuting,
  onExecute,
  onCancelExecution,
  onOpenExperiment,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  workflowAnalysis,
  onSaveAsTemplate,
  onSaveToComfyUI,
  comfyuiWorkflowSubfolders = [],
}: WorkflowActionsProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showNodes, setShowNodes] = useState(false);
  const [showDeploymentDialog, setShowDeploymentDialog] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSaveComfyDialog, setShowSaveComfyDialog] = useState(false);
  const [comfyuiFilename, setComfyuiFilename] = useState('');
  const [comfyuiSubfolder, setComfyuiSubfolder] = useState('');
  const [creatingComfyuiSubfolder, setCreatingComfyuiSubfolder] = useState(false);
  const [newComfyuiSubfolder, setNewComfyuiSubfolder] = useState('');
  const [isSavingToComfyUI, setIsSavingToComfyUI] = useState(false);
  const [exportFormat, setExportFormat] = useState<'graph' | 'api'>('graph');
  const [wireStyleLabel, setWireStyleLabel] = useState<'bezier' | 'straight' | 'step'>('bezier');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const quickValidation = useMemo(
    () => (workflow ? validateWorkflow(workflow) : null),
    [workflow],
  );

  const hasValidationIssues = quickValidation ? !quickValidation.isValid : false;

  useEffect(() => {
    const loadWireStyle = () => {
      const saved = localStorage.getItem('graph-wire-style');
      if (saved === 'bezier' || saved === 'straight' || saved === 'step') {
        setWireStyleLabel(saved);
      }
    };
    loadWireStyle();
    const handleStyleChange = () => loadWireStyle();
    window.addEventListener('workflow-wire-style-changed', handleStyleChange);
    return () => {
      window.removeEventListener('workflow-wire-style-changed', handleStyleChange);
    };
  }, []);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!moreMenuRef.current) return;
      if (!moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showMoreMenu]);

  const dispatchCanvasEvent = useCallback((name: string) => {
    window.dispatchEvent(new CustomEvent(name));
  }, []);

  const getDefaultComfyUIFilename = useCallback((): string => {
    const stamp = new Date().toISOString().slice(0, 10);
    return `workflow-${stamp}`;
  }, []);

  const prepareWorkflowForExport = (): ComfyUIWorkflow | null => {
    if (!workflow) return null;
    const cloned = typeof structuredClone === 'function'
      ? structuredClone(workflow)
      : JSON.parse(JSON.stringify(workflow)) as ComfyUIWorkflow;
    const metadata = extractWorkflowMetadata(cloned, 'Workflow Export', 'Exported from Workflow Architect');
    return injectWorkflowNote(cloned, metadata) as ComfyUIWorkflow;
  };

  const handleValidate = () => {
    if (!workflow) return;
    const result = validateWorkflow(workflow);
    setValidation(result);
    setShowValidation(true);
    if (result.isValid) {
      toast.success('Workflow is valid!');
    } else {
      toast.error(`Found ${result.errors.length} error(s)`);
    }
  };

  const handleDownload = () => {
    const exportWorkflow = prepareWorkflowForExport();
    if (!exportWorkflow) return;
    if (exportFormat === 'graph') {
      // Use enhanced export with manager hints + placeholders
      const content = exportEnhancedGraphFormat(exportWorkflow, requiredNodes);
      downloadFile(content, 'workflow.json');
    } else {
      const content = exportAPIFormat(exportWorkflow);
      downloadFile(content, 'workflow-api.json');
    }
    toast.success(`Downloaded ${exportFormat === 'graph' ? 'workflow.json' : 'workflow-api.json'}`);
  };

  const handleCopy = async () => {
    const exportWorkflow = prepareWorkflowForExport();
    if (!exportWorkflow) return;
    if (exportFormat === 'graph') {
      const content = exportEnhancedGraphFormat(exportWorkflow, requiredNodes);
      await copyToClipboard(content);
    } else {
      const content = exportAPIFormat(exportWorkflow);
      await copyToClipboard(content);
    }
    toast.success('Copied to clipboard');
  };

  const handleCopyInstall = async () => {
    const script = exportInstallScript(requiredNodes);
    await copyToClipboard(script);
    toast.success('Install commands copied');
  };

  const handleAskFix = () => {
    if (workflow && validation && !validation.isValid && onRequestFix) {
      onRequestFix(workflow, validation);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleOpenSaveToComfyUI = useCallback(() => {
    setComfyuiFilename(getDefaultComfyUIFilename());
    setComfyuiSubfolder(comfyuiWorkflowSubfolders[0] || '');
    setCreatingComfyuiSubfolder(false);
    setNewComfyuiSubfolder('');
    setShowSaveComfyDialog(true);
  }, [comfyuiWorkflowSubfolders, getDefaultComfyUIFilename]);

  const newComfyuiSubfolderError = useMemo(() => {
    if (!creatingComfyuiSubfolder) return null;
    const candidate = newComfyuiSubfolder.trim();
    if (!candidate) return 'Enter a folder name.';
    if (/[\\/]/.test(candidate)) return 'Folder name cannot contain slashes.';
    if (!/^[a-zA-Z0-9 _.-]+$/.test(candidate)) {
      return 'Use only letters, numbers, spaces, dot, underscore, or dash.';
    }
    return null;
  }, [creatingComfyuiSubfolder, newComfyuiSubfolder]);

  const handleConfirmSaveToComfyUI = useCallback(async () => {
    if (!onSaveToComfyUI) return;
    const filename = comfyuiFilename.trim();
    if (!filename) {
      toast.error('Enter a filename');
      return;
    }

    let normalizedSubfolder = comfyuiSubfolder.trim().replace(/^\/+|\/+$/g, '');
    if (creatingComfyuiSubfolder) {
      const candidate = newComfyuiSubfolder.trim();
      if (!candidate) {
        toast.error('Enter a folder name');
        return;
      }
      if (/[\\/]/.test(candidate)) {
        toast.error('Folder name cannot contain slashes');
        return;
      }
      if (!/^[a-zA-Z0-9 _.-]+$/.test(candidate)) {
        toast.error('Folder name contains invalid characters');
        return;
      }
      normalizedSubfolder = candidate;
    }

    const targetPath = normalizedSubfolder ? `${normalizedSubfolder}/${filename}` : filename;

    try {
      setIsSavingToComfyUI(true);
      await onSaveToComfyUI(targetPath);
      setShowSaveComfyDialog(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save to ComfyUI');
    } finally {
      setIsSavingToComfyUI(false);
    }
  }, [comfyuiFilename, comfyuiSubfolder, creatingComfyuiSubfolder, newComfyuiSubfolder, onSaveToComfyUI]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportWorkflow) {
      onImportWorkflow(file);
    }
    // Reset so same file can be re-imported
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

            {/* Main action bar */}
      <div className="flex items-center justify-between gap-1.5 px-3 py-2 bg-surface-200 border-t border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-surface-2/80 hover:bg-surface-3 text-text-secondary text-xs border border-border-default/70 hover:border-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={undoLabel || 'Nothing to undo'}
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-surface-2/80 hover:bg-surface-3 text-text-secondary text-xs border border-border-default/70 hover:border-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={redoLabel || 'Nothing to redo'}
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-5 bg-border mx-0.5" />

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleImportClick}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-200 hover:bg-accent text-muted-foreground hover:text-foreground text-xs border border-border transition-colors disabled:opacity-40"
            title="Import a ComfyUI workflow JSON (Graph or API format)"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>

          <button
            onClick={handleDownload}
            disabled={!workflow}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs transition-colors disabled:opacity-40"
            title="Download workflow"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>

          {workflow && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-200 hover:bg-accent text-muted-foreground hover:text-foreground text-xs border border-border transition-colors"
              title="Copy workflow JSON to clipboard (paste into ComfyUI)"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          )}

          {onSaveToComfyUI && (
            <button
              onClick={handleOpenSaveToComfyUI}
              disabled={!workflow}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-200 hover:bg-accent text-muted-foreground hover:text-foreground text-xs border border-border transition-colors disabled:opacity-40"
              title="Save current workflow"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}

          {comfyuiConnected && (
            isExecuting ? (
              <button
                onClick={onCancelExecution}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-red-600/80 hover:bg-red-500/80 text-white text-xs transition-colors"
                title="Cancel execution"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop
              </button>
            ) : (
              <button
                onClick={onExecute}
                disabled={isLoading || !workflow}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition-colors disabled:opacity-40"
                title="Execute workflow on your local ComfyUI"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run
              </button>
            )
          )}

          {onOpenExperiment && (
            <button
              onClick={onOpenExperiment}
              disabled={isLoading || !workflow}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/15 hover:bg-primary/25 text-primary text-xs border border-primary/20 hover:border-primary/30 transition-colors disabled:opacity-40"
              title="Run parameter sweep experiments"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Experiment
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {workflow && (
            <span className={`text-[11px] ${hasValidationIssues ? 'text-state-warning/80' : 'text-state-success/80'}`}>
              {'\u25CF'} {hasValidationIssues ? 'Issues' : 'Valid'}
            </span>
          )}

          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-surface-2 hover:bg-surface-3 text-text-secondary border border-border-default/70 transition-colors"
              title="More actions"
              aria-label="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-surface-1 border border-border-default rounded-sm shadow-xl py-1 min-w-[190px] z-30">
                <button
                  onClick={() => {
                    onOpenNodesBrowser?.();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-xs border border-emerald-500/20 hover:border-emerald-500/30 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Browse Nodes
                  </button>
                <button
                  onClick={() => {
                    dispatchCanvasEvent('workflow-cycle-wire-style');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 flex items-center gap-2"
                >
                  <Spline className="w-3.5 h-3.5" />
                  Wire Style: {wireStyleLabel === 'bezier' ? 'Bezier' : wireStyleLabel === 'straight' ? 'Straight' : 'Step'}
                </button>
                <button
                  onClick={() => {
                    dispatchCanvasEvent('workflow-smart-layout');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 flex items-center gap-2"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Layout + Fit
                </button>
                <button
                  onClick={() => {
                    dispatchCanvasEvent('workflow-undo-optimization');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 flex items-center gap-2"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo Optimize
                </button>

                <hr className="my-1 h-px border-0 bg-border-strong" />

                <button
                  onClick={async () => {
                    await handleCopy();
                    setShowMoreMenu(false);
                  }}
                  disabled={!workflow}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 flex items-center gap-2 disabled:opacity-40"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Workflow
                </button>
                <button
                  onClick={() => {
                    handleValidate();
                    setShowMoreMenu(false);
                  }}
                  disabled={!workflow}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 flex items-center gap-2 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Validate
                </button>
                {onSaveAsTemplate && (
                  <button
                    onClick={() => {
                      onSaveAsTemplate();
                      setShowMoreMenu(false);
                    }}
                    disabled={!workflow}
                    className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 flex items-center gap-2 disabled:opacity-40"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Save Template
                  </button>
                )}
                {workflowAnalysis && workflowAnalysis.detectedPacks.length > 0 && (
                  <button
                    onClick={() => {
                      setShowDeploymentDialog(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 flex items-center gap-2"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Export Package
                  </button>
                )}
                {requiredNodes.length > 0 && (
                  <button
                    onClick={() => {
                      setShowNodes((prev) => !prev);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-accent-text hover:bg-surface-2 flex items-center gap-2"
                  >
                    <Package className="w-3.5 h-3.5" />
                    {requiredNodes.length} Custom Node{requiredNodes.length > 1 ? 's' : ''}
                    <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showNodes ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {workflow && (
                  <>
                    <hr className="my-1 h-px border-0 bg-border-strong" />
                    <div className="mx-1 flex items-center bg-surface-300 rounded-md p-0.5">
                      <button
                        onClick={() => setExportFormat('graph')}
                        className={`${
                          exportFormat === 'graph'
                            ? 'px-2 py-1 rounded text-[10px] bg-primary/15 text-primary transition-colors'
                            : 'px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors'
                        }`}
                      >
                        Graph
                      </button>
                      <button
                        onClick={() => setExportFormat('api')}
                        className={`${
                          exportFormat === 'api'
                            ? 'px-2 py-1 rounded text-[10px] bg-primary/15 text-primary transition-colors'
                            : 'px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors'
                        }`}
                      >
                        API
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Validation results */}
      {showValidation && validation && (
        <div className="mx-3 mb-2 p-3 rounded-lg bg-surface-200 border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-xs ${validation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                {validation.isValid
                  ? 'Workflow is valid'
                  : `${validation.errors.length} error(s) found`
                }
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Ask AI to Fix button */}
              {!validation.isValid && onRequestFix && (
                <button
                  onClick={handleAskFix}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-[11px] transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  {isLoading ? 'Fixing...' : 'Ask AI to Fix'}
                </button>
              )}
              <button onClick={() => setShowValidation(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {validation.errors.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
              {validation.errors.map((err, i) => (
                <div key={i} className="text-xs text-red-300/80 flex items-start gap-1.5 py-0.5">
                  <span className="text-red-500 shrink-0 mt-0.5">{'\u25CF'}</span>
                  <span>{err.details}</span>
                </div>
              ))}
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="space-y-1 mt-1 max-h-24 overflow-y-auto scrollbar-thin">
              {validation.warnings.map((warn, i) => (
                <div key={i} className="text-xs text-amber-300/80 flex items-start gap-1.5 py-0.5">
                  <span className="text-amber-500 shrink-0 mt-0.5">{'\u25CF'}</span>
                  <span>{warn.details}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick tip for common fixes */}
          {!validation.isValid && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[10px] text-text-muted">
                Tip: "Ask AI to Fix" sends the validation errors back to the AI, which will attempt to reconnect missing links and fix type mismatches automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {showSaveComfyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-elevated border border-border-default rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-content-primary">Save to ComfyUI</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveComfyDialog(false)}
                className="p-1 rounded text-content-faint hover:text-content-secondary hover:bg-surface-secondary transition-colors"
                disabled={isSavingToComfyUI}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div>
                <label className="block text-[10px] text-content-faint mb-1">Filename</label>
                <input
                  type="text"
                  value={comfyuiFilename}
                  onChange={(event) => setComfyuiFilename(event.target.value)}
                  placeholder="my-workflow"
                  className="w-full px-3 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 text-content-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] text-content-faint mb-1">Subfolder (optional)</label>
                <select
                  value={creatingComfyuiSubfolder ? NEW_COMFYUI_FOLDER_OPTION : comfyuiSubfolder}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === NEW_COMFYUI_FOLDER_OPTION) {
                      setCreatingComfyuiSubfolder(true);
                      return;
                    }
                    setCreatingComfyuiSubfolder(false);
                    setComfyuiSubfolder(value);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 text-content-primary"
                >
                  <option value="">(root)</option>
                  {comfyuiWorkflowSubfolders.map((folder) => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                  <option value={NEW_COMFYUI_FOLDER_OPTION}>+ Create new folder...</option>
                </select>
                {creatingComfyuiSubfolder && (
                  <div className="mt-2 space-y-1">
                    <label className="block text-[10px] text-content-faint">New folder name</label>
                    <input
                      type="text"
                      value={newComfyuiSubfolder}
                      onChange={(event) => setNewComfyuiSubfolder(event.target.value)}
                      placeholder="portraits"
                      className="w-full px-3 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 text-content-primary"
                    />
                    {newComfyuiSubfolderError && (
                      <p className="text-[10px] text-red-300">{newComfyuiSubfolderError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-default">
              <button
                type="button"
                onClick={() => setShowSaveComfyDialog(false)}
                className="px-3 py-1.5 text-xs text-content-faint hover:text-content-secondary transition-colors"
                disabled={isSavingToComfyUI}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmSaveToComfyUI(); }}
                disabled={
                  !workflow
                  || !comfyuiFilename.trim()
                  || isSavingToComfyUI
                  || (creatingComfyuiSubfolder && !!newComfyuiSubfolderError)
                }
                className="px-4 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-accent-contrast disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSavingToComfyUI ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Required nodes panel */}
      {showNodes && requiredNodes.length > 0 && (
        <div className="mx-3 mb-2 p-3 rounded-lg bg-surface-200 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">Required Custom Nodes</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyInstall}
                className="text-xs text-accent-text hover:text-accent-text flex items-center gap-1"
              >
                <Terminal className="w-3 h-3" />
                Copy install commands
              </button>
              <button onClick={() => setShowNodes(false)} className="text-text-tertiary hover:text-text-secondary">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {requiredNodes.map((node) => (
              <div
                key={node.name}
                className="p-2 rounded bg-surface-300 border border-border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{node.name}</span>
                  {node.githubUrl && (
                    <a
                      href={node.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-text hover:text-accent-text"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-[10px] text-text-secondary mt-0.5">{node.reason}</div>
                <code
                  className="block text-[10px] text-emerald-400/70 mt-1 font-mono bg-surface-100 rounded px-1.5 py-0.5"
                >
                  {node.installCommand}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDeploymentDialog && workflow && workflowAnalysis && (
        <Suspense fallback={null}>
          <DeploymentPackageDialog
            workflow={workflow}
            analysis={workflowAnalysis}
            onClose={() => setShowDeploymentDialog(false)}
          />
        </Suspense>
      )}
    </div>
  );
}




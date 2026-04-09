import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy,
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteComfyUIWorkflow,
  listComfyUIWorkflows,
  loadComfyUIWorkflow,
  type ComfyUIWorkflowFile,
} from '../../../services/comfyui-workflow-sync';
import { detectWorkflowFormat, convertAPIToGraph, enrichWorkflowNodes } from '../../../utils/workflow-import';
import { saveWorkflowToLibrary, detectCategory } from '../../../services/workflow-library';
import type { ComfyUIWorkflow } from '../../../types/comfyui';

interface ComfyUIWorkflowFolderPanelProps {
  comfyuiUrl?: string;
  onLoadWorkflowPath?: (path: string) => Promise<boolean> | boolean;
  onFoldersDiscovered?: (folders: string[]) => void;
}

interface GroupedFiles {
  label: string;
  files: ComfyUIWorkflowFile[];
}

function groupBySubfolder(files: ComfyUIWorkflowFile[]): GroupedFiles[] {
  const groups = new Map<string, ComfyUIWorkflowFile[]>();
  for (const file of files) {
    const key = file.subfolder || 'Root';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(file);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === 'Root') return -1;
      if (b === 'Root') return 1;
      return a.localeCompare(b);
    })
    .map(([label, groupFiles]) => ({
      label,
      files: groupFiles.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function getNodeCount(workflow: Record<string, unknown>): number {
  const format = detectWorkflowFormat(workflow);
  if (format === 'graph') {
    const graph = workflow as ComfyUIWorkflow;
    return Array.isArray(graph.nodes) ? graph.nodes.length : 0;
  }
  if (format === 'api') {
    return Object.keys(workflow).filter((key) => /^\d+$/.test(key)).length;
  }
  return 0;
}

export function ComfyUIWorkflowFolderPanel({
  comfyuiUrl,
  onLoadWorkflowPath,
  onFoldersDiscovered,
}: ComfyUIWorkflowFolderPanelProps) {
  const [files, setFiles] = useState<ComfyUIWorkflowFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [nodeCounts, setNodeCounts] = useState<Record<string, number>>({});

  const loadFiles = useCallback(async () => {
    if (!comfyuiUrl) {
      setFiles([]);
      setError('ComfyUI not connected. Configure backend in Settings.');
      onFoldersDiscovered?.([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const listed = await listComfyUIWorkflows(comfyuiUrl);
      setFiles(listed);
      const subfolders = Array.from(new Set(listed.map((entry) => entry.subfolder).filter(Boolean))).sort();
      onFoldersDiscovered?.(subfolders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list ComfyUI workflows';
      setError(message);
      onFoldersDiscovered?.([]);
    } finally {
      setLoading(false);
    }
  }, [comfyuiUrl, onFoldersDiscovered]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (!comfyuiUrl || files.length === 0) {
      setNodeCounts({});
      return;
    }

    let cancelled = false;
    const sample = files.slice(0, 80);

    void (async () => {
      const nextCounts: Record<string, number> = {};
      for (const file of sample) {
        try {
          const rawWorkflow = await loadComfyUIWorkflow(comfyuiUrl, file.path);
          nextCounts[file.path] = getNodeCount(rawWorkflow);
        } catch {
          // Ignore metadata failures per file
        }
      }
      if (!cancelled) {
        setNodeCounts(nextCounts);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [comfyuiUrl, files]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return files;
    return files.filter((file) => (
      file.name.toLowerCase().includes(query)
      || file.path.toLowerCase().includes(query)
      || file.subfolder.toLowerCase().includes(query)
    ));
  }, [files, search]);

  const groups = useMemo(() => groupBySubfolder(filteredFiles), [filteredFiles]);

  const handleLoad = useCallback(async (path: string) => {
    if (!onLoadWorkflowPath) return;
    setLoadingPath(path);
    try {
      const ok = await onLoadWorkflowPath(path);
      if (!ok) return;
    } finally {
      setLoadingPath(null);
    }
  }, [onLoadWorkflowPath]);

  const handleSaveCopyToLibrary = useCallback(async (file: ComfyUIWorkflowFile) => {
    if (!comfyuiUrl) {
      toast.error('ComfyUI not connected');
      return;
    }

    setLoadingPath(file.path);
    try {
      const rawWorkflow = await loadComfyUIWorkflow(comfyuiUrl, file.path);
      const format = detectWorkflowFormat(rawWorkflow);
      let graphWorkflow: ComfyUIWorkflow;
      if (format === 'graph') {
        graphWorkflow = enrichWorkflowNodes(rawWorkflow as unknown as ComfyUIWorkflow);
      } else if (format === 'api') {
        graphWorkflow = enrichWorkflowNodes(convertAPIToGraph(rawWorkflow as Record<string, any>));
      } else {
        toast.error('Unrecognized workflow format');
        return;
      }

      const saved = saveWorkflowToLibrary(
        graphWorkflow,
        file.name,
        `Imported from ComfyUI folder: ${file.path}`,
        {
          category: detectCategory(graphWorkflow),
          tags: ['comfyui-folder', ...(file.subfolder ? [file.subfolder] : [])],
        },
      );
      toast.success(`Saved copy to library: ${saved.name}`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to import ${file.name}`);
    } finally {
      setLoadingPath(null);
    }
  }, [comfyuiUrl]);

  const handleDeleteWorkflow = useCallback(async (file: ComfyUIWorkflowFile) => {
    if (!comfyuiUrl) {
      toast.error('ComfyUI not connected');
      return;
    }

    const confirmed = window.confirm(`Delete "${file.path}" from ComfyUI? This cannot be undone.`);
    if (!confirmed) return;

    setLoadingPath(file.path);
    try {
      await deleteComfyUIWorkflow(comfyuiUrl, file.path);
      setFiles((prev) => prev.filter((entry) => entry.path !== file.path));
      setNodeCounts((prev) => {
        const next = { ...prev };
        delete next[file.path];
        return next;
      });
      toast.success(`Deleted: ${file.path}`);
      await loadFiles();
    } catch (err: any) {
      toast.error(err?.message || `Failed to delete ${file.path}`);
    } finally {
      setLoadingPath(null);
    }
  }, [comfyuiUrl, loadFiles]);

  return (
    <div className="h-full flex flex-col bg-surface-secondary text-content-primary">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-default">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent shrink-0" />
            <span className="text-xs font-medium truncate">Workflows</span>
          </div>
          <p className="text-[10px] text-content-faint mt-0.5">{filteredFiles.length} workflows in ComfyUI folder</p>
        </div>
        <button
          type="button"
          onClick={() => void loadFiles()}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border border-border-default text-content-faint hover:text-content-secondary hover:bg-surface-elevated transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="shrink-0 px-3 py-2 space-y-2 border-b border-border-default">
        <p className="text-[10px] text-content-faint">Synced from <code>user/default/workflows/</code></p>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-content-faint" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="text"
            placeholder="Search workflows..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
            {error}
          </div>
        )}

        {!error && !loading && filteredFiles.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <FolderOpen className="w-10 h-10 text-content-faint mb-3" />
            <p className="text-xs text-content-secondary mb-1">No workflows found</p>
            <p className="text-[10px] text-content-faint">
              Save workflows in ComfyUI or use "Save to ComfyUI" from the canvas actions.
            </p>
          </div>
        )}

        {groups.map((group) => (
          <section key={group.label} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] uppercase tracking-wide text-content-faint">
                {group.label}
              </h3>
              <span className="text-[10px] text-content-faint">{group.files.length}</span>
            </div>
            <div className="space-y-2">
              {group.files.map((file) => {
                const isBusy = loadingPath === file.path;
                return (
                  <div key={file.path} className="rounded-lg border border-border-default bg-surface-elevated p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-[10px] text-content-faint truncate">{file.path}</p>
                        <p className="text-[10px] text-content-secondary mt-1">
                          {file.subfolder ? `Folder: ${file.subfolder}` : 'Folder: root'}
                        </p>
                        <p className="text-[10px] text-content-faint">
                          {typeof nodeCounts[file.path] === 'number'
                            ? `${nodeCounts[file.path]} nodes`
                            : 'Node count: pending...'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteWorkflow(file)}
                        disabled={isBusy}
                        title={`Delete ${file.name}`}
                        className="inline-flex items-center justify-center rounded border border-red-500/40 bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                      >
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleLoad(file.path)}
                        disabled={isBusy || !onLoadWorkflowPath}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border border-border-default text-content-faint hover:text-content-secondary hover:bg-surface-inset transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveCopyToLibrary(file)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border border-border-default text-content-faint hover:text-content-secondary hover:bg-surface-inset transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Copy className="w-3 h-3" />
                        Save Copy to Library
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {loading && !error && (
          <div className="flex items-center justify-center gap-2 text-xs text-content-faint py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading ComfyUI workflows...
          </div>
        )}
      </div>
    </div>
  );
}

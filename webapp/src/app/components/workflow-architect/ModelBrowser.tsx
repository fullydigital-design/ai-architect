import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileBox,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getComfyUIBaseUrl } from '../../../services/api-config';
import {
  fetchAllModelFolders,
  type ModelFile,
  type ModelFolder,
} from '../../../services/comfyui-model-inventory';

interface ModelBrowserProps {
  comfyuiUrl?: string;
}

interface InventorySubfolderNode {
  name: string;
  fullPath: string;
  files: ModelFile[];
  children: InventorySubfolderNode[];
}

interface MutableInventorySubfolderNode {
  name: string;
  fullPath: string;
  files: ModelFile[];
  children: Map<string, MutableInventorySubfolderNode>;
}

function buildSubfolderTree(files: ModelFile[]): InventorySubfolderNode[] {
  const roots = new Map<string, MutableInventorySubfolderNode>();

  for (const file of files) {
    if (!file.subfolder) continue;
    const parts = file.subfolder.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    let level = roots;
    let leaf: MutableInventorySubfolderNode | null = null;
    let fullPath = '';

    for (const part of parts) {
      fullPath = fullPath ? `${fullPath}/${part}` : part;
      let node = level.get(part);
      if (!node) {
        node = {
          name: part,
          fullPath,
          files: [],
          children: new Map<string, MutableInventorySubfolderNode>(),
        };
        level.set(part, node);
      }
      leaf = node;
      level = node.children;
    }

    if (leaf) leaf.files.push(file);
  }

  const toImmutable = (nodes: Map<string, MutableInventorySubfolderNode>): InventorySubfolderNode[] => (
    [...nodes.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((node) => ({
        name: node.name,
        fullPath: node.fullPath,
        files: [...node.files].sort((a, b) => a.filename.localeCompare(b.filename)),
        children: toImmutable(node.children),
      }))
  );

  return toImmutable(roots);
}

function getSubtreeFileCount(node: InventorySubfolderNode): number {
  return node.files.length + node.children.reduce((sum, child) => sum + getSubtreeFileCount(child), 0);
}

export function ModelBrowser({ comfyuiUrl }: ModelBrowserProps) {
  const [modelFolders, setModelFolders] = useState<ModelFolder[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(new Set());
  const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);

  const comfyTarget = (comfyuiUrl || getComfyUIBaseUrl()).trim() || getComfyUIBaseUrl();

  useEffect(() => {
    let cancelled = false;

    const loadInventory = async () => {
      setInventoryLoading(true);
      setInventoryError(null);
      try {
        const folders = await fetchAllModelFolders(comfyTarget);
        if (cancelled) return;
        setModelFolders(folders);
        setExpandedFolders((prev) => {
          if (prev.size > 0) return prev;
          const next = new Set<string>();
          folders.slice(0, 3).forEach((folder) => next.add(folder.folderType));
          return next;
        });
      } catch (err) {
        if (cancelled) return;
        setInventoryError(err instanceof Error ? err.message : 'Failed to load model folders');
        setModelFolders([]);
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    };

    void loadInventory();
    return () => {
      cancelled = true;
    };
  }, [comfyTarget, inventoryRefreshTick]);

  const totalModelCount = useMemo(
    () => modelFolders.reduce((sum, folder) => sum + folder.fileCount, 0),
    [modelFolders],
  );

  const filteredModelFolders = useMemo(() => {
    const queryLower = inventorySearch.trim().toLowerCase();
    if (!queryLower) return modelFolders;

    return modelFolders
      .map((folder) => {
        const files = folder.files.filter((file) => (
          file.path.toLowerCase().includes(queryLower)
          || file.filename.toLowerCase().includes(queryLower)
          || file.subfolder.toLowerCase().includes(queryLower)
        ));
        return {
          ...folder,
          files,
          fileCount: files.length,
        };
      })
      .filter((folder) => folder.fileCount > 0);
  }, [modelFolders, inventorySearch]);

  const searchActive = inventorySearch.trim().length > 0;

  const toggleFolder = (folderType: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderType)) next.delete(folderType);
      else next.add(folderType);
      return next;
    });
  };

  const toggleSubfolder = (folderKey: string) => {
    setExpandedSubfolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderKey)) next.delete(folderKey);
      else next.add(folderKey);
      return next;
    });
  };

  const renderFileRow = (file: ModelFile, depth: number) => (
    <div
      key={file.path}
      className="flex items-center justify-between gap-2 py-1 pr-2 text-[11px] hover:bg-surface-2/40 rounded-sm"
      style={{ paddingLeft: `${12 + depth * 12}px` }}
      title={file.path}
    >
      <div className="min-w-0 flex items-center gap-1.5">
        <FileBox className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
        <span className="truncate text-text-secondary">{file.filename}</span>
      </div>
      <span className="text-text-tertiary font-mono whitespace-nowrap">{file.sizeDisplay}</span>
    </div>
  );

  const renderSubfolderNode = (folderType: string, node: InventorySubfolderNode, depth: number): JSX.Element => {
    const key = `${folderType}:${node.fullPath}`;
    const isExpanded = searchActive || expandedSubfolders.has(key);
    return (
      <div key={key}>
        <button
          type="button"
          onClick={() => toggleSubfolder(key)}
          className="w-full flex items-center justify-between gap-2 py-1.5 pr-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2/50 rounded-sm"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <span className="min-w-0 flex items-center gap-1.5">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            {isExpanded ? <FolderOpen className="w-3.5 h-3.5 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{node.name}/</span>
          </span>
          <span className="text-[10px] text-text-tertiary whitespace-nowrap">
            {getSubtreeFileCount(node)}
          </span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => renderSubfolderNode(folderType, child, depth + 1))}
            {node.files.map((file) => renderFileRow(file, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full min-h-0 bg-surface-0 text-text-primary">
      <div className="h-full min-h-0 max-w-7xl mx-auto px-4 md:px-6 py-5 flex flex-col">
        <div className="flex-1 min-h-0 rounded-sm border border-border bg-surface-1 overflow-hidden flex flex-col">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-2">
            <span className="flex-1 text-xs text-text-secondary">Installed Models ({totalModelCount})</span>
            <button
              type="button"
              onClick={() => setInventoryRefreshTick((v) => v + 1)}
              disabled={inventoryLoading}
              className="p-1.5 rounded-sm border border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-2/70 disabled:opacity-40"
              title="Refresh model folders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${inventoryLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="shrink-0 p-3 md:p-4 border-b border-border space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search installed model files..."
                className="w-full pl-8 pr-3 py-1.5 rounded-sm bg-surface-1 border border-border text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent/40"
              />
            </div>

            {inventoryLoading && (
              <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scanning ComfyUI model folders...
              </div>
            )}

            {!inventoryLoading && inventoryError && (
              <div className="text-[11px] text-red-300 border border-red-500/30 bg-red-500/10 rounded-sm px-2.5 py-2">
                Connect to ComfyUI in Settings, then refresh.
              </div>
            )}

            {!inventoryLoading && !inventoryError && filteredModelFolders.length === 0 && (
              <div className="text-[11px] text-text-secondary">
                {searchActive
                  ? 'No files match your search.'
                  : 'No model files found yet. Connect to ComfyUI and refresh inventory.'}
              </div>
            )}
          </div>

          {!inventoryLoading && !inventoryError && filteredModelFolders.length > 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-3">
              <div className="space-y-1.5">
                {filteredModelFolders.map((folder) => {
                  const isExpanded = searchActive || expandedFolders.has(folder.folderType);
                  const rootFiles = folder.files.filter((file) => !file.subfolder);
                  const subfolderTree = buildSubfolderTree(folder.files);

                  return (
                    <div key={folder.folderType} className="rounded-sm border border-border-default/70">
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.folderType)}
                        className={`w-full flex items-center justify-between gap-2 py-1.5 px-2 text-xs hover:bg-surface-2/50 ${isExpanded ? 'border-l-2 border-l-accent/50' : ''}`}
                      >
                        <span className="min-w-0 flex items-center gap-1.5 text-text-secondary">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                          {isExpanded ? <FolderOpen className="w-3.5 h-3.5 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{folder.displayName}</span>
                        </span>
                        <span className="text-[10px] text-text-tertiary whitespace-nowrap">({folder.fileCount})</span>
                      </button>

                      {isExpanded && (
                        <div className="pb-1.5">
                          {subfolderTree.map((node) => renderSubfolderNode(folder.folderType, node, 1))}
                          {rootFiles.map((file) => renderFileRow(file, 1))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type { InstalledNodePack } from '../../types';
import { getComfyUIBaseUrl } from '../../services/api-config';
import { getManagerNodeList, type ManagerNode } from '../services/comfyui-manager-service';
import { getObjectInfo } from '../../services/comfyui-object-info-cache';
import { getNodeToPackMapping, type NodeToPackMapping } from '../services/node-pack-mapper';

interface InstalledNodesPanelProps {
  comfyuiUrl?: string;
  hideHeader?: boolean;
}

interface InstalledNodePackRow extends InstalledNodePack {
  state: string;
  isInstalled: boolean;
}

function normalizeRepoUrl(url: string): string {
  return url
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .trim()
    .toLowerCase();
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function keyVariants(value: string): string[] {
  const trimmed = String(value || '').trim();
  if (!trimmed) return [];

  const variants = new Set<string>();
  const normalized = normalizeKey(trimmed);
  if (normalized) variants.add(normalized);

  const noPrefix = trimmed.replace(/^comfyui[-_]?/i, '');
  const normalizedNoPrefix = normalizeKey(noPrefix);
  if (normalizedNoPrefix) variants.add(normalizedNoPrefix);

  return [...variants];
}

function extractRepoName(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  const normalized = trimmed.replace(/\\/g, '/').replace(/\/+$/, '').replace(/\.git$/i, '');
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function collectPackUrls(node: ManagerNode): string[] {
  return [
    node.reference,
    node.repository,
    node.url,
    ...(Array.isArray(node.files) ? node.files : []),
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function collectPackKeys(node: ManagerNode): Set<string> {
  const keys = new Set<string>();

  const addKeys = (value: string) => {
    for (const key of keyVariants(value)) keys.add(key);
  };

  addKeys(node.id || '');
  addKeys(node.title || '');

  for (const url of collectPackUrls(node)) {
    addKeys(url);
    addKeys(extractRepoName(url));
  }

  return keys;
}

function mergeNodeClasses(...lists: string[][]): string[] {
  const merged = new Set<string>();
  for (const list of lists) {
    for (const name of list) {
      const trimmed = String(name || '').trim();
      if (trimmed) merged.add(trimmed);
    }
  }
  return [...merged].sort((a, b) => a.localeCompare(b));
}

function resolveNodeClassesFromMapping(node: ManagerNode, mapping: NodeToPackMapping | null): string[] {
  if (!mapping) return [];

  const names = new Set<string>();
  const candidatePackIds = new Set<string>();
  const packKeys = collectPackKeys(node);

  const directId = String(node.id || '').trim();
  if (directId) candidatePackIds.add(directId);

  for (const url of collectPackUrls(node)) {
    const mappedPack = mapping.repoToPack.get(normalizeRepoUrl(url));
    if (mappedPack?.id) candidatePackIds.add(mappedPack.id);
  }

  for (const packId of candidatePackIds) {
    const nodeClasses = mapping.packToNodeClasses.get(packId);
    if (!nodeClasses) continue;
    for (const nodeClass of nodeClasses) names.add(nodeClass);
  }

  // Fallback: fuzzy pack id match when manager ids are not stable across endpoints.
  for (const [packId, nodeClasses] of mapping.packToNodeClasses.entries()) {
    const packIdKeys = keyVariants(packId);
    if (!packIdKeys.some((key) => packKeys.has(key))) continue;
    for (const nodeClass of nodeClasses) names.add(nodeClass);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

function extractCustomNodesFolder(moduleName: string): string | null {
  const raw = String(moduleName || '').trim();
  if (!raw) return null;

  const dotMatch = raw.match(/custom_nodes\.([a-z0-9_-]+)/i);
  if (dotMatch?.[1]) return dotMatch[1];

  const normalized = raw.replace(/\\/g, '/');
  const slashMatch = normalized.match(/custom_nodes\/([^/.]+)/i);
  if (slashMatch?.[1]) return slashMatch[1];

  return null;
}

function buildObjectInfoModuleIndex(objectInfo: Record<string, any> | null): Map<string, string[]> {
  const byKey = new Map<string, Set<string>>();
  if (!objectInfo) return new Map<string, string[]>();

  for (const [nodeClass, rawInfo] of Object.entries(objectInfo)) {
    const info = (rawInfo && typeof rawInfo === 'object') ? rawInfo as Record<string, unknown> : null;
    const moduleName = String(
      info?.python_module
      || info?.python_module_name
      || info?.module
      || info?.module_name
      || '',
    ).trim();
    const folder = extractCustomNodesFolder(moduleName);
    if (!folder) continue;

    for (const key of keyVariants(folder)) {
      if (!byKey.has(key)) byKey.set(key, new Set<string>());
      byKey.get(key)!.add(nodeClass);
    }
  }

  const index = new Map<string, string[]>();
  for (const [key, names] of byKey.entries()) {
    index.set(key, [...names].sort((a, b) => a.localeCompare(b)));
  }
  return index;
}

function resolveNodeClassesFromObjectInfo(node: ManagerNode, moduleIndex: Map<string, string[]>): string[] {
  if (moduleIndex.size === 0) return [];
  const names = new Set<string>();
  const packKeys = collectPackKeys(node);
  for (const key of packKeys) {
    const nodeClasses = moduleIndex.get(key);
    if (!nodeClasses) continue;
    for (const nodeClass of nodeClasses) names.add(nodeClass);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function toInstalledNodePack(node: ManagerNode): InstalledNodePackRow {
  const nodeClasses = [...new Set([
    ...(node.nodenames ?? []),
    ...(node.node_names ?? []),
    ...(node.nodes ?? []),
  ])]
    .map((name) => String(name).trim())
    .filter(Boolean);

  const rawNode = node as unknown as Record<string, unknown>;
  const version = typeof rawNode.cnr_latest === 'string'
    ? rawNode.cnr_latest
    : typeof rawNode.version === 'string'
      ? rawNode.version
      : undefined;

  const fallbackName = (node.reference || node.id || 'unknown-pack')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .split('/')
    .pop() || 'unknown-pack';

  const state = typeof node.state === 'string' ? node.state.toLowerCase() : '';
  const isInstalled = typeof node.is_installed === 'boolean'
    ? node.is_installed
    : state === 'enabled' || state === 'disabled' || state === 'update';

  return {
    folderName: node.id || fallbackName,
    displayName: node.title || fallbackName,
    nodeClasses,
    description: node.description || '',
    version,
    installedAt: '',
    hasRequirements: false,
    repoUrl: node.reference || node.repository || node.url || undefined,
    state,
    isInstalled,
  };
}

export default function InstalledNodesPanel({ comfyuiUrl, hideHeader = false }: InstalledNodesPanelProps) {
  const [packs, setPacks] = useState<InstalledNodePackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showInstalledOnly, setShowInstalledOnly] = useState(true);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = comfyuiUrl?.trim() || getComfyUIBaseUrl();
      const [managerNodes, mapping, objectInfo] = await Promise.all([
        getManagerNodeList(baseUrl, true),
        getNodeToPackMapping(true).catch(() => null),
        getObjectInfo(baseUrl, true).catch(() => null),
      ]);

      const moduleIndex = buildObjectInfoModuleIndex(objectInfo);
      const mapped = managerNodes.map((node) => {
        const basePack = toInstalledNodePack(node);
        const mappedClasses = resolveNodeClassesFromMapping(node, mapping);
        const moduleClasses = resolveNodeClassesFromObjectInfo(node, moduleIndex);
        return {
          ...basePack,
          nodeClasses: mergeNodeClasses(basePack.nodeClasses, mappedClasses, moduleClasses),
        };
      });

      setPacks(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load manager node list');
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, [comfyuiUrl]);

  useEffect(() => {
    void fetchPacks();
  }, [fetchPacks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packs.filter((pack) => {
      if (showInstalledOnly && !pack.isInstalled) return false;
      if (!q) return true;
      return (
        pack.displayName.toLowerCase().includes(q)
        || pack.nodeClasses.some((nodeClass) => nodeClass.toLowerCase().includes(q))
      );
    });
  }, [packs, query, showInstalledOnly]);

  const totalNodeTypes = useMemo(
    () => packs.reduce((sum, pack) => sum + pack.nodeClasses.length, 0),
    [packs],
  );
  const installedPackCount = useMemo(
    () => packs.filter((pack) => pack.isInstalled).length,
    [packs],
  );

  return (
    <div className="h-full min-h-0 flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!hideHeader && (
          <h2 className="text-sm text-content-secondary">
            {installedPackCount} installed packs . {packs.length} total available . {totalNodeTypes} node types total
          </h2>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <div className="inline-flex items-center rounded-sm border border-border-default overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowInstalledOnly(false)}
              className={`px-2.5 py-1.5 ${!showInstalledOnly ? 'bg-surface-secondary text-content-primary' : 'text-content-muted hover:text-content-primary'}`}
            >
              Show all
            </button>
            <button
              type="button"
              onClick={() => setShowInstalledOnly(true)}
              className={`px-2.5 py-1.5 border-l border-border-default ${showInstalledOnly ? 'bg-surface-secondary text-content-primary' : 'text-content-muted hover:text-content-primary'}`}
            >
              Installed only
            </button>
          </div>
          <button
            type="button"
            onClick={() => void fetchPacks()}
            className="inline-flex items-center gap-2 rounded-sm border border-border-default bg-surface-elevated px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search packs or node classes..."
        className="w-full rounded-sm border border-border-default bg-surface-inset px-3 py-2 text-sm text-content-primary outline-none focus:border-accent/40"
      />

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-sm bg-surface-secondary" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between rounded-sm border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
            <span>{error}</span>
            <button type="button" onClick={() => void fetchPacks()} className="rounded border border-red-400/40 px-2 py-1 text-xs">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-sm border border-border-default bg-surface-inset p-3 text-sm text-content-muted">
            No packs loaded.
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((pack) => {
              const rowKey = `${pack.folderName}:${pack.repoUrl || ''}`;
              const isOpen = expanded.has(rowKey);
              return (
                <div key={rowKey} className="overflow-hidden rounded-sm border border-border-default bg-surface-elevated">
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(rowKey)) next.delete(rowKey);
                        else next.add(rowKey);
                        return next;
                      });
                    }}
                    className="w-full px-3 py-3 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-content-primary">{pack.displayName}</span>
                      <span className="rounded-sm bg-surface-secondary px-2 py-0.5 text-xs text-content-secondary border border-border-subtle">{pack.nodeClasses.length} nodes</span>
                      {pack.version && <span className="rounded-sm bg-surface-secondary px-2 py-0.5 text-xs text-content-secondary border border-border-subtle">v{pack.version}</span>}
                      <span
                        className={`rounded-sm px-2 py-0.5 text-xs ${
                          pack.state === 'enabled'
                            ? 'bg-state-success-muted text-state-success border border-state-success/40'
                            : pack.state === 'disabled'
                              ? 'bg-state-warning-muted text-state-warning border border-state-warning/40'
                              : pack.state === 'update'
                                ? 'bg-state-info-muted text-state-info border border-state-info/40'
                                : 'bg-surface-secondary text-content-muted border border-border-default'
                        }`}
                      >
                        {pack.state || (pack.isInstalled ? 'installed' : 'not-installed')}
                      </span>
                      {pack.repoUrl && (
                        <a
                          href={pack.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center text-content-muted hover:text-content-primary"
                          aria-label={`Open ${pack.displayName} repository`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {pack.description && (
                      <p className="mt-1 text-xs text-content-faint">
                        {pack.description.slice(0, 100)}
                        {pack.description.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border-default px-3 py-2 bg-surface-secondary/50">
                      {pack.nodeClasses.length > 0 ? (
                        <div>
                          <div className="text-[10px] text-content-secondary mb-1.5">
                            {pack.nodeClasses.length} node class{pack.nodeClasses.length !== 1 ? 'es' : ''} provided:
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
                            {pack.nodeClasses.map((nodeClass) => (
                              <span
                                key={`${rowKey}:${nodeClass}`}
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-elevated/60 text-content-secondary border border-border-default/40"
                              >
                                {nodeClass}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-content-muted">No node class data</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}



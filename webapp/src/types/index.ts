// ── Workflow Validation ───────────────────────────────────────────
export type NodeValidationStatus = 'built-in' | 'installed' | 'missing';

export interface NodeValidationResult {
  nodeType: string;
  status: NodeValidationStatus;
  providedBy?: string;
  suggestedPack?: string;
}

export interface WorkflowValidationReport {
  totalNodes: number;
  validNodes: number;
  missingNodes: number;
  installedPackCount: number;
  scannedAt: string;
  results: NodeValidationResult[];
}

// ── ComfyUI History ───────────────────────────────────────────────
export interface HistoryImageRef {
  filename: string;
  subfolder: string;
  type: string;
}

export interface HistoryEntry {
  promptId: string;
  number: number;
  createdAt?: string;
  status: 'success' | 'error' | 'unknown';
  outputs: HistoryImageRef[];
  workflowSnapshot?: Record<string, unknown>;
}

// ── Installed Node Packs ──────────────────────────────────────────
export interface InstalledNodePack {
  folderName: string;
  displayName: string;
  nodeClasses: string[];
  description: string;
  version?: string;
  installedAt: string;
  hasRequirements: boolean;
  repoUrl?: string;
}

// ── Command Center ────────────────────────────────────────────────
export type CommandCenterTab =
  | 'chat'
  | 'templates'
  | 'history'
  | 'gallery'
  | 'validator'
  | 'requirements'
  | 'nodes'
  | 'discover'
  | 'models'
  | 'library'
  | 'settings';

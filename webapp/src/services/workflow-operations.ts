/**
 * Phase 11C - Workflow Operation Types and Parser
 *
 * Defines atomic and compound operations the AI can emit when modifying an
 * existing workflow. The parser extracts operations from free-form AI output.
 */

// ============================================================
// Operation Types
// ============================================================

export interface OpAddNode {
  op: 'ADD_NODE';
  id: string;
  class_type: string;
  title?: string;
  widgets?: Record<string, any>;
  position?: [number, number];
}

export interface OpRemoveNode {
  op: 'REMOVE_NODE';
  id: string;
}

export interface OpReplaceNode {
  op: 'REPLACE_NODE';
  id: string;
  new_class_type: string;
  widgets?: Record<string, any>;
}

export interface OpConnect {
  op: 'CONNECT';
  source_id: string;
  source_slot: number;
  target_id: string;
  target_input: string;
}

export interface OpDisconnect {
  op: 'DISCONNECT';
  target_id: string;
  target_input: string;
}

export interface OpSetValue {
  op: 'SET_VALUE';
  node_id: string;
  input_name: string;
  value: any;
}

export interface OpInsertBetween {
  op: 'INSERT_BETWEEN';
  new_class_type: string;
  new_id?: string;
  source_id: string;
  target_id: string;
  via_type: string;
  widgets?: Record<string, any>;
}

export interface OpAppendChain {
  op: 'APPEND_CHAIN';
  after_node_id: string;
  after_slot?: number;
  via_type: string;
  chain: Array<{
    class_type: string;
    widgets?: Record<string, any>;
  }>;
  intercept?: boolean;
}

export interface OpReplaceChain {
  op: 'REPLACE_CHAIN';
  start_id: string;
  end_id: string;
  keep_start_inputs?: boolean;
  keep_end_outputs?: boolean;
  new_chain: Array<{
    class_type: string;
    widgets?: Record<string, any>;
  }>;
}

export interface OpDuplicateNode {
  op: 'DUPLICATE_NODE';
  source_id: string;
  new_id?: string;
  widget_overrides?: Record<string, any>;
  copy_connections?: boolean;
}

export interface OpSwapNodes {
  op: 'SWAP_NODES';
  node_a_id: string;
  node_b_id: string;
}

export interface OpBypassNode {
  op: 'BYPASS_NODE';
  id: string;
  via_type: string;
}

export type WorkflowOperation =
  | OpAddNode
  | OpRemoveNode
  | OpReplaceNode
  | OpConnect
  | OpDisconnect
  | OpSetValue
  | OpInsertBetween
  | OpAppendChain
  | OpReplaceChain
  | OpDuplicateNode
  | OpSwapNodes
  | OpBypassNode;

// ============================================================
// Execution Result Types
// ============================================================

export interface OperationResult {
  success: boolean;
  op: WorkflowOperation;
  message: string;
  createdNodeIds?: string[];
  removedNodeIds?: string[];
  createdConnections?: Array<{ source: string; target: string; type: string }>;
  removedConnections?: Array<{ source: string; target: string }>;
  error?: string;
}

export interface ModificationResult {
  workflow: any;
  wasModified: boolean;
  operationResults: OperationResult[];
  allSucceeded: boolean;
  successCount: number;
  failCount: number;
  summary: string;
}

// ============================================================
// Parser
// ============================================================

export function parseOperationsFromAIOutput(text: string): {
  operations: WorkflowOperation[];
  parseErrors: string[];
} {
  const operations: WorkflowOperation[] = [];
  const parseErrors: string[] = [];

  // Strategy 1: JSON fenced block
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
  if (fenced) {
    const parsed = tryParseOperationsJson(fenced[1].trim(), parseErrors);
    if (parsed.length > 0) {
      return { operations: parsed, parseErrors };
    }
  }

  // Strategy 2: whole text as JSON
  const direct = tryParseOperationsJson(text.trim(), parseErrors);
  if (direct.length > 0) {
    return { operations: direct, parseErrors };
  }

  // Strategy 3: best-effort extraction of standalone JSON objects with op key
  const objectRegex = /\{[\s\S]*?\}/g;
  let match: RegExpExecArray | null = null;
  while ((match = objectRegex.exec(text)) !== null) {
    const candidate = match[0];
    if (!candidate.includes('"op"') && !candidate.includes("'op'")) continue;
    try {
      const parsed = JSON.parse(candidate);
      const op = validateOperationShape(parsed);
      if (op) operations.push(op);
    } catch {
      // ignore
    }
  }

  if (operations.length === 0) {
    parseErrors.push('Could not find any valid operations in AI output.');
  }
  return { operations, parseErrors };
}

function tryParseOperationsJson(json: string, parseErrors: string[]): WorkflowOperation[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      const ops: WorkflowOperation[] = [];
      for (const item of parsed) {
        const op = validateOperationShape(item);
        if (op) ops.push(op);
        else parseErrors.push(`Invalid operation object: ${JSON.stringify(item).slice(0, 120)}`);
      }
      return ops;
    }
    if (parsed && typeof parsed === 'object' && parsed.op) {
      const op = validateOperationShape(parsed);
      return op ? [op] : [];
    }
  } catch {
    // ignore
  }
  return [];
}

function validateOperationShape(obj: any): WorkflowOperation | null {
  if (!obj || typeof obj !== 'object' || !obj.op) return null;

  switch (obj.op) {
    case 'ADD_NODE':
      if (!obj.id || !obj.class_type) return null;
      return {
        op: 'ADD_NODE',
        id: String(obj.id),
        class_type: String(obj.class_type),
        title: obj.title ? String(obj.title) : undefined,
        widgets: obj.widgets || undefined,
        position: Array.isArray(obj.position) ? [Number(obj.position[0]), Number(obj.position[1])] : undefined,
      };
    case 'REMOVE_NODE':
      if (!obj.id) return null;
      return { op: 'REMOVE_NODE', id: String(obj.id) };
    case 'REPLACE_NODE':
      if (!obj.id || !obj.new_class_type) return null;
      return {
        op: 'REPLACE_NODE',
        id: String(obj.id),
        new_class_type: String(obj.new_class_type),
        widgets: obj.widgets || undefined,
      };
    case 'CONNECT':
      if (!obj.source_id || obj.source_slot === undefined || !obj.target_id || !obj.target_input) return null;
      return {
        op: 'CONNECT',
        source_id: String(obj.source_id),
        source_slot: Number(obj.source_slot),
        target_id: String(obj.target_id),
        target_input: String(obj.target_input),
      };
    case 'DISCONNECT':
      if (!obj.target_id || !obj.target_input) return null;
      return {
        op: 'DISCONNECT',
        target_id: String(obj.target_id),
        target_input: String(obj.target_input),
      };
    case 'SET_VALUE':
      if (!obj.node_id || !obj.input_name || obj.value === undefined) return null;
      return {
        op: 'SET_VALUE',
        node_id: String(obj.node_id),
        input_name: String(obj.input_name),
        value: obj.value,
      };
    case 'INSERT_BETWEEN':
      if (!obj.new_class_type || !obj.source_id || !obj.target_id || !obj.via_type) return null;
      return {
        op: 'INSERT_BETWEEN',
        new_class_type: String(obj.new_class_type),
        new_id: obj.new_id ? String(obj.new_id) : undefined,
        source_id: String(obj.source_id),
        target_id: String(obj.target_id),
        via_type: String(obj.via_type),
        widgets: obj.widgets || undefined,
      };
    case 'APPEND_CHAIN':
      if (!obj.after_node_id || !obj.via_type || !Array.isArray(obj.chain)) return null;
      return {
        op: 'APPEND_CHAIN',
        after_node_id: String(obj.after_node_id),
        after_slot: obj.after_slot !== undefined ? Number(obj.after_slot) : undefined,
        via_type: String(obj.via_type),
        chain: obj.chain.map((entry: any) => ({
          class_type: String(entry.class_type),
          widgets: entry.widgets || undefined,
        })),
        intercept: obj.intercept === true,
      };
    case 'REPLACE_CHAIN':
      if (!obj.start_id || !obj.end_id || !Array.isArray(obj.new_chain)) return null;
      return {
        op: 'REPLACE_CHAIN',
        start_id: String(obj.start_id),
        end_id: String(obj.end_id),
        keep_start_inputs: obj.keep_start_inputs !== false,
        keep_end_outputs: obj.keep_end_outputs !== false,
        new_chain: obj.new_chain.map((entry: any) => ({
          class_type: String(entry.class_type),
          widgets: entry.widgets || undefined,
        })),
      };
    case 'DUPLICATE_NODE':
      if (!obj.source_id) return null;
      return {
        op: 'DUPLICATE_NODE',
        source_id: String(obj.source_id),
        new_id: obj.new_id ? String(obj.new_id) : undefined,
        widget_overrides: obj.widget_overrides || undefined,
        copy_connections: obj.copy_connections !== false,
      };
    case 'SWAP_NODES':
      if (!obj.node_a_id || !obj.node_b_id) return null;
      return {
        op: 'SWAP_NODES',
        node_a_id: String(obj.node_a_id),
        node_b_id: String(obj.node_b_id),
      };
    case 'BYPASS_NODE':
      if (!obj.id || !obj.via_type) return null;
      return {
        op: 'BYPASS_NODE',
        id: String(obj.id),
        via_type: String(obj.via_type),
      };
    default:
      return null;
  }
}

export function getOperationFormatReference(): string {
  return `
=== WORKFLOW MODIFICATION OPERATIONS ===
Output ONLY a JSON array of operations for modifications. Do NOT output full workflow JSON.

ATOMIC:
{"op":"ADD_NODE","id":"50","class_type":"KSampler","widgets":{"steps":20}}
{"op":"REMOVE_NODE","id":"50"}
{"op":"CONNECT","source_id":"6","source_slot":0,"target_id":"7","target_input":"images"}
{"op":"DISCONNECT","target_id":"7","target_input":"images"}
{"op":"SET_VALUE","node_id":"5","input_name":"cfg","value":6.5}
{"op":"REPLACE_NODE","id":"5","new_class_type":"KSamplerAdvanced","widgets":{...}}

COMPOUND:
{"op":"INSERT_BETWEEN","new_class_type":"ImageUpscaleWithModel","source_id":"6","target_id":"7","via_type":"IMAGE"}
{"op":"APPEND_CHAIN","after_node_id":"6","via_type":"IMAGE","chain":[{"class_type":"ImageSharpen"}],"intercept":true}
{"op":"REPLACE_CHAIN","start_id":"8","end_id":"10","new_chain":[{"class_type":"A"},{"class_type":"B"}]}
{"op":"DUPLICATE_NODE","source_id":"5","widget_overrides":{"seed":42}}
{"op":"SWAP_NODES","node_a_id":"5","node_b_id":"6"}
{"op":"BYPASS_NODE","id":"8","via_type":"IMAGE"}

RULES:
- target_input must be input NAME, not index.
- source_slot is 0-based output index.
- use exact enum strings from /object_info for widget values.
- new node IDs must be unique and higher than max_id in summary.
=== END OPERATIONS ===
`;
}


import type { ComfyUIWorkflow, ComfyUINode, ComfyUILink, ComfyUINodeInput, ComfyUINodeOutput } from '../types/comfyui';
import { NODE_REGISTRY } from '../data/node-registry';
import { autoLayoutWorkflow, resolveOverlaps } from './auto-layout';
import { validateWorkflow } from '../services/workflow-validator';

// ===== Format Detection =====

export type WorkflowFormat = 'graph' | 'api' | 'unknown';

/**
 * Detects whether JSON is Graph/UI format or API format.
 * - Graph format: has `nodes` array and `links` array
 * - API format: root keys are numeric strings with `class_type`
 */
export function detectWorkflowFormat(data: any): WorkflowFormat {
  if (!data || typeof data !== 'object') return 'unknown';

  // Graph format: has nodes array
  if (Array.isArray(data.nodes) && Array.isArray(data.links)) {
    return 'graph';
  }

  // API format: root keys are numeric (or string-numeric) with class_type
  const keys = Object.keys(data);
  if (keys.length > 0) {
    const looksLikeAPI = keys.some(k => {
      const val = data[k];
      return val && typeof val === 'object' && typeof val.class_type === 'string';
    });
    if (looksLikeAPI) return 'api';
  }

  return 'unknown';
}

// ===== API → Graph Conversion =====

interface APINode {
  class_type: string;
  inputs: Record<string, any>;
  _meta?: { title?: string };
}

/**
 * Converts ComfyUI API format to Graph/UI format.
 * API format: { "1": { class_type, inputs }, "2": { ... } }
 * Graph format: { nodes: [...], links: [...], ... }
 */
export function convertAPIToGraph(apiData: Record<string, APINode>): ComfyUIWorkflow {
  const nodes: ComfyUINode[] = [];
  const links: ComfyUILink[] = [];
  let linkIdCounter = 1;

  const nodeEntries = Object.entries(apiData).filter(
    ([, val]) => val && typeof val === 'object' && typeof val.class_type === 'string'
  );

  for (const [idStr, apiNode] of nodeEntries) {
    const nodeId = parseInt(idStr, 10);
    if (isNaN(nodeId)) continue;

    const schema = NODE_REGISTRY.get(apiNode.class_type);
    const widgetValues: any[] = [];
    const connectionInputs: ComfyUINodeInput[] = [];
    const connections: Array<{ inputSlot: number; srcNodeId: number; srcSlot: number; type: string }> = [];

    // Separate widget values from connection references
    if (apiNode.inputs) {
      // Get schema info for ordering
      const schemaConnectionInputs = schema?.inputs.filter(i => !i.isWidget) ?? [];
      const schemaWidgetInputs = schema?.inputs.filter(i => i.isWidget) ?? [];

      // First pass: identify connections vs widgets
      const inputEntries = Object.entries(apiNode.inputs);

      for (const [inputName, inputValue] of inputEntries) {
        // Connection reference: [nodeIdString, slotIndex]
        if (Array.isArray(inputValue) && inputValue.length === 2) {
          const srcNodeId = typeof inputValue[0] === 'string' ? parseInt(inputValue[0], 10) : inputValue[0];
          const srcSlot = inputValue[1];

          if (!isNaN(srcNodeId) && typeof srcSlot === 'number') {
            // Find the input slot index
            const schemaIdx = schemaConnectionInputs.findIndex(i => i.name === inputName);
            const inputSlot = schemaIdx >= 0 ? schemaIdx : connectionInputs.length;

            // Determine type from schema or infer from source
            const inputType = schemaConnectionInputs[inputSlot]?.type || '*';

            connectionInputs.push({
              name: inputName,
              type: inputType,
              link: null, // Will be set after creating links
            });

            connections.push({
              inputSlot,
              srcNodeId,
              srcSlot,
              type: inputType,
            });
            continue;
          }
        }

        // Widget value
        // Try to place in schema order
        const widgetIdx = schemaWidgetInputs.findIndex(w => w.name === inputName);
        if (widgetIdx >= 0) {
          // Place at the correct index
          while (widgetValues.length <= widgetIdx) widgetValues.push(undefined);
          widgetValues[widgetIdx] = inputValue;
        } else {
          widgetValues.push(inputValue);
        }
      }

      // Fill missing schema connection inputs
      if (schema) {
        const finalConnectionInputs: ComfyUINodeInput[] = schemaConnectionInputs.map((si, idx) => {
          const existing = connectionInputs.find((ci) => ci.name === si.name);
          return existing || {
            name: si.name,
            type: si.type,
            link: null,
          };
        });
        connectionInputs.length = 0;
        connectionInputs.push(...finalConnectionInputs);
      }
    }

    // Build outputs from schema
    const outputs: ComfyUINodeOutput[] = (schema?.outputs ?? []).map((o, idx) => ({
      name: o.name,
      type: o.type,
      links: null, // Will be populated after creating links
      slot_index: o.slotIndex,
    }));

    // If no schema, create minimal outputs based on what other nodes connect to
    if (!schema && outputs.length === 0) {
      // We'll add outputs in a second pass based on connections
    }

    const node: ComfyUINode = {
      id: nodeId,
      type: apiNode.class_type,
      pos: [0, 0], // Will be auto-laid-out
      size: [330, 250],
      flags: {},
      order: 0,
      mode: 0,
      inputs: connectionInputs.length > 0 ? connectionInputs : undefined,
      outputs: outputs.length > 0 ? outputs : undefined,
      widgets_values: widgetValues.length > 0 ? widgetValues : undefined,
      properties: {},
      title: apiNode._meta?.title,
    };

    nodes.push(node);

    // Create links for this node's connections
    for (const conn of connections) {
      const linkId = linkIdCounter++;
      links.push([
        linkId,
        conn.srcNodeId,
        conn.srcSlot,
        nodeId,
        conn.inputSlot,
        conn.type,
      ]);

      // Update the input's link reference
      if (node.inputs && node.inputs[conn.inputSlot]) {
        node.inputs[conn.inputSlot].link = linkId;
      }
    }
  }

  // Second pass: populate output links
  for (const node of nodes) {
    if (!node.outputs) continue;
    for (const output of node.outputs) {
      const outLinks = links
        .filter(([, srcId, srcSlot]) => srcId === node.id && srcSlot === output.slot_index)
        .map(([linkId]) => linkId);
      output.links = outLinks.length > 0 ? outLinks : null;
    }
  }

  // Second pass: ensure nodes referenced as sources have outputs even without schema
  for (const node of nodes) {
    if (node.outputs && node.outputs.length > 0) continue;
    const outLinks = links.filter(([, srcId]) => srcId === node.id);
    if (outLinks.length > 0) {
      const maxSlot = Math.max(...outLinks.map(([, , srcSlot]) => srcSlot));
      node.outputs = [];
      for (let s = 0; s <= maxSlot; s++) {
        const slotLinks = outLinks.filter(([, , srcSlot]) => srcSlot === s);
        const type = slotLinks.length > 0 ? slotLinks[0][5] : '*';
        node.outputs.push({
          name: type,
          type,
          links: slotLinks.length > 0 ? slotLinks.map(([id]) => id) : null,
          slot_index: s,
        });
      }
    }
  }

  // Ensure nodes referenced as targets have inputs
  for (const node of nodes) {
    const inLinks = links.filter(([, , , tgtId]) => tgtId === node.id);
    if (inLinks.length > 0 && (!node.inputs || node.inputs.length === 0)) {
      const maxSlot = Math.max(...inLinks.map(([, , , , tgtSlot]) => tgtSlot));
      node.inputs = [];
      for (let s = 0; s <= maxSlot; s++) {
        const slotLink = inLinks.find(([, , , , tgtSlot]) => tgtSlot === s);
        node.inputs.push({
          name: slotLink ? slotLink[5] : `input_${s}`,
          type: slotLink ? slotLink[5] : '*',
          link: slotLink ? slotLink[0] : null,
        });
      }
    }
  }

  const workflow: ComfyUIWorkflow = {
    last_node_id: Math.max(0, ...nodes.map(n => n.id)),
    last_link_id: linkIdCounter - 1,
    nodes,
    links,
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };

  // Auto-layout since API format has no positions
  return autoLayoutWorkflow(workflow);
}

// ===== Node Enrichment (for unknown/custom nodes) =====

/**
 * Enriches workflow nodes by ensuring every node has enough input/output handles
 * to accommodate all links that reference it. This is critical for unknown nodes
 * not in the registry, whose inputs/outputs may be missing or incomplete.
 *
 * Also ensures:
 * - Every output has a valid `slot_index` (defaults to array position)
 * - Every input referenced by a link has a valid entry
 * - Type information is back-filled from link data
 * - Widget values for unknown nodes get generic names
 */
export function enrichWorkflowNodes(workflow: ComfyUIWorkflow): ComfyUIWorkflow {
  if (!workflow.nodes?.length || !workflow.links) return workflow;

  // Build lookup: nodeId → { incomingLinks, outgoingLinks }
  const incomingByNode = new Map<number, ComfyUILink[]>();
  const outgoingByNode = new Map<number, ComfyUILink[]>();

  for (const node of workflow.nodes) {
    incomingByNode.set(node.id, []);
    outgoingByNode.set(node.id, []);
  }

  for (const link of workflow.links) {
    const [, srcId, , tgtId] = link;
    outgoingByNode.get(srcId)?.push(link);
    incomingByNode.get(tgtId)?.push(link);
  }

  const enrichedNodes = workflow.nodes.map(node => {
    const schema = NODE_REGISTRY.get(node.type);
    const outLinks = outgoingByNode.get(node.id) || [];
    const inLinks = incomingByNode.get(node.id) || [];
    let modified = false;

    // --- Ensure outputs exist and have valid slot_index ---
    let outputs = node.outputs ? [...node.outputs.map(o => ({ ...o }))] : [];

    // Fix missing slot_index on existing outputs (default to array index)
    for (let i = 0; i < outputs.length; i++) {
      if (outputs[i].slot_index === undefined || outputs[i].slot_index === null) {
        outputs[i].slot_index = i;
        modified = true;
      }
    }

    // Ensure enough output slots for all outgoing links
    if (outLinks.length > 0) {
      const maxSrcSlot = Math.max(...outLinks.map(([, , srcSlot]) => srcSlot));
      for (let s = 0; s <= maxSrcSlot; s++) {
        const existingOutput = outputs.find(o => o.slot_index === s);
        if (!existingOutput) {
          // Find type from the link data
          const linkForSlot = outLinks.find(([, , srcSlot]) => srcSlot === s);
          const linkType = linkForSlot ? linkForSlot[5] : '*';
          outputs.push({
            name: schema?.outputs[s]?.name || linkType || `output_${s}`,
            type: linkType || '*',
            links: null,
            slot_index: s,
          });
          modified = true;
        }
      }
    }

    // Populate output.links from link data (fixes stale/missing links arrays)
    for (const output of outputs) {
      const linksForSlot = outLinks
        .filter(([, , srcSlot]) => srcSlot === output.slot_index)
        .map(([linkId]) => linkId);
      output.links = linksForSlot.length > 0 ? linksForSlot : null;
    }

    // Sort outputs by slot_index for consistent handle ordering
    outputs.sort((a, b) => a.slot_index - b.slot_index);

    // --- Ensure inputs exist and cover all incoming links ---
    let inputs = node.inputs ? [...node.inputs.map(i => ({ ...i }))] : [];

    if (inLinks.length > 0) {
      const maxTgtSlot = Math.max(...inLinks.map(([, , , , tgtSlot]) => tgtSlot));

      // Extend inputs array if links reference slots beyond current length
      for (let s = 0; s <= maxTgtSlot; s++) {
        if (s >= inputs.length) {
          const linkForSlot = inLinks.find(([, , , , tgtSlot]) => tgtSlot === s);
          const linkType = linkForSlot ? linkForSlot[5] : '*';
          inputs.push({
            name: schema?.inputs.filter(i => !i.isWidget)[s]?.name || linkType.toLowerCase() || `input_${s}`,
            type: linkType || '*',
            link: linkForSlot ? linkForSlot[0] : null,
          });
          modified = true;
        }
      }
    }

    // Back-fill link IDs into inputs from link data (fixes missing/stale link refs)
    for (let s = 0; s < inputs.length; s++) {
      const linkForSlot = inLinks.find(([, , , , tgtSlot]) => tgtSlot === s);
      if (linkForSlot) {
        inputs[s].link = linkForSlot[0];
        // Also back-fill type if current is generic
        if ((inputs[s].type === '*' || !inputs[s].type) && linkForSlot[5] && linkForSlot[5] !== '*') {
          inputs[s].type = linkForSlot[5];
          modified = true;
        }
      }
    }

    if (modified || outputs !== node.outputs || inputs !== node.inputs) {
      return {
        ...node,
        inputs: inputs.length > 0 ? inputs : undefined,
        outputs: outputs.length > 0 ? outputs : undefined,
      };
    }

    return node;
  });

  return {
    ...workflow,
    nodes: enrichedNodes,
  };
}

// ===== Main Import Pipeline =====

export interface ImportResult {
  success: boolean;
  workflow: ComfyUIWorkflow | null;
  format: WorkflowFormat;
  summary: string;
  nodeCount: number;
  linkCount: number;
  unknownNodes: string[];
  errorMessage?: string;
}

/**
 * Main entry point: parse raw JSON string, detect format, convert, validate.
 */
export function parseImportedWorkflow(jsonString: string): ImportResult {
  let data: any;

  try {
    data = JSON.parse(jsonString);
  } catch (e: any) {
    return {
      success: false,
      workflow: null,
      format: 'unknown',
      summary: '',
      nodeCount: 0,
      linkCount: 0,
      unknownNodes: [],
      errorMessage: `Invalid JSON: ${e.message}`,
    };
  }

  const format = detectWorkflowFormat(data);

  if (format === 'unknown') {
    return {
      success: false,
      workflow: null,
      format,
      summary: '',
      nodeCount: 0,
      linkCount: 0,
      unknownNodes: [],
      errorMessage: 'Unrecognized format. Expected ComfyUI Graph (nodes/links) or API (class_type) format.',
    };
  }

  let workflow: ComfyUIWorkflow;

  if (format === 'api') {
    try {
      workflow = convertAPIToGraph(data);
    } catch (e: any) {
      return {
        success: false,
        workflow: null,
        format,
        summary: '',
        nodeCount: 0,
        linkCount: 0,
        unknownNodes: [],
        errorMessage: `Failed to convert API format: ${e.message}`,
      };
    }
  } else {
    // Graph format — use directly
    workflow = data as ComfyUIWorkflow;

    // Auto-layout if all positions are zero
    if (workflow.nodes?.length) {
      const allZero = workflow.nodes.every(n => !n.pos || (n.pos[0] === 0 && n.pos[1] === 0));
      if (allZero) {
        workflow = autoLayoutWorkflow(workflow);
      }
    }
  }

  // Ensure basic structure
  if (!workflow.nodes) workflow.nodes = [];
  if (!workflow.links) workflow.links = [];
  if (!workflow.groups) workflow.groups = [];

  // Detect unknown nodes
  const unknownNodes: string[] = [];
  const nodeTypes = new Set<string>();
  for (const node of workflow.nodes) {
    nodeTypes.add(node.type);
    if (!NODE_REGISTRY.has(node.type)) {
      unknownNodes.push(node.type);
    }
  }

  // Enrich nodes to handle unknown/custom nodes
  workflow = enrichWorkflowNodes(workflow);

  // Resolve any overlapping nodes
  workflow = resolveOverlaps(workflow);

  // Build summary
  const summary = generateImportSummary(workflow, format, unknownNodes);

  return {
    success: true,
    workflow,
    format,
    summary,
    nodeCount: workflow.nodes.length,
    linkCount: workflow.links.length,
    unknownNodes,
  };
}

// ===== Summary Generator =====

function generateImportSummary(
  workflow: ComfyUIWorkflow,
  format: WorkflowFormat,
  unknownNodes: string[],
): string {
  const nodeTypes = workflow.nodes.map(n => n.type);
  const uniqueTypes = [...new Set(nodeTypes)];
  const validation = validateWorkflow(workflow);

  // Build a readable flow chain
  const typeList = uniqueTypes.length <= 8
    ? uniqueTypes.join(' -> ')
    : uniqueTypes.slice(0, 6).join(' -> ') + ` ... +${uniqueTypes.length - 6} more`;

  let summary = `Imported workflow (${format === 'api' ? 'API format, auto-converted' : 'Graph format'}) with **${workflow.nodes.length} nodes** and **${workflow.links.length} connections**:\n\n`;
  summary += `\`${typeList}\`\n\n`;

  if (unknownNodes.length > 0) {
    summary += `Unknown nodes (not in registry): ${unknownNodes.map(n => `\`${n}\``).join(', ')}\n\n`;
  }

  if (validation.isValid) {
    summary += `Validation: **0 errors**, ${validation.warnings.length} warning(s)\n\n`;
  } else {
    summary += `Validation: **${validation.errors.length} error(s)**, ${validation.warnings.length} warning(s)\n\n`;
  }

  summary += `You can now ask me to explain, modify, extend, or debug this workflow.`;

  return summary;
}

// ===== File Reader Utility =====

/**
 * Reads a File object and returns the parsed import result.
 */
export function readWorkflowFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      resolve({
        success: false,
        workflow: null,
        format: 'unknown',
        summary: '',
        nodeCount: 0,
        linkCount: 0,
        unknownNodes: [],
        errorMessage: 'Only .json files are supported.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        resolve({
          success: false,
          workflow: null,
          format: 'unknown',
          summary: '',
          nodeCount: 0,
          linkCount: 0,
          unknownNodes: [],
          errorMessage: 'File is empty.',
        });
        return;
      }
      resolve(parseImportedWorkflow(text));
    };
    reader.onerror = () => {
      resolve({
        success: false,
        workflow: null,
        format: 'unknown',
        summary: '',
        nodeCount: 0,
        linkCount: 0,
        unknownNodes: [],
        errorMessage: 'Failed to read file.',
      });
    };
    reader.readAsText(file);
  });
}
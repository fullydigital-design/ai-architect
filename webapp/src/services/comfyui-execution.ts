/**
 * ComfyUI Execution Service
 *
 * Phase 2: Submits workflows to a running ComfyUI backend, tracks progress
 * via WebSocket, and retrieves generated images.
 *
 * Flow: convertGraphToAPI() → queuePrompt() → WebSocket progress → fetchImages()
 */

import type { ComfyUIWorkflow } from '../types/comfyui';
import { convertGraphToAPI, detectMixedContent, getLiveNodeCache, resolveComfyUrl } from './comfyui-backend';
import { NODE_REGISTRY } from '../data/node-registry';
import { getComfyUIWebSocketUrl } from './api-config';
import { validateWorkflowPipeline, type PipelineValidationResult } from './workflow-validator';

const FRONTEND_ONLY_NODE_TYPES = new Set([
  'Note',
  'Reroute',
  'PrimitiveNode',
]);

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExecutionProgress {
  status: 'queued' | 'running' | 'complete' | 'error' | 'cancelled';
  promptId?: string;
  currentNode?: string;
  currentNodeClass?: string;
  step?: number;
  totalSteps?: number;
  percentage?: number;
  error?: string;
  /** List of node IDs that have finished executing */
  completedNodes: string[];
}

export interface ExecutionImage {
  filename: string;
  subfolder: string;
  type: string;
  /** Node ID that produced this image */
  nodeId: string;
  /** Full URL to fetch the image */
  url: string;
}

export interface ExecutionResult {
  success: boolean;
  promptId: string;
  images: ExecutionImage[];
  error?: string;
  /** Total execution time in ms */
  durationMs: number;
  /** Phase 4: Rich error details for AI debugging */
  errorDetails?: ExecutionErrorDetails;
}

/** Phase 4: Structured error data from ComfyUI execution */
export interface ExecutionErrorDetails {
  exceptionType?: string;
  exceptionMessage?: string;
  traceback?: string[];
  nodeId?: string;
  nodeType?: string;
  /** Per-node errors from /prompt validation */
  nodeErrors?: Record<string, {
    classType?: string;
    errors: Array<{ type: string; message: string; details?: string }>;
  }>;
}

export type ProgressCallback = (progress: ExecutionProgress) => void;

export interface ValidateAndExecuteOptions {
  skipValidation?: boolean;
  autoFixOnly?: boolean;
  onValidationComplete?: (result: PipelineValidationResult) => void;
}

// ── Queue Prompt ─────────────────────────────────────────────────────────────

/**
 * Submit a workflow to ComfyUI's /prompt endpoint.
 * Returns the prompt_id for tracking via WebSocket.
 */
export async function queuePrompt(
  url: string,
  workflow: ComfyUIWorkflow,
  clientId: string,
): Promise<{ promptId: string }> {
  const baseUrl = normalizeUrl(url);
  const rawApiWorkflow = convertGraphToAPI(workflow);
  const apiWorkflow = stripFrontendOnlyNodes(rawApiWorkflow);
  const payload = {
    prompt: apiWorkflow,
    client_id: clientId,
  };

  console.log('[Prompt Debug] Payload being sent:', JSON.stringify(payload, null, 2));

  const validationErrors = validatePromptPayload(apiWorkflow);
  if (validationErrors.length > 0) {
    console.error('[Prompt Debug] Local prompt validation failed:', validationErrors);
    throw new Error(`Prompt payload validation failed: ${validationErrors.join('; ')}`);
  }

  const response = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorData: any = null;
    let errorText = '';

    try {
      errorData = await response.json();
    } catch {
      errorText = await response.text().catch(() => '');
    }

    if (errorData) {
      console.error('[Prompt Debug] ComfyUI rejected prompt:', JSON.stringify(errorData, null, 2));
    } else {
      console.error('[Prompt Debug] ComfyUI rejected prompt:', errorText || `(no response body, HTTP ${response.status})`);
    }

    const nodeErrorMessage = errorData?.node_errors ? formatNodeErrors(errorData.node_errors) : '';
    const errorMsg = errorData?.error?.message
      || nodeErrorMessage
      || errorText
      || `HTTP ${response.status}: ${response.statusText}`;

    throw new Error(errorMsg as string);
  }

  const data = await response.json();
  return { promptId: data.prompt_id };
}

/**
 * Validate workflow before execution and return whether execution should continue.
 * UI can decide to auto-run or show a validation report for user confirmation.
 */
export function validateAndExecute(
  url: string,
  workflow: ComfyUIWorkflow,
  progressCallback: ProgressCallback,
  options?: ValidateAndExecuteOptions,
): {
  executed: boolean;
  validationResult: PipelineValidationResult;
  execution?: { promise: Promise<ExecutionResult>; cancel: () => void };
} {
  if (options?.skipValidation) {
    return {
      executed: true,
      validationResult: {
        isValid: true,
        fixedWorkflow: workflow,
        wasModified: false,
        issues: [],
        stats: {
          totalIssues: 0,
          autoFixed: 0,
          unfixable: 0,
          manualReview: 0,
          byStage: {
            stage1_existence: 0,
            stage2_structural: 0,
            stage3_connections: 0,
            stage4_values: 0,
          },
        },
        confidence: 100,
        summary: 'Validation skipped.',
        validationTimeMs: 0,
      },
      execution: executeWorkflow(url, workflow, progressCallback),
    };
  }

  const validationResult = validateWorkflowPipeline(workflow);
  options?.onValidationComplete?.(validationResult);

  if (!validationResult.isValid) {
    return { executed: false, validationResult };
  }

  if (validationResult.wasModified && !options?.autoFixOnly) {
    return { executed: false, validationResult };
  }

  return {
    executed: true,
    validationResult,
    execution: executeWorkflow(
      url,
      validationResult.fixedWorkflow as ComfyUIWorkflow,
      progressCallback,
    ),
  };
}

function formatNodeErrors(nodeErrors: Record<string, any> | undefined): string {
  if (!nodeErrors) return 'Unknown error';
  const msgs: string[] = [];
  for (const [nodeId, err] of Object.entries(nodeErrors)) {
    if (err?.errors) {
      for (const e of err.errors) {
        msgs.push(`Node ${nodeId} (${err.class_type || '?'}): ${e.message || JSON.stringify(e)}`);
      }
    }
  }
  return msgs.length > 0 ? msgs.join('; ') : 'Execution error (check ComfyUI console)';
}

// ── WebSocket Progress Tracking ──────────────────────────────────────────────

/**
 * Execute a workflow end-to-end: submit, track via WebSocket, collect results.
 *
 * Returns a promise that resolves with the execution results (images),
 * or rejects on error. Calls progressCallback on each status update.
 */
export function executeWorkflow(
  url: string,
  workflow: ComfyUIWorkflow,
  progressCallback: ProgressCallback,
): { promise: Promise<ExecutionResult>; cancel: () => void } {
  const baseUrl = normalizeUrl(url);
  const wsUrl = getComfyUIWebSocketUrl(url).replace(/\/+$/, '');
  const clientId = generateClientId();
  let ws: WebSocket | null = null;
  let cancelled = false;
  const startTime = Date.now();

  // Early check: mixed content will always fail
  if (detectMixedContent(baseUrl)) {
    const errorResult: ExecutionResult = {
      success: false,
      promptId: '',
      images: [],
      error: 'HTTPS → HTTP blocked by browser (Mixed Content). Open this site via HTTP or run locally.',
      durationMs: 0,
    };
    progressCallback({ status: 'error', error: errorResult.error, completedNodes: [] });
    return {
      promise: Promise.resolve(errorResult),
      cancel: () => {},
    };
  }

  // Build a node class lookup for display names
  const nodeClassMap = new Map<string, string>();
  for (const node of workflow.nodes) {
    nodeClassMap.set(String(node.id), node.type);
  }

  const promise = new Promise<ExecutionResult>(async (resolve, reject) => {
    try {
      // Step 1: Connect WebSocket FIRST
      ws = new WebSocket(`${wsUrl}/ws?clientId=${clientId}`);

      await new Promise<void>((wsResolve, wsReject) => {
        const timeout = setTimeout(() => {
          wsReject(new Error('WebSocket connection timeout'));
        }, 10000);

        ws!.onopen = () => {
          clearTimeout(timeout);
          wsResolve();
        };
        ws!.onerror = () => {
          clearTimeout(timeout);
          wsReject(new Error('WebSocket connection failed'));
        };
      });

      if (cancelled) {
        ws.close();
        return resolve({
          success: false,
          promptId: '',
          images: [],
          error: 'Cancelled',
          durationMs: Date.now() - startTime,
        });
      }

      // Step 2: Queue the prompt
      progressCallback({
        status: 'queued',
        completedNodes: [],
      });

      const { promptId } = await queuePrompt(url, workflow, clientId);

      // Step 3: Listen for progress messages
      const images: ExecutionImage[] = [];
      const completedNodes: string[] = [];

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWSMessage(msg, promptId, baseUrl, nodeClassMap, completedNodes, images, progressCallback);

          // Check for completion
          if (
            msg.type === 'executing' &&
            msg.data?.prompt_id === promptId &&
            msg.data?.node === null
          ) {
            // Execution complete
            ws?.close();
            resolve({
              success: true,
              promptId,
              images,
              durationMs: Date.now() - startTime,
            });
          }

          // Check for error
          if (
            msg.type === 'execution_error' &&
            msg.data?.prompt_id === promptId
          ) {
            ws?.close();
            const errorMsg = msg.data?.exception_message
              || msg.data?.exception_type
              || 'Execution error';
            resolve({
              success: false,
              promptId,
              images,
              error: `${errorMsg}${msg.data?.node_id ? ` (node ${msg.data.node_id})` : ''}`,
              durationMs: Date.now() - startTime,
              errorDetails: {
                exceptionType: msg.data?.exception_type,
                exceptionMessage: msg.data?.exception_message,
                traceback: msg.data?.traceback,
                nodeId: msg.data?.node_id,
                nodeType: msg.data?.node_type,
                nodeErrors: msg.data?.node_errors,
              },
            });
          }
        } catch (e) {
          // Non-JSON message or binary data (preview images) — ignore
        }
      };

      ws.onerror = () => {
        reject(new Error('WebSocket error during execution'));
      };

      ws.onclose = (event) => {
        // If we haven't resolved yet, it might be an unexpected close
        if (!event.wasClean && images.length === 0) {
          reject(new Error('WebSocket connection closed unexpectedly'));
        }
      };

    } catch (err: any) {
      ws?.close();
      reject(err);
    }
  });

  const cancel = () => {
    cancelled = true;
    ws?.close();
    progressCallback({
      status: 'cancelled',
      completedNodes: [],
    });
  };

  return { promise, cancel };
}

function handleWSMessage(
  msg: any,
  promptId: string,
  baseUrl: string,
  nodeClassMap: Map<string, string>,
  completedNodes: string[],
  images: ExecutionImage[],
  progressCallback: ProgressCallback,
): void {
  if (msg.data?.prompt_id && msg.data.prompt_id !== promptId) return;

  switch (msg.type) {
    case 'execution_start':
      progressCallback({
        status: 'running',
        promptId,
        completedNodes: [...completedNodes],
      });
      break;

    case 'executing':
      if (msg.data?.node != null) {
        const nodeId = String(msg.data.node);
        const nodeClass = nodeClassMap.get(nodeId) || nodeId;
        progressCallback({
          status: 'running',
          promptId,
          currentNode: nodeId,
          currentNodeClass: nodeClass,
          completedNodes: [...completedNodes],
        });
      }
      break;

    case 'progress':
      progressCallback({
        status: 'running',
        promptId,
        currentNode: msg.data?.node ? String(msg.data.node) : undefined,
        currentNodeClass: msg.data?.node ? nodeClassMap.get(String(msg.data.node)) : undefined,
        step: msg.data?.value,
        totalSteps: msg.data?.max,
        percentage: msg.data?.max > 0 ? Math.round((msg.data.value / msg.data.max) * 100) : undefined,
        completedNodes: [...completedNodes],
      });
      break;

    case 'executed':
      if (msg.data?.node) {
        completedNodes.push(String(msg.data.node));

        // Collect output images
        const outputImages = msg.data?.output?.images;
        if (Array.isArray(outputImages)) {
          for (const img of outputImages) {
            images.push({
              filename: img.filename,
              subfolder: img.subfolder || '',
              type: img.type || 'output',
              nodeId: String(msg.data.node),
              url: `${baseUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`,
            });
          }
        }
      }
      break;

    case 'execution_cached':
      // Some nodes were cached and didn't need re-execution
      if (Array.isArray(msg.data?.nodes)) {
        for (const nodeId of msg.data.nodes) {
          completedNodes.push(String(nodeId));
        }
      }
      break;
  }
}

// ── Interrupt ────────────────────────────────────────────────────────────────

/**
 * Send an interrupt signal to ComfyUI to stop the current execution.
 */
export async function interruptExecution(url: string): Promise<void> {
  const baseUrl = normalizeUrl(url);
  await fetch(`${baseUrl}/interrupt`, { method: 'POST' });
}

// ── Utilities ────────────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  return resolveComfyUrl(url);
}

function generateClientId(): string {
  return 'wfa-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
}

function validatePromptPayload(prompt: Record<string, any>): string[] {
  const errors: string[] = [];
  const warnings: string[] = [];
  const liveCache = getLiveNodeCache();

  for (const [nodeId, node] of Object.entries(prompt)) {
    if (!node || typeof node !== 'object') {
      errors.push(`Node ${nodeId}: invalid node payload`);
      continue;
    }

    if (!node.class_type) {
      errors.push(`Node ${nodeId}: missing class_type`);
      continue;
    }

    if (!node.inputs || typeof node.inputs !== 'object') {
      errors.push(`Node ${nodeId}: missing inputs object`);
      continue;
    }

    const schemaInputs = liveCache?.nodes?.[node.class_type]?.inputs
      || NODE_REGISTRY.get(node.class_type)?.inputs
      || [];

    const requiredConnectionInputs = schemaInputs.filter((input) => input.isRequired && !input.isWidget);

    for (const input of requiredConnectionInputs) {
      const value = node.inputs[input.name];
      if (value === undefined || value === null) {
        errors.push(`Node ${nodeId} (${node.class_type}): missing required input "${input.name}"`);
        continue;
      }
      if (!Array.isArray(value) || value.length < 2) {
        errors.push(`Node ${nodeId} (${node.class_type}): input "${input.name}" must be [sourceNodeId, outputIndex]`);
        continue;
      }
      if (typeof value[0] !== 'string' || !value[0].trim()) {
        errors.push(`Node ${nodeId} (${node.class_type}): input "${input.name}" source node id must be a string`);
      }
      if (typeof value[1] !== 'number' || Number.isNaN(value[1])) {
        errors.push(`Node ${nodeId} (${node.class_type}): input "${input.name}" output index must be a number`);
      }
    }

    for (const input of schemaInputs.filter((entry) => entry.isWidget)) {
      const value = node.inputs[input.name];
      if (value === undefined || value === null) continue;

      const inputType = (input.type || '').toUpperCase();
      if ((inputType === 'FLOAT' || inputType === 'INT') && typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
        warnings.push(`Node ${nodeId} (${node.class_type}): widget "${input.name}" is numeric string "${value}"`);
      }

      if (input.options && input.options.length > 0 && typeof value === 'string' && !input.options.includes(value)) {
        warnings.push(`Node ${nodeId} (${node.class_type}): widget "${input.name}" value "${value}" is not in allowed options`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('[Prompt Validate] Potential payload issues:', warnings);
  }

  return errors;
}

/**
 * Strips ONLY known frontend-only node types from the API prompt payload.
 * These exist in LiteGraph UI but have no backend handler in ComfyUI.
 *
 * IMPORTANT: Do not strip based on /object_info cache lookups. Cache state can
 * be incomplete and removing valid custom nodes corrupts downstream links.
 */
function stripFrontendOnlyNodes(prompt: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  let strippedCount = 0;

  for (const [id, node] of Object.entries(prompt)) {
    const classType = String((node as any)?.class_type || '');
    if (!classType) continue;

    if (FRONTEND_ONLY_NODE_TYPES.has(classType)) {
      console.debug(`[Prompt] Stripped frontend-only node "${classType}" (ID: ${id})`);
      strippedCount += 1;
      continue;
    }

    cleaned[id] = node;
  }

  if (strippedCount > 0) {
    console.info(`[Prompt] Stripped ${strippedCount} frontend-only node(s) from payload`);
  }

  return cleaned;
}

// ── Phase 4: Debug Prompt Builder ────────────────────────────────────────────

const CLIP_LOADER_TYPES = new Set([
  'CLIPLoader', 'DualCLIPLoader', 'CLIPLoaderGGUF', 'DualCLIPLoaderGGUF',
]);
const UNET_LOADER_TYPES = new Set([
  'UNETLoader', 'UnetLoaderGGUF', 'CheckpointLoaderSimple', 'CheckpointLoader',
]);

/**
 * Walk backward through workflow links to find all upstream CLIP loader nodes
 * that ultimately feed into a given node (by traversing the link graph).
 */
function findUpstreamClipLoaders(
  nodeId: number,
  workflow: ComfyUIWorkflow,
  visited = new Set<number>(),
): Array<{ type: string; id: number; modelFile: string }> {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const results: Array<{ type: string; id: number; modelFile: string }> = [];
  const node = workflow.nodes.find(n => n.id === nodeId);
  if (!node) return results;

  if (CLIP_LOADER_TYPES.has(node.type || '')) {
    const modelFile = String(node.widgets_values?.[0] ?? '');
    results.push({ type: node.type || 'CLIPLoader', id: node.id, modelFile });
    return results;
  }

  // Walk upstream links
  for (const link of workflow.links) {
    if (link[3] === nodeId) {
      results.push(...findUpstreamClipLoaders(link[1], workflow, visited));
    }
  }
  return results;
}

/**
 * Parse "mat1 and mat2 shapes cannot be multiplied (AxB and CxD)" and return
 * { inputDim: B, weightIn: C, weightOut: D } for shape analysis.
 */
function parseMatMulShapes(message: string): { inputDim: number; weightIn: number; weightOut: number } | null {
  const m = /\((\d+)x(\d+)\s+and\s+(\d+)x(\d+)\)/.exec(message);
  if (!m) return null;
  return { inputDim: Number(m[2]), weightIn: Number(m[3]), weightOut: Number(m[4]) };
}

/**
 * Build a pre-parsed diagnosis for known error classes.
 * Returns a markdown section string, or null if no specific diagnosis matched.
 */
function buildDiagnosis(
  result: ExecutionResult,
  workflow: ComfyUIWorkflow,
): string | null {
  const ed = result.errorDetails;
  if (!ed) return null;

  const tb = (ed.traceback ?? []).join('\n');
  const msg = ed.exceptionMessage ?? '';

  // ── Pattern: tensor matmul shape mismatch ───────────────────────────────────
  if (ed.exceptionType === 'RuntimeError' && msg.includes('shapes cannot be multiplied')) {
    const shapes = parseMatMulShapes(msg);

    // Detect FLUX txt_in mismatch: error in ldm/flux/model.py at txt_in
    // → the text encoder outputs wrong hidden-dim for this diffusion model
    const isFluxTxtIn = tb.includes('txt_in') || tb.includes('ldm/flux/model');

    const lines: string[] = [];
    lines.push(`## Pre-Parsed Diagnosis`);
    lines.push(`**Error class:** Tensor shape mismatch during matrix multiply`);

    if (shapes) {
      lines.push(`**Input tensor dim:** ${shapes.inputDim} (what the text encoder produced)`);
      lines.push(`**Weight matrix:** ${shapes.weightIn}×${shapes.weightOut} (what the diffusion model's projection expects as input: ${shapes.weightIn})`);
    }

    if (isFluxTxtIn) {
      lines.push(`**Location:** FLUX transformer \`txt_in\` input projection — this is the FIRST layer that consumes text encoder output.`);
      lines.push(`**Root cause:** The CLIP/text encoder model file produces embeddings with hidden_size=${shapes?.inputDim ?? '?'}, but the FLUX diffusion model's \`txt_in\` projection weight expects hidden_size=${shapes?.weightIn ?? '?'}. These are incompatible models.`);
      lines.push(`**The ONLY fix is to change the CLIP/text encoder model.** No parameter change, sampler swap, or structural modification will resolve a hidden-dimension incompatibility.`);
    } else {
      lines.push(`**Root cause:** A tensor entering a linear layer has the wrong last dimension. This is almost always caused by loading a model file that belongs to a different architecture than what the workflow expects.`);
    }

    // Find which CLIP loaders feed the failing node
    if (ed.nodeId) {
      const clipLoaders = findUpstreamClipLoaders(Number(ed.nodeId), workflow);
      if (clipLoaders.length > 0) {
        lines.push(`\n**Current text encoder(s) feeding the failing node:**`);
        for (const cl of clipLoaders) {
          lines.push(`- ${cl.type} #${cl.id}: \`${cl.modelFile || '(unknown)'}\` → produces ${shapes?.inputDim ?? '?'}-dim embeddings`);
        }
        lines.push(`**Action required:** Replace the model file(s) above with one that produces ${shapes?.weightIn ?? '?'}-dim embeddings and is compatible with the loaded diffusion model.`);
      }
    }

    // Find the UNET/checkpoint being used
    const unetNode = workflow.nodes.find(n => UNET_LOADER_TYPES.has(n.type || ''));
    if (unetNode) {
      const unetFile = String(unetNode.widgets_values?.[0] ?? '');
      lines.push(`\n**Diffusion model in use:** ${unetNode.type} #${unetNode.id}: \`${unetFile}\``);
      lines.push(`The text encoder you select MUST be from the same model family as this diffusion model.`);
    }

    lines.push(`\nTIPS: If you have any "Load CLIP" or "*CLIP Loader" nodes in your workflow connected to this sampler node make sure the correct file(s) and type is selected.`);
    return lines.join('\n');
  }

  return null;
}

/**
 * Build an AI debug prompt from an execution error, including the error context,
 * traceback, failing node details, and a snippet of the workflow.
 */
export function buildDebugPrompt(
  result: ExecutionResult,
  workflow: ComfyUIWorkflow,
): string {
  const ed = result.errorDetails;
  const parts: string[] = [];

  parts.push(`My ComfyUI workflow failed during execution. Please analyze the error and suggest fixes.\n`);

  // Error summary
  parts.push(`## Error Summary`);
  if (ed?.exceptionType) parts.push(`**Exception type:** \`${ed.exceptionType}\``);
  if (ed?.exceptionMessage) parts.push(`**Message:** ${ed.exceptionMessage}`);
  if (!ed?.exceptionType && result.error) parts.push(`**Error:** ${result.error}`);

  // Pre-parsed diagnosis for known error classes (injected before node details)
  const diagnosis = buildDiagnosis(result, workflow);
  if (diagnosis) {
    parts.push(`\n${diagnosis}`);
  }

  // Failing node context
  if (ed?.nodeId) {
    const failingNode = workflow.nodes.find(n => String(n.id) === ed.nodeId);
    parts.push(`\n## Failing Node`);
    parts.push(`- **Node ID:** ${ed.nodeId}`);
    parts.push(`- **Node Type:** ${ed.nodeType || failingNode?.type || 'Unknown'}`);
    if (failingNode?.title) parts.push(`- **Title:** ${failingNode.title}`);
    if (failingNode?.widgets_values?.length) {
      parts.push(`- **Widget values:** \`${JSON.stringify(failingNode.widgets_values)}\``);
    }
    // Show connections to this node
    const incomingLinks = workflow.links.filter(l => l[3] === Number(ed.nodeId));
    if (incomingLinks.length > 0) {
      parts.push(`- **Incoming connections:** ${incomingLinks.map(l => {
        const srcNode = workflow.nodes.find(n => n.id === l[1]);
        return `${srcNode?.type || l[1]} → slot ${l[4]} (${l[5]})`;
      }).join(', ')}`);
    }
  }

  // Per-node validation errors (from /prompt)
  if (ed?.nodeErrors && Object.keys(ed.nodeErrors).length > 0) {
    parts.push(`\n## Node Validation Errors`);
    for (const [nid, nerr] of Object.entries(ed.nodeErrors)) {
      const ct = nerr.classType || 'Unknown';
      for (const e of nerr.errors) {
        parts.push(`- Node ${nid} (${ct}): [${e.type}] ${e.message}${e.details ? ' — ' + e.details : ''}`);
      }
    }
  }

  // Traceback (truncated to last 15 lines for prompt efficiency)
  if (ed?.traceback && ed.traceback.length > 0) {
    const tb = ed.traceback;
    const truncated = tb.length > 15 ? tb.slice(-15) : tb;
    parts.push(`\n## Traceback (last ${truncated.length} lines)`);
    parts.push('```');
    parts.push(truncated.join('\n'));
    parts.push('```');
  }

  // Compact workflow summary (just nodes, not the full JSON)
  parts.push(`\n## Workflow Summary (${workflow.nodes.length} nodes, ${workflow.links.length} links)`);
  const nodeList = workflow.nodes.map(n =>
    `  ${n.id}: ${n.type}${n.title && n.title !== n.type ? ` ("${n.title}")` : ''}`
  );
  parts.push(nodeList.join('\n'));

  parts.push(`\nPlease explain what went wrong in plain language and provide a corrected workflow in a \`\`\`json:workflow block if you can fix it. Common causes include: missing models, wrong tensor dimensions, out-of-memory, incompatible node versions, and misconfigured widget values.`);

  return parts.join('\n');
}




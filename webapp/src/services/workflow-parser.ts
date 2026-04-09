import type {
  ComfyUIAPIWorkflow,
  ComfyUIWorkflow,
  RequiredNode,
} from '../types/comfyui';
import { CUSTOM_NODE_PACKS } from '../data/custom-nodes';
import { NODE_REGISTRY } from '../data/node-registry';
import { apiToGraph } from './api-to-graph-converter';

export interface ParsedResponse {
  workflow: ComfyUIWorkflow | null;
  explanation: string;
  requiredNodes: RequiredNode[];
  recommendedModels: string;
  settingsGuide: string;
  rawJson: string;
  /** Raw API workflow JSON from `json:workflow-api` block, if present */
  rawApiJson?: string;
  /** Parsed API workflow object before conversion */
  apiWorkflow?: ComfyUIAPIWorkflow;
  /** Warnings from API -> Graph conversion */
  conversionWarnings?: string[];
  /** Node class_types that had no schema during conversion */
  unknownNodes?: string[];
}

export function parseAIResponse(response: string): ParsedResponse {
  const result: ParsedResponse = {
    workflow: null,
    explanation: '',
    requiredNodes: [],
    recommendedModels: '',
    settingsGuide: '',
    rawJson: ''
  };

  // Prefer API format workflow first.
  const apiMatch = response.match(/```json:workflow-api\s*\n([\s\S]*?)\n```/);
  if (apiMatch) {
    try {
      const apiJson = apiMatch[1].trim();
      const apiWorkflow = JSON.parse(apiJson) as ComfyUIAPIWorkflow;
      const conversion = apiToGraph(apiWorkflow);
      result.rawApiJson = apiJson;
      result.rawJson = apiJson;
      result.apiWorkflow = apiWorkflow;
      result.workflow = conversion.workflow;
      result.conversionWarnings = conversion.warnings;
      result.unknownNodes = conversion.unknownNodes;
    } catch (e) {
      console.error('Failed to parse API workflow JSON:', e);
    }
  }

  // Backward-compatible graph parsing fallback.
  if (!result.workflow) {
    const workflowMatch = response.match(/```json:workflow\s*\n([\s\S]*?)\n```/);
    if (workflowMatch) {
      try {
        result.rawJson = workflowMatch[1].trim();
        result.workflow = JSON.parse(result.rawJson) as ComfyUIWorkflow;
      } catch (e) {
        console.error('Failed to parse graph workflow JSON:', e);
      }
    }
  }

  // Generic JSON block fallback (supports both API and Graph payloads).
  if (!result.workflow) {
    const codeBlocks = extractJsonCodeBlocks(response);
    for (const block of codeBlocks) {
      try {
        const parsed = JSON.parse(block) as unknown;
        if (isGraphWorkflow(parsed)) {
          result.rawJson = block;
          result.workflow = parsed as ComfyUIWorkflow;
          break;
        }
        if (isAPIWorkflow(parsed)) {
          const apiWorkflow = parsed as ComfyUIAPIWorkflow;
          const conversion = apiToGraph(apiWorkflow);
          result.rawApiJson = block;
          result.rawJson = block;
          result.apiWorkflow = apiWorkflow;
          result.workflow = conversion.workflow;
          result.conversionWarnings = conversion.warnings;
          result.unknownNodes = conversion.unknownNodes;
          break;
        }
      } catch {
        // ignore malformed blocks
      }
    }
  }

  // Extract explanation
  const explMatch = response.match(/\*\*Explanation:\*\*\s*([\s\S]*?)(?=\*\*Recommended Models:|$)/);
  if (explMatch) {
    result.explanation = explMatch[1].trim();
  } else {
    // Get text after the JSON block
    const afterJson = response.split(/```\s*\n/);
    if (afterJson.length > 1) {
      const textParts = afterJson.slice(1).filter(p => !p.startsWith('{'));
      result.explanation = textParts.join('\n').trim();
    }
  }

  // Extract recommended models
  const modelsMatch = response.match(/\*\*Recommended Models:\*\*\s*([\s\S]*?)(?=\*\*Required Custom Nodes:|$)/);
  if (modelsMatch) {
    result.recommendedModels = modelsMatch[1].trim();
  }

  // Extract settings guide
  const settingsMatch = response.match(/\*\*Settings Guide:\*\*\s*([\s\S]*?)$/);
  if (settingsMatch) {
    result.settingsGuide = settingsMatch[1].trim();
  }

  // Detect required custom nodes from the workflow
  if (result.workflow) {
    result.requiredNodes = detectRequiredNodes(result.workflow);
  }

  return result;
}

export function detectRequiredNodes(workflow: ComfyUIWorkflow): RequiredNode[] {
  const required: RequiredNode[] = [];
  const seenPacks = new Set<string>();

  for (const node of workflow.nodes) {
    const schema = NODE_REGISTRY.get(node.type);
    
    if (schema?.source === 'custom' && schema.customNodePack && !seenPacks.has(schema.customNodePack)) {
      seenPacks.add(schema.customNodePack);
      const pack = CUSTOM_NODE_PACKS.find(p => p.name === schema.customNodePack);
      required.push({
        name: schema.customNodePack,
        installCommand: pack?.installCommand || `comfy node install ${schema.customNodePack.toLowerCase()}`,
        githubUrl: schema.githubUrl || pack?.github || '',
        reason: `Required for node: ${node.type}`
      });
    } else if (!schema) {
      // Unknown node - might be from an unregistered custom pack
      // Try to match against known packs
      for (const pack of CUSTOM_NODE_PACKS) {
        if (pack.keyNodes.includes(node.type) && !seenPacks.has(pack.name)) {
          seenPacks.add(pack.name);
          required.push({
            name: pack.name,
            installCommand: pack.installCommand,
            githubUrl: pack.github,
            reason: `Required for node: ${node.type}`
          });
        }
      }
    }
  }

  return required;
}

export function extractMarkdownSections(response: string): string {
  // Remove the JSON block and return the rest as markdown
  return response
    .replace(/```json:workflow-api\s*\n[\s\S]*?\n```/g, '')
    .replace(/```json:workflow\s*\n[\s\S]*?\n```/g, '')
    .replace(/```json\s*\n\{[\s\S]*?"nodes"[\s\S]*?"links"[\s\S]*?\}\n```/g, '')
    .trim();
}

function isGraphWorkflow(value: unknown): value is ComfyUIWorkflow {
  if (!value || typeof value !== 'object') return false;
  const workflow = value as Record<string, unknown>;
  return Array.isArray(workflow.nodes) && Array.isArray(workflow.links);
}

function isAPIWorkflow(value: unknown): value is ComfyUIAPIWorkflow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).some((entry) => (
    !!entry
    && typeof entry === 'object'
    && typeof (entry as Record<string, unknown>).class_type === 'string'
  ));
}

function extractJsonCodeBlocks(response: string): string[] {
  const blocks: string[] = [];
  const blockRegex = /```(?:json(?::workflow-api|:workflow)?)?\s*\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(response)) !== null) {
    const candidate = match[1]?.trim();
    if (candidate && candidate.startsWith('{')) {
      blocks.push(candidate);
    }
  }
  return blocks;
}

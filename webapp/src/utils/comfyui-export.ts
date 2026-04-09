import type { ComfyUIWorkflow, RequiredNode } from '../types/comfyui';
import { NODE_REGISTRY } from '../data/node-registry';

const FRONTEND_ONLY_NODE_TYPES = new Set([
  'Note',
  'Reroute',
  'PrimitiveNode',
]);

// ---- Well-known placeholder filenames that users should replace -------------

const PLACEHOLDER_PATTERNS: Record<string, string> = {
  // Checkpoints
  'v1-5-pruned-emaonly.safetensors': 'Replace with your SD 1.5 checkpoint',
  'dreamshaper_8.safetensors': 'Replace with your SD 1.5 checkpoint',
  'sd_xl_base_1.0.safetensors': 'Replace with your SDXL checkpoint',
  'dreamshaperXL_v21TurboDPMSDE.safetensors': 'Replace with your SDXL checkpoint',
  'sd_xl_refiner_1.0.safetensors': 'Replace with your SDXL refiner (optional)',
  'flux1-dev.safetensors': 'Replace with your FLUX model file',
  // VAE
  'vae-ft-mse-840000-ema-pruned.safetensors': 'Replace with your VAE (or use baked-in)',
  'sdxl_vae.safetensors': 'Replace with your SDXL VAE',
  'ae.safetensors': 'FLUX VAE — download from HuggingFace if missing',
  // CLIP
  't5xxl_fp16.safetensors': 'FLUX T5 encoder — download from HuggingFace',
  'clip_l.safetensors': 'CLIP-L for FLUX — download from HuggingFace',
  // ControlNet
  'control_v11p_sd15_canny.pth': 'Replace with your ControlNet model',
  'control_v11f1p_sd15_depth.pth': 'Replace with your depth ControlNet',
  'control_v11p_sd15_openpose.pth': 'Replace with your OpenPose ControlNet',
  'diffusers_xl_canny_mid.safetensors': 'Replace with your SDXL ControlNet',
  // Upscale
  'RealESRGAN_x4plus.pth': 'Download from https://github.com/xinntao/Real-ESRGAN',
  '4x-UltraSharp.pth': 'Download from https://openmodeldb.info',
  // LoRA
  'your_lora.safetensors': 'Replace with your LoRA file',
  // IPAdapter
  'ip-adapter-plus_sd15.safetensors': 'Download from HuggingFace h94/IP-Adapter',
  'ip-adapter-plus_sdxl_vit-h.safetensors': 'Download from HuggingFace h94/IP-Adapter',
  'CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors': 'Download CLIP Vision model from HuggingFace',
  // Images
  'example.png': 'Replace with your input image',
};

/**
 * Scan a workflow for placeholder model/image filenames and build a manifest.
 */
function detectPlaceholders(workflow: ComfyUIWorkflow): Record<string, { field: string; value: string; hint: string }> {
  const placeholders: Record<string, { field: string; value: string; hint: string }> = {};

  for (const node of workflow.nodes) {
    if (!node.widgets_values) continue;
    for (let i = 0; i < node.widgets_values.length; i++) {
      const val = node.widgets_values[i];
      if (typeof val === 'string' && PLACEHOLDER_PATTERNS[val]) {
        const schema = NODE_REGISTRY.get(node.type);
        const widgetInputs = schema?.inputs.filter(inp => inp.isWidget) || [];
        const fieldName = widgetInputs[i]?.name || `widget_${i}`;
        placeholders[`node_${node.id}`] = {
          field: fieldName,
          value: val,
          hint: PLACEHOLDER_PATTERNS[val],
        };
      }
    }
  }

  return placeholders;
}

/**
 * Build ComfyUI Manager install hints from required nodes.
 */
function buildManagerHints(requiredNodes: RequiredNode[]): {
  custom_nodes: Array<{ url: string; install_command: string; reason: string }>;
} {
  return {
    custom_nodes: requiredNodes.map(n => ({
      url: n.githubUrl,
      install_command: n.installCommand,
      reason: n.reason,
    })),
  };
}

// Export as Graph/UI format (for ComfyUI Load/Import)
export function exportGraphFormat(workflow: ComfyUIWorkflow): string {
  return JSON.stringify(workflow, null, 2);
}

/**
 * Enhanced Graph export — includes workflow + metadata for ComfyUI Manager
 * compatibility and placeholder substitution hints.
 */
export function exportEnhancedGraphFormat(
  workflow: ComfyUIWorkflow,
  requiredNodes: RequiredNode[],
): string {
  const placeholders = detectPlaceholders(workflow);
  const hasPlaceholders = Object.keys(placeholders).length > 0;
  const hasCustomNodes = requiredNodes.length > 0;

  if (!hasPlaceholders && !hasCustomNodes) {
    // No metadata needed — export clean
    return JSON.stringify(workflow, null, 2);
  }

  // Build the enhanced JSON with metadata sections
  const enhanced: Record<string, any> = { ...workflow };

  if (hasCustomNodes) {
    enhanced._workflow_architect = {
      generated: new Date().toISOString(),
      tool: 'ComfyUI Workflow Architect by fullydigital.pictures',
      custom_nodes_required: buildManagerHints(requiredNodes).custom_nodes,
    };
  }

  if (hasPlaceholders) {
    enhanced._placeholders = placeholders;
  }

  return JSON.stringify(enhanced, null, 2);
}

// Export as API format (for programmatic queue via /prompt endpoint)
export function exportAPIFormat(workflow: ComfyUIWorkflow): string {
  const apiWorkflow: Record<string, any> = {};

  for (const node of workflow.nodes) {
    if (FRONTEND_ONLY_NODE_TYPES.has(node.type)) {
      continue;
    }

    const inputs: Record<string, any> = {};
    const schema = NODE_REGISTRY.get(node.type);

    // Add widget values
    if (schema && node.widgets_values) {
      const widgetInputs = schema.inputs.filter(i => i.isWidget);
      widgetInputs.forEach((input, idx) => {
        if (node.widgets_values && node.widgets_values[idx] !== undefined) {
          inputs[input.name] = node.widgets_values[idx];
        }
      });
    }

    // Add connection references from links
    for (const link of workflow.links) {
      const [, srcNode, srcSlot, tgtNode, tgtSlot] = link;
      if (tgtNode === node.id) {
        const tgtInputName = node.inputs?.[tgtSlot]?.name;
        if (tgtInputName) {
          inputs[tgtInputName] = [String(srcNode), srcSlot];
        }
      }
    }

    apiWorkflow[String(node.id)] = {
      class_type: node.type,
      inputs
    };
  }

  return JSON.stringify(apiWorkflow, null, 2);
}

// Export install commands for required custom nodes
export function exportInstallScript(requiredNodes: RequiredNode[]): string {
  if (requiredNodes.length === 0) return '# No custom nodes required - all nodes are built-in!';
  
  const lines = [
    '#!/bin/bash',
    '# Install required custom nodes for this ComfyUI workflow',
    '# Run these commands in your ComfyUI directory',
    '# Or install via ComfyUI Manager',
    '',
    ...requiredNodes.map(n => `# ${n.reason}`),
    ...requiredNodes.map(n => n.installCommand),
    '',
    '# After installing, restart ComfyUI'
  ];
  
  return lines.join('\n');
}

// Download as file
export function downloadFile(content: string, filename: string, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}

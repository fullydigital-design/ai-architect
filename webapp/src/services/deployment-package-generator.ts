/**
 * Deployment Package Generator - Phase 9A
 *
 * Generates a portable workflow package containing:
 * - workflow.json
 * - setup_workflow.bat
 * - README.txt
 */

import JSZip from 'jszip';
import type { ComfyUIWorkflow } from '../types/comfyui';
import type { WorkflowAnalysis, DetectedPack, ModelSlot } from './workflow-analyzer';
import { exportGraphFormat } from '../utils/comfyui-export';
import { getModelSubfolder, lookupKnownModel, type KnownModel } from '../data/known-models-db';

export interface ModelOverride {
  filename: string;
  downloadUrl: string;
  include: boolean;
}

export interface DeploymentPackageConfig {
  workflowName: string;
  description?: string;
  modelOverrides: ModelOverride[];
  includeModels: boolean;
  includePipDeps: boolean;
}

export interface PackageContents {
  workflowJson: string;
  setupBat: string;
  readmeTxt: string;
}

interface ResolvedModel {
  slot: ModelSlot;
  knownModel?: KnownModel;
  overrideUrl: string;
  subfolder: string;
  basename: string;
}

function getBasename(pathValue: string): string {
  const byBackslash = pathValue.split('\\').pop();
  const bySlash = pathValue.split('/').pop();
  return (byBackslash && byBackslash.length <= pathValue.length ? byBackslash : bySlash) || pathValue;
}

function escapeForBat(value: string): string {
  return value
    .replace(/%/g, '%%')
    .replace(/\^/g, '^^')
    .replace(/&/g, '^&')
    .replace(/</g, '^<')
    .replace(/>/g, '^>')
    .replace(/\|/g, '^|');
}

function resolveModels(modelSlots: ModelSlot[], overrides: ModelOverride[]): ResolvedModel[] {
  const overrideMap = new Map<string, ModelOverride>();
  for (const override of overrides) {
    overrideMap.set(override.filename, override);
    overrideMap.set(getBasename(override.filename).toLowerCase(), override);
  }

  const seen = new Set<string>();
  const resolved: ResolvedModel[] = [];

  for (const slot of modelSlots) {
    const basename = getBasename(slot.currentValue);
    const dedupeKey = basename.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const knownModel = lookupKnownModel(slot.currentValue);
    const override = overrideMap.get(slot.currentValue) || overrideMap.get(dedupeKey);

    if (override && !override.include) {
      continue;
    }

    resolved.push({
      slot,
      knownModel,
      overrideUrl: override?.downloadUrl?.trim() || '',
      subfolder: knownModel?.subfolder || getModelSubfolder(slot.category),
      basename,
    });
  }

  return resolved;
}

function getRepoFolderFromUrl(url: string, fallback: string): string {
  const cleaned = url.replace(/\.git$/i, '').replace(/\/$/, '');
  const name = cleaned.split('/').pop();
  return name || fallback;
}

function buildPackInstallSection(detectedPacks: DetectedPack[]): string[] {
  const lines: string[] = [];
  if (!detectedPacks.length) {
    lines.push('echo No custom node packs detected for this workflow.');
    lines.push('echo.');
    return lines;
  }

  lines.push(`echo Installing ${detectedPacks.length} custom node pack(s)...`);
  lines.push('cd /d "%COMFYUI_PATH%custom_nodes"');
  lines.push('if errorlevel 1 (');
  lines.push('    echo [ERROR] Could not open "%COMFYUI_PATH%custom_nodes"');
  lines.push('    goto :END');
  lines.push(')');
  lines.push('');

  for (const pack of detectedPacks) {
    const title = escapeForBat(pack.packTitle || pack.packId);
    const reference = (pack.reference || '').trim();
    if (!reference) {
      lines.push(`echo [WARNING] Missing repository URL for ${title} - skipping.`);
      lines.push('');
      continue;
    }

    const repoFolder = escapeForBat(getRepoFolderFromUrl(reference, pack.packId));
    const url = escapeForBat(reference);

    lines.push(`echo --- ${title} ---`);
    lines.push(`if not exist "${repoFolder}" (`);
    lines.push(`    git clone "${url}"`);
    lines.push('    if errorlevel 1 echo [WARNING] git clone failed');
    lines.push(') else (');
    lines.push(`    echo Already present: ${repoFolder}`);
    lines.push(')');
    lines.push('');
  }

  lines.push('cd /d "%COMFYUI_PATH%"');
  lines.push('echo.');
  return lines;
}

function buildPipSection(enabled: boolean, detectedPacks: DetectedPack[]): string[] {
  const lines: string[] = [];
  if (!enabled || !detectedPacks.length) {
    return lines;
  }

  lines.push('echo Installing Python dependencies from custom node folders...');
  lines.push('for /d %%i in ("%COMFYUI_PATH%custom_nodes\\*") do (');
  lines.push('    if exist "%%i\\requirements.txt" (');
  lines.push('        echo   pip install -r %%~nxi\\requirements.txt');
  lines.push('        "%PYTHON%" -s -m pip install -r "%%i\\requirements.txt"');
  lines.push('    )');
  lines.push('    if exist "%%i\\install.py" (');
  lines.push('        echo   Running install.py for %%~nxi');
  lines.push('        pushd "%%i"');
  lines.push('        "%PYTHON%" install.py');
  lines.push('        popd');
  lines.push('    )');
  lines.push(')');
  lines.push('echo.');
  return lines;
}

function buildModelSection(includeModels: boolean, resolvedModels: ResolvedModel[]): string[] {
  const lines: string[] = [];
  if (!includeModels || !resolvedModels.length) {
    return lines;
  }

  const autoDownload = resolvedModels.filter((model) => model.overrideUrl || model.knownModel?.downloadUrl);
  const manual = resolvedModels.filter((model) => !model.overrideUrl && !model.knownModel?.downloadUrl);

  lines.push(`echo Checking ${resolvedModels.length} model(s)...`);
  lines.push('');

  for (const model of autoDownload) {
    const url = escapeForBat(model.overrideUrl || model.knownModel!.downloadUrl);
    const targetDir = `%COMFYUI_PATH%models\\${model.subfolder}`;
    const targetFile = `${targetDir}\\${model.basename}`;
    const display = escapeForBat(model.basename);

    lines.push(`if not exist "${targetFile}" (`);
    lines.push(`    echo Downloading ${display}`);
    lines.push(`    if not exist "${targetDir}" mkdir "${targetDir}"`);
    lines.push(`    curl -L --progress-bar -o "${targetFile}" "${url}"`);
    lines.push('    if errorlevel 1 echo [WARNING] Download failed');
    lines.push(') else (');
    lines.push(`    echo Already present: ${display}`);
    lines.push(')');
    lines.push('');
  }

  if (manual.length) {
    lines.push('echo ================================================================');
    lines.push('echo MANUAL MODEL DOWNLOADS REQUIRED');
    lines.push('echo ================================================================');
    for (const model of manual) {
      lines.push(`echo - ${escapeForBat(model.basename)}`);
      lines.push(`echo   Place into: %COMFYUI_PATH%models\\${escapeForBat(model.subfolder)}\\`);
      lines.push(`echo   Used by: ${escapeForBat(model.slot.nodeType)} (node #${model.slot.nodeId})`);
      lines.push('echo.');
    }
    lines.push('echo ================================================================');
    lines.push('echo.');
  }

  return lines;
}

function generateSetupBat(
  config: DeploymentPackageConfig,
  detectedPacks: DetectedPack[],
  resolvedModels: ResolvedModel[],
): string {
  const generatedDate = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push('@echo off');
  lines.push('setlocal enabledelayedexpansion');
  lines.push('chcp 65001 >nul 2>&1');
  lines.push('');
  lines.push('echo ================================================================');
  lines.push('echo  ComfyUI Workflow Setup Package');
  lines.push(`echo  Workflow: ${escapeForBat(config.workflowName)}`);
  if (config.description) {
    lines.push(`echo  ${escapeForBat(config.description)}`);
  }
  lines.push(`echo  Generated: ${generatedDate}`);
  lines.push('echo ================================================================');
  lines.push('echo.');
  lines.push('');
  lines.push('set "COMFYUI_PATH=%~dp0"');
  lines.push('if exist "%COMFYUI_PATH%python_embeded\\python.exe" (');
  lines.push('    set "PYTHON=%COMFYUI_PATH%python_embeded\\python.exe"');
  lines.push(') else if exist "%COMFYUI_PATH%venv\\Scripts\\python.exe" (');
  lines.push('    set "PYTHON=%COMFYUI_PATH%venv\\Scripts\\python.exe"');
  lines.push(') else (');
  lines.push('    set "PYTHON=python"');
  lines.push(')');
  lines.push('echo Using ComfyUI path: %COMFYUI_PATH%');
  lines.push('echo Using Python: %PYTHON%');
  lines.push('echo.');
  lines.push('');

  lines.push('echo [1/3] Installing custom nodes');
  lines.push(...buildPackInstallSection(detectedPacks));

  lines.push('echo [2/3] Installing Python dependencies');
  const pipSection = buildPipSection(config.includePipDeps, detectedPacks);
  if (pipSection.length) {
    lines.push(...pipSection);
  } else {
    lines.push('echo Skipped Python dependency installation.');
    lines.push('echo.');
  }

  lines.push('echo [3/3] Checking models');
  const modelSection = buildModelSection(config.includeModels, resolvedModels);
  if (modelSection.length) {
    lines.push(...modelSection);
  } else {
    lines.push('echo Skipped model download section.');
    lines.push('echo.');
  }

  lines.push('echo ================================================================');
  lines.push('echo Setup complete.');
  lines.push('echo 1. Start ComfyUI');
  lines.push('echo 2. Wait for startup to complete');
  lines.push('echo 3. Drag workflow.json into ComfyUI');
  lines.push('echo ================================================================');
  lines.push(':END');
  lines.push('echo.');
  lines.push('pause');

  return lines.join('\r\n');
}

interface GenerationSettings {
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  denoise?: number;
  width?: number;
  height?: number;
  positivePrompt?: string;
  negativePrompt?: string;
}

function formatExportTimestamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function toArchitectureLabel(architecture: string): string {
  const map: Record<string, string> = {
    sd15: 'Stable Diffusion 1.5',
    sdxl: 'SDXL',
    flux: 'FLUX',
    sd3: 'Stable Diffusion 3',
    cascade: 'Stable Cascade',
  };
  return map[architecture] || 'AI';
}

function humanizeModelName(filename: string): string {
  let name = filename.replace(/\\/g, '/').split('/').pop() || filename;
  name = name.replace(/\.(safetensors|ckpt|pt|pth|bin|onnx|gguf)$/i, '');
  name = name.replace(/[_-]+/g, ' ').trim();
  if (!name) return filename;
  return name
    .split(/\s+/)
    .map((token) => {
      if (/^\d+x$/i.test(token)) return token.toLowerCase();
      if (/^sdxl$/i.test(token)) return 'SDXL';
      if (/^sd$/i.test(token)) return 'SD';
      if (/^vae$/i.test(token)) return 'VAE';
      if (/^lora$/i.test(token)) return 'LoRA';
      if (/^[A-Z0-9]{2,}$/.test(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(' ');
}

function humanizeCategory(category: string): string {
  const map: Record<string, string> = {
    checkpoints: 'main generation model',
    checkpoint: 'main generation model',
    loras: 'style/concept adapter',
    lora: 'style/concept adapter',
    vae: 'image encoder/decoder',
    controlnet: 'structural control model',
    clip: 'text encoder',
    clip_vision: 'image understanding model',
    upscale_models: 'upscaler for detail enhancement',
    upscale: 'upscaler for detail enhancement',
    embeddings: 'textual inversion embedding',
    ipadapter: 'image prompt adapter',
    hypernetworks: 'hypernetwork modifier',
    style_models: 'style transfer model',
    diffusion_models: 'diffusion model',
    unet: 'diffusion backbone',
    other: 'model asset',
  };
  return map[category.toLowerCase()] || category;
}

function detectModelAuthor(filename: string, category: string): string | null {
  const lower = filename.toLowerCase();
  if (category === 'checkpoint' && (lower.includes('sd_xl_base_1.0') || lower.includes('sdxl'))) {
    return 'Stability AI';
  }
  if (lower.includes('realesrgan')) return 'Xintao';
  if (lower.includes('flux')) return 'Black Forest Labs';
  if (lower.includes('z_image') || lower.includes('qwen')) return 'Zhipu AI';
  return null;
}

function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildWhatItDoes(workflow: ComfyUIWorkflow, analysis: WorkflowAnalysis): string[] {
  const lines: string[] = [];
  const archName = toArchitectureLabel(analysis.architecture);
  const hasUpscale = workflow.nodes.some((node) => /upscale|esrgan|ultimatesd/i.test(node.type));
  const hasLoadImage = workflow.nodes.some((node) => /LoadImage/i.test(node.type));
  const hasSampler = workflow.nodes.some((node) => /KSampler|Sampler/i.test(node.type));
  const hasControlNet = workflow.nodes.some((node) => /controlnet/i.test(node.type));

  if (hasLoadImage && hasSampler) {
    lines.push(`This workflow takes an input image and transforms it using ${archName}.`);
    if (hasControlNet) {
      lines.push('It uses structural controls to preserve composition while applying your prompt.');
    } else {
      lines.push('You provide a reference image and the AI modifies it based on your prompt.');
    }
  } else {
    lines.push(`This workflow generates an image from text using ${archName}.`);
    lines.push('You describe what you want in the prompt, and the AI creates it from scratch.');
  }

  if (hasUpscale) {
    lines.push('The result is then upscaled for higher resolution and sharper details.');
  }

  return lines;
}

function buildHowToUse(workflow: ComfyUIWorkflow): string[] {
  const steps: string[] = [];
  const hasPrompt = workflow.nodes.some((node) => /CLIPTextEncode|Prompt/i.test(node.type));
  const hasLoadImage = workflow.nodes.some((node) => /LoadImage/i.test(node.type));
  const hasLatentResolution = workflow.nodes.some((node) => /EmptyLatentImage|EmptySD3LatentImage/i.test(node.type));

  if (hasPrompt) {
    steps.push('Set your prompt in "Positive Prompt" - describe what you want to see');
    steps.push('Set "Negative Prompt" to exclude unwanted elements (blur, artifacts, etc.)');
  }
  if (hasLoadImage) {
    steps.push('Load your input image in the LoadImage node');
  }
  if (hasLatentResolution) {
    steps.push('Adjust resolution in the latent image node if needed');
  }
  steps.push('Hit "Queue Prompt" in ComfyUI to generate');
  steps.push('The output will be saved/previewed automatically');

  return steps;
}

function extractGenerationSettings(workflow: ComfyUIWorkflow): GenerationSettings | null {
  const out: GenerationSettings = {};

  for (const node of workflow.nodes) {
    const classType = String(node.type || '');
    const widgets = Array.isArray(node.widgets_values) ? node.widgets_values : [];

    if (classType === 'KSampler' && widgets.length >= 7) {
      if (typeof widgets[0] === 'number') out.seed = widgets[0];
      if (typeof widgets[2] === 'number') out.steps = widgets[2];
      if (typeof widgets[3] === 'number') out.cfg = widgets[3];
      if (typeof widgets[4] === 'string') out.sampler = widgets[4];
      if (typeof widgets[5] === 'string') out.scheduler = widgets[5];
      if (typeof widgets[6] === 'number') out.denoise = widgets[6];
    }

    if (classType === 'KSamplerAdvanced' && widgets.length >= 9) {
      if (typeof widgets[1] === 'number') out.seed = widgets[1];
      if (typeof widgets[3] === 'number') out.steps = widgets[3];
      if (typeof widgets[4] === 'number') out.cfg = widgets[4];
      if (typeof widgets[5] === 'string') out.sampler = widgets[5];
      if (typeof widgets[6] === 'string') out.scheduler = widgets[6];
    }

    if (/EmptyLatentImage|EmptySD3LatentImage/i.test(classType) && widgets.length >= 2) {
      if (typeof widgets[0] === 'number') out.width = widgets[0];
      if (typeof widgets[1] === 'number') out.height = widgets[1];
    }

    if (/CLIPTextEncode/i.test(classType)) {
      const title = String(node.title || '').toLowerCase();
      const textValue = widgets.length > 0
        ? String(widgets[0] || '')
        : '';
      if (!textValue) continue;
      if (title.includes('neg') || title.includes('negative')) {
        if (!out.negativePrompt) out.negativePrompt = textValue;
      } else if (!out.positivePrompt) {
        out.positivePrompt = textValue;
      }
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

function normalizeFlowDescription(flow: string): string {
  return flow
    .replace(/\s*->\s*/g, ' → ')
    .replace(/Model Loading/g, 'Load Model')
    .replace(/Model Adaptation/g, 'Apply Modifiers')
    .replace(/Prompt Encoding/g, 'Encode Prompts')
    .replace(/Latent Initialization/g, 'Create Latent')
    .replace(/Diffusion Sampling/g, 'Sample')
    .replace(/Latent Decoding/g, 'Decode')
    .replace(/Upscaling/g, 'Upscale');
}

export function generateWorkflowNotes(
  workflow: ComfyUIWorkflow,
  analysis: WorkflowAnalysis,
  workflowName?: string,
): string {
  const lines: string[] = [];
  const exportedAt = formatExportTimestamp();
  const settings = extractGenerationSettings(workflow);
  const uniqueNodeTypes = new Set(workflow.nodes.map((node) => node.type)).size;

  lines.push('─── fullydigital.pictures ───');
  lines.push('Workflow by Hleb Likhodievski');
  lines.push(`Exported: ${exportedAt}`);
  lines.push('');
  lines.push(workflowName || 'Untitled Workflow');
  lines.push('');

  lines.push('WHAT IT DOES');
  for (const text of buildWhatItDoes(workflow, analysis)) {
    for (const wrapped of wordWrap(text, 72)) {
      lines.push(`  ${wrapped}`);
    }
  }
  lines.push('');

  lines.push('HOW TO USE');
  buildHowToUse(workflow).forEach((step, index) => {
    lines.push(`  ${index + 1}. ${step}`);
  });
  lines.push('');

  if (analysis.modelSlots.length > 0) {
    const seen = new Set<string>();
    lines.push('MODELS USED');
    for (const slot of analysis.modelSlots) {
      const key = slot.currentValue.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const modelName = humanizeModelName(slot.currentValue);
      const category = humanizeCategory(slot.category);
      const author = detectModelAuthor(slot.currentValue, slot.category);
      lines.push(`  • ${modelName} — ${category}${author ? ` (${author})` : ''}`);
      lines.push(`    File: ${slot.currentValue}`);
    }
    lines.push('');
  }

  if (analysis.detectedPacks.length > 0) {
    lines.push('CUSTOM NODE PACKS');
    for (const pack of analysis.detectedPacks) {
      lines.push(`  • ${pack.packTitle} — ${pack.nodeTypesUsed.length} node${pack.nodeTypesUsed.length === 1 ? '' : 's'} used`);
    }
    lines.push('');
  }

  if (settings) {
    lines.push('GENERATION SETTINGS');
    if (typeof settings.width === 'number' && typeof settings.height === 'number') {
      lines.push(`  Resolution: ${settings.width} × ${settings.height}`);
    }
    if (typeof settings.seed === 'number') {
      lines.push(`  Seed: ${settings.seed}`);
    }
    if (typeof settings.steps === 'number' && typeof settings.cfg === 'number') {
      lines.push(`  Steps: ${settings.steps}  |  CFG: ${settings.cfg}`);
    } else if (typeof settings.steps === 'number') {
      lines.push(`  Steps: ${settings.steps}`);
    }
    if (settings.sampler) {
      lines.push(`  Sampler: ${settings.sampler}${settings.scheduler ? ` (${settings.scheduler})` : ''}`);
    }
    if (typeof settings.denoise === 'number') {
      lines.push(`  Denoise: ${settings.denoise}`);
    }
    if (settings.positivePrompt) {
      const prompt = settings.positivePrompt.length > 120
        ? `${settings.positivePrompt.slice(0, 117)}...`
        : settings.positivePrompt;
      lines.push(`  Prompt: ${prompt}`);
    }
    if (settings.negativePrompt) {
      const negative = settings.negativePrompt.length > 120
        ? `${settings.negativePrompt.slice(0, 117)}...`
        : settings.negativePrompt;
      lines.push(`  Negative: ${negative}`);
    }
    lines.push('');
  }

  if (analysis.flowDescription) {
    lines.push('PIPELINE (technical)');
    const wrapped = wordWrap(normalizeFlowDescription(analysis.flowDescription), 72);
    for (const line of wrapped) {
      lines.push(`  ${line}`);
    }
    lines.push('');
  }

  lines.push('STATS');
  lines.push(`  ${workflow.nodes.length} nodes  |  ${uniqueNodeTypes} unique types  |  ${analysis.modelSlots.length} models  |  ${analysis.detectedPacks.length} custom packs`);
  lines.push('');
  lines.push('─── Generated by Workflow Architect ───');

  return lines.join('\n');
}

function generateReadme(
  workflow: ComfyUIWorkflow,
  config: DeploymentPackageConfig,
  analysis: WorkflowAnalysis,
): string {
  return generateWorkflowNotes(workflow, analysis, config.workflowName);
}

export function generatePackageContents(
  workflow: ComfyUIWorkflow,
  analysis: WorkflowAnalysis,
  config: DeploymentPackageConfig,
): PackageContents {
  const resolvedModels = resolveModels(analysis.modelSlots, config.modelOverrides);

  return {
    workflowJson: exportGraphFormat(workflow),
    setupBat: generateSetupBat(config, analysis.detectedPacks, resolvedModels),
    readmeTxt: generateReadme(workflow, config, analysis),
  };
}

export async function downloadDeploymentPackage(
  workflow: ComfyUIWorkflow,
  analysis: WorkflowAnalysis,
  config: DeploymentPackageConfig,
): Promise<void> {
  const contents = generatePackageContents(workflow, analysis, config);

  const zip = new JSZip();
  const folderName = config.workflowName
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'workflow_package';

  zip.file(`${folderName}/workflow.json`, contents.workflowJson);
  zip.file(`${folderName}/setup_workflow.bat`, contents.setupBat);
  zip.file(`${folderName}/README.txt`, contents.readmeTxt);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${folderName}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function buildDefaultConfig(
  analysis: WorkflowAnalysis,
  workflowName?: string,
): DeploymentPackageConfig {
  const seen = new Set<string>();
  const modelOverrides: ModelOverride[] = [];

  for (const slot of analysis.modelSlots) {
    const basename = getBasename(slot.currentValue);
    const key = basename.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const known = lookupKnownModel(slot.currentValue);
    modelOverrides.push({
      filename: slot.currentValue,
      downloadUrl: known?.downloadUrl || '',
      include: true,
    });
  }

  return {
    workflowName: workflowName || `ComfyUI_${analysis.architecture.toUpperCase()}_Workflow`,
    description: `${analysis.architecture.toUpperCase()} workflow with ${analysis.totalNodes} nodes (${analysis.complexity} complexity)`,
    modelOverrides,
    includeModels: true,
    includePipDeps: true,
  };
}

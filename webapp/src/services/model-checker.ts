/**
 * Model Requirements Checker
 * Cross-references workflow model slots against installed models from ComfyUI scans.
 */

import { lookupModel } from '../data/known-models-db';
import type { ModelSlot } from './workflow-analyzer';

export type ModelStatus = 'installed' | 'missing' | 'unknown';

export interface ModelCheckResult {
  filename: string;
  category: string;
  status: ModelStatus;
  downloadUrl: string | null;
  downloadSize: string | null;
  notes: string | null;
  searchUrls: { label: string; url: string }[];
}

export interface ModelCheckSummary {
  total: number;
  installed: number;
  missing: number;
  unknown: number;
  results: ModelCheckResult[];
}

function toBaseName(value: string): string {
  return value.split('/').pop()?.split('\\').pop() || value;
}

function normalizeForSearch(value: string): string {
  return value.replace(/\.(safetensors|ckpt|pth|bin|pt)$/i, '');
}

function mapCategoryToScannerCategories(category: string): string[] {
  const map: Record<string, string[]> = {
    checkpoint: ['checkpoints', 'diffusion_models', 'unet', 'unets'],
    lora: ['loras'],
    vae: ['vae', 'vaes'],
    controlnet: ['controlnet', 'controlnets'],
    upscale: ['upscale_models'],
    upscaler: ['upscale_models'],
    clip: ['clip', 'text_encoders'],
    embedding: ['embeddings'],
    ipadapter: ['clip_vision', 'ipadapter'],
    other: ['other'],
  };
  return map[category] || [category];
}

function normalizeModelPath(value: string): string {
  return String(value || '').replace(/\\/g, '/').trim().toLowerCase();
}

function hasModelInstalled(filename: string, installedSets: Array<Set<string> | undefined>): boolean | null {
  const usableSets = installedSets.filter((set): set is Set<string> => !!set);
  if (usableSets.length === 0) return null;

  const full = normalizeModelPath(filename);
  const basename = toBaseName(full).toLowerCase();
  if (!full) return false;

  for (const set of usableSets) {
    for (const candidateRaw of set) {
      const candidate = normalizeModelPath(candidateRaw);
      const candidateBasename = toBaseName(candidate).toLowerCase();
      if (
        candidate === full
        || candidateBasename === basename
        || candidate.endsWith(`/${basename}`)
        || full.endsWith(`/${candidateBasename}`)
        || candidate.endsWith(full)
        || full.endsWith(candidate)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check model requirements from workflow analysis against installed models map.
 */
export function checkModelRequirements(
  modelSlots: ModelSlot[],
  installedModels: Map<string, Set<string>>,
): ModelCheckSummary {
  const results: ModelCheckResult[] = [];
  const seen = new Set<string>();

  for (const slot of modelSlots) {
    const filename = (slot.currentValue || '').trim();
    if (!filename || filename.toLowerCase() === 'none') continue;

    const uniqueKey = filename.toLowerCase();
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const scannerCategories = mapCategoryToScannerCategories(slot.category);
    const installedSets = scannerCategories.map((category) => installedModels.get(category));
    const installed = hasModelInstalled(filename, installedSets);
    const status: ModelStatus = installed === null ? 'unknown' : installed ? 'installed' : 'missing';

    const known = lookupModel(filename);
    const searchTerm = encodeURIComponent(normalizeForSearch(toBaseName(filename)));

    results.push({
      filename,
      category: slot.category,
      status,
      downloadUrl: known?.downloadUrl || null,
      downloadSize: known?.size || null,
      notes: known?.source || null,
      searchUrls: [
        { label: 'CivitAI', url: `https://civitai.com/search/models?sortBy=models_v9&query=${searchTerm}` },
        { label: 'HuggingFace', url: `https://huggingface.co/models?search=${searchTerm}` },
      ],
    });
  }

  return {
    total: results.length,
    installed: results.filter((item) => item.status === 'installed').length,
    missing: results.filter((item) => item.status === 'missing').length,
    unknown: results.filter((item) => item.status === 'unknown').length,
    results,
  };
}

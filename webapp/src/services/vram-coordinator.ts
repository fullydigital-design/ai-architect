import { logger } from '@/utils/logger';
import type { ProviderSettings } from '../types/comfyui';
import {
  fetchLMStudioModels,
  loadLMStudioModel,
  unloadLMStudioModel,
  unloadAllLMStudioModels,
} from './lmstudio-service';
import { freeComfyUIVRAM } from './comfyui-backend';
import { getProviderForModel } from './ai-provider';

/**
 * VRAM coordinator.
 *
 * Single GPU can't hold a local LLM (LM Studio) and a ComfyUI checkpoint at
 * the same time without OOM (e.g. Qwen3.6 35B A3B ≈ 22 GB + FLUX checkpoint
 * ≈ 12–24 GB on a 32 GB card). This module gates each side so they never
 * occupy VRAM concurrently.
 *
 * Two claims:
 *   claimForAI(settings)       — used before an LM Studio chat call.
 *                                Frees ComfyUI VRAM, ensures the selected
 *                                LM Studio model is the one loaded.
 *   claimForComfyUI(settings)  — used before a queue submission.
 *                                Unloads every LM Studio model so ComfyUI
 *                                can load its checkpoint freely.
 *
 * Soft contract: all failures are logged but never thrown — VRAM
 * coordination is a hint, not a hard prerequisite. The foreground action
 * proceeds either way.
 */

const PREF_KEY = 'comfyui-architect-vram-coordinator-enabled';

export function isCoordinatorEnabled(): boolean {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw === null) return true; // default ON
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function setCoordinatorEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // localStorage full/blocked
  }
}

export type VRAMOwner = 'ai' | 'comfyui' | 'none' | 'unknown';

let currentOwner: VRAMOwner = 'unknown';

export function getCurrentVRAMOwner(): VRAMOwner {
  return currentOwner;
}

/**
 * Prepare GPU for an LM Studio chat call.
 *
 * - If the selected model isn't an LM Studio model, nothing to do (cloud
 *   provider doesn't share local VRAM).
 * - Otherwise: free ComfyUI VRAM (best-effort), then probe LM Studio. If
 *   the right model is already loaded, return fast. Else unload any other
 *   LM Studio instances and load the target.
 */
export async function claimForAI(settings: ProviderSettings): Promise<void> {
  if (!isCoordinatorEnabled()) return;

  const provider = getProviderForModel(settings.selectedModel, settings.customModels);
  if (provider !== 'lmstudio') {
    // Cloud provider — local VRAM unaffected. Still free ComfyUI if it was
    // holding memory from a prior generation, so the user's idle session
    // doesn't sit on a 24 GB checkpoint indefinitely.
    if (settings.comfyuiUrl && currentOwner === 'comfyui') {
      await freeComfyUIVRAM(settings.comfyuiUrl);
      currentOwner = 'none';
    }
    return;
  }

  const lmHost = settings.keys.lmstudio;
  const targetId = settings.selectedModel;
  if (!targetId) return;

  // Step 1: free ComfyUI so the LLM has room to load.
  if (settings.comfyuiUrl) {
    await freeComfyUIVRAM(settings.comfyuiUrl);
  }

  // Step 2: probe what LM Studio is holding right now.
  let probe;
  try {
    probe = await fetchLMStudioModels(lmHost);
  } catch (err) {
    logger.warn('[VRAM] LM Studio probe failed during claimForAI:', err);
    return;
  }

  const loaded = probe.models.filter((m) => m.loaded);
  const targetAlready = loaded.find((m) => m.id === targetId || m.catalogKey === targetId);
  const others = loaded.filter((m) => m.id !== targetId && m.catalogKey !== targetId);

  // Unload anything that isn't the target.
  for (const other of others) {
    try {
      await unloadLMStudioModel(lmHost, other.id);
      logger.log(`[VRAM] Unloaded stray LM Studio instance ${other.id}`);
    } catch (err) {
      logger.warn(`[VRAM] Could not unload ${other.id}:`, err);
    }
  }

  // Load the target if it isn't already running.
  if (!targetAlready) {
    const targetEntry = probe.models.find((m) => m.id === targetId || m.catalogKey === targetId);
    const catalogKey = targetEntry?.catalogKey || targetId;
    try {
      const result = await loadLMStudioModel(lmHost, catalogKey);
      logger.log(`[VRAM] Loaded ${result.instanceId} in ${result.loadTimeSeconds?.toFixed(1) ?? '?'}s`);
    } catch (err) {
      logger.warn(`[VRAM] Could not load ${catalogKey}:`, err);
    }
  }

  currentOwner = 'ai';
}

/**
 * Prepare GPU for a ComfyUI generation.
 *
 * Unloads any LM Studio instances. ComfyUI will load its own model on the
 * first execution step — we don't need to pre-warm it. We also call /free
 * defensively so a stale model held in VRAM from a prior session doesn't
 * survive across users editing the workflow.
 */
export async function claimForComfyUI(settings: ProviderSettings): Promise<void> {
  if (!isCoordinatorEnabled()) return;

  const lmHost = settings.keys.lmstudio;
  if (lmHost) {
    const unloaded = await unloadAllLMStudioModels(lmHost);
    if (unloaded.length > 0) {
      logger.log(`[VRAM] Unloaded ${unloaded.length} LM Studio instance(s) before ComfyUI run: ${unloaded.join(', ')}`);
    }
  }

  // Don't pre-free ComfyUI — it's about to load its own model, so freeing
  // would force a reload of whatever it had cached.
  currentOwner = 'comfyui';
}

/**
 * Mark the GPU as idle (e.g. after a ComfyUI generation completes). Doesn't
 * physically unload anything — just lets the coordinator know nothing is
 * actively in use, which lets a subsequent claimForAI() skip the free step
 * if neither side has changed state.
 */
export function markVRAMIdle(): void {
  if (currentOwner !== 'unknown') {
    currentOwner = 'none';
  }
}

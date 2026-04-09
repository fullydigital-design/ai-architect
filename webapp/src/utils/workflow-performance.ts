/**
 * Performance utilities for handling large ComfyUI workflows.
 * Workflows with 100+ nodes need special handling for smooth rendering.
 */
import type { ComfyUIWorkflow } from '../types/comfyui';

/** Thresholds for performance tiers */
export const PERF_TIERS = {
  SMALL: 50,
  MEDIUM: 150,
  LARGE: 500,
  HUGE: 1000,
} as const;

export type PerfTier = 'small' | 'medium' | 'large' | 'huge';

export function getWorkflowPerfTier(workflow: ComfyUIWorkflow): PerfTier {
  const count = workflow.nodes.length;
  if (count < PERF_TIERS.SMALL) return 'small';
  if (count < PERF_TIERS.MEDIUM) return 'medium';
  if (count < PERF_TIERS.LARGE) return 'large';
  return 'huge';
}

export interface PerfConfig {
  /** Enable node animations (enter/exit) */
  animations: boolean;
  /** Show widget values in nodes */
  showWidgets: boolean;
  /** Show connection type labels on edges */
  showEdgeLabels: boolean;
  /** Maximum nodes to render before virtualizing */
  maxVisibleNodes: number;
  /** Edge rendering quality: 'bezier' | 'smoothstep' | 'straight' */
  edgeType: 'bezier' | 'smoothstep' | 'straight';
  /** Enable minimap */
  showMinimap: boolean;
  /** Debounce time for viewport changes (ms) */
  viewportDebounce: number;
}

export function getPerfConfig(tier: PerfTier): PerfConfig {
  switch (tier) {
    case 'small':
      return {
        animations: true,
        showWidgets: true,
        showEdgeLabels: true,
        maxVisibleNodes: Infinity,
        edgeType: 'bezier',
        showMinimap: true,
        viewportDebounce: 0,
      };
    case 'medium':
      return {
        animations: true,
        showWidgets: true,
        showEdgeLabels: false,
        maxVisibleNodes: Infinity,
        edgeType: 'smoothstep',
        showMinimap: true,
        viewportDebounce: 50,
      };
    case 'large':
      return {
        animations: false,
        showWidgets: false,
        showEdgeLabels: false,
        maxVisibleNodes: 300,
        edgeType: 'straight',
        showMinimap: true,
        viewportDebounce: 100,
      };
    case 'huge':
      return {
        animations: false,
        showWidgets: false,
        showEdgeLabels: false,
        maxVisibleNodes: 200,
        edgeType: 'straight',
        showMinimap: false,
        viewportDebounce: 200,
      };
  }
}

/**
 * Counts key workflow metrics for display.
 */
export function getWorkflowStats(workflow: ComfyUIWorkflow) {
  const uniqueTypes = new Set(workflow.nodes.map((n) => n.type));
  const hasCustomNodes = workflow.nodes.some((n) => {
    return n.type.includes('.') || (n.type.match(/[A-Z]/g) || []).length >= 3;
  });

  return {
    nodeCount: workflow.nodes.length,
    linkCount: workflow.links.length,
    uniqueTypes: uniqueTypes.size,
    hasCustomNodes,
    perfTier: getWorkflowPerfTier(workflow),
  };
}

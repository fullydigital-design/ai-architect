/**
 * useWorkflowHistory
 *
 * Stack-based undo/redo for ComfyUI workflow edits.
 * Stores deep copies of workflow state with action labels.
 * Limits stack depth to prevent memory issues with large workflows.
 */
import { useState, useCallback, useRef } from 'react';
import type { ComfyUIWorkflow } from '../types/comfyui';

export interface HistoryEntry {
  workflow: ComfyUIWorkflow;
  label: string;
  timestamp: number;
}

export interface UseWorkflowHistoryReturn {
  /** Push a new state onto the undo stack (clears redo) */
  push: (workflow: ComfyUIWorkflow, label: string) => void;
  /** Undo: returns the previous workflow state, or null if nothing to undo */
  undo: () => ComfyUIWorkflow | null;
  /** Redo: returns the next workflow state, or null if nothing to redo */
  redo: () => ComfyUIWorkflow | null;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of items in undo stack */
  undoCount: number;
  /** Number of items in redo stack */
  redoCount: number;
  /** Label of the action that would be undone */
  undoLabel: string | null;
  /** Label of the action that would be redone */
  redoLabel: string | null;
  /** Clear all history */
  clear: () => void;
}

const MAX_HISTORY = 50;

function deepClone(workflow: ComfyUIWorkflow): ComfyUIWorkflow {
  // structuredClone is available in modern browsers and is faster than JSON parse/stringify
  return structuredClone(workflow);
}

export function useWorkflowHistory(): UseWorkflowHistoryReturn {
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  // Force re-render counter since we use refs for the stacks (perf optimization)
  const [, setVersion] = useState(0);

  const push = useCallback((workflow: ComfyUIWorkflow, label: string) => {
    undoStackRef.current.push({
      workflow: deepClone(workflow),
      label,
      timestamp: Date.now(),
    });
    // Trim if over limit
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current = undoStackRef.current.slice(-MAX_HISTORY);
    }
    // Clear redo stack on new action
    redoStackRef.current = [];
    setVersion((v) => v + 1);
  }, []);

  const undo = useCallback((): ComfyUIWorkflow | null => {
    const entry = undoStackRef.current.pop();
    if (!entry) return null;
    // Current state needs to be pushed to redo
    // But we don't have the "current" here — the caller must handle that
    redoStackRef.current.push(entry);
    // Return the state to restore (which is the NEW top of undo stack)
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    setVersion((v) => v + 1);
    return prev ? deepClone(prev.workflow) : null;
  }, []);

  const redo = useCallback((): ComfyUIWorkflow | null => {
    const entry = redoStackRef.current.pop();
    if (!entry) return null;
    undoStackRef.current.push(entry);
    setVersion((v) => v + 1);
    return deepClone(entry.workflow);
  }, []);

  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setVersion((v) => v + 1);
  }, []);

  const undoStack = undoStackRef.current;
  const redoStack = redoStackRef.current;

  return {
    push,
    undo,
    redo,
    canUndo: undoStack.length > 1, // need at least 2 entries (initial + one change)
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    undoLabel: undoStack.length > 1 ? undoStack[undoStack.length - 1].label : null,
    redoLabel: redoStack.length > 0 ? redoStack[redoStack.length - 1].label : null,
    clear,
  };
}

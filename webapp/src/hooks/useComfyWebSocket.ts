/**
 * useComfyWebSocket
 *
 * React hook wrapping ComfyUIWebSocket for real-time ComfyUI events.
 * Replaces polling in QueueMonitor and provides live execution progress.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ComfyUIWebSocket, type ComfyWSMessage } from '../services/comfyui-websocket';

export interface WSExecutionState {
  isRunning: boolean;
  promptId: string | null;
  currentNode: string | null;
  progress: { step: number; max: number } | null;
  completedNodes: Set<string>;
  latestImages: Array<{ filename: string; subfolder: string; type: string; nodeId: string }>;
  error: { nodeId: string; message: string } | null;
}

export interface UseComfyWebSocketReturn {
  connected: boolean;
  queueRunning: number;
  queuePending: number;
  execution: WSExecutionState;
  /** All raw messages (last 100) for debugging */
  recentMessages: ComfyWSMessage[];
  /** Manually reconnect */
  reconnect: () => void;
  /** Disconnect */
  disconnect: () => void;
  /** The client ID used for queue submissions */
  clientId: string | null;
}

export function useComfyWebSocket(comfyuiUrl: string | undefined): UseComfyWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [queueRunning, setQueueRunning] = useState(0);
  const [queuePending, setQueuePending] = useState(0);
  const [execution, setExecution] = useState<WSExecutionState>({
    isRunning: false,
    promptId: null,
    currentNode: null,
    progress: null,
    completedNodes: new Set(),
    latestImages: [],
    error: null,
  });
  const [recentMessages, setRecentMessages] = useState<ComfyWSMessage[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const wsRef = useRef<ComfyUIWebSocket | null>(null);

  const reconnect = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!comfyuiUrl?.trim()) {
      setConnected(false);
      setClientId(null);
      return;
    }

    let cancelled = false;
    const connectTimer = setTimeout(() => {
      if (cancelled) return;

      const ws = new ComfyUIWebSocket(comfyuiUrl, {
        onOpen: () => setConnected(true),
        onClose: () => setConnected(false),
        onError: () => {}, // connection errors handled by onClose + reconnect
        onMessage: (msg) => {
          setRecentMessages((prev) => [...prev.slice(-99), msg]);
        },
        onQueueUpdate: (running, pending) => {
          setQueueRunning(running);
          setQueuePending(pending);
        },
        onExecutionStart: (promptId) => {
          setExecution({
            isRunning: true,
            promptId,
            currentNode: null,
            progress: null,
            completedNodes: new Set(),
            latestImages: [],
            error: null,
          });
        },
        onNodeProgress: (nodeId, step, max) => {
          setExecution((prev) => ({
            ...prev,
            currentNode: nodeId,
            progress: { step, max },
            completedNodes: step >= max
              ? new Set([...prev.completedNodes, nodeId])
              : prev.completedNodes,
          }));
        },
        onNodeOutput: (nodeId, images) => {
          setExecution((prev) => ({
            ...prev,
            latestImages: [
              ...prev.latestImages,
              ...images.map((img) => ({ ...img, nodeId })),
            ],
          }));
        },
        onExecutionComplete: () => {
          setExecution((prev) => ({
            ...prev,
            isRunning: false,
            currentNode: null,
            progress: null,
          }));
        },
        onExecutionError: (_promptId, nodeId, message) => {
          setExecution((prev) => ({
            ...prev,
            isRunning: false,
            error: { nodeId, message },
          }));
        },
      });

      ws.connect();
      setClientId(ws.getClientId);
      wsRef.current = ws;
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [comfyuiUrl]);

  return {
    connected,
    queueRunning,
    queuePending,
    execution,
    recentMessages,
    reconnect,
    disconnect,
    clientId,
  };
}

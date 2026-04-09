/**
 * ComfyUI WebSocket Service
 *
 * Maintains a persistent WebSocket connection to ComfyUI for real-time events:
 * - Execution progress (node-by-node)
 * - Queue updates
 * - Execution start/complete/error
 *
 * ComfyUI WebSocket messages (ws://host:port/ws?clientId=xxx):
 *   { type: "status",           data: { status: { exec_info: { queue_remaining: N } } } }
 *   { type: "execution_start",  data: { prompt_id: "..." } }
 *   { type: "executing",        data: { node: "nodeId" | null, prompt_id: "..." } }
 *   { type: "progress",         data: { value: N, max: N, prompt_id: "...", node: "..." } }
 *   { type: "executed",         data: { node: "...", output: { images: [...] }, prompt_id: "..." } }
 *   { type: "execution_error",  data: { prompt_id: "...", node_id: "...", exception_type: "...", exception_message: "..." } }
 *   { type: "execution_cached", data: { nodes: ["id1","id2"], prompt_id: "..." } }
 */
import { getComfyUIWebSocketUrl } from './api-config';

export type ComfyWSMessageType =
  | 'status'
  | 'execution_start'
  | 'executing'
  | 'progress'
  | 'executed'
  | 'execution_error'
  | 'execution_cached'
  | 'execution_interrupted';

export interface ComfyWSMessage {
  type: ComfyWSMessageType;
  data: Record<string, any>;
}

export interface ComfyWSCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (msg: ComfyWSMessage) => void;
  /** Fired when queue count changes */
  onQueueUpdate?: (running: number, pending: number) => void;
  /** Fired per-node during execution */
  onNodeProgress?: (nodeId: string, step: number, maxSteps: number) => void;
  /** Fired when a node completes and produces output */
  onNodeOutput?: (nodeId: string, images: Array<{ filename: string; subfolder: string; type: string }>) => void;
  /** Fired when execution starts */
  onExecutionStart?: (promptId: string) => void;
  /** Fired when execution completes (executing node = null) */
  onExecutionComplete?: (promptId: string) => void;
  /** Fired on execution error */
  onExecutionError?: (promptId: string, nodeId: string, error: string) => void;
}

export class ComfyUIWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private clientId: string;
  private callbacks: ComfyWSCallbacks;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 1000;
  private baseReconnectDelayMs = 1000;
  private maxReconnectDelayMs = 30_000;
  private intentionallyClosed = false;

  constructor(comfyuiUrl: string, callbacks: ComfyWSCallbacks) {
    this.url = getComfyUIWebSocketUrl(comfyuiUrl).replace(/\/+$/, '');
    this.clientId = `webapp-${Date.now().toString(36)}`;
    this.callbacks = callbacks;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // already connected or connecting
    }

    this.intentionallyClosed = false;

    try {
      this.ws = new WebSocket(`${this.url}/ws?clientId=${this.clientId}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.callbacks.onOpen?.();
      };

      this.ws.onclose = () => {
        this.callbacks.onClose?.();
        if (!this.intentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        if (this.intentionallyClosed) {
          console.debug('[ComfyWS] Ignoring websocket error during intentional shutdown');
          return;
        }
        this.callbacks.onError?.(err);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: ComfyWSMessage = JSON.parse(event.data as string);
          this.callbacks.onMessage?.(msg);
          this.handleMessage(msg);
        } catch {
          // non-JSON message (could be binary preview image), ignore
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      if (this.ws.readyState === WebSocket.CONNECTING) {
        console.debug('[ComfyWS] Closing websocket during CONNECTING state');
      }
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get getClientId(): string {
    return this.clientId;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const exponent = Math.min(this.reconnectAttempts - 1, 5);
    const delay = Math.min(this.baseReconnectDelayMs * (2 ** exponent), this.maxReconnectDelayMs);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private handleMessage(msg: ComfyWSMessage): void {
    switch (msg.type) {
      case 'status': {
        const queueRemaining = msg.data?.status?.exec_info?.queue_remaining ?? 0;
        // Status message doesn't distinguish running vs pending,
        // but we can infer: if queue_remaining > 0, something is running or pending
        this.callbacks.onQueueUpdate?.(queueRemaining > 0 ? 1 : 0, Math.max(0, queueRemaining - 1));
        break;
      }
      case 'execution_start': {
        this.callbacks.onExecutionStart?.(msg.data?.prompt_id);
        break;
      }
      case 'executing': {
        if (msg.data?.node === null) {
          // null node means execution is complete
          this.callbacks.onExecutionComplete?.(msg.data?.prompt_id);
        }
        break;
      }
      case 'progress': {
        this.callbacks.onNodeProgress?.(
          msg.data?.node || '',
          msg.data?.value || 0,
          msg.data?.max || 0,
        );
        break;
      }
      case 'executed': {
        const images = msg.data?.output?.images || [];
        if (images.length > 0) {
          this.callbacks.onNodeOutput?.(msg.data?.node || '', images);
        }
        break;
      }
      case 'execution_error': {
        this.callbacks.onExecutionError?.(
          msg.data?.prompt_id || '',
          msg.data?.node_id || '',
          msg.data?.exception_message || 'Unknown error',
        );
        break;
      }
      case 'execution_cached': {
        // Nodes were cached — treat them as completed
        const cachedNodes: string[] = msg.data?.nodes || [];
        for (const nodeId of cachedNodes) {
          this.callbacks.onNodeProgress?.(nodeId, 1, 1);
        }
        break;
      }
    }
  }
}

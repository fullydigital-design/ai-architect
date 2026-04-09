import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveComfyUIBaseUrl } from '../services/api-config';
import {
  subscribeComfyUIStatus,
  type ComfyUIStatusEvent,
  type ComfyUIStatusPhase,
} from '../app/services/comfyui-manager-service';

export type ComfyUIConnectionPhase = Exclude<ComfyUIStatusPhase, 'manager-node-list-updated'>;

export interface UseComfyUIStatusResult {
  phase: ComfyUIConnectionPhase;
  message: string;
  baseUrl: string;
  isOnline: boolean;
  isBusy: boolean;
  lastUpdated: number;
  recoveryCount: number;
  managerListRevision: number;
  refreshNow: () => Promise<void>;
}

interface UseComfyUIStatusOptions {
  comfyuiUrl?: string;
  enabled?: boolean;
  pollIntervalMs?: number;
}

interface SnapshotState {
  phase: ComfyUIConnectionPhase;
  message: string;
  lastUpdated: number;
  recoveryCount: number;
  managerListRevision: number;
}

const DEFAULT_MESSAGE = 'Waiting for ComfyUI status...';

export function useComfyUIStatus({
  comfyuiUrl,
  enabled = true,
  pollIntervalMs = 5000,
}: UseComfyUIStatusOptions): UseComfyUIStatusResult {
  const baseUrl = useMemo(
    () => resolveComfyUIBaseUrl(comfyuiUrl || ''),
    [comfyuiUrl],
  );

  const [snapshot, setSnapshot] = useState<SnapshotState>({
    phase: 'unknown',
    message: DEFAULT_MESSAGE,
    lastUpdated: Date.now(),
    recoveryCount: 0,
    managerListRevision: 0,
  });

  const applyEvent = useCallback((event: ComfyUIStatusEvent) => {
    setSnapshot((prev) => {
      if (event.phase === 'manager-node-list-updated') {
        return {
          ...prev,
          message: event.message,
          lastUpdated: event.timestamp,
          managerListRevision: prev.managerListRevision + 1,
        };
      }

      const nextPhase = event.phase as ComfyUIConnectionPhase;
      const recovered = nextPhase === 'online' && (prev.phase === 'offline' || prev.phase === 'restarting');
      return {
        ...prev,
        phase: nextPhase,
        message: event.message,
        lastUpdated: event.timestamp,
        recoveryCount: recovered ? prev.recoveryCount + 1 : prev.recoveryCount,
      };
    });
  }, []);

  const refreshNow = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch(`${baseUrl}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });

      setSnapshot((prev) => {
        const recovered = prev.phase === 'offline' || prev.phase === 'restarting';
        return {
          ...prev,
          phase: 'online',
          message: 'ComfyUI is online',
          lastUpdated: Date.now(),
          recoveryCount: recovered ? prev.recoveryCount + 1 : prev.recoveryCount,
        };
      });

      if (!response.ok) {
        setSnapshot((prev) => ({
          ...prev,
          phase: 'offline',
          message: `ComfyUI is unreachable (${response.status})`,
          lastUpdated: Date.now(),
        }));
      }
    } catch {
      setSnapshot((prev) => ({
        ...prev,
        phase: prev.phase === 'restarting' || prev.phase === 'installing' ? prev.phase : 'offline',
        message: prev.phase === 'restarting'
          ? 'ComfyUI restart in progress...'
          : 'ComfyUI is offline',
        lastUpdated: Date.now(),
      }));
    }
  }, [baseUrl, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribeComfyUIStatus((event) => {
      if (event.baseUrl !== baseUrl) return;
      applyEvent(event);
    });
    return unsubscribe;
  }, [applyEvent, baseUrl, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      await refreshNow();
      if (cancelled) return;
      setTimeout(poll, pollIntervalMs);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [enabled, pollIntervalMs, refreshNow]);

  const isOnline = snapshot.phase === 'online';
  const isBusy = snapshot.phase === 'queueing' || snapshot.phase === 'installing' || snapshot.phase === 'restarting';

  return {
    phase: snapshot.phase,
    message: snapshot.message,
    baseUrl,
    isOnline,
    isBusy,
    lastUpdated: snapshot.lastUpdated,
    recoveryCount: snapshot.recoveryCount,
    managerListRevision: snapshot.managerListRevision,
    refreshNow,
  };
}


import { useState, useEffect, useCallback } from 'react';
import type { ComfyUIStartOptions, ElectronDefaultPaths } from '../types/electron';

export type ComfyUIProcessStatus = 'idle' | 'starting' | 'running' | 'error' | 'stopped';

const MAX_LOG_LINES = 150;

export function useComfyUIProcess() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  const [status, setStatus] = useState<ComfyUIProcessStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectron) return;

    const unsubLog = window.electronAPI!.onComfyUILog((data) => {
      const lines = data.text.split('\n').filter(Boolean);
      setLogs((prev) => [...prev, ...lines].slice(-MAX_LOG_LINES));
    });

    const unsubExit = window.electronAPI!.onComfyUIExit(({ code }) => {
      if (code === 0 || code === null) {
        setStatus('stopped');
      } else {
        setStatus('error');
        setError(`ComfyUI exited with code ${code}`);
      }
    });

    // Sync status with actual process state on mount
    void window.electronAPI!.isComfyUIRunning().then((running) => {
      if (running) setStatus('running');
    });

    return () => {
      unsubLog();
      unsubExit();
    };
  }, [isElectron]);

  const start = useCallback(async (opts: ComfyUIStartOptions) => {
    if (!isElectron) return;
    setLogs([]);
    setError(null);
    setStatus('starting');
    const result = await window.electronAPI!.startComfyUI(opts);
    if (result.error) {
      setError(result.error);
      setStatus('error');
    } else {
      setStatus('running');
    }
  }, [isElectron]);

  const stop = useCallback(async () => {
    if (!isElectron) return;
    const result = await window.electronAPI!.stopComfyUI();
    if (!result.error) setStatus('stopped');
  }, [isElectron]);

  const getDefaultPaths = useCallback(async (): Promise<ElectronDefaultPaths | null> => {
    if (!isElectron) return null;
    return window.electronAPI!.getDefaultPaths();
  }, [isElectron]);

  return { isElectron, status, logs, error, start, stop, getDefaultPaths };
}

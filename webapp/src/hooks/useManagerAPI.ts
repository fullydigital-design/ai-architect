import { useState, useCallback, useEffect, useRef } from 'react';
import type { ManagerNodeStatus } from '../types/comfyui';
import {
  checkManagerAvailable,
  downloadModel,
  getManagerNodeList,
  installPack as installPackViaQueue,
  uninstallPack as uninstallPackViaQueue,
  updatePack as updatePackViaQueue,
  invalidateDetectionCache,
  invalidateManagerNodeListCache,
  rebootAndWait,
  type ManagerNode,
} from '../app/services/comfyui-manager-service';
import { resolveComfyUIBaseUrl } from '../services/api-config';

export interface UseManagerAPIReturn {
  managerAvailable: boolean;
  isChecking: boolean;
  isRebooting: boolean;
  packStatuses: Map<string, ManagerNodeStatus>;
  activeAction: { reference: string; action: string } | null;
  checkManager: (comfyuiUrl: string) => Promise<boolean>;
  recheckManager: () => Promise<boolean>;
  fetchStatuses: (comfyuiUrl: string) => Promise<void>;
  installPack: (comfyuiUrl: string, reference: string) => Promise<boolean>;
  updatePack: (comfyuiUrl: string, reference: string) => Promise<boolean>;
  uninstallPack: (comfyuiUrl: string, reference: string) => Promise<boolean>;
  installModel: (
    comfyuiUrl: string,
    url: string,
    modelDir: string,
    filename: string,
    auth?: { huggingfaceToken?: string; civitaiApiKey?: string },
  ) => Promise<boolean>;
  rebootComfyUI: (comfyuiUrl: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

function normalizeUrl(url: string): string {
  return resolveComfyUIBaseUrl(url);
}

function normalizeReference(ref: string): string {
  return ref.replace(/\.git$/, '').replace(/\/+$/, '').toLowerCase();
}

function toStatus(node: ManagerNode): ManagerNodeStatus {
  const installed = String(node.installed ?? '').toLowerCase();
  const state = String(node.state ?? '').toLowerCase();

  if (installed === 'update' || state === 'update') return 'update-available';
  if (state === 'disabled' || installed === 'disabled') return 'disabled';
  if (
    state === 'enabled'
    || installed === 'true'
    || installed === 'installed'
    || node.is_installed === true
  ) {
    return 'installed';
  }
  if (installed === 'false' || state === 'not-installed') return 'not-installed';
  return 'unknown';
}

export function useManagerAPI(comfyuiUrl?: string): UseManagerAPIReturn {
  const [managerAvailable, setManagerAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [packStatuses, setPackStatuses] = useState<Map<string, ManagerNodeStatus>>(new Map());
  const [activeAction, setActiveAction] = useState<{ reference: string; action: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const managerNodesRef = useRef<Map<string, ManagerNode>>(new Map());

  const checkManager = useCallback(async (inputUrl: string) => {
    const target = normalizeUrl(inputUrl);
    setError(null);
    setIsChecking(true);
    try {
      const ok = await checkManagerAvailable(target);
      console.log('[useManagerAPI] Setting managerAvailable:', ok);
      setManagerAvailable(ok);
      return ok;
    } catch (err) {
      setManagerAvailable(false);
      setError(err instanceof Error ? err.message : 'Failed to reach ComfyUI-Manager');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const recheckManager = useCallback(async () => {
    invalidateDetectionCache();
    const target = normalizeUrl(comfyuiUrl || '');
    return await checkManager(target);
  }, [comfyuiUrl, checkManager]);

  useEffect(() => {
    const target = normalizeUrl(comfyuiUrl?.trim() || '');

    let cancelled = false;
    const maxRetries = 3;
    const retryDelayMs = 5000;

    const run = async () => {
      setIsChecking(true);
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (cancelled) return;

        try {
          if (attempt > 0) invalidateDetectionCache();
          const ok = await checkManagerAvailable(target);
          if (cancelled) return;
          setManagerAvailable(ok);

          if (ok) {
            setIsChecking(false);
            return;
          }
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Failed to reach ComfyUI-Manager');
        }

        if (attempt < maxRetries) {
          console.log(`[useManagerAPI] Retry ${attempt + 1}/${maxRetries} in ${retryDelayMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }

      if (!cancelled) {
        setManagerAvailable(false);
        setIsChecking(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [comfyuiUrl]);

  const fetchStatuses = useCallback(async (inputUrl: string) => {
    const target = normalizeUrl(inputUrl);
    setLoading(true);
    setError(null);

    try {
      const data = await getManagerNodeList(target);
      const nextStatuses = new Map<string, ManagerNodeStatus>();
      const byReference = new Map<string, ManagerNode>();

      for (const item of data) {
        if (!item.reference) continue;
        const key = normalizeReference(item.reference);
        nextStatuses.set(item.reference, toStatus(item));
        byReference.set(key, item);
      }

      managerNodesRef.current = byReference;
      setPackStatuses(nextStatuses);
      setManagerAvailable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ComfyUI-Manager statuses');
    } finally {
      setLoading(false);
    }
  }, []);

  const runAction = useCallback(async (
    inputUrl: string,
    reference: string,
    action: 'update' | 'uninstall',
  ): Promise<boolean> => {
    setError(null);
    setActiveAction({ reference, action });
    setPackStatuses((prev) => {
      const next = new Map(prev);
      next.set(reference, 'installing');
      return next;
    });

    try {
      const target = normalizeUrl(inputUrl);
      const normalizedRef = normalizeReference(reference);
      let managerNode = managerNodesRef.current.get(normalizedRef);

      if (!managerNode) {
        const nodeList = await getManagerNodeList(target);
        managerNode = nodeList.find((item) => normalizeReference(item.reference || '') === normalizedRef);
        if (managerNode) {
          managerNodesRef.current.set(normalizedRef, managerNode);
        }
      }

      const result = action === 'uninstall'
        ? await uninstallPackViaQueue(managerNode || { reference }, target)
        : await updatePackViaQueue(managerNode || { reference }, target);

      if (!result.success) {
        throw new Error(result.error || `Failed to ${action} pack`);
      }

      invalidateManagerNodeListCache();
      setPackStatuses((prev) => {
        const next = new Map(prev);
        next.set(reference, action === 'uninstall' ? 'not-installed' : 'installed');
        return next;
      });
      return true;
    } catch (err) {
      setPackStatuses((prev) => {
        const next = new Map(prev);
        next.set(reference, 'unknown');
        return next;
      });
      setError(err instanceof Error ? err.message : `Failed to ${action} pack`);
      return false;
    } finally {
      setActiveAction(null);
    }
  }, []);

  const installPack = useCallback(async (inputUrl: string, reference: string): Promise<boolean> => {
    const target = normalizeUrl(inputUrl);
    const normalizedRef = normalizeReference(reference);

    if (!normalizedRef) {
      setError('Cannot auto-install: pack reference is missing.');
      return false;
    }

    setError(null);
    setActiveAction({ reference, action: 'install' });
    setPackStatuses((prev) => {
      const next = new Map(prev);
      next.set(reference, 'installing');
      return next;
    });

    try {
      let managerNode = managerNodesRef.current.get(normalizedRef);

      if (!managerNode) {
        const nodeList = await getManagerNodeList(target);
        managerNode = nodeList.find((item) => normalizeReference(item.reference || '') === normalizedRef);
        if (managerNode) {
          managerNodesRef.current.set(normalizedRef, managerNode);
        }
      }

      const result = await installPackViaQueue(managerNode || { reference }, target);
      if (!result.success) {
        throw new Error(result.error || 'Failed to install pack');
      }

      invalidateManagerNodeListCache();
      setPackStatuses((prev) => {
        const next = new Map(prev);
        next.set(reference, 'installed');
        return next;
      });

      return true;
    } catch (err) {
      setPackStatuses((prev) => {
        const next = new Map(prev);
        next.set(reference, 'unknown');
        return next;
      });
      setError(err instanceof Error ? err.message : 'Failed to install pack');
      return false;
    } finally {
      setActiveAction(null);
    }
  }, []);

  const updatePack = useCallback(
    (inputUrl: string, reference: string) => runAction(inputUrl, reference, 'update'),
    [runAction],
  );

  const uninstallPack = useCallback(
    (inputUrl: string, reference: string) => runAction(inputUrl, reference, 'uninstall'),
    [runAction],
  );

  const installModel = useCallback(async (
    inputUrl: string,
    url: string,
    modelDir: string,
    filename: string,
    auth?: { huggingfaceToken?: string; civitaiApiKey?: string },
  ): Promise<boolean> => {
    setError(null);
    try {
      const normalizedModelType = (modelDir || '').replace(/\\/g, '/').split('/').pop() || modelDir;
      const result = await downloadModel(inputUrl, {
        url,
        filename,
        save_path: modelDir,
        modelDir,
        modelType: normalizedModelType,
        huggingfaceToken: auth?.huggingfaceToken,
        civitaiApiKey: auth?.civitaiApiKey,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to install model';
      if (message.includes('(404)') || message.includes('(0)')) {
        setError('ComfyUI-Manager /model/install endpoint not available. Please download manually or update ComfyUI-Manager.');
      } else if (message.includes('401') || message.includes('403')) {
        setError('Model source requires authentication (token/login).');
      } else {
        setError(message);
      }
      return false;
    }
  }, []);

  const rebootComfyUI = useCallback(async (inputUrl: string): Promise<boolean> => {
    setError(null);
    setIsRebooting(true);
    try {
      const ok = await rebootAndWait(
        inputUrl,
        () => { /* onRebootStarted — already reflected by isRebooting */ },
        () => { setIsRebooting(false); },
      );
      if (!ok) {
        setIsRebooting(false);
        setError('ComfyUI restart timed out or failed');
      }
      return ok;
    } catch (err) {
      setIsRebooting(false);
      setError(err instanceof Error ? err.message : 'Failed to reboot ComfyUI');
      return false;
    }
  }, []);

  return {
    managerAvailable,
    isChecking,
    isRebooting,
    packStatuses,
    activeAction,
    checkManager,
    recheckManager,
    fetchStatuses,
    installPack,
    updatePack,
    uninstallPack,
    installModel,
    rebootComfyUI,
    loading,
    error,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractRequiredModels } from '../utils/workflow-model-extractor';
import {
  checkModelAvailabilityFromMap,
  fetchAvailableModels,
  type ModelAvailability,
} from '../services/model-availability-service';
import { findModelSources, formatFileSize, type ModelSourceMatch } from '../services/model-source-matcher';

interface UseRequiredModelsParams {
  workflowJson: Record<string, any> | null;
  comfyuiUrl: string;
  enabled: boolean;
}

interface UseRequiredModelsReturn {
  models: ModelAvailability[];
  missingModels: ModelAvailability[];
  availableModels: ModelAvailability[];
  sources: Map<string, ModelSourceMatch>;
  isChecking: boolean;
  isSearchingSources: boolean;
  checkFailed: boolean;
  sourceSearchProgress: { current: number; total: number } | null;
  totalMissingSize: number;
  totalMissingSizeFormatted: string;
  refresh: () => void;
}

const OBJECT_INFO_CACHE_MS = 30_000;
const CHECK_DEBOUNCE_MS = 1_000;

export function useRequiredModels({
  workflowJson,
  comfyuiUrl,
  enabled,
}: UseRequiredModelsParams): UseRequiredModelsReturn {
  const [models, setModels] = useState<ModelAvailability[]>([]);
  const [sources, setSources] = useState<Map<string, ModelSourceMatch>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const [isSearchingSources, setIsSearchingSources] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [sourceSearchProgress, setSourceSearchProgress] = useState<{ current: number; total: number } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const runIdRef = useRef(0);
  const cacheRef = useRef<{ timestamp: number; map: Map<string, string[]> } | null>(null);

  const refresh = useCallback(() => {
    setRefreshTick((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !workflowJson) {
      setModels([]);
      setSources(new Map());
      setIsChecking(false);
      setIsSearchingSources(false);
      setCheckFailed(false);
      setSourceSearchProgress(null);
      return;
    }

    const runId = ++runIdRef.current;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsChecking(true);
      setIsSearchingSources(false);
      setCheckFailed(false);
      setSourceSearchProgress(null);

      const required = extractRequiredModels(workflowJson);
      if (required.length === 0) {
        if (runIdRef.current === runId && !cancelled) {
          setModels([]);
          setSources(new Map());
          setIsChecking(false);
          setIsSearchingSources(false);
          setCheckFailed(false);
          setSourceSearchProgress(null);
        }
        return;
      }

      let availableMap: Map<string, string[]>;
      let succeeded = true;
      try {
        const now = Date.now();
        if (cacheRef.current && now - cacheRef.current.timestamp < OBJECT_INFO_CACHE_MS) {
          availableMap = cacheRef.current.map;
        } else {
          availableMap = await fetchAvailableModels(comfyuiUrl);
          cacheRef.current = { timestamp: now, map: availableMap };
        }
      } catch {
        availableMap = new Map();
        succeeded = false;
      }

      const checked = checkModelAvailabilityFromMap(required, availableMap);
      if (runIdRef.current !== runId || cancelled) return;
      setModels(checked);
      setCheckFailed(!succeeded);
      setIsChecking(false);

      const missing = checked.filter((m) => !m.isAvailable);
      if (missing.length === 0) {
        setSources(new Map());
        setIsSearchingSources(false);
        setSourceSearchProgress(null);
        return;
      }

      setIsSearchingSources(true);
      const matched = await findModelSources(missing, (current, total) => {
        if (runIdRef.current !== runId || cancelled) return;
        setSourceSearchProgress({ current, total });
      });
      if (runIdRef.current !== runId || cancelled) return;
      setSources(matched);
      setIsSearchingSources(false);
      setSourceSearchProgress(null);
    }, CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workflowJson, comfyuiUrl, enabled, refreshTick]);

  const missingModels = useMemo(() => models.filter((model) => !model.isAvailable), [models]);
  const availableModels = useMemo(() => models.filter((model) => model.isAvailable), [models]);

  const totalMissingSize = useMemo(() => {
    let total = 0;
    for (const model of missingModels) {
      const src = sources.get(model.filename);
      if (typeof src?.fileSizeBytes === 'number') total += src.fileSizeBytes;
    }
    return total;
  }, [missingModels, sources]);

  return {
    models,
    missingModels,
    availableModels,
    sources,
    isChecking,
    isSearchingSources,
    checkFailed,
    sourceSearchProgress,
    totalMissingSize,
    totalMissingSizeFormatted: formatFileSize(totalMissingSize),
    refresh,
  };
}

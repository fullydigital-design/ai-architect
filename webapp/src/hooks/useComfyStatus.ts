import { useState, useEffect } from 'react';
import { getComfyUIBaseUrl } from '../services/api-config';

export function useComfyStatus(
  baseUrl = getComfyUIBaseUrl(),
  intervalMs = 5000
) {
  const [online, setOnline] = useState(false);
  const [gpuUsage, setGpuUsage] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${baseUrl}/system_stats`, {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          setOnline(true);
          const vram = data?.devices?.[0]?.vram_used;
          const vramTotal = data?.devices?.[0]?.vram_total;
          if (vram && vramTotal) {
            setGpuUsage(Math.round((vram / vramTotal) * 100));
          }
        } else {
          setOnline(false);
          setGpuUsage(null);
        }
      } catch {
        setOnline(false);
        setGpuUsage(null);
      }
    };

    const visibleIntervalMs = Math.max(intervalMs, 10_000);
    const hiddenIntervalMs = Math.max(60_000, visibleIntervalMs);
    let timer: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (timer) clearInterval(timer);
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const nextInterval = hidden ? hiddenIntervalMs : visibleIntervalMs;
      timer = setInterval(() => {
        void check();
      }, nextInterval);
    };

    const handleVisibility = () => {
      startTimer();
      if (document.visibilityState === 'visible') {
        void check();
      }
    };

    void check();
    startTimer();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [baseUrl, intervalMs]);

  return { online, gpuUsage };
}

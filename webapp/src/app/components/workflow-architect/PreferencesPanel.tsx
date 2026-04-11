import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { AppPreferences } from '../../../types/comfyui';
import { clearExperimentHistory } from '../../../services/experiment-engine';

interface PreferencesPanelProps {
  preferences: AppPreferences;
  onPreferencesChange: (prefs: AppPreferences) => void;
}

interface SystemInfoState {
  isConnected: boolean;
  comfyVersion?: string;
  gpuName?: string;
  pythonVersion?: string;
}

function readStoredComfyUrl(): string {
  try {
    const raw = localStorage.getItem('comfyui-architect-settings');
    if (!raw) return 'http://127.0.0.1:8188';
    const parsed = JSON.parse(raw) as { comfyuiUrl?: string };
    return typeof parsed.comfyuiUrl === 'string' && parsed.comfyuiUrl.trim()
      ? parsed.comfyuiUrl.trim()
      : 'http://127.0.0.1:8188';
  } catch {
    return 'http://127.0.0.1:8188';
  }
}

/** Strip device prefix ("cuda:0 ") and backend suffix (" : cudaMallocAsync") from GPU name. */
function parseGpuName(raw: string): string {
  return raw.replace(/^cuda:\d+\s+/i, '').replace(/\s*:\s*\S+$/, '').trim();
}

// ---- Shared UI primitives ---------------------------------------------------

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-content-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-sm transition-colors ${
          value ? 'bg-primary/80' : 'bg-surface-secondary'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-sm bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-content-muted">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-border-default bg-surface-secondary p-4 space-y-3">
      <h3 className="text-sm text-content-primary">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// ---- Component --------------------------------------------------------------

export function PreferencesPanel({ preferences, onPreferencesChange }: PreferencesPanelProps) {
  const [comfyUrl, setComfyUrl] = useState<string>(readStoredComfyUrl);
  const [systemInfo, setSystemInfo] = useState<SystemInfoState>({ isConnected: false });

  const update = useCallback(
    <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
      onPreferencesChange({ ...preferences, [key]: value });
    },
    [preferences, onPreferencesChange],
  );

  // Save URL to the key App.tsx reads so the change actually takes effect on next connection.
  const handleComfyUrlChange = (url: string) => {
    setComfyUrl(url);
    try {
      const existing = JSON.parse(
        localStorage.getItem('comfyui-architect-settings') || '{}',
      ) as Record<string, unknown>;
      localStorage.setItem(
        'comfyui-architect-settings',
        JSON.stringify({ ...existing, comfyuiUrl: url.trim().replace(/\/+$/, '') }),
      );
    } catch {
      // keep best-effort
    }
  };

  const normalizedUrl = comfyUrl.trim().replace(/\/+$/, '');

  useEffect(() => {
    let cancelled = false;

    const fetchSystemInfo = async () => {
      if (!normalizedUrl) {
        setSystemInfo({ isConnected: false });
        return;
      }
      try {
        const response = await fetch(`${normalizedUrl}/system_stats`);
        if (!response.ok) {
          if (!cancelled) setSystemInfo({ isConnected: false });
          return;
        }
        const data = (await response.json()) as Record<string, unknown>;
        const system = data?.system as Record<string, unknown> | undefined;
        const devices = Array.isArray(data?.devices)
          ? (data.devices as Array<Record<string, unknown>>)
          : [];
        const device = devices[0];
        if (!cancelled) {
          setSystemInfo({
            isConnected: true,
            comfyVersion:
              (system?.comfyui_version ?? system?.version) as string | undefined,
            gpuName:
              typeof device?.name === 'string' ? parseGpuName(device.name) : undefined,
            pythonVersion:
              typeof system?.python_version === 'string'
                ? system.python_version.split(' ')[0]   // "3.12.10 (tags/...)" → "3.12.10"
                : undefined,
          });
        }
      } catch {
        if (!cancelled) setSystemInfo({ isConnected: false });
      }
    };

    void fetchSystemInfo();
    return () => {
      cancelled = true;
    };
  }, [normalizedUrl]);

  const handleClearExperimentHistory = () => {
    clearExperimentHistory();
    toast.success('Experiment history cleared');
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-inset text-content-primary">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-5 space-y-4">

        {/* ── Graph & Editor ─────────────────────────────────────────── */}
        <Section title="Graph & Editor">
          <Toggle
            label="Show widget values in nodes"
            value={preferences.showWidgetValues}
            onChange={(v) => update('showWidgetValues', v)}
          />
          <Toggle
            label="Enable graph animations"
            value={preferences.graphAnimations}
            onChange={(v) => update('graphAnimations', v)}
          />
          <Toggle
            label="Auto-validate after AI generation"
            value={preferences.autoValidate}
            onChange={(v) => update('autoValidate', v)}
          />
          <Toggle
            label="Auto-save workflow to browser"
            value={preferences.autoSaveWorkflow}
            onChange={(v) => update('autoSaveWorkflow', v)}
          />
        </Section>

        {/* ── Connection ─────────────────────────────────────────────── */}
        <Section title="Connection">
          <SettingsRow label="ComfyUI server URL">
            <input
              type="text"
              value={comfyUrl}
              onChange={(e) => handleComfyUrlChange(e.target.value)}
              placeholder="http://127.0.0.1:8188"
              className="w-48 rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            />
          </SettingsRow>
        </Section>

        {/* ── Gallery & Images ───────────────────────────────────────── */}
        <Section title="Gallery & Images">
          <SettingsRow label="Image preview size">
            <select
              value={preferences.imagePreviewSize}
              onChange={(e) =>
                update('imagePreviewSize', e.target.value as AppPreferences['imagePreviewSize'])
              }
              className="rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </SettingsRow>
          <SettingsRow label="Gallery columns (0 = auto)">
            <input
              type="number"
              min={0}
              max={12}
              value={preferences.galleryColumns}
              onChange={(e) => update('galleryColumns', Number(e.target.value) || 0)}
              className="w-20 rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            />
          </SettingsRow>
        </Section>

        {/* ── Interface ──────────────────────────────────────────────── */}
        <Section title="Interface">
          <Toggle
            label="Show keyboard shortcut hints"
            value={preferences.showShortcutHints}
            onChange={(v) => update('showShortcutHints', v)}
          />
          <Toggle
            label="Hide NSFW content in model browser"
            value={preferences.nsfwFilter}
            onChange={(v) => update('nsfwFilter', v)}
          />
          <SettingsRow label="History page size">
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              value={preferences.historyPageSize}
              onChange={(e) =>
                update('historyPageSize', Math.max(10, Number(e.target.value) || 50))
              }
              className="w-20 rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            />
          </SettingsRow>
          <SettingsRow label="Clear experiment history">
            <button
              onClick={handleClearExperimentHistory}
              className="rounded bg-red-600/20 border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-600/30 transition-colors"
            >
              Clear All
            </button>
          </SettingsRow>
        </Section>

        {/* ── About ──────────────────────────────────────────────────── */}
        <Section title="About">
          <SettingsRow label="App version">
            <span className="text-xs text-content-muted">1.0.0</span>
          </SettingsRow>
          {systemInfo.isConnected && (
            <>
              <SettingsRow label="ComfyUI version">
                <span className="text-xs text-content-muted">
                  {systemInfo.comfyVersion || 'Unknown'}
                </span>
              </SettingsRow>
              <SettingsRow label="GPU">
                <span className="text-xs text-content-muted">
                  {systemInfo.gpuName || 'Unknown'}
                </span>
              </SettingsRow>
              <SettingsRow label="Python">
                <span className="text-xs text-content-muted">
                  {systemInfo.pythonVersion || 'Unknown'}
                </span>
              </SettingsRow>
            </>
          )}
          <div className="pt-1 border-t border-border-default/50 text-center">
            <span className="text-[10px] text-content-muted">
              ComfyUI Workflow Architect · by Hleb Likhodievski
            </span>
          </div>
        </Section>

      </div>
    </div>
  );
}

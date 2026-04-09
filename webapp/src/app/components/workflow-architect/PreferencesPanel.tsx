import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { AppPreferences } from '../../../types/comfyui';
import { clearExperimentHistory } from '../../../services/experiment-engine';

interface PreferencesPanelProps {
  preferences: AppPreferences;
  onPreferencesChange: (prefs: AppPreferences) => void;
}

interface ExtraPreferences {
  defaultStrategy: 'balanced' | 'max-quality' | 'max-speed' | 'prompt-adherence' | 'style-enhance' | 'vram-optimize' | 'custom';
  defaultRatingMode: 'overall' | 'quality-focus' | 'speed-vs-quality' | 'prompt-match' | 'aesthetic';
  autoSyncRatingMode: boolean;
  comfyUrl: string;
  autoReconnect: boolean;
  connectionTimeout: number;
  autoRateAfterExperiment: boolean;
  saveExperimentHistory: boolean;
  maxExperimentHistory: number;
  exportFormat: 'api' | 'graph' | 'both';
  includeNotesInExport: boolean;
  authorName: string;
}

interface SystemInfoState {
  isConnected: boolean;
  comfyVersion?: string;
  gpuName?: string;
  pythonVersion?: string;
}

const EXTRA_DEFAULTS: ExtraPreferences = {
  defaultStrategy: 'balanced',
  defaultRatingMode: 'overall',
  autoSyncRatingMode: true,
  comfyUrl: 'http://127.0.0.1:8188',
  autoReconnect: true,
  connectionTimeout: 15,
  autoRateAfterExperiment: false,
  saveExperimentHistory: true,
  maxExperimentHistory: 100,
  exportFormat: 'api',
  includeNotesInExport: true,
  authorName: '',
};

function readStoredPreferencesObject(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem('comfyui-architect-preferences');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readStoredComfyUrl(): string {
  try {
    const raw = localStorage.getItem('comfyui-architect-settings');
    if (!raw) return EXTRA_DEFAULTS.comfyUrl;
    const parsed = JSON.parse(raw) as { comfyuiUrl?: string };
    return typeof parsed.comfyuiUrl === 'string' && parsed.comfyuiUrl.trim()
      ? parsed.comfyuiUrl.trim()
      : EXTRA_DEFAULTS.comfyUrl;
  } catch {
    return EXTRA_DEFAULTS.comfyUrl;
  }
}

function normalizeBaseUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

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

export function PreferencesPanel({ preferences, onPreferencesChange }: PreferencesPanelProps) {
  const [extraPrefs, setExtraPrefs] = useState<ExtraPreferences>(() => {
    const stored = readStoredPreferencesObject();
    return {
      ...EXTRA_DEFAULTS,
      ...stored,
      comfyUrl: (typeof stored.comfyUrl === 'string' && stored.comfyUrl) || readStoredComfyUrl(),
    } as ExtraPreferences;
  });

  const [systemInfo, setSystemInfo] = useState<SystemInfoState>({ isConnected: false });

  const comfyUrl = useMemo(() => normalizeBaseUrl(extraPrefs.comfyUrl || readStoredComfyUrl()), [extraPrefs.comfyUrl]);

  const saveMergedPreferences = useCallback((nextExtra: ExtraPreferences) => {
    const merged = { ...(preferences as Record<string, unknown>), ...nextExtra };
    onPreferencesChange(merged as AppPreferences);
  }, [onPreferencesChange, preferences]);

  const update = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    const merged = { ...(preferences as Record<string, unknown>), ...extraPrefs, [key]: value };
    onPreferencesChange(merged as AppPreferences);
  };

  const updateExtra = <K extends keyof ExtraPreferences>(key: K, value: ExtraPreferences[K]) => {
    setExtraPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveMergedPreferences(next);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const fetchSystemInfo = async () => {
      if (!comfyUrl) {
        setSystemInfo({ isConnected: false });
        return;
      }
      try {
        const response = await fetch(`${comfyUrl}/system_stats`);
        if (!response.ok) {
          if (!cancelled) setSystemInfo({ isConnected: false });
          return;
        }
        const data = await response.json() as any;
        const device = Array.isArray(data?.devices) ? data.devices[0] : null;
        if (!cancelled) {
          setSystemInfo({
            isConnected: true,
            comfyVersion: data?.system?.comfyui_version || data?.system?.version || undefined,
            gpuName: typeof device?.name === 'string' ? device.name : undefined,
            pythonVersion: data?.system?.python_version || undefined,
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
  }, [comfyUrl]);

  const handleClearExperimentHistory = () => {
    clearExperimentHistory();
    toast.success('Experiment history cleared');
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-inset text-content-primary">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-5 space-y-4">
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

        <Section title="AI & Optimizer">
          <SettingsRow label="Default optimizer strategy">
            <select
              value={extraPrefs.defaultStrategy}
              onChange={(e) => updateExtra('defaultStrategy', e.target.value as ExtraPreferences['defaultStrategy'])}
              className="rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            >
              <option value="balanced">Balanced</option>
              <option value="max-quality">Max Quality</option>
              <option value="max-speed">Max Speed</option>
              <option value="prompt-adherence">Prompt Match</option>
              <option value="style-enhance">Style Enhance</option>
              <option value="vram-optimize">VRAM Optimize</option>
              <option value="custom">Custom Goal</option>
            </select>
          </SettingsRow>
          <SettingsRow label="Default rating mode">
            <select
              value={extraPrefs.defaultRatingMode}
              onChange={(e) => updateExtra('defaultRatingMode', e.target.value as ExtraPreferences['defaultRatingMode'])}
              className="rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            >
              <option value="overall">Overall Quality</option>
              <option value="quality-focus">Quality Focus</option>
              <option value="speed-vs-quality">Speed vs Quality</option>
              <option value="prompt-match">Prompt Match</option>
              <option value="aesthetic">Aesthetic Judge</option>
            </select>
          </SettingsRow>
          <Toggle
            label="Auto-sync rating mode with strategy"
            value={extraPrefs.autoSyncRatingMode}
            onChange={(v) => updateExtra('autoSyncRatingMode', v)}
          />
        </Section>

        <Section title="Connection">
          <SettingsRow label="ComfyUI server URL">
            <input
              type="text"
              value={extraPrefs.comfyUrl}
              onChange={(e) => updateExtra('comfyUrl', e.target.value)}
              placeholder="http://127.0.0.1:8188"
              className="w-48 rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            />
          </SettingsRow>
          <Toggle
            label="Auto-reconnect WebSocket"
            value={extraPrefs.autoReconnect}
            onChange={(v) => updateExtra('autoReconnect', v)}
          />
          <SettingsRow label="Connection timeout (seconds)">
            <input
              type="number"
              value={extraPrefs.connectionTimeout}
              min={5}
              max={60}
              onChange={(e) => updateExtra('connectionTimeout', Math.max(5, Math.min(60, Number(e.target.value) || 15)))}
              className="w-20 rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            />
          </SettingsRow>
        </Section>

        <Section title="Experiment Engine">
          <Toggle
            label="Auto-rate images after experiment"
            value={extraPrefs.autoRateAfterExperiment}
            onChange={(v) => updateExtra('autoRateAfterExperiment', v)}
          />
          <Toggle
            label="Save experiment history"
            value={extraPrefs.saveExperimentHistory}
            onChange={(v) => updateExtra('saveExperimentHistory', v)}
          />
          <SettingsRow label="Max experiment history entries">
            <input
              type="number"
              value={extraPrefs.maxExperimentHistory}
              min={10}
              max={500}
              onChange={(e) => updateExtra('maxExperimentHistory', Math.max(10, Math.min(500, Number(e.target.value) || 100)))}
              className="w-20 rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            />
          </SettingsRow>
          <SettingsRow label="Clear experiment history">
            <button
              onClick={handleClearExperimentHistory}
              className="rounded bg-red-600/20 border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-600/30"
            >
              Clear All
            </button>
          </SettingsRow>
        </Section>

        <Section title="Export & Sharing">
          <SettingsRow label="Default export format">
            <select
              value={extraPrefs.exportFormat}
              onChange={(e) => updateExtra('exportFormat', e.target.value as ExtraPreferences['exportFormat'])}
              className="rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            >
              <option value="api">API Format (recommended)</option>
              <option value="graph">Graph/UI Format</option>
              <option value="both">Both</option>
            </select>
          </SettingsRow>
          <Toggle
            label="Include workflow notes in export"
            value={extraPrefs.includeNotesInExport}
            onChange={(v) => updateExtra('includeNotesInExport', v)}
          />
          <SettingsRow label="Author name for exports">
            <input
              type="text"
              value={extraPrefs.authorName}
              onChange={(e) => updateExtra('authorName', e.target.value)}
              placeholder="Your name"
              className="w-48 rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            />
          </SettingsRow>
        </Section>

        <Section title="Gallery & Images">
          <SettingsRow label="Image preview size">
            <select
              value={preferences.imagePreviewSize}
              onChange={(e) => update('imagePreviewSize', e.target.value as AppPreferences['imagePreviewSize'])}
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

        <Section title="Model Browser">
          <Toggle
            label="Hide NSFW content"
            value={preferences.nsfwFilter}
            onChange={(v) => update('nsfwFilter', v)}
          />
        </Section>

        <Section title="Interface">
          <Toggle
            label="Show keyboard shortcut hints"
            value={preferences.showShortcutHints}
            onChange={(v) => update('showShortcutHints', v)}
          />
          <SettingsRow label="History page size">
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              value={preferences.historyPageSize}
              onChange={(e) => update('historyPageSize', Math.max(10, Number(e.target.value) || 50))}
              className="w-20 rounded-sm border border-border-strong bg-surface-inset px-2 py-1 text-xs text-content-primary"
            />
          </SettingsRow>
        </Section>

        <Section title="About">
          <SettingsRow label="App version">
            <span className="text-xs text-content-muted">1.0.0</span>
          </SettingsRow>
          {systemInfo.isConnected && (
            <>
              <SettingsRow label="ComfyUI version">
                <span className="text-xs text-content-muted">{systemInfo.comfyVersion || 'Unknown'}</span>
              </SettingsRow>
              <SettingsRow label="GPU">
                <span className="text-xs text-content-muted">{systemInfo.gpuName || 'Unknown'}</span>
              </SettingsRow>
              <SettingsRow label="Python">
                <span className="text-xs text-content-muted">{systemInfo.pythonVersion || 'Unknown'}</span>
              </SettingsRow>
            </>
          )}
          <SettingsRow label="">
            <span className="text-[10px] text-text-muted">ComfyUI Workflow Architect by Hleb Likhodievski</span>
          </SettingsRow>
        </Section>
      </div>
    </div>
  );
}



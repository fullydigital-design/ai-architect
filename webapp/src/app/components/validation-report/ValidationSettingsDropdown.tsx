import { useState } from 'react';
import type { PipelineValidationOptions as ValidationOptions } from '@/services/workflow-validator';

interface ValidationSettingsDropdownProps {
  options: Required<ValidationOptions>;
  onChange: (options: Required<ValidationOptions>) => void;
}

export function ValidationSettingsDropdown({ options, onChange }: ValidationSettingsDropdownProps) {
  const [open, setOpen] = useState(false);

  const toggle = (key: keyof ValidationOptions) => {
    onChange({ ...options, [key]: !options[key] });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-1 text-content-muted hover:text-content-primary"
        title="Validation settings"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-surface-inset border border-border-strong rounded-xl shadow-2xl p-3 space-y-2">
            <h3 className="text-xs text-white mb-2">Validation Settings</h3>
            <ToggleRow label="Auto-fix issues" description="Automatically correct fixable problems" checked={options.autoFix} onChange={() => toggle('autoFix')} />
            <ToggleRow label="Fuzzy name matching" description="Correct misspelled node/input names" checked={options.fuzzyMatch} onChange={() => toggle('fuzzyMatch')} />
            <ToggleRow
              label="Auto-connect missing inputs"
              description="Wire unconnected required inputs (risky on complex workflows - disabled by default)"
              checked={options.autoConnect}
              onChange={() => toggle('autoConnect')}
            />
            <ToggleRow label="Clamp widget values" description="Fix out-of-range numbers" checked={options.autoClamp} onChange={() => toggle('autoClamp')} />
            <ToggleRow label="Remove orphan nodes" description="Remove nodes not connected to outputs" checked={options.removeOrphans} onChange={() => toggle('removeOrphans')} />
            <ToggleRow label="Deduplicate loaders" description="Merge identical model loaders" checked={options.deduplicateLoaders} onChange={() => toggle('deduplicateLoaders')} />
            <ToggleRow
              label="Safe mode (recommended)"
              description="Warn only - never remove or disconnect anything"
              checked={options.safeMode ?? true}
              onChange={() => onChange({ ...options, safeMode: !(options.safeMode ?? true) })}
            />
            <ToggleRow
              label="Allow unknown nodes"
              description="Pass through nodes not in /object_info cache"
              checked={options.allowUnknownNodes ?? true}
              onChange={() => onChange({ ...options, allowUnknownNodes: !(options.allowUnknownNodes ?? true) })}
            />
            <ToggleRow
              label="Skip validation for unknown"
              description="Don't check inputs/outputs on custom nodes"
              checked={options.skipValidationForUnknown ?? true}
              onChange={() => onChange({ ...options, skipValidationForUnknown: !(options.skipValidationForUnknown ?? true) })}
            />
            <div className="pt-2 border-t border-border-default">
              <ToggleRow label="Strict mode" description="Treat warnings as errors" checked={options.strict} onChange={() => toggle('strict')} />
            </div>
            <div className="pt-2 border-t border-border-default">
              <label className="text-[10px] text-content-secondary">
                Fuzzy match threshold: {Math.round(options.fuzzyThreshold * 100)}%
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={Math.round(options.fuzzyThreshold * 100)}
                onChange={(event) => onChange({ ...options, fuzzyThreshold: Number(event.target.value) / 100 })}
                className="w-full h-1 mt-1 bg-surface-elevated rounded-full appearance-none"
              />
              <div className="flex justify-between text-[9px] text-content-faint">
                <span>Loose (50%)</span>
                <span>Strict (95%)</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3 h-3 mt-0.5 rounded border-border-strong bg-surface-elevated accent-blue-500"
      />
      <div>
        <span className="text-[11px] text-content-primary group-hover:text-white">{label}</span>
        <p className="text-[9px] text-content-faint">{description}</p>
      </div>
    </label>
  );
}

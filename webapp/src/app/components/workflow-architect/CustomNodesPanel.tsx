import { useEffect, useMemo, useState } from 'react';
import type { ComfyUIWorkflow } from '../../../types/comfyui';
import InstalledNodesPanel from '../InstalledNodesPanel';
import { CustomNodesBrowser } from './CustomNodesBrowser';

interface CustomNodesPanelProps {
  comfyuiUrl?: string;
  workflow?: Record<string, unknown>;
  initialTab?: 'installed' | 'browse';
  hideHeader?: boolean;
  hideTabs?: boolean;
}

function isGraphWorkflow(workflow: Record<string, unknown> | undefined): workflow is ComfyUIWorkflow {
  if (!workflow || typeof workflow !== 'object') return false;
  const typed = workflow as Record<string, unknown>;
  return Array.isArray(typed.nodes) && Array.isArray(typed.links);
}

export function CustomNodesPanel({
  comfyuiUrl,
  workflow,
  initialTab = 'installed',
  hideHeader = false,
  hideTabs = false,
}: CustomNodesPanelProps) {
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>(initialTab);

  const graphWorkflow = useMemo(
    () => (workflow && isGraphWorkflow(workflow) ? workflow : null),
    [workflow],
  );

  // Allow parent tabs to drive the default view while preserving existing internal behavior.
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full flex flex-col">
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-border-default">
          <h2 className="text-sm font-medium text-content-primary">Custom Nodes</h2>
        </div>
      )}

      {!hideTabs && (
        <div className="flex border-b border-border-default">
          <button
            type="button"
            onClick={() => setActiveTab('installed')}
            className={`flex-1 px-4 py-2 text-xs transition-colors ${
              activeTab === 'installed'
                ? 'text-accent-text border-b-2 border-accent bg-accent-muted'
                : 'text-content-faint hover:text-content-secondary'
            }`}
          >
            Installed
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`flex-1 px-4 py-2 text-xs transition-colors ${
              activeTab === 'browse'
                ? 'text-accent-text border-b-2 border-accent bg-accent-muted'
                : 'text-content-faint hover:text-content-secondary'
            }`}
          >
            Browse
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <div className={`h-full ${activeTab === 'installed' ? 'block' : 'hidden'}`}>
          <InstalledNodesPanel comfyuiUrl={comfyuiUrl} hideHeader />
        </div>
        <div className={`h-full ${activeTab === 'browse' ? 'block' : 'hidden'}`}>
          <CustomNodesBrowser
            isOpen
            onClose={() => {}}
            embedded
            hideHeader
            comfyuiUrl={comfyuiUrl}
            workflow={graphWorkflow}
          />
        </div>
      </div>
    </div>
  );
}

export default CustomNodesPanel;


import { Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Blocks,
  Library,
  MessageSquare,
  Download,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AppPreferences } from '../../types/comfyui';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ConnectionManager } from './workflow-architect/ConnectionManager';
import { PreferencesPanel } from './workflow-architect/PreferencesPanel';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { getComfyUIBaseUrl } from '../../services/api-config';
const CustomNodesPanel = lazy(() => import('./workflow-architect/CustomNodesPanel').then((mod) => ({ default: mod.CustomNodesPanel })));
const ModelBrowser = lazy(() => import('./workflow-architect/ModelBrowser').then((mod) => ({ default: mod.ModelBrowser })));
const ComfyUIWorkflowFolderPanel = lazy(() => import('./workflow-architect/ComfyUIWorkflowFolderPanel').then((mod) => ({ default: mod.ComfyUIWorkflowFolderPanel })));
const ImageGallery = lazy(() => import('./workflow-architect/ImageGallery').then((mod) => ({ default: mod.ImageGallery })));
const WorkflowRequirementsChecker = lazy(() => import('./workflow-requirements-checker'));

interface CommandCenterProps {
  children: ReactNode;
  currentWorkflow?: Record<string, unknown>;
  onLoadWorkflow?: (w: Record<string, unknown>, sourceLabel?: string) => void;
  onLoadGalleryWorkflow?: (w: Record<string, unknown>, sourceLabel?: string) => void;
  onLoadComfyUIWorkflow?: (path: string) => Promise<boolean> | boolean;
  onRerun?: (w: Record<string, unknown>) => void;
  openChatTabSignal?: number;
  comfyuiUrl?: string;
  onComfyUrlChange?: (url: string) => void;
  wsConnected?: boolean;
  wsQueueRunning?: number;
  wsQueuePending?: number;
  onWsReconnect?: () => void;
  managerAvailable?: boolean;
  preferences?: AppPreferences;
  onPreferencesChange?: (prefs: AppPreferences) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  sessionPromptIds?: Set<string>;
  onComfyUIWorkflowFoldersChange?: (folders: string[]) => void;
  onWorkflowSendToChat?: (workflowName: string) => void;
}

type ActivePanel =
  | 'chat'
  | 'library'
  | 'gallery'
  | 'nodes'
  | 'models'
  | 'settings';

type LegacyPanel = 'templates' | 'requirements' | 'customNodes';
type NodesSubTab = 'check' | 'installed' | 'browse';

interface NavItem {
  id: ActivePanel;
  label: string;
  icon: LucideIcon;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, shortcut: 'Ctrl+1' },
  { id: 'library', label: 'Library', icon: Library, shortcut: 'Ctrl+2' },
  { id: 'nodes', label: 'Nodes', icon: Blocks, shortcut: 'Ctrl+3' },
  { id: 'models', label: 'Models', icon: Download, shortcut: 'Ctrl+4' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'Ctrl+5' },
];

const PRIMARY_TABS: ActivePanel[] = ['chat', 'library'];
const WORKFLOW_TOOL_TABS: ActivePanel[] = ['nodes', 'models'];
const APP_TABS: ActivePanel[] = ['settings'];

export default function CommandCenter({
  children,
  currentWorkflow,
  onLoadWorkflow,
  onLoadGalleryWorkflow,
  onLoadComfyUIWorkflow,
  comfyuiUrl,
  openChatTabSignal = 0,
  onComfyUrlChange,
  wsConnected = false,
  wsQueueRunning = 0,
  wsQueuePending = 0,
  onWsReconnect,
  managerAvailable,
  preferences,
  onPreferencesChange,
  onUndo,
  onRedo,
  sessionPromptIds,
  onComfyUIWorkflowFoldersChange,
  onWorkflowSendToChat,
}: CommandCenterProps) {
  const [activeTab, setActiveTab] = useState<ActivePanel>('chat');
  const [nodesSubTab, setNodesSubTab] = useState<NodesSubTab>('check');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const [connectionExpanded, setConnectionExpanded] = useState(false);

  const openPanel = useCallback((panel: ActivePanel | LegacyPanel, options?: { nodesSubTab?: NodesSubTab }) => {
    if (panel === 'templates') {
      setActiveTab('library');
      return;
    }
    if (panel === 'requirements') {
      setNodesSubTab('check');
      setActiveTab('nodes');
      return;
    }
    if (panel === 'customNodes') {
      setNodesSubTab('browse');
      setActiveTab('nodes');
      return;
    }
    if (panel === 'library') {
      setActiveTab('library');
      return;
    }
    if (panel === 'nodes') {
      setNodesSubTab(options?.nodesSubTab ?? 'check');
      setActiveTab('nodes');
      return;
    }
    setActiveTab(panel);
  }, []);

  useEffect(() => {
    if (openChatTabSignal > 0) {
      openPanel('chat');
    }
  }, [openChatTabSignal, openPanel]);

  const shortcuts = useMemo(() => ({
    'ctrl+1': () => openPanel('chat'),
    'ctrl+2': () => openPanel('library'),
    'ctrl+3': () => openPanel('nodes'),
    'ctrl+4': () => openPanel('models'),
    'ctrl+5': () => openPanel('settings'),
    'ctrl+z': () => onUndo?.(),
    'ctrl+shift+z': () => onRedo?.(),
    'ctrl+y': () => onRedo?.(),
    'ctrl+b': () => setSidebarOpen((prev) => !prev),
  }), [onUndo, onRedo, openPanel]);
  useKeyboardShortcuts(shortcuts);

  const sidebarWidthClass = sidebarOpen ? 'w-56' : 'w-[52px]';
  const lazyTabFallback = (
    <div className="p-5 text-xs text-content-secondary">Loading panel...</div>
  );

  const navItemsByTab = useMemo(
    () => new Map(NAV_ITEMS.map((item) => [item.id, item])),
    [],
  );

  const renderNavButton = (item: NavItem) => {
    const isActive = item.id === activeTab;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => openPanel(item.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors ${
          isActive
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
      >
        <span><Icon className="h-4 w-4" /></span>
        {sidebarOpen && (
          <span className="flex-1 flex items-center justify-between">
            <span>{item.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
              {item.shortcut}
            </span>
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="h-screen w-full flex bg-background text-foreground">
      <aside className={`${sidebarWidthClass} shrink-0 flex flex-col bg-surface-200 border-r border-border transition-all duration-200`}>

        <nav className="flex-1 p-2 space-y-1">
          {PRIMARY_TABS.map((tab) => {
            const item = navItemsByTab.get(tab);
            return item ? renderNavButton(item) : null;
          })}
          <div className="my-1.5 mx-3 border-t border-border-default" />
          {WORKFLOW_TOOL_TABS.map((tab) => {
            const item = navItemsByTab.get(tab);
            return item ? renderNavButton(item) : null;
          })}
          <div className="my-1.5 mx-3 border-t border-border-default" />
          {APP_TABS.map((tab) => {
            const item = navItemsByTab.get(tab);
            return item ? renderNavButton(item) : null;
          })}

          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors text-sm"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </nav>

        <div className="border-t border-border-default">
          {sidebarOpen ? (
            <>
              <button
                type="button"
                onClick={() => setConnectionExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-secondary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-status-success' : 'bg-status-error'}`} />
                  <span className="text-xs text-content-secondary">{wsConnected ? 'Connected' : 'Disconnected'}</span>
                  {wsConnected && <span className="text-[10px] text-content-faint">WS</span>}
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-content-faint transition-transform ${connectionExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              {connectionExpanded && (
                <div className="px-2 pb-2">
                  <ConnectionManager
                    comfyuiUrl={comfyuiUrl || getComfyUIBaseUrl()}
                    onUrlChange={(url) => onComfyUrlChange?.(url)}
                    wsConnected={wsConnected}
                    wsQueueRunning={wsQueueRunning}
                    wsQueuePending={wsQueuePending}
                    onReconnect={() => onWsReconnect?.()}
                    managerAvailable={managerAvailable}
                    hideConnectionHeader
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-2">
              <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-status-success' : 'bg-status-error'}`} />
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-full overflow-y-auto bg-surface-100 border-l border-border">
        {activeTab === 'chat' && (
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        )}
        {activeTab === 'gallery' && (
          <ErrorBoundary>
            <Suspense fallback={lazyTabFallback}>
              <ImageGallery
                comfyuiUrl={comfyuiUrl || getComfyUIBaseUrl()}
                onLoadWorkflow={onLoadGalleryWorkflow || onLoadWorkflow}
                sessionPromptIds={sessionPromptIds}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        {activeTab === 'library' && (
          <ErrorBoundary>
            <Suspense fallback={lazyTabFallback}>
              <ComfyUIWorkflowFolderPanel
                comfyuiUrl={comfyuiUrl || getComfyUIBaseUrl()}
                onFoldersDiscovered={onComfyUIWorkflowFoldersChange}
                onLoadWorkflowPath={async (path) => {
                  if (!onLoadComfyUIWorkflow) {
                    toast.info('ComfyUI folder loading is not wired yet');
                    return false;
                  }
                  const ok = await onLoadComfyUIWorkflow(path);
                  if (ok) openPanel('chat');
                  return ok;
                }}
                onSendToChat={onWorkflowSendToChat ? (name) => {
                  openPanel('chat');
                  onWorkflowSendToChat(name);
                } : undefined}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        {activeTab === 'nodes' && (
          <ErrorBoundary>
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-border-default">
                <button
                  onClick={() => setNodesSubTab('check')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    nodesSubTab === 'check'
                      ? 'bg-accent-muted text-accent-text'
                      : 'text-content-muted hover:text-content-primary'
                  }`}
                >
                  Check
                </button>
                <button
                  onClick={() => setNodesSubTab('installed')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    nodesSubTab === 'installed'
                      ? 'bg-accent-muted text-accent-text'
                      : 'text-content-muted hover:text-content-primary'
                  }`}
                >
                  Installed
                </button>
                <button
                  onClick={() => setNodesSubTab('browse')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    nodesSubTab === 'browse'
                      ? 'bg-accent-muted text-accent-text'
                      : 'text-content-muted hover:text-content-primary'
                  }`}
                >
                  Browse
                </button>
              </div>
              <Suspense fallback={lazyTabFallback}>
                <div className={`flex-1 min-h-0 ${nodesSubTab === 'check' ? 'block' : 'hidden'}`}>
                  <WorkflowRequirementsChecker
                    currentWorkflow={currentWorkflow}
                    comfyuiUrl={comfyuiUrl}
                    managerAvailable={managerAvailable}
                  />
                </div>
                <div className={`flex-1 min-h-0 ${nodesSubTab !== 'check' ? 'block' : 'hidden'}`}>
                  <CustomNodesPanel
                    comfyuiUrl={comfyuiUrl}
                    workflow={currentWorkflow}
                    initialTab={nodesSubTab === 'browse' ? 'browse' : 'installed'}
                    hideHeader
                    hideTabs
                  />
                </div>
              </Suspense>
            </div>
          </ErrorBoundary>
        )}
        {activeTab === 'models' && (
          <ErrorBoundary>
            <Suspense fallback={lazyTabFallback}>
              <ModelBrowser comfyuiUrl={comfyuiUrl} />
            </Suspense>
          </ErrorBoundary>
        )}
        {activeTab === 'settings' && preferences && onPreferencesChange && (
          <ErrorBoundary>
            <PreferencesPanel
              preferences={preferences}
              onPreferencesChange={onPreferencesChange}
            />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}






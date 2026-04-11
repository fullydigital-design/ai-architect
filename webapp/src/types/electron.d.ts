export interface ElectronDefaultPaths {
  comfyui_root: string;
  python_exe: string;
  comfyui_api_url: string;
  models_dir: string;
}

export interface ComfyUIStartOptions {
  root: string;
  port: number;
  pythonExe: string;
  extraArgs?: string[];
}

export interface ElectronAPI {
  isElectron: true;
  getDefaultPaths: () => Promise<ElectronDefaultPaths>;
  startComfyUI: (opts: ComfyUIStartOptions) => Promise<{ ok?: boolean; pid?: number; error?: string }>;
  stopComfyUI: () => Promise<{ ok?: boolean; error?: string }>;
  isComfyUIRunning: () => Promise<boolean>;
  onComfyUILog: (callback: (data: { type: 'stdout' | 'stderr'; text: string }) => void) => () => void;
  onComfyUIExit: (callback: (data: { code: number | null }) => void) => () => void;
  readWorkflowFile: (relativePath: string) => Promise<{ content?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

'use strict';

const { app, BrowserWindow, ipcMain, session, globalShortcut, Menu } = require('electron');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Python detection ───────────────────────────────────────────────────────────
// Matches the strategy in LAUNCH_ComfyUI.bat: prefer Python 3.12 via the Windows
// `py` launcher, fall back to `py`, then to `python3.12` / `python3` / `python`.
// Cached after first successful detection.

let detectedPython = null;

function probePython(cmd, args) {
  try {
    const result = spawnSync(cmd, [...args, '--version'], {
      stdio: 'pipe',
      timeout: 3000,
      windowsHide: true,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function detectPythonCommand() {
  if (detectedPython) return detectedPython;
  const isWin = process.platform === 'win32';
  const candidates = isWin
    ? [
        { cmd: 'py', prefixArgs: ['-3.12'] },
        { cmd: 'py', prefixArgs: ['-3'] },
        { cmd: 'py', prefixArgs: [] },
        { cmd: 'python3.12', prefixArgs: [] },
        { cmd: 'python3', prefixArgs: [] },
        { cmd: 'python', prefixArgs: [] },
      ]
    : [
        { cmd: 'python3.12', prefixArgs: [] },
        { cmd: 'python3', prefixArgs: [] },
        { cmd: 'python', prefixArgs: [] },
      ];
  for (const candidate of candidates) {
    if (probePython(candidate.cmd, candidate.prefixArgs)) {
      detectedPython = candidate;
      return candidate;
    }
  }
  return { cmd: 'python', prefixArgs: [] }; // last-resort, may fail at spawn
}

// ── Config loading ─────────────────────────────────────────────────────────────

function loadPathConfig() {
  const candidates = [
    // When packaged: resources/ sits next to the app
    path.join(app.getAppPath(), '..', '..', 'comfyui-paths.config.json'),
    // Dev: project root (two levels up from webapp/electron/)
    path.join(__dirname, '..', '..', 'comfyui-paths.config.json'),
    path.join(process.cwd(), 'comfyui-paths.config.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch { /* ignore */ }
  }
  return {};
}

// ── State ──────────────────────────────────────────────────────────────────────

let mainWindow = null;
let comfyProcess = null;

// ── CORS fix ───────────────────────────────────────────────────────────────────
// ComfyUI requires Origin to match its own host.
// In Electron production the renderer loads from file:// so we inject the
// correct CORS headers on all responses from ComfyUI's IP:port.

function installCorsHook() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isComfyUI = /^https?:\/\/127\.0\.0\.1:\d+/.test(details.url) ||
                      /^https?:\/\/localhost:\d+/.test(details.url);
    if (isComfyUI) {
      const headers = { ...details.responseHeaders };
      headers['Access-Control-Allow-Origin'] = ['*'];
      headers['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
      headers['Access-Control-Allow-Headers'] = ['Content-Type, Authorization'];
      callback({ responseHeaders: headers });
    } else {
      callback({ responseHeaders: details.responseHeaders });
    }
  });

  // Also allow preflight OPTIONS through
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const isComfyUI = /^https?:\/\/127\.0\.0\.1:\d+/.test(details.url) ||
                      /^https?:\/\/localhost:\d+/.test(details.url);
    if (isComfyUI) {
      const headers = { ...details.requestHeaders };
      // Set Origin to match ComfyUI host so its own CORS check passes
      const url = new URL(details.url);
      headers['Origin'] = `${url.protocol}//${url.host}`;
      callback({ requestHeaders: headers });
    } else {
      callback({ requestHeaders: details.requestHeaders });
    }
  });
}

// ── Window ─────────────────────────────────────────────────────────────────────

function createWindow() {
  installCorsHook();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'AI Architect',
    icon: path.join(__dirname, 'icons', 'icon.ico'),
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // F12 / Ctrl+Shift+I — toggle DevTools in any mode
  globalShortcut.register('F12', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });
}

// ── IPC handlers ───────────────────────────────────────────────────────────────

ipcMain.handle('get-default-paths', () => {
  const cfg = loadPathConfig();
  return {
    comfyui_root:    cfg.comfyui_root    || '',
    python_exe:      cfg.python_exe      || '',
    comfyui_api_url: cfg.comfyui_api_url || 'http://127.0.0.1:8188',
    models_dir:      cfg.models_dir      || '',
  };
});

ipcMain.handle('detect-python', () => {
  const detected = detectPythonCommand();
  return {
    cmd: detected.cmd,
    prefixArgs: detected.prefixArgs,
    display: detected.prefixArgs.length > 0
      ? `${detected.cmd} ${detected.prefixArgs.join(' ')}`
      : detected.cmd,
  };
});

ipcMain.handle('start-comfyui', (_event, opts = {}) => {
  if (comfyProcess && !comfyProcess.killed) {
    return { error: 'ComfyUI is already running' };
  }

  const {
    root,
    port = 8188,
    pythonExe, // optional override; auto-detect when blank
    extraArgs = [],
  } = opts;

  if (!root) return { error: 'ComfyUI root path is required' };
  if (!fs.existsSync(path.join(root, 'main.py'))) {
    return { error: `main.py not found in: ${root}` };
  }

  // Decide which Python to spawn. If the caller passed an explicit override,
  // honor it. Otherwise auto-detect (py -3.12 preferred on Windows).
  let cmd;
  let prefixArgs;
  if (pythonExe && pythonExe.trim().length > 0) {
    cmd = pythonExe.trim();
    prefixArgs = [];
  } else {
    const detected = detectPythonCommand();
    cmd = detected.cmd;
    prefixArgs = detected.prefixArgs;
  }

  const args = [
    ...prefixArgs,
    'main.py',
    '--listen', '127.0.0.1',
    '--port', String(port),
    '--use-pytorch-cross-attention',
    '--highvram',
    '--cuda-malloc',
    '--fast',
    ...extraArgs,
  ];

  try {
    comfyProcess = spawn(cmd, args, {
      cwd: root,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True',
        CUDA_MODULE_LOADING: 'LAZY',
        HF_HUB_ENABLE_HF_TRANSFER: '1',
        TORCH_CUDNN_V8_API_ENABLED: '1',
      },
      windowsHide: true,
    });
  } catch (err) {
    return { error: `Failed to spawn process: ${err.message}` };
  }

  // Surface what was spawned so the UI/logs make the auto-detection visible.
  const launchedAs = prefixArgs.length > 0 ? `${cmd} ${prefixArgs.join(' ')}` : cmd;
  mainWindow?.webContents.send('comfyui-log', {
    type: 'stdout',
    text: `[Launcher] Using ${launchedAs} (cwd: ${root}, port: ${port})\n`,
  });

  comfyProcess.stdout.on('data', (data) => {
    mainWindow?.webContents.send('comfyui-log', { type: 'stdout', text: data.toString() });
  });

  comfyProcess.stderr.on('data', (data) => {
    mainWindow?.webContents.send('comfyui-log', { type: 'stderr', text: data.toString() });
  });

  comfyProcess.on('error', (err) => {
    mainWindow?.webContents.send('comfyui-log', {
      type: 'stderr',
      text: `[Process error] ${err.message}\n`,
    });
    mainWindow?.webContents.send('comfyui-exit', { code: -1 });
    comfyProcess = null;
  });

  comfyProcess.on('close', (code) => {
    mainWindow?.webContents.send('comfyui-exit', { code });
    comfyProcess = null;
  });

  return { ok: true, pid: comfyProcess.pid };
});

ipcMain.handle('stop-comfyui', () => {
  if (!comfyProcess || comfyProcess.killed) {
    return { error: 'No ComfyUI process running' };
  }
  comfyProcess.kill();
  comfyProcess = null;
  return { ok: true };
});

ipcMain.handle('is-comfyui-running', () => {
  return comfyProcess !== null && !comfyProcess.killed;
});

ipcMain.handle('read-workflow-file', (_event, relativePath) => {
  if (!relativePath || typeof relativePath !== 'string') {
    return { error: 'Invalid path' };
  }
  // Block traversal and non-JSON
  if (relativePath.includes('..') || !relativePath.toLowerCase().endsWith('.json')) {
    return { error: 'Access denied' };
  }
  const cfg = loadPathConfig();
  const comfyuiRoot = cfg.comfyui_root;
  if (!comfyuiRoot) {
    return { error: 'ComfyUI root not configured in comfyui-paths.config.json' };
  }
  const fullPath = path.join(comfyuiRoot, 'user', 'default', 'workflows', relativePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    return { content };
  } catch (err) {
    return { error: `File read failed: ${err.message}` };
  }
});

// ── App lifecycle ──────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (comfyProcess && !comfyProcess.killed) {
    comfyProcess.kill();
    comfyProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (comfyProcess && !comfyProcess.killed) {
    comfyProcess.kill();
    comfyProcess = null;
  }
});

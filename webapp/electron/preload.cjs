'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  getDefaultPaths: () =>
    ipcRenderer.invoke('get-default-paths'),

  startComfyUI: (opts) =>
    ipcRenderer.invoke('start-comfyui', opts),

  stopComfyUI: () =>
    ipcRenderer.invoke('stop-comfyui'),

  isComfyUIRunning: () =>
    ipcRenderer.invoke('is-comfyui-running'),

  onComfyUILog: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('comfyui-log', handler);
    return () => ipcRenderer.off('comfyui-log', handler);
  },

  onComfyUIExit: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('comfyui-exit', handler);
    return () => ipcRenderer.off('comfyui-exit', handler);
  },

  readWorkflowFile: (relativePath) =>
    ipcRenderer.invoke('read-workflow-file', relativePath),
});

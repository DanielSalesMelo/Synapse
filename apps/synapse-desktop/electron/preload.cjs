const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("synapse", {
  getAppVersion: () => ipcRenderer.invoke("synapse:get-app-version"),
  getConfig: () => ipcRenderer.invoke("synapse:get-config"),
  saveConfig: (config) => ipcRenderer.invoke("synapse:save-config", config),
  clearLink: () => ipcRenderer.invoke("synapse:clear-link"),
  getDeviceInfo: () => ipcRenderer.invoke("synapse:get-device-info"),
  getAiCapability: () => ipcRenderer.invoke("synapse:get-ai-capability"),
  startWorker: () => ipcRenderer.invoke("synapse:start-worker"),
  getWorkerStatus: () => ipcRenderer.invoke("synapse:get-worker-status"),
  setAutoLaunch: (enabled) => ipcRenderer.invoke("synapse:set-auto-launch", enabled),
  getAutoLaunch: () => ipcRenderer.invoke("synapse:get-auto-launch"),
  notify: (title, body) => ipcRenderer.invoke("synapse:notify", title, body),
  openExternal: (url) => ipcRenderer.invoke("synapse:open-external", url),
  windowMinimize: () => ipcRenderer.invoke("synapse:window-minimize"),
  windowToggleMaximize: () => ipcRenderer.invoke("synapse:window-toggle-maximize"),
  minimizeToTray: () => ipcRenderer.invoke("synapse:minimize-to-tray"),
  runAdminCommand: (command) => ipcRenderer.invoke("synapse:run-admin-command", command),
  downloadUpdate: (url, version) => ipcRenderer.invoke("synapse:download-update", url, version),
  quit: () => ipcRenderer.invoke("synapse:quit"),
  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("synapse:menu-action", handler);
    return () => ipcRenderer.removeListener("synapse:menu-action", handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on("synapse:update-progress", handler);
    return () => ipcRenderer.removeListener("synapse:update-progress", handler);
  },
});

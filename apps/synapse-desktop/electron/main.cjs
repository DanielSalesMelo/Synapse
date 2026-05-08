const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, Notification } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn, execFile } = require("node:child_process");

const APP_VERSION = "2.4.0";
const DEFAULT_SERVER = "https://synapse-backend-ds2026.azurewebsites.net";
const AGENT_DIR = process.env.SYNAPSE_AGENT_DIR || path.join(os.homedir(), ".synapse-agent");
const CONFIG_FILE = path.join(AGENT_DIR, "config.json");
const DESKTOP_CONFIG_FILE = path.join(AGENT_DIR, "desktop-config.json");

let mainWindow = null;
let tray = null;

const ensureAgentDir = () => fs.mkdirSync(AGENT_DIR, { recursive: true });

const readJson = (filePath, fallback = {}) => {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return { ...fallback, ...JSON.parse(fs.readFileSync(filePath, "utf-8")) };
  } catch {
    return fallback;
  }
};

const writeJson = (filePath, data) => {
  ensureAgentDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const defaultConfig = () => ({
  server_url: DEFAULT_SERVER,
  collect_interval: 60,
  send_interval: 300,
  agent_mode: "simple",
  allow_local_shell: false,
});

const readConfig = () => readJson(CONFIG_FILE, defaultConfig());

const saveConfig = (patch) => {
  const next = { ...readConfig(), ...patch };
  if (!next.server_url) next.server_url = DEFAULT_SERVER;
  next.allow_local_shell = Boolean(next.allow_local_shell && next.user_is_ti);
  writeJson(CONFIG_FILE, next);
  writeJson(DESKTOP_CONFIG_FILE, { desktopVersion: APP_VERSION, lastUpdatedAt: new Date().toISOString() });
  return next;
};

const getRendererUrl = () => {
  if (!app.isPackaged && process.env.SYNAPSE_DESKTOP_DEV_URL) {
    return process.env.SYNAPSE_DESKTOP_DEV_URL;
  }
  return `file://${path.join(__dirname, "..", "dist", "index.html")}`;
};

const getWorkerPath = () => {
  const packaged = path.join(process.resourcesPath || "", "worker", "synapse-agent.exe");
  if (app.isPackaged && fs.existsSync(packaged)) return packaged;
  return path.resolve(__dirname, "..", "..", "..", "packages", "services", "legacy-api", "agent", "synapse-agent.exe");
};

const hiddenExecOptions = { windowsHide: true };

const isWorkerRunning = () => new Promise((resolve) => {
  if (process.platform !== "win32") return resolve(false);
  execFile("tasklist", ["/FI", "IMAGENAME eq synapse-agent.exe"], hiddenExecOptions, (_error, stdout) => {
    resolve(String(stdout || "").toLowerCase().includes("synapse-agent.exe"));
  });
});

const startWorker = async () => {
  const config = readConfig();
  const workerPath = getWorkerPath();
  if (!config.token) return { started: false, reason: "not_paired" };
  if (!fs.existsSync(workerPath)) return { started: false, reason: "worker_not_found", path: workerPath };
  if (await isWorkerRunning()) return { started: false, reason: "already_running", path: workerPath };
  const child = spawn(workerPath, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    cwd: path.dirname(workerPath),
    env: {
      ...process.env,
      SYNAPSE_AGENT_DIR: AGENT_DIR,
      SYNAPSE_SERVER_URL: config.server_url || DEFAULT_SERVER,
      SYNAPSE_TOKEN: config.token || "",
    },
  });
  child.unref();
  return { started: true, path: workerPath };
};

const getDeviceInfo = () => {
  const interfaces = os.networkInterfaces();
  const iface = Object.values(interfaces).flat().find((item) => item && item.family === "IPv4" && !item.internal);
  const cpus = os.cpus();
  const hostname = os.hostname();
  const mac = iface?.mac && iface.mac !== "00:00:00:00:00:00" ? iface.mac : "";
  return {
    hostname,
    username: os.userInfo().username,
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    ip: iface?.address || "",
    mac,
    fingerprint: `${hostname}:${os.platform()}:${os.arch()}:${mac}:${cpus[0]?.model || ""}`,
    cpu: cpus[0]?.model || "CPU não identificada",
    memoryGb: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10,
    uptimeSeconds: Math.floor(os.uptime()),
  };
};

const sendMenuAction = (action) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("synapse:menu-action", action);
  }
};

const createMenu = () => {
  const template = [
    {
      label: "Arquivo",
      submenu: [
        { label: "Atualizar", accelerator: "F5", click: () => sendMenuAction("refresh") },
        { label: "Minimizar para bandeja", click: () => mainWindow?.hide() },
        { type: "separator" },
        { label: "Sair", click: () => app.quit() },
      ],
    },
    {
      label: "Atendimento",
      submenu: [
        { label: "Novo chamado", click: () => sendMenuAction("new-ticket") },
        { label: "Histórico de chamados", click: () => sendMenuAction("history") },
      ],
    },
    {
      label: "Ferramentas",
      submenu: [
        { label: "Copiar diagnóstico", click: () => sendMenuAction("copy-diagnostics") },
        { label: "Abrir painel web", click: () => shell.openExternal("https://synapse-seven-nu.vercel.app") },
      ],
    },
    {
      label: "Configurações",
      submenu: [
        { label: "Pareamento e servidor", click: () => sendMenuAction("settings") },
        { label: "Limpar vínculo antigo", click: () => sendMenuAction("clear-link") },
      ],
    },
    {
      label: "Ajuda",
      submenu: [
        { label: "Central Synapse", click: () => shell.openExternal("https://synapse-seven-nu.vercel.app/ajuda") },
        { label: `Sobre o Synapse ${APP_VERSION}`, click: () => sendMenuAction("about") },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const createTray = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect rx="16" width="64" height="64" fill="#0f172a"/><circle cx="22" cy="22" r="8" fill="#38bdf8"/><circle cx="42" cy="42" r="8" fill="#22c55e"/><path d="M28 24l12 12" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/></svg>`;
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Synapse para Windows");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir Synapse", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: "Novo chamado", click: () => sendMenuAction("new-ticket") },
    { label: "Atualizar", click: () => sendMenuAction("refresh") },
    { type: "separator" },
    { label: "Sair", click: () => app.quit() },
  ]));
  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    title: "Synapse para Windows",
    backgroundColor: "#0b1120",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  await mainWindow.loadURL(getRendererUrl());
};

ipcMain.handle("synapse:get-app-version", () => APP_VERSION);
ipcMain.handle("synapse:get-config", () => readConfig());
ipcMain.handle("synapse:save-config", (_event, patch) => saveConfig(patch || {}));
ipcMain.handle("synapse:clear-link", async () => {
  const config = readConfig();
  const cleared = saveConfig({
    ...config,
    token: "",
    device_id: undefined,
    empresa_id: undefined,
    user_name: "",
    user_email: "",
    user_role: "",
    user_is_ti: false,
    agent_mode: "simple",
    allow_local_shell: false,
  });
  if (process.platform === "win32") {
    execFile("taskkill", ["/F", "/IM", "synapse-agent.exe"], hiddenExecOptions, () => {});
  }
  return cleared;
});
ipcMain.handle("synapse:get-device-info", () => getDeviceInfo());
ipcMain.handle("synapse:start-worker", () => startWorker());
ipcMain.handle("synapse:get-worker-status", async () => ({ running: await isWorkerRunning() }));
ipcMain.handle("synapse:set-auto-launch", (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled), path: process.execPath });
  return app.getLoginItemSettings().openAtLogin;
});
ipcMain.handle("synapse:get-auto-launch", () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle("synapse:notify", (_event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title: String(title || "Synapse"), body: String(body || "") }).show();
    return true;
  }
  return false;
});
ipcMain.handle("synapse:open-external", (_event, url) => shell.openExternal(String(url)));
ipcMain.handle("synapse:minimize-to-tray", () => {
  mainWindow?.hide();
  return true;
});
ipcMain.handle("synapse:quit", () => {
  app.isQuitting = true;
  app.quit();
  return true;
});

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    ensureAgentDir();
    createMenu();
    createTray();
    await createWindow();
    await startWorker();
  });
}

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

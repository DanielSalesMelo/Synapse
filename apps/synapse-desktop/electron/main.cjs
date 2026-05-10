const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, Notification } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const https = require("node:https");
const http = require("node:http");
const { spawn, execFile } = require("node:child_process");

const APP_VERSION = "2.4.0";
const SYNAPSE_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_SERVER = "https://synapse-backend-ds2026.azurewebsites.net";
const AGENT_DIR = process.env.SYNAPSE_AGENT_DIR || path.join(os.homedir(), ".synapse-agent");
const CONFIG_FILE = path.join(AGENT_DIR, "config.json");
const DESKTOP_CONFIG_FILE = path.join(AGENT_DIR, "desktop-config.json");
const INSTALL_RESET_FILE = path.join(AGENT_DIR, "install-reset-2.4.0.json");
process.env.TZ = process.env.TZ || SYNAPSE_TIME_ZONE;

let mainWindow = null;
let tray = null;

const ensureAgentDir = () => fs.mkdirSync(AGENT_DIR, { recursive: true });

const archiveLegacyLocalState = () => {
  if (process.env.SYNAPSE_PRESERVE_AGENT_STATE === "1" || process.env.SYNAPSE_AGENT_DIR) return;
  if (fs.existsSync(INSTALL_RESET_FILE)) return;

  try {
    const hasLegacyState = fs.existsSync(CONFIG_FILE) || fs.existsSync(DESKTOP_CONFIG_FILE);
    if (hasLegacyState) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archiveRoot = path.join(os.homedir(), "AppData", "Local", "Synapse", "archive", `runtime-2.4.0-${stamp}`);
      fs.mkdirSync(archiveRoot, { recursive: true });
      fs.renameSync(AGENT_DIR, path.join(archiveRoot, ".synapse-agent"));
    }
  } catch (error) {
    console.warn("[synapse] Falha ao arquivar estado legado; seguindo com inicialização segura.", error);
  }

  ensureAgentDir();
  try {
    fs.writeFileSync(INSTALL_RESET_FILE, JSON.stringify({
      desktopVersion: APP_VERSION,
      timezone: SYNAPSE_TIME_ZONE,
      resetAt: new Date().toISOString(),
    }, null, 2), "utf-8");
  } catch (error) {
    console.warn("[synapse] Falha ao gravar marcador de reset local.", error);
  }
};

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
  Menu.setApplicationMenu(null);
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
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: "Synapse para Windows",
    backgroundColor: "#0b1120",
    autoHideMenuBar: true,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);
  if (typeof mainWindow.removeMenu === "function") {
    mainWindow.removeMenu();
  }
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
    user_id: undefined,
    user_name: "",
    user_email: "",
    user_role: "",
    user_is_ti: false,
    auth_session_active: false,
    last_login_at: undefined,
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
ipcMain.handle("synapse:window-minimize", () => {
  mainWindow?.minimize();
  return true;
});
ipcMain.handle("synapse:window-toggle-maximize", () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle("synapse:minimize-to-tray", () => {
  mainWindow?.hide();
  return true;
});
ipcMain.handle("synapse:quit", () => {
  app.isQuitting = true;
  app.quit();
  return true;
});

const downloadFile = (url, targetPath, redirects = 0) => new Promise((resolve, reject) => {
  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    reject(new Error("URL de atualização inválida."));
    return;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    reject(new Error("URL de atualização deve usar HTTP ou HTTPS."));
    return;
  }
  const client = parsed.protocol === "https:" ? https : http;
  const request = client.get(parsed, { headers: { "Cache-Control": "no-cache" } }, (response) => {
    const status = Number(response.statusCode || 0);
    const location = response.headers.location;
    if ([301, 302, 303, 307, 308].includes(status) && location && redirects < 5) {
      response.resume();
      const nextUrl = new URL(location, parsed).toString();
      downloadFile(nextUrl, targetPath, redirects + 1).then(resolve).catch(reject);
      return;
    }
    if (status < 200 || status >= 300) {
      response.resume();
      reject(new Error(`Falha ao baixar atualização: HTTP ${status}`));
      return;
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const file = fs.createWriteStream(targetPath);
    response.pipe(file);
    file.on("finish", () => file.close(() => resolve(targetPath)));
    file.on("error", reject);
  });
  request.on("error", reject);
});

ipcMain.handle("synapse:download-update", async (_event, url, version) => {
  const safeVersion = String(version || APP_VERSION).replace(/[^0-9A-Za-z._-]/g, "");
  const targetPath = path.join(app.getPath("temp"), `SynapseSetup-${safeVersion || APP_VERSION}.exe`);
  await downloadFile(url, targetPath);
  const openError = await shell.openPath(targetPath);
  if (openError) throw new Error(openError);
  return { path: targetPath };
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

  app.on("browser-window-created", (_event, window) => {
    window.setAutoHideMenuBar(true);
    window.setMenuBarVisibility(false);
    window.setMenu(null);
    if (typeof window.removeMenu === "function") {
      window.removeMenu();
    }
  });

  app.whenReady().then(async () => {
    archiveLegacyLocalState();
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

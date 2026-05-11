import { webcrypto } from "crypto";
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = webcrypto;
}

const SYNAPSE_TIME_ZONE = "America/Sao_Paulo";
process.env.TZ = process.env.TZ || SYNAPSE_TIME_ZONE;

import express, { type NextFunction, type Request, type Response } from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import axios from "axios";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { runInlineMigrations } from "./inline_migrations";
import { getRawClient } from "./db";
import { sdk } from "./_core/sdk";
import bcrypt from "bcryptjs";

const ALLOWED_ORIGINS = [
  "https://synapse-seven-nu.vercel.app",
  "https://synapse-v8.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const ANY_VERCEL_REGEX = /^https:\/\/.*\.vercel\.app$/;

const SERVICE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SERVICE_ROOT, "..", "..", "..");

const resolveFirstExistingDir = (candidates: string[], fallback: string) => {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return fallback;
};

const AGENT_DIR = resolveFirstExistingDir(
  [
    path.join(SERVICE_ROOT, "agent"),
    path.join(process.cwd(), "agent"),
    path.join(REPO_ROOT, "agent"),
  ],
  path.join(SERVICE_ROOT, "agent")
);

const UPLOADS_DIR = resolveFirstExistingDir(
  [
    path.join(SERVICE_ROOT, "uploads"),
    path.join(process.cwd(), "uploads"),
    path.join(REPO_ROOT, "uploads"),
  ],
  path.join(SERVICE_ROOT, "uploads")
);

const readAgentVersion = () => {
  try {
    const desktopVersionPath = path.join(AGENT_DIR, "synapse-desktop-version.json");
    if (fs.existsSync(desktopVersionPath)) {
      const metadata = JSON.parse(fs.readFileSync(desktopVersionPath, "utf-8")) as { version?: string };
      if (metadata.version) return metadata.version;
    }

    const agentScriptPath = path.join(AGENT_DIR, "synapse_agent.py");
    if (!fs.existsSync(agentScriptPath)) return "unknown";
    const source = fs.readFileSync(agentScriptPath, "utf-8");
    const match = source.match(/^\s*VERSION\s*=\s*["']([^"']+)["']/m);
    return match?.[1] || "unknown";
  } catch {
    return "unknown";
  }
};

const AGENT_VERSION = readAgentVersion();
const DESKTOP_INSTALLER_FILENAME = `SynapseSetup-${AGENT_VERSION}.exe`;
const DESKTOP_INSTALLER_PATH = path.join(AGENT_DIR, "electron-dist", DESKTOP_INSTALLER_FILENAME);
const AGENT_MINIMUM_VERSION = "2.4.0";
const DESKTOP_RELEASE_NOTES = [
  "Login obrigatório no agente para separar usuário comum, TI/Admin e master_admin.",
  "Instalação limpa com /CLEAN=1 para testes sem reaproveitar sessão, token ou pareamento antigo.",
  "Menu nativo do Electron removido e navegação oficial concentrada na UI React.",
  "Ações de agente com arquivamento, remoção operacional e trilha de auditoria.",
  "Monitoramento 24x7 para servidores e máquinas críticas, com comparação de rede local.",
  "UX compacta, responsiva e horários exibidos em America/Sao_Paulo.",
];

const getFileSha256 = (filePath: string): string | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
  } catch {
    return null;
  }
};

const getDesktopInstallerMetadata = () => {
  try {
    const stat = fs.existsSync(DESKTOP_INSTALLER_PATH) ? fs.statSync(DESKTOP_INSTALLER_PATH) : null;
    return {
      sha256: getFileSha256(DESKTOP_INSTALLER_PATH),
      sizeBytes: stat?.size ?? null,
      releaseDate: (stat?.mtime ?? new Date()).toISOString(),
    };
  } catch {
    return {
      sha256: null,
      sizeBytes: null,
      releaseDate: new Date().toISOString(),
    };
  }
};

console.log(`[BOOT] AGENT_DIR=${AGENT_DIR}`);
console.log(`[BOOT] UPLOADS_DIR=${UPLOADS_DIR}`);
console.log(`[BOOT] AGENT_VERSION=${AGENT_VERSION}`);

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const allowedUploadMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedUploadMimeTypes.has(file.mimetype)) {
      return cb(new Error("Tipo de arquivo não permitido"));
    }
    cb(null, true);
  },
});

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (process.env.ALLOW_ANY_VERCEL_ORIGIN === "true" && ANY_VERCEL_REGEX.test(origin)) return true;
  if (origin.startsWith("http://localhost")) return true;
  return false;
};

const app = express();
const port = Number(process.env.PORT) || 8080;

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Bloqueado: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Access-Control-Allow-Origin"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.options("*", cors());
app.use(express.json({ limit: "25mb" }));

const getBaseUrl = (req: Request) => `${req.protocol}://${req.get("host")}`;

const FRONTEND_URL = process.env.FRONTEND_URL || "https://synapse-seven-nu.vercel.app";

const getAuth0Config = () => ({
  domain: String(process.env.AUTH0_DOMAIN || "").trim(),
  clientId: String(process.env.AUTH0_CLIENT_ID || "").trim(),
  clientSecret: String(process.env.AUTH0_CLIENT_SECRET || "").trim(),
  connGoogle: String(process.env.AUTH0_CONNECTION_GOOGLE || "google-oauth2").trim(),
  connMicrosoft: String(process.env.AUTH0_CONNECTION_MICROSOFT || "windowslive").trim(),
  connApple: String(process.env.AUTH0_CONNECTION_APPLE || "apple").trim(),
});

const buildAuth0RedirectUri = (req: Request) => {
  const fixed = String(process.env.AUTH0_REDIRECT_URI || "").trim();
  if (fixed) return fixed;
  const origin = getBaseUrl(req);
  return `${origin}/api/auth/auth0/callback`;
};

const isAuth0Configured = () => {
  const cfg = getAuth0Config();
  return Boolean(cfg.domain && cfg.clientId && cfg.clientSecret);
};

app.get("/api/auth/providers", (_req, res) => {
  res.json({
    google: isAuth0Configured(),
    microsoft: isAuth0Configured(),
    apple: isAuth0Configured(),
    auth0: isAuth0Configured(),
  });
});

app.get("/api/auth/auth0/start", (req, res) => {
  if (!isAuth0Configured()) {
    return res.status(503).json({ error: "AUTH0_NOT_CONFIGURED" });
  }
  const cfg = getAuth0Config();

  const providerParam = String(req.query.provider || "google").toLowerCase();
  const providerToConnection: Record<string, string> = {
    google: cfg.connGoogle,
    microsoft: cfg.connMicrosoft,
    apple: cfg.connApple,
  };
  const provider = Object.prototype.hasOwnProperty.call(providerToConnection, providerParam)
    ? providerParam
    : "google";
  const connection = providerToConnection[provider] || cfg.connGoogle;
  const loginHintRaw = String(req.query.login_hint || "").trim();
  const loginHint = loginHintRaw.length > 0 ? loginHintRaw.slice(0, 254) : "";
  const forceAccountSelection = String(req.query.force_account || "").trim() === "1";

  const state = `${provider}__${crypto.randomBytes(24).toString("hex")}`;
  res.cookie("synapse-auth0-provider", provider, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  res.cookie("synapse-auth0-state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });

  const authorizeUrl = new URL(`https://${cfg.domain}/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", cfg.clientId);
  authorizeUrl.searchParams.set("redirect_uri", buildAuth0RedirectUri(req));
  authorizeUrl.searchParams.set("scope", "openid profile email");
  authorizeUrl.searchParams.set("connection", connection);
  authorizeUrl.searchParams.set("state", state);
  if (provider === "microsoft") {
    // Evita auto-login em conta errada e força escolha/autenticação da conta.
    authorizeUrl.searchParams.set("prompt", "select_account");
    authorizeUrl.searchParams.set("max_age", "0");
    authorizeUrl.searchParams.set("domain_hint", "consumers");
    if (loginHint) authorizeUrl.searchParams.set("login_hint", loginHint);
  } else if (provider === "google") {
    authorizeUrl.searchParams.set("prompt", "select_account");
    authorizeUrl.searchParams.set("max_age", "0");
  }
  if (forceAccountSelection) {
    authorizeUrl.searchParams.set("prompt", "select_account");
  }
  res.redirect(authorizeUrl.toString());
});

app.get("/api/auth/auth0/callback", async (req, res) => {
  const cookieHeader = String(req.headers.cookie || "");
  const stateFromQueryRaw = String(req.query.state || "");
  const providerFromState = stateFromQueryRaw.includes("__")
    ? stateFromQueryRaw.split("__")[0]
    : "";
  const providerMatch = cookieHeader.match(/(?:^|;\s*)synapse-auth0-provider=([^;]+)/);
  const provider = String(
    providerFromState || (providerMatch ? decodeURIComponent(providerMatch[1]) : "google")
  ).toLowerCase();
  const socialErrorRedirect = (code: string) =>
    `${FRONTEND_URL}/login?social_error=${encodeURIComponent(code)}&social_provider=${encodeURIComponent(provider)}`;

  if (!isAuth0Configured()) {
    return res.redirect(socialErrorRedirect("config"));
  }
  const cfg = getAuth0Config();

  const code = String(req.query.code || "");
  const state = stateFromQueryRaw;
  const savedStateMatch = cookieHeader.match(/(?:^|;\s*)synapse-auth0-state=([^;]+)/);
  const savedState = savedStateMatch ? decodeURIComponent(savedStateMatch[1]) : "";

  if (!code || !state || !savedState || state !== savedState) {
    return res.redirect(socialErrorRedirect("state"));
  }

  try {
    const tokenResp = await axios.post(
      `https://${cfg.domain}/oauth/token`,
      {
        grant_type: "authorization_code",
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: buildAuth0RedirectUri(req),
      },
      { timeout: 10000 }
    );

    const accessToken = tokenResp.data?.access_token as string | undefined;
    if (!accessToken) {
      return res.redirect(socialErrorRedirect("token"));
    }

    const userInfoResp = await axios.get(`https://${cfg.domain}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });

    const profile = userInfoResp.data || {};
    const email = String(profile.email || "").trim().toLowerCase();
    const sub = String(profile.sub || "");
    const name = String(profile.name || profile.nickname || email || "Usuário");

    if (!email || !sub) {
      return res.redirect(socialErrorRedirect("profile"));
    }

    const client = await getRawClient();
    if (!client) return res.redirect(socialErrorRedirect("db"));

    const existingByEmail = await client`
      SELECT id, "openId", email, role, status, "empresaId", password
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    let user = existingByEmail[0];
    const openId = `auth0_${sub}`.slice(0, 64);

    const loginMethod = provider === "microsoft" ? "microsoft" : provider === "apple" ? "apple" : "google";

    if (!user) {
      const inserted = await client`
        INSERT INTO users ("openId", name, email, "loginMethod", role, status, "empresaId", "createdAt", "updatedAt", "lastSignedIn")
        VALUES (${openId}, ${name}, ${email}, ${loginMethod}, 'user', 'approved', NULL, NOW(), NOW(), NOW())
        RETURNING id, "openId", email, role, status, "empresaId", password
      `;
      user = inserted[0];
    } else {
      await client`
        UPDATE users
        SET "openId"=${openId},
            name=${name},
            "loginMethod"=${loginMethod},
            "lastSignedIn"=NOW(),
            "updatedAt"=NOW()
        WHERE id=${user.id}
      `;
    }

    if (user?.status === "pending") {
      return res.redirect(socialErrorRedirect("pending"));
    }

    const appToken = await sdk.signSession(
      {
        openId,
        appId: process.env.VITE_APP_ID || "synapse",
        name,
      },
      { expiresInMs: 1000 * 60 * 60 * 24 * 7 }
    );

    res.cookie("synapse-auth0-state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });
    res.cookie("synapse-auth0-provider", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });

    return res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(appToken)}`
    );
  } catch (error) {
    console.error("[Auth0 Callback] Falha:", error);
    return res.redirect(socialErrorRedirect("callback"));
  }
});

const requireUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    (req as any).user = await sdk.authenticateRequest(req);
    next();
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED" });
  }
};

const requireAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "TOKEN_REQUIRED" });
    }

    const client = await getRawClient();
    if (!client) {
      return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
    }

    const rows = await client`
      SELECT a.id, a."empresaId", a.hostname, a.token, a.user_id, a.department_id,
        a.status, a.online, a."ultimoContato",
        u.name as user_name, u.email as user_email, u.role as user_role
      FROM monitor_agentes a
      LEFT JOIN users u ON u.id::text = a.user_id::text
      WHERE a.token=${token}
        AND a."deletedAt" IS NULL
        AND COALESCE(a.ativo, true) = true
      LIMIT 1
    `.catch((error) => {
      console.warn("[Agent Auth] Falha ao validar token:", error?.message || error);
      return [];
    });
    const agent = rows[0];
    if (!agent) {
      return res.status(401).json({ error: "TOKEN_INVALIDO" });
    }

    (req as any).agent = agent;
    next();
  } catch {
    res.status(401).json({ error: "TOKEN_INVALIDO" });
  }
};

const TI_MANAGER_ROLES = new Set([
  "master_admin",
  "admin",
  "admin_empresa",
  "administrador",
  "ti",
  "ti_master",
  "supervisor_geral",
  "supervisor_ti",
]);

const canManageTiRole = (role: unknown) => TI_MANAGER_ROLES.has(String(role || "").toLowerCase());

const ensureAgentPolicyColumns = async (client: any) => {
  await client`ALTER TABLE monitor_agentes ADD COLUMN IF NOT EXISTS "isCritical24x7" boolean DEFAULT false`.catch(() => {});
  await client`ALTER TABLE monitor_agentes ADD COLUMN IF NOT EXISTS "notifyOnOffline" boolean DEFAULT false`.catch(() => {});
  await client`ALTER TABLE monitor_agentes ADD COLUMN IF NOT EXISTS "notifyOnNetworkLoss" boolean DEFAULT false`.catch(() => {});
  await client`ALTER TABLE monitor_agentes ADD COLUMN IF NOT EXISTS "offlineGraceMinutes" integer DEFAULT 10`.catch(() => {});
  await client`ALTER TABLE monitor_agentes ADD COLUMN IF NOT EXISTS "monitoringNotes" text`.catch(() => {});
  await client`ALTER TABLE monitor_agentes ADD COLUMN IF NOT EXISTS "lastPolicyUpdateAt" timestamp`.catch(() => {});
};

const getRequestIp = (req: Request) =>
  String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim() || req.socket?.remoteAddress || null;

async function writeAuditTrail(
  client: any,
  req: Request,
  params: {
    empresaId?: number | null;
    userId?: number | null;
    userName?: string | null;
    userRole?: string | null;
    action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "LOGIN" | "LOGOUT";
    eventType?: "login" | "logout" | "create" | "update" | "delete" | "restore" | "config_change" | "access_denied";
    module: string;
    tableName: string;
    recordId?: number | null;
    description: string;
    before?: unknown;
    after?: unknown;
    risk?: "baixo" | "medio" | "alto" | "critico";
  },
) {
  if (!client || !params.userId) return;
  const auditContext = {
    timezone: SYNAPSE_TIME_ZONE,
    occurredAt: new Date().toISOString(),
  };
  const before = params.before ? JSON.stringify({ ...auditContext, data: params.before }) : null;
  const after = params.after ? JSON.stringify({ ...auditContext, data: params.after }) : null;
  const recordId = Number(params.recordId || 0);
  const ip = getRequestIp(req);
  const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]) : null;
  const userName = params.userName || "Synapse";
  const userRole = params.userRole || null;

  await client`
    INSERT INTO audit_log ("empresaId","userId","userName",acao,tabela,"registroId","dadosAntes","dadosDepois",ip,"userAgent","createdAt")
    VALUES (${params.empresaId ?? null},${Number(params.userId)},${userName},${params.action},${params.tableName},${recordId},${before},${after},${ip},${userAgent},NOW())
  `.catch(() => {});

  await client`
    INSERT INTO auditoria_detalhada (
      "empresaId","userId","userName","userRole","tipoEvento",modulo,tabela,"registroId",
      descricao,"dadosAntes","dadosDepois",ip,"userAgent",risco,"createdAt"
    )
    VALUES (
      ${params.empresaId ?? null},${Number(params.userId)},${userName},${userRole},
      ${params.eventType || (params.action === "DELETE" ? "delete" : params.action === "CREATE" ? "create" : "update")},
      ${params.module},${params.tableName},${recordId || null},
      ${params.description},${before},${after},${ip},${userAgent},${params.risk || "baixo"},NOW()
    )
  `.catch(() => {});
}

const requireAgentTi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAgent(req, res, async () => {
      const agent = (req as any).agent;
      if (!agent?.user_id) {
        return res.status(403).json({ error: "AGENT_TI_LOGIN_REQUIRED" });
      }

      const client = await getRawClient();
      if (!client) {
        return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
      }

      const users = await client`
        SELECT id, role, "empresaId", name, email
        FROM users
        WHERE id = ${Number(agent.user_id)}
        LIMIT 1
      `.catch(() => []);
      const user = users[0];
      if (!user || !canManageTiRole(user.role)) {
        return res.status(403).json({ error: "AGENT_TI_FORBIDDEN" });
      }

      (req as any).agentUser = user;
      next();
    });
  } catch {
    res.status(403).json({ error: "AGENT_TI_FORBIDDEN" });
  }
};

const mapLegacyMetric = (payload: any) => {
  const firstDefinedNumber = (...values: any[]) => {
    for (const value of values) {
      if (value === undefined || value === null || value === "") continue;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
    return null;
  };
  const disks = Array.isArray(payload.disks)
    ? payload.disks
    : Array.isArray(payload.discos)
      ? payload.discos
      : [];
  const diskTotalFromArray = disks.reduce((sum: number, disk: any) => sum + Number(disk.total_gb || disk.totalGb || 0), 0);
  const diskUsedFromArray = disks.reduce((sum: number, disk: any) => sum + Number(disk.used_gb || disk.usado_gb || disk.usedGb || 0), 0);
  const tempGroups = payload.temperatures ? Object.values(payload.temperatures) : [];
  const firstTempGroup = Array.isArray(tempGroups[0]) ? (tempGroups[0] as any[]) : [];
  const firstTemp = firstTempGroup[0]?.current ?? null;
  const topProcesses = Array.isArray(payload.top_processes)
    ? payload.top_processes
    : Array.isArray(payload.top_processos)
      ? payload.top_processos
      : Array.isArray(payload.topProcessos)
        ? payload.topProcessos
        : Array.isArray(payload.processes)
          ? payload.processes
          : [];

  const diskTotal = diskTotalFromArray || Number(payload.disk_total_gb || payload.disco_total_gb || 0);
  const diskUsed = diskUsedFromArray || Number(payload.disk_used_gb || payload.disco_usado_gb || 0);
  const cpuUso = payload.cpu?.percent ?? payload.cpu_percent ?? payload.cpu_uso ?? null;
  const cpuFreqMhz = payload.cpu?.freq_mhz ?? payload.cpu_freq_mhz ?? payload.cpu_freq ?? payload.cpu_freq_mhz ?? null;
  const ramTotalMb = payload.ram?.total_gb
    ? Math.round(Number(payload.ram.total_gb) * 1024)
    : payload.memory_total_mb ?? payload.ram_total_mb ?? null;
  const ramUsadaMb = payload.ram?.used_gb
    ? Math.round(Number(payload.ram.used_gb) * 1024)
    : payload.memory_used_mb ?? payload.ram_usada_mb ?? null;
  const ramUsoPct = payload.ram?.percent ?? payload.memory_percent ?? payload.ram_uso_pct ?? null;
  const redeEnviadoKb = firstDefinedNumber(
    payload.network?.bytes_sent_mb != null ? Number(payload.network.bytes_sent_mb) * 1024 : null,
    payload.network?.sent_kb,
    payload.network?.upload_kb,
    payload.bytes_sent_kb,
    payload.rede_enviado_kb,
    payload.upload_kb,
  );
  const redeRecebidoKb = firstDefinedNumber(
    payload.network?.bytes_recv_mb != null ? Number(payload.network.bytes_recv_mb) * 1024 : null,
    payload.network?.recv_kb,
    payload.network?.download_kb,
    payload.bytes_recv_kb,
    payload.rede_recebido_kb,
    payload.download_kb,
  );
  const latenciaMs = firstDefinedNumber(payload.network?.latency_ms, payload.network_latency_ms, payload.latencia_ms);
  const usuarioLogado = payload.logged_user ?? payload.user_name ?? payload.usuario_logado ?? null;
  const uptime = payload.uptime_hours
    ? Math.round(Number(payload.uptime_hours) * 3600)
    : payload.uptime ?? null;
  const hardware = payload.hardware || payload.inventario || {};
  const motherboard = hardware.motherboard || payload.motherboard || {};
  const bios = hardware.bios || payload.bios || {};
  const gpus = Array.isArray(hardware.gpus) ? hardware.gpus : Array.isArray(payload.gpus) ? payload.gpus : [];
  const sensors = Array.isArray(payload.sensors) ? payload.sensors : Array.isArray(hardware.sensors) ? hardware.sensors : [];
  const memorySlots = Array.isArray(hardware.memory_slots) ? hardware.memory_slots : Array.isArray(payload.memory_slots) ? payload.memory_slots : [];
  const interfacesRede = Array.isArray(payload.interfaces_rede)
    ? payload.interfaces_rede
    : Array.isArray(payload.network_interfaces)
      ? payload.network_interfaces
      : [];
  const primaryIp = payload.ip
    || payload.ip_local
    || interfacesRede.find((iface: any) => iface?.ip && !String(iface.ip).startsWith("127."))?.ip
    || null;
  const serialNumber = hardware.serial_number
    || hardware.asset_tag
    || motherboard.serial
    || payload.serial_number
    || payload.asset_tag
    || null;

  const collectedAtSource = payload.timestamp || payload.coletado_em;
  const coletadoEm = collectedAtSource
    ? new Date(collectedAtSource).toISOString()
    : new Date().toISOString();

  return {
    coletadoEm,
    cpuUso,
    cpuTemp: firstTemp ?? payload.cpu_temp ?? null,
    cpuFreqMhz,
    ramTotalMb,
    ramUsadaMb,
    ramUsoPct,
    discoTotalGb: diskTotal || null,
    discoUsadoGb: diskUsed || null,
    discoUsoPct: payload.disk_percent ?? payload.disco_uso_pct ?? (diskTotal > 0 ? Number(((diskUsed / diskTotal) * 100).toFixed(2)) : null),
    redeEnviadoKb,
    redeRecebidoKb,
    latenciaMs,
    processos: payload.processos ?? (topProcesses.length || null),
    anydeskId: payload.anydesk_id ?? payload.anydeskId ?? null,
    usuarioLogado,
    uptime,
    topProcessos: topProcesses.length ? JSON.stringify(topProcesses) : null,
    placaMaeModelo: motherboard.model || motherboard.modelo || payload.placa_mae_modelo || null,
    placaMaeFabricante: motherboard.vendor || motherboard.fabricante || payload.placa_mae_fabricante || null,
    socketCpu: hardware.cpu_socket || payload.socket_cpu || null,
    biosVersao: bios.version || payload.bios_versao || null,
    gpus: gpus.length ? JSON.stringify(gpus) : null,
    sensores: sensors.length ? JSON.stringify(sensors) : null,
    memoriaSlots: memorySlots.length ? JSON.stringify(memorySlots) : null,
    cpuModel: hardware.cpu_model || payload.cpu_model || null,
    gpuModel: gpus[0]?.name || gpus[0]?.model || payload.gpu_model || null,
    discos: disks.length ? JSON.stringify(disks) : null,
    interfacesRede: interfacesRede.length ? JSON.stringify(interfacesRede) : null,
    ipLocal: primaryIp,
    so: payload.so || payload.os || null,
    serialNumber,
    assetTag: payload.asset_tag || hardware.asset_tag || serialNumber,
    agentVersion: payload.agent_version || payload.versao_agente || payload.version || null,
  };
};

async function resolveEmpresaIdForUser(
  client: any,
  user: any,
  requestedEmpresaId?: number | null
): Promise<number> {
  const requested = Number(requestedEmpresaId || 0);
  const userEmpresa = Number(user?.empresaId || 0);
  const activeCompany = Number(user?.activeCompanyId || 0);

  if (requested > 0) {
    // Master pode escolher qualquer empresa existente.
    if (user?.role === "master_admin") return requested;
    // Demais perfis só podem operar na própria empresa.
    if (userEmpresa > 0 && userEmpresa === requested) return requested;
  }

  if (activeCompany > 0) return activeCompany;
  if (userEmpresa > 0) return userEmpresa;

  // Fallback apenas para master sem empresa fixa no token.
  if (user?.role === "master_admin") {
    const empresas = await client`
      SELECT id
      FROM empresas
      WHERE "deletedAt" IS NULL
      ORDER BY id ASC
      LIMIT 1
    `.catch(() => []);
    const firstId = Number(empresas?.[0]?.id || 0);
    if (firstId > 0) return firstId;
  }

  return 0;
}

async function storeOmnichannelInbound(input: {
  empresaId: number;
  provider: "whatsapp" | "telegram" | "instagram";
  externalId: string;
  displayName?: string | null;
  phone?: string | null;
  username?: string | null;
  content?: string | null;
  externalMessageId?: string | null;
  messageType?: string | null;
  mediaUrl?: string | null;
  payload?: any;
}) {
  const client = await getRawClient();
  if (!client) throw new Error("DATABASE_UNAVAILABLE");

  const convRows = await client`
    INSERT INTO omnichannel_conversations
      ("empresaId", provider, "externalId", "displayName", phone, username, metadata, "lastMessageAt", "updatedAt")
    VALUES
      (${input.empresaId}, ${input.provider}, ${input.externalId}, ${input.displayName ?? null}, ${input.phone ?? null}, ${input.username ?? null}, ${JSON.stringify(input.payload ?? {})}::jsonb, NOW(), NOW())
    ON CONFLICT ("empresaId", provider, "externalId")
    DO UPDATE SET
      "displayName" = COALESCE(EXCLUDED."displayName", omnichannel_conversations."displayName"),
      phone = COALESCE(EXCLUDED.phone, omnichannel_conversations.phone),
      username = COALESCE(EXCLUDED.username, omnichannel_conversations.username),
      metadata = COALESCE(EXCLUDED.metadata, omnichannel_conversations.metadata),
      "lastMessageAt" = NOW(),
      "updatedAt" = NOW()
    RETURNING *
  `;
  const conversation = convRows[0];
  if (!conversation) throw new Error("CONVERSATION_UPSERT_FAILED");

  await client`
    INSERT INTO omnichannel_messages
      ("conversationId", provider, direction, "externalMessageId", "senderName", content, "messageType", "mediaUrl", status, payload)
    VALUES
      (${conversation.id}, ${input.provider}, 'in', ${input.externalMessageId ?? null}, ${input.displayName ?? null}, ${input.content ?? null}, ${input.messageType ?? "text"}, ${input.mediaUrl ?? null}, 'recebida', ${JSON.stringify(input.payload ?? {})}::jsonb)
  `;

  return conversation;
}

app.post("/api/upload", requireUser, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Arquivo não enviado" });
  }

  return res.json({
    url: `${getBaseUrl(req)}/uploads/${req.file.filename}`,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

app.get("/api/agents", requireUser, async (req, res) => {
  const user = (req as any).user;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const requestedEmpresaId = Number(req.query?.empresaId || 0);
  const empresaId = await resolveEmpresaIdForUser(client, user, requestedEmpresaId);
  if (!empresaId) return res.status(400).json({ error: "EMPRESA_REQUIRED" });
  if (user.role !== "master_admin" && user.empresaId && Number(user.empresaId) !== empresaId) {
    return res.status(403).json({ error: "FORBIDDEN_COMPANY" });
  }

  const fullRows = await client`
    SELECT a.*,
      (SELECT "coletadoEm" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as ultima_coleta,
      (SELECT "cpuUso" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as cpu_atual,
      (SELECT "ramUsoPct" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as ram_atual,
      (SELECT "discoUsoPct" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as disco_atual,
      (SELECT "anydeskId" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as anydesk_id_atual,
      (SELECT "placaMaeModelo" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as placa_mae_modelo,
      (SELECT "placaMaeFabricante" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as placa_mae_fabricante,
      (SELECT "socketCpu" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as socket_cpu,
      (SELECT "biosVersao" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as bios_versao,
      (SELECT gpus FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as gpus,
      (SELECT sensores FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as sensores,
      (SELECT "memoriaSlots" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as memoria_slots
    FROM monitor_agentes a
    WHERE a."empresaId"=${empresaId} AND a."deletedAt" IS NULL
    ORDER BY a.hostname ASC
  `.catch(() => []);
  if (fullRows.length > 0) {
    return res.json(fullRows);
  }
  const fallbackRows = await client`
    SELECT a.*
    FROM monitor_agentes a
    WHERE a."empresaId"=${empresaId} AND a."deletedAt" IS NULL
    ORDER BY a.hostname ASC
  `.catch(() => []);
  return res.json(fallbackRows);
});

app.put("/api/agents/:id/associate", requireUser, async (req, res) => {
  const user = (req as any).user;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const agentId = Number(req.params.id);
  const { userId, departmentId } = req.body ?? {};
  const requestedEmpresaId = Number(req.body?.empresaId || req.query?.empresaId || 0);
  const empresaId = await resolveEmpresaIdForUser(client, user, requestedEmpresaId);
  if (!empresaId) return res.status(400).json({ error: "EMPRESA_REQUIRED" });
  if (user.role !== "master_admin" && user.empresaId && Number(user.empresaId) !== empresaId) {
    return res.status(403).json({ error: "FORBIDDEN_COMPANY" });
  }
  await client`
    UPDATE monitor_agentes
    SET user_id=${userId || null}, department_id=${departmentId || null}, "updatedAt"=NOW()
    WHERE id=${agentId} AND "empresaId"=${empresaId}
  `;
  res.json({ success: true });
});

app.post("/api/agents/generate-pairing-code", requireUser, async (req, res) => {
  const user = (req as any).user;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const { userId, departmentId } = req.body ?? {};
  const requestedEmpresaId = Number(req.body?.empresaId || req.query?.empresaId || 0);
  const empresaId = await resolveEmpresaIdForUser(client, user, requestedEmpresaId);
  if (!empresaId) {
    return res.status(400).json({ error: "EMPRESA_REQUIRED" });
  }
  if (user.role !== "master_admin" && user.empresaId && Number(user.empresaId) !== empresaId) {
    return res.status(403).json({ error: "FORBIDDEN_COMPANY" });
  }

  const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = `SYNC-${part1}-${part2}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await client`
    INSERT INTO agent_pairing_codes ("empresaId", codigo, "criadoPor", "expiresAt", user_id, department_id, "createdAt")
    VALUES (${empresaId}, ${code}, ${user.id}, ${expiresAt}, ${userId || null}, ${departmentId || null}, NOW())
  `;

  res.json({ code, expiresAt, empresaId });
});

const setNoCacheDownloadHeaders = (res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
};

const sendAgentDownload = (res: Response, filePathOrName: string, downloadName: string, artifactName?: string) => {
  const filePath = path.isAbsolute(filePathOrName) ? filePathOrName : path.join(AGENT_DIR, filePathOrName);
  const artifact = artifactName || path.relative(AGENT_DIR, filePath) || path.basename(filePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "AGENT_FILE_NOT_FOUND",
      filename: artifact,
      agentDir: AGENT_DIR,
      filePath,
    });
  }
  setNoCacheDownloadHeaders(res);
  res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
  res.setHeader("X-Synapse-Agent-Version", AGENT_VERSION);
  res.setHeader("X-Synapse-Artifact", artifact);
  const hash = getFileSha256(filePath);
  if (hash) res.setHeader("X-Synapse-Artifact-SHA256", hash);
  res.download(filePath, downloadName);
};

app.get("/api/agent/version", (req, res) => {
  setNoCacheDownloadHeaders(res);
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const origin = `${proto}://${req.get("host")}`;
  const metadata = getDesktopInstallerMetadata();
  res.json({
    version: AGENT_VERSION,
    latestVersion: AGENT_VERSION,
    minimumVersion: AGENT_MINIMUM_VERSION,
    productName: "Synapse para Windows",
    artifact: DESKTOP_INSTALLER_FILENAME,
    runtime: "electron",
    worker: "python-legacy",
    downloadUrl: `${origin}/api/agent/download`,
    sha256: metadata.sha256,
    sizeBytes: metadata.sizeBytes,
    mandatory: false,
    timezone: SYNAPSE_TIME_ZONE,
    releaseDate: metadata.releaseDate,
    publishedAt: metadata.releaseDate,
    changelog: DESKTOP_RELEASE_NOTES,
    releaseNotes: DESKTOP_RELEASE_NOTES,
  });
});

app.get("/api/agent/download", (_req, res) => {
  sendAgentDownload(res, DESKTOP_INSTALLER_PATH, DESKTOP_INSTALLER_FILENAME, `electron-dist/${DESKTOP_INSTALLER_FILENAME}`);
});

app.get("/api/agent/download/windows", (_req, res) => {
  sendAgentDownload(res, "synapse-agent.exe", "Synapse-Agent-Windows.exe");
});

app.get("/api/agent/download/windows-installer", (_req, res) => {
  sendAgentDownload(res, DESKTOP_INSTALLER_PATH, DESKTOP_INSTALLER_FILENAME, `electron-dist/${DESKTOP_INSTALLER_FILENAME}`);
});

app.get("/api/agent/download/windows-legacy-installer", (_req, res) => {
  sendAgentDownload(res, "install_windows.bat", "Synapse-Agent-Setup-Legacy-Windows.bat");
});

app.get("/api/agent/download/windows-uninstaller", (_req, res) => {
  sendAgentDownload(res, "uninstall_windows.bat", "Synapse-Agent-Remover-Windows.bat");
});

app.get("/api/agent/download/windows-node-installer", (_req, res) => {
  sendAgentDownload(res, "install_synapse.js", "Synapse-Agent-Compatibilidade-Windows.js");
});

app.get("/api/agent/download/linux", (_req, res) => {
  sendAgentDownload(res, "install_linux.sh", "Synapse-Agent-Setup-Linux.sh");
});

app.get("/api/agent/download/agent", (_req, res) => {
  sendAgentDownload(res, "synapse_agent.py", "Synapse-Agent-Compatibilidade.py");
});

app.get("/api/agent/support/latest.py", (_req, res) => {
  sendAgentDownload(res, "synapse_agent.py", "Synapse-Agent-Compatibilidade.py");
});

app.post("/api/omnichannel/webhook/:provider/:empresaId", async (req, res) => {
  try {
    const provider = String(req.params.provider || "") as "whatsapp" | "telegram" | "instagram";
    const empresaId = Number(req.params.empresaId);
    const client = await getRawClient();
    if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
    if (!["whatsapp", "telegram", "instagram"].includes(provider) || !empresaId) {
      return res.status(400).json({ error: "INVALID_WEBHOOK" });
    }

    const integrations = await client`
      SELECT * FROM integracoes
      WHERE "empresaId"=${empresaId}
        AND tipo IN (${provider}, ${provider === "whatsapp" ? "evolution_api" : provider})
      ORDER BY "createdAt" DESC
      LIMIT 1
    `.catch(() => []);

    const integration = integrations[0];
    if (integration?.webhookSecret) {
      const provided = String(req.headers["x-synapse-secret"] || req.query.secret || "");
      if (provided !== String(integration.webhookSecret)) {
        return res.status(401).json({ error: "INVALID_SECRET" });
      }
    }

    if (provider === "telegram") {
      const message = req.body?.message || req.body?.edited_message;
      if (!message?.chat?.id) return res.json({ ignored: true });
      await storeOmnichannelInbound({
        empresaId,
        provider,
        externalId: String(message.chat.id),
        displayName: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || message.chat?.title || "Telegram",
        username: message.from?.username || null,
        content: message.text || message.caption || null,
        externalMessageId: message.message_id ? String(message.message_id) : null,
        messageType: message.photo ? "image" : "text",
        payload: req.body,
      });
      return res.json({ success: true });
    }

    if (provider === "whatsapp") {
      const event = req.body?.data || req.body;
      const externalId = event?.key?.remoteJid || event?.from || event?.sender || null;
      const content = event?.message?.conversation || event?.message?.extendedTextMessage?.text || event?.text || null;
      if (!externalId) return res.json({ ignored: true });
      await storeOmnichannelInbound({
        empresaId,
        provider,
        externalId: String(externalId).replace(/@s\.whatsapp\.net$/, ""),
        phone: String(externalId).replace(/@s\.whatsapp\.net$/, ""),
        displayName: event?.pushName || event?.senderName || "WhatsApp",
        content,
        externalMessageId: event?.key?.id || null,
        messageType: event?.message?.imageMessage ? "image" : "text",
        payload: req.body,
      });
      return res.json({ success: true });
    }

    if (provider === "instagram") {
      const changes = req.body?.entry?.[0]?.changes?.[0]?.value;
      const msg = changes?.messages?.[0];
      if (!msg?.from?.id) return res.json({ ignored: true });
      await storeOmnichannelInbound({
        empresaId,
        provider,
        externalId: String(msg.from.id),
        displayName: changes?.contacts?.[0]?.profile?.name || "Instagram",
        content: msg.text?.body || null,
        externalMessageId: msg.id || null,
        messageType: msg.image ? "image" : "text",
        payload: req.body,
      });
      return res.json({ success: true });
    }

    return res.json({ ignored: true });
  } catch (error: any) {
    console.error("[Webhook][Omnichannel]", error);
    return res.status(500).json({ error: error?.message || "WEBHOOK_ERROR" });
  }
});

app.post("/api/agent/pair", async (req, res) => {
  try {
    const client = await getRawClient();
    if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

    const pairCode = req.body?.pairCode;
    const hostname = req.body?.hostname;
    if (!pairCode || !hostname) {
      return res.status(400).json({ error: "pairCode e hostname são obrigatórios" });
    }

    const pairings = await client`
      SELECT * FROM agent_pairing_codes
      WHERE codigo=${pairCode}
        AND ("usado"=false OR "is_used"=false)
        AND "expiresAt" > NOW()
      LIMIT 1
    `;
    const pairing = pairings[0];
    if (!pairing) {
      return res.status(404).json({ error: "Código inválido ou expirado" });
    }

    const token = `agent_${pairing.empresaId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const pairedUserId = pairing.user_id || pairing.criadoPor || null;
    const pairedDepartmentId = pairing.department_id || null;
    const pairedUsers = pairedUserId
      ? await client`
          SELECT id, name, email, role, "empresaId"
          FROM users
          WHERE id = ${Number(pairedUserId)}
          LIMIT 1
        `.catch(() => [])
      : [];
    const pairedUser = pairedUsers[0] ?? null;
    const fingerprint = req.body?.fingerprint || `${hostname}:${req.body?.platform?.machine || ""}:${req.body?.platform?.processor || ""}`;
    const soValue = req.body?.platform?.os || req.body?.so || req.body?.platform || null;
    const anydeskValue = req.body?.anydeskId || req.body?.anydesk_id || null;
    const macValue = req.body?.mac || null;

    const existingRows = await client`
      SELECT * FROM monitor_agentes
      WHERE "empresaId"=${pairing.empresaId}
        AND "deletedAt" IS NULL
        AND (
          (${fingerprint} <> '' AND fingerprint=${fingerprint})
          OR lower(hostname)=lower(${hostname})
        )
      ORDER BY
        CASE WHEN ${fingerprint} <> '' AND fingerprint=${fingerprint} THEN 0 ELSE 1 END,
        CASE WHEN status IN ('online','offline','aguardando','despareado') OR COALESCE(ativo,true)=true THEN 0 ELSE 1 END,
        COALESCE("ultimoContato","updatedAt","createdAt") DESC
      LIMIT 1
    `.catch(() => []);

    let deviceId = existingRows[0]?.id;

    if (deviceId) {
      await client`
        UPDATE monitor_agentes
        SET hostname=${hostname},
            ip=${req.body?.ip || null},
            so=${soValue},
            mac=${macValue},
            "anydeskId"=${anydeskValue},
            "versaoAgente"=${req.body?.agentVersion || req.body?.versao_agente || "1.0.0"},
            token=${token},
            fingerprint=${fingerprint},
            "pairingCode"=${pairCode},
            status='online',
            online=true,
            ativo=true,
            "ultimoContato"=NOW(),
            user_id=COALESCE(user_id, ${pairedUserId}),
            department_id=COALESCE(department_id, ${pairedDepartmentId}),
            "updatedAt"=NOW()
        WHERE id=${deviceId}
      `;
    } else {
      const inserted = await client`
        INSERT INTO monitor_agentes (
          "empresaId", hostname, ip, so, mac, "anydeskId", "versaoAgente", token,
          "ultimoContato", online, ativo, "createdAt", "updatedAt",
          status, "pairingCode", fingerprint, user_id, department_id
        )
        VALUES (
          ${pairing.empresaId}, ${hostname}, ${req.body?.ip || null},
          ${soValue},
          ${macValue},
          ${anydeskValue},
          ${req.body?.agentVersion || req.body?.versao_agente || "1.0.0"},
          ${token}, NOW(), true, true, NOW(), NOW(),
          'online', ${pairCode}, ${fingerprint}, ${pairedUserId}, ${pairedDepartmentId}
        )
        RETURNING id
      `;
      deviceId = inserted[0]?.id;
    }

    await client`
      UPDATE agent_pairing_codes
      SET "usado"=true, is_used=true, "agenteId"=${deviceId}, "usadoEm"=NOW(), "hostnameVinculado"=${hostname}
      WHERE id=${pairing.id}
    `;

    await writeAuditTrail(client, req, {
      empresaId: pairing.empresaId,
      userId: pairedUser?.id ?? pairedUserId,
      userName: pairedUser?.name ?? pairedUser?.email ?? "Pareamento Synapse",
      userRole: pairedUser?.role ?? null,
      action: "UPDATE",
      eventType: "config_change",
      module: "ti",
      tableName: "monitor_agentes",
      recordId: Number(deviceId),
      description: `Dispositivo pareado pelo Synapse Windows: ${hostname}`,
      after: { deviceId, hostname, userId: pairedUser?.id ?? pairedUserId },
      risk: "medio",
    });

    return res.json({
      token,
      deviceId,
      empresaId: pairing.empresaId,
      hostname,
      userId: pairedUser?.id ?? pairedUserId ?? null,
      userName: pairedUser?.name ?? null,
      userEmail: pairedUser?.email ?? null,
      userRole: pairedUser?.role ?? null,
      userIsTi: pairedUser ? canManageTiRole(pairedUser.role) : false,
      user: pairedUser
        ? {
            id: pairedUser.id,
            name: pairedUser.name,
            email: pairedUser.email,
            role: pairedUser.role,
            empresaId: pairedUser.empresaId,
            isTiManager: canManageTiRole(pairedUser.role),
          }
        : null,
    });
  } catch (error) {
    console.error("[Agent Pair] Falha:", error);
    return res.status(500).json({ error: "PAIR_FAILED" });
  }
});

app.post("/api/agent/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const deviceId = Number(req.body?.deviceId || 0);
    const agentToken = String(req.body?.token || "").trim();

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
    }

    const client = await getRawClient();
    if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

    const users = await client`
      SELECT id, email, password, "empresaId", name, role, status, "deletedAt"
      FROM users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `.catch(() => []);
    const user = users[0];
    if (!user?.password) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    if (user.deletedAt || user.status === "pending") {
      return res.status(403).json({ error: "USER_NOT_ACTIVE" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    if (deviceId > 0) {
      if (!agentToken) {
        return res.status(401).json({ error: "AGENT_TOKEN_REQUIRED" });
      }
      const updatedAgents = await client`
        UPDATE monitor_agentes
        SET user_id = ${user.id}, "updatedAt" = NOW()
        WHERE id = ${deviceId}
          AND token = ${agentToken}
          AND (
            ${user.role === "master_admin"}
            OR "empresaId" = ${user.empresaId}
          )
          AND "deletedAt" IS NULL
          AND COALESCE(ativo, true) = true
        RETURNING id
      `.catch(() => []);
      if (!updatedAgents[0]) {
        await writeAuditTrail(client, req, {
          empresaId: user.empresaId,
          userId: user.id,
          userName: user.name ?? user.email,
          userRole: user.role,
          action: "UPDATE",
          eventType: "access_denied",
          module: "ti",
          tableName: "monitor_agentes",
          recordId: deviceId,
          description: "Tentativa de ativar modo TI/Admin em dispositivo não autorizado.",
          after: { deviceId, email },
          risk: "alto",
        });
        return res.status(403).json({ error: "DEVICE_NOT_AUTHORIZED_FOR_USER" });
      }
    }

    await writeAuditTrail(client, req, {
      empresaId: user.empresaId,
      userId: user.id,
      userName: user.name ?? user.email,
      userRole: user.role,
      action: "LOGIN",
      eventType: "login",
      module: "ti",
      tableName: "monitor_agentes",
      recordId: deviceId || user.id,
      description: `Login no Synapse Windows${canManageTiRole(user.role) ? " em modo TI/Admin" : ""}.`,
      after: { deviceId: deviceId || null, isTiManager: canManageTiRole(user.role) },
      risk: canManageTiRole(user.role) ? "medio" : "baixo",
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        empresaId: user.empresaId,
        role: user.role,
        isTiManager: canManageTiRole(user.role),
      },
    });
  } catch (error) {
    console.error("[Agent Auth Login] Falha:", error);
    return res.status(500).json({ error: "AGENT_LOGIN_FAILED" });
  }
});

app.post(["/api/agent/metrics", "/api/agent/heartbeat", "/api/agent/inventory", "/api/agent/telemetry"], async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return res.status(401).json({ error: "TOKEN_REQUIRED" });

    const client = await getRawClient();
    if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

    const agents = await client`
      SELECT id, "empresaId", hostname, token, user_id, department_id, status, online, "ultimoContato"
      FROM monitor_agentes
      WHERE token=${token}
        AND "deletedAt" IS NULL
        AND COALESCE(ativo, true) = true
      LIMIT 1
    `.catch((error) => {
      console.warn("[Agent Metrics] Falha ao validar token:", error?.message || error);
      return [];
    });
    const agent = agents[0];
    if (!agent) return res.status(401).json({ error: "TOKEN_INVALIDO" });

    const metric = mapLegacyMetric(req.body ?? {});

    try {
      await client`
        INSERT INTO monitor_metricas (
          "agenteId", "empresaId", "coletadoEm", "cpuUso", "cpuTemp", "cpuFreqMhz",
          "ramTotalMb", "ramUsadaMb", "ramUsoPct", "discoTotalGb", "discoUsadoGb",
          "discoUsoPct", "redeEnviadoKb", "redeRecebidoKb", "latenciaMs", processos,
          "anydeskId", "usuarioLogado", uptime, "topProcessos",
          "placaMaeModelo", "placaMaeFabricante", "socketCpu", "biosVersao",
          gpus, sensores, "memoriaSlots", discos, "interfacesRede", "ipLocal",
          "serialNumber", "assetTag"
        )
        VALUES (
          ${agent.id}, ${agent.empresaId}, ${metric.coletadoEm}, ${metric.cpuUso}, ${metric.cpuTemp}, ${metric.cpuFreqMhz},
          ${metric.ramTotalMb}, ${metric.ramUsadaMb}, ${metric.ramUsoPct}, ${metric.discoTotalGb}, ${metric.discoUsadoGb},
          ${metric.discoUsoPct}, ${metric.redeEnviadoKb}, ${metric.redeRecebidoKb}, ${metric.latenciaMs}, ${metric.processos},
          ${metric.anydeskId}, ${metric.usuarioLogado}, ${metric.uptime}, ${metric.topProcessos},
          ${metric.placaMaeModelo}, ${metric.placaMaeFabricante}, ${metric.socketCpu}, ${metric.biosVersao},
          ${metric.gpus}, ${metric.sensores}, ${metric.memoriaSlots}, ${metric.discos}, ${metric.interfacesRede},
          ${metric.ipLocal}, ${metric.serialNumber}, ${metric.assetTag}
        )
      `;
    } catch (insertError) {
      // Fallback para bancos legados sem colunas novas: não derruba o agente.
      console.warn("[Agent Metrics] Insert completo falhou, usando fallback legado:", insertError);
      await client`
        INSERT INTO monitor_metricas (
          "agenteId", "empresaId", "coletadoEm", "cpuUso",
          "ramUsoPct", "discoUsoPct", "anydeskId", "usuarioLogado", uptime
        )
        VALUES (
          ${agent.id}, ${agent.empresaId}, ${metric.coletadoEm}, ${metric.cpuUso},
          ${metric.ramUsoPct}, ${metric.discoUsoPct}, ${metric.anydeskId}, ${metric.usuarioLogado}, ${metric.uptime}
        )
      `;
    }

    try {
      await client`
        UPDATE monitor_agentes
        SET status='online',
            online=true,
            "ultimoContato"=NOW(),
            "updatedAt"=NOW(),
            ip=COALESCE(${metric.ipLocal}, ip),
            so=COALESCE(${metric.so}, so),
            "versaoAgente"=COALESCE(${metric.agentVersion}, "versaoAgente"),
            "anydeskId"=COALESCE(${metric.anydeskId}, "anydeskId"),
            "cpuModel"=COALESCE(${metric.cpuModel}, "cpuModel"),
            "gpuModel"=COALESCE(${metric.gpuModel}, "gpuModel"),
            "placaMaeModelo"=COALESCE(${metric.placaMaeModelo}, "placaMaeModelo"),
            "socketCpu"=COALESCE(${metric.socketCpu}, "socketCpu"),
            "serialNumber"=COALESCE(${metric.serialNumber}, "serialNumber"),
            "assetTag"=COALESCE(${metric.assetTag}, "assetTag")
        WHERE id=${agent.id}
      `;
    } catch (updateError) {
      // Fallback para schema legado sem colunas de hardware no monitor_agentes.
      console.warn("[Agent Metrics] Update completo falhou, usando fallback legado:", updateError);
      await client`
        UPDATE monitor_agentes
        SET status='online',
            online=true,
            "ultimoContato"=NOW(),
            "updatedAt"=NOW()
        WHERE id=${agent.id}
      `;
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("[Agent Metrics] Falha:", error);
    // Não derruba o agente em produção por erro transitório/schema legado.
    return res.status(200).json({ success: false, queued: true, warning: "METRICS_DEGRADED" });
  }
});

app.get("/api/agent/profile", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  const wantsTiProfile = String(req.headers["x-synapse-agent-mode"] || "").toLowerCase() === "ti";
  const sanitizeAgentProfile = (profile: any) => ({
    id: profile?.id,
    empresaId: profile?.empresaId,
    empresa_nome: profile?.empresa_nome,
    usuario_nome: profile?.usuario_nome,
    usuario_email: profile?.usuario_email,
    versaoAgente: profile?.versaoAgente,
    ultimoContato: profile?.ultimoContato,
    online: profile?.online,
    status: profile?.status,
    technicalProfileAllowed: false,
  });
  const sendProfile = (profile: any) => {
    if (!profile) return res.json(null);
    const canSeeTechnicalProfile = wantsTiProfile && canManageTiRole(profile.usuario_role);
    return res.json(canSeeTechnicalProfile ? { ...profile, technicalProfileAllowed: true } : sanitizeAgentProfile(profile));
  };

  const profileRows = await client`
    SELECT
      a.id, a."empresaId", a."ativoId", a.hostname, a.ip, a.mac, a.so,
      a."versaoAgente", a."ultimoContato", a.online, a.ativo,
      a."createdAt", a."updatedAt", a."anydeskId", a.status, a."deletedAt",
      a."pairingCode", a.fingerprint, a."ultimaVersao", a.setor,
      a.user_id, a.department_id, a."cpuModel", a."gpuModel",
      a."placaMaeModelo", a."socketCpu", a."serialNumber", a."assetTag",
      a."isCritical24x7", a."notifyOnOffline", a."notifyOnNetworkLoss",
      a."offlineGraceMinutes", a."monitoringNotes", a."lastPolicyUpdateAt",
      e.nome as empresa_nome,
      u.name as usuario_nome,
      u.email as usuario_email,
      u.role as usuario_role,
      (
        SELECT row_to_json(mm)
        FROM (
          SELECT
            "coletadoEm", "cpuUso", "cpuTemp", "cpuFreqMhz",
            "ramTotalMb", "ramUsadaMb", "ramUsoPct",
            "discoTotalGb", "discoUsadoGb", "discoUsoPct",
            "redeEnviadoKb", "redeRecebidoKb", "latenciaMs",
            processos, "anydeskId", "usuarioLogado", uptime, "topProcessos",
            "placaMaeModelo", "placaMaeFabricante", "socketCpu", "biosVersao",
            gpus, sensores, "memoriaSlots", discos, "interfacesRede",
            "ipLocal", "serialNumber", "assetTag"
          FROM monitor_metricas
          WHERE "agenteId" = a.id
          ORDER BY "coletadoEm" DESC
          LIMIT 1
        ) mm
      ) as ultima_metrica
    FROM monitor_agentes a
    LEFT JOIN empresas e ON e.id = a."empresaId"
    LEFT JOIN users u ON u.id::text = a.user_id::text
    WHERE a.id = ${agent.id}
      AND a."deletedAt" IS NULL
      AND COALESCE(a.ativo, true) = true
    LIMIT 1
  `.catch((error) => {
    console.warn("[Agent Profile] Consulta completa falhou:", error?.message || error);
    return [];
  });
  if (profileRows[0]) return sendProfile(profileRows[0]);
  const fallbackProfileRows = await client`
    SELECT
      a.id, a."empresaId", a."ativoId", a.hostname, a.ip, a.mac, a.so,
      a."versaoAgente", a."ultimoContato", a.online, a.ativo,
      a."createdAt", a."updatedAt", a."anydeskId", a.status, a."deletedAt",
      a."pairingCode", a.fingerprint, a."ultimaVersao", a.setor,
      a.user_id, a.department_id, a."cpuModel", a."gpuModel",
      a."placaMaeModelo", a."socketCpu", a."serialNumber", a."assetTag",
      false as "isCritical24x7", false as "notifyOnOffline", false as "notifyOnNetworkLoss",
      10 as "offlineGraceMinutes", NULL as "monitoringNotes", NULL as "lastPolicyUpdateAt",
      e.nome as empresa_nome,
      u.name as usuario_nome,
      u.email as usuario_email,
      u.role as usuario_role,
      NULL as ultima_metrica
    FROM monitor_agentes a
    LEFT JOIN empresas e ON e.id = a."empresaId"
    LEFT JOIN users u ON u.id::text = a.user_id::text
    WHERE a.id = ${agent.id}
      AND a."deletedAt" IS NULL
      AND COALESCE(a.ativo, true) = true
    LIMIT 1
  `.catch((error) => {
    console.warn("[Agent Profile] Consulta fallback falhou:", error?.message || error);
    return [];
  });
  return sendProfile(fallbackProfileRows[0] ?? null);
});

app.get("/api/agent/device-policy", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  await ensureAgentPolicyColumns(client);
  const rows = await client`
    SELECT "isCritical24x7", "notifyOnOffline", "notifyOnNetworkLoss",
      "offlineGraceMinutes", "monitoringNotes", "lastPolicyUpdateAt"
    FROM monitor_agentes
    WHERE id=${agent.id}
      AND "empresaId"=${agent.empresaId}
      AND "deletedAt" IS NULL
    LIMIT 1
  `.catch(() => []);
  const policy = rows[0] ?? {};
  res.json({
    isCritical24x7: Boolean(policy.isCritical24x7),
    notifyOnOffline: Boolean(policy.notifyOnOffline),
    notifyOnNetworkLoss: Boolean(policy.notifyOnNetworkLoss),
    offlineGraceMinutes: Number(policy.offlineGraceMinutes || 10),
    monitoringNotes: policy.monitoringNotes || "",
    lastPolicyUpdateAt: policy.lastPolicyUpdateAt || null,
  });
});

app.put("/api/agent/device-policy", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  const agentUserId = Number(agent.user_id || 0);
  if (!Number.isFinite(agentUserId) || agentUserId <= 0) {
    return res.status(403).json({ error: "LOGIN_REQUIRED_FOR_DEVICE_POLICY" });
  }
  await ensureAgentPolicyColumns(client);
  const offlineGraceMinutes = Math.min(240, Math.max(3, Number(req.body?.offlineGraceMinutes || 10)));
  const monitoringNotes = String(req.body?.monitoringNotes || "").trim().slice(0, 500);
  const nextPolicy = {
    isCritical24x7: Boolean(req.body?.isCritical24x7),
    notifyOnOffline: Boolean(req.body?.notifyOnOffline || req.body?.isCritical24x7),
    notifyOnNetworkLoss: Boolean(req.body?.notifyOnNetworkLoss),
    offlineGraceMinutes,
    monitoringNotes,
  };
  const rows = await client`
    UPDATE monitor_agentes
    SET "isCritical24x7"=${nextPolicy.isCritical24x7},
        "notifyOnOffline"=${nextPolicy.notifyOnOffline},
        "notifyOnNetworkLoss"=${nextPolicy.notifyOnNetworkLoss},
        "offlineGraceMinutes"=${nextPolicy.offlineGraceMinutes},
        "monitoringNotes"=${nextPolicy.monitoringNotes || null},
        "lastPolicyUpdateAt"=NOW(),
        "updatedAt"=NOW()
    WHERE id=${agent.id}
      AND "empresaId"=${agent.empresaId}
      AND "deletedAt" IS NULL
    RETURNING "isCritical24x7", "notifyOnOffline", "notifyOnNetworkLoss",
      "offlineGraceMinutes", "monitoringNotes", "lastPolicyUpdateAt"
  `.catch(() => []);

  await writeAuditTrail(client, req, {
    empresaId: agent.empresaId,
    userId: agentUserId,
    userName: agent.user_name ?? agent.user_email ?? null,
    userRole: agent.user_role ?? null,
    action: "UPDATE",
    eventType: "config_change",
    module: "ti",
    tableName: "monitor_agentes",
    recordId: agent.id,
    description: "Política 24x7 do agente atualizada pelo Synapse Windows.",
    after: { ...nextPolicy, agentId: agent.id, hostname: agent.hostname, timezone: SYNAPSE_TIME_ZONE },
    risk: nextPolicy.isCritical24x7 ? "medio" : "baixo",
  });

  res.json(rows[0] ?? nextPolicy);
});

app.get("/api/agent/tickets", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  const agentUserId = Number(agent.user_id || 0);
  if (!Number.isFinite(agentUserId) || agentUserId <= 0) {
    return res.json([]);
  }

  const rows = await client`
    SELECT id, protocolo, titulo, descricao, categoria, prioridade, status, "createdAt", "updatedAt", "resolvidoEm"
    FROM tickets_ti
    WHERE "empresaId" = ${agent.empresaId}
      AND "solicitanteId" = ${agentUserId}
      AND "deletedAt" IS NULL
    ORDER BY "updatedAt" DESC, id DESC
    LIMIT 20
  `.catch(() => []);

  res.json(rows);
});

app.post("/api/agent/tickets/open", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  const agentUserId = Number(agent.user_id || 0);
  if (!Number.isFinite(agentUserId) || agentUserId <= 0) {
    return res.status(400).json({ error: "AGENT_NOT_ASSOCIATED_TO_USER" });
  }

  const titulo = String(req.body?.titulo || "").trim();
  const descricao = String(req.body?.descricao || "").trim();
  const allowedCategorias = new Set(["hardware", "software", "rede", "acesso", "email", "impressora", "outro"]);
  const allowedPrioridades = new Set(["baixa", "media", "alta", "critica"]);
  const requestedCategoria = String(req.body?.categoria || "hardware").trim().toLowerCase();
  const requestedPrioridade = String(req.body?.prioridade || "media").trim().toLowerCase();
  const categoria = allowedCategorias.has(requestedCategoria) ? requestedCategoria : "outro";
  const prioridade = allowedPrioridades.has(requestedPrioridade) ? requestedPrioridade : "media";

  if (!titulo || titulo.length < 2) {
    return res.status(400).json({ error: "Informe o título do chamado." });
  }
  if (!descricao || descricao.length < 5) {
    return res.status(400).json({ error: "Informe a descrição do chamado." });
  }

  const protocolo = `TI-${Date.now().toString(36).toUpperCase()}`;

  const rows = await client`
    INSERT INTO tickets_ti (
      "empresaId", "solicitanteId", protocolo, titulo, descricao,
      categoria, prioridade, status, "createdAt", "updatedAt"
    ) VALUES (
      ${agent.empresaId}, ${agentUserId}, ${protocolo}, ${titulo}, ${descricao},
      ${categoria}, ${prioridade}, 'aberto', NOW(), NOW()
    ) RETURNING id, protocolo, titulo, descricao, categoria, prioridade, status, "createdAt", "updatedAt"
  `.catch(() => []);

  const ticket = rows[0];
  if (!ticket) return res.status(500).json({ error: "TICKET_CREATE_FAILED" });

  await client`
    INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
    VALUES (
      ${ticket.id},
      ${agent.empresaId},
      ${agentUserId},
      ${descricao},
      'mensagem',
      NOW()
    )
  `.catch(() => {});

  await client`
    INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
    VALUES (
      ${ticket.id},
      ${agent.empresaId},
      ${agentUserId},
      ${"Chamado aberto pelo Synapse para Windows."},
      'sistema',
      NOW()
    )
  `.catch(() => {});

  await client`
    INSERT INTO ticket_status_history ("ticketId","empresaId","changedBy","fromStatus","toStatus",motivo,"createdAt")
    VALUES (${ticket.id}, ${agent.empresaId}, ${agentUserId}, ${null}, 'aberto', ${'Chamado aberto pelo agente'}, NOW())
  `.catch(() => {});

  await writeAuditTrail(client, req, {
    empresaId: agent.empresaId,
    userId: agentUserId,
    userName: agent.user_name ?? agent.user_email ?? null,
    userRole: agent.user_role ?? null,
    action: "CREATE",
    eventType: "create",
    module: "ti",
    tableName: "tickets_ti",
    recordId: ticket.id,
    description: "Chamado aberto pelo Synapse Windows.",
    after: {
      ticketId: ticket.id,
      protocolo,
      categoria,
      prioridade,
      origem: "synapse-desktop",
      agentId: agent.id,
      hostname: agent.hostname,
    },
    risk: prioridade === "critica" ? "alto" : "baixo",
  });

  res.json(ticket);
});

app.get("/api/agent/tickets/:id/messages", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  const agentUserId = Number(agent.user_id || 0);
  if (!Number.isFinite(agentUserId) || agentUserId <= 0) {
    return res.status(400).json({ error: "AGENT_NOT_ASSOCIATED_TO_USER" });
  }

  const ticketId = Number(req.params.id);
  const ticketRows = await client`
    SELECT id
    FROM tickets_ti
    WHERE id = ${ticketId}
      AND "empresaId" = ${agent.empresaId}
      AND "solicitanteId" = ${agentUserId}
    LIMIT 1
  `.catch(() => []);

  if (!ticketRows[0]) {
    return res.status(404).json({ error: "TICKET_NOT_FOUND" });
  }

  const rows = await client`
    SELECT m.*, u.name as autor_nome, u.email as autor_email
    FROM ticket_mensagens m
    LEFT JOIN users u ON u.id = m."autorId"
    WHERE m."ticketId" = ${ticketId}
      AND m."empresaId" = ${agent.empresaId}
    ORDER BY m."createdAt" ASC
  `.catch(() => []);

  res.json(rows);
});

app.post("/api/agent/tickets/:id/messages", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  const agentUserId = Number(agent.user_id || 0);
  if (!Number.isFinite(agentUserId) || agentUserId <= 0) {
    return res.status(400).json({ error: "AGENT_NOT_ASSOCIATED_TO_USER" });
  }

  const ticketId = Number(req.params.id);
  const conteudo = String(req.body?.conteudo || "").trim();
  const fileUrl = String(req.body?.fileUrl || "").trim();
  const fileName = String(req.body?.fileName || "").trim();
  const fileType = String(req.body?.fileType || "").trim();
  if (!conteudo && !fileUrl) return res.status(400).json({ error: "MESSAGE_REQUIRED" });

  const ticketRows = await client`
    SELECT id
    FROM tickets_ti
    WHERE id = ${ticketId}
      AND "empresaId" = ${agent.empresaId}
      AND "solicitanteId" = ${agentUserId}
    LIMIT 1
  `.catch(() => []);

  if (!ticketRows[0]) {
    return res.status(404).json({ error: "TICKET_NOT_FOUND" });
  }

  const rows = await client`
    INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"fileUrl","fileName","fileType","createdAt")
    VALUES (
      ${ticketId},
      ${agent.empresaId},
      ${agentUserId},
      ${conteudo || ""},
      ${fileUrl ? "anexo" : "mensagem"},
      ${fileUrl || null},
      ${fileName || null},
      ${fileType || null},
      NOW()
    )
    RETURNING *
  `.catch(() => []);

  await client`
    UPDATE tickets_ti
    SET "updatedAt" = NOW(),
        status = CASE
          WHEN status IN ('aguardando_usuario','resolvido','encerrado','fechado') THEN 'aguardando_ti'
          ELSE status
        END
    WHERE id = ${ticketId} AND "empresaId" = ${agent.empresaId}
  `.catch(() => {});

  await writeAuditTrail(client, req, {
    empresaId: agent.empresaId,
    userId: agentUserId,
    userName: agent.user_name ?? agent.user_email ?? null,
    userRole: agent.user_role ?? null,
    action: "CREATE",
    eventType: "create",
    module: "ti",
    tableName: "ticket_mensagens",
    recordId: Number(rows[0]?.id || ticketId),
    description: fileUrl ? "Anexo enviado pelo Synapse Windows." : "Mensagem enviada pelo Synapse Windows.",
    after: { ticketId, hasAttachment: Boolean(fileUrl), fileName: fileName || null },
    risk: fileUrl ? "medio" : "baixo",
  });

  res.json(rows[0] ?? { success: false });
});

app.get("/api/agent/ti/tickets", requireAgentTi, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const rows = await client`
    SELECT t.id, t.protocolo, t.titulo, t.descricao, t.categoria, t.prioridade,
      t.status, t."createdAt", t."updatedAt", t."resolvidoEm",
      u.name as solicitante_nome, u.email as solicitante_email,
      a.hostname as agente_hostname, a."anydeskId" as agente_anydesk_id
    FROM tickets_ti t
    LEFT JOIN users u ON u.id = t."solicitanteId"
    LEFT JOIN monitor_agentes a ON a.user_id = t."solicitanteId"::text AND a."empresaId" = t."empresaId"
    WHERE t."empresaId" = ${agent.empresaId}
      AND t."deletedAt" IS NULL
    ORDER BY t."updatedAt" DESC, t.id DESC
    LIMIT 80
  `.catch(() => []);

  res.json(rows);
});

app.get("/api/agent/ti/tickets/:id/messages", requireAgentTi, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const ticketId = Number(req.params.id);
  const ticketRows = await client`
    SELECT id
    FROM tickets_ti
    WHERE id = ${ticketId}
      AND "empresaId" = ${agent.empresaId}
      AND "deletedAt" IS NULL
    LIMIT 1
  `.catch(() => []);
  if (!ticketRows[0]) return res.status(404).json({ error: "TICKET_NOT_FOUND" });

  const rows = await client`
    SELECT m.*, u.name as autor_nome, u.email as autor_email
    FROM ticket_mensagens m
    LEFT JOIN users u ON u.id = m."autorId"
    WHERE m."ticketId" = ${ticketId}
      AND m."empresaId" = ${agent.empresaId}
    ORDER BY m."createdAt" ASC
  `.catch(() => []);

  res.json(rows);
});

app.post("/api/agent/ti/tickets/:id/messages", requireAgentTi, async (req, res) => {
  const agent = (req as any).agent;
  const agentUser = (req as any).agentUser;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const ticketId = Number(req.params.id);
  const conteudo = String(req.body?.conteudo || "").trim();
  const fileUrl = String(req.body?.fileUrl || "").trim();
  const fileName = String(req.body?.fileName || "").trim();
  const fileType = String(req.body?.fileType || "").trim();
  if (!conteudo && !fileUrl) return res.status(400).json({ error: "MESSAGE_REQUIRED" });

  const ticketRows = await client`
    SELECT id, status
    FROM tickets_ti
    WHERE id = ${ticketId}
      AND "empresaId" = ${agent.empresaId}
      AND "deletedAt" IS NULL
    LIMIT 1
  `.catch(() => []);
  if (!ticketRows[0]) return res.status(404).json({ error: "TICKET_NOT_FOUND" });

  const rows = await client`
    INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"fileUrl","fileName","fileType","createdAt")
    VALUES (
      ${ticketId},
      ${agent.empresaId},
      ${Number(agentUser.id)},
      ${conteudo || ""},
      ${fileUrl ? "anexo" : "mensagem"},
      ${fileUrl || null},
      ${fileName || null},
      ${fileType || null},
      NOW()
    )
    RETURNING *
  `.catch(() => []);

  await client`
    UPDATE tickets_ti
    SET "updatedAt" = NOW(),
        status = CASE
          WHEN status IN ('novo','aberto','aguardando_ti','triagem_ia','em_atendimento','reaberto') THEN 'aguardando_usuario'
          ELSE status
        END
    WHERE id = ${ticketId} AND "empresaId" = ${agent.empresaId}
  `.catch(() => {});

  await writeAuditTrail(client, req, {
    empresaId: agent.empresaId,
    userId: Number(agentUser.id),
    userName: agentUser.name ?? agentUser.email ?? null,
    userRole: agentUser.role ?? null,
    action: "CREATE",
    eventType: "create",
    module: "ti",
    tableName: "ticket_mensagens",
    recordId: Number(rows[0]?.id || ticketId),
    description: fileUrl ? "TI/Admin enviou anexo pelo Synapse Windows." : "TI/Admin respondeu chamado pelo Synapse Windows.",
    after: { ticketId, hasAttachment: Boolean(fileUrl), fileName: fileName || null },
    risk: fileUrl ? "medio" : "baixo",
  });

  res.json(rows[0] ?? { success: false });
});

app.patch("/api/agent/ti/tickets/:id/status", requireAgentTi, async (req, res) => {
  const agent = (req as any).agent;
  const agentUser = (req as any).agentUser;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const ticketId = Number(req.params.id);
  const status = String(req.body?.status || "").trim().toLowerCase();
  const allowed = new Set([
    "aberto",
    "novo",
    "triagem_ia",
    "aguardando_usuario",
    "aguardando_ti",
    "em_andamento",
    "em_atendimento",
    "aguardando_fornecedor",
    "acesso_remoto_solicitado",
    "em_acesso_remoto",
    "resolvido",
    "fechado",
    "encerrado",
    "cancelado",
    "reaberto",
  ]);
  if (!allowed.has(status)) return res.status(400).json({ error: "STATUS_INVALIDO" });

  const currentRows = await client`
    SELECT status
    FROM tickets_ti
    WHERE id = ${ticketId}
      AND "empresaId" = ${agent.empresaId}
      AND "deletedAt" IS NULL
    LIMIT 1
  `.catch(() => []);
  const currentStatus = currentRows[0]?.status;
  if (!currentRows[0]) return res.status(404).json({ error: "TICKET_NOT_FOUND" });

  await client`
    UPDATE tickets_ti
    SET status = ${status},
        "updatedAt" = NOW(),
        "resolvidoEm" = CASE
          WHEN ${status} IN ('resolvido','encerrado','fechado') THEN NOW()
          ELSE "resolvidoEm"
        END
    WHERE id = ${ticketId} AND "empresaId" = ${agent.empresaId}
  `;

  await client`
    INSERT INTO ticket_status_history ("ticketId","empresaId","changedBy","fromStatus","toStatus",motivo,"createdAt")
    VALUES (${ticketId}, ${agent.empresaId}, ${Number(agentUser.id)}, ${currentStatus ?? null}, ${status}, ${"Alterado pelo agente Windows"}, NOW())
  `.catch(() => {});

  await client`
    INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
    VALUES (${ticketId}, ${agent.empresaId}, ${Number(agentUser.id)}, ${`Status alterado para: ${status}`}, 'sistema', NOW())
  `.catch(() => {});

  await writeAuditTrail(client, req, {
    empresaId: agent.empresaId,
    userId: Number(agentUser.id),
    userName: agentUser.name ?? agentUser.email ?? null,
    userRole: agentUser.role ?? null,
    action: "UPDATE",
    eventType: "update",
    module: "ti",
    tableName: "tickets_ti",
    recordId: ticketId,
    description: "TI/Admin alterou status de chamado pelo Synapse Windows.",
    before: { status: currentStatus ?? null },
    after: { status },
    risk: ["cancelado", "encerrado", "fechado", "em_acesso_remoto", "acesso_remoto_solicitado"].includes(status) ? "medio" : "baixo",
  });

  res.json({ success: true, status });
});

app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/health", (_req, res) => res.status(200).send("OK"));
app.get("/", (_req, res) => res.status(200).json({ status: "online", message: "Synapse API" }));
app.use("/uploads", express.static(UPLOADS_DIR));

const shouldRunInlineMigrations =
  process.env.RUN_INLINE_MIGRATIONS === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.RUN_INLINE_MIGRATIONS !== "false");

app.listen(port, () => {
  console.log(`[Server] Rodando na porta ${port}`);
  if (shouldRunInlineMigrations) {
    runInlineMigrations()
      .then(() => console.log("[Migration] ✅ Tabelas verificadas"))
      .catch((err) => console.error("[Migration] ❌ Erro:", err));
  } else {
    console.log("[Migration] Inline migrations desativadas neste ambiente.");
  }
});

import { webcrypto } from "crypto";
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = webcrypto;
}

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
const AGENT_DIR = path.join(process.cwd(), "agent");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

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
app.use(express.json({ limit: "10mb" }));

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

  const provider = String(req.query.provider || "google").toLowerCase();
  const providerToConnection: Record<string, string> = {
    google: cfg.connGoogle,
    microsoft: cfg.connMicrosoft,
    apple: cfg.connApple,
  };
  const connection = providerToConnection[provider] || cfg.connGoogle;

  const state = crypto.randomBytes(24).toString("hex");
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
  res.redirect(authorizeUrl.toString());
});

app.get("/api/auth/auth0/callback", async (req, res) => {
  if (!isAuth0Configured()) {
    return res.redirect(`${FRONTEND_URL}/login?social_error=config`);
  }
  const cfg = getAuth0Config();

  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  const cookieHeader = String(req.headers.cookie || "");
  const savedStateMatch = cookieHeader.match(/(?:^|;\s*)synapse-auth0-state=([^;]+)/);
  const savedState = savedStateMatch ? decodeURIComponent(savedStateMatch[1]) : "";

  if (!code || !state || !savedState || state !== savedState) {
    return res.redirect(`${FRONTEND_URL}/login?social_error=state`);
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
      return res.redirect(`${FRONTEND_URL}/login?social_error=token`);
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
      return res.redirect(`${FRONTEND_URL}/login?social_error=profile`);
    }

    const client = await getRawClient();
    if (!client) return res.redirect(`${FRONTEND_URL}/login?social_error=db`);

    const existingByEmail = await client`
      SELECT id, "openId", email, role, status, "empresaId", password
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    let user = existingByEmail[0];
    const openId = `auth0_${sub}`.slice(0, 64);

    if (!user) {
      const inserted = await client`
        INSERT INTO users ("openId", name, email, "loginMethod", role, status, "empresaId", "createdAt", "updatedAt", "lastSignedIn")
        VALUES (${openId}, ${name}, ${email}, 'google', 'user', 'approved', NULL, NOW(), NOW(), NOW())
        RETURNING id, "openId", email, role, status, "empresaId", password
      `;
      user = inserted[0];
    } else {
      await client`
        UPDATE users
        SET "openId"=${openId},
            name=${name},
            "loginMethod"='google',
            "lastSignedIn"=NOW(),
            "updatedAt"=NOW()
        WHERE id=${user.id}
      `;
    }

    if (user?.status === "pending") {
      return res.redirect(`${FRONTEND_URL}/login?social_error=pending`);
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

    return res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(appToken)}`
    );
  } catch (error) {
    console.error("[Auth0 Callback] Falha:", error);
    return res.redirect(`${FRONTEND_URL}/login?social_error=callback`);
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

    const rows = await client`SELECT * FROM monitor_agentes WHERE token=${token} LIMIT 1`.catch(() => []);
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

const mapLegacyMetric = (payload: any) => {
  const disks = Array.isArray(payload.disks) ? payload.disks : [];
  const diskTotalFromArray = disks.reduce((sum: number, disk: any) => sum + Number(disk.total_gb || 0), 0);
  const diskUsedFromArray = disks.reduce((sum: number, disk: any) => sum + Number(disk.used_gb || 0), 0);
  const tempGroups = payload.temperatures ? Object.values(payload.temperatures) : [];
  const firstTempGroup = Array.isArray(tempGroups[0]) ? (tempGroups[0] as any[]) : [];
  const firstTemp = firstTempGroup[0]?.current ?? null;
  const topProcesses = Array.isArray(payload.top_processes)
    ? payload.top_processes
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
  const redeEnviadoKb = payload.network?.bytes_sent_mb
    ? Number(payload.network.bytes_sent_mb) * 1024
    : payload.bytes_sent_kb ?? payload.rede_enviado_kb ?? null;
  const redeRecebidoKb = payload.network?.bytes_recv_mb
    ? Number(payload.network.bytes_recv_mb) * 1024
    : payload.bytes_recv_kb ?? payload.rede_recebido_kb ?? null;
  const latenciaMs = payload.network?.latency_ms ?? payload.network_latency_ms ?? payload.latencia_ms ?? null;
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

  const rows = await client`
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

  res.json(rows);
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

app.get("/api/agent/download/windows", (_req, res) => {
  res.download(path.join(AGENT_DIR, "synapse-agent.exe"), "synapse-agent.exe");
});

app.get("/api/agent/download/windows-installer", (_req, res) => {
  res.download(path.join(AGENT_DIR, "install_windows.bat"), "instalar_agente.bat");
});

app.get("/api/agent/download/windows-uninstaller", (_req, res) => {
  res.download(path.join(AGENT_DIR, "uninstall_windows.bat"), "desinstalar_agente.bat");
});

app.get("/api/agent/download/windows-node-installer", (_req, res) => {
  res.download(path.join(AGENT_DIR, "install_synapse.js"), "instalar_agente_node.js");
});

app.get("/api/agent/download/linux", (_req, res) => {
  res.download(path.join(AGENT_DIR, "install_linux.sh"), "install_linux.sh");
});

app.get("/api/agent/download/agent", (_req, res) => {
  res.download(path.join(AGENT_DIR, "synapse_agent.py"), "synapse_agent.py");
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
    const fingerprint = req.body?.fingerprint || `${hostname}:${req.body?.platform?.machine || ""}:${req.body?.platform?.processor || ""}`;

    const existingRows = await client`
      SELECT * FROM monitor_agentes
      WHERE "empresaId"=${pairing.empresaId}
        AND (fingerprint=${fingerprint} OR hostname=${hostname})
      LIMIT 1
    `.catch(() => []);

    let deviceId = existingRows[0]?.id;

    if (deviceId) {
      await client`
        UPDATE monitor_agentes
        SET hostname=${hostname},
            ip=${req.body?.ip || null},
            so=${req.body?.platform?.os || req.body?.so || null},
            "versaoAgente"=${req.body?.agentVersion || req.body?.versao_agente || "1.0.0"},
            token=${token},
            fingerprint=${fingerprint},
            "pairingCode"=${pairCode},
            status='online',
            online=true,
            ativo=true,
            "ultimoContato"=NOW(),
            "updatedAt"=NOW()
        WHERE id=${deviceId}
      `;
    } else {
      const inserted = await client`
        INSERT INTO monitor_agentes (
          "empresaId", hostname, ip, so, "versaoAgente", token,
          "ultimoContato", online, ativo, "createdAt", "updatedAt",
          status, "pairingCode", fingerprint, user_id, department_id
        )
        VALUES (
          ${pairing.empresaId}, ${hostname}, ${req.body?.ip || null},
          ${req.body?.platform?.os || req.body?.so || null},
          ${req.body?.agentVersion || req.body?.versao_agente || "1.0.0"},
          ${token}, NOW(), true, true, NOW(), NOW(),
          'online', ${pairCode}, ${fingerprint}, ${pairing.user_id || null}, ${pairing.department_id || null}
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

    return res.json({ token, deviceId });
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

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
    }

    const client = await getRawClient();
    if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

    const users = await client`
      SELECT id, email, password, "empresaId", name
      FROM users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `.catch(() => []);
    const user = users[0];
    if (!user?.password) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    if (deviceId > 0) {
      await client`
        UPDATE monitor_agentes
        SET user_id = ${user.id}, "empresaId" = ${user.empresaId}, "updatedAt" = NOW()
        WHERE id = ${deviceId}
      `.catch(() => {});
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        empresaId: user.empresaId,
      },
    });
  } catch (error) {
    console.error("[Agent Auth Login] Falha:", error);
    return res.status(500).json({ error: "AGENT_LOGIN_FAILED" });
  }
});

app.post("/api/agent/metrics", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return res.status(401).json({ error: "TOKEN_REQUIRED" });

    const client = await getRawClient();
    if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

    const agents = await client`SELECT * FROM monitor_agentes WHERE token=${token} LIMIT 1`.catch(() => []);
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
          gpus, sensores, "memoriaSlots"
        )
        VALUES (
          ${agent.id}, ${agent.empresaId}, ${metric.coletadoEm}, ${metric.cpuUso}, ${metric.cpuTemp}, ${metric.cpuFreqMhz},
          ${metric.ramTotalMb}, ${metric.ramUsadaMb}, ${metric.ramUsoPct}, ${metric.discoTotalGb}, ${metric.discoUsadoGb},
          ${metric.discoUsoPct}, ${metric.redeEnviadoKb}, ${metric.redeRecebidoKb}, ${metric.latenciaMs}, ${metric.processos},
          ${metric.anydeskId}, ${metric.usuarioLogado}, ${metric.uptime}, ${metric.topProcessos},
          ${metric.placaMaeModelo}, ${metric.placaMaeFabricante}, ${metric.socketCpu}, ${metric.biosVersao},
          ${metric.gpus}, ${metric.sensores}, ${metric.memoriaSlots}
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
            "cpuModel"=COALESCE(${metric.cpuModel}, "cpuModel"),
            "gpuModel"=COALESCE(${metric.gpuModel}, "gpuModel"),
            "placaMaeModelo"=COALESCE(${metric.placaMaeModelo}, "placaMaeModelo"),
            "socketCpu"=COALESCE(${metric.socketCpu}, "socketCpu")
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
    return res.status(202).json({ success: false, queued: true, warning: "METRICS_DEGRADED" });
  }
});

app.get("/api/agent/profile", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const profileRows = await client`
    SELECT a.*,
      e.nome as empresa_nome,
      u.name as usuario_nome,
      u.email as usuario_email,
      (
        SELECT row_to_json(mm)
        FROM (
          SELECT "coletadoEm","cpuUso","ramUsoPct","discoUsoPct","anydeskId","usuarioLogado",uptime
          FROM monitor_metricas
          WHERE "agenteId" = a.id
          ORDER BY "coletadoEm" DESC
          LIMIT 1
        ) mm
      ) as ultima_metrica
    FROM monitor_agentes a
    LEFT JOIN empresas e ON e.id = a."empresaId"
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.id = ${agent.id}
    LIMIT 1
  `.catch(() => []);

  return res.json(profileRows[0] ?? null);
});

app.get("/api/agent/tickets", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  if (!agent.user_id) {
    return res.json([]);
  }

  const rows = await client`
    SELECT id, protocolo, titulo, descricao, categoria, prioridade, status, "createdAt", "updatedAt", "resolvidoEm"
    FROM tickets_ti
    WHERE "empresaId" = ${agent.empresaId}
      AND "solicitanteId" = ${agent.user_id}
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
  if (!agent.user_id) {
    return res.status(400).json({ error: "AGENT_NOT_ASSOCIATED_TO_USER" });
  }

  const titulo = String(req.body?.titulo || "").trim();
  const descricao = String(req.body?.descricao || "").trim();
  const categoria = String(req.body?.categoria || "hardware");
  const prioridade = String(req.body?.prioridade || "media");

  if (!titulo || titulo.length < 2) {
    return res.status(400).json({ error: "Informe o título do chamado." });
  }
  if (!descricao || descricao.length < 5) {
    return res.status(400).json({ error: "Informe a descrição do chamado." });
  }

  const protocolo = `TI-${Date.now().toString(36).toUpperCase()}`;
  const enrichedDescription = `${descricao}\n\nDispositivo vinculado: ${agent.hostname}\nAgente: ${agent.id}`;

  const rows = await client`
    INSERT INTO tickets_ti (
      "empresaId", "solicitanteId", protocolo, titulo, descricao,
      categoria, prioridade, status, "createdAt", "updatedAt"
    ) VALUES (
      ${agent.empresaId}, ${agent.user_id}, ${protocolo}, ${titulo}, ${enrichedDescription},
      ${categoria}, ${prioridade}, 'aberto', NOW(), NOW()
    ) RETURNING id, protocolo, titulo, status, "createdAt"
  `.catch(() => []);

  const ticket = rows[0];
  if (!ticket) return res.status(500).json({ error: "TICKET_CREATE_FAILED" });

  await client`
    INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
    VALUES (
      ${ticket.id},
      ${agent.empresaId},
      ${agent.user_id},
      ${`Chamado aberto pelo agente do dispositivo ${agent.hostname}.`},
      'sistema',
      NOW()
    )
  `.catch(() => {});

  await client`
    INSERT INTO ticket_status_history ("ticketId","empresaId","changedBy","fromStatus","toStatus",motivo,"createdAt")
    VALUES (${ticket.id}, ${agent.empresaId}, ${agent.user_id}, ${null}, 'aberto', ${'Chamado aberto pelo agente'}, NOW())
  `.catch(() => {});

  res.json(ticket);
});

app.get("/api/agent/tickets/:id/messages", requireAgent, async (req, res) => {
  const agent = (req as any).agent;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });
  if (!agent.user_id) {
    return res.status(400).json({ error: "AGENT_NOT_ASSOCIATED_TO_USER" });
  }

  const ticketId = Number(req.params.id);
  const ticketRows = await client`
    SELECT id
    FROM tickets_ti
    WHERE id = ${ticketId}
      AND "empresaId" = ${agent.empresaId}
      AND "solicitanteId" = ${agent.user_id}
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
  if (!agent.user_id) {
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
      AND "solicitanteId" = ${agent.user_id}
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
      ${agent.user_id},
      ${conteudo || ""},
      ${fileUrl ? "anexo" : "mensagem"},
      ${fileUrl || null},
      ${fileName || null},
      ${fileType || null},
      NOW()
    )
    RETURNING *
  `.catch(() => []);

  res.json(rows[0] ?? { success: false });
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

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
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { runInlineMigrations } from "./inline_migrations";
import { getRawClient } from "./db";
import { sdk } from "./_core/sdk";

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

const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ANY_VERCEL_REGEX.test(origin)) return true;
  if (origin.startsWith("http://localhost")) return true;
  return false;
};

const app = express();
const port = Number(process.env.PORT) || 8080;

app.set("trust proxy", true);
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
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
  };
};

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

  const rows = await client`
    SELECT a.*,
      (SELECT "coletadoEm" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as ultima_coleta,
      (SELECT "cpuUso" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as cpu_atual,
      (SELECT "ramUsoPct" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as ram_atual,
      (SELECT "discoUsoPct" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as disco_atual,
      (SELECT "anydeskId" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as anydesk_id_atual
    FROM monitor_agentes a
    WHERE a."empresaId"=${user.empresaId} AND a."deletedAt" IS NULL
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
  await client`
    UPDATE monitor_agentes
    SET user_id=${userId || null}, department_id=${departmentId || null}, "updatedAt"=NOW()
    WHERE id=${agentId} AND "empresaId"=${user.empresaId}
  `;
  res.json({ success: true });
});

app.post("/api/agents/generate-pairing-code", requireUser, async (req, res) => {
  const user = (req as any).user;
  const client = await getRawClient();
  if (!client) return res.status(500).json({ error: "DATABASE_UNAVAILABLE" });

  const { userId, departmentId } = req.body ?? {};
  const requestedEmpresaId = Number(req.body?.empresaId || user.empresaId || user.activeCompanyId || 0);
  const empresaId = Number.isFinite(requestedEmpresaId) && requestedEmpresaId > 0 ? requestedEmpresaId : 0;
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

    await client`
      INSERT INTO monitor_metricas (
        "agenteId", "empresaId", "coletadoEm", "cpuUso", "cpuTemp", "cpuFreqMhz",
        "ramTotalMb", "ramUsadaMb", "ramUsoPct", "discoTotalGb", "discoUsadoGb",
        "discoUsoPct", "redeEnviadoKb", "redeRecebidoKb", "latenciaMs", processos,
        "anydeskId", "usuarioLogado", uptime, "topProcessos"
      )
      VALUES (
        ${agent.id}, ${agent.empresaId}, ${metric.coletadoEm}, ${metric.cpuUso}, ${metric.cpuTemp}, ${metric.cpuFreqMhz},
        ${metric.ramTotalMb}, ${metric.ramUsadaMb}, ${metric.ramUsoPct}, ${metric.discoTotalGb}, ${metric.discoUsadoGb},
        ${metric.discoUsoPct}, ${metric.redeEnviadoKb}, ${metric.redeRecebidoKb}, ${metric.latenciaMs}, ${metric.processos},
        ${metric.anydeskId}, ${metric.usuarioLogado}, ${metric.uptime}, ${metric.topProcessos}
      )
    `;

    await client`
      UPDATE monitor_agentes
      SET status='online', online=true, "ultimoContato"=NOW(), "updatedAt"=NOW()
      WHERE id=${agent.id}
    `;

    return res.json({ success: true });
  } catch (error) {
    console.error("[Agent Metrics] Falha:", error);
    return res.status(500).json({ error: "METRICS_FAILED" });
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
  if (!conteudo) return res.status(400).json({ error: "MESSAGE_REQUIRED" });

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
    INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
    VALUES (${ticketId}, ${agent.empresaId}, ${agent.user_id}, ${conteudo}, 'mensagem', NOW())
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

// Servir o frontend React (Vite build) - Essencial para evitar tela branca
const DIST_PATH = path.join(process.cwd(), "dist");
if (fs.existsSync(DIST_PATH)) {
  console.log(`[Server] Servindo frontend de: ${DIST_PATH}`);
  app.use(express.static(DIST_PATH));
  
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(DIST_PATH, "index.html"));
  });
} else {
  console.warn(`[Server] Pasta 'dist' não encontrada em: ${DIST_PATH}`);
  app.get("/", (_req, res) => res.status(200).json({ status: "online", message: "Synapse API (Frontend não encontrado)" }));
}

const shouldRunInlineMigrations =
  process.env.RUN_INLINE_MIGRATIONS === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.RUN_INLINE_MIGRATIONS !== "false");

app.listen(port, () => {
  console.log(`[Server] Rodando na porta ${port}`);
  if (shouldRunInlineMigrations) {
    runInlineMigrations()
      .then(() => {
        console.log("[Migration] ✅ Tabelas verificadas");
        // checkCertificadosVencimento().catch(e => console.error("[Certificados] Erro:", e));
      })
      .catch((err) => console.error("[Migration] ❌ Erro:", err));
  } else {
    console.log("[Migration] Inline migrations desativadas neste ambiente.");
  }
});

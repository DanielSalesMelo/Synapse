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
  const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = `SYNC-${part1}-${part2}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await client`
    INSERT INTO agent_pairing_codes ("empresaId", codigo, "criadoPor", "expiresAt", user_id, department_id, "createdAt")
    VALUES (${user.empresaId}, ${code}, ${user.id}, ${expiresAt}, ${userId || null}, ${departmentId || null}, NOW())
  `;

  res.json({ code, expiresAt });
});

app.get("/api/agent/download/windows", (_req, res) => {
  res.download(path.join(AGENT_DIR, "synapse-agent.exe"), "synapse-agent.exe");
});

app.get("/api/agent/download/windows-installer", (_req, res) => {
  res.download(path.join(AGENT_DIR, "install_windows.bat"), "instalar_agente.bat");
});

app.get("/api/agent/download/linux", (_req, res) => {
  res.download(path.join(AGENT_DIR, "install_linux.sh"), "install_linux.sh");
});

app.get("/api/agent/download/agent", (_req, res) => {
  res.download(path.join(AGENT_DIR, "synapse_agent.py"), "synapse_agent.py");
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

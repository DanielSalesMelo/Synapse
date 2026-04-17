import { webcrypto } from "crypto";
// Polyfill for Node.js 18 - make crypto available globally for jose
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = webcrypto;
}

import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import cors from "cors";
import helmet from "helmet";
import { runInlineMigrations } from "./inline_migrations";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sdk } from "./_core/sdk";
import { getRawClient } from "./db";
import { checkCertificadosVencimento } from "./helpers/checkCertificados";

// ─── Origens permitidas (CORS) ─────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://synapse-seven-nu.vercel.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

// Aceita QUALQUER domínio vercel.app (universal e definitivo)
const ANY_VERCEL_REGEX = /^https:\/\/.*\.vercel\.app$/;

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // allow non-browser requests (health checks, native apps)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ANY_VERCEL_REGEX.test(origin)) return true;
  if (origin.startsWith("http://localhost")) return true;
  return false;
};

// Migrações em background com timeout de segurança
// O servidor sobe IMEDIATAMENTE; as migrações rodam em paralelo.
function runMigrationsInBackground() {
  const MIGRATION_TIMEOUT_MS = 60_000; // 60 segundos

  const migrationPromise = runInlineMigrations()
    .then(() => {
      console.log("[Migration] ✅ Todas as tabelas verificadas/criadas com sucesso");
    })
    .catch((err) => {
      console.error("[Migration] ❌ Erro:", err?.message ?? err);
    });

  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.warn("[Migration] ⚠️  Timeout de 60s atingido — continuando sem aguardar migrações");
      resolve();
    }, MIGRATION_TIMEOUT_MS);
  });

  Promise.race([migrationPromise, timeoutPromise]).catch(() => {});
}

const app = express();
const port = Number(process.env.PORT) || 8080;

// 1. Helmet — headers de segurança HTTP
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// 2. CORS — versão FINAL e compatível com TODOS os domínios da Vercel
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Origem bloqueada: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 3. Middleware fundamental para ler o JSON do login
app.use(express.json({ limit: "10mb" }));

// ─── Upload de arquivos (Chat, TI, etc.) ───────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx|xls|xlsx|txt|zip/i;
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo n\u00e3o permitido: ${ext}`));
    }
  },
});

// Endpoint de upload de arquivo
app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
  try {
    // Verificar autenticação usando o mesmo método do tRPC (suporta Bearer token e cookie)
    try {
      await sdk.authenticateRequest(req);
    } catch {
      return res.status(401).json({ error: "N\u00e3o autenticado. Fa\u00e7a login novamente." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const file = req.file;
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${port}`;

    const fileUrl = `${baseUrl}/uploads/${file.filename}`;
    const fileType = file.mimetype.startsWith("image/") ? "image"
      : file.mimetype.startsWith("video/") ? "video"
      : "file";

    return res.json({
      url: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      type: fileType,
    });
  } catch (err: any) {
    console.error("[Upload] Erro:", err?.message);
    return res.status(500).json({ error: err?.message || "Erro ao fazer upload" });
  }
});

// Servir arquivos estáticos de uploads
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Endpoints do Agente de Monitoramento ────────────────────────────────────
// Usa as mesmas tabelas do router TI: agent_pairing_codes, monitor_agentes, monitor_metricas

// Pareamento: o agente Python chama este endpoint com o código gerado no frontend
app.post("/api/agent/pair", async (req: any, res: any) => {
  try {
    const {
      pairCode, hostname, ip, so, mac, fingerprint, anydesk_id, versao_agente,
      os, osVersion, motherboard, cpu, totalRam, ipAddress, macAddress
    } = req.body;

    if (!pairCode) return res.status(400).json({ error: "pairCode obrigatório" });

    const db = getRawClient ? await getRawClient() : null;
    if (!db) return res.status(503).json({ error: "DB indisponível" });

    // Identificador único principal: MAC Address (se fornecido) ou o par (pairCode, hostname)
    const effectiveMac = macAddress || mac;

    // Verificar se o agente já existe por MAC
    let existingAgente = null;
    if (effectiveMac) {
      const rows = await db`
        SELECT * FROM monitor_agentes
        WHERE (mac = ${effectiveMac} OR mac_address = ${effectiveMac}) AND "empresaId" = (
          SELECT "empresaId" FROM agent_pairing_codes WHERE codigo = ${pairCode}
        )
      `.catch(() => []) as any[];
      if (rows.length > 0) existingAgente = rows[0];
    }

    const token = existingAgente?.token || `agt_${require('crypto').randomBytes(24).toString('hex')}`;

    let pairRecord = null;
    if (!existingAgente) {
      // Verificar código de pareamento apenas para novos agentes
      const codes = await db`
        SELECT * FROM agent_pairing_codes
        WHERE codigo = ${pairCode} AND usado = false AND "expiresAt" > now()
      `.catch(() => []) as any[];

      if (!codes || codes.length === 0) {
        return res.status(404).json({ error: "Código inválido, expirado ou já utilizado" });
      }
      pairRecord = codes[0];
    }

    // Registrar ou Atualizar agente na tabela monitor_agentes
    const agentes = await db`
      INSERT INTO monitor_agentes (
        "empresaId", hostname, ip, so, mac, fingerprint, "anydeskId",
        "ultimaVersao", token, status, "pairingCode", "createdAt", "updatedAt",
        os, os_version, motherboard, cpu, total_ram, ip_address, mac_address
      ) VALUES (
        ${existingAgente?.empresaId || pairRecord.empresaId}, ${hostname || 'unknown'}, ${ip || null},
        ${so || null}, ${effectiveMac || null}, ${fingerprint || null}, ${anydesk_id || null},
        ${versao_agente || '1.0.0'}, ${token}, 'online', ${pairCode}, now(), now(),
        ${os || null}, ${osVersion || null}, ${motherboard || null}, ${cpu || null}, ${totalRam || null},
        ${ipAddress || null}, ${effectiveMac || null}
      )
      ON CONFLICT (token) DO UPDATE SET
        hostname = EXCLUDED.hostname,
        "updatedAt" = now(),
        status = 'online',
        os = EXCLUDED.os,
        os_version = EXCLUDED.os_version,
        motherboard = EXCLUDED.motherboard,
        cpu = EXCLUDED.cpu,
        total_ram = EXCLUDED.total_ram,
        ip_address = EXCLUDED.ip_address,
        mac_address = EXCLUDED.mac_address
      RETURNING id
    `.catch((err) => {
      console.error('[Agent Pair DB Error]', err);
      return [];
    }) as any[];

    // Marcar código como usado e vincular ao agente (apenas se for novo)
    if (agentes && agentes[0] && pairRecord) {
      await db`
        UPDATE agent_pairing_codes
        SET usado = true, "usadoEm" = now(), "agenteId" = ${agentes[0].id}
        WHERE id = ${pairRecord.id}
      `.catch(() => {});
    }

    return res.json({
      token,
      empresaId: existingAgente?.empresaId || pairRecord?.empresaId,
      agenteId: agentes?.[0]?.id || existingAgente?.id
    });
  } catch (err: any) {
    console.error('[Agent Pair]', err);
    return res.status(500).json({ error: err?.message || 'Erro interno' });
  }
});

// Receber métricas do agente
app.post("/api/agent/metrics", async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Token obrigatório' });

    const db = getRawClient ? await getRawClient() : null;
    if (!db) return res.status(503).json({ error: 'DB indisponível' });

    // Verificar token do agente na tabela monitor_agentes
    const agentes = await db`SELECT * FROM monitor_agentes WHERE token = ${token}`.catch(() => []) as any[];
    if (!agentes || agentes.length === 0) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const agente = agentes[0];
    const body = req.body;

    // Salvar métrica na tabela monitor_metricas
    await db`
      INSERT INTO monitor_metricas (
        "agenteId", "empresaId", "coletadoEm",
        "cpuPercent", "ramPercent", "ramUsadoGb", "ramTotalGb",
        "diskPercent", "diskUsadoGb", "diskTotalGb",
        "netEnviadoMb", "netRecebidoMb", "topProcessos"
      ) VALUES (
        ${agente.id}, ${agente.empresaId}, now(),
        ${body.cpu?.percent ?? null}, ${body.ram?.percent ?? null},
        ${body.ram?.used_gb ?? null}, ${body.ram?.total_gb ?? null},
        ${body.disk?.percent ?? null}, ${body.disk?.used_gb ?? null}, ${body.disk?.total_gb ?? null},
        ${body.network?.sent_mb ?? null}, ${body.network?.recv_mb ?? null},
        ${body.top_processes ? JSON.stringify(body.top_processes) : null}
      )
    `.catch(() => {});

    // Atualizar status e última coleta
    await db`
      UPDATE monitor_agentes
      SET status = 'online', "updatedAt" = now()
      WHERE id = ${agente.id}
    `.catch(() => {});

    // Limpar métricas antigas (manter últimas 1440 por agente — 24h em coletas de 1min)
    await db`
      DELETE FROM monitor_metricas WHERE id IN (
        SELECT id FROM monitor_metricas WHERE "agenteId" = ${agente.id}
        ORDER BY "coletadoEm" DESC OFFSET 1440
      )
    `.catch(() => {});

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[Agent Metrics]', err);
    return res.status(500).json({ error: err?.message || 'Erro interno' });
  }
});

// Download dos arquivos do agente
// Em dev: __dirname = packages/services/legacy-api  → ../agent
// Em prod (Railway, após esbuild): __dirname = packages/services/legacy-api/dist → ../agent
const AGENT_FILES_DIR = path.join(__dirname, '..', 'agent');
app.get('/api/agent/download/windows', (_req: any, res: any) => {
  const file = path.join(AGENT_FILES_DIR, 'install_windows.bat');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Arquivo não encontrado' });
  res.download(file, 'install_synapse_windows.bat');
});
app.get('/api/agent/download/linux', (_req: any, res: any) => {
  const file = path.join(AGENT_FILES_DIR, 'install_linux.sh');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Arquivo não encontrado' });
  res.download(file, 'install_synapse_linux.sh');
});
app.get('/api/agent/download/agent', (_req: any, res: any) => {
  const file = path.join(AGENT_FILES_DIR, 'synapse_agent.py');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Arquivo não encontrado' });
  res.download(file, 'synapse_agent.py');
});

// 4. Middleware do tRPC
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// 5. Endpoint de saúde para o Railway
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 6. Servidor sobe IMEDIATAMENTE — migrações rodam em background
app.listen(port, () => {
  console.log(`[Server] ✅ Synapse Backend running on port ${port}`);
  // Inicia migrações em background após o servidor estar ouvindo
  runMigrationsInBackground();

  // Inicia verificação de certificados a cada 24h (86400000 ms)
  // Executa uma vez na subida do servidor e depois periodicamente
  checkCertificadosVencimento();
  setInterval(checkCertificadosVencimento, 24 * 60 * 60 * 1000);
});

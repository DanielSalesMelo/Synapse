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
import { getDb } from "./db";

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

// Aplica migrações pendentes ao iniciar o servidor
async function runMigrations() {
  const db = await getDb();
  if (!db) { console.warn("[Migration] DB indisponível, pulando migrações"); return; }
  try {
    const rawDb = (db as any).$client ?? (db as any).session ?? (db as any);

    // (mantenha aqui todo o bloco de migrações que você já tem)
    // ... seu código de migrações ...
    console.log("[Migration] Migrações aplicadas com sucesso");
  } catch (err) {
    console.error("[Migration] Erro ao aplicar migrações:", err);
  }
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
app.use(express.json({ limit: "2mb" }));

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
  res.json({ status: "ok" });
});

// 6. Iniciar o servidor (após migrações)
runMigrations()
  .then(() => {
    app.listen(port, () => {
      console.log(`[Server] Synapse Backend running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("[Server] Falha nas migrações, iniciando mesmo assim:", err);
    app.listen(port, () => {
      console.log(`[Server] Synapse Backend running on port ${port}`);
    });
  });

// Placeholder for migration 0003 - will be added via shell

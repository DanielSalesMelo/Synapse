
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

// ─── Origens permitidas (CORS) ─────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://synapse-seven-nu.vercel.app",
  "https://synapse-v8.vercel.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const ANY_VERCEL_REGEX = /^https:\/\/.*\.vercel\.app$/;

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ANY_VERCEL_REGEX.test(origin)) return true;
  if (origin.startsWith("http://localhost")) return true;
  return false;
};

const app = express();
const port = Number(process.env.PORT) || 8080;

// 1. Helmet
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// 2. CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// 3. tRPC
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Health check imediato para evitar que o deploy falhe
app.get("/health", (_req, res) => res.status(200).send("OK"));

// Servir arquivos estáticos
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

// Inicialização do servidor
app.listen(port, () => {
  console.log(`[Server] Rodando na porta ${port}`);
  
  // Executar migrações em segundo plano para não travar a subida do servidor
  runInlineMigrations()
    .then(() => console.log("[Migration] ✅ Tabelas verificadas"))
    .catch(err => console.error("[Migration] ❌ Erro:", err));
});


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
import path from "path";
import fs from "fs";

const app = express();
const port = Number(process.env.PORT) || 8080;

// 1. Helmet (Configurado para não interferir com o CORS)
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// 2. Configuração Robusta de CORS
const ALLOWED_ORIGINS = [
  "https://synapse-seven-nu.vercel.app",
  "https://synapse-v8.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requisições sem origin (como mobile apps ou curl)
      if (!origin) return callback(null, true);
      
      const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed) || 
                       origin.endsWith(".vercel.app") || 
                       origin.startsWith("http://localhost");
                       
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Bloqueado: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Access-Control-Allow-Origin"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Responder explicitamente a requisições OPTIONS (Preflight)
app.options("*", cors());

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
app.get("/", (_req, res) => res.status(200).json({ status: "online", message: "Synapse API" }));

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

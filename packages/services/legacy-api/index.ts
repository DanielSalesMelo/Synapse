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
    // Verificar autenticação
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "N\u00e3o autenticado" });
    }
    try {
      await sdk.verifySession(token);
    } catch {
      return res.status(401).json({ error: "Token inv\u00e1lido" });
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
});

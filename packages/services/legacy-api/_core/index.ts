import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import cors from "cors";

// Aceita QUALQUER domínio vercel.app (universal e definitivo)
const ANY_VERCEL_REGEX = /^https:\/\/.*\.vercel\.app$/;

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // mobile, railway, etc.
  if (origin.startsWith("http://localhost")) return true;
  if (ANY_VERCEL_REGEX.test(origin)) return true;
  return false;
};

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // CORS corrigido (versão final)
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

  // Body parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

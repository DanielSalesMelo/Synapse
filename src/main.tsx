
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://b3b915a2f47d3e6492c11b46adf08a3b@o4511192032739328.ingest.us.sentry.io/4511192045780992",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { Toaster } from "sonner";
import "./index.css";
import "./lib/i18n";

const queryClient = new QueryClient();

let UNAUTHED_ERR_MSG = 'Please login (10001)'; // Fallback

// Busca configurações da API de forma assíncrona
fetch('https://rotiq-production.up.railway.app/api/config')
  .then(res => res.json())
  .then(config => {
    if (config.UNAUTHED_ERR_MSG) {
      UNAUTHED_ERR_MSG = config.UNAUTHED_ERR_MSG;
    }
  })
  .catch(err => console.error('Erro ao carregar config da API:', err));

// Função para redirecionar ao login se o usuário não estiver autenticado
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;
  window.location.href = "/login";
};

// Monitoramento de erros em Queries
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

// Monitoramento de erros em Mutations (Login/Cadastro)
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// CONFIGURAÇÃO INTELIGENTE DA URL DO SERVIDOR
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Se estiver no PC (localhost), fala com a porta 3000.
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }
    // Na Vercel ou em produção, usa o backend Railway
    return "https://rotiq-production.up.railway.app";
  }
  // Fallback para requisições relativas
  return "";
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        const token = localStorage.getItem("rotiq-auth-token");
        return {
          Authorization: token ? `Bearer ${token}` : undefined,
        };
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Renderização Principal do App
createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </trpc.Provider>
);


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

// ─── Constantes de Autenticação ──────────────────────────────────────────────
const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";
const UNAUTHED_ERR_MSG = 'Please login (10001)';

// ─── Recupera usuário do localStorage para pré-popular o cache ────────────────
function getPersistedUser() {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
    if (!raw || raw === "null" || raw === "undefined") return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ─── QueryClient com staleTime global e cache pré-populado ───────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        // Não tenta novamente se for erro de autenticação
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) return false;
        return failureCount < 1;
      },
      retryDelay: 1000,
      refetchOnWindowFocus: true,
    },
  },
});

// Pré-popula o cache com o usuário do localStorage ANTES do primeiro render
const persistedUser = getPersistedUser();
if (persistedUser) {
  queryClient.setQueryData([["auth", "me"]], persistedUser);
}

// Função para redirecionar ao login se o usuário não estiver autenticado
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  // Limpa o cache do usuário antes de redirecionar
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("synapse-user");
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

// Monitoramento de erros em Mutations
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// CONFIGURAÇÃO DA URL DO SERVIDOR
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    return import.meta.env.VITE_API_URL || "https://synapse-producion.up.railway.app";
  }
  return "";
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
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

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </trpc.Provider>
);

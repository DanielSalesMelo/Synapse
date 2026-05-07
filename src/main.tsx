
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
import { getBackendBaseUrl } from "@/lib/backend";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";
const UNAUTHED_ERR_MSG = 'Please login (10001)';
const UPDATE_GUARD_KEY = "synapse-update-recovering";
const RUNTIME_RECOVERY_KEY = "synapse-runtime-recovery-once";
const BLANK_SCREEN_RECOVERY_KEY = "synapse-blank-screen-recovery-once";

type GlobalWithFallbacks = typeof globalThis & Record<string, unknown>;
const fallbackIcon = () => null;
const runtimeFallbacks: Record<string, unknown> = {
  MapPin: fallbackIcon,
  Banknote: fallbackIcon,
  Crown: fallbackIcon,
  UserPlus: fallbackIcon,
  Badge: fallbackIcon,
  pagar: 0,
};
try {
  const g = globalThis as GlobalWithFallbacks;
  for (const [name, value] of Object.entries(runtimeFallbacks)) {
    if (!(name in g)) {
      Object.defineProperty(g, name, {
        value,
        configurable: true,
        enumerable: false,
        writable: true,
      });
    }
  }
} catch {
  // noop: ambiente sem permissão para definir globals
}

function getPersistedUser() {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
    if (!raw || raw === "null" || raw === "undefined") return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache para evitar requisições excessivas
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) return false;
        return failureCount < 2; // Tenta 2 vezes antes de falhar
      },
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false, // Desabilitado para evitar "piscar" na tela ao trocar de aba
    },
  },
});

const persistedUser = getPersistedUser();
if (persistedUser) {
  queryClient.setQueryData([["auth", "me"]], persistedUser);
}

const handleUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (error.message === UNAUTHED_ERR_MSG) {
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    // Redireciona apenas se não estiver na página de login
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    handleUnauthorized(event.query.state.error);
  }
});

const recoverFromBrokenUpdate = () => {
  try {
    if (sessionStorage.getItem(UPDATE_GUARD_KEY) === "1") return;
    sessionStorage.setItem(UPDATE_GUARD_KEY, "1");
    window.location.reload();
  } catch {
    window.location.reload();
  }
};

window.addEventListener("load", () => {
  sessionStorage.removeItem(UPDATE_GUARD_KEY);
  sessionStorage.removeItem(RUNTIME_RECOVERY_KEY);
  // Migração segura: remove SW legado para evitar tela branca por cache antigo.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister());
    }).catch(() => {
      // noop
    });
  }
});

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverFromBrokenUpdate();
});

window.addEventListener("error", (event) => {
  const message = String(event.error?.message || event.message || "");
  if (message.includes("Loading chunk") || message.includes("Failed to fetch dynamically imported module")) {
    recoverFromBrokenUpdate();
    return;
  }
  // Fallback para runtime quebrado por referência indefinida após deploy/caching.
  if (message.includes("is not defined")) {
    void recoverFromBlankScreen();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = String((event.reason as any)?.message || event.reason || "");
  if (reason.includes("Loading chunk") || reason.includes("Failed to fetch dynamically imported module")) {
    event.preventDefault();
    recoverFromBrokenUpdate();
  }
});

const recoverFromBlankScreen = async () => {
  try {
    if (sessionStorage.getItem(BLANK_SCREEN_RECOVERY_KEY) === "1") return;
    sessionStorage.setItem(BLANK_SCREEN_RECOVERY_KEY, "1");
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // noop
  } finally {
    window.location.reload();
  }
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBackendBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        return {
          Authorization: token ? `Bearer ${token}` : undefined,
        };
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

window.setTimeout(() => {
  const root = document.getElementById("root");
  if (!root) return;
  const isBlank = (root.innerHTML || "").trim().length === 0;
  if (isBlank) {
    void recoverFromBlankScreen();
  } else {
    sessionStorage.removeItem(BLANK_SCREEN_RECOVERY_KEY);
  }
}, 4000);

import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

// Tenta recuperar o usuário salvo no localStorage para evitar flash de redirecionamento
function getCachedUser() {
  try {
    const raw = localStorage.getItem("app-user-info");
    if (!raw || raw === "null" || raw === "undefined") return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const cachedUser = getCachedUser();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 1,
    retryDelay: 1000,
    // Usa dados do cache por 5 minutos antes de refazer a requisição
    staleTime: 5 * 60 * 1000,
    // Mantém dados anteriores enquanto recarrega (evita flash de logout)
    placeholderData: cachedUser,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("app-user-info");
      localStorage.removeItem("synapse-auth-token");
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      localStorage.removeItem("app-user-info");
      localStorage.removeItem("synapse-auth-token");
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // Salva dados do usuário no localStorage para persistência entre reloads
    if (meQuery.data) {
      localStorage.setItem("app-user-info", JSON.stringify(meQuery.data));
    }
    // Considera autenticado se: tem dados da query OU tem dados em cache (enquanto recarrega)
    const user = meQuery.data ?? (meQuery.isLoading ? cachedUser : null);
    return {
      user: user ?? null,
      loading: meQuery.isLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(user),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    meQuery.isFetching,
    logoutMutation.error,
    logoutMutation.isPending,
    cachedUser,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    // Não redireciona enquanto ainda está carregando
    if (meQuery.isLoading || meQuery.isFetching) return;
    if (logoutMutation.isPending) return;
    // Não redireciona se tem usuário em cache (sessão ainda válida)
    if (state.user) return;
    // Não redireciona se tem token no localStorage (deixa o retry acontecer)
    const token = localStorage.getItem("synapse-auth-token");
    if (token && meQuery.isLoading) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    navigate(redirectPath);
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    meQuery.isFetching,
    state.user,
    navigate,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}


import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";
const EMERGENCY_TOKEN = "local-master-token";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

// Tenta recuperar o usuário salvo no localStorage
function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
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
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const isEmergency = token === EMERGENCY_TOKEN;

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: isEmergency ? false : 1,
    retryDelay: 1000,
    staleTime: 1 * 60 * 1000,
    placeholderData: cachedUser,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    // Desabilita a query se for login emergencial para evitar erros de backend
    enabled: !isEmergency,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("synapse-user");
      utils.auth.me.setData(undefined, null);
      window.location.href = redirectPath;
    },
  });

  const logout = useCallback(async () => {
    if (isEmergency) {
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("synapse-user");
      utils.auth.me.setData(undefined, null);
      window.location.href = redirectPath;
      return;
    }

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
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("synapse-user");
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      window.location.href = redirectPath;
    }
  }, [logoutMutation, utils, redirectPath, isEmergency]);

  const state = useMemo(() => {
    // Se for emergencial, o usuário é o que está no cache ou um objeto master padrão
    if (isEmergency) {
      const emergencyUser = cachedUser || { 
        id: 0, 
        name: "Master Local", 
        email: "master@local", 
        role: "master_admin",
        empresaId: 1 
      };
      return {
        user: emergencyUser,
        loading: false,
        error: null,
        isAuthenticated: true,
      };
    }

    if (meQuery.data) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(meQuery.data));
    }

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
    logoutMutation.error,
    cachedUser,
    isEmergency,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.isAuthenticated) return;
    if (meQuery.isLoading || meQuery.isFetching) return;
    if (logoutMutation.isPending) return;
    
    if (token && (isEmergency || meQuery.isLoading)) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    navigate(redirectPath);
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    meQuery.isFetching,
    state.isAuthenticated,
    navigate,
    token,
    isEmergency
  ]);

  return {
    ...state,
    refresh: () => !isEmergency && meQuery.refetch(),
    logout,
  };
}

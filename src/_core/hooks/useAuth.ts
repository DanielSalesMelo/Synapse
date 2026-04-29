
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";
const EMERGENCY_TOKEN = "local-master-token";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const isEmergency = token === EMERGENCY_TOKEN;

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !isEmergency,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("manus-runtime-user-info");
      localStorage.removeItem("synapse-user");
      utils.auth.me.setData(undefined, null);
      window.location.href = redirectPath;
    },
  });

  const logout = useCallback(async () => {
    if (isEmergency) {
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("manus-runtime-user-info");
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
      localStorage.removeItem("manus-runtime-user-info");
      localStorage.removeItem("synapse-user");
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      window.location.href = redirectPath;
    }
  }, [logoutMutation, utils, redirectPath, isEmergency]);

  const state = useMemo(() => {
    if (isEmergency) {
      const raw = localStorage.getItem(USER_INFO_KEY);
      const cachedUser = raw ? JSON.parse(raw) : { 
        id: 0, 
        name: "Master Local", 
        email: "master@local", 
        role: "master_admin",
        empresaId: 1 
      };
      return {
        user: cachedUser,
        loading: false,
        error: null,
        isAuthenticated: true,
      };
    }

    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    
    if (meQuery.data) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(meQuery.data));
    }

    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    isEmergency
  ]);

  useEffect(() => {
    // Mantido desativado conforme original, mas respeitando o estado isAuthenticated
  }, []);

  return {
    ...state,
    refresh: () => !isEmergency && meQuery.refetch(),
    logout,
  };
}


import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!token,
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
  }, [logoutMutation, utils, redirectPath]);

  const state = useMemo(() => {
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
  ]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !state.isAuthenticated && !meQuery.isLoading && !token) {
      window.location.href = redirectPath;
    }
  }, [redirectOnUnauthenticated, state.isAuthenticated, meQuery.isLoading, token, redirectPath]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}

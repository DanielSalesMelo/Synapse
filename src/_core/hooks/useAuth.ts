
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";
const AUTH_AT_KEY = "synapse-auth-at";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const sessionExpired = useMemo(() => {
    if (typeof window === "undefined") return false;
    const authAt = Number(localStorage.getItem(AUTH_AT_KEY) || "0");
    if (!authAt) return false;
    return Date.now() - authAt > SESSION_TTL_MS;
  }, []);

  useEffect(() => {
    if (!sessionExpired) return;
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_AT_KEY);
    localStorage.removeItem("manus-runtime-user-info");
    localStorage.removeItem("synapse-user");
  }, [sessionExpired]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!token && !sessionExpired,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_AT_KEY);
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
      localStorage.removeItem(AUTH_AT_KEY);
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

  const hasUnauthorizedError = useMemo(() => {
    const err = meQuery.error;
    if (!(err instanceof TRPCClientError)) return false;
    return (
      err.data?.code === "UNAUTHORIZED" ||
      String(err.message || "").includes("Please login (10001)")
    );
  }, [meQuery.error]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.isAuthenticated) return;
    if (meQuery.isLoading || meQuery.isFetching || logoutMutation.isPending) return;
    if (typeof window === "undefined") return;

    if (hasUnauthorizedError) {
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_AT_KEY);
      localStorage.removeItem("manus-runtime-user-info");
      localStorage.removeItem("synapse-user");
    }

    if (!token || hasUnauthorizedError || sessionExpired) {
      window.location.href = redirectPath;
    }
  }, [
    redirectOnUnauthenticated,
    state.isAuthenticated,
    meQuery.isLoading,
    meQuery.isFetching,
    logoutMutation.isPending,
    token,
    sessionExpired,
    redirectPath,
    hasUnauthorizedError,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}

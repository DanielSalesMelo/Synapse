
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

  const cachedUser = getCachedUser();
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const isEmergency = token === EMERGENCY_TOKEN;

  const logout = useCallback(async () => {
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("synapse-user");
    window.location.href = redirectPath;
  }, [redirectPath]);

  const state = useMemo(() => {
    if (isEmergency) {
      const emergencyUser = cachedUser || { 
        id: "admin-local",
        email: "admin@local",
        name: "Daniel Sales",
        role: "MASTER",
        isMasterAdmin: true
      };
      return {
        user: emergencyUser,
        loading: false,
        error: null,
        isAuthenticated: true,
      };
    }

    return {
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
    };
  }, [cachedUser, isEmergency]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.isAuthenticated) return;
    
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    navigate(redirectPath);
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.isAuthenticated,
    navigate
  ]);

  return {
    ...state,
    refresh: () => {},
    logout,
  };
}

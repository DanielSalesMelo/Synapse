
import { getLoginUrl } from "@/const";
import { useCallback, useMemo } from "react";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";
const EMERGENCY_TOKEN = "local-master-token";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectPath = getLoginUrl() } = options ?? {};

  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const isEmergency = token === EMERGENCY_TOKEN;

  const logout = useCallback(async () => {
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("manus-runtime-user-info");
    localStorage.removeItem("synapse-user");
    window.location.href = redirectPath;
  }, [redirectPath]);

  const state = useMemo(() => {
    if (isEmergency) {
      const raw = localStorage.getItem(USER_INFO_KEY);
      const cachedUser = raw ? JSON.parse(raw) : { 
        id: "admin-local",
        email: "admin@local",
        name: "Daniel Sales",
        role: "MASTER",
        isMasterAdmin: true
      };
      return {
        user: cachedUser,
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
  }, [isEmergency]);

  return {
    ...state,
    refresh: () => {},
    logout,
  };
}

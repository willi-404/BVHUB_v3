import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../../lib/pocketbase";
import { clearAuthSession, loginWithPassword, refreshSession, requestOtp, softLogout, verifyOtp } from "./authService";
import { toAuthUser, type AuthUser } from "./policy";
import { getTokenExpiry, resolveSessionDecision } from "./session";
import { initializeCsrfToken } from "../../lib/csrf";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  requestOtp: (email: string) => Promise<string>;
  verifyOtp: (otpId: string, otp: string) => Promise<AuthUser>;
  loginWithPassword: (identity: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const fallbackAuth: AuthContextValue = {
  status: "unauthenticated",
  requestOtp,
  verifyOtp,
  loginWithPassword,
  logout: () => pb.authStore.clear(),
};

const AuthContext = createContext<AuthContextValue>(fallbackAuth);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    initializeCsrfToken();

    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const expireLocally = () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      softLogout(queryClient);
      if (mounted) {
        setUser(null);
        setStatus("unauthenticated");
      }
    };
    const unsubscribe = pb.authStore.onChange((token, record) => {
      if (!mounted) return;
      if (!token) queryClient.clear();
      const nextUser = record && typeof record === "object" ? toAuthUser(record as unknown as Record<string, unknown>) : null;
      setUser(nextUser);
      queryClient.setQueryData(["auth", "user"], nextUser);
      setStatus(resolveSessionDecision(pb.authStore.isValid, nextUser));
      if (expiryTimer) clearTimeout(expiryTimer);
      if (!token) return;
      const expiry = getTokenExpiry(token);
      if (expiry === null || expiry <= Math.floor(Date.now() / 1000)) {
        expireLocally();
        return;
      }
      expiryTimer = setTimeout(expireLocally, Math.max(0, (expiry * 1000) - Date.now() + 5000));
    });

    async function bootstrap() {
      if (!pb.authStore.isValid) {
        pb.authStore.clear();
        if (mounted) {
          setUser(null);
          setStatus("unauthenticated");
        }
        return;
      }

      try {
        const refreshedUser = await refreshSession();
        if (mounted) {
          setUser(refreshedUser);
          setStatus("authenticated");
        }
      } catch {
        if (mounted) {
          clearAuthSession(pb.authStore, queryClient);
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    }

    void bootstrap();
    return () => {
      mounted = false;
      if (expiryTimer) clearTimeout(expiryTimer);
      unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    requestOtp,
    verifyOtp,
    loginWithPassword,
    logout: () => clearAuthSession(pb.authStore, queryClient),
  }), [queryClient, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function useAuthUser() {
  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: () => toAuthUser(pb.authStore.record as Record<string, unknown> | null),
    enabled: pb.authStore.isValid,
    staleTime: 5 * 60 * 1000,
  });
}

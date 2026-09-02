import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../../lib/pocketbase";
import { clearAuthSession, loginWithPassword, refreshSession, requestOtp, verifyOtp } from "./authService";
import { toAuthUser, type AuthUser } from "./policy";
import { resolveSessionDecision } from "./session";

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

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      if (!mounted) return;
      const nextUser = record && typeof record === "object" ? toAuthUser(record as unknown as Record<string, unknown>) : null;
      setUser(nextUser);
      queryClient.setQueryData(["auth", "user"], nextUser);
      setStatus(resolveSessionDecision(pb.authStore.isValid, nextUser));
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

import type { AuthStatus } from "../features/auth/AuthProvider";
import type { Role } from "../features/auth/policy";

export function protectedRouteDecision(status: AuthStatus): "loading" | "login" | "allow" {
  if (status === "loading") return "loading";
  if (status === "unauthenticated") return "login";
  return "allow";
}

export function canAccessRole(role: Role | undefined, allowed: readonly Role[]): boolean {
  return role !== undefined && allowed.includes(role);
}

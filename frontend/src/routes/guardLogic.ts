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

export function safeLoginRedirect(value: unknown): string {
  if (typeof value !== "string" || !/^\/(?![\\/])(?!.*[\\\u0000-\u001f])/.test(value)) return "/home";
  return value;
}

export function publicRouteDecision(status: AuthStatus): "loading" | "login" | "home" {
  if (status === "loading") return "loading";
  return status === "authenticated" ? "home" : "login";
}

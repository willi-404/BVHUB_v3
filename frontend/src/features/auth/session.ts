import { isUsableUser, type AuthUser } from "./policy";

export function getTokenExpiry(token: string): number | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const exp = JSON.parse(decoded).exp;
    return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
  } catch { return null; }
}

export type SessionDecision = "authenticated" | "unauthenticated";

export function resolveSessionDecision(tokenIsValid: boolean, user: AuthUser | null): SessionDecision {
  return tokenIsValid && isUsableUser(user) ? "authenticated" : "unauthenticated";
}

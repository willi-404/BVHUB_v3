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
  // Token expiry/signature parsing is deliberately excluded here. PocketBase's
  // authStore validity is the sole token decision source; JWT parsing is only
  // used by the provider's refresh timer.
  if (!tokenIsValid) return "unauthenticated";
  return isUsableUser(user) ? "authenticated" : "unauthenticated";
}

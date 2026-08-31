import { isUsableUser, type AuthUser } from "./policy";

export type SessionDecision = "authenticated" | "unauthenticated";

export function resolveSessionDecision(tokenIsValid: boolean, user: AuthUser | null): SessionDecision {
  return tokenIsValid && isUsableUser(user) ? "authenticated" : "unauthenticated";
}

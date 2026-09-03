import type { QueryClient } from "@tanstack/react-query";
import { ClientResponseError } from "pocketbase";
import { pb } from "../../lib/pocketbase";
import { isUsableUser, toAuthUser, type AuthUser } from "./policy";
import { mapPBError } from "../../lib/errorMapper";

export class AuthServiceError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
  }
}

const GENERIC_AUTH_ERROR = "Anmeldung nicht möglich. Bitte prüfe deine Eingaben oder versuche es erneut.";

function normalizeError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) return error;
  if (error instanceof ClientResponseError) {
    return new AuthServiceError(mapPBError(error), error.status);
  }
  return new AuthServiceError(mapPBError(error));
}

export function currentUser(): AuthUser {
  const user = toAuthUser(pb.authStore.record as Record<string, unknown> | null);
  if (!isUsableUser(user)) throw new AuthServiceError(GENERIC_AUTH_ERROR);
  return user;
}

export async function requestOtp(email: string): Promise<string> {
  try {
    const result = await pb.collection("users").requestOTP(email.trim());
    return result.otpId;
  } catch (error) {
    // Keep the same public error for unknown, inactive and invalid accounts.
    throw normalizeError(error);
  }
}

export async function verifyOtp(otpId: string, otp: string): Promise<AuthUser> {
  try {
    await pb.collection("users").authWithOTP(otpId, otp.trim());
    return currentUser();
  } catch (error) {
    pb.authStore.clear();
    throw normalizeError(error);
  }
}

export async function loginWithPassword(identity: string, password: string): Promise<AuthUser> {
  try {
    await pb.collection("users").authWithPassword(identity.trim(), password);
    return currentUser();
  } catch (error) {
    pb.authStore.clear();
    throw normalizeError(error);
  }
}

export async function refreshSession(): Promise<AuthUser> {
  if (!pb.authStore.isValid) throw new AuthServiceError(GENERIC_AUTH_ERROR);

  try {
    await pb.collection("users").authRefresh();
    return currentUser();
  } catch (error) {
    pb.authStore.clear();
    throw normalizeError(error);
  }
}

export function clearAuthSession(authStore: { clear: () => void }, client: Pick<QueryClient, "clear">): void {
  if (typeof window !== "undefined") {
    try { window.sessionStorage.removeItem("bvhub.sessionExpired"); } catch { /* storage may be unavailable */ }
  }
  authStore.clear();
  client.clear();
}

export function softLogout(client: Pick<QueryClient, "clear">): void {
  if (typeof window !== "undefined") {
    try { window.sessionStorage.setItem("bvhub.sessionExpired", "1"); } catch { /* storage may be unavailable */ }
  }
  pb.authStore.clear();
  client.clear();
}

export function logout(client: QueryClient): void {
  clearAuthSession(pb.authStore, client);
}

import type { QueryClient } from "@tanstack/react-query";
import { ClientResponseError } from "pocketbase";
import { pb } from "../../lib/pocketbase";
import { isUsableUser, toAuthUser, type AuthUser } from "./policy";
import { mapPBError } from "../../lib/errorMapper";
import { OtpPayload, PocketBaseUserResponse } from "../../lib/validation/authSchemas";
import { getCsrfToken } from "../../lib/csrf";
import { logInfo, logWarn, redactEmail } from "../../lib/logger";

export class AuthServiceError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
    this.code = code;
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

function invalidResponse(): AuthServiceError {
  return new AuthServiceError("Authentication service returned an invalid response.", undefined, "INVALID_RESPONSE");
}

function parseUser(record: unknown): AuthUser {
  const parsed = PocketBaseUserResponse.safeParse(record);
  if (!parsed.success) throw invalidResponse();
  const user = toAuthUser(parsed.data as Record<string, unknown>);
  if (!user || !isUsableUser(user)) throw invalidResponse();
  return user;
}

function requireCsrfToken(): string {
  const token = getCsrfToken();
  if (!token) throw new AuthServiceError("CSRF_Error", undefined, "CSRF_ERROR");
  return token;
}

export function currentUser(): AuthUser {
  return parseUser(pb.authStore.record);
}

export async function requestOtp(email: string): Promise<string> {
  const identity = email.trim();
  try {
    const input = OtpPayload.parse({ email: identity });
    const result = await pb.collection("users").requestOTP(input.email);
    if (!result || typeof result.otpId !== "string" || !result.otpId) throw invalidResponse();
    logInfo("auth.login.success", { email: redactEmail(input.email), method: "otp" });
    return result.otpId;
  } catch (error) {
    // Keep the same public error for unknown, inactive and invalid accounts.
    const normalized = normalizeError(error);
    logWarn("auth.login.failed", { reason: normalized.message, method: "otp" });
    throw normalized;
  }
}

export async function verifyOtp(otpId: string, otp: string): Promise<AuthUser> {
  try {
    const result = await pb.collection("users").authWithOTP(otpId, otp.trim());
    parseUser(result?.record);
    return currentUser();
  } catch (error) {
    pb.authStore.clear();
    throw normalizeError(error);
  }
}

export async function loginWithPassword(identity: string, password: string): Promise<AuthUser> {
  try {
    const result = await pb.collection("users").authWithPassword(identity.trim(), password);
    parseUser(result?.record);
    const user = currentUser();
    logInfo("auth.login.success", { email: redactEmail(identity.trim()), method: "password" });
    return user;
  } catch (error) {
    pb.authStore.clear();
    const normalized = normalizeError(error);
    logWarn("auth.login.failed", { reason: normalized.message, method: "password" });
    throw normalized;
  }
}

export async function refreshSession(): Promise<AuthUser> {
  if (!pb.authStore.isValid) throw new AuthServiceError(GENERIC_AUTH_ERROR);

  try {
    const result = await pb.collection("users").authRefresh();
    parseUser(result?.record);
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

// Keep the custom endpoint APIs available from the auth service entrypoint.
export { register, verifyEmail, type RegistrationInput, RegistrationError } from "./registrationService";

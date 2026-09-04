import type { QueryClient } from "@tanstack/react-query";
import { ClientResponseError } from "pocketbase";
import { pb } from "../../lib/pocketbase";
import { isUsableUser, toAuthUser, type AuthUser } from "./policy";
import { mapPBError } from "../../lib/errorMapper";
import { OtpPayload, PocketBaseAuthResponse, PocketBaseUserResponse } from "../../lib/validation/authSchemas";
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

const GENERIC_AUTH_ERROR = "errors.generic";

function normalizeError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) return error;
  if (error instanceof ClientResponseError) {
    return new AuthServiceError(mapPBError(error), error.status);
  }
  return new AuthServiceError(mapPBError(error));
}

function invalidResponse(): AuthServiceError {
  return new AuthServiceError("errors.invalid_response", undefined, "INVALID_RESPONSE");
}

function parseUserRecord(record: unknown): AuthUser {
  const parsed = PocketBaseUserResponse.safeParse(record);
  if (!parsed.success) throw invalidResponse();
  const user = toAuthUser(parsed.data);
  if (!user || !isUsableUser(user)) throw invalidResponse();
  return user;
}

function parseAuthResponse(response: unknown): AuthUser {
  const parsed = PocketBaseAuthResponse.safeParse(response);
  if (!parsed.success) throw invalidResponse();
  const user = toAuthUser(parsed.data.record);
  if (!user || !isUsableUser(user)) throw invalidResponse();
  return user;
}

/** Returns the currently stored and validated application user. @returns {AuthUser} The validated current user. @throws {AuthServiceError} If the auth store does not contain a usable user. */
export function currentUser(): AuthUser {
  return parseUserRecord(pb.authStore.record);
}

/** Requests an email one-time password. @param {string} email The email address to send the code to. @returns {Promise<string>} The OTP request identifier. @throws {AuthServiceError} If validation or the PocketBase request fails. */
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

/** Completes OTP authentication. @param {string} otpId The OTP request identifier. @param {string} otp The one-time code entered by the user. @returns {Promise<AuthUser>} The authenticated application user. @throws {AuthServiceError} If the code is invalid or the response is unusable. */
export async function verifyOtp(otpId: string, otp: string): Promise<AuthUser> {
  try {
    const result = await pb.collection("users").authWithOTP(otpId, otp.trim());
    return parseAuthResponse(result);
  } catch (error) {
    pb.authStore.clear();
    throw normalizeError(error);
  }
}

/** Authenticates an administrator with password credentials. @param {string} identity The email or configured identity. @param {string} password The account password. @returns {Promise<AuthUser>} The authenticated application user. @throws {AuthServiceError} If credentials or the response are invalid. */
export async function loginWithPassword(identity: string, password: string): Promise<AuthUser> {
  try {
    const result = await pb.collection("users").authWithPassword(identity.trim(), password);
    const user = parseAuthResponse(result);
    logInfo("auth.login.success", { email: redactEmail(identity.trim()), method: "password" });
    return user;
  } catch (error) {
    pb.authStore.clear();
    const normalized = normalizeError(error);
    logWarn("auth.login.failed", { reason: normalized.message, method: "password" });
    throw normalized;
  }
}

/** Refreshes the current PocketBase session and validates its user record. @returns {Promise<AuthUser>} The refreshed application user. @throws {AuthServiceError} If no valid session exists or refresh fails. */
export async function refreshSession(): Promise<AuthUser> {
  if (!pb.authStore.isValid) throw new AuthServiceError(GENERIC_AUTH_ERROR);

  try {
    const result = await pb.collection("users").authRefresh();
    return parseAuthResponse(result);
  } catch (error) {
    pb.authStore.clear();
    throw normalizeError(error);
  }
}

/** Clears authentication state and cached queries. @param {object} authStore The auth store to clear. @param {Pick<QueryClient, "clear">} client The query client whose cache should be cleared. @returns {void} Nothing. */
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

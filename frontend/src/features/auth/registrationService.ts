import { ClientResponseError } from "pocketbase";
import { pb } from "../../lib/pocketbase";
import { logInfo } from "../../lib/logger";
import { z } from "zod";

export interface RegistrationInput {
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  birthDate: string;
  phone?: string;
  contactInfo?: string;
}

export class RegistrationError extends Error {
  readonly status?: number;
  readonly code?: string;
  constructor(message: string, status?: number, code?: string) { super(message); this.name = "RegistrationError"; this.status = status; this.code = code; }
}

const RegistrationResponse = z.object({ success: z.literal(true), email: z.string().min(3) });
const VerificationResponse = z.object({ success: z.literal(true) });

/** Registers a guest account through the PocketBase custom endpoint. @param {RegistrationInput} input The validated registration fields. @returns {Promise<{email: string}>} The masked registered email address. @throws {RegistrationError} If the server rejects the registration or returns an invalid response. */
export async function register(input: RegistrationInput): Promise<{ email: string }> {
  try {
    const result = await pb.send<unknown>("/api/bvhub/register", {
      method: "POST",
      body: input,
    });
    const parsed = RegistrationResponse.safeParse(result);
    if (!parsed.success) throw new RegistrationError("errors.invalid_response", undefined, "INVALID_RESPONSE");
    logInfo("auth.register", { email: parsed.data.email });
    return { email: parsed.data.email };
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    if (error instanceof ClientResponseError) {
      throw new RegistrationError("errors.registration_failed", error.status);
    }
    throw new RegistrationError("errors.registration_failed");
  }
}

/** Verifies a guest email token through the PocketBase custom endpoint. @param {string} token The verification token from the email link. @returns {Promise<void>} Resolves after activation succeeds. @throws {RegistrationError} If the token is rejected or the response is invalid. */
export async function verifyEmail(token: string): Promise<void> {
  try {
    const result = await pb.send<unknown>("/api/bvhub/verify-email", {
      method: "POST",
      body: { token },
    });
    if (!VerificationResponse.safeParse(result).success) throw new RegistrationError("errors.invalid_response", undefined, "INVALID_RESPONSE");
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    if (error instanceof ClientResponseError) {
      throw new RegistrationError("errors.verification_failed", error.status);
    }
    throw new RegistrationError("errors.verification_failed");
  }
}

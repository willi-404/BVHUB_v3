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

export async function register(input: RegistrationInput): Promise<{ email: string }> {
  try {
    const result = await pb.send<unknown>("/api/bvhub/register", {
      method: "POST",
      body: input,
    });
    const parsed = RegistrationResponse.safeParse(result);
    if (!parsed.success) throw new RegistrationError("Registrierung nicht möglich. Ungültige Serverantwort.", undefined, "INVALID_RESPONSE");
    logInfo("auth.register", { email: parsed.data.email });
    return { email: parsed.data.email };
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    if (error instanceof ClientResponseError) {
      throw new RegistrationError("Registrierung nicht möglich. Bitte prüfe deine Angaben.", error.status);
    }
    throw new RegistrationError("Registrierung nicht möglich. Bitte versuche es später erneut.");
  }
}

export async function verifyEmail(token: string): Promise<void> {
  try {
    const result = await pb.send<unknown>("/api/bvhub/verify-email", {
      method: "POST",
      body: { token },
    });
    if (!VerificationResponse.safeParse(result).success) throw new RegistrationError("Aktivierung nicht möglich. Ungültige Serverantwort.", undefined, "INVALID_RESPONSE");
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    if (error instanceof ClientResponseError) {
      throw new RegistrationError("Der Bestätigungslink ist ungültig, abgelaufen oder wurde bereits verwendet.", error.status);
    }
    throw new RegistrationError("Die Aktivierung ist derzeit nicht möglich.");
  }
}

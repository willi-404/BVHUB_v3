import { ClientResponseError } from "pocketbase";
import { pb } from "../../lib/pocketbase";

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
  constructor(message: string, status?: number) { super(message); this.name = "RegistrationError"; this.status = status; }
}

export async function register(input: RegistrationInput): Promise<{ email: string }> {
  try {
    return await pb.send<{ success: boolean; email: string }>("/api/bvhub/register", { method: "POST", body: input });
  } catch (error) {
    if (error instanceof ClientResponseError) throw new RegistrationError("Registrierung nicht möglich. Bitte prüfe deine Angaben.", error.status);
    throw new RegistrationError("Registrierung nicht möglich. Bitte versuche es später erneut.");
  }
}

export async function verifyEmail(token: string): Promise<void> {
  try {
    await pb.send("/api/bvhub/verify-email", { method: "POST", body: { token } });
  } catch (error) {
    if (error instanceof ClientResponseError) throw new RegistrationError("Der Bestätigungslink ist ungültig, abgelaufen oder wurde bereits verwendet.", error.status);
    throw new RegistrationError("Die Aktivierung ist derzeit nicht möglich.");
  }
}

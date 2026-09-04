import { afterEach, describe, expect, it, vi } from "vitest";
import { pb } from "../../lib/pocketbase";
import { register, RegistrationError, verifyEmail, type RegistrationInput } from "./registrationService";

const registration: RegistrationInput = {
  displayName: "Test Registration",
  firstName: "Test",
  lastName: "Registration",
  email: "registration@example.test",
  street: "Teststrasse",
  houseNumber: "12a",
  postalCode: "91052",
  city: "Erlangen",
  birthDate: "2000-01-01",
  phone: "",
  contactInfo: "",
};

describe("registration service", () => {
  afterEach(() => vi.restoreAllMocks());

  it("registers through the guest POST route without cross-origin cookie credentials", async () => {
    const send = vi.spyOn(pb, "send").mockResolvedValue({ success: true, email: "re***@example.test" });

    await expect(register(registration)).resolves.toEqual({ email: "re***@example.test" });
    expect(send).toHaveBeenCalledWith("/api/bvhub/register", { method: "POST", body: registration });
  });

  it("rejects malformed registration responses", async () => {
    vi.spyOn(pb, "send").mockResolvedValue({ success: true });

    await expect(register(registration)).rejects.toMatchObject({ code: "INVALID_RESPONSE" } satisfies Partial<RegistrationError>);
  });

  it("verifies email through the guest POST route", async () => {
    const send = vi.spyOn(pb, "send").mockResolvedValue({ success: true });

    await expect(verifyEmail("verification-token")).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith("/api/bvhub/verify-email", { method: "POST", body: { token: "verification-token" } });
  });
});

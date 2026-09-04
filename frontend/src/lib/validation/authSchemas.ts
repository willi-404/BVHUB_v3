import { z } from "zod";

export const PocketBaseUserResponse = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"]),
  active: z.boolean(),
  verified: z.boolean(),
}).passthrough();

/** Full response returned by PocketBase auth endpoints. */
export const PocketBaseAuthResponse = z.object({
  token: z.string().min(1),
  record: PocketBaseUserResponse,
}).passthrough();

export const RegisterPayload = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8),
});

export const OtpPayload = z.object({ email: z.string().email() });

export type PocketBaseUserResponse = z.infer<typeof PocketBaseUserResponse>;
export type PocketBaseAuthResponse = z.infer<typeof PocketBaseAuthResponse>;
export type RegisterPayload = z.infer<typeof RegisterPayload>;
export type OtpPayload = z.infer<typeof OtpPayload>;

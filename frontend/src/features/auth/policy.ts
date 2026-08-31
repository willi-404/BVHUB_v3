export const ROLES = ["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"] as const;

export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
  verified: boolean;
}

export const PASSWORD_ROLES: readonly Role[] = ["ADMIN", "SUPER_ADMIN"];
export const OTP_ROLES: readonly Role[] = ["GUEST", "MEMBER"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isAdminRole(role: Role | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canUsePassword(role: Role | undefined): boolean {
  return role !== undefined && PASSWORD_ROLES.includes(role);
}

export function canUseOtp(role: Role | undefined): boolean {
  return role !== undefined && OTP_ROLES.includes(role);
}

export function isUsableUser(user: Pick<AuthUser, "role" | "active"> | null | undefined): user is AuthUser {
  return Boolean(user?.active && isRole(user.role));
}

export function toAuthUser(record: Record<string, unknown> | null | undefined): AuthUser | null {
  if (!record || typeof record.id !== "string" || !isRole(record.role)) return null;

  return {
    id: record.id,
    email: typeof record.email === "string" ? record.email : "",
    displayName: typeof record.displayName === "string" ? record.displayName : "",
    firstName: typeof record.firstName === "string" ? record.firstName : "",
    lastName: typeof record.lastName === "string" ? record.lastName : "",
    role: record.role,
    active: record.active === true,
    verified: record.verified === true,
  };
}

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

/** Checks whether an unknown value is one of the supported application roles. @param {unknown} value The value to inspect. @returns {value is Role} Whether the value is a valid role. */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Checks whether a role has administrative privileges. @param {Role | undefined} role The role to inspect. @returns {boolean} Whether the role is ADMIN or SUPER_ADMIN. */
export function isAdminRole(role: Role | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Checks whether a role may use password authentication. @param {Role | undefined} role The role to inspect. @returns {boolean} Whether password login is permitted. */
export function canUsePassword(role: Role | undefined): boolean {
  return role !== undefined && PASSWORD_ROLES.includes(role);
}

/** Checks whether a role may use OTP authentication. @param {Role | undefined} role The role to inspect. @returns {boolean} Whether OTP login is permitted. */
export function canUseOtp(role: Role | undefined): boolean {
  return role !== undefined && OTP_ROLES.includes(role);
}

/** Checks whether an auth record is active, verified and role-valid. @param {Pick<AuthUser, "role" | "active" | "verified"> | null | undefined} user The candidate auth record. @returns {user is AuthUser} Whether the record can be used by the application. */
export function isUsableUser(user: Pick<AuthUser, "role" | "active" | "verified"> | null | undefined): user is AuthUser {
  return Boolean(user?.active && user?.verified && isRole(user.role));
}

/** Converts a PocketBase record into the application's restricted auth-user shape. @param {Record<string, unknown> | null | undefined} record The PocketBase record. @returns {AuthUser | null} The normalized user or null when required fields are invalid. */
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

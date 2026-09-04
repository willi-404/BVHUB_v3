import type { Role } from "../auth/policy";

export function canManageMemberGroups(actor: Role | undefined, target: Role | undefined): boolean {
  return (actor === "ADMIN" || actor === "SUPER_ADMIN") && (target === "GUEST" || target === "MEMBER");
}

export function canManageMemberRole(actor: Role | undefined, target: Role | undefined): boolean {
  return actor === "SUPER_ADMIN" && (target === "GUEST" || target === "MEMBER" || target === "ADMIN");
}

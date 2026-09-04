export function isSuperAdmin(user: Record<string, unknown> | null): boolean {
  return user?.role === "superadmin";
}

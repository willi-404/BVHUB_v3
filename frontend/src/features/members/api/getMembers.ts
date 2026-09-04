import { pb } from "../../../lib/pocketbase";
import type { Member, Group } from "../../../app/components/shared/MemberTypes";

export interface MemberFilters { page?: number; perPage?: number; search?: string; group?: Group; }
export interface MemberListResult { items: Member[]; page: number; perPage: number; totalItems: number; totalPages: number; }

export async function getMembers(filters: MemberFilters = {}): Promise<MemberListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? 50));
  const search = filters.search?.trim();
  const result = await pb.send<{ items: Record<string, unknown>[]; page: number; perPage: number; totalItems: number; totalPages: number }>("/api/bvhub/admin/users", { method: "GET" });
  let records = result.items.filter((record) => String(record.role ?? "") !== "SUPER_ADMIN");
  if (search) {
    const q = search.toLocaleLowerCase();
    records = records.filter((record) => [record.displayName, record.firstName, record.lastName, record.email, record.username, record.id]
      .some((value) => String(value ?? "").toLocaleLowerCase().includes(q)));
  }
  if (filters.group) {
    records = records.filter((record) => {
      const role = String(record.role ?? "GUEST");
      if (filters.group === "Admin") return role === "ADMIN";
      const names = Array.isArray(record.groups) ? record.groups.map((group) => String((group as Record<string, unknown>).name ?? "")) : [];
      return filters.group === "MemberER" ? names.includes("Member ER") : filters.group === "MemberNUE" ? names.includes("Member NUE") : names.includes("Guest");
    });
  }
  const items = records.slice((page - 1) * perPage, page * perPage).map((record) => {
    const role = String(record.role ?? "GUEST");
    const group: Group = role === "ADMIN" ? "Admin" : role === "MEMBER" ? "MemberER" : "guest";
    return { id: String(record.id), username: String(record.username ?? record.email ?? ""), vorname: String(record.firstName ?? ""), nachname: String(record.lastName ?? ""), email: String(record.email ?? ""), gruppe: group, role: role as Member["role"], groups: Array.isArray(record.groups) ? record.groups as Member["groups"] : [], memberSince: String(record.created ?? "").slice(0, 10), adresse: "", geburtstag: "", phone: "", accountCreated: String(record.created ?? ""), accountUpdated: String(record.updated ?? ""), avatarColor: role === "ADMIN" ? "#7c3aed" : role === "MEMBER" ? "#15803d" : "#b45309" } satisfies Member;
  });
  return { items, page, perPage, totalItems: records.length, totalPages: Math.max(1, Math.ceil(records.length / perPage)) };
}

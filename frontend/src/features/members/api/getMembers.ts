import { pb } from "../../../lib/pocketbase";
import type { Member, Group } from "../../../app/components/shared/MemberTypes";
import type { AdminMemberDetails } from "../../memberCardScanner/types";

export interface MemberFilters { page?: number; perPage?: number; search?: string; }
export interface MemberListResult { items: Member[]; page: number; perPage: number; totalItems: number; totalPages: number; }

export async function getMembers(filters: MemberFilters = {}): Promise<MemberListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? 50));
  const search = filters.search?.trim();
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (search) params.set("search", search);
  const result = await pb.send<{ items: Record<string, unknown>[]; page: number; perPage: number; totalItems: number; totalPages: number }>(`/api/bvhub/admin/users?${params.toString()}`, { method: "GET" });
  const items = result.items.map((record) => {
    const role = String(record.role ?? "GUEST");
    const group: Group = role === "ADMIN" ? "Admin" : role === "MEMBER" ? "MemberER" : "guest";
    return { id: String(record.id), displayName: String(record.displayName ?? ""), username: String(record.displayName ?? ""), vorname: String(record.firstName ?? ""), nachname: String(record.lastName ?? ""), email: String(record.email ?? ""), gruppe: group, role: role as Member["role"], groups: Array.isArray(record.groups) ? record.groups as Member["groups"] : [], memberSince: String(record.created ?? "").slice(0, 10), adresse: "", geburtstag: "", phone: "", accountCreated: String(record.created ?? ""), accountUpdated: String(record.updated ?? ""), avatarColor: role === "ADMIN" ? "#7c3aed" : role === "MEMBER" ? "#15803d" : "#b45309" } satisfies Member;
  });
  return { items, page: result.page, perPage: result.perPage, totalItems: result.totalItems, totalPages: result.totalPages };
}

export async function getAllMembers(search: string): Promise<Member[]> {
  const firstPage = await getMembers({ search, page: 1, perPage: 100 });
  const items = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page++) {
    items.push(...(await getMembers({ search, page, perPage: 100 })).items);
  }
  return items;
}

export async function getMemberDetails(id: string): Promise<AdminMemberDetails> {
  return pb.send<AdminMemberDetails>(`/api/bvhub/admin/users/${encodeURIComponent(id)}`, { method: "GET" });
}

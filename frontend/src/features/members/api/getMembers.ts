import { pb } from "../../../lib/pocketbase";
import type { Member, Group } from "../../../app/components/shared/MemberTypes";

export interface MemberFilters { page?: number; perPage?: number; search?: string; group?: Group; }
export interface MemberListResult { items: Member[]; page: number; perPage: number; totalItems: number; totalPages: number; }

function escapeFilter(value: string): string { return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

export async function getMembers(filters: MemberFilters = {}): Promise<MemberListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? 50));
  const clauses = ["role != 'SUPER_ADMIN'"];
  const search = filters.search?.trim();
  if (search) { const q = escapeFilter(search); clauses.push(`(displayName ~ "${q}" || firstName ~ "${q}" || lastName ~ "${q}" || email ~ "${q}")`); }
  if (filters.group) { const role = filters.group === "Admin" ? "ADMIN" : filters.group === "MemberER" || filters.group === "MemberNUE" ? "MEMBER" : "GUEST"; clauses.push(`role = '${role}'`); }
  const result = await pb.collection("users").getList<Record<string, unknown>>(page, perPage, { sort: "displayName,firstName,lastName", filter: clauses.join(" && "), expand: "user_groups(group),profile" });
  const items = result.items.map((record) => {
    const role = String(record.role ?? "GUEST");
    const group: Group = role === "ADMIN" ? "Admin" : role === "MEMBER" ? "MemberER" : "guest";
    return { id: String(record.id), username: String(record.username ?? record.email ?? ""), vorname: String(record.firstName ?? ""), nachname: String(record.lastName ?? ""), email: String(record.email ?? ""), gruppe: group, memberSince: String(record.created ?? "").slice(0, 10), adresse: "", geburtstag: "", phone: "", accountCreated: String(record.created ?? ""), accountUpdated: String(record.updated ?? ""), avatarColor: role === "ADMIN" ? "#7c3aed" : role === "MEMBER" ? "#15803d" : "#b45309" } satisfies Member;
  });
  return { ...result, items };
}

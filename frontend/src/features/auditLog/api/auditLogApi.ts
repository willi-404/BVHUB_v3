import { pb } from "../../../lib/pocketbase";

export type AuditCategory = 1 | 2 | 3 | 4 | 5;

export interface AuditLogItem {
  id: string;
  eventType: string;
  actorUser: string;
  targetUser: string;
  metadata: Record<string, unknown>;
  created: string;
}

export interface AuditLogPage {
  items: AuditLogItem[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export async function getAuditLog({ memberId, categories, page }: { memberId?: string; categories: AuditCategory[]; page: number }): Promise<AuditLogPage> {
  const query = new URLSearchParams({ categories: categories.join(","), page: String(page), perPage: "30" });
  const path = memberId
    ? `/api/bvhub/admin/users/${encodeURIComponent(memberId)}/audit-log?${query}`
    : `/api/bvhub/me/audit-log?${query}`;
  return pb.send<AuditLogPage>(path, { method: "GET" });
}

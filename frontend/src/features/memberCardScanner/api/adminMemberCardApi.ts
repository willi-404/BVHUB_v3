import { pb } from "../../../lib/pocketbase";
import type { AdminMemberCardScanResult } from "../types";

export async function verifyAdminMemberCard(token: string): Promise<AdminMemberCardScanResult> {
  return pb.send<AdminMemberCardScanResult>("/api/bvhub/admin/member-card/verify", {
    method: "POST",
    body: { token },
  });
}

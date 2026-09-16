import { pb } from "../../../lib/pocketbase";
import type { MemberCardTokenResponse, MemberCardVerificationResponse } from "../types";

export function requestMemberCardToken(): Promise<MemberCardTokenResponse> {
  return pb.send<MemberCardTokenResponse>("/api/bvhub/me/member-card-token", { method: "POST", body: {} });
}

export function verifyMemberCardToken(token: string): Promise<MemberCardVerificationResponse> {
  return pb.send<MemberCardVerificationResponse>("/api/bvhub/member-card/verify", { method: "POST", body: { token } });
}

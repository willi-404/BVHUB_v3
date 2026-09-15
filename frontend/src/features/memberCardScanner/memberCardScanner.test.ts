import { describe, expect, it, vi } from "vitest";
import { pb } from "../../lib/pocketbase";
import { verifyAdminMemberCard } from "./api/adminMemberCardApi";
import { parseMemberCardToken } from "./hooks/qrScannerAdapter";

describe("admin member-card scanner", () => {
  it("extracts tokens from the member verification URL fragment", () => {
    const token = "A".repeat(48);
    expect(parseMemberCardToken(`https://bvhub.example/member/verify#${token}`)).toBe(token);
    expect(parseMemberCardToken(token)).toBe(token);
  });

  it("rejects malformed QR values before they reach the API", () => {
    expect(parseMemberCardToken("https://bvhub.example/member/verify#not-a-token")).toBeNull();
    expect(parseMemberCardToken("https://bvhub.example/other#" + "A".repeat(48))).toBeNull();
    expect(parseMemberCardToken("A".repeat(47))).toBeNull();
  });

  it("uses the admin-only verification endpoint", async () => {
    const send = vi.spyOn(pb, "send").mockResolvedValueOnce({ status: "INVALID", reason: "UNKNOWN_TOKEN" });
    const token = "B".repeat(48);
    await verifyAdminMemberCard(token);
    expect(send).toHaveBeenCalledWith("/api/bvhub/admin/member-card/verify", { method: "POST", body: { token } });
    send.mockRestore();
  });
});

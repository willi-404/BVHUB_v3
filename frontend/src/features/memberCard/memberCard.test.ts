import { describe, expect, it, vi } from "vitest";
import { pb } from "../../lib/pocketbase";
import { requestMemberCardToken, verifyMemberCardToken } from "./api/memberCardApi";
import { memberCardRefreshDelay } from "./hooks/useMemberCardQr";

describe("member card QR feature", () => {
  it("uses the dedicated issuance and public verification endpoints", async () => {
    const send = vi.spyOn(pb, "send")
      .mockResolvedValueOnce({ token: "A".repeat(48), expiresAt: "2026-09-14T12:02:00.000Z", refreshAt: "2026-09-14T12:01:40.000Z" })
      .mockResolvedValueOnce({ valid: false });
    await requestMemberCardToken();
    await verifyMemberCardToken("A".repeat(48));
    expect(send).toHaveBeenNthCalledWith(1, "/api/bvhub/me/member-card-token", { method: "POST", body: {} });
    expect(send).toHaveBeenNthCalledWith(2, "/api/bvhub/member-card/verify", { method: "POST", body: { token: "A".repeat(48) } });
    send.mockRestore();
  });

  it("refreshes at server-provided refreshAt and stops after expiry", () => {
    vi.useFakeTimers();
    const now = Date.parse("2026-09-14T12:00:00.000Z");
    const data = { token: "A".repeat(48), refreshAt: "2026-09-14T12:00:20.000Z", expiresAt: "2026-09-14T12:02:00.000Z" };
    expect(memberCardRefreshDelay(data, now)).toBe(20_000);
    expect(memberCardRefreshDelay(data, now + 20_000)).toBe(2_000);
    expect(memberCardRefreshDelay(data, now + 120_000)).toBe(false);
    vi.useRealTimers();
  });
});

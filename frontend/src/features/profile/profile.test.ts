import { describe, expect, it, vi } from "vitest";
import { profileKeys } from "./hooks/useProfile";
import { getMyProfile, updateMyProfile } from "./api/profileApi";
import { pb } from "../../lib/pocketbase";

describe("profile feature", () => {
  it("isolates profile queries by user id", () => {
    expect(profileKeys.me("user-a")).not.toEqual(profileKeys.me("user-b"));
  });

  it("uses the authenticated self-profile routes and only the supplied allowlisted patch", async () => {
    const send = vi.spyOn(pb, "send").mockResolvedValue({ user: {}, profile: null, groups: [] });
    await getMyProfile();
    expect(send).toHaveBeenNthCalledWith(1, "/api/bvhub/me/profile", { method: "GET" });
    const patch = { displayName: "Marlow", birthDate: "2000-02-29" };
    await updateMyProfile(patch);
    expect(send).toHaveBeenNthCalledWith(2, "/api/bvhub/me/profile", { method: "PATCH", body: patch });
    send.mockRestore();
  });
});

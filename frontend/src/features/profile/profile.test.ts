import { describe, expect, it, vi } from "vitest";
import { profileKeys } from "./hooks/useProfile";
import { getMyProfile, updateMyProfile } from "./api/profileApi";
import { pb } from "../../lib/pocketbase";
import { profilePatchFromDto } from "./profilePatch";

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

  it("initializes the edit form with editable fields only", () => {
    const patch = profilePatchFromDto({
      user: { id: "user-a", displayName: "Marlow", firstName: "Marlow", lastName: "Example", email: "marlow@example.test", role: "MEMBER", active: true, verified: true, created: "server-created", updated: "server-updated" },
      profile: { street: "Teststrasse", houseNumber: "12a", postalCode: "91052", city: "Erlangen", birthDate: "2000-01-01", phone: "+49 911 123456", contactInfo: "Integration profile", created: "profile-created", updated: "profile-updated" },
      groups: [],
    });

    expect(patch).toEqual({
      displayName: "Marlow",
      firstName: "Marlow",
      lastName: "Example",
      street: "Teststrasse",
      houseNumber: "12a",
      postalCode: "91052",
      city: "Erlangen",
      birthDate: "2000-01-01",
      phone: "+49 911 123456",
      contactInfo: "Integration profile",
    });
    expect(patch).not.toHaveProperty("created");
    expect(patch).not.toHaveProperty("updated");
  });
});

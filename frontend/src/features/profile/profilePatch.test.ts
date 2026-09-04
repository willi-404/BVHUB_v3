import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientResponseError } from "pocketbase";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../../lib/pocketbase", () => ({ pb: { send } }));
import { updateMyProfile } from "./api/profileApi";

describe("profile patch API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("saves valid profile changes through the self-profile endpoint", async () => {
    const response = { user: {}, profile: null, groups: [] };
    send.mockResolvedValue(response);
    await expect(updateMyProfile({ displayName: "Marlow" })).resolves.toBe(response);
    expect(send).toHaveBeenCalledWith("/api/bvhub/me/profile", { method: "PATCH", body: { displayName: "Marlow" } });
  });

  it("propagates invalid-data errors from PocketBase", async () => {
    send.mockRejectedValue(new ClientResponseError({ status: 400, response: { message: "invalid" } }));
    await expect(updateMyProfile({ postalCode: "invalid" })).rejects.toBeInstanceOf(ClientResponseError);
  });
});

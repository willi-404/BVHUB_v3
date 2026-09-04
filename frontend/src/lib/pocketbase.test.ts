import { afterEach, describe, expect, it } from "vitest";
import { pb } from "./pocketbase";

describe("PocketBase request interceptor", () => {
  afterEach(() => pb.authStore.clear());

  it("adds the auth token as the CSRF header for mutating requests", () => {
    pb.authStore.save("csrf-test-token", null);
    const options = { method: "PATCH", headers: { Accept: "application/json" } };
    const result = pb.beforeSend?.("/api/test", options);

    expect(result).toEqual({
      url: "/api/test",
      options: { ...options, headers: { Accept: "application/json", "X-CSRF-Token": "csrf-test-token" } },
    });
  });

  it("leaves read-only requests unchanged", () => {
    const options = { method: "GET" };
    expect(pb.beforeSend?.("/api/test", options)).toEqual({ url: "/api/test", options });
  });
});

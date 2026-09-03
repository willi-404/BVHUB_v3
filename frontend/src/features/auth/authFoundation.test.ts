import { describe, expect, it } from "vitest";
import { clearAuthSession } from "./authService";
import { canUseOtp, canUsePassword, isUsableUser, type AuthUser } from "./policy";
import { getTokenExpiry, resolveSessionDecision } from "./session";
import { canAccessRole, protectedRouteDecision, publicRouteDecision, safeLoginRedirect } from "../../routes/guardLogic";

const user = (role: AuthUser["role"], active = true): AuthUser => ({
  id: "user-1",
  email: "member@example.test",
  displayName: "Test User",
  firstName: "Test",
  lastName: "User",
  role,
  active,
  verified: true,
});

describe("authentication foundation", () => {
  it("redirects unauthenticated access and allows a valid session", () => {
    expect(protectedRouteDecision("unauthenticated")).toBe("login");
    expect(protectedRouteDecision("authenticated")).toBe("allow");
    expect(resolveSessionDecision(true, user("MEMBER"))).toBe("authenticated");
  });

  it("accepts only internal login redirect paths", () => {
    expect(safeLoginRedirect("/events")).toBe("/events");
    expect(safeLoginRedirect("/")).toBe("/");
    expect(safeLoginRedirect("//evil.example")).toBe("/dashboard");
    expect(safeLoginRedirect("https://evil.example/login")).toBe("/dashboard");
    expect(safeLoginRedirect("/\\\\evil.example")).toBe("/dashboard");
    expect(safeLoginRedirect(undefined)).toBe("/dashboard");
  });

  it("uses dashboard for authenticated public routes", () => {
    expect(publicRouteDecision("loading")).toBe("loading");
    expect(publicRouteDecision("unauthenticated")).toBe("login");
    expect(publicRouteDecision("authenticated")).toBe("dashboard");
  });

  it("clears invalid or deactivated sessions", () => {
    expect(resolveSessionDecision(false, user("MEMBER"))).toBe("unauthenticated");
    expect(isUsableUser(user("MEMBER", false))).toBe(false);
    expect(isUsableUser({ ...user("MEMBER"), verified: false })).toBe(false);
    expect(isUsableUser({ ...user("ADMIN"), active: false })).toBe(false);
    expect(isUsableUser({ ...user("MEMBER"), role: "UNKNOWN" as AuthUser["role"] })).toBe(false);
  });

  it("keeps OTP and password methods separated by role", () => {
    expect(canUseOtp("GUEST")).toBe(true);
    expect(canUseOtp("MEMBER")).toBe(true);
    expect(canUsePassword("GUEST")).toBe(false);
    expect(canUsePassword("MEMBER")).toBe(false);
    expect(canUsePassword("ADMIN")).toBe(true);
    expect(canUsePassword("SUPER_ADMIN")).toBe(true);
  });

  it("blocks non-admin roles from admin routes", () => {
    expect(canAccessRole("MEMBER", ["ADMIN", "SUPER_ADMIN"])).toBe(false);
    expect(canAccessRole("GUEST", ["ADMIN", "SUPER_ADMIN"])).toBe(false);
    expect(canAccessRole("ADMIN", ["ADMIN", "SUPER_ADMIN"])).toBe(true);
    expect(canAccessRole("SUPER_ADMIN", ["ADMIN", "SUPER_ADMIN"])).toBe(true);
  });

  it("logout clears the auth store and query cache", () => {
    let authCleared = false;
    let queryCleared = false;
    clearAuthSession({ clear: () => { authCleared = true; } }, { clear: () => { queryCleared = true; } });
    expect(authCleared).toBe(true);
    expect(queryCleared).toBe(true);
  });

  it("decodes only the JWT expiry for the session timer", () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "none" })}.${encode({ exp: 432000 })}.signature`;
    expect(getTokenExpiry(token)).toBe(432000);
    expect(getTokenExpiry("not-a-token")).toBeNull();
  });
});

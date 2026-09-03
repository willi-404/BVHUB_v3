import { describe, expect, it } from "vitest";
import { clearAuthSession } from "./authService";
import { canUseOtp, canUsePassword, isUsableUser, type AuthUser } from "./policy";
import { resolveSessionDecision } from "./session";
import { canAccessRole, protectedRouteDecision } from "../../routes/guardLogic";

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

  it("clears invalid or deactivated sessions", () => {
    expect(resolveSessionDecision(false, user("MEMBER"))).toBe("unauthenticated");
    expect(isUsableUser(user("MEMBER", false))).toBe(false);
    expect(isUsableUser({ ...user("MEMBER"), verified: false })).toBe(false);
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
});

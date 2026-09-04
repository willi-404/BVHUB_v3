import { describe, expect, it } from "vitest";
import type { Role } from "../auth/policy";
import { canManageMemberGroups, canManageMemberRole } from "./policy";

const roles: Role[] = ["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"];

describe("member administration policy", () => {
  it("allows only admins and superadmins to manage guest/member groups", () => {
    for (const actor of roles) {
      for (const target of roles) {
        const expected = (actor === "ADMIN" || actor === "SUPER_ADMIN") && (target === "GUEST" || target === "MEMBER");
        expect(canManageMemberGroups(actor, target)).toBe(expected);
      }
    }
  });

  it("allows only superadmins to promote or demote supported roles", () => {
    for (const actor of roles) {
      for (const target of roles) {
        const expected = actor === "SUPER_ADMIN" && target !== "SUPER_ADMIN";
        expect(canManageMemberRole(actor, target)).toBe(expected);
      }
    }
  });
});

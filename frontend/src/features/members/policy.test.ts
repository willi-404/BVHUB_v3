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

  it("lets admins change only guest/member roles and superadmins all managed roles", () => {
    for (const actor of roles) {
      for (const target of roles) {
        const expected = (actor === "ADMIN" && (target === "GUEST" || target === "MEMBER")) || (actor === "SUPER_ADMIN" && target !== "SUPER_ADMIN");
        expect(canManageMemberRole(actor, target)).toBe(expected);
      }
    }
  });
});

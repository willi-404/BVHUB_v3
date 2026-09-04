import { describe, expect, it } from "vitest";
import { resolveMemberCardGroup } from "./memberCardTheme";

describe("member card group theme mapping", () => {
  it("preserves the Figma card theme for API group names", () => {
    expect(resolveMemberCardGroup("Member ER")).toBe("MemberER");
    expect(resolveMemberCardGroup("Member NUE")).toBe("MemberNUE");
    expect(resolveMemberCardGroup("Guest")).toBe("guest");
    expect(resolveMemberCardGroup("unknown")).toBe("guest");
  });
});

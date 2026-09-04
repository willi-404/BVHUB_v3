import { describe, expect, it } from "vitest";
import { memberCardGroupLabels, resolveMemberCardGroup } from "./memberCardTheme";

describe("member card group theme mapping", () => {
  it("preserves the Figma card theme for API group names", () => {
    expect(resolveMemberCardGroup("Member ER")).toBe("MemberER");
    expect(resolveMemberCardGroup("Member NUE")).toBe("MemberNUE");
    expect(resolveMemberCardGroup("Guest")).toBe("guest");
    expect(resolveMemberCardGroup(["Member NUE", "Member ER"])).toBe("MemberER");
    expect(resolveMemberCardGroup(["Guest", "Member NUE"])).toBe("MemberNUE");
    expect(resolveMemberCardGroup("unknown")).toBe("guest");
    expect(memberCardGroupLabels(["Member NUE", "Member ER"])).toEqual(["Member NUE", "Member ER"]);
    expect(memberCardGroupLabels(["Member ER", "Member ER"])).toEqual(["Member ER"]);
  });
});

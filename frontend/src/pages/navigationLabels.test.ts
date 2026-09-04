import { describe, expect, it } from "vitest";
import { primaryNavMessageKey } from "./navigationLabels";
import type { PrimaryNavTab } from "./navigationLabels";

describe("primary navigation labels", () => {
  it("maps each primary tab to its own navigation message", () => {
    expect(((["dashboard", "events", "payments", "profile"] as PrimaryNavTab[]).map(primaryNavMessageKey))).toEqual([
      "nav.home",
      "nav.events",
      "nav.payments",
      "nav.profile",
    ]);
  });
});

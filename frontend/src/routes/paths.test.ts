import { describe, expect, it } from "vitest";
import { primaryNavigation, primaryTabForPath, routes } from "./paths";

describe("canonical application routes", () => {
  it("maps every member navigation item to a canonical URL", () => {
    expect(primaryNavigation).toEqual({
      dashboard: "/home",
      events: "/events",
      payments: "/payments",
      profile: "/profile",
    });
    expect(primaryTabForPath(routes.home)).toBe("dashboard");
    expect(primaryTabForPath(routes.events)).toBe("events");
    expect(primaryTabForPath(routes.payments)).toBe("payments");
    expect(primaryTabForPath(routes.profile)).toBe("profile");
  });

  it("keeps administrative destinations separate from member navigation", () => {
    expect(routes.adminMembers).toBe("/admin/members");
    expect(routes.adminEvents).toBe("/admin/events");
    expect(routes.adminPayments).toBe("/admin/payments");
    expect(routes.adminMemberCardScanner).toBe("/admin/member-card-scanner");
    expect(primaryTabForPath(routes.adminMembers)).toBeUndefined();
  });
});

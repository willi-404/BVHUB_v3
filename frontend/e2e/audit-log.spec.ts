import { expect, test, type Page } from "@playwright/test";
import { e2ePocketBaseApiRoute } from "./test-endpoints";

const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`;
const member = { id: "member-00000001", email: "member@example.test", displayName: "Member User", firstName: "Member", lastName: "User", role: "MEMBER", active: true, verified: true, created: "2026-01-01T00:00:00.000Z", updated: "2026-01-01T00:00:00.000Z" };
const admin = { ...member, id: "admin-000000001", email: "admin@example.test", displayName: "Admin User", firstName: "Admin", lastName: "User", role: "ADMIN" };
const logItems = [{ id: "audit-event0001", eventType: "USER_PROFILE_UPDATED", actorUser: member.id, targetUser: member.id, metadata: { changes: { city: { old: "Erlangen", new: "Nürnberg" } } }, created: "2026-06-01T12:00:00.000Z" }];

async function mockSession(page: Page, user: typeof admin | typeof member) {
  await page.addInitScript(({ record, sessionToken }: { record: typeof admin | typeof member; sessionToken: string }) => {
    window.sessionStorage.setItem("pb_auth", JSON.stringify({ token: sessionToken, record }));
    window.sessionStorage.setItem("bvhub.locale", "en");
  }, { record: user, sessionToken: token });
  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/collections/users/auth-refresh") return route.fulfill({ json: { token, record: user } });
    if (url.pathname === `/api/collections/users/records/${user.id}`) return route.fulfill({ json: { id: user.id } });
    if (url.pathname === "/api/bvhub/me/profile") return route.fulfill({ json: { user, profile: null, groups: [] } });
    if (url.pathname === "/api/bvhub/dashboard/statistics") return route.fulfill({ json: { timezone: "Europe/Berlin", trackingSince: "2026-04", current: { registeredUsers: 1, members: 1, publishedEventsThisMonth: 0, myUpcomingRegistrations: 0 }, months: [] } });
    if (url.pathname === "/api/bvhub/me/payments") return route.fulfill({ json: { items: [] } });
    if (url.pathname === "/api/bvhub/admin/groups") return route.fulfill({ json: { groups: [] } });
    if (url.pathname === "/api/bvhub/admin/users") {
      const items = Array.from({ length: 40 }, (_, index) => ({
        ...member,
        id: `mem${String(index).padStart(12, "0")}`,
        displayName: index === 0 ? "Member User" : `Member ${index}`,
        firstName: index === 0 ? "Member" : `Member${index}`,
        lastName: "User",
        groups: [],
      }));
      return route.fulfill({ json: { items, page: 1, perPage: 50, totalItems: items.length, totalPages: 1 } });
    }
    if (url.pathname.endsWith("/audit-log")) return route.fulfill({ json: { items: logItems, page: 1, perPage: 30, totalItems: 1, totalPages: 1 } });
    return route.fulfill({ json: { items: [] } });
  });
}

test("members open their own log and combine activity filters in place", async ({ page }) => {
  await mockSession(page, member);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Audit log" }).click();
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(page.getByText(/Nürnberg/)).toBeVisible();
  const firstResponse = page.waitForResponse((response) => response.url().includes("/api/bvhub/me/audit-log"));
  await page.getByRole("checkbox", { name: "Login" }).check();
  const response = await firstResponse;
  expect(new URL(response.url()).searchParams.get("categories")).toBe("1,2,3,4,5");
  await expect(page.getByRole("heading", { name: "Audit log" })).toHaveCount(1);
});

test("a late pagination response does not overwrite a newly selected filter", async ({ page }) => {
  await mockSession(page, member);
  let releasePageTwo!: () => void;
  let markPageTwoStarted!: () => void;
  const pageTwoStarted = new Promise<void>((resolve) => { markPageTwoStarted = resolve; });
  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/bvhub/me/audit-log") return route.fallback();
    const categories = url.searchParams.get("categories");
    const requestedPage = url.searchParams.get("page");
    if (categories === "2,3,4,5" && requestedPage === "2") {
      markPageTwoStarted();
      await new Promise<void>((resolve) => { releasePageTwo = resolve; });
      return route.fulfill({ json: { items: [{ ...logItems[0], id: "audit-event0002", eventType: "EVENT_REGISTERED" }], page: 2, perPage: 30, totalItems: 2, totalPages: 2 } });
    }
    return route.fulfill({ json: { items: logItems, page: 1, perPage: 30, totalItems: 2, totalPages: 2 } });
  });

  await page.goto("/profile");
  await page.getByRole("button", { name: "Audit log" }).click();
  await page.getByRole("button", { name: "Load more" }).click();
  await pageTwoStarted;
  const filteredResponse = page.waitForResponse((response) => response.url().includes("/api/bvhub/me/audit-log") && new URL(response.url()).searchParams.get("categories") === "1,2,3,4,5");
  await page.getByRole("checkbox", { name: "Login" }).check();
  await filteredResponse;
  releasePageTwo();
  await expect(page.getByRole("heading", { name: "Registered for an event" })).toHaveCount(0);
  await expect(page.getByText(/Nürnberg/)).toBeVisible();
});

test("admin opens a member log in the details view and table headers stay fixed", async ({ page }) => {
  await mockSession(page, admin);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/admin/members");
  await expect(page.getByPlaceholder("Search email, display name, or legal name")).toBeVisible();
  const searchInput = page.getByPlaceholder("Search email, display name, or legal name");
  const filterButton = page.getByRole("button", { name: "Filter" });
  const searchTopBefore = (await searchInput.boundingBox())?.y;
  const filterTopBefore = (await filterButton.boundingBox())?.y;
  const table = page.locator("table");
  await expect(table.locator("th").first()).toBeVisible();
  const listScroller = table.locator("xpath=../..");
  const header = table.locator("th").first();
  const topBefore = (await header.boundingBox())?.y;
  await listScroller.evaluate((element) => { element.scrollTop = 300; });
  await expect.poll(async () => (await header.boundingBox())?.y).toBeCloseTo(topBefore ?? 0, 0);
  expect((await searchInput.boundingBox())?.y).toBe(searchTopBefore);
  expect((await filterButton.boundingBox())?.y).toBe(filterTopBefore);

  await page.getByRole("button", { name: "mem000000000000" }).click();
  const logRequest = page.waitForResponse((response) => response.url().includes("/api/bvhub/admin/users/") && response.url().includes("/audit-log"));
  await page.getByRole("button", { name: "Audit log" }).last().click();
  await expect(page.getByText(/Nürnberg/)).toBeVisible();
  const response = await logRequest;
  expect(new URL(response.url()).searchParams.get("categories")).toBe("2,3,4,5");
  await page.getByRole("button", { name: "Back to /admin/members" }).click();
  await expect(page).toHaveURL("/admin/members");
});

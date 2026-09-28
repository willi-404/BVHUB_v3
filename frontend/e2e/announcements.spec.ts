import { expect, test, type Page } from "@playwright/test"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
const member = {
  id: "announcement-member",
  email: "member@example.test",
  displayName: "Announcement Member",
  firstName: "Announcement",
  lastName: "Member",
  role: "MEMBER",
  active: true,
  verified: true,
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
}
const admin = {
  ...member,
  id: "announcement-admin",
  email: "admin@example.test",
  displayName: "Announcement Admin",
  role: "ADMIN",
}
const item = {
  id: "announcement-1",
  position: 1,
  active: true,
  title: "Court update",
  content: "The hall opens at 18:30.",
  read: false,
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
}

async function mockApp(page: Page, user: typeof member | typeof admin) {
  await page.addInitScript(
    ({ record, sessionToken }) => {
      window.sessionStorage.setItem(
        "pb_auth",
        JSON.stringify({ token: sessionToken, record }),
      )
      window.sessionStorage.setItem("bvhub.locale", "en")
    },
    { record: user, sessionToken: token },
  )
  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/collections/users/auth-refresh")
      return route.fulfill({ json: { token, record: user } })
    if (url.pathname === `/api/collections/users/records/${user.id}`)
      return route.fulfill({ json: { id: user.id } })
    if (url.pathname === "/api/bvhub/me/profile")
      return route.fulfill({ json: { user, profile: null, groups: [] } })
    if (url.pathname === "/api/bvhub/me/announcements")
      return route.fulfill({
        json: { items: [item], unreadCount: item.read ? 0 : 1 },
      })
    if (url.pathname.endsWith("/read")) {
      item.read = true
      return route.fulfill({ status: 204 })
    }
    if (url.pathname === "/api/bvhub/dashboard/statistics")
      return route.fulfill({
        json: {
          timezone: "Europe/Berlin",
          trackingSince: "2026-01",
          current: {
            registeredUsers: 1,
            members: 1,
            publishedEventsThisMonth: 0,
            myUpcomingRegistrations: 0,
          },
          months: [],
        },
      })
    if (url.pathname === "/api/bvhub/events")
      return route.fulfill({ json: { items: [] } })
    if (url.pathname === "/api/bvhub/me/payments")
      return route.fulfill({ json: { items: [] } })
    if (url.pathname === "/api/bvhub/news")
      return route.fulfill({ json: { items: [] } })
    if (url.pathname === "/api/bvhub/admin/news")
      return route.fulfill({
        json: {
          locales: [
            { locale: "zh", posts: [], slots: [] },
            { locale: "de", posts: [], slots: [] },
          ],
        },
      })
    if (url.pathname === "/api/bvhub/admin/announcements")
      return route.fulfill({
        json: { announcements: [], slots: { zh: [], de: [] } },
      })
    return route.fulfill({ json: {} })
  })
}

test("shows an unread announcement, marks it read, and keeps it in notifications", async ({
  page,
}) => {
  await mockApp(page, member)
  await page.goto("/dashboard")
  await expect(
    page.getByRole("dialog", { name: "Notifications" }),
  ).toBeVisible()
  await expect(page.getByText("Court update", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Mark as read" }).click()
  await expect(
    page.locator('span[aria-label="1 unread notifications"]'),
  ).toHaveCount(0)
  await expect(page.getByRole("dialog", { name: "Notifications" })).toHaveCount(
    0,
  )
  await page.getByRole("button", { name: "Notifications" }).first().click()
  await expect(
    page.getByRole("dialog", { name: "Notifications" }),
  ).toContainText("Court update")
  await expect(page.getByText("New", { exact: true })).toHaveCount(0)
})

test("renders the bilingual announcement editor in the existing news admin page", async ({
  page,
}) => {
  await mockApp(page, admin)
  await page.goto("/admin/news")
  await page.getByRole("button", { name: "New announcement" }).click()
  const dialog = page.getByRole("dialog", { name: "Edit announcement" })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("中文", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Deutsch", { exact: true })).toBeVisible()
  await expect(dialog.getByRole("textbox")).toHaveCount(4)
  await page.screenshot({
    path: "playwright-report/announcement-editor.png",
    fullPage: true,
  })
})

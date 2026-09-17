import { expect, test, type Page } from "@playwright/test"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
const venue = {
  id: "venue-000000001",
  name: "Test hall",
  address: "Test street 1",
  description: "",
  checkoutRegion: "ER",
  active: true,
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
}

function eventRecord(
  id: string,
  title: string,
  status: "MEMBERS_ONLY" | "OPEN_TO_ALL" | "CANCELLED" | "COMPLETED",
  start: string,
) {
  return {
    id,
    title,
    description: "Event details",
    venue,
    start,
    end: start,
    abmeldefrist: start,
    capacity: 20,
    guestFeeCents: 380,
    registeredCount: 0,
    spotsLeft: 20,
    myRegistrationStatus: null,
    canRegister: false,
    canCancel: false,
    published: true,
    firstPublishedAt: "2026-01-01T00:00:00.000Z",
    canDelete: false,
    status,
    createdBy: "admin-000000001",
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
  }
}

const admin = {
  id: "admin-000000001",
  email: "admin@example.test",
  displayName: "Admin User",
  firstName: "Admin",
  lastName: "User",
  role: "ADMIN",
  active: true,
  verified: true,
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
}
const member = {
  ...admin,
  id: "member-00000001",
  email: "member@example.test",
  displayName: "Member User",
  firstName: "Member",
  role: "MEMBER",
}
const recentEvents = [
  eventRecord(
    "event-open-00001",
    "Open event",
    "OPEN_TO_ALL",
    "2099-09-01T16:00:00.000Z",
  ),
  eventRecord(
    "event-members001",
    "Members event",
    "MEMBERS_ONLY",
    "2099-08-01T16:00:00.000Z",
  ),
]
const historicEvents = [
  ...recentEvents,
  eventRecord(
    "event-cancelled1",
    "Cancelled event",
    "CANCELLED",
    "2099-10-01T16:00:00.000Z",
  ),
  eventRecord(
    "event-completed1",
    "Completed event",
    "COMPLETED",
    "2099-11-01T16:00:00.000Z",
  ),
]
const adminEvents = Array.from({ length: 18 }, (_, index) =>
  eventRecord(
    `admin-event-${String(index).padStart(3, "0")}`,
    `Admin event ${index + 1}`,
    "OPEN_TO_ALL",
    `2099-09-${String((index % 27) + 1).padStart(2, "0")}T16:00:00.000Z`,
  ),
)

async function mockApi(page: Page, user: typeof admin | typeof member) {
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
    if (url.pathname === "/api/bvhub/dashboard/statistics")
      return route.fulfill({
        json: {
          timezone: "Europe/Berlin",
          trackingSince: "2026-04",
          current: {
            registeredUsers: 1,
            members: 1,
            publishedEventsThisMonth: 0,
            myUpcomingRegistrations: 0,
          },
          months: [],
        },
      })
    if (url.pathname === "/api/bvhub/me/payments")
      return route.fulfill({ json: { items: [] } })
    if (url.pathname === "/api/bvhub/events")
      return route.fulfill({
        json: {
          items:
            url.searchParams.get("showAll") === "true"
              ? historicEvents
              : recentEvents,
        },
      })
    if (url.pathname === "/api/bvhub/admin/events")
      return route.fulfill({ json: { items: adminEvents } })
    if (url.pathname === "/api/bvhub/admin/venues")
      return route.fulfill({ json: { items: [venue] } })
    if (url.pathname === "/api/bvhub/admin/payment-settings")
      return route.fulfill({
        json: {
          recipientName: "",
          iban: "",
          bic: "",
          configured: false,
          updated: "2026-01-01T00:00:00.000Z",
        },
      })
    if (url.pathname === "/api/bvhub/admin/payment-summary")
      return route.fulfill({ json: { items: [] } })
    return route.fulfill({ json: { items: [] } })
  })
}

test("event management navigation uses the admin route and its scroll container", async ({
  page,
}) => {
  await mockApi(page, admin)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Event management" }).click()
  await expect(page).toHaveURL("/admin/events")

  const desktopMain = page.locator("main").first()
  await expect(desktopMain).toBeVisible()
  const desktopBox = await desktopMain.boundingBox()
  expect(desktopBox).not.toBeNull()
  await page.mouse.move((desktopBox?.x ?? 0) + 24, (desktopBox?.y ?? 0) + 120)
  await page.mouse.wheel(0, 1000)
  await expect
    .poll(() => desktopMain.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)

  await page.setViewportSize({ width: 375, height: 844 })
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Open navigation menu" }).click()
  await page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("button", { name: "Event management" })
    .click()
  await expect(page).toHaveURL("/admin/events")
  const mobileMain = page.locator("main").first()
  const mobileBox = await mobileMain.boundingBox()
  expect(mobileBox).not.toBeNull()
  await page.mouse.move((mobileBox?.x ?? 0) + 24, (mobileBox?.y ?? 0) + 120)
  await page.mouse.wheel(0, 1000)
  await expect
    .poll(() => mobileMain.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
})

test("activity list requests all published statuses only after Show all", async ({
  page,
}) => {
  await mockApi(page, member)
  await page.goto("/events")
  await expect(page.getByText("Open event", { exact: true })).toBeVisible()
  await expect(page.getByText("Cancelled event", { exact: true })).toHaveCount(
    0,
  )
  await page.getByRole("button", { name: "Show all" }).click()
  await expect(page.getByText("Cancelled event", { exact: true })).toBeVisible()
  await expect(page.getByText("Completed event", { exact: true })).toBeVisible()
})

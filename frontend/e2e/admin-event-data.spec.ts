import { expect, test, type Page } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
const admin = { id: "admin-000000001", email: "admin@example.test", displayName: "Admin User", firstName: "Admin", lastName: "User", role: "ADMIN", active: true, verified: true, created: "2026-01-01T00:00:00.000Z", updated: "2026-01-01T00:00:00.000Z" }
const member = { ...admin, id: "member-00000001", email: "member@example.test", displayName: "=Member User", firstName: "Member", lastName: "User", role: "MEMBER" }
const venue = { id: "venue-000000001", name: "Test hall", address: "Test street 1", description: "", checkoutRegion: "ER", active: true, created: "2026-01-01T00:00:00.000Z", updated: "2026-01-01T00:00:00.000Z" }
const event = {
  id: "event-data-00001",
  title: "Annual/Event",
  description: "Event details",
  venue,
  start: "2099-09-01T16:00:00.000Z",
  end: "2099-09-01T18:00:00.000Z",
  abmeldefrist: "2099-08-31T16:00:00.000Z",
  capacity: 20,
  guestFeeCents: 380,
  registeredCount: 1,
  spotsLeft: 19,
  myRegistrationStatus: null,
  canRegister: false,
  canCancel: false,
  published: true,
  firstPublishedAt: "2026-01-01T00:00:00.000Z",
  canDelete: false,
  status: "COMPLETED" as const,
  createdBy: admin.id,
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
}
const details = {
  ...member,
  username: member.displayName,
  memberSince: member.created,
  groups: [{ id: "group-000000001", name: "Member ER" }],
  avatar: null,
  address: "Test Street 42A, 91052 Erlangen",
  street: "Test Street",
  houseNumber: "42A",
  postalCode: "91052",
  city: "Erlangen",
  birthDate: "1990-05-06",
  phone: "+49 911 123456",
  contactInfo: "Preferred contact information",
}

async function mockSession(page: Page, user: typeof admin | typeof member) {
  await page.addInitScript(({ record, sessionToken }) => {
    window.sessionStorage.setItem("pb_auth", JSON.stringify({ token: sessionToken, record }))
    window.sessionStorage.setItem("bvhub.locale", "en")
  }, { record: user, sessionToken: token })
  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/collections/users/auth-refresh") return route.fulfill({ json: { token, record: user } })
    if (url.pathname === `/api/collections/users/records/${user.id}`) return route.fulfill({ json: { id: user.id } })
    if (url.pathname === "/api/bvhub/admin/events") {
      const statuses = ["MEMBERS_ONLY", "OPEN_TO_ALL", "CANCELLED", "COMPLETED"] as const
      return route.fulfill({ json: { items: statuses.map((status, index) => ({ ...event, id: index ? `event-data-0000${index + 1}` : event.id, status })) } })
    }
    if (url.pathname === "/api/bvhub/admin/venues") return route.fulfill({ json: { items: [venue] } })
    if (url.pathname === `/api/bvhub/events/${event.id}`) return route.fulfill({ json: event })
    if (url.pathname === `/api/bvhub/events/${event.id}/participants`) return route.fulfill({ json: {
      items: [{ registrationId: "registration001", userId: user.role === "ADMIN" ? member.id : undefined, displayName: member.displayName, firstName: user.role === "ADMIN" ? member.firstName : undefined, lastName: user.role === "ADMIN" ? member.lastName : undefined, avatar: null, registeredAt: "2026-10-01T12:00:00.000Z" }],
      totalItems: 1,
      waitlist: [],
      myWaitlistPosition: null,
    } })
    if (url.pathname === `/api/bvhub/admin/events/${event.id}/participants/${member.id}`) return route.fulfill({ json: details })
    if (url.pathname === `/api/bvhub/admin/events/${event.id}/participants/export`) return route.fulfill({ json: {
      event: { id: event.id, title: event.title },
      items: [{ ...details, registrationId: "registration001", registrationStatus: "REGISTERED", registeredAt: "2026-10-01T12:00:00.000Z", waitlistPosition: null, deleted: false, protected: false }],
    } })
    return route.fulfill({ json: { items: [] } })
  })
}

test("exports every event status to a sanitized timestamped xlsx", async ({ page }) => {
  await mockSession(page, admin)
  await page.goto("/admin/events")
  await expect(page.getByRole("button", { name: "Export data" })).toHaveCount(4)
  const downloadPromise = page.waitForEvent("download")
  await page.getByTestId(`export-event-${event.id}`).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^Annual-Event-id-event-data-00001-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.xlsx$/)
  const content = await readFile((await download.path())!)
  expect(content.subarray(0, 2).toString()).toBe("PK")
  expect(content.byteLength).toBeGreaterThan(1000)
})

test("opens read-only participant details for an administrator", async ({ page }) => {
  await mockSession(page, admin)
  await page.goto(`/events/${event.id}`)
  await page.getByRole("button", { name: `View details for ${member.displayName}` }).click()
  const dialog = page.getByRole("dialog", { name: "Member User" })
  await expect(dialog).toContainText(member.email)
  await expect(dialog).toContainText(details.address)
  await expect(dialog.getByRole("button", { name: "Audit log" })).toHaveCount(0)
  await expect(dialog.getByRole("button", { name: /Delete/ })).toHaveCount(0)
  await dialog.getByRole("button", { name: "Close" }).last().click()
})

test("does not expose participant detail controls to a member", async ({ page }) => {
  await mockSession(page, member)
  await page.goto(`/events/${event.id}`)
  await expect(page.getByRole("button", { name: `View details for ${member.displayName}` })).toHaveCount(0)
})

import { expect, test, type Page, type Route } from "@playwright/test"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

const token = "A".repeat(48)
const user = {
  id: "member-card-user",
  email: "member-card@example.test",
  displayName: "QR Member",
  firstName: "QR",
  lastName: "Member",
  role: "MEMBER",
  active: true,
  verified: true,
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-09-01T00:00:00.000Z",
}

function authToken() {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url")
  return `${header}.${payload}.test-signature`
}

async function mockMemberSession(
  page: Page,
  record = user,
  groups = [
    {
      membershipId: "membership",
      id: "member-er",
      name: "Member ER",
      active: true,
      created: user.created,
      updated: user.updated,
    },
  ],
  profileRecord = record,
) {
  const sessionToken = authToken()
  await page.addInitScript(
    ({
      initialToken,
      record,
    }: {
      initialToken: string
      record: typeof user
    }) => {
      window.sessionStorage.setItem(
        "pb_auth",
        JSON.stringify({ token: initialToken, record }),
      )
      window.sessionStorage.setItem("bvhub.locale", "en")
    },
    { initialToken: sessionToken, record },
  )
  await page.route(e2ePocketBaseApiRoute, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === "/api/collections/users/auth-refresh")
      return route.fulfill({ json: { token: sessionToken, record } })
    if (path === "/api/bvhub/me/profile")
      return route.fulfill({
        json: { user: profileRecord, profile: null, groups },
      })
    if (path === "/api/bvhub/me/member-card-token")
      return route.fulfill({
        json: {
          token,
          expiresAt: "2099-01-01T00:02:00.000Z",
          refreshAt: "2099-01-01T00:01:40.000Z",
        },
      })
    if (path === "/api/bvhub/member-card/verify")
      return route.fulfill({
        json: {
          valid: true,
          member: {
            id: record.id,
            displayName: record.displayName,
            groups: ["Member ER"],
          },
          tokenExpiresAt: "2099-01-01T00:02:00.000Z",
          verifiedAt: "2026-09-14T20:00:00.000Z",
        },
      })
    if (path === "/api/bvhub/dashboard/statistics")
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
          months: [
            {
              month: "2026-04",
              registeredUsers: 1,
              members: 1,
              complete: true,
            },
            {
              month: "2026-05",
              registeredUsers: 1,
              members: 1,
              complete: true,
            },
            {
              month: "2026-06",
              registeredUsers: 1,
              members: 1,
              complete: true,
            },
            {
              month: "2026-07",
              registeredUsers: 1,
              members: 1,
              complete: true,
            },
            {
              month: "2026-08",
              registeredUsers: 1,
              members: 1,
              complete: true,
            },
            {
              month: "2026-09",
              registeredUsers: 1,
              members: 1,
              complete: false,
            },
          ],
        },
      })
    if (path === "/api/bvhub/events")
      return route.fulfill({ json: { items: [] } })
    return route.fulfill({ json: { items: [] } })
  })
}

test("member card renders a real SVG QR and verification route consumes its fragment", async ({
  page,
}) => {
  await mockMemberSession(page)
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Open member card" }).click()
  const card = page
    .locator("article")
    .filter({ has: page.getByTestId("member-card-qr") })
  await expect(card).toBeVisible()
  await expect(card.locator('[data-slot="avatar-fallback"]')).toHaveText("QM")
  await expect(card.locator('[data-slot="badge"]').first()).toHaveText("Active")
  await expect(card.locator("section p")).toContainText("Member · Member ER")
  await expect(
    card.getByText("member-card-user", { exact: true }).first(),
  ).toBeVisible()
  await expect(card.getByText(/2026/, { exact: false }).first()).toBeVisible()
  await expect(
    card.getByRole("img", { name: "Badminton Verein Erlangen logo" }),
  ).toBeVisible()
  await expect(card.getByRole("button", { name: "View QR Code" })).toBeFocused()
  const frontBox = await card.boundingBox()
  await card.getByRole("button", { name: "View QR Code" }).click()
  await expect(card.getByRole("button", { name: "Back to Card" })).toBeFocused()
  await expect(card.locator(".member-card-face--front")).toHaveAttribute(
    "aria-hidden",
    "true",
  )
  await expect(card.locator(".member-card-face--back")).toHaveAttribute(
    "aria-hidden",
    "false",
  )
  await expect(card.getByTestId("member-card-qr").locator("svg")).toBeVisible()
  const backBox = await card.boundingBox()
  expect(backBox?.width).toBe(frontBox?.width)
  expect(backBox?.height).toBe(frontBox?.height)
  await card.getByRole("button", { name: "Back to Card" }).click()
  await expect(card.getByRole("button", { name: "View QR Code" })).toBeFocused()
  await expect(
    page
      .getByTestId("member-card-qr")
      .locator('[style*="grid-template-columns"]'),
  ).toHaveCount(0)
  const verification = page.waitForRequest(
    (request) =>
      request.url().includes("/api/bvhub/member-card/verify") &&
      request.method() === "POST",
  )
  await page.goto(`/member/verify#${token}`)
  expect((await verification).postDataJSON()).toEqual({ token })
  await expect(
    page.getByText("Membership valid", { exact: true }),
  ).toBeVisible()
  await expect.poll(() => new URL(page.url()).hash).toBe("")
})

test("guest account renders its issued QR instead of the unavailable state", async ({
  page,
}) => {
  const guest = {
    ...user,
    id: "guest-card-user",
    email: "guest-card@example.test",
    displayName: "QR Guest",
    lastName: "Guest",
    role: "GUEST",
  }
  await mockMemberSession(page, guest, [])
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Open member card" }).click()
  await page.getByRole("button", { name: "View QR Code" }).click()
  await expect(page.getByTestId("member-card-qr").locator("svg")).toBeVisible()
  await expect(
    page.getByText("QR code is unavailable.", { exact: true }),
  ).toHaveCount(0)
})

test("member card handles a long name and inactive account on mobile", async ({
  page,
}) => {
  const inactive = {
    ...user,
    displayName: "Alexandria Maximilian von Hohenberg".repeat(2),
    role: "ADMIN",
    active: false,
  }
  await mockMemberSession(page, user, [], inactive)
  await page.setViewportSize({ width: 375, height: 844 })
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Open member card" }).click()

  const card = page
    .locator("article")
    .filter({ has: page.getByTestId("member-card-qr") })
  await expect(
    card.getByRole("heading", { name: inactive.displayName }),
  ).toBeVisible()
  await expect(card.locator('[data-slot="badge"]').first()).toHaveText("Inactive")
  await expect(card.locator("section p")).toContainText("Admin · Guest")
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width)
})

test("verification page fits a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 })
  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === "/api/bvhub/member-card/verify")
      return route.fulfill({ json: { valid: false } })
    return route.fulfill({ json: { items: [] } })
  })
  await page.goto(`/member/verify#${token}`)
  await expect(
    page.getByText("Membership card invalid or expired", { exact: true }),
  ).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width)
})

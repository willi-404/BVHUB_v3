import { expect, test, type Page, type Route } from "@playwright/test"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

function authToken() {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")
  return `${header}.${payload}.test-signature`
}

const user = {
  id: "dashboard-user",
  email: "dashboard@example.test",
  displayName: "Dashboard Member",
  firstName: "Dashboard",
  lastName: "Member",
  role: "MEMBER",
  active: true,
  verified: true,
  created: "2025-01-01T00:00:00.000Z",
  updated: "2026-09-01T00:00:00.000Z",
}

const completeStatistics = {
  timezone: "Europe/Berlin",
  trackingSince: "2026-04",
  current: { registeredUsers: 321, members: 87, publishedEventsThisMonth: 4, myUpcomingRegistrations: 3 },
  months: [
    { month: "2026-04", registeredUsers: 280, members: 73, complete: true },
    { month: "2026-05", registeredUsers: 289, members: 76, complete: true },
    { month: "2026-06", registeredUsers: 300, members: 80, complete: true },
    { month: "2026-07", registeredUsers: 306, members: 82, complete: true },
    { month: "2026-08", registeredUsers: 312, members: 84, complete: true },
    { month: "2026-09", registeredUsers: 321, members: 87, complete: false },
  ],
}

async function mockDashboard(page: Page, handler: (route: Route) => Promise<void>) {
  const token = authToken()
  await page.addInitScript(({ initialToken, record }) => {
    window.sessionStorage.setItem("pb_auth", JSON.stringify({ token: initialToken, record }))
    window.sessionStorage.setItem("bvhub.locale", "en")
  }, { initialToken: token, record: user })

  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === "/api/bvhub/dashboard/statistics") return handler(route)
    if (path === "/api/collections/users/auth-refresh") return route.fulfill({ json: { token, record: user } })
    if (path === `/api/collections/users/records/${user.id}`) return route.fulfill({ json: { id: user.id } })
    if (path === "/api/bvhub/me/profile") return route.fulfill({ json: { user, profile: null, groups: [] } })
    if (path === "/api/bvhub/events") return route.fulfill({ json: { items: [] } })
    return route.fulfill({ json: { items: [] } })
  })
}

test("renders four real metrics, a two-series area chart, tooltip, and legend", async ({ page }) => {
  await mockDashboard(page, async (route) => route.fulfill({ json: completeStatistics }))
  await page.goto("/dashboard")

  const stats = page.locator('[data-responsive-grid="dashboard-stats"]')
  await expect(stats.getByText("321", { exact: true }).first()).toBeVisible()
  await expect(stats.getByText("87", { exact: true }).first()).toBeVisible()
  await expect(stats.getByText("4", { exact: true })).toBeVisible()
  await expect(stats.getByText("3", { exact: true })).toBeVisible()
  await expect(stats.getByText("Registered users", { exact: true }).first()).toBeVisible()
  await expect(stats.getByText("Full members", { exact: true }).first()).toBeVisible()
  await expect(stats.locator(".recharts-area")).toHaveCount(2)
  await expect(stats.locator(".recharts-legend-wrapper")).toContainText("Registered users")
  await expect(stats.locator(".recharts-legend-wrapper")).toContainText("Full members")
  await expect(stats.getByText("+2.9% · up from last month", { exact: true })).toBeVisible()
  await expect(page.getByText("148", { exact: true })).toHaveCount(0)
  await expect(page.getByText("+8%", { exact: true })).toHaveCount(0)

  const chart = stats.locator('[data-slot="chart"]')
  await chart.scrollIntoViewIfNeeded()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width * 0.82, box!.y + box!.height * 0.5)
  const tooltip = stats.locator(".recharts-tooltip-wrapper")
  await expect(tooltip).toContainText("Registered users")
  await expect(tooltip).toContainText("Full members")
  await expect(tooltip).toContainText("312")
  await expect(tooltip).toContainText("84")
})

test("shows loading, retryable failure, and complete realtime history", async ({ page }) => {
  let requests = 0
  let releaseFirstResponse: () => void
  let confirmFirstRequest: () => void
  const firstResponse = new Promise<void>((resolve) => { releaseFirstResponse = resolve })
  const firstRequest = new Promise<void>((resolve) => { confirmFirstRequest = resolve })
  await mockDashboard(page, async (route) => {
    requests += 1
    if (requests === 1) {
      confirmFirstRequest()
      await firstResponse
      await route.fulfill({ status: 500, json: { message: "failed" } })
      return
    }
    await route.fulfill({ json: completeStatistics })
  })
  await page.goto("/dashboard")
  await firstRequest
  await expect(page.getByText("Loading real statistics…")).toBeVisible()
  releaseFirstResponse()
  await expect(page.getByText("Statistics could not be loaded")).toBeVisible()
  await page.getByRole("button", { name: "Try again" }).click()
  await expect(page.getByText("Tracking starts this month")).toHaveCount(0)
  await expect(page.getByText("Some months have no exact snapshot; no values were interpolated")).toHaveCount(0)
})

test("statistics layout has restrained motion and disables it for reduced-motion users", async ({ page }) => {
  await mockDashboard(page, async (route) => route.fulfill({ json: completeStatistics }))
  await page.goto("/dashboard")
  const card = page.locator(".dashboard-stat-enter").first()
  await expect(card).toBeVisible()
  expect(await card.evaluate((element) => getComputedStyle(element).animationName)).toContain("dashboard-stat-enter")

  await page.emulateMedia({ reducedMotion: "reduce" })
  expect(await card.evaluate((element) => getComputedStyle(element).animationName)).toBe("none")
  expect(await card.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s")
})

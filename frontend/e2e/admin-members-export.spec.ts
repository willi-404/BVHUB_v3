import { expect, test, type Page } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

const admin = {
  id: "admin-000000001",
  email: "admin@example.test",
  displayName: "Admin User",
  firstName: "Admin",
  lastName: "User",
  role: "ADMIN",
  active: true,
  verified: true,
}
const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`

async function mockAdmin(page: Page) {
  const exportPages: string[] = []
  const members = Array.from({ length: 125 }, (_, index) => ({
    id: `member-${String(index).padStart(4, "0")}`,
    displayName: `Member ${index}`,
    firstName: `First${index}`,
    lastName: `Last${index}`,
    email: `member${index}@example.test`,
    role: index % 2 ? "MEMBER" : "GUEST",
    created: "2026-01-01T00:00:00.000Z",
    groups: [
      {
        id: `group-${index % 2}`,
        membershipId: `membership-${index}`,
        name: index % 3 === 0 ? "Member ER" : index % 3 === 1 ? "Guest" : "Member NUE",
        active: true,
      },
    ],
  }))
  await page.addInitScript(
    ({ record, sessionToken }) => {
      window.sessionStorage.setItem(
        "pb_auth",
        JSON.stringify({ token: sessionToken, record }),
      )
      window.sessionStorage.setItem("bvhub.locale", "en")
    },
    { record: admin, sessionToken: token },
  )
  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/collections/users/auth-refresh")
      return route.fulfill({ json: { token, record: admin } })
    if (url.pathname === `/api/collections/users/records/${admin.id}`)
      return route.fulfill({ json: { id: admin.id } })
    if (url.pathname === "/api/bvhub/me/profile")
      return route.fulfill({ json: { user: admin, profile: null, groups: [] } })
    if (url.pathname === "/api/bvhub/dashboard/statistics")
      return route.fulfill({
        json: {
          timezone: "Europe/Berlin",
          trackingSince: "2026-04",
          current: {
            registeredUsers: 125,
            members: 62,
            publishedEventsThisMonth: 0,
            myUpcomingRegistrations: 0,
          },
          months: [],
        },
      })
    if (url.pathname === "/api/bvhub/admin/users") {
      const pageNumber = Number(url.searchParams.get("page") ?? "1")
      const perPage = Number(url.searchParams.get("perPage") ?? "50")
      const search = url.searchParams.get("search")?.toLowerCase() ?? ""
      const matching = members.filter((member) =>
        [member.displayName, member.firstName, member.lastName, member.email].some(
          (value) => value.toLowerCase().includes(search),
        ),
      )
      if (perPage === 100) exportPages.push(`${pageNumber}:${search}`)
      const items = matching.slice(
        (pageNumber - 1) * perPage,
        pageNumber * perPage,
      )
      return route.fulfill({
        json: {
          items,
          page: pageNumber,
          perPage,
          totalItems: matching.length,
          totalPages: Math.max(1, Math.ceil(matching.length / perPage)),
        },
      })
    }
    return route.fulfill({ json: { items: [] } })
  })
  return exportPages
}

test("exports every member matching selected groups to a timestamped xlsx", async ({
  page,
}) => {
  const exportPages = await mockAdmin(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto("/admin/members")
  await page.getByPlaceholder("Search email, display name, or legal name").fill("Member")
  await expect(page.getByText("Member 0", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Filter" }).click()
  await page.getByRole("button", { name: "Member ER" }).click()
  await page.getByRole("button", { name: /Guest/ }).click()
  await page.getByRole("button", { name: /Apply/ }).click()
  await expect(page.getByText("Member 2", { exact: true })).toHaveCount(0)

  const downloadPromise = page.waitForEvent("download")
  await page.getByTestId("export-members").click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^bvhub-members-\d{14}\.xlsx$/)
  const content = await readFile((await download.path())!)
  expect(content.subarray(0, 2).toString()).toBe("PK")
  expect(content.byteLength).toBeGreaterThan(1000)
  expect(exportPages).toEqual(["1:member", "2:member"])
})

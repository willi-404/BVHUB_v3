import { expect, test, type Page } from "@playwright/test"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
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
const guest = {
  id: "guest-000000001",
  displayName: "Pending Guest",
  firstName: "Pending",
  lastName: "Guest",
  email: "pending@example.test",
  role: "GUEST",
  active: false,
  verified: false,
  created: "2026-03-01T00:00:00.000Z",
  updated: "2026-03-01T00:00:00.000Z",
  groups: [
    {
      id: "group-guest-001",
      membershipId: "membership-guest-001",
      name: "Guest",
      active: true,
    },
  ],
}
const member = {
  id: "member-00000001",
  displayName: "Active Member",
  firstName: "Active",
  lastName: "Member",
  email: "member@example.test",
  role: "MEMBER",
  active: true,
  verified: true,
  created: "2026-02-01T00:00:00.000Z",
  updated: "2026-02-01T00:00:00.000Z",
  groups: [
    {
      id: "group-guest-001",
      membershipId: "membership-member-001",
      name: "Guest",
      active: true,
    },
  ],
}

function details(user: typeof guest | typeof member) {
  return {
    ...user,
    username: user.displayName,
    memberSince: user.created,
    street: "Test Street",
    houseNumber: "1",
    postalCode: "91052",
    city: "Erlangen",
    address: "Test Street 1, 91052 Erlangen",
    birthDate: "1990-01-01",
    phone: "+49 911 123456",
    contactInfo: "",
  }
}

async function mockAdmin(page: Page, locale = "en") {
  const createdBodies: Record<string, unknown>[] = []
  const forceDeleted: string[] = []
  await page.addInitScript(
    ({ record, sessionToken, locale }) => {
      window.sessionStorage.setItem(
        "pb_auth",
        JSON.stringify({ token: sessionToken, record }),
      )
      window.sessionStorage.setItem("bvhub.locale", locale)
    },
    { record: admin, sessionToken: token, locale },
  )
  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === "/api/collections/users/auth-refresh")
      return route.fulfill({ json: { token, record: admin } })
    if (url.pathname === `/api/collections/users/records/${admin.id}`)
      return route.fulfill({ json: { id: admin.id } })
    if (url.pathname === "/api/bvhub/me/profile")
      return route.fulfill({ json: { user: admin, profile: null, groups: [] } })
    if (url.pathname === "/api/bvhub/admin/groups")
      return route.fulfill({
        json: {
          groups: [{ id: "group-guest-001", name: "Guest", active: true }],
        },
      })
    if (
      url.pathname === "/api/bvhub/admin/users" &&
      request.method() === "POST"
    ) {
      createdBodies.push(request.postDataJSON())
      return route.fulfill({
        status: 201,
        json: details({
          ...guest,
          id: "created-guest-01",
          email: "created@example.test",
          displayName: "Created Guest",
          firstName: "Created",
          lastName: "Guest",
        }),
      })
    }
    if (url.pathname === "/api/bvhub/admin/users" && request.method() === "GET")
      return route.fulfill({
        json: {
          items: [guest, member],
          page: 1,
          perPage: 50,
          totalItems: 2,
          totalPages: 1,
        },
      })
    if (url.pathname.endsWith("/force-delete")) {
      forceDeleted.push(url.pathname.split("/").at(-2)!)
      return route.fulfill({ status: 200, json: { status: "DELETED" } })
    }
    if (url.pathname.startsWith("/api/bvhub/admin/users/")) {
      const id = url.pathname.split("/").at(-1)!
      return route.fulfill({ json: details(id === guest.id ? guest : member) })
    }
    return route.fulfill({ json: { items: [] } })
  })
  return { createdBodies, forceDeleted }
}

test("admin creates Guest accounts and force deletes unverified accounts", async ({
  page,
}) => {
  const calls = await mockAdmin(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto("/admin/members")
  await expect(
    page.getByText("Pending Guest", { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByText(guest.id, { exact: true })).toHaveCount(0)

  await page.getByTestId("create-member").click()
  await page.getByTestId("create-member-email").fill("created@example.test")
  await page.getByTestId("create-member-displayName").fill("Created Guest")
  await page.getByTestId("create-member-firstName").fill("Created")
  await page.getByTestId("create-member-lastName").fill("Guest")
  await page.getByTestId("create-member-street").fill("Main Street")
  await page.getByTestId("create-member-houseNumber").fill("2")
  await page.getByTestId("create-member-postalCode").fill("91052")
  await page.getByTestId("create-member-city").fill("Erlangen")
  await page.getByTestId("create-member-birthDate").fill("1990-01-01")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect.poll(() => calls.createdBodies).toHaveLength(1)
  expect(calls.createdBodies[0]).not.toHaveProperty("role")
  expect(calls.createdBodies[0]).not.toHaveProperty("password")

  await page
    .getByRole("table")
    .getByText("Pending Guest", { exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Force delete account" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Force delete account" }).click()
  await page
    .getByLabel(`Enter the user ID ${guest.id} to confirm`)
    .fill(guest.id)
  await page
    .getByRole("button", { name: "Force delete account" })
    .last()
    .click()
  await expect.poll(() => calls.forceDeleted).toEqual([guest.id])
})

test("admin member list remains within the mobile viewport", async ({
  page,
}) => {
  await mockAdmin(page, "de")
  await page.setViewportSize({ width: 375, height: 844 })
  await page.goto("/admin/members")
  await expect(
    page
      .locator("div.lg\\:hidden")
      .getByText("Pending Guest", { exact: true })
      .first(),
  ).toBeVisible()
  const actions = page.getByTestId("member-actions")
  await expect(actions).toBeVisible()
  await expect(page.getByTestId("create-member")).toBeVisible()
  await expect(page.getByTestId("export-members")).toBeVisible()
  await expect(page.getByTestId("filter-members")).toHaveText("Filtern")
  expect(
    await Promise.all(
      ["create-member", "export-members", "filter-members"].map((id) =>
        page.getByTestId(id).evaluate((element) => {
          const style = getComputedStyle(element)
          return (
            style.whiteSpace === "nowrap" &&
            element.getBoundingClientRect().width > 0
          )
        }),
      ),
    ),
  ).toEqual([true, true, true])
  expect(
    await page
      .locator("body")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true)
})

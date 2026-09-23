import { expect, test, type Page } from "@playwright/test"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

type Role = "MEMBER" | "ADMIN"

const farFuture = "2027-10-20T18:00:00.000Z"

function authToken() {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }),
  ).toString("base64url")
  return `${header}.${payload}.test-signature`
}

function eventRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "responsive-event",
    title: `Mobile event ${"verylongtitle".repeat(15)}`,
    description: `Details https://example.test/${"unbroken".repeat(30)}`,
    venue: {
      id: "venue-1",
      name: "Erlangen sports hall",
      address: `Court Street ${"longaddress".repeat(20)}`,
      description: "",
      checkoutRegion: "ER",
      active: true,
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-01T00:00:00.000Z",
    },
    start: "2027-10-20T16:00:00.000Z",
    end: farFuture,
    abmeldefrist: "2027-10-19T18:00:00.000Z",
    capacity: 24,
    registeredCount: 4,
    spotsLeft: 20,
    myRegistrationStatus: null,
    canRegister: true,
    canCancel: false,
    published: true,
    firstPublishedAt: "2026-01-01T00:00:00.000Z",
    canDelete: false,
    status: "OPEN_TO_ALL",
    createdBy: "user-1",
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

async function mockSession(
  page: Page,
  options: { role?: Role; event?: ReturnType<typeof eventRecord> } = {},
) {
  const role = options.role ?? "MEMBER"
  const token = authToken()
  const user = {
    id: "user-1",
    email: "responsive@example.test",
    displayName: `Responsive ${"membername".repeat(20)}`,
    firstName: "Responsive",
    lastName: "Member",
    role,
    active: true,
    verified: true,
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
  }
  const event = options.event ?? eventRecord()

  await page.addInitScript(
    ({ token: initialToken, record }) => {
      window.sessionStorage.setItem(
        "pb_auth",
        JSON.stringify({ token: initialToken, record }),
      )
      window.sessionStorage.setItem("bvhub.locale", "en")
    },
    { token, record: user },
  )

  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === "/api/collections/users/auth-refresh") {
      await route.fulfill({ json: { token, record: user } })
      return
    }
    if (path === `/api/collections/users/records/${user.id}`) {
      await route.fulfill({ json: { id: user.id } })
      return
    }
    if (path === "/api/bvhub/me/profile") {
      await route.fulfill({
        json: {
          user,
          profile: {
            street: `Street ${"longprofilevalue".repeat(20)}`,
            houseNumber: "12a",
            postalCode: "91054",
            city: "Erlangen",
            birthDate: "1990-01-01",
            phone: "+49 123 456789",
            contactInfo: `https://example.test/${"contact".repeat(30)}`,
            created: user.created,
            updated: user.updated,
          },
          groups: [
            {
              membershipId: "membership-1",
              id: "group-1",
              name: "MemberER",
              active: true,
              created: user.created,
              updated: user.updated,
            },
          ],
        },
      })
      return
    }
    if (path === "/api/bvhub/events") {
      await route.fulfill({ json: { items: [event] } })
      return
    }
    if (path === "/api/bvhub/dashboard/statistics") {
      await route.fulfill({
        json: {
          timezone: "Europe/Berlin",
          trackingSince: "2026-04",
          current: { registeredUsers: 12, members: 8, publishedEventsThisMonth: 1, myUpcomingRegistrations: 1 },
          months: [
            { month: "2026-04", registeredUsers: 7, members: 4, complete: true },
            { month: "2026-05", registeredUsers: 8, members: 5, complete: true },
            { month: "2026-06", registeredUsers: 9, members: 6, complete: true },
            { month: "2026-07", registeredUsers: 10, members: 6, complete: true },
            { month: "2026-08", registeredUsers: 11, members: 7, complete: true },
            { month: "2026-09", registeredUsers: 12, members: 8, complete: false },
          ],
        },
      })
      return
    }
    if (path === `/api/bvhub/events/${event.id}`) {
      await route.fulfill({ json: event })
      return
    }
    if (path === `/api/bvhub/events/${event.id}/participants`) {
      await route.fulfill({
        json: {
          items: [
            {
              registrationId: "registration-1",
              userId: user.id,
              displayName: `Participant ${"longparticipant".repeat(20)}`,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          ],
          totalItems: 1,
        },
      })
      return
    }
    if (
      path === `/api/bvhub/events/${event.id}/registrations` ||
      path === `/api/bvhub/events/${event.id}/registrations/me`
    ) {
      await route.fulfill({ json: { ok: true } })
      return
    }
    await route.fulfill({ json: { items: [] } })
  })
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    html: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
    body: [document.body.scrollWidth, document.body.clientWidth],
  }))
  expect(dimensions.html[0]).toBeLessThanOrEqual(dimensions.html[1])
  expect(dimensions.body[0]).toBeLessThanOrEqual(dimensions.body[1])
}

test.describe("responsive application shell", () => {
  test("uses canonical member routes and closes the phone drawer after navigation", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockSession(page)
    await page.goto("/home")

    for (const [label, path] of [["Event", "/events"], ["Payments", "/payments"], ["Profile", "/profile"]] as const) {
      await page.getByRole("button", { name: "Open navigation menu" }).click()
      const drawer = page.getByRole("dialog", { name: "Menu" })
      await drawer.getByRole("button", { name: label, exact: true }).click()
      await expect(page).toHaveURL(path)
      await expect(drawer).toBeHidden()
      await expect(page.locator("#mobile-navigation-drawer button[aria-current=page]")).toHaveText(label)
    }
  })

  test("redirects legacy URLs and rejects non-administrator management deep links", async ({ page }) => {
    await mockSession(page)
    await page.goto("/dashboard")
    await expect(page).toHaveURL("/home")

    await page.goto("/admin/members")
    await expect(page).toHaveURL("/home")

    await mockSession(page, { role: "ADMIN" })
    await page.goto("/members")
    await expect(page).toHaveURL("/admin/members")
    await page.goto("/admin")
    await expect(page).toHaveURL("/admin/members")
  })

  for (const width of [320, 375, 767]) {
    test(`${width}px uses the phone layout without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await mockSession(page)
      await page.goto("/dashboard")
      await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible()
      await expect(page.locator("nav.fixed.bottom-0")).toBeHidden()
      await expect(page.locator("aside")).toBeHidden()
      await expect(page.locator("[data-responsive-grid]")).toHaveCount(2)

      for (const grid of await page.locator("[data-responsive-grid]").all()) {
        const columnCount = await grid.evaluate((element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
        )
        expect(columnCount).toBe(1)
      }

      const contentBox = await page.locator("#app-view-dashboard").boundingBox()
      expect(contentBox).not.toBeNull()
      expect(contentBox!.x).toBeGreaterThanOrEqual(16)
      expect(width - (contentBox!.x + contentBox!.width)).toBeGreaterThanOrEqual(16)
      await expectNoHorizontalOverflow(page)

      const mediaFits = await page.locator("img").evaluateAll((images) =>
        images.every((image) => image.getBoundingClientRect().width <= (image.parentElement?.getBoundingClientRect().width ?? Infinity) + 0.5),
      )
      expect(mediaFits).toBe(true)
    })
  }

  test("768px restores tablet tabs and 1024px restores the desktop sidebar", async ({ page }) => {
    await mockSession(page)
    await page.setViewportSize({ width: 768, height: 900 })
    await page.goto("/dashboard")
    await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeHidden()
    await expect(page.locator("nav.fixed.bottom-0")).toBeVisible()
    await expect(page.locator("aside")).toBeHidden()

    await page.setViewportSize({ width: 1024, height: 900 })
    await expect(page.locator("nav.fixed.bottom-0")).toBeHidden()
    await expect(page.locator("aside")).toBeVisible()
    await expect(page.locator("#mobile-navigation-drawer")).toBeHidden()
    await expectNoHorizontalOverflow(page)
  })

  test("registration forms stay single-column with 16px controls on phones", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await mockSession(page)
    await page.goto("/register")
    await expect(page.locator("form .grid")).toHaveCount(3)
    for (const grid of await page.locator("form .grid").all()) {
      const columnCount = await grid.evaluate((element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
      )
      expect(columnCount).toBe(1)
    }
    await expect(page.locator("form input").first()).toHaveCSS("font-size", "16px")
    await expectNoHorizontalOverflow(page)

    await page.setViewportSize({ width: 768, height: 900 })
    const columnCount = await page.locator("form .grid").first().evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
    )
    expect(columnCount).toBe(2)
  })

  test("drawer traps focus, locks scroll, closes by Escape and restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockSession(page)
    await page.goto("/dashboard")
    const trigger = page.locator('button[aria-controls="mobile-navigation-drawer"]')
    await trigger.click()
    const drawer = page.getByRole("dialog", { name: "Menu" })
    await expect(drawer).toBeVisible()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(page.locator(".app-shell-background")).toHaveAttribute("inert", "")
    expect(await page.evaluate(() => document.body.style.position)).toBe("fixed")
    await expect(drawer.getByRole("button", { name: "Close" })).toBeFocused()

    await page.keyboard.press("Shift+Tab")
    await expect(drawer.getByRole("button", { name: "Sign out" })).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(drawer.getByRole("button", { name: "Close" })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => document.body.style.position)).toBe("")

    await trigger.click()
    await page.locator(".mobile-drawer-backdrop").click({ position: { x: 4, y: 4 } })
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test("drawer navigation closes, scrolls to the selected view and focuses its title", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockSession(page)
    await page.goto("/dashboard")
    await page.locator("#app-main-content").evaluate((main) => main.scrollTo(0, 600))
    await page.getByRole("button", { name: "Open navigation menu" }).click()
    const drawer = page.getByRole("dialog", { name: "Menu" })
    await drawer.getByRole("button", { name: "Event", exact: true }).click()
    await expect(drawer).toBeHidden()
    await expect(page.locator("#view-title-events")).toBeFocused()
    await expect(page.locator("#app-view-events")).toBeVisible()
    await expect.poll(() => page.locator("#app-main-content").evaluate((main) => main.scrollTop)).toBeLessThan(10)

    const panelTransition = await page.locator("#mobile-navigation-drawer").evaluate((element) => ({
      duration: getComputedStyle(element).transitionDuration,
      easing: getComputedStyle(element).transitionTimingFunction,
    }))
    expect(panelTransition.duration).toContain("0.2s")
    expect(panelTransition.easing).toContain("cubic-bezier(0.2, 0, 0, 1)")
  })

  test("reduced motion removes the drawer slide", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.setViewportSize({ width: 375, height: 812 })
    await mockSession(page)
    await page.goto("/dashboard")
    const panel = page.locator("#mobile-navigation-drawer")
    const styles = await panel.evaluate((element) => ({
      property: getComputedStyle(element).transitionProperty,
      transform: getComputedStyle(element).transform,
    }))
    expect(styles.property).toBe("opacity")
    expect(styles.transform).toBe("none")
  })

  test("admin links only appear for administrators", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockSession(page, { role: "MEMBER" })
    await page.goto("/dashboard")
    await page.getByRole("button", { name: "Open navigation menu" }).click()
    await expect(page.getByRole("dialog").getByText("Management", { exact: true })).toHaveCount(0)
  })
})

test("administrator sees management links in the phone drawer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await mockSession(page, { role: "ADMIN" })
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Open navigation menu" }).click()
  const drawer = page.getByRole("dialog", { name: "Menu" })
  await expect(drawer.getByText("Management", { exact: true })).toBeVisible()
  await expect(drawer.getByRole("button", { name: "Members" })).toBeVisible()
  await expect(drawer.getByRole("button", { name: "Event management" })).toBeVisible()
})

test.describe("mobile event calls to action", () => {
  test("registration and terms actions are sticky on phones and use the existing submit request", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const event = eventRecord()
    let registrationRequests = 0
    await mockSession(page, { event })
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === `/api/bvhub/events/${event.id}/registrations`
      ) registrationRequests += 1
    })

    await page.goto(`/events/${event.id}`)
    const detailCta = page.locator(".mobile-cta").filter({ hasText: "Register" })
    await expect(detailCta).toHaveCSS("position", "sticky")
    await expect(detailCta.getByRole("link", { name: "Register", exact: true })).toHaveCSS("height", "44px")
    await expectNoHorizontalOverflow(page)

    await detailCta.getByRole("link", { name: "Register", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/events/${event.id}/checkout$`))
    const checkoutCta = page.locator(".mobile-cta").filter({ hasText: "I have read and agree" })
    await expect(checkoutCta).toHaveCSS("position", "sticky")
    const contentPadding = await page.locator(".mobile-cta-content").evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).paddingBottom),
    )
    expect(contentPadding).toBeGreaterThanOrEqual(68)
    await checkoutCta.getByRole("button", { name: "I have read and agree" }).click()
    await expect.poll(() => registrationRequests).toBe(1)
  })

  test("cancel is the only CTA for a cancellable registration and no empty CTA is rendered", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const registeredEvent = eventRecord({
      myRegistrationStatus: "REGISTERED",
      canRegister: false,
      canCancel: true,
    })
    let cancellationRequests = 0
    await mockSession(page, { event: registeredEvent })
    page.on("request", (request) => {
      if (
        request.method() === "DELETE" &&
        new URL(request.url()).pathname === `/api/bvhub/events/${registeredEvent.id}/registrations/me`
      ) cancellationRequests += 1
    })
    await page.goto(`/events/${registeredEvent.id}`)
    const cta = page.locator(".mobile-cta")
    await expect(cta).toHaveCount(1)
    await expect(cta.getByRole("button", { name: "Cancel registration" })).toBeVisible()
    await cta.getByRole("button", { name: "Cancel registration" }).click()
    await expect.poll(() => cancellationRequests).toBe(1)

    const unavailableEvent = eventRecord({
      status: "CANCELLED",
      canRegister: false,
      canCancel: false,
      myRegistrationStatus: null,
    })
    await page.unroute(e2ePocketBaseApiRoute)
    await mockSession(page, { event: unavailableEvent })
    await page.goto(`/events/${unavailableEvent.id}`)
    await expect(page.locator(".mobile-cta")).toHaveCount(0)
    await expect(page.locator(".mobile-cta-content")).toHaveCount(0)
  })

  test("CTA returns to document flow at 768px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 })
    const event = eventRecord()
    await mockSession(page, { event })
    await page.goto(`/events/${event.id}`)
    await expect(page.locator(".mobile-cta")).toHaveCSS("position", "static")
  })
})

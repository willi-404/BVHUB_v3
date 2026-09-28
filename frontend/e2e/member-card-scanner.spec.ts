import { expect, test, type Page } from "@playwright/test"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

const admin = {
  id: "scanner-admin",
  email: "scanner-admin@example.test",
  displayName: "Scanner Admin",
  firstName: "Scanner",
  lastName: "Admin",
  role: "ADMIN",
  active: true,
  verified: true,
}

const sessionToken = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`

async function openScanner(page: Page) {
  await page.addInitScript(({ token, record }) => {
    sessionStorage.setItem("pb_auth", JSON.stringify({ token, record }))
    sessionStorage.setItem("bvhub.locale", "en")
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const canvas = document.createElement("canvas")
        canvas.width = 640
        canvas.height = 480
        const context = canvas.getContext("2d")!
        context.fillStyle = "#169b62"
        context.fillRect(0, 0, 640, 480)
        return canvas.captureStream(30)
      },
    })
  }, { token: sessionToken, record: admin })

  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === "/api/collections/users/auth-refresh")
      return route.fulfill({ json: { token: sessionToken, record: admin } })
    if (path === `/api/collections/users/records/${admin.id}`)
      return route.fulfill({ json: { id: admin.id } })
    return route.fulfill({ json: { items: [] } })
  })
  await page.goto("/admin/member-card-scanner")
  await expect(page.getByRole("button", { name: "Stop camera" })).toBeVisible()
}

test("camera video fills the scanner preview on desktop and phone", async ({ page }) => {
  await openScanner(page)
  const video = page.getByLabel("Camera preview")

  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 844 })
    await expect.poll(() => video.evaluate((element) => {
      const frame = element.parentElement!.getBoundingClientRect()
      const image = element.getBoundingClientRect()
      return Math.abs(frame.height - image.height) < 1 && Math.abs(frame.width - image.width) < 1
    })).toBe(true)
    await expect(video).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }

  await page.getByRole("button", { name: "Stop camera" }).click()
  await expect(page.getByRole("button", { name: "Start camera" })).toBeVisible()
  await page.getByRole("button", { name: "Start camera" }).click()
  await expect(page.getByRole("button", { name: "Stop camera" })).toBeVisible()
  await expect.poll(() => video.evaluate((element) => {
    const frame = element.parentElement!.getBoundingClientRect()
    return Math.abs(frame.height - element.getBoundingClientRect().height) < 1
  })).toBe(true)
})

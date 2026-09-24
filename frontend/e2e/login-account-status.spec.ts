import { expect, test, type Page } from "@playwright/test"
import { e2ePocketBaseApiRoute } from "./test-endpoints"

type AccountStatus = "not_found" | "pending_verification" | "inactive" | "active"

const messages = {
  en: {
    not_found: "We did not find this email address. Please register first or check that it is entered correctly.",
    pending_verification: "This account is awaiting email verification. Please use the link in your registration email.",
    inactive: "This account has been banned. Please contact vorstand@bv-erlangen2025.de.",
  },
  de: {
    not_found: "Wir haben diese E-Mail-Adresse nicht erhalten. Bitte registriere dich zuerst oder prüfe, ob sie korrekt eingegeben wurde.",
    pending_verification: "Dieses Konto wartet auf die E-Mail-Bestätigung. Bitte verwende den Link in deiner Registrierungs-E-Mail.",
    inactive: "Dieses Konto wurde gesperrt. Bitte kontaktiere vorstand@bv-erlangen2025.de.",
  },
  "zh-CN": {
    not_found: "未收到该邮箱，请先注册或检查邮箱是否输入正确。",
    pending_verification: "该账户正在等待邮箱验证，请使用注册邮件中的链接完成验证。",
    inactive: "该账户已被 ban，请联系 vorstand@bv-erlangen2025.de。",
  },
} as const

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    html: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
    body: [document.body.scrollWidth, document.body.clientWidth],
  }))
  expect(dimensions.html[0]).toBeLessThanOrEqual(dimensions.html[1])
  expect(dimensions.body[0]).toBeLessThanOrEqual(dimensions.body[1])
}

test("localizes account status messages and normalizes OTP email requests", async ({ page }) => {
  let status: AccountStatus = "not_found"
  const statusEmails: string[] = []
  const otpEmails: string[] = []

  await page.addInitScript(() => window.sessionStorage.setItem("bvhub.locale", "en"))
  await page.route(e2ePocketBaseApiRoute, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === "/api/bvhub/auth/account-status") {
      statusEmails.push(request.postDataJSON().email)
      await route.fulfill({ json: { status } })
      return
    }
    if (path === "/api/collections/users/request-otp") {
      otpEmails.push(request.postDataJSON().email)
      await route.fulfill({ json: { otpId: "otp-123" } })
      return
    }
    await route.fulfill({ json: { items: [] } })
  })

  await page.goto("/login")
  const email = page.locator("#login-identity")
  const submit = page.locator("form button[type=submit]")

  for (const locale of ["en", "de", "zh-CN"] as const) {
    await page.locator("select").selectOption(locale)
    for (const accountStatus of ["not_found", "pending_verification", "inactive"] as const) {
      status = accountStatus
      await email.fill(" Member@Example.Test ")
      await submit.click()
      await expect(page.getByText(messages[locale][accountStatus], { exact: true })).toBeVisible()
    }
  }

  await page.locator("select").selectOption("en")
  status = "active"
  await email.fill(" Member@Example.Test ")
  await submit.click()
  await expect(page.getByText("If a matching account exists, a code has been sent.", { exact: true })).toBeVisible()
  expect(statusEmails).toEqual(Array(10).fill("member@example.test"))
  expect(otpEmails).toEqual(["member@example.test"])

  await page.setViewportSize({ width: 375, height: 844 })
  await expectNoHorizontalOverflow(page)
})

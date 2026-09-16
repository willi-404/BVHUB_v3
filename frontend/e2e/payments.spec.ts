import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { spawn, spawnSync, type ChildProcess } from "node:child_process"
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const apiBase = "http://127.0.0.1:18099"
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const pbDir = join(repoRoot, "pocketbase")
const binary = join(pbDir, "pocketbase")
const migrationsDir = join(pbDir, "pb_migrations")
const hooksDir = join(pbDir, "pb_hooks")
const superuserEmail = "payments-e2e-superuser@example.test"
const superuserPassword = "Payments-E2E-Password-12!"

type SeedUser = { id: string; email: string; displayName: string; firstName: string; lastName: string; role: "GUEST" | "MEMBER" | "ADMIN"; active: true; verified: true; created: string; updated: string }
type Seed = {
  rootToken: string
  users: { guest: SeedUser; waitingGuest: SeedUser; member: SeedUser; admin: SeedUser }
  tokens: Record<"guest" | "waitingGuest" | "member" | "admin", string>
  events: { guest: { id: string; title: string }; waiting: { id: string; title: string } }
  waitingRegistrationId: string
  waitingFillerRegistrationId: string
  guestPaymentId?: string
  memberPaymentId?: string
  waitingPaymentId?: string
}

let dataDir = ""
let server: ChildProcess | undefined
let logFd: number | undefined
let seed: Seed

async function api<T>(method: string, path: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { ...(token ? { Authorization: token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text}`)
  return (text ? JSON.parse(text) : null) as T
}

async function waitForPocketBase() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${apiBase}/api/health`)
      if (response.ok) return
    } catch {
      // Server is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100))
  }
  throw new Error("Payment E2E PocketBase did not become healthy")
}

function runPocketBase(args: string[]) {
  const result = spawnSync(binary, args, { cwd: pbDir, encoding: "utf8" })
  if (result.status !== 0) throw new Error(`${binary} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`)
}

function userBody(email: string, role: SeedUser["role"], displayName: string) {
  return { email, password: superuserPassword, passwordConfirm: superuserPassword, displayName, firstName: displayName.split(" ")[0], lastName: displayName.split(" ").slice(1).join(" "), role, active: true, verified: true }
}

async function createEvent(token: string, venueId: string, title: string, capacity: number) {
  return api<{ id: string; title: string }>("POST", "/api/bvhub/admin/events", token, {
    title,
    description: "Isolated payment E2E fixture",
    venue: venueId,
    start: "2099-11-14T18:00:00.000Z",
    end: "2099-11-14T20:00:00.000Z",
    abmeldefrist: "2099-11-13T18:00:00.000Z",
    capacity,
    guestFeeCents: 380,
    published: true,
    status: "OPEN_TO_ALL",
  })
}

async function seedPocketBase(): Promise<Seed> {
  const auth = await api<{ token: string }>("POST", "/api/collections/_superusers/auth-with-password", undefined, { identity: superuserEmail, password: superuserPassword })
  const rootToken = auth.token
  const users = {
    guest: await api<SeedUser>("POST", "/api/collections/users/records", rootToken, userBody("payments-guest@example.test", "GUEST", "Payment Guest")),
    waitingGuest: await api<SeedUser>("POST", "/api/collections/users/records", rootToken, userBody("payments-waiting@example.test", "GUEST", "Waiting Guest")),
    member: await api<SeedUser>("POST", "/api/collections/users/records", rootToken, userBody("payments-member@example.test", "MEMBER", "Payment Member")),
    admin: await api<SeedUser>("POST", "/api/collections/users/records", rootToken, userBody("payments-admin@example.test", "ADMIN", "Payment Admin")),
  }
  const tokenFor = async (user: SeedUser) => (await api<{ token: string }>("POST", `/api/collections/users/impersonate/${user.id}`, rootToken, { duration: 3600 })).token
  const tokens = {
    guest: await tokenFor(users.guest),
    waitingGuest: await tokenFor(users.waitingGuest),
    member: await tokenFor(users.member),
    admin: await tokenFor(users.admin),
  }
  const venue = await api<{ id: string }>("POST", "/api/bvhub/admin/venues", tokens.admin, { name: "Payment E2E Hall", address: "Teststrasse 1, 91052 Erlangen", description: "", checkoutRegion: "ER" })
  const events = {
    guest: await createEvent(tokens.admin, venue.id, "Guest Fee Training", 10),
    waiting: await createEvent(tokens.admin, venue.id, "Waiting List Training", 1),
  }
  await api("PATCH", "/api/bvhub/admin/payment-settings", tokens.admin, { recipientName: "Badminton Verein Erlangen", iban: "DE89370400440532013000", bic: "COBADEFFXXX" })
  const waitingFiller = await api<{ id: string }>("POST", `/api/bvhub/events/${events.waiting.id}/registrations`, tokens.member, { checkoutRegion: "ER", termsVersion: "ER-v1" })
  const waitingRegistration = await api<{ id: string; status: string }>("POST", `/api/bvhub/events/${events.waiting.id}/registrations`, tokens.waitingGuest, { checkoutRegion: "ER", termsVersion: "ER-v1" })
  expect(waitingRegistration.status).toBe("WAITING")
  return { rootToken, users, tokens, events, waitingRegistrationId: waitingRegistration.id, waitingFillerRegistrationId: waitingFiller.id }
}

async function sessionPage(browser: Browser, user: SeedUser, token: string, viewport?: { width: number; height: number }) {
  const context = await browser.newContext({ viewport })
  await context.addInitScript(({ record, sessionToken }) => {
    window.sessionStorage.setItem("pb_auth", JSON.stringify({ token: sessionToken, record }))
    window.sessionStorage.setItem("bvhub.locale", "en")
  }, { record: user, sessionToken: token })
  return { context, page: await context.newPage() }
}

async function paymentByRegistration(registrationId: string) {
  const result = await api<{ items: Array<{ id: string; status: string; active: boolean }> }>("GET", `/api/collections/payments/records?filter=${encodeURIComponent(`registration = "${registrationId}"`)}`, seed.rootToken)
  return result.items[0]
}

async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
}

test.describe.serial("payments with isolated PocketBase", () => {
  test.beforeAll(async () => {
    dataDir = mkdtempSync(join(tmpdir(), "bvhub-payment-e2e-"))
    runPocketBase(["migrate", "up", `--dir=${dataDir}`, `--migrationsDir=${migrationsDir}`, `--hooksDir=${hooksDir}`])
    runPocketBase(["superuser", "create", superuserEmail, superuserPassword, `--dir=${dataDir}`])
    logFd = openSync(join(dataDir, "server.log"), "a")
    server = spawn(binary, ["serve", "--http=127.0.0.1:18099", `--dir=${dataDir}`, `--migrationsDir=${migrationsDir}`, `--hooksDir=${hooksDir}`], { cwd: pbDir, stdio: ["ignore", logFd, logFd] })
    await waitForPocketBase()
    seed = await seedPocketBase()
  })

  test.afterAll(async () => {
    if (server && server.exitCode === null) {
      server.kill("SIGTERM")
      await new Promise<void>((resolvePromise) => server?.once("exit", () => resolvePromise()))
    }
    if (logFd !== undefined) closeSync(logFd)
    if (dataDir.startsWith(join(tmpdir(), "bvhub-payment-e2e-"))) rmSync(dataDir, { recursive: true, force: true })
  })

  test("guest registers and receives local EPC QR and payto details", async ({ browser }) => {
    const { context, page } = await sessionPage(browser, seed.users.guest, seed.tokens.guest)
    await page.goto(`/events/${seed.events.guest.id}`)
    await page.getByRole("link", { name: "Register", exact: true }).click()
    await page.getByRole("button", { name: "I have read and agree" }).click()
    await expect(page.getByText("Registration successful.")).toBeVisible()
    const registration = await api<{ id: string }>("GET", `/api/bvhub/events/${seed.events.guest.id}/registration`, seed.tokens.guest)
    const createdPayment = await paymentByRegistration(registration.id)
    seed.guestPaymentId = createdPayment.id

    await page.goto("/dashboard")
    await page.getByRole("button", { name: /Payments$/ }).first().click()
    const paymentRow = page.getByRole("row").filter({ hasText: seed.events.guest.title })
    await expect(paymentRow).toBeVisible()
    await expect(paymentRow.getByText("Unpaid", { exact: true })).toBeVisible()
    await paymentRow.getByRole("link", { name: `Payment details: ${seed.events.guest.title}` }).click()
    await expect(page).toHaveURL(`/payments/${createdPayment.id}`)
    await expect(page.getByTestId("epc-payment-qr").locator("svg")).toBeVisible()
    await expect(page.locator("dd").getByText("€3.80", { exact: true })).toBeVisible()
    await expect(page.locator("dd").getByText("Badminton Verein Erlangen", { exact: true })).toBeVisible()
    await expect(page.locator("dd").getByText("DE89 3704 0044 0532 0130 00", { exact: true })).toBeVisible()
    await expect(page.getByTestId("payto-link")).toHaveAttribute("href", /^payto:\/\/iban\//)
    const downloadPromise = page.waitForEvent("download")
    await page.getByTestId("download-payment-qr").click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(`bvhub-payment-${createdPayment.id}.png`)
    const pngPath = await download.path()
    expect(pngPath).toBeTruthy()
    const png = readFileSync(pngPath as string)
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(png.readUInt32BE(16)).toBeGreaterThan(224)
    expect(png.readUInt32BE(20)).toBeGreaterThan(224)
    await context.close()
  })

  test("member payment is paid with zero fee and exposes no payment action", async ({ browser }) => {
    const registration = await api<{ id: string }>("POST", `/api/bvhub/events/${seed.events.guest.id}/registrations`, seed.tokens.member, { checkoutRegion: "ER", termsVersion: "ER-v1" })
    const createdPayment = await paymentByRegistration(registration.id)
    seed.memberPaymentId = createdPayment.id
    const { context, page } = await sessionPage(browser, seed.users.member, seed.tokens.member)
    await page.goto(`/payments/${createdPayment.id}`)
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("You are a member. No payment is required for this event.")).toBeVisible()
    await expect(page.locator("dd").getByText("€0.00", { exact: true })).toBeVisible()
    await expect(page.getByTestId("epc-payment-qr")).toHaveCount(0)
    await expect(page.getByTestId("download-payment-qr")).toHaveCount(0)
    await expect(page.getByTestId("payto-link")).toHaveCount(0)
    await context.close()
  })

  test("admin table toggles payment and the guest detail updates through realtime", async ({ browser }) => {
    const guestSession = await sessionPage(browser, seed.users.guest, seed.tokens.guest)
    const adminSession = await sessionPage(browser, seed.users.admin, seed.tokens.admin)
    await guestSession.page.goto(`/payments/${seed.guestPaymentId}`)
    await expect(guestSession.page.getByText("Unpaid", { exact: true }).first()).toBeVisible()
    await adminSession.page.goto("/admin/payments")
    const eventCard = adminSession.page.getByTestId(`payment-event-${seed.events.guest.id}`)
    await eventCard.getByRole("button").first().click()
    const row = eventCard.getByRole("row").filter({ hasText: "Payment Guest" })
    await expect(row).toBeVisible()
    const statusSwitch = row.getByRole("switch", { name: "Change payment status" })
    const unpaidTrackColor = await statusSwitch.evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(unpaidTrackColor).not.toBe("rgb(255, 255, 255)")
    expect(unpaidTrackColor).not.toBe("rgb(226, 232, 240)")
    await statusSwitch.click()
    const paidTrackColor = await statusSwitch.evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(paidTrackColor).not.toBe(unpaidTrackColor)
    expect(paidTrackColor).not.toBe("rgb(255, 255, 255)")
    await expect(row.getByText("Paid", { exact: true })).toBeVisible()
    await expect(guestSession.page.getByText("Paid", { exact: true }).first()).toBeVisible({ timeout: 10_000 })
    await expect(guestSession.page.getByTestId("epc-payment-qr")).toHaveCount(0)
    await expect(guestSession.page.getByTestId("download-payment-qr")).toHaveCount(0)
    await guestSession.context.close()
    await adminSession.context.close()
  })

  test("waiting payment appears after atomic promotion without reloading", async ({ browser }) => {
    expect(await paymentByRegistration(seed.waitingRegistrationId)).toBeUndefined()
    const waitingSession = await sessionPage(browser, seed.users.waitingGuest, seed.tokens.waitingGuest)
    await waitingSession.page.goto("/dashboard")
    await waitingSession.page.getByRole("button", { name: /Payments$/ }).first().click()
    await expect(waitingSession.page.getByText(seed.events.waiting.title, { exact: true })).toHaveCount(0)
    await api("DELETE", `/api/bvhub/admin/events/${seed.events.waiting.id}/participants/${seed.users.member.id}`, seed.tokens.admin)
    const promoted = await expect.poll(() => paymentByRegistration(seed.waitingRegistrationId)).not.toBeUndefined()
    void promoted
    seed.waitingPaymentId = (await paymentByRegistration(seed.waitingRegistrationId)).id
    await expect(waitingSession.page.getByRole("row").filter({ hasText: seed.events.waiting.title })).toBeVisible({ timeout: 10_000 })
    await waitingSession.context.close()
  })

  test("user and admin payment views remain usable at mobile width", async ({ browser }) => {
    const userSession = await sessionPage(browser, seed.users.waitingGuest, seed.tokens.waitingGuest, { width: 320, height: 844 })
    await userSession.page.goto("/dashboard")
    await userSession.page.getByRole("button", { name: "Open navigation menu" }).click()
    await userSession.page.getByRole("dialog").getByRole("button", { name: /Payments/ }).click()
    await expect(userSession.page.getByRole("heading", { name: seed.events.waiting.title, exact: true })).toBeVisible()
    await noHorizontalOverflow(userSession.page)
    await userSession.page.getByRole("link", { name: "Payment details" }).click()
    await expect(userSession.page.getByTestId("epc-payment-qr").locator("svg")).toBeVisible()
    await noHorizontalOverflow(userSession.page)

    const adminSession = await sessionPage(browser, seed.users.admin, seed.tokens.admin, { width: 375, height: 844 })
    await adminSession.page.goto("/admin/payments")
    await expect(adminSession.page.getByText("Payment settings", { exact: true })).toBeVisible()
    await adminSession.page.getByTestId(`payment-event-${seed.events.waiting.id}`).getByRole("button").first().click()
    await expect(adminSession.page.getByTestId(`admin-payment-${seed.waitingPaymentId}`).first()).toBeVisible()
    await noHorizontalOverflow(adminSession.page)
    await userSession.context.close()
    await adminSession.context.close()
  })

  test("admin payment page scrolls at desktop and mobile widths", async ({ browser }) => {
    const directSession = await sessionPage(browser, seed.users.admin, seed.tokens.admin, { width: 1280, height: 720 })
    await directSession.page.goto("/admin/payments")
    const directMain = directSession.page.locator("main").filter({ hasText: "Payment settings" }).first()
    await expect(directMain).toBeVisible()
    await directSession.page.getByTestId(`payment-event-${seed.events.guest.id}`).getByRole("button").first().click()
    await expect(directSession.page.locator(`[data-testid="admin-payment-${seed.guestPaymentId}"]:visible`)).toBeVisible()
    const directMetrics = await directMain.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
    }))
    expect(directMetrics.overflowY).toBe("auto")
    expect(directMetrics.scrollHeight).toBeGreaterThan(directMetrics.clientHeight)
    const directBox = await directMain.boundingBox()
    expect(directBox).not.toBeNull()
    await directSession.page.mouse.move((directBox?.x ?? 0) + 32, (directBox?.y ?? 0) + 32)
    await directSession.page.mouse.wheel(0, 1000)
    await expect.poll(() => directMain.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await directSession.context.close()

    const mobileSession = await sessionPage(browser, seed.users.admin, seed.tokens.admin, { width: 375, height: 844 })
    await mobileSession.page.goto("/admin/payments")
    const mobileMain = mobileSession.page.locator("main").filter({ hasText: "Payment settings" }).first()
    await expect(mobileMain).toBeVisible()
    await mobileSession.page.getByTestId(`payment-event-${seed.events.guest.id}`).getByRole("button").first().click()
    await expect(mobileSession.page.locator(`[data-testid="admin-payment-${seed.guestPaymentId}"]:visible`)).toBeVisible()
    const mobileMetrics = await mobileMain.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
    }))
    expect(mobileMetrics.overflowY).toBe("auto")
    expect(mobileMetrics.scrollHeight).toBeGreaterThan(mobileMetrics.clientHeight)
    const mobileBox = await mobileMain.boundingBox()
    expect(mobileBox).not.toBeNull()
    await mobileSession.page.mouse.move((mobileBox?.x ?? 0) + 20, (mobileBox?.y ?? 0) + 20)
    await mobileSession.page.mouse.wheel(0, 1000)
    await expect.poll(() => mobileMain.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await mobileSession.context.close()
  })
})

import { expect, test, type Browser } from "@playwright/test"
import { spawn, spawnSync, type ChildProcess } from "node:child_process"
import { closeSync, mkdtempSync, openSync, rmSync } from "node:fs"
import net from "node:net"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { e2ePocketBaseListenAddress, e2ePocketBaseUrl } from "./test-endpoints"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const pbDir = join(root, "pocketbase")
const binary = join(pbDir, "pocketbase")
const password = "Application-E2E-Password-12!"
let dataDir = ""
let server: ChildProcess | undefined
let logFd: number | undefined
let mailServer: net.Server | undefined
const messages: string[] = []
let user: Record<string, unknown>
let token = ""
let rootToken = ""

async function api<T>(
  method: string,
  path: string,
  auth?: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${e2ePocketBaseUrl}${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: auth } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${text}`)
  return JSON.parse(text) as T
}

async function session(
  browser: Browser,
  viewport: {
    width: number
    height: number
  },
) {
  const mobile = viewport.width < 600
  const context = await browser.newContext({
    viewport,
    acceptDownloads: true,
    isMobile: mobile,
    hasTouch: mobile,
  })
  await context.addInitScript(
    ({ record, auth }) => {
      sessionStorage.setItem("pb_auth", JSON.stringify({ token: auth, record }))
      sessionStorage.setItem("bvhub.locale", "en")
    },
    { record: user, auth: token },
  )
  return { context, page: await context.newPage() }
}

test.describe
  .serial("member application", () => {
    test.beforeAll(async () => {
      dataDir = mkdtempSync(join(tmpdir(), "bvhub-application-e2e-"))
      for (const args of [
        [
          "migrate",
          "up",
          `--dir=${dataDir}`,
          `--migrationsDir=${join(pbDir, "pb_migrations")}`,
          `--hooksDir=${join(pbDir, "pb_hooks")}`,
        ],
        [
          "superuser",
          "create",
          "application-e2e-superuser@example.test",
          password,
          `--dir=${dataDir}`,
        ],
      ]) {
        const result = spawnSync(binary, args, { cwd: pbDir, encoding: "utf8" })
        if (result.status !== 0)
          throw new Error(`${result.stdout}\n${result.stderr}`)
      }
      logFd = openSync(join(dataDir, "server.log"), "a")
      server = spawn(
        binary,
        [
          "serve",
          `--http=${e2ePocketBaseListenAddress}`,
          `--dir=${dataDir}`,
          `--migrationsDir=${join(pbDir, "pb_migrations")}`,
          `--hooksDir=${join(pbDir, "pb_hooks")}`,
        ],
        { cwd: pbDir, stdio: ["ignore", logFd, logFd] },
      )
      for (let i = 0; i < 80; i += 1) {
        try {
          if ((await fetch(`${e2ePocketBaseUrl}/api/health`)).ok) break
        } catch {
          /* waiting for PocketBase */
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100))
      }
      rootToken = (
        await api<{ token: string }>(
          "POST",
          "/api/collections/_superusers/auth-with-password",
          undefined,
          { identity: "application-e2e-superuser@example.test", password },
        )
      ).token
      user = await api("POST", "/api/collections/users/records", rootToken, {
        email: "application-guest@example.test",
        password,
        passwordConfirm: password,
        displayName: "Application Guest",
        firstName: "Ada",
        lastName: "Beispiel",
        role: "GUEST",
        active: true,
        verified: true,
      })
      token = (
        await api<{ token: string }>(
          "POST",
          `/api/collections/users/impersonate/${user.id}`,
          rootToken,
          { duration: 3600 },
        )
      ).token
      await api("POST", "/api/collections/user_profiles/records", rootToken, {
        user: user.id,
        street: "Teststrasse",
        houseNumber: "12",
        postalCode: "91052",
        city: "Erlangen",
        birthDate: "1990-04-12",
      })

      mailServer = net.createServer((socket) => {
        socket.setEncoding("utf8")
        let buffer = ""
        let content = ""
        let dataMode = false
        socket.write("220 localhost ESMTP\r\n")
        socket.on("data", (chunk) => {
          buffer += chunk
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() || ""
          for (const line of lines) {
            if (dataMode) {
              if (line === ".") {
                messages.push(content)
                content = ""
                dataMode = false
                socket.write("250 Accepted\r\n")
              } else content += `${line}\n`
            } else if (/^DATA/i.test(line)) {
              dataMode = true
              socket.write("354 Start mail\r\n")
            } else if (/^(EHLO|HELO)/i.test(line))
              socket.write("250-localhost\r\n250 OK\r\n")
            else if (/^QUIT/i.test(line)) socket.write("221 Bye\r\n")
            else socket.write("250 OK\r\n")
          }
        })
      })
      await new Promise<void>((resolveListen) =>
        mailServer?.listen(0, "127.0.0.1", resolveListen),
      )
      const settings = await api<Record<string, any>>(
        "GET",
        "/api/settings",
        rootToken,
      )
      await api("PATCH", "/api/settings", rootToken, {
        ...settings,
        smtp: {
          ...settings.smtp,
          enabled: true,
          host: "127.0.0.1",
          port: (mailServer.address() as net.AddressInfo).port,
          username: "",
          password: "",
          authMethod: "",
          tls: false,
          localName: "localhost",
        },
        meta: { ...settings.meta, senderAddress: "noreply@bv-erlangen2025.de" },
      })
    })

    test.afterAll(async () => {
      if (server && server.exitCode === null) {
        server.kill("SIGTERM")
        await new Promise<void>((resolveExit) =>
          server?.once("exit", () => resolveExit()),
        )
      }
      await new Promise<void>((resolveClose) =>
        mailServer?.close(() => resolveClose()),
      )
      if (logFd !== undefined) closeSync(logFd)
      if (dataDir.startsWith(join(tmpdir(), "bvhub-application-e2e-")))
        rmSync(dataDir, { recursive: true, force: true })
    })

    test("guest confirms, previews, signs and downloads on mobile", async ({
      browser,
    }, testInfo) => {
      const { context, page } = await session(browser, {
        width: 390,
        height: 844,
      })
      await page.goto("/member-application")
      await expect(
        page.getByRole("heading", { name: "Become a member" }),
      ).toBeVisible()
      await page.getByLabel("Bank name").fill("Test Bank")
      await expect(
        page.getByText(
          "Only German bank accounts are currently supported for SEPA direct debit.",
        ),
      ).toBeVisible()
      await page.getByLabel("IBAN").fill("DE8937040044053201300")
      await page.getByLabel("BIC").fill("not-a-bic")
      await page.getByRole("button", { name: "Continue" }).click()
      await expect(
        page.getByText(
          "Enter a bank name and BIC. The German IBAN must have 22 characters.",
        ),
      ).toBeVisible()
      await page.getByLabel("IBAN").fill("DE89370400440532013001")
      await page.getByRole("button", { name: "Continue" }).click()
      await expect(page.getByText("Ada", { exact: true })).toBeVisible()
      await expect(page.getByText("Test Bank", { exact: true })).toBeVisible()
      await page.getByRole("checkbox").check()
      await page.getByRole("button", { name: "Generate PDF" }).click()
      await expect(
        page
          .getByRole("region", { name: "Review your application" })
          .getByRole("img", { name: "PDF page 1" }),
      ).toBeVisible()
      await expect
        .poll(() =>
          page.locator('canvas[aria-label="PDF page 1"]').evaluate((canvas) => {
            const node = canvas as HTMLCanvasElement
            const data = node
              .getContext("2d")
              ?.getImageData(0, 0, node.width, node.height).data
            return data
              ? data.some(
                  (value, index) =>
                    index % 4 === 0 && value < 200 && data[index + 3] > 0,
                )
              : false
          }),
        )
        .toBe(true)
      const { today } = await api<{ today: string }>(
        "GET",
        "/api/bvhub/me/member-application",
        token,
      )
      const expectedName = `Aufnahmeantrag_Ada_Beispiel_${
        [
          "Januar",
          "Februar",
          "März",
          "April",
          "Mai",
          "Juni",
          "Juli",
          "August",
          "September",
          "Oktober",
          "November",
          "Dezember",
        ][Number(today.slice(5, 7)) - 1]
      }_${today.slice(0, 4)}.pdf`
      await expect(page.getByText(expectedName)).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath("mobile-preview.png"),
        fullPage: true,
      })
      const fittedWidth = await page
        .locator('canvas[aria-label="PDF page 1"]')
        .evaluate((canvas) => (canvas as HTMLCanvasElement).width)
      await page.getByRole("button", { name: "Zoom in PDF" }).click()
      await expect
        .poll(() =>
          page
            .locator('canvas[aria-label="PDF page 1"]')
            .evaluate((canvas) => (canvas as HTMLCanvasElement).width),
        )
        .toBeGreaterThan(fittedWidth)
      await page.screenshot({
        path: testInfo.outputPath("mobile-zoom.png"),
        fullPage: true,
      })
      await page.getByRole("button", { name: "Zoom out PDF" }).click()
      const unsigned = page.waitForEvent("download")
      await page.getByRole("button", { name: "Download PDF" }).click()
      const unsignedFile = await unsigned
      expect(unsignedFile.suggestedFilename()).toBe(expectedName)
      await unsignedFile.saveAs(testInfo.outputPath("unsigned.pdf"))
      await page.getByRole("button", { name: "Continue" }).click()
      const signature = page.locator("#member-signature")
      await expect(
        page.getByText(
          "For easier signing on a phone, rotate your device to landscape.",
        ),
      ).toBeVisible()
      const box = await signature.boundingBox()
      if (!box) throw new Error("Signature pad is missing")
      expect(box.width).toBeLessThanOrEqual(390)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0)
      await page.setViewportSize({ width: 844, height: 390 })
      await expect(
        page.getByText(
          "For easier signing on a phone, rotate your device to landscape.",
        ),
      ).toBeHidden()
      const landscapeBox = await signature.boundingBox()
      if (!landscapeBox) throw new Error("Landscape signature pad is missing")
      expect(landscapeBox.width).toBeLessThanOrEqual(600)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0)
      const touch = await context.newCDPSession(page)
      const startX = landscapeBox.x + 40
      const startY = landscapeBox.y + 40
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y: startY }],
      })
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + 100, y: startY + 30 }],
      })
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      })
      await expect(
        page.getByRole("button", { name: "Sign and send" }),
      ).toBeEnabled()
      await page.getByRole("button", { name: "Sign and send" }).click()
      await expect(
        page.getByText("Your signed application was emailed to the board."),
      ).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath("mobile-complete.png"),
        fullPage: true,
      })
      expect(messages.at(-1)).toContain(expectedName)
      const signed = page.waitForEvent("download")
      await page.getByRole("button", { name: "Download PDF" }).click()
      const signedFile = await signed
      expect(signedFile.suggestedFilename()).toBe(expectedName)
      await signedFile.saveAs(testInfo.outputPath("signed.pdf"))
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
      await context.close()
    })

    test("failed email keeps the signed PDF and can be retried", async ({
      browser,
    }) => {
      const settings = await api<Record<string, any>>(
        "GET",
        "/api/settings",
        rootToken,
      )
      await api("PATCH", "/api/settings", rootToken, {
        ...settings,
        smtp: { ...settings.smtp, enabled: false },
      })
      const { context, page } = await session(browser, {
        width: 1280,
        height: 800,
      })
      try {
        await page.goto("/member-application")
        await page
          .getByRole("button", { name: "Start a new application" })
          .click()
        await page.getByLabel("Bank name").fill("Second Bank")
        await page.getByLabel("IBAN").fill("DE89370400440532013000")
        await page.getByLabel("BIC").fill("COBADEFFXXX")
        await page.getByRole("button", { name: "Continue" }).click()
        await page.getByRole("checkbox").check()
        await page.getByRole("button", { name: "Generate PDF" }).click()
        await page.getByRole("button", { name: "Continue" }).click()
        const box = await page.locator("#member-signature").boundingBox()
        if (!box) throw new Error("Signature pad is missing")
        await page.mouse.move(box.x + 30, box.y + 40)
        await page.mouse.down()
        await page.mouse.move(box.x + 110, box.y + 70, { steps: 8 })
        await page.mouse.up()
        await page.getByRole("button", { name: "Sign and send" }).click()
        await expect(
          page.getByRole("button", { name: "Retry email" }),
        ).toBeVisible()
        const failedPdf = page.waitForEvent("download")
        await page.getByRole("button", { name: "Download PDF" }).click()
        expect((await failedPdf).suggestedFilename()).toMatch(
          /^Aufnahmeantrag_Ada_Beispiel_\p{L}+_\d{4}\.pdf$/u,
        )
        await api("PATCH", "/api/settings", rootToken, settings)
        await page.getByRole("button", { name: "Retry email" }).click()
        await expect(
          page.getByText("Your signed application was emailed to the board."),
        ).toBeVisible()
      } finally {
        await api("PATCH", "/api/settings", rootToken, settings)
        await context.close()
      }
    })

    test("signed PDF remains available after login and admin role change", async ({
      browser,
    }) => {
      await api(
        "PATCH",
        `/api/collections/users/records/${user.id}`,
        rootToken,
        { role: "MEMBER" },
      )
      user = await api(
        "GET",
        `/api/collections/users/records/${user.id}`,
        rootToken,
      )
      token = (
        await api<{ token: string }>(
          "POST",
          `/api/collections/users/impersonate/${user.id}`,
          rootToken,
          { duration: 3600 },
        )
      ).token
      const { context, page } = await session(browser, {
        width: 1280,
        height: 800,
      })
      await page.goto("/profile")
      await page
        .getByRole("button", { name: "Signed membership application" })
        .click()
      await expect(
        page.getByText("Your signed application was emailed to the board."),
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Start a new application" }),
      ).toHaveCount(0)
      const signed = page.waitForEvent("download")
      await page.getByRole("button", { name: "Download PDF" }).click()
      expect((await signed).suggestedFilename()).toMatch(
        /^Aufnahmeantrag_Ada_Beispiel_\p{L}+_\d{4}\.pdf$/u,
      )
      await context.close()
    })
  })

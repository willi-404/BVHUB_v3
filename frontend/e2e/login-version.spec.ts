import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const latestReleaseUrl =
  "https://api.github.com/repos/willi-404/BVHUB_v3/releases/latest"
const packageVersion = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"),
).version as string
const nextPatchVersion = packageVersion.replace(/(\d+)$/, (patch) => String(Number(patch) + 1))

test("login shows the build version and refreshes for a newer GitHub release", async ({ page }) => {
  await page.route(latestReleaseUrl, (route) =>
    route.fulfill({ json: { tag_name: `v${nextPatchVersion}` } }),
  )
  await page.goto("/login")

  await expect(page.getByTestId("build-version")).toHaveText(`v${packageVersion}`)
  await expect(page.getByRole("dialog")).toBeVisible()
  const navigation = page.waitForEvent("framenavigated")
  await page.getByRole("button", { name: "Refresh" }).click()
  await navigation
})

test("login ignores an equal release and keeps the version visible on mobile", async ({ page }) => {
  await page.route(latestReleaseUrl, (route) =>
    route.fulfill({ json: { tag_name: `v${packageVersion}` } }),
  )
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto("/login")
  await expect(page.getByTestId("build-version")).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)

  await page.setViewportSize({ width: 375, height: 844 })
  const versionBox = await page.getByTestId("build-version").boundingBox()
  expect(versionBox).not.toBeNull()
  expect((versionBox?.x ?? 0) + (versionBox?.width ?? 0)).toBeLessThanOrEqual(375)
})

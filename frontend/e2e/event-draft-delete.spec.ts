import { test, expect } from "./fixtures"

test.beforeEach(() => {
  test.skip(!process.env.PW_DRAFT_ID, "Set PW_DRAFT_ID when running against an isolated seeded PocketBase")
})

test("admin can delete a real draft and it stays deleted after reload", async ({ page, draftId }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()) })
  await page.goto("/admin/events")
  const card = page.getByText("WU-05 Draft Delete Regression").locator("..")
  page.once("dialog", (dialog) => dialog.accept())
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "DELETE" && res.url().endsWith(`/api/bvhub/admin/events/${draftId}`)),
    card.getByRole("button", { name: /Entwurf löschen|Delete draft|删除草稿/ }).click(),
  ])
  expect(response.status()).toBe(204)
  await expect(page.getByText("WU-05 Draft Delete Regression")).toHaveCount(0)
  await page.reload()
  await expect(page.getByText("WU-05 Draft Delete Regression")).toHaveCount(0)
  expect(errors).toEqual([])
})

test("cancelling confirmation sends no request", async ({ page }) => {
  await page.goto("/admin/events")
  let requests = 0
  page.on("request", (request) => { if (request.method() === "DELETE") requests += 1 })
  page.once("dialog", (dialog) => dialog.dismiss())
  const button = page.getByRole("button", { name: /Entwurf löschen|Delete draft|删除草稿/ }).first()
  await button.click()
  expect(requests).toBe(0)
})

import { defineConfig, devices } from "@playwright/test"
import { e2ePocketBaseUrl } from "./e2e/test-endpoints"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 1,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:18443",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 18443",
    env: { ...process.env, VITE_POCKETBASE_URL: e2ePocketBaseUrl },
    url: "http://127.0.0.1:18443",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

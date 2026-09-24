import { describe, expect, it, vi } from "vitest"
import {
  APP_VERSION,
  fetchLatestReleaseVersion,
  isRemoteBuildNewer,
  LATEST_RELEASE_URL,
  parseSemanticVersion,
} from "./versionCheck"

describe("build version checks", () => {
  it("normalizes semantic release versions and only accepts newer releases", () => {
    expect(parseSemanticVersion("v1.0.2")).toMatchObject({ major: 1, minor: 0, patch: 2 })
    expect(parseSemanticVersion("1.0")).toBeNull()
    expect(isRemoteBuildNewer("v1.0.2", "1.0.1")).toBe(true)
    expect(isRemoteBuildNewer("1.0.1", "1.0.1")).toBe(false)
    expect(isRemoteBuildNewer("1.0.0", "1.0.1")).toBe(false)
    expect(isRemoteBuildNewer("1.0.1-beta.2", "1.0.1-beta.1")).toBe(true)
    expect(isRemoteBuildNewer("1.0.1-beta.1", "1.0.1")).toBe(false)
    expect(isRemoteBuildNewer("invalid", "1.0.1")).toBe(false)
    expect(parseSemanticVersion(APP_VERSION)).not.toBeNull()
  })

  it("uses the fixed latest-release endpoint and ignores failed responses", async () => {
    const fetcher = vi.fn<typeof fetch>()
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ tag_name: "v1.0.2" }), { status: 200 }))
    fetcher.mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
    fetcher.mockRejectedValueOnce(new Error("network error"))
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ tag_name: "not-a-version" }), { status: 200 }))

    await expect(fetchLatestReleaseVersion(fetcher)).resolves.toBe("1.0.2")
    await expect(fetchLatestReleaseVersion(fetcher)).resolves.toBeNull()
    await expect(fetchLatestReleaseVersion(fetcher)).resolves.toBeNull()
    await expect(fetchLatestReleaseVersion(fetcher)).resolves.toBeNull()
    expect(fetcher).toHaveBeenNthCalledWith(1, LATEST_RELEASE_URL, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })
})

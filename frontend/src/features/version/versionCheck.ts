export const APP_VERSION = import.meta.env.VITE_APP_VERSION
export const LATEST_RELEASE_URL =
  "https://api.github.com/repos/willi-404/BVHUB_v3/releases/latest"

type SemanticVersion = {
  major: number
  minor: number
  patch: number
  prerelease: string | null
}

export function parseSemanticVersion(value: unknown): SemanticVersion | null {
  if (typeof value !== "string") return null
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value.trim())
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  }
}

function comparePrerelease(left: string | null, right: string | null): number {
  if (left === right) return 0
  if (left === null) return 1
  if (right === null) return -1
  const leftParts = left.split(".")
  const rightParts = right.split(".")
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index]
    const rightPart = rightParts[index]
    if (leftPart === rightPart) continue
    if (leftPart === undefined) return -1
    if (rightPart === undefined) return 1
    const leftNumeric = /^\d+$/.test(leftPart)
    const rightNumeric = /^\d+$/.test(rightPart)
    if (leftNumeric && rightNumeric) return Number(leftPart) > Number(rightPart) ? 1 : -1
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1
    return leftPart > rightPart ? 1 : -1
  }
  return 0
}

export function isRemoteBuildNewer(remoteVersion: unknown, localVersion = APP_VERSION): boolean {
  const remote = parseSemanticVersion(remoteVersion)
  const local = parseSemanticVersion(localVersion)
  if (!remote || !local) return false
  for (const key of ["major", "minor", "patch"] as const) {
    if (remote[key] !== local[key]) return remote[key] > local[key]
  }
  return comparePrerelease(remote.prerelease, local.prerelease) > 0
}

export async function fetchLatestReleaseVersion(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<string | null> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener("abort", abort, { once: true })
  const timeout = globalThis.setTimeout(() => controller.abort(), 5_000)
  try {
    const response = await fetcher(LATEST_RELEASE_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    })
    if (!response.ok) return null
    const body: unknown = await response.json()
    if (!body || typeof body !== "object" || !("tag_name" in body)) return null
    const tagName = (body as { tag_name?: unknown }).tag_name
    return parseSemanticVersion(tagName) ? String(tagName).trim().replace(/^v/, "") : null
  } catch {
    return null
  } finally {
    globalThis.clearTimeout(timeout)
    signal?.removeEventListener("abort", abort)
  }
}

const configuredPocketBaseUrl = process.env.E2E_POCKETBASE_URL ?? "http://127.0.0.1:18099"

function getPocketBaseUrl() {
  let url: URL
  try {
    url = new URL(configuredPocketBaseUrl)
  } catch {
    throw new Error(`E2E_POCKETBASE_URL must be an HTTP origin with an explicit port, received: ${configuredPocketBaseUrl}`)
  }

  if (
    url.protocol !== "http:" ||
    !url.hostname ||
    !url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(`E2E_POCKETBASE_URL must be an HTTP origin with an explicit port, received: ${configuredPocketBaseUrl}`)
  }

  return url
}

const pocketBaseUrl = getPocketBaseUrl()

export const e2ePocketBaseUrl = pocketBaseUrl.origin
export const e2ePocketBaseApiRoute = `${e2ePocketBaseUrl}/api/**`
export const e2ePocketBaseListenAddress = `${pocketBaseUrl.hostname}:${pocketBaseUrl.port}`

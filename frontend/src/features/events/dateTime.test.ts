import { describe, expect, it } from "vitest"
import { formatLocaleDateTime } from "../../i18n"

describe("event date-time formatting", () => {
  it("renders UTC instants in Europe/Berlin across DST", () => {
    expect(formatLocaleDateTime("2026-01-15T18:00:00Z", "de")).toContain(
      "19:00",
    )
    expect(formatLocaleDateTime("2026-07-15T18:00:00Z", "de")).toContain(
      "20:00",
    )
  })
})

import { describe, expect, it } from "vitest"
import { berlinDateTimeInputToIso, formatBerlinDateTimeInput, formatLocaleDateTime } from "../../i18n"

describe("event date-time formatting", () => {
  it("renders UTC instants in Europe/Berlin across DST", () => {
    expect(formatLocaleDateTime("2026-01-15T18:00:00Z", "de")).toContain(
      "19:00",
    )
    expect(formatLocaleDateTime("2026-07-15T18:00:00Z", "de")).toContain(
      "20:00",
    )
  })

  it("converts Berlin form values to UTC across standard and daylight time", () => {
    expect(berlinDateTimeInputToIso("2026-01-15T19:00")).toBe("2026-01-15T18:00:00.000Z")
    expect(berlinDateTimeInputToIso("2026-07-15T20:00")).toBe("2026-07-15T18:00:00.000Z")
    expect(formatBerlinDateTimeInput("2026-07-15T18:00:00Z")).toBe("2026-07-15T20:00")
  })

  it("rejects a nonexistent Berlin daylight-saving time", () => {
    expect(() => berlinDateTimeInputToIso("2026-03-29T02:30")).toThrow(RangeError)
  })
})

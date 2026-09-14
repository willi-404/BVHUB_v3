import { describe, expect, it } from "vitest"
import {
  calculateDashboardTrend,
  countCurrentUpcomingRegistrations,
  sortDashboardMonths,
} from "./statistics"
import type { DashboardMonthStatistics } from "./types"

const month = (value: string, registeredUsers: number | null, members: number | null, complete = true): DashboardMonthStatistics => ({
  month: value,
  registeredUsers,
  members,
  complete,
})

describe("dashboard statistics", () => {
  it("sorts month keys chronologically without inventing missing values", () => {
    const result = sortDashboardMonths([
      month("2026-09", 12, 8, false),
      month("2026-07", null, null, false),
      month("2026-08", 10, 7),
    ])
    expect(result.map((item) => item.month)).toEqual(["2026-07", "2026-08", "2026-09"])
    expect(result[0].registeredUsers).toBeNull()
  })

  it("calculates signed month-over-month percentages to full precision", () => {
    expect(calculateDashboardTrend(15, month("2026-08", 12, 8), "registeredUsers")).toEqual({ direction: "up", percentage: 25 })
    expect(calculateDashboardTrend(6, month("2026-08", 12, 8), "members")).toEqual({ direction: "down", percentage: -25 })
    expect(calculateDashboardTrend(8, month("2026-08", 12, 8), "members")).toEqual({ direction: "unchanged", percentage: 0 })
  })

  it("does not calculate a trend from a zero base, missing value, or incomplete month", () => {
    expect(calculateDashboardTrend(5, month("2026-08", 0, 0), "members")).toBeNull()
    expect(calculateDashboardTrend(5, month("2026-08", null, null), "members")).toBeNull()
    expect(calculateDashboardTrend(5, month("2026-08", 4, 4, false), "members")).toBeNull()
    expect(calculateDashboardTrend(5, undefined, "members")).toBeNull()
  })

  it("counts only upcoming, published, active REGISTERED event registrations", () => {
    const registrations = [
      { event: "future", status: "REGISTERED" },
      { event: "waiting", status: "WAITING" },
      { event: "past", status: "REGISTERED" },
      { event: "cancelled", status: "REGISTERED" },
      { event: "draft", status: "REGISTERED" },
    ]
    const events = [
      { id: "future", end: "2026-09-15T10:00:00Z", published: true, status: "OPEN_TO_ALL" },
      { id: "waiting", end: "2026-09-15T10:00:00Z", published: true, status: "OPEN_TO_ALL" },
      { id: "past", end: "2026-09-13T10:00:00Z", published: true, status: "OPEN_TO_ALL" },
      { id: "cancelled", end: "2026-09-15T10:00:00Z", published: true, status: "CANCELLED" },
      { id: "draft", end: "2026-09-15T10:00:00Z", published: false, status: "OPEN_TO_ALL" },
    ]
    expect(countCurrentUpcomingRegistrations(registrations, events, new Date("2026-09-14T10:00:00Z"))).toBe(1)
  })
})

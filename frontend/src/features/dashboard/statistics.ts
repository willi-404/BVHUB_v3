import type { DashboardMonthStatistics } from "./types"

export type TrendDirection = "up" | "down" | "unchanged"

export interface DashboardTrend {
  direction: TrendDirection
  percentage: number
}

export function sortDashboardMonths(months: DashboardMonthStatistics[]) {
  return [...months].sort((left, right) => left.month.localeCompare(right.month))
}

export function calculateDashboardTrend(
  currentValue: number,
  previousMonth: DashboardMonthStatistics | undefined,
  field: "registeredUsers" | "members",
): DashboardTrend | null {
  const previousValue = previousMonth?.[field]
  if (!previousMonth?.complete || previousValue == null || previousValue === 0) return null
  const percentage = ((currentValue - previousValue) / previousValue) * 100
  return {
    direction: percentage > 0 ? "up" : percentage < 0 ? "down" : "unchanged",
    percentage,
  }
}

export function countCurrentUpcomingRegistrations(
  registrations: Array<{ event: string; status: string }>,
  events: Array<{ id: string; end: string; published: boolean; status: string }>,
  now: Date,
) {
  const eventsById = new Map(events.map((event) => [event.id, event]))
  return registrations.filter((registration) => {
    const event = eventsById.get(registration.event)
    return registration.status === "REGISTERED" && Boolean(
      event?.published &&
      !["CANCELLED", "COMPLETED"].includes(event.status) &&
      Date.parse(event.end) > now.getTime(),
    )
  }).length
}

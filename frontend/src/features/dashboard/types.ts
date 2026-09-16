export interface DashboardMonthStatistics {
  month: string
  registeredUsers: number | null
  members: number | null
  complete: boolean
}

export interface DashboardStatistics {
  timezone: "Europe/Berlin"
  trackingSince: string
  current: {
    registeredUsers: number
    members: number
    publishedEventsThisMonth: number
    myUpcomingRegistrations: number
  }
  months: DashboardMonthStatistics[]
}

export const memberKeys = {
  all: ["members"] as const,
  lists: () => [...memberKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...memberKeys.lists(), filters] as const,
  details: () => [...memberKeys.all, "detail"] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
}
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...eventKeys.lists(), filters] as const,
  detail: (id: string) => [...eventKeys.all, "detail", id] as const,
  participants: (id: string) => [...eventKeys.all, "participants", id] as const,
}
export const venueKeys = {
  all: ["venues"] as const,
  lists: () => [...venueKeys.all, "list"] as const,
  list: (scope: "public" | "admin") => [...venueKeys.lists(), scope] as const,
}

export const dashboardKeys = {
  all: ["dashboard"] as const,
  statistics: () => [...dashboardKeys.all, "statistics"] as const,
}

export const paymentKeys = {
  all: ["payments"] as const,
  me: () => [...paymentKeys.all, "me"] as const,
  details: () => [...paymentKeys.all, "detail"] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  admin: () => [...paymentKeys.all, "admin"] as const,
  adminSummary: () => [...paymentKeys.admin(), "summary"] as const,
  adminEvent: (eventId: string) => [...paymentKeys.admin(), "event", eventId] as const,
  settings: () => [...paymentKeys.admin(), "settings"] as const,
}

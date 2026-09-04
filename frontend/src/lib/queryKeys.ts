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
}
export const venueKeys = {
  all: ["venues"] as const,
  lists: () => [...venueKeys.all, "list"] as const,
  list: (scope: "public" | "admin") => [...venueKeys.lists(), scope] as const,
}

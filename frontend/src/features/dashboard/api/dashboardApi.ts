import { pb } from "../../../lib/pocketbase"
import type { DashboardStatistics } from "../types"

export function getDashboardStatistics(): Promise<DashboardStatistics> {
  return pb.send<DashboardStatistics>("/api/bvhub/dashboard/statistics", {
    method: "GET",
  })
}

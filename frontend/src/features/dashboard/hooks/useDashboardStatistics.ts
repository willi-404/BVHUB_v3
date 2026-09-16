import { useQuery } from "@tanstack/react-query"
import { dashboardKeys } from "../../../lib/queryKeys"
import { getDashboardStatistics } from "../api/dashboardApi"

export function useDashboardStatistics() {
  return useQuery({
    queryKey: dashboardKeys.statistics(),
    queryFn: getDashboardStatistics,
    refetchOnMount: "always",
    retry: false,
  })
}

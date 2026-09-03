import { useQuery } from "@tanstack/react-query";
import { getMembers } from "../api/getMembers";
import type { MemberFilters } from "../api/getMembers";
import { memberKeys } from "../../../lib/queryKeys";
export function useMembers(filters: MemberFilters = {}) { return useQuery({ queryKey: memberKeys.list({ ...filters }), queryFn: () => getMembers(filters), placeholderData: (previous) => previous }); }

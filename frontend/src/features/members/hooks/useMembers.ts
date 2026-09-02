import { useQuery } from "@tanstack/react-query";
import { getMembers } from "../api/getMembers";
import { memberKeys } from "../../../lib/queryKeys";
export function useMembers() { return useQuery({ queryKey: memberKeys.list({}), queryFn: getMembers }); }

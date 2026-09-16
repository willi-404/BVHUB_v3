import { useQuery } from "@tanstack/react-query";
import { pb } from "../../../lib/pocketbase";
import { requestMemberCardToken } from "../api/memberCardApi";
import type { MemberCardTokenResponse } from "../types";

export const memberCardKeys = {
  all: ["member-card"] as const,
  token: (userId: string) => [...memberCardKeys.all, "token", userId] as const,
};

export function memberCardRefreshDelay(data: MemberCardTokenResponse | undefined, now = Date.now()): number | false {
  if (!data) return false;
  const refreshIn = Date.parse(data.refreshAt) - now;
  if (refreshIn > 0) return refreshIn;
  return Date.parse(data.expiresAt) > now ? 2_000 : false;
}

export function useMemberCardQr() {
  const userId = pb.authStore.record?.id || "anonymous";
  return useQuery({
    queryKey: memberCardKeys.token(userId),
    queryFn: requestMemberCardToken,
    enabled: Boolean(pb.authStore.isValid && userId !== "anonymous"),
    staleTime: Infinity,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      return memberCardRefreshDelay(query.state.data);
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../../../lib/pocketbase";
import { memberKeys } from "../../../lib/queryKeys";
import { getMyProfile, updateMyProfile } from "../api/profileApi";
import type { ProfilePatch } from "../types";

export const profileKeys = {
  all: ["profile"] as const,
  me: (userId: string) => [...profileKeys.all, "me", userId] as const,
};

export function useMyProfile() {
  const userId = pb.authStore.record?.id;
  return useQuery({
    queryKey: profileKeys.me(userId || "anonymous"),
    queryFn: getMyProfile,
    enabled: Boolean(userId && pb.authStore.isValid),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const userId = pb.authStore.record?.id || "anonymous";
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateMyProfile(patch),
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileKeys.me(userId), profile);
      const currentToken = pb.authStore.token;
      const currentRecord = pb.authStore.record;
      if (currentToken && currentRecord && profile.user.id === currentRecord.id) {
        pb.authStore.save(currentToken, { ...currentRecord, ...profile.user });
      }
      await queryClient.invalidateQueries({ queryKey: profileKeys.me(userId) });
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      await queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

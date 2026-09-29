import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../../../lib/pocketbase";
import { memberKeys } from "../../../lib/queryKeys";
import { getMyProfile, removeMyAvatar, updateMyProfile, uploadMyAvatar } from "../api/profileApi";
import type { ProfileDto, ProfilePatch } from "../types";

export const profileKeys = {
  all: ["profile"] as const,
  me: (userId: string) => [...profileKeys.all, "me", userId] as const,
};

async function syncProfile(queryClient: ReturnType<typeof useQueryClient>, userId: string, profile: ProfileDto) {
  queryClient.setQueryData(profileKeys.me(userId), profile);
  const currentToken = pb.authStore.token;
  const currentRecord = pb.authStore.record;
  if (currentToken && currentRecord && profile.user.id === currentRecord.id) {
    pb.authStore.save(currentToken, { ...currentRecord, ...profile.user });
  }
  await queryClient.invalidateQueries({ queryKey: profileKeys.me(userId) });
  await queryClient.invalidateQueries({ queryKey: ["avatar-file-token", userId] });
  await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
  await queryClient.invalidateQueries({ queryKey: memberKeys.all });
  await queryClient.invalidateQueries({ predicate: ({ queryKey }) => queryKey[0] === "events" && queryKey[1] === "participants" });
}

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
    onSuccess: (profile) => syncProfile(queryClient, userId, profile),
  });
}

export function useUpdateMyAvatar() {
  const queryClient = useQueryClient();
  const userId = pb.authStore.record?.id || "anonymous";
  return useMutation({
    mutationFn: (file: File | null) => file ? uploadMyAvatar(file) : removeMyAvatar(),
    onSuccess: (profile) => syncProfile(queryClient, userId, profile),
  });
}

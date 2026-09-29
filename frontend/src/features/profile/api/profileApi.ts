import { ClientResponseError } from "pocketbase";
import { pb } from "../../../lib/pocketbase";
import type { ProfileDto, ProfilePatch } from "../types";

export async function getMyProfile(): Promise<ProfileDto> {
  return pb.send<ProfileDto>("/api/bvhub/me/profile", { method: "GET" });
}

export async function updateMyProfile(patch: ProfilePatch): Promise<ProfileDto> {
  return pb.send<ProfileDto>("/api/bvhub/me/profile", { method: "PATCH", body: patch });
}

export async function uploadMyAvatar(file: File): Promise<ProfileDto> {
  const body = new FormData();
  body.append("avatar", file);
  return pb.send<ProfileDto>("/api/bvhub/me/avatar", { method: "PUT", body });
}

export async function removeMyAvatar(): Promise<ProfileDto> {
  return pb.send<ProfileDto>("/api/bvhub/me/avatar", { method: "DELETE" });
}

export function profileErrorStatus(error: unknown): number | undefined {
  return error instanceof ClientResponseError ? error.status : (error as { status?: number } | null)?.status;
}

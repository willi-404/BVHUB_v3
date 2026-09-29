import { useQuery } from "@tanstack/react-query";
import { Avatar } from "../../../app/components/ui/avatar";
import { pb } from "../../../lib/pocketbase";
import type { AvatarRef } from "../types";

export default function UserAvatar({ avatar, fallback, alt = "", thumb = "64x64", className = "" }: {
  avatar?: AvatarRef | null;
  fallback: string;
  alt?: string;
  thumb?: "64x64" | "160x160";
  className?: string;
}) {
  const userId = pb.authStore.record?.id;
  const token = useQuery({
    queryKey: ["avatar-file-token", userId],
    queryFn: () => pb.files.getToken(),
    enabled: Boolean(avatar && userId && pb.authStore.isValid),
    staleTime: 60_000,
  });
  const src = avatar && token.data
    ? pb.files.getURL({ collectionName: "user_avatars", id: avatar.id }, avatar.filename, { thumb, token: token.data })
    : undefined;
  return <Avatar src={src} alt={alt} fallback={fallback} className={className} />;
}

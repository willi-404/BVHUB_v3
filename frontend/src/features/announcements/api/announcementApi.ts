import { pb } from "../../../lib/pocketbase"
import type {
  AdminAnnouncement,
  AdminAnnouncementResponse,
  AnnouncementDraft,
  AnnouncementLocale,
  UserAnnouncementResponse,
} from "../types"

export function getAnnouncements(locale: AnnouncementLocale) {
  return pb.send<UserAnnouncementResponse>(
    `/api/bvhub/me/announcements?locale=${locale}`,
    { method: "GET" },
  )
}

export function markAnnouncementRead(id: string) {
  return pb.send(`/api/bvhub/me/announcements/${encodeURIComponent(id)}/read`, {
    method: "POST",
    body: {},
  })
}

export function getAdminAnnouncements() {
  return pb.send<AdminAnnouncementResponse>("/api/bvhub/admin/announcements", {
    method: "GET",
  })
}

export function createAnnouncement(input: AnnouncementDraft) {
  return pb.send<AdminAnnouncement>("/api/bvhub/admin/announcements", {
    method: "POST",
    body: input,
  })
}

export function updateAnnouncement(id: string, input: AnnouncementDraft) {
  return pb.send<AdminAnnouncement>(
    `/api/bvhub/admin/announcements/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input },
  )
}

export function deleteAnnouncement(id: string) {
  return pb.send(`/api/bvhub/admin/announcements/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export function saveAnnouncementSlots(
  input: AdminAnnouncementResponse["slots"],
) {
  return pb.send<AdminAnnouncementResponse>(
    "/api/bvhub/admin/announcements/slots",
    { method: "PUT", body: input },
  )
}

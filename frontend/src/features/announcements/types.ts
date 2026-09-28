export type AnnouncementLocale = "zh" | "de"

export type Announcement = {
  id: string
  title: string
  content: string
  position: number
  active: boolean
  read: boolean
  created: string
  updated: string
}

export type AnnouncementDraft = {
  zhTitle: string
  zhContent: string
  deTitle: string
  deContent: string
}

export type AdminAnnouncement = AnnouncementDraft & {
  id: string
  created: string
  updated: string
}

export type AnnouncementSlot = { position: number; announcementId: string }
export type AdminAnnouncementResponse = {
  announcements: AdminAnnouncement[]
  slots: Record<AnnouncementLocale, AnnouncementSlot[]>
}
export type UserAnnouncementResponse = {
  items: Announcement[]
  unreadCount: number
}

import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { pb } from "../../../lib/pocketbase"
import * as api from "../api/announcementApi"
import type {
  AnnouncementDraft,
  AnnouncementLocale,
  UserAnnouncementResponse,
} from "../types"

export const announcementKeys = {
  all: ["announcements"] as const,
  user: (locale: AnnouncementLocale) =>
    [...announcementKeys.all, "user", locale] as const,
  admin: () => [...announcementKeys.all, "admin"] as const,
}

export function useAnnouncements(locale: AnnouncementLocale) {
  return useQuery({
    queryKey: announcementKeys.user(locale),
    queryFn: () => api.getAnnouncements(locale),
    refetchOnMount: "always",
  })
}

export function useMarkAnnouncementRead(locale: AnnouncementLocale) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.markAnnouncementRead,
    onSuccess: (_data, id) => {
      const current = client.getQueryData<UserAnnouncementResponse>(
        announcementKeys.user(locale),
      )
      const position = current?.items.find((item) => item.id === id)?.position
      for (const targetLocale of ["zh", "de"] as const) {
        client.setQueryData<UserAnnouncementResponse | undefined>(
          announcementKeys.user(targetLocale),
          (data) => {
            if (!data) return data
            const items = data.items.map((item) =>
              item.id === id ||
              (position !== undefined &&
                position > 0 &&
                item.position === position)
                ? { ...item, read: true }
                : item,
            )
            return {
              ...data,
              items,
              unreadCount: items.filter((item) => !item.read).length,
            }
          },
        )
      }
    },
  })
}

export function useAnnouncementRealtime() {
  const client = useQueryClient()
  useEffect(() => {
    let active = true
    void pb
      .collection("announcements")
      .subscribe("*", () => {
        if (active)
          void client.invalidateQueries({ queryKey: announcementKeys.all })
      })
      .catch(() => undefined)
    return () => {
      active = false
      void pb.collection("announcements").unsubscribe("*")
    }
  }, [client])
}

export function useAdminAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.admin(),
    queryFn: api.getAdminAnnouncements,
  })
}

function invalidateAdmin(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: announcementKeys.all })
}

export function useCreateAnnouncement() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.createAnnouncement,
    onSuccess: () => invalidateAdmin(client),
  })
}

export function useUpdateAnnouncement() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AnnouncementDraft }) =>
      api.updateAnnouncement(id, input),
    onSuccess: () => invalidateAdmin(client),
  })
}

export function useDeleteAnnouncement() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteAnnouncement,
    onSuccess: () => invalidateAdmin(client),
  })
}

export function useSaveAnnouncementSlots() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.saveAnnouncementSlots,
    onSuccess: (data) => {
      client.setQueryData(announcementKeys.admin(), data)
      invalidateAdmin(client)
    },
  })
}

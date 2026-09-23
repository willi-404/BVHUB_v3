import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { pb } from "../../../lib/pocketbase"
import { dashboardKeys, eventKeys, venueKeys } from "../../../lib/queryKeys"
import * as api from "../api/eventsApi"
import type { EventInput } from "../types"
export function useEvents(showAll = false) {
  return useQuery({
    queryKey: eventKeys.publicList(showAll),
    queryFn: () => api.getEvents(showAll),
    refetchOnMount: "always",
  })
}
export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ""),
    queryFn: () => api.getEvent(id as string),
    enabled: Boolean(id),
  })
}
export function useAdminEvents(enabled = true) {
  return useQuery({
    queryKey: [...eventKeys.lists(), "admin"],
    queryFn: api.getAdminEvents,
    enabled,
  })
}
export function useVenues(scope: "public" | "admin" = "public") {
  return useQuery({
    queryKey: venueKeys.list(scope),
    queryFn: () => api.getVenues(scope),
  })
}
export function useRegistration(id: string | undefined) {
  return useQuery({
    queryKey: [...eventKeys.detail(id ?? ""), "registration"],
    queryFn: () => api.getRegistration(id as string),
    enabled: Boolean(id),
  })
}
export function useRegisterEvent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: { checkoutRegion: "ER" | "NUE"; termsVersion: string }
    }) => api.registerEvent(id, input),
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({ queryKey: eventKeys.all })
      void client.invalidateQueries({
        queryKey: eventKeys.detail(variables.id),
      })
      void client.invalidateQueries({
        queryKey: eventKeys.participants(variables.id),
      })
      void client.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}
export function useCancelRegistration() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.cancelRegistration,
    onSuccess: (_data, id) => {
      void client.invalidateQueries({ queryKey: eventKeys.all })
      void client.invalidateQueries({ queryKey: eventKeys.detail(id) })
      void client.invalidateQueries({ queryKey: eventKeys.participants(id) })
      void client.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}
export function useParticipants(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: eventKeys.participants(id ?? ""),
    queryFn: () => api.getParticipants(id as string),
    enabled: Boolean(id) && enabled,
  })
}
export function useAddParticipant() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      api.addParticipant(eventId, userId),
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({ queryKey: eventKeys.all })
      void client.invalidateQueries({
        queryKey: eventKeys.participants(variables.eventId),
      })
      void client.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}
export function useRemoveParticipant() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      api.removeParticipant(eventId, userId),
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({ queryKey: eventKeys.all })
      void client.invalidateQueries({
        queryKey: eventKeys.participants(variables.eventId),
      })
      void client.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}
export function useEventChangelog(id: string | undefined) {
  return useQuery({
    queryKey: [...eventKeys.detail(id ?? ""), "changelog"],
    queryFn: () => api.getEventChangelog(id as string),
    enabled: Boolean(id),
  })
}
export function useEventRealtime() {
  const client = useQueryClient()
  useEffect(() => {
    let active = true
    void pb
      .collection("events")
      .subscribe("*", () => {
        if (active) {
          void client.invalidateQueries({ queryKey: eventKeys.all })
          void client.invalidateQueries({ queryKey: dashboardKeys.all })
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
      void pb.collection("events").unsubscribe("*")
    }
  }, [client])
}
function invalidate(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: eventKeys.all })
  void client.invalidateQueries({ queryKey: venueKeys.all })
  void client.invalidateQueries({ queryKey: dashboardKeys.all })
}
export function useEventMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string
      input: EventInput | Partial<EventInput>
    }) =>
      id ? api.updateEvent(id, input) : api.createEvent(input as EventInput),
    onSuccess: () => invalidate(client),
  })
}
export function useCancelEvent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.cancelEvent,
    onSuccess: () => invalidate(client),
  })
}
export function useDeleteEventDraft() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEventDraft,
    onSuccess: async (_data, id) => {
      client.removeQueries({ queryKey: eventKeys.detail(id) })
      client.removeQueries({ queryKey: eventKeys.participants(id) })
      client.removeQueries({ queryKey: [...eventKeys.detail(id), "changelog"] })
      await client.invalidateQueries({ queryKey: eventKeys.all })
      await client.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}
export function useVenueMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string
      input: Partial<Parameters<typeof api.createVenue>[0]>
    }) =>
      id
        ? api.updateVenue(id, input)
        : api.createVenue(input as Parameters<typeof api.createVenue>[0]),
    onSuccess: () => invalidate(client),
  })
}
export function useDeleteVenue() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteVenue,
    onSuccess: () => invalidate(client),
  })
}

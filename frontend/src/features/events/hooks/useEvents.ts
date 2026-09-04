import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { eventKeys, venueKeys } from "../../../lib/queryKeys"
import * as api from "../api/eventsApi"
import type { EventInput } from "../types"
export function useEvents() {
  return useQuery({ queryKey: eventKeys.lists(), queryFn: api.getEvents })
}
export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ""),
    queryFn: () => api.getEvent(id as string),
    enabled: Boolean(id),
  })
}
export function useAdminEvents() {
  return useQuery({
    queryKey: [...eventKeys.lists(), "admin"],
    queryFn: api.getAdminEvents,
  })
}
export function useVenues(scope: "public" | "admin" = "public") {
  return useQuery({
    queryKey: venueKeys.list(scope),
    queryFn: () => api.getVenues(scope),
  })
}
function invalidate(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: eventKeys.all })
  void client.invalidateQueries({ queryKey: venueKeys.all })
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
    mutationFn: api.deleteOrCancelEvent,
    onSuccess: () => invalidate(client),
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

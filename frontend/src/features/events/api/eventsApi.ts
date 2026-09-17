import { pb } from "../../../lib/pocketbase"
import type { EventInput, EventParticipant, EventRecord, Venue } from "../types"
export async function getEvents(showAll = false): Promise<EventRecord[]> {
  const result = await pb.send<{ items: EventRecord[] }>(`/api/bvhub/events${showAll ? "?showAll=true" : ""}`, {
    method: "GET",
  })
  return result.items
}
export async function getEvent(id: string): Promise<EventRecord> {
  return pb.send<EventRecord>(`/api/bvhub/events/${encodeURIComponent(id)}`, {
    method: "GET",
  })
}
export async function getAdminEvents(): Promise<EventRecord[]> {
  const result = await pb.send<{ items: EventRecord[] }>(
    "/api/bvhub/admin/events",
    { method: "GET" },
  )
  return result.items
}
export async function createEvent(input: EventInput): Promise<EventRecord> {
  return pb.send<EventRecord>("/api/bvhub/admin/events", {
    method: "POST",
    body: input,
  })
}
export async function updateEvent(
  id: string,
  input: Partial<EventInput>,
): Promise<EventRecord> {
  return pb.send<EventRecord>(
    `/api/bvhub/admin/events/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input },
  )
}
export async function deleteEventDraft(id: string): Promise<void> {
  await pb.send<void>(
    `/api/bvhub/admin/events/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  )
}
export async function cancelEvent(id: string): Promise<EventRecord> {
  return pb.send<EventRecord>(
    `/api/bvhub/admin/events/${encodeURIComponent(id)}`,
    { method: "PATCH", body: { status: "CANCELLED" } },
  )
}
export async function getRegistration(id: string) {
  return pb.send<{ status: "REGISTERED" | "WAITING" | "CANCELLED" | null }>(
    `/api/bvhub/events/${encodeURIComponent(id)}/registration`,
    { method: "GET" },
  )
}
export async function registerEvent(
  id: string,
  input: { checkoutRegion: "ER" | "NUE"; termsVersion: string },
) {
  return pb.send(`/api/bvhub/events/${encodeURIComponent(id)}/registrations`, {
    method: "POST",
    body: input,
  })
}
export async function cancelRegistration(id: string) {
  return pb.send(
    `/api/bvhub/events/${encodeURIComponent(id)}/registrations/me`,
    { method: "DELETE" },
  )
}
export async function getParticipants(
  id: string,
): Promise<{ items: EventParticipant[]; totalItems: number }> {
  return pb.send<{ items: EventParticipant[]; totalItems: number }>(
    `/api/bvhub/events/${encodeURIComponent(id)}/participants`,
    { method: "GET" },
  )
}
export async function addParticipant(id: string, userId: string) {
  return pb.send(
    `/api/bvhub/admin/events/${encodeURIComponent(id)}/participants`,
    { method: "POST", body: { userId } },
  )
}
export async function removeParticipant(id: string, userId: string) {
  return pb.send(
    `/api/bvhub/admin/events/${encodeURIComponent(id)}/participants/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  )
}
export async function getEventChangelog(id: string) {
  return pb.send<{
    items: Array<{
      id: string
      action: string
      actorName: string
      actorRole: string
      changes: Record<string, { old: unknown; new: unknown }>
      correlationId: string
      created: string
    }>
  }>(`/api/bvhub/admin/events/${encodeURIComponent(id)}/changelog`, {
    method: "GET",
  })
}
export async function getVenues(
  scope: "public" | "admin" = "public",
): Promise<Venue[]> {
  const result = await pb.send<{ items: Venue[] }>(
    scope === "admin" ? "/api/bvhub/admin/venues" : "/api/bvhub/venues",
    { method: "GET" },
  )
  return result.items
}
export async function createVenue(
  input: Pick<Venue, "name" | "address" | "description" | "checkoutRegion"> & {
    active?: boolean
  },
): Promise<Venue> {
  return pb.send<Venue>("/api/bvhub/admin/venues", {
    method: "POST",
    body: input,
  })
}
export async function updateVenue(
  id: string,
  input: Partial<Pick<Venue, "name" | "address" | "description" | "checkoutRegion" | "active">>,
): Promise<Venue> {
  return pb.send<Venue>(`/api/bvhub/admin/venues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  })
}
export async function deleteVenue(id: string): Promise<void> {
  await pb.send(`/api/bvhub/admin/venues/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

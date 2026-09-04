import { pb } from "../../../lib/pocketbase"
import type { EventInput, EventRecord, Venue } from "../types"
export async function getEvents(): Promise<EventRecord[]> {
  const result = await pb.send<{ items: EventRecord[] }>("/api/bvhub/events", {
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
export async function deleteOrCancelEvent(
  id: string,
): Promise<EventRecord | null> {
  return pb.send<EventRecord | null>(
    `/api/bvhub/admin/events/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  )
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
  input: Pick<Venue, "name" | "address" | "description"> & { active?: boolean },
): Promise<Venue> {
  return pb.send<Venue>("/api/bvhub/admin/venues", {
    method: "POST",
    body: input,
  })
}
export async function updateVenue(
  id: string,
  input: Partial<Pick<Venue, "name" | "address" | "description" | "active">>,
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

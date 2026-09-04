export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED"
export interface Venue {
  id: string
  name: string
  address: string
  description: string
  active: boolean
  created: string
  updated: string
}
export interface EventRecord {
  id: string
  title: string
  description: string
  venue: Venue
  start: string
  end: string
  capacity: number
  registrationOpen: boolean
  status: EventStatus
  createdBy: string
  created: string
  updated: string
}
export interface EventInput {
  title: string
  description?: string
  venue: string
  start: string
  end: string
  capacity: number
  registrationOpen: boolean
  status: EventStatus
}

export type EventStatus = "MEMBERS_ONLY" | "OPEN_TO_ALL" | "CANCELLED" | "COMPLETED"
export interface Venue {
  id: string
  name: string
  address: string
  description: string
  checkoutRegion: "ER" | "NUE" | ""
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
  registeredCount: number
  spotsLeft: number
  myRegistrationStatus: "REGISTERED" | "CANCELLED" | null
  canRegister: boolean
  canCancel: boolean
  published: boolean
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
  published: boolean
  status: EventStatus
}

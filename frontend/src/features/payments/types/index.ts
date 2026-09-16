export type PaymentStatus = "PAID" | "UNPAID"
export type PaymentRole = "GUEST" | "MEMBER" | "ADMIN" | "SUPER_ADMIN"

export interface PaymentEvent {
  id: string
  title: string
  start: string
  end: string
  guestFeeCents: number
}

export interface PaymentSettings {
  recipientName: string
  iban: string
  bic: string
  configured: boolean
  updated: string
}

export interface PaymentRecord {
  id: string
  registrationId: string
  event: PaymentEvent
  roleSnapshot: PaymentRole
  paymentRequired: boolean
  amountCents: number
  status: PaymentStatus
  purpose: string
  active: boolean
  paidAt: string | null
  created: string
  updated: string
}

export interface PaymentDetail extends PaymentRecord {
  paymentSettings: PaymentSettings
}

export interface AdminPaymentRecord extends PaymentRecord {
  user: {
    id: string
    displayName: string
    firstName: string
    lastName: string
  }
  paidBy: { id: string; displayName: string } | null
}

export interface AdminPaymentSummary {
  eventId: string
  title: string
  start: string
  end: string
  guestFeeCents: number
  totalPayments: number
  paidCount: number
  unpaidCount: number
  paidAmountCents: number
  openAmountCents: number
}

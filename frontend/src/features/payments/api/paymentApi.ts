import { pb } from "../../../lib/pocketbase"
import type {
  AdminPaymentRecord,
  AdminPaymentSummary,
  PaymentDetail,
  PaymentRecord,
  PaymentSettings,
  PaymentStatus,
} from "../types"

export async function getMyPayments(): Promise<PaymentRecord[]> {
  const response = await pb.send<{ items: PaymentRecord[] }>("/api/bvhub/me/payments", { method: "GET" })
  return response.items
}

export function getPayment(id: string): Promise<PaymentDetail> {
  return pb.send<PaymentDetail>(`/api/bvhub/me/payments/${encodeURIComponent(id)}`, { method: "GET" })
}

export async function getAdminPaymentSummary(showAll = false): Promise<AdminPaymentSummary[]> {
  const response = await pb.send<{ items: AdminPaymentSummary[] }>(`/api/bvhub/admin/payment-summary${showAll ? "?showAll=true" : ""}`, { method: "GET" })
  return response.items
}

export async function getAdminEventPayments(eventId: string): Promise<AdminPaymentRecord[]> {
  const response = await pb.send<{ items: AdminPaymentRecord[] }>(`/api/bvhub/admin/events/${encodeURIComponent(eventId)}/payments`, { method: "GET" })
  return response.items
}

export function setPaymentStatus(paymentId: string, status: PaymentStatus): Promise<AdminPaymentRecord> {
  return pb.send<AdminPaymentRecord>(`/api/bvhub/admin/payments/${encodeURIComponent(paymentId)}/status`, { method: "PATCH", body: { status } })
}

export function getPaymentSettings(): Promise<PaymentSettings> {
  return pb.send<PaymentSettings>("/api/bvhub/admin/payment-settings", { method: "GET" })
}

export function updatePaymentSettings(input: Pick<PaymentSettings, "recipientName" | "iban" | "bic">): Promise<PaymentSettings> {
  return pb.send<PaymentSettings>("/api/bvhub/admin/payment-settings", {
    method: "PATCH",
    body: { recipientName: input.recipientName, iban: input.iban, bic: input.bic },
  })
}

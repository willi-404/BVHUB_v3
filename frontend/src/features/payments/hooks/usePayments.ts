import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { pb } from "../../../lib/pocketbase"
import { dashboardKeys, paymentKeys } from "../../../lib/queryKeys"
import * as api from "../api/paymentApi"
import type { AdminPaymentRecord, PaymentStatus } from "../types"

export function useMyPayments() {
  return useQuery({ queryKey: paymentKeys.me(), queryFn: api.getMyPayments })
}

export function usePayment(id: string | undefined) {
  return useQuery({ queryKey: paymentKeys.detail(id ?? ""), queryFn: () => api.getPayment(id as string), enabled: Boolean(id) })
}

export function useAdminPaymentSummary() {
  return useQuery({ queryKey: paymentKeys.adminSummary(), queryFn: api.getAdminPaymentSummary })
}

export function useAdminEventPayments(eventId: string | undefined, enabled = true) {
  return useQuery({ queryKey: paymentKeys.adminEvent(eventId ?? ""), queryFn: () => api.getAdminEventPayments(eventId as string), enabled: Boolean(eventId) && enabled })
}

export function usePaymentSettings() {
  return useQuery({ queryKey: paymentKeys.settings(), queryFn: api.getPaymentSettings })
}

export function useUpdatePaymentSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.updatePaymentSettings,
    onSuccess: (settings) => {
      client.setQueryData(paymentKeys.settings(), settings)
      void client.invalidateQueries({ queryKey: paymentKeys.details() })
    },
  })
}

export function useSetPaymentStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, status }: { paymentId: string; eventId: string; status: PaymentStatus }) => api.setPaymentStatus(paymentId, status),
    onMutate: async ({ paymentId, eventId, status }) => {
      const key = paymentKeys.adminEvent(eventId)
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<AdminPaymentRecord[]>(key)
      client.setQueryData<AdminPaymentRecord[]>(key, (current) => current?.map((payment) => payment.id === paymentId ? { ...payment, status } : payment))
      return { key, previous }
    },
    onError: (_error, _variables, context) => {
      if (context) client.setQueryData(context.key, context.previous)
    },
    onSettled: (_data, _error, variables) => invalidatePaymentQueries(client, { id: variables.paymentId, event: variables.eventId }),
  })
}

export function invalidatePaymentQueries(client: QueryClient, payment?: { id?: string; event?: string }) {
  void client.invalidateQueries({ queryKey: paymentKeys.me() })
  if (payment?.id) void client.invalidateQueries({ queryKey: paymentKeys.detail(payment.id) })
  void client.invalidateQueries({ queryKey: paymentKeys.adminSummary() })
  if (payment?.event) void client.invalidateQueries({ queryKey: paymentKeys.adminEvent(payment.event) })
  void client.invalidateQueries({ queryKey: dashboardKeys.all })
}

interface PaymentRealtimeCollection {
  subscribe(topic: string, callback: (event: { record: { id: string; event?: unknown } }) => void): Promise<() => void>
}

export function subscribeToPaymentRealtime(client: QueryClient, collection: PaymentRealtimeCollection = pb.collection("payments") as unknown as PaymentRealtimeCollection) {
  let active = true
  let unsubscribe: (() => void) | undefined
  void collection.subscribe("*", (event) => {
    if (active) invalidatePaymentQueries(client, { id: event.record.id, event: String(event.record.event || "") })
  }).then((cleanup) => {
    if (active) unsubscribe = cleanup
    else cleanup()
  }).catch(() => undefined)
  return () => {
    active = false
    unsubscribe?.()
  }
}

export function usePaymentRealtime() {
  const client = useQueryClient()
  useEffect(() => {
    return subscribeToPaymentRealtime(client)
  }, [client])
}

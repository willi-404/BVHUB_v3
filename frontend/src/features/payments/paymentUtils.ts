import { generate, validate, type PaymentData } from "eu-payment-qr"
import type { Locale } from "../../i18n"
import type { PaymentDetail } from "./types"

export function formatMoney(amountCents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amountCents / 100)
}

export function parseEuroCents(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".")
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) throw new RangeError("Invalid euro amount")
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"))
  if (!Number.isSafeInteger(cents) || cents < 0) throw new RangeError("Invalid euro amount")
  return cents
}

export function formatEuroInput(amountCents: number): string {
  return `${Math.floor(amountCents / 100)},${String(amountCents % 100).padStart(2, "0")}`
}

export function buildPaytoUri(payment: PaymentDetail): string {
  const settings = payment.paymentSettings
  if (!payment.paymentRequired || !settings.configured) throw new RangeError("Payment details unavailable")
  const query = [
    ["amount", `EUR:${(payment.amountCents / 100).toFixed(2)}`],
    ["receiver-name", settings.recipientName],
    ["message", payment.purpose],
  ].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")
  return `payto://iban/${encodeURIComponent(settings.iban.replace(/\s/g, ""))}?${query}`
}

export function paymentToEpcData(payment: PaymentDetail): PaymentData {
  const settings = payment.paymentSettings
  if (!payment.paymentRequired || !settings.configured) throw new RangeError("Payment details unavailable")
  return {
    recipient: settings.recipientName,
    iban: settings.iban,
    ...(settings.bic ? { bic: settings.bic } : {}),
    amount: Number((payment.amountCents / 100).toFixed(2)),
    message: payment.purpose,
  }
}

export function createEpcPayload(payment: PaymentDetail): string {
  const data = paymentToEpcData(payment)
  const result = validate(data)
  if (!result.valid) throw new RangeError(result.errors.map((error) => error.code).join(","))
  return generate(data)
}

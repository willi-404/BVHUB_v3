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
  const generated = generate(data)
  const lines = generated.split("\n")
  if (lines.length < 12) throw new RangeError("Invalid EPC payload")
  lines[10] = payment.purpose
  lines[11] = ""
  return lines.join("\n")
}

export async function downloadEpcPng(svg: SVGSVGElement, filename: string): Promise<void> {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof Blob === "undefined") throw new Error("PNG export unavailable")
  const source = new XMLSerializer().serializeToString(svg)
  const sourceUrl = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("Unable to rasterize QR code"))
      image.src = sourceUrl
    })
    const quietZone = 32
    const scale = 4
    const width = Math.max(1, svg.viewBox.baseVal.width || svg.width.baseVal.value || svg.clientWidth)
    const height = Math.max(1, svg.viewBox.baseVal.height || svg.height.baseVal.value || svg.clientHeight)
    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil((width + quietZone * 2) * scale)
    canvas.height = Math.ceil((height + quietZone * 2) * scale)
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas unavailable")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, quietZone * scale, quietZone * scale, width * scale, height * scale)
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png"))
    const pngUrl = URL.createObjectURL(png)
    try {
      const anchor = document.createElement("a")
      anchor.href = pngUrl
      anchor.download = filename
      anchor.click()
    } finally {
      URL.revokeObjectURL(pngUrl)
    }
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

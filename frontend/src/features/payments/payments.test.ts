import { QueryClient } from "@tanstack/react-query"
import { validate } from "eu-payment-qr"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pb } from "../../lib/pocketbase"
import { dashboardKeys, paymentKeys } from "../../lib/queryKeys"
import * as paymentApi from "./api/paymentApi"
import {
  invalidatePaymentQueries,
  subscribeToPaymentRealtime,
} from "./hooks/usePayments"
import {
  createEpcPayload,
  downloadEpcPng,
  formatEuroInput,
  formatMoney,
  parseEuroCents,
  paymentToEpcData,
  sortAdminPayments,
} from "./paymentUtils"
import type { AdminPaymentRecord, PaymentDetail } from "./types"

const payment: PaymentDetail = {
  id: "k8x4m2p9abc123d",
  registrationId: "reg123456789012",
  event: {
    id: "ruuxuhvvg68vuoz",
    title: "Freitagstraining",
    start: "2026-11-14T18:00:00Z",
    end: "2026-11-14T20:00:00Z",
    guestFeeCents: 380,
  },
  roleSnapshot: "GUEST",
  paymentRequired: true,
  amountCents: 380,
  status: "UNPAID",
  purpose: "BVHUB-EVT-ruuxuhvvg68vuoz-PAY-k8x4m2p9abc123d",
  active: true,
  paidAt: null,
  created: "2026-09-15T10:00:00Z",
  updated: "2026-09-15T10:00:00Z",
  paymentSettings: {
    recipientName: "Empfänger & Verein",
    iban: "DE89370400440532013000",
    bic: "COBADEFFXXX",
    configured: true,
    updated: "2026-09-15T10:00:00Z",
  },
}

function adminPayment(
  overrides: Partial<AdminPaymentRecord> & Record<"id" | "displayName", string>,
): AdminPaymentRecord {
  const { id, displayName, user, ...rest } = overrides
  return {
    id,
    registrationId: `registration-${id}`,
    event: payment.event,
    roleSnapshot: "GUEST",
    paymentRequired: true,
    amountCents: 380,
    status: "UNPAID",
    purpose: `purpose-${id}`,
    active: true,
    paidAt: null,
    created: payment.created,
    updated: payment.updated,
    user: {
      id: `user-${id}`,
      displayName,
      firstName: displayName,
      lastName: "",
      ...user,
    },
    paidBy: null,
    ...rest,
  }
}

afterEach(() => vi.restoreAllMocks())

describe("payment money and transfer adapters", () => {
  it("parses German euro input without floating point drift", () => {
    expect(parseEuroCents("3,80")).toBe(380)
    expect(parseEuroCents("3.80")).toBe(380)
    expect(parseEuroCents("0,00")).toBe(0)
    expect(formatEuroInput(380)).toBe("3,80")
    expect(formatMoney(380, "de")).toContain("3,80")
    expect(() => parseEuroCents("3,799")).toThrow(RangeError)
  })

  it("maps cents exactly and places the full BVHUB purpose in EPC line 11", () => {
    const data = paymentToEpcData(payment)
    expect(data.amount).toBe(3.8)
    expect(String(data.amount)).not.toContain("799999")
    expect(data.message).toBe(payment.purpose)
    expect(data.reference).toBeUndefined()
    expect(validate(data).valid).toBe(true)
    const lines = createEpcPayload(payment).split("\n")
    expect(lines).toHaveLength(12)
    expect(lines[9]).toBe("")
    expect(lines[10]).toBe(payment.purpose)
    expect(lines[11]).toBe("")
  })

  it("rejects missing settings and invalid IBANs", () => {
    expect(() =>
      createEpcPayload({
        ...payment,
        paymentSettings: {
          ...payment.paymentSettings,
          iban: "DE000",
          configured: true,
        },
      }),
    ).toThrow(RangeError)
  })

  it("rasterizes a QR with a white quiet zone and safe filename", async () => {
    const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() }
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) =>
        callback(new Blob(["png"], { type: "image/png" })),
      ),
    }
    const anchor = { href: "", download: "", click: vi.fn() }
    const createObjectURL = vi.fn((value: Blob) =>
      value.type === "image/png" ? "blob:png" : "blob:svg",
    )
    const revokeObjectURL = vi.fn()
    class TestImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        this.onload?.()
      }
    }
    vi.stubGlobal("document", {
      createElement: (tag: string) => (tag === "canvas" ? canvas : anchor),
    })
    vi.stubGlobal(
      "XMLSerializer",
      class {
        serializeToString() {
          return "<svg />"
        }
      },
    )
    vi.stubGlobal("Image", TestImage)
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })

    try {
      await downloadEpcPng(
        {
          viewBox: { baseVal: { width: 224, height: 224 } },
          width: { baseVal: { value: 224 } },
          height: { baseVal: { value: 224 } },
          clientWidth: 224,
          clientHeight: 224,
        } as unknown as SVGSVGElement,
        "bvhub-payment-payment-123.png",
      )
      expect(anchor.download).toBe("bvhub-payment-payment-123.png")
      expect(anchor.click).toHaveBeenCalledOnce()
      expect(canvas.width).toBe(1152)
      expect(canvas.height).toBe(1152)
      expect(context.fillStyle).toBe("#ffffff")
      expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1152, 1152)
      expect(context.drawImage).toHaveBeenCalledWith(
        expect.any(TestImage),
        128,
        128,
        896,
        896,
      )
      expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("releases the source URL and reports rasterization failures", async () => {
    const revokeObjectURL = vi.fn()
    class FailedImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        this.onerror?.()
      }
    }
    vi.stubGlobal("document", {})
    vi.stubGlobal(
      "XMLSerializer",
      class {
        serializeToString() {
          return "<svg />"
        }
      },
    )
    vi.stubGlobal("Image", FailedImage)
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:svg"),
      revokeObjectURL,
    })

    try {
      await expect(
        downloadEpcPng({} as SVGSVGElement, "bvhub-payment-payment-123.png"),
      ).rejects.toThrow("Unable to rasterize QR code")
      expect(revokeObjectURL).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("admin payment sorting", () => {
  const records = [
    adminPayment({
      id: "c",
      displayName: "Zoe",
      status: "PAID",
      amountCents: 1200,
      roleSnapshot: "MEMBER",
      purpose: "B",
      paidAt: "2026-09-03T00:00:00Z",
      paidBy: { id: "admin", displayName: "Admin B" },
    }),
    adminPayment({
      id: "a",
      displayName: "Anna",
      amountCents: 300,
      roleSnapshot: "ADMIN",
      purpose: "C",
      paidAt: null,
    }),
    adminPayment({
      id: "b",
      displayName: "Anna",
      amountCents: 300,
      roleSnapshot: "GUEST",
      purpose: "A",
      paidAt: "2026-09-01T00:00:00Z",
      paidBy: { id: "admin", displayName: "Admin A" },
    }),
  ]

  it("defaults to unpaid first and display name ascending without mutating input", () => {
    const original = [...records]
    expect(
      sortAdminPayments(records, "status", "asc", "en").map((item) => item.id),
    ).toEqual(["a", "b", "c"])
    expect(records).toEqual(original)
  })

  it("sorts every data key in both directions and keeps empty values last", () => {
    const keys = [
      "status",
      "displayName",
      "realName",
      "roleSnapshot",
      "amount",
      "purpose",
      "paidAt",
      "paidBy",
    ] as const
    for (const key of keys) {
      expect(sortAdminPayments(records, key, "asc", "en")).toHaveLength(
        records.length,
      )
      expect(sortAdminPayments(records, key, "desc", "en")).toHaveLength(
        records.length,
      )
    }
    expect(sortAdminPayments(records, "paidAt", "desc", "en").at(-1)?.id).toBe(
      "a",
    )
    expect(sortAdminPayments(records, "paidBy", "asc", "en").at(-1)?.id).toBe(
      "a",
    )
  })

  it("uses payment id as a stable final tie-breaker", () => {
    expect(
      sortAdminPayments(records, "amount", "asc", "en")
        .slice(0, 2)
        .map((item) => item.id),
    ).toEqual(["a", "b"])
  })
})

describe("payment API and query keys", () => {
  it("uses the dedicated payment endpoints and request bodies", async () => {
    const send = vi
      .spyOn(pb, "send")
      .mockResolvedValueOnce({ items: [payment] })
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(payment.paymentSettings)
      .mockResolvedValueOnce(payment.paymentSettings)

    await paymentApi.getMyPayments()
    await paymentApi.getPayment(payment.id)
    await paymentApi.getAdminPaymentSummary()
    await paymentApi.getAdminPaymentSummary(true)
    await paymentApi.getAdminEventPayments(payment.event.id)
    await paymentApi.setPaymentStatus(payment.id, "PAID")
    await paymentApi.getPaymentSettings()
    await paymentApi.updatePaymentSettings(payment.paymentSettings)

    expect(send).toHaveBeenNthCalledWith(1, "/api/bvhub/me/payments", {
      method: "GET",
    })
    expect(send).toHaveBeenNthCalledWith(
      2,
      `/api/bvhub/me/payments/${payment.id}`,
      { method: "GET" },
    )
    expect(send).toHaveBeenNthCalledWith(
      3,
      "/api/bvhub/admin/payment-summary",
      { method: "GET" },
    )
    expect(send).toHaveBeenNthCalledWith(
      4,
      "/api/bvhub/admin/payment-summary?showAll=true",
      { method: "GET" },
    )
    expect(send).toHaveBeenNthCalledWith(
      5,
      `/api/bvhub/admin/events/${payment.event.id}/payments`,
      { method: "GET" },
    )
    expect(send).toHaveBeenNthCalledWith(
      6,
      `/api/bvhub/admin/payments/${payment.id}/status`,
      { method: "PATCH", body: { status: "PAID" } },
    )
    expect(send).toHaveBeenNthCalledWith(
      8,
      "/api/bvhub/admin/payment-settings",
      {
        method: "PATCH",
        body: {
          recipientName: payment.paymentSettings.recipientName,
          iban: payment.paymentSettings.iban,
          bic: payment.paymentSettings.bic,
        },
      },
    )
  })

  it("keeps user, detail, summary, event, and settings cache keys separate", () => {
    expect(paymentKeys.me()).toEqual(["payments", "me"])
    expect(paymentKeys.detail(payment.id)).toEqual([
      "payments",
      "detail",
      payment.id,
    ])
    expect(paymentKeys.adminSummary()).toEqual(["payments", "admin", "summary", { showAll: false }])
    expect(paymentKeys.adminSummary(true)).toEqual(["payments", "admin", "summary", { showAll: true }])
    expect(paymentKeys.adminEvent(payment.event.id)).toEqual([
      "payments",
      "admin",
      "event",
      payment.event.id,
    ])
    expect(paymentKeys.settings()).toEqual(["payments", "admin", "settings"])
  })
})

describe("payment realtime", () => {
  it("invalidates every affected query and unsubscribes during cleanup", async () => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue()
    const unsubscribe = vi.fn()
    let listener: ((event: {
      record: Record<"id" | "event", string>
    }) => void) | undefined
    const collection = {
      subscribe: vi.fn(async (_topic: string, callback: typeof listener) => {
        listener = callback
        return unsubscribe
      }),
    }

    const cleanup = subscribeToPaymentRealtime(client, collection as never)
    await Promise.resolve()
    listener?.({ record: { id: payment.id, event: payment.event.id } })

    const invalidatedKeys = invalidate.mock.calls.map(
      ([filters]) => filters?.queryKey,
    )
    expect(invalidatedKeys).toContainEqual(paymentKeys.me())
    expect(invalidatedKeys).toContainEqual(paymentKeys.detail(payment.id))
    expect(invalidatedKeys).toContainEqual(paymentKeys.adminSummaries())
    expect(invalidatedKeys).toContainEqual(
      paymentKeys.adminEvent(payment.event.id),
    )
    expect(invalidatedKeys).toContainEqual(dashboardKeys.all)
    cleanup()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it("can invalidate payment caches directly after a mutation", () => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue()
    invalidatePaymentQueries(client, {
      id: payment.id,
      event: payment.event.id,
    })
    expect(invalidate).toHaveBeenCalledTimes(5)
  })
})

import { useMemo, useState } from "react"
import { CheckCircle2, Copy, ExternalLink, Landmark, ReceiptText } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { formatIBAN } from "eu-payment-qr"
import { Link, useParams } from "react-router-dom"
import { Alert, AlertDescription, AlertTitle } from "../app/components/ui/alert"
import { Badge } from "../app/components/ui/badge"
import { Button } from "../app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../app/components/ui/card"
import { Separator } from "../app/components/ui/separator"
import { usePayment, usePaymentRealtime } from "../features/payments/hooks/usePayments"
import { buildPaytoUri, createEpcPayload, formatMoney } from "../features/payments/paymentUtils"
import { formatLocaleDateTime, useI18n } from "../i18n"

export default function PaymentDetailPage() {
  const { paymentId } = useParams()
  const { t, locale } = useI18n()
  usePaymentRealtime()
  const payment = usePayment(paymentId)
  const [copied, setCopied] = useState<"iban" | "purpose" | null>(null)
  const epc = useMemo(() => {
    if (!payment.data || payment.data.status === "PAID" || !payment.data.paymentRequired || !payment.data.paymentSettings.configured) return null
    try { return { payload: createEpcPayload(payment.data), payto: buildPaytoUri(payment.data) } } catch { return null }
  }, [payment.data])

  async function copy(value: string, key: "iban" | "purpose") {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1500)
  }

  if (payment.isPending) return <main className="min-h-full px-4 py-6"><p>{t("common.loading")}</p></main>
  if (payment.isError || !payment.data) return <main className="min-h-full px-4 py-6"><p role="alert" className="text-destructive">{t("payments.notFound")}</p><Link className="mt-4 inline-block text-sm text-primary underline" to="/dashboard">{t("common.back")}</Link></main>
  const data = payment.data
  const required = data.paymentRequired
  const paid = data.status === "PAID"

  return (
    <main className="min-h-full bg-background px-4 py-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link className="text-sm text-primary underline" to="/dashboard">{t("payments.backToPayments")}</Link>
        <Card>
          <CardHeader className="p-5 pb-4 lg:p-6 lg:pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="break-words text-xl leading-tight">{data.event.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{formatLocaleDateTime(data.event.start, locale)} - {formatLocaleDateTime(data.event.end, locale)}</p>
              </div>
              <Badge variant={paid ? "success" : "destructive"}>{t(paid ? "payments.paid" : "payments.unpaid")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 px-5 pb-5 lg:px-6 lg:pb-6">
            <Alert variant={paid ? "success" : "warning"}>
              <div className="flex items-start gap-3">{paid ? <CheckCircle2 className="size-5 shrink-0" /> : <ReceiptText className="size-5 shrink-0" />}<div><AlertTitle>{t(paid ? "payments.paidTitle" : "payments.paymentDue")}</AlertTitle><AlertDescription>{t(required ? (paid ? "payments.paidDescription" : "payments.unpaidDescription") : "payments.noPaymentRequired")}</AlertDescription></div></div>
            </Alert>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs font-medium text-muted-foreground">{t("payments.amount")}</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(data.amountCents, locale)}</dd></div>
              <div><dt className="text-xs font-medium text-muted-foreground">{t("payments.purpose")}</dt><dd className="mt-1 break-all font-mono text-xs">{data.purpose}</dd></div>
            </dl>

            {required && <Separator />}
            {required && !data.paymentSettings.configured && <Alert variant="warning"><Landmark className="mb-2 size-5" /><AlertTitle>{t("payments.settingsMissingTitle")}</AlertTitle><AlertDescription>{t("payments.settingsMissing")}</AlertDescription></Alert>}
            {required && data.paymentSettings.configured && (
              <div className="flex flex-col gap-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">{t("payments.recipient")}</dt><dd className="mt-1 font-medium">{data.paymentSettings.recipientName}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{t("payments.iban")}</dt><dd className="mt-1 break-all font-mono text-xs">{formatIBAN(data.paymentSettings.iban)}</dd></div>
                  {data.paymentSettings.bic && <div><dt className="text-xs text-muted-foreground">{t("payments.bic")}</dt><dd className="mt-1 font-mono text-xs">{data.paymentSettings.bic}</dd></div>}
                </dl>
                {!paid && epc && (
                  <div className="flex flex-col items-center gap-4">
                    <div data-testid="epc-payment-qr" className="w-full max-w-64 rounded-lg bg-white p-4 shadow-sm outline outline-black/10"><QRCodeSVG value={epc.payload} size={224} level="M" marginSize={4} bgColor="#ffffff" fgColor="#111111" className="h-auto max-w-full" /></div>
                    <a data-testid="payto-link" href={epc.payto} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"><ExternalLink className="size-4" />{t("payments.openBankingApp")}</a>
                  </div>
                )}
                {!paid && !epc && <p role="alert" className="text-sm text-destructive">{t("payments.qrError")}</p>}
                {!paid && <div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => void copy(data.paymentSettings.iban, "iban")}><Copy data-icon="inline-start" />{copied === "iban" ? t("payments.copied") : t("payments.copyIban")}</Button><Button variant="outline" onClick={() => void copy(data.purpose, "purpose")}><Copy data-icon="inline-start" />{copied === "purpose" ? t("payments.copied") : t("payments.copyPurpose")}</Button></div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

import { ArrowRight, CalendarDays, ReceiptText } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "../../../app/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../../../app/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../app/components/ui/table"
import { formatLocaleDateTime, useI18n } from "../../../i18n"
import { formatMoney } from "../paymentUtils"
import { useMyPayments } from "../hooks/usePayments"
import type { PaymentRecord } from "../types"

function StatusBadge({ payment }: { payment: PaymentRecord }) {
  const { t } = useI18n()
  return <Badge variant={payment.status === "PAID" ? "success" : "destructive"}>{t(payment.status === "PAID" ? "payments.paid" : "payments.unpaid")}</Badge>
}

function PaymentDate({ payment }: { payment: PaymentRecord }) {
  const { locale } = useI18n()
  return <span>{formatLocaleDateTime(payment.event.start, locale)} - {formatLocaleDateTime(payment.event.end, locale)}</span>
}

function MobilePaymentRow({ payment }: { payment: PaymentRecord }) {
  const { t, locale } = useI18n()
  return (
    <Card className="md:hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <CardTitle className="break-words text-sm leading-snug">{payment.event.title}</CardTitle>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"><CalendarDays className="mt-0.5 size-3.5 shrink-0" /> <PaymentDate payment={payment} /></p>
        </div>
        <StatusBadge payment={payment} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{t("payments.amount")}</span>
          <span className="font-semibold tabular-nums">{formatMoney(payment.amountCents, locale)}</span>
        </div>
        <code className="break-all rounded-md bg-muted px-2.5 py-2 text-[11px] text-muted-foreground">{payment.purpose}</code>
        <Link className="inline-flex min-h-11 items-center justify-between rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent" to={`/payments/${encodeURIComponent(payment.id)}`}>
          {t("payments.details")}<ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}

export default function PaymentsView() {
  const { t, locale } = useI18n()
  const payments = useMyPayments()
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 id="view-title-payments" tabIndex={-1} className="page-title text-foreground">{t("payments.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("payments.subtitle")}</p>
      </div>
      {payments.isPending && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {payments.isError && <p role="alert" className="text-sm text-destructive">{t("payments.loadError")}</p>}
      {payments.isSuccess && payments.data.length === 0 && (
        <div className="flex flex-col items-center py-14 text-center text-muted-foreground">
          <ReceiptText className="size-8" />
          <p className="mt-3 text-sm font-medium">{t("payments.empty")}</p>
          <p className="mt-1 text-xs">{t("payments.emptyHint")}</p>
        </div>
      )}
      {payments.data?.map((payment) => <MobilePaymentRow key={payment.id} payment={payment} />)}
      {payments.data?.length ? (
        <Card className="hidden overflow-hidden md:block">
          <Table>
            <TableHeader><TableRow><TableHead>{t("payments.status")}</TableHead><TableHead>{t("payments.event")}</TableHead><TableHead>{t("payments.date")}</TableHead><TableHead>{t("payments.amount")}</TableHead><TableHead>{t("payments.purpose")}</TableHead><TableHead><span className="sr-only">{t("payments.details")}</span></TableHead></TableRow></TableHeader>
            <TableBody>{payments.data.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell><StatusBadge payment={payment} /></TableCell>
                <TableCell className="max-w-52 font-medium"><span className="line-clamp-2">{payment.event.title}</span></TableCell>
                <TableCell className="max-w-60 text-xs text-muted-foreground"><PaymentDate payment={payment} /></TableCell>
                <TableCell className="font-semibold tabular-nums">{formatMoney(payment.amountCents, locale)}</TableCell>
                <TableCell><code className="block max-w-64 break-all text-[11px] text-muted-foreground">{payment.purpose}</code></TableCell>
                <TableCell className="text-right"><Link aria-label={`${t("payments.details")}: ${payment.event.title}`} className="inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" to={`/payments/${encodeURIComponent(payment.id)}`}><ArrowRight className="size-4" /></Link></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      ) : null}
    </div>
  )
}

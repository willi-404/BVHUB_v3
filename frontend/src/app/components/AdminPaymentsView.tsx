import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Landmark,
  Save,
} from "lucide-react"
import { formatLocaleDateTime, useI18n, type MessageKey } from "../../i18n"
import {
  useAdminEventPayments,
  useAdminPaymentSummary,
  usePaymentSettings,
  useSetPaymentStatus,
  useUpdatePaymentSettings,
} from "../../features/payments/hooks/usePayments"
import {
  formatMoney,
  sortAdminPayments,
  type PaymentSortDirection,
  type PaymentSortKey,
} from "../../features/payments/paymentUtils"
import type {
  AdminPaymentRecord,
  AdminPaymentSummary,
  PaymentRole,
  PaymentStatus,
} from "../../features/payments/types"
import { Alert, AlertDescription } from "./ui/alert"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Input } from "./ui/input"
import { Separator } from "./ui/separator"
import { Select } from "./ui/select"
import { Switch } from "./ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

function statusLabel(status: PaymentStatus, t: (key: MessageKey) => string) {
  return t(
    status === "PAID" ? "payments.status.paid" : "payments.status.unpaid",
  )
}

function roleLabel(role: PaymentRole, t: (key: MessageKey) => string) {
  const keys: Record<PaymentRole, MessageKey> = {
    GUEST: "roles.guest",
    MEMBER: "roles.member",
    ADMIN: "roles.admin",
    SUPER_ADMIN: "roles.superAdmin",
  }
  return t(keys[role])
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useI18n()
  return (
    <Badge variant={status === "PAID" ? "success" : "destructive"}>
      {statusLabel(status, t)}
    </Badge>
  )
}

function PaymentSettingsForm() {
  const { t } = useI18n()
  const settings = usePaymentSettings()
  const updateSettings = useUpdatePaymentSettings()
  const [recipientName, setRecipientName] = useState("")
  const [iban, setIban] = useState("")
  const [bic, setBic] = useState("")

  useEffect(() => {
    if (!settings.data) return
    setRecipientName(settings.data.recipientName)
    setIban(settings.data.iban)
    setBic(settings.data.bic)
  }, [settings.data])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSettings.mutate({ recipientName, iban, bic })
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Landmark className="size-4" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base">
              {t("admin.payments.settingsTitle")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("admin.payments.settingsDescription")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {settings.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {t("admin.payments.settingsError")}
            </AlertDescription>
          </Alert>
        )}
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <label className="grid gap-1.5 md:col-span-2">
            <span className="text-sm font-medium">
              {t("payments.recipient")}
            </span>
            <Input
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              required
              maxLength={70}
              disabled={settings.isLoading || updateSettings.isPending}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">{t("payments.iban")}</span>
            <Input
              value={iban}
              onChange={(event) => setIban(event.target.value)}
              required
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              disabled={settings.isLoading || updateSettings.isPending}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">
              {t("payments.bicOptional")}
            </span>
            <Input
              value={bic}
              onChange={(event) => setBic(event.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              disabled={settings.isLoading || updateSettings.isPending}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button
              type="submit"
              disabled={
                settings.isLoading ||
                updateSettings.isPending ||
                !recipientName.trim() ||
                !iban.trim()
              }
            >
              <Save aria-hidden="true" />
              {t("common.save")}
            </Button>
            {updateSettings.isSuccess && (
              <span className="text-sm text-emerald-700">
                {t("admin.payments.settingsSaved")}
              </span>
            )}
            {updateSettings.isError && (
              <span className="text-sm text-destructive">
                {t("admin.payments.settingsError")}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function PaymentStatusSwitch({ payment }: { payment: AdminPaymentRecord }) {
  const { t } = useI18n()
  const mutation = useSetPaymentStatus()
  const nextStatus: PaymentStatus =
    payment.status === "PAID" ? "UNPAID" : "PAID"

  return (
    <div className="flex items-center justify-end gap-2">
      <Switch
        checked={payment.status === "PAID"}
        disabled={mutation.isPending}
        className="data-[state=checked]:!bg-emerald-600 data-[state=unchecked]:!bg-destructive"
        aria-label={t("admin.payments.setStatus")}
        onCheckedChange={() =>
          mutation.mutate({
            paymentId: payment.id,
            eventId: payment.event.id,
            status: nextStatus,
          })
        }
      />
      {mutation.isError && (
        <span className="text-xs text-destructive">
          {t("admin.payments.updateError")}
        </span>
      )}
    </div>
  )
}

const paymentSortKeys: readonly PaymentSortKey[] = [
  "status",
  "displayName",
  "realName",
  "roleSnapshot",
  "amount",
  "purpose",
  "paidAt",
  "paidBy",
]

const paymentSortLabelKeys: Record<PaymentSortKey, MessageKey> = {
  status: "payments.status",
  displayName: "admin.payments.displayName",
  realName: "admin.payments.realName",
  roleSnapshot: "admin.payments.roleSnapshot",
  amount: "payments.amount",
  purpose: "payments.purpose",
  paidAt: "admin.payments.paidAt",
  paidBy: "admin.payments.paidBy",
}

function MobilePaymentRow({ payment }: { payment: AdminPaymentRecord }) {
  const { t, locale } = useI18n()
  const realName =
    [payment.user.firstName, payment.user.lastName].filter(Boolean).join(" ") ||
    "-"
  return (
    <div className="grid gap-3 p-4" data-testid={`admin-payment-${payment.id}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{payment.user.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{realName}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">
            {t("admin.payments.roleSnapshot")}
          </dt>
          <dd className="mt-0.5 font-medium">
            {roleLabel(payment.roleSnapshot, t)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("payments.amount")}</dt>
          <dd className="mt-0.5 font-medium">
            {formatMoney(payment.amountCents, locale)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">{t("payments.purpose")}</dt>
          <dd className="mt-0.5 break-all font-mono">{payment.purpose}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("admin.payments.paidAt")}
          </dt>
          <dd className="mt-0.5">
            {payment.paidAt
              ? formatLocaleDateTime(payment.paidAt, locale)
              : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("admin.payments.paidBy")}
          </dt>
          <dd className="mt-0.5">{payment.paidBy?.displayName || "-"}</dd>
        </div>
      </dl>
      {!payment.paymentRequired && (
        <p className="text-xs font-medium text-muted-foreground">
          {t("admin.payments.memberNoFee")}
        </p>
      )}
      <PaymentStatusSwitch payment={payment} />
    </div>
  )
}

function EventPaymentDetails({ eventId }: { eventId: string }) {
  const { t, locale } = useI18n()
  const payments = useAdminEventPayments(eventId)
  const [sortKey, setSortKey] = useState<PaymentSortKey>("status")
  const [sortDirection, setSortDirection] =
    useState<PaymentSortDirection>("asc")
  const roleLabels = useMemo(
    () => ({
      GUEST: roleLabel("GUEST", t),
      MEMBER: roleLabel("MEMBER", t),
      ADMIN: roleLabel("ADMIN", t),
      SUPER_ADMIN: roleLabel("SUPER_ADMIN", t),
    }),
    [t],
  )
  const sortedPayments = useMemo(
    () =>
      sortAdminPayments(
        payments.data ?? [],
        sortKey,
        sortDirection,
        locale,
        roleLabels,
      ),
    [locale, payments.data, roleLabels, sortDirection, sortKey],
  )

  function selectSortKey(nextKey: PaymentSortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(nextKey)
    setSortDirection("asc")
  }

  function sortButtonLabel(key: PaymentSortKey) {
    const directionLabel =
      key === sortKey
        ? t(
            sortDirection === "asc"
              ? "admin.payments.sortAscending"
              : "admin.payments.sortDescending",
          )
        : t("admin.payments.sortNone")
    return `${t("admin.payments.sortBy")} ${t(paymentSortLabelKeys[key])}, ${directionLabel}`
  }

  function SortHeader({ sortKey: headerKey }: { sortKey: PaymentSortKey }) {
    const active = sortKey === headerKey
    return (
      <TableHead
        aria-sort={
          active
            ? sortDirection === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-mx-2 h-8 px-2"
          aria-label={sortButtonLabel(headerKey)}
          onClick={() => selectSortKey(headerKey)}
        >
          {t(paymentSortLabelKeys[headerKey])}
          {active ? (
            sortDirection === "asc" ? (
              <ArrowUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ArrowDown className="size-3.5" aria-hidden="true" />
            )
          ) : (
            <ChevronsUpDown className="size-3.5" aria-hidden="true" />
          )}
        </Button>
      </TableHead>
    )
  }

  if (payments.isLoading)
    return (
      <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
    )
  if (payments.isError)
    return (
      <Alert variant="destructive" className="m-4 w-auto">
        <AlertDescription>{t("admin.payments.loadError")}</AlertDescription>
      </Alert>
    )
  if (!payments.data?.length)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {t("admin.payments.noPayments")}
      </p>
    )

  return (
    <>
      <div className="divide-y md:hidden">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
          <label className="sr-only" htmlFor={`payment-sort-${eventId}`}>
            {t("admin.payments.sortBy")}
          </label>
          <Select
            id={`payment-sort-${eventId}`}
            aria-label={t("admin.payments.sortBy")}
            value={sortKey}
            onChange={(event) =>
              selectSortKey(event.target.value as PaymentSortKey)
            }
            className="min-w-0 flex-1 text-sm"
          >
            {paymentSortKeys.map((key) => (
              <option key={key} value={key}>
                {t(paymentSortLabelKeys[key])}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t(
              sortDirection === "asc"
                ? "admin.payments.sortAscending"
                : "admin.payments.sortDescending",
            )}
            onClick={() =>
              setSortDirection((current) =>
                current === "asc" ? "desc" : "asc",
              )
            }
          >
            {sortDirection === "asc" ? (
              <ArrowUp aria-hidden="true" />
            ) : (
              <ArrowDown aria-hidden="true" />
            )}
          </Button>
        </div>
        {sortedPayments.map((payment) => (
          <MobilePaymentRow key={payment.id} payment={payment} />
        ))}
      </div>
      <div
        className="hidden max-h-[min(70vh,42rem)] overflow-auto md:block"
        data-testid="admin-payments-table-scroll"
      >
        <Table containerClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
            <TableRow>
              <SortHeader sortKey="status" />
              <SortHeader sortKey="displayName" />
              <SortHeader sortKey="realName" />
              <SortHeader sortKey="roleSnapshot" />
              <SortHeader sortKey="amount" />
              <SortHeader sortKey="purpose" />
              <SortHeader sortKey="paidAt" />
              <SortHeader sortKey="paidBy" />
              <TableHead className="text-right">
                {t("admin.payments.setStatus")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayments.map((payment) => (
              <TableRow
                key={payment.id}
                data-testid={`admin-payment-${payment.id}`}
              >
                <TableCell>
                  <StatusBadge status={payment.status} />
                </TableCell>
                <TableCell className="font-medium">
                  {payment.user.displayName}
                </TableCell>
                <TableCell>
                  {[payment.user.firstName, payment.user.lastName]
                    .filter(Boolean)
                    .join(" ") || "-"}
                </TableCell>
                <TableCell>{roleLabel(payment.roleSnapshot, t)}</TableCell>
                <TableCell>
                  <span>{formatMoney(payment.amountCents, locale)}</span>
                  {!payment.paymentRequired && (
                    <span className="mt-1 block max-w-40 text-xs text-muted-foreground">
                      {t("admin.payments.memberNoFee")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-64 break-all font-mono text-xs">
                  {payment.purpose}
                </TableCell>
                <TableCell className="text-xs">
                  {payment.paidAt
                    ? formatLocaleDateTime(payment.paidAt, locale)
                    : "-"}
                </TableCell>
                <TableCell>{payment.paidBy?.displayName || "-"}</TableCell>
                <TableCell>
                  <PaymentStatusSwitch payment={payment} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function EventPaymentCard({ summary }: { summary: AdminPaymentSummary }) {
  const { t, locale } = useI18n()
  const [expanded, setExpanded] = useState(false)
  return (
    <Card data-testid={`payment-event-${summary.eventId}`}>
      <button
        className="w-full p-4 text-left sm:p-5"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{summary.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatLocaleDateTime(summary.start, locale)} -{" "}
              {formatLocaleDateTime(summary.end, locale)}
            </p>
          </div>
          {expanded ? (
            <ChevronUp
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
          <div>
            <dt className="text-muted-foreground">
              {t("admin.payments.guestFee")}
            </dt>
            <dd className="mt-0.5 font-semibold">
              {formatMoney(summary.guestFeeCents, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("admin.payments.paymentCount")}
            </dt>
            <dd className="mt-0.5 font-semibold">{summary.totalPayments}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("payments.status.paid")}
            </dt>
            <dd className="mt-0.5 font-semibold text-emerald-700">
              {summary.paidCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("payments.status.unpaid")}
            </dt>
            <dd className="mt-0.5 font-semibold text-destructive">
              {summary.unpaidCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("admin.payments.openAmount")}
            </dt>
            <dd className="mt-0.5 font-semibold">
              {formatMoney(summary.openAmountCents, locale)}
            </dd>
          </div>
        </dl>
      </button>
      {expanded && (
        <>
          <Separator />
          <EventPaymentDetails eventId={summary.eventId} />
        </>
      )}
    </Card>
  )
}

export function AdminPaymentsView({ onBack }: { onBack: () => void }) {
  const { t } = useI18n()
  const [showAll, setShowAll] = useState(false)
  const summary = useAdminPaymentSummary(showAll)
  return (
    <main className="min-h-0 flex-1 overflow-y-auto mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t("common.back")}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t("admin.payments.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.payments.subtitle")}
          </p>
        </div>
      </div>

      <PaymentSettingsForm />

      <section aria-labelledby="event-payments-title">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 id="event-payments-title" className="font-semibold">
              {t("admin.payments.eventsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.payments.eventsDescription")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAll((current) => !current)}>
            {showAll ? t("admin.payments.showRecent") : t("admin.payments.showAll")}
          </Button>
        </div>
        {summary.isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}
        {summary.isError && (
          <Alert variant="destructive">
            <AlertDescription>{t("admin.payments.loadError")}</AlertDescription>
          </Alert>
        )}
        {summary.data?.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {t(showAll ? "admin.payments.noPaymentsAll" : "admin.payments.noPayments")}
          </Card>
        )}
        <div className="grid gap-3">
          {summary.data?.map((event) => (
            <EventPaymentCard key={event.eventId} summary={event} />
          ))}
        </div>
      </section>
    </main>
  )
}

export default AdminPaymentsView

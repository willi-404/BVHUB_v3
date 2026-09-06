import { Link, useLocation, useParams } from "react-router-dom"
import { Badge } from "../app/components/ui/badge"
import { Card } from "../app/components/ui/card"
import { isAdminRole } from "../features/auth/policy"
import { useAuthUser } from "../features/auth/AuthProvider"
import {
  useCancelRegistration,
  useEvent,
  useEventRealtime,
  useParticipants,
} from "../features/events/hooks/useEvents"
import { formatLocaleDateTime, useI18n, type MessageKey } from "../i18n"

function NavigationLinks() {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-600"
        to="/events"
      >
        {t("events.backToList")}
      </Link>
      <Link
        className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-600"
        to="/dashboard"
      >
        {t("events.backToDashboard")}
      </Link>
    </div>
  )
}

function registrationReason(
  event: NonNullable<ReturnType<typeof useEvent>["data"]>,
  role: string | undefined,
  t: (key: MessageKey) => string,
) {
  if (event.myRegistrationStatus === "REGISTERED")
    return t("events.registrationReason.alreadyRegistered")
  if (event.status === "CANCELLED")
    return t("events.registrationReason.cancelled")
  if (event.status === "COMPLETED")
    return t("events.registrationReason.completed")
  if (Date.parse(event.end) <= Date.now())
    return t("events.registrationReason.closed")
  if (event.spotsLeft <= 0) return t("events.registrationReason.full")
  if (!event.venue.active || !event.venue.checkoutRegion)
    return t("events.registrationReason.venue")
  if (event.status === "MEMBERS_ONLY" && role === "GUEST")
    return t("events.registrationReason.membersOnly")
  return t("events.registrationReason.closed")
}

export default function EventDetailPage() {
  const { eventId } = useParams()
  const { t, locale } = useI18n()
  const location = useLocation()
  const authUser = useAuthUser()
  useEventRealtime()
  const query = useEvent(eventId)
  const participants = useParticipants(eventId, Boolean(query.data?.published))
  const cancel = useCancelRegistration()
  const event = query.data
  const adminViewer = isAdminRole(authUser.data?.role)
  const registered = Boolean(
    (location.state as { registered?: boolean } | null)?.registered,
  )

  if (query.isPending && !event)
    return (
      <div className="min-h-full p-6">
        <NavigationLinks />
        <p className="mt-5 text-sm text-[var(--muted-foreground)]">
          {t("common.loading")}
        </p>
      </div>
    )
  if (query.isError || !event)
    return (
      <div className="min-h-full p-6">
        <NavigationLinks />
        <p role="alert" className="mt-5 text-sm text-red-700">
          {t("events.notFound")}
        </p>
      </div>
    )

  async function handleCancel() {
    if (!eventId || cancel.isPending) return
    try {
      await cancel.mutateAsync(eventId)
    } catch {
      /* mutation state renders the error */
    }
  }

  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <NavigationLinks />
        {registered && (
          <p
            role="status"
            className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {t("events.registrationSuccess")}
          </p>
        )}
        <Card className="mt-4 p-5 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-700">{event.title}</h1>
            <Badge
              variant={
                event.status === "CANCELLED" || event.status === "COMPLETED"
                  ? "destructive"
                  : "success"
              }
            >
              {t(`events.status.${event.status}` as MessageKey)}
            </Badge>
          </div>
          {event.description && (
            <section className="mt-6">
              <h2 className="text-sm font-700">{t("events.description")}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">
                {event.description}
              </p>
            </section>
          )}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-600 text-[var(--muted-foreground)]">
                {t("start")}
              </dt>
              <dd className="mt-1 text-sm">
                {formatLocaleDateTime(event.start, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-600 text-[var(--muted-foreground)]">
                {t("end")}
              </dt>
              <dd className="mt-1 text-sm">
                {formatLocaleDateTime(event.end, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-600 text-[var(--muted-foreground)]">
                {t("events.venue")}
              </dt>
              <dd className="mt-1 text-sm font-600">{event.venue.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-600 text-[var(--muted-foreground)]">
                {t("events.address")}
              </dt>
              <dd className="mt-1 text-sm">{event.venue.address}</dd>
            </div>
            <div>
              <dt className="text-xs font-600 text-[var(--muted-foreground)]">
                {t("events.capacity")}
              </dt>
              <dd className="mt-1 text-sm">{event.capacity}</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-[var(--radius)] bg-[var(--muted)] p-4 text-sm">
            <p>
              {event.status === "MEMBERS_ONLY"
                ? t("events.membersOnly")
                : event.status === "OPEN_TO_ALL"
                  ? t("events.openToAll")
                  : t(`events.status.${event.status}` as MessageKey)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {t("events.spotsLeft", { count: event.spotsLeft })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {event.canRegister ? (
                <Link
                  className="rounded bg-[var(--primary)] px-4 py-2 text-white"
                  to={`/events/${encodeURIComponent(event.id)}/checkout`}
                >
                  {t("events.registerNow")}
                </Link>
              ) : (
                <p className="rounded border border-[var(--border)] px-4 py-2 text-sm">
                  {registrationReason(event, authUser.data?.role, t)}
                </p>
              )}
              {(event.myRegistrationStatus === "REGISTERED" ||
                event.canCancel) && (
                <button
                  className="rounded border px-4 py-2"
                  disabled={cancel.isPending}
                  onClick={() => void handleCancel()}
                >
                  {t("events.cancelRegistration")}
                </button>
              )}
            </div>
            {cancel.isError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {t("events.registrationError")}
              </p>
            )}
          </div>
          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-700">
                {t("events.participantsTitle")}
              </h2>
              <span className="text-sm text-[var(--muted-foreground)]">
                {participants.data?.totalItems ?? 0}
              </span>
            </div>
            {participants.isPending && (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {t("common.loading")}
              </p>
            )}
            {participants.isError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {t("events.participantsLoadError")}
              </p>
            )}
            {participants.isSuccess && participants.data.items.length === 0 && (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {t("events.noParticipants")}
              </p>
            )}
            {participants.data?.items.map((participant, index) => (
              <div
                key={
                  participant.registrationId ??
                  `${participant.displayName}-${index}`
                }
                className="mt-2 flex justify-between border-b border-[var(--border)] py-2 text-sm"
              >
                <span>{participant.displayName}</span>
                {adminViewer && (
                  <span>
                    {participant.firstName} {participant.lastName}
                  </span>
                )}
              </div>
            ))}
          </section>
        </Card>
      </div>
    </div>
  )
}

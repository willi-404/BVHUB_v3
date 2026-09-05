import { Link, useLocation, useParams } from "react-router-dom"
import { Badge } from "../app/components/ui/badge"
import { Card } from "../app/components/ui/card"
import { useCancelRegistration, useEvent, useRegistration, useEventRealtime, useEventChangelog } from "../features/events/hooks/useEvents"
import { formatLocaleDateTime, useI18n, type MessageKey } from "../i18n"
export default function EventDetailPage() {
  const { eventId } = useParams()
  const { t, locale } = useI18n()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith("/admin/events/")
  useEventRealtime()
  const query = useEvent(eventId)
  const registration = useRegistration(eventId)
  const changelog = useEventChangelog(isAdmin ? eventId : undefined)
  const cancel = useCancelRegistration()
  if (query.isPending)
    return (
      <div className="p-6 text-sm text-[var(--muted-foreground)]">
        {t("common.loading")}
      </div>
    )
  if (query.isError || !query.data)
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-700">
          {t("events.notFound")}
        </p>
        <Link className="mt-4 inline-block underline" to="/events">
          {t("events.backToList")}
        </Link>
      </div>
    )
  const event = query.data
  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm text-[var(--primary)] underline" to="/events">
          {t("events.backToList")}
        </Link>
        <Card className="mt-4 p-5 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-700">{event.title}</h1>
            <Badge variant={event.status === "CANCELLED" || event.status === "COMPLETED" ? "destructive" : "success"}>
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
            {event.status === "MEMBERS_ONLY" ? t("events.membersOnly") : event.status === "OPEN_TO_ALL" ? t("events.openToAll") : t(`events.status.${event.status}` as MessageKey)}
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {t("events.spotsLeft", { count: event.spotsLeft })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {event.canRegister && <Link className="rounded bg-[var(--primary)] px-4 py-2 text-white" to={`/events/${encodeURIComponent(event.id)}/checkout`}>{t("events.registerNow")}</Link>}
              {(registration.data?.status === "REGISTERED" || event.canCancel) && <button className="rounded border px-4 py-2" disabled={cancel.isPending} onClick={() => { if (window.confirm(t("events.confirmCancel"))) void cancel.mutateAsync(event.id) }}>{t("events.cancelRegistration")}</button>}
            </div>
          </div>
          {isAdmin && changelog.data?.items?.length ? <section className="mt-8"><h2 className="text-sm font-700">{t("admin.events.changelog")}</h2><div className="mt-3 grid gap-2">{changelog.data.items.map((entry) => <div key={entry.id} className="rounded border p-3 text-xs"><div className="font-600">{entry.action} · {entry.actorName} ({entry.actorRole})</div><time dateTime={entry.created}>{formatLocaleDateTime(entry.created, locale)}</time></div>)}</div></section> : null}
        </Card>
      </div>
    </div>
  )
}

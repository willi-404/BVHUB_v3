import { Link, useParams } from "react-router-dom"
import { Badge } from "../app/components/ui/badge"
import { Card } from "../app/components/ui/card"
import { useEvent } from "../features/events/hooks/useEvents"
import { formatLocaleDateTime, useI18n, type MessageKey } from "../i18n"
export default function EventDetailPage() {
  const { eventId } = useParams()
  const { t, locale } = useI18n()
  const query = useEvent(eventId)
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
            <Badge
              variant={event.status === "PUBLISHED" ? "success" : "destructive"}
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
            {event.registrationOpen
              ? t("events.registrationOpen")
              : t("events.registrationClosed")}
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {t("events.registrationInfo")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

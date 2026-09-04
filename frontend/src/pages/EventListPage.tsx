import { Link } from "react-router-dom"
import { Badge } from "../app/components/ui/badge"
import { Card } from "../app/components/ui/card"
import { useEvents } from "../features/events/hooks/useEvents"
import { formatLocaleDateTime, useI18n, type MessageKey } from "../i18n"

export default function EventListPage() {
  const { t, locale } = useI18n()
  const query = useEvents()
  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-700">{t("events.title")}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {t("events.listDescription")}
          </p>
        </div>
        {query.isPending && (
          <p role="status" className="text-sm text-[var(--muted-foreground)]">
            {t("common.loading")}
          </p>
        )}
        {query.isError && (
          <div
            role="alert"
            className="rounded-[var(--radius)] border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {t("events.loadError")}{" "}
            <button
              className="ml-2 underline"
              onClick={() => void query.refetch()}
            >
              {t("common.retry")}
            </button>
          </div>
        )}
        {query.isSuccess && query.data.length === 0 && (
          <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted-foreground)]">
            {t("events.empty")}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {query.data?.map((event) => (
            <Card key={event.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-700">{event.title}</h2>
                <Badge
                  variant={
                    event.status === "PUBLISHED"
                      ? "success"
                      : event.status === "CANCELLED"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {t(`events.status.${event.status}` as MessageKey)}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {formatLocaleDateTime(event.start, locale)} –{" "}
                {formatLocaleDateTime(event.end, locale)}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-600">{event.venue.name}</span>
                <br />
                <span className="text-[var(--muted-foreground)]">
                  {event.venue.address}
                </span>
              </p>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {t("events.capacity")}: {event.capacity}
              </p>
              <Link
                className="mt-4 inline-flex h-10 items-center rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-600 text-white"
                to={`/events/${encodeURIComponent(event.id)}`}
              >
                {t("common.showDetails")}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

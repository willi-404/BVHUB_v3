import { useState } from "react"
import { Link } from "react-router-dom"
import { Badge } from "../app/components/ui/badge"
import { Card } from "../app/components/ui/card"
import { Button } from "../app/components/ui/button"
import { useEvents, useEventRealtime } from "../features/events/hooks/useEvents"
import { formatLocaleDateTime, useI18n, type MessageKey } from "../i18n"

export default function EventListPage() {
  const { t, locale } = useI18n()
  const [showAll, setShowAll] = useState(false)
  useEventRealtime()
  const query = useEvents(showAll)
  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link className="mb-4 inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground" to="/dashboard">
            {t("events.backToDashboard")}
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="page-title">{t("events.title")}</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {t("events.listDescription")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAll((current) => !current)}>
              {showAll ? t("events.showRecent") : t("events.showAll")}
            </Button>
          </div>
        </div>
        {query.isPending && (
          <p role="status" className="text-sm text-[var(--muted-foreground)]">
            {t("common.loading")}
          </p>
        )}
        {query.isError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {t("events.loadError")}{" "}
            <Button
              variant="link"
              size="sm"
              className="ml-2 h-auto px-0 underline"
              onClick={() => void query.refetch()}
            >
              {t("common.retry")}
            </Button>
          </div>
        )}
        {query.isSuccess && query.data.length === 0 && (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted-foreground)]">
            {t(showAll ? "events.emptyAll" : "events.empty")}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {query.data?.map((event) => (
            <Card key={event.id} className="min-w-0 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-lg font-bold">{event.title}</h2>
                <Badge
                  variant={
                    event.status !== "CANCELLED" && event.status !== "COMPLETED"
                      ? "success"
                      : event.status === "CANCELLED"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {t(`events.status.${event.status}` as MessageKey)}
                </Badge>
              </div>
              <p className="mt-3 break-words text-sm text-[var(--muted-foreground)]">
                {formatLocaleDateTime(event.start, locale)} –{" "}
                {formatLocaleDateTime(event.end, locale)}
              </p>
              <p className="mt-2 break-words text-sm">
                <span className="font-semibold">{event.venue.name}</span>
                <br />
                <span className="text-[var(--muted-foreground)]">
                  {event.venue.address}
                </span>
              </p>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {t("events.capacity")}: {event.capacity}
              </p>
              <Link
                className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
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

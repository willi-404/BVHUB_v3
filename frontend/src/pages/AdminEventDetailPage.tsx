import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Button } from "../app/components/ui/button"
import { Card } from "../app/components/ui/card"
import {
  useAddParticipant,
  useAdminEvents,
  useEventChangelog,
  useEventMutation,
  useParticipants,
  useRemoveParticipant,
  useEventRealtime,
  useVenues,
} from "../features/events/hooks/useEvents"
import { useMembers } from "../features/members/hooks/useMembers"
import type { EventStatus } from "../features/events/types"
import { formatLocaleDateTime, useI18n, type MessageKey } from "../i18n"

type Form = {
  title: string
  description: string
  venue: string
  start: string
  end: string
  capacity: number
  status: EventStatus
  published: boolean
}
const toLocalInput = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((out, part) => {
      out[part.type] = part.value
      return out
    }, {})
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
const empty: Form = {
  title: "",
  description: "",
  venue: "",
  start: "",
  end: "",
  capacity: 1,
  status: "MEMBERS_ONLY",
  published: false,
}

export default function AdminEventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  useEventRealtime()
  const events = useAdminEvents()
  const venues = useVenues("admin")
  const mutation = useEventMutation()
  const changelog = useEventChangelog(eventId)
  const [form, setForm] = useState<Form>(empty)
  const event = events.data?.find((item) => item.id === eventId)
  useEffect(() => {
    if (event)
      setForm({
        title: event.title,
        description: event.description,
        venue: event.venue.id,
        start: toLocalInput(event.start),
        end: toLocalInput(event.end),
        capacity: event.capacity,
        status: event.status,
        published: event.published,
      })
  }, [event])
  if (events.isPending && !event)
    return <div className="p-6">{t("common.loading")}</div>
  if (events.isError || !event)
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-700">
          {t("events.notFound")}
        </p>
        <Link className="mt-4 inline-block underline" to="/dashboard">
          {t("common.back")}
        </Link>
      </div>
    )
  const save = async (publish = form.published) => {
    try {
      await mutation.mutateAsync({
        id: event.id,
        input: {
          ...form,
          published: publish,
          start: new Date(form.start).toISOString(),
          end: new Date(form.end).toISOString(),
        },
      })
      navigate("/dashboard")
    } catch {
      /* mutation state renders the error */
    }
  }
  const selectedVenue = venues.data?.find((venue) => venue.id === form.venue)
  const publishBlocked = !selectedVenue?.active || !selectedVenue.checkoutRegion
  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          className="text-sm text-[var(--primary)] underline"
          to="/dashboard"
        >
          {t("common.back")}
        </Link>
        <Card className="mt-4 p-5 lg:p-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-700">
              {t("common.edit")}: {event.title}
            </h1>
            <span className="text-xs">
              {t(`events.status.${form.status}` as MessageKey)}
            </span>
          </div>
          {mutation.isError && (
            <p
              role="alert"
              className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {t("admin.events.publishVenueRequired")}
            </p>
          )}
          <form
            className="mt-6 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <label className="grid gap-1 text-sm">
              {t("admin.events.titleLabel")}
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-10 rounded border p-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("admin.events.description")}
              <textarea
                maxLength={10000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="min-h-24 rounded border p-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("admin.venues.title")}
              <select
                required
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="h-10 rounded border p-2"
              >
                {venues.data
                  ?.filter((venue) => venue.active)
                  .map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                {t("start")}
                <input
                  required
                  type="datetime-local"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className="h-10 rounded border p-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                {t("end")}
                <input
                  required
                  type="datetime-local"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className="h-10 rounded border p-2"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              {t("admin.events.capacity")}
              <input
                required
                min={1}
                max={100000}
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: Number(e.target.value) })
                }
                className="h-10 rounded border p-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("admin.events.status")}
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as EventStatus })
                }
                className="h-10 rounded border p-2"
              >
                {([
                  "MEMBERS_ONLY",
                  "OPEN_TO_ALL",
                  "CANCELLED",
                  "COMPLETED",
                ] as EventStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {t(`events.status.${status}` as MessageKey)}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="flex items-center gap-3 text-sm"
              title={
                publishBlocked
                  ? t("admin.events.publishVenueRequired")
                  : undefined
              }
            >
              <input
                type="checkbox"
                checked={form.published}
                disabled={!form.published && publishBlocked}
                onChange={(e) =>
                  setForm({ ...form, published: e.target.checked })
                }
              />
              {form.published
                ? t("admin.events.published")
                : t("admin.events.unpublished")}
            </label>
            {!form.published && publishBlocked && (
              <p className="text-xs text-amber-700">
                {t("admin.events.publishVenueRequired")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button disabled={mutation.isPending} type="submit">
                {mutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
              <Button
                disabled={mutation.isPending}
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                {t("common.back")}
              </Button>
            </div>
          </form>
          <AdminParticipants eventId={event.id} />
          {changelog.data?.items?.length ? (
            <section className="mt-8">
              <h2 className="text-sm font-700">
                {t("admin.events.changelog")}
              </h2>
              <div className="mt-3 grid gap-2">
                {changelog.data.items.map((entry) => (
                  <div key={entry.id} className="rounded border p-3 text-xs">
                    <div className="font-600">
                      {entry.action} · {entry.actorName} ({entry.actorRole})
                    </div>
                    <time dateTime={entry.created}>
                      {formatLocaleDateTime(entry.created, locale)}
                    </time>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

function AdminParticipants({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const participants = useParticipants(eventId)
  const members = useMembers({ search })
  const add = useAddParticipant()
  const remove = useRemoveParticipant()
  const registered = new Set(
    (participants.data?.items ?? []).map((item) => item.userId).filter(Boolean),
  )
  const candidates = (members.data?.items ?? [])
    .filter((member) => !registered.has(member.id))
    .filter((member) =>
      [member.displayName ?? member.username, member.vorname, member.nachname]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
    )
  return (
    <section className="mt-8 border-t border-[var(--border)] pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-700">{t("events.participantsTitle")}</h2>
        <span className="text-sm text-[var(--muted-foreground)]">
          {participants.data?.totalItems ?? 0}
        </span>
      </div>
      {participants.isPending && (
        <p className="mt-3 text-sm">{t("common.loading")}</p>
      )}
      {participants.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {t("events.participantsLoadError")}
        </p>
      )}
      {add.isError || remove.isError ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {t("events.participantsMutationError")}
        </p>
      ) : null}
      {participants.data?.items.map((participant) => (
        <div
          key={participant.registrationId ?? participant.userId}
          className="mt-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-2 text-sm"
        >
          <span>
            {participant.displayName} ({participant.firstName}{" "}
            {participant.lastName})
          </span>
          {participant.userId && (
            <Button
              size="sm"
              variant="outline"
              disabled={remove.isPending}
              onClick={() =>
                void remove
                  .mutateAsync({ eventId, userId: participant.userId! })
                  .catch(() => undefined)
              }
            >
              {t("events.removeParticipant")}
            </Button>
          )}
        </div>
      ))}
      {participants.isSuccess && participants.data.items.length === 0 && (
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {t("events.noParticipants")}
        </p>
      )}
      <div className="mt-5">
        <h3 className="text-sm font-700">{t("events.addParticipant")}</h3>
        <input
          className="mt-2 h-10 w-full rounded border p-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("events.participantSearch")}
        />
        {members.isPending && (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {t("common.loading")}
          </p>
        )}
        {members.isError && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {t("admin.members.loadError")}
          </p>
        )}
        <div className="mt-2 grid gap-2">
          {candidates.slice(0, 20).map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
            >
              <span>
                {member.displayName ?? member.username} · {member.vorname} {member.nachname} (
                {member.role})
              </span>
              <Button
                size="sm"
                disabled={add.isPending}
                onClick={() =>
                  void add
                    .mutateAsync({ eventId, userId: member.id })
                    .catch(() => undefined)
                }
              >
                {t("events.addParticipant")}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

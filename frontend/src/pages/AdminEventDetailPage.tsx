import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Button } from "../app/components/ui/button"
import { Card } from "../app/components/ui/card"
import { Input } from "../app/components/ui/input"
import { Select } from "../app/components/ui/select"
import { Textarea } from "../app/components/ui/textarea"
import { Checkbox } from "../app/components/ui/checkbox"
import {
  useAddParticipant,
  useAdminEvents,
  useEventChangelog,
  useEventMutation,
  useParticipants,
  useRemoveParticipant,
  useEventRealtime,
  useVenues,
  useCancelEvent,
  useDeleteEventDraft,
} from "../features/events/hooks/useEvents"
import { useMembers } from "../features/members/hooks/useMembers"
import type { EventStatus } from "../features/events/types"
import { berlinDateTimeInputToIso, formatBerlinDateTimeInput, formatLocaleDateTime, useI18n, type MessageKey } from "../i18n"
import { mapPBError } from "../lib/errorMapper"

type Form = {
  title: string
  description: string
  venue: string
  start: string
  end: string
  abmeldefrist: string
  capacity: number
  status: EventStatus
  published: boolean
}
const empty: Form = {
  title: "",
  description: "",
  venue: "",
  start: "",
  end: "",
  abmeldefrist: "",
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
  const cancelMutation = useCancelEvent()
  const deleteMutation = useDeleteEventDraft()
  const changelog = useEventChangelog(eventId)
  const [form, setForm] = useState<Form>(empty)
  const [formError, setFormError] = useState<string | null>(null)
  const event = events.data?.find((item) => item.id === eventId)
  useEffect(() => {
    if (event)
      setForm({
        title: event.title,
        description: event.description,
        venue: event.venue.id,
        start: formatBerlinDateTimeInput(event.start),
        end: formatBerlinDateTimeInput(event.end),
        abmeldefrist: formatBerlinDateTimeInput(event.abmeldefrist),
        capacity: event.capacity,
        status: event.status,
        published: event.published,
      })
  }, [event])
  if (events.isPending && !event)
    return <div className="px-4 py-6">{t("common.loading")}</div>
  if (events.isError || !event)
    return (
      <div className="px-4 py-6">
        <p role="alert" className="text-sm text-red-700">
          {t("events.notFound")}
        </p>
        <Link className="mt-4 inline-block underline" to="/dashboard">
          {t("common.back")}
        </Link>
      </div>
    )
  const save = async (publish = form.published) => {
    setFormError(null)
    try {
      await mutation.mutateAsync({
        id: event.id,
        input: {
          ...form,
          published: publish,
          start: berlinDateTimeInputToIso(form.start),
          end: berlinDateTimeInputToIso(form.end),
          abmeldefrist: berlinDateTimeInputToIso(form.abmeldefrist),
        },
      })
      navigate("/dashboard")
    } catch (error) {
      setFormError(error instanceof RangeError ? "errors.invalid_request" : mapPBError(error))
    }
  }
  const selectedVenue = venues.data?.find((venue) => venue.id === form.venue)
  const publishBlocked = !selectedVenue?.active || !selectedVenue.checkoutRegion
  const actionPending = mutation.isPending || cancelMutation.isPending || deleteMutation.isPending
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
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <h1 className="page-title min-w-0 break-words">
              {t("common.edit")}: {event.title}
            </h1>
            <span className="text-xs">
              {t(`events.status.${form.status}` as MessageKey)}
            </span>
          </div>
          {(mutation.isError || formError) && (
            <p
              role="alert"
              className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {t((formError ?? "errors.generic") as MessageKey)}
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
              <Input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-10"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("admin.events.description")}
              <Textarea
                maxLength={10000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="min-h-24"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("admin.venues.title")}
              <Select
                required
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="h-10"
              >
                {venues.data
                  ?.filter((venue) => venue.active)
                  .map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
              </Select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                {t("start")}
                <Input
                  required
                  type="datetime-local"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className="h-10"
                />
              </label>
              <label className="grid gap-1 text-sm">
                {t("end")}
                <Input
                  required
                  type="datetime-local"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className="h-10"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              {t("admin.events.cancellationDeadline")}
              <Input
                required
                type="datetime-local"
                value={form.abmeldefrist}
                max={form.start}
                onChange={(e) => setForm({ ...form, abmeldefrist: e.target.value })}
                className="h-10"
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                {t("admin.events.cancellationDeadlineHint")}
              </span>
            </label>
            <label className="grid gap-1 text-sm">
              {t("admin.events.capacity")}
              <Input
                required
                min={1}
                max={100000}
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: Number(e.target.value) })
                }
                className="h-10"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("admin.events.status")}
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as EventStatus })
                }
                className="h-10"
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
              </Select>
            </label>
            <label
              className="flex items-center gap-3 text-sm"
              title={
                publishBlocked
                  ? t("admin.events.publishVenueRequired")
                  : undefined
              }
            >
                <Checkbox
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
              <Button disabled={actionPending} type="submit">
                {mutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
              {event.published && event.status !== "CANCELLED" && <Button type="button" variant="destructive" disabled={actionPending} onClick={() => { if (window.confirm(t("admin.events.confirmCancel"))) void cancelMutation.mutateAsync(event.id).then(() => navigate("/admin/events")) }}>
                {t("admin.events.cancel")}
              </Button>}
              {event.canDelete === true && <Button type="button" variant="destructive" disabled={actionPending} onClick={() => { if (window.confirm(t("admin.events.confirmDelete"))) void deleteMutation.mutateAsync(event.id).then(() => navigate("/admin/events")) }}>
                {t("admin.events.delete")}
              </Button>}
              <Button
                disabled={actionPending}
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
              <h2 className="text-sm font-bold">
                {t("admin.events.changelog")}
              </h2>
              <div className="mt-3 grid gap-2">
                {changelog.data.items.map((entry) => (
                  <div key={entry.id} className="rounded border p-3 text-xs">
                    <div className="font-semibold">
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
        <h2 className="text-lg font-bold">{t("events.participantsTitle")}</h2>
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
        <h3 className="text-sm font-bold">{t("events.addParticipant")}</h3>
        <Input
          className="mt-2 h-10 w-full"
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

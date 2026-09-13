import { useEffect, useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Checkbox } from "./ui/checkbox"
import {
  useAdminEvents,
  useCancelEvent,
  useDeleteEventDraft,
  useEventMutation,
  useVenues,
  useVenueMutation,
  useEventRealtime,
} from "../../features/events/hooks/useEvents"
import type {
  EventRecord,
  EventStatus,
  Venue,
} from "../../features/events/types"
import { useI18n, type MessageKey } from "../../i18n"
import { mapPBError } from "../../lib/errorMapper"

const emptyEvent = {
  title: "",
  description: "",
  venue: "",
  start: "",
  end: "",
  capacity: 1,
  published: false,
  status: "MEMBERS_ONLY" as EventStatus,
}
const emptyVenue = { name: "", address: "", description: "", checkoutRegion: "" as "ER" | "NUE" | "" }

export default function AdminEventsView({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n()
  useEventRealtime()
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<"events" | "venues">(
    location.pathname.endsWith("/venues") ? "venues" : "events",
  )
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [venueFormOpen, setVenueFormOpen] = useState(false)
  const [eventForm, setEventForm] = useState(emptyEvent)
  const [venueForm, setVenueForm] = useState(emptyVenue)
  const events = useAdminEvents()
  const venues = useVenues("admin")
  const eventMutation = useEventMutation()
  const cancelOrDelete = useCancelEvent()
  const deleteDraft = useDeleteEventDraft()
  const [actionError, setActionError] = useState<string | null>(null)
  const venueMutation = useVenueMutation()
  useEffect(() => { if (location.pathname.endsWith("/new")) openEvent() }, [location.pathname])

  function openEvent(event?: EventRecord) {
    setEventFormOpen(true)
    setEditingEvent(event ?? null)
    setEventForm(
      event
        ? {
            title: event.title,
            description: event.description,
            venue: event.venue.id,
            start: event.start.slice(0, 16),
            end: event.end.slice(0, 16),
            capacity: event.capacity,
            published: event.published,
            status: event.status,
          }
        : emptyEvent,
    )
  }
  function openVenue(venue?: Venue) {
    setVenueFormOpen(true)
    setEditingVenue(venue ?? null)
    setVenueForm(
      venue
        ? {
            name: venue.name,
            address: venue.address,
            description: venue.description,
            checkoutRegion: venue.checkoutRegion,
          }
        : emptyVenue,
    )
  }
  async function saveEvent(options: { published?: boolean } = {}) {
    const published = options.published ?? (editingEvent ? eventForm.published : false)
    await eventMutation.mutateAsync({
      id: editingEvent?.id,
      input: {
        ...eventForm,
        published,
        start: new Date(eventForm.start).toISOString(),
        end: new Date(eventForm.end).toISOString(),
      },
    })
    setEventFormOpen(false)
    setEditingEvent(null)
  }
  async function saveVenue() {
    await venueMutation.mutateAsync({ id: editingVenue?.id, input: venueForm })
    setVenueFormOpen(false)
    setEditingVenue(null)
  }
  const failure = eventMutation.isError || venueMutation.isError || cancelOrDelete.isError || deleteDraft.isError

  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-700">{t("admin.title")}</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {tab === "events"
                ? t("admin.events.title")
                : t("admin.venues.title")}
            </p>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              {t("common.back")}
            </Button>
          )}
        </div>
        <div className="mt-5 flex gap-2 border-b border-[var(--border)]">
          <button
            className={`px-3 py-2 text-sm font-600 ${
              tab === "events"
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-[var(--muted-foreground)]"
            }`}
            onClick={() => setTab("events")}
          >
            {t("admin.events.title")}
          </button>
          <button
            className={`px-3 py-2 text-sm font-600 ${
              tab === "venues"
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-[var(--muted-foreground)]"
            }`}
            onClick={() => setTab("venues")}
          >
            {t("admin.venues.title")}
          </button>
        </div>
        {failure && (
          <p
            role="alert"
            className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {actionError ? t(actionError as MessageKey) : t("errors.generic")}
          </p>
        )}
        {tab === "venues" ? (
          <VenuePanel
            venues={venues.data ?? []}
            loading={venues.isPending}
            error={venues.isError}
            formOpen={venueFormOpen}
            form={venueForm}
            editing={editingVenue}
            saving={venueMutation.isPending}
            onCreate={() => openVenue()}
            onEdit={openVenue}
            onChange={setVenueForm}
            onSave={() => void saveVenue()}
            onClose={() => setVenueFormOpen(false)}
            onToggle={(id, active) =>
              void venueMutation.mutateAsync({ id, input: { active } })
            }
          />
        ) : (
          <EventPanel
            events={events.data ?? []}
            venues={venues.data ?? []}
            loading={events.isPending}
            error={events.isError}
            formOpen={eventFormOpen}
            form={eventForm}
            editing={editingEvent}
            saving={eventMutation.isPending || cancelOrDelete.isPending || deleteDraft.isPending}
            onCreate={() => navigate("/admin/events/new")}
            onEdit={(event) => navigate(`/admin/events/${encodeURIComponent(event.id)}`)}
            onChange={setEventForm}
            onSave={() => void saveEvent({ published: false })}
            onPublishForm={() => void saveEvent({ published: true })}
            onStatusChange={(event, status) => {
              if (status === "CANCELLED" && !window.confirm(t("admin.events.confirmCancel"))) return
              void eventMutation.mutateAsync({ id: event.id, input: { status } })
            }}
            onPublishedChange={(event, published) => {
              if (published && !window.confirm(t("admin.events.publish"))) return
              void eventMutation.mutateAsync({ id: event.id, input: { published } })
            }}
            onClose={() => setEventFormOpen(false)}
            onCancel={(id) => {
              if (window.confirm(t("admin.events.confirmCancel"))) {
                setActionError(null)
                void cancelOrDelete.mutateAsync(id).catch((error) => setActionError(mapPBError(error)))
              }
            }}
            onDelete={(id) => {
              if (window.confirm(t("admin.events.confirmDelete"))) {
                setActionError(null)
                void deleteDraft.mutateAsync(id).catch((error) => setActionError(mapPBError(error)))
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

function VenuePanel({
  venues,
  loading,
  error,
  formOpen,
  form,
  editing,
  saving,
  onCreate,
  onEdit,
  onChange,
  onSave,
  onClose,
  onToggle,
}: {
  venues: Venue[]
  loading: boolean
  error: boolean
  formOpen: boolean
  form: typeof emptyVenue
  editing: Venue | null
  saving: boolean
  onCreate: () => void
  onEdit: (v: Venue) => void
  onChange: (v: typeof emptyVenue) => void
  onSave: () => void
  onClose: () => void
  onToggle: (id: string, active: boolean) => void
}) {
  const { t } = useI18n()
  return (
    <section className="mt-5">
      <Button onClick={onCreate}>{t("admin.venues.create")}</Button>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {loading && <p>{t("common.loading")}</p>}
        {error && <p>{t("admin.venues.loadError")}</p>}
        {!loading && !error && venues.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("admin.venues.empty")}
          </p>
        )}
        {venues.map((venue) => (
          <Card key={venue.id} className="p-4">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="font-700">{venue.name}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {venue.address}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {t("admin.venues.checkoutRegion")}: {venue.checkoutRegion || t("admin.venues.checkoutRegionMissing")}
                </p>
              </div>
              <span className="text-xs">
                {venue.active
                  ? t("admin.venues.active")
                  : t("admin.venues.inactive")}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(venue)}>
                {t("admin.venues.edit")}
              </Button>
              {venue.active && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm(t("admin.venues.confirmDeactivate")))
                      onToggle(venue.id, false)
                  }}
                >
                  {t("admin.venues.deactivate")}
                </Button>
              )}
              {!venue.active && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggle(venue.id, true)}
                >
                  {t("admin.venues.active")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {formOpen && (
        <form
          className="mt-5 grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <h2 className="font-700">
            {editing ? t("admin.venues.edit") : t("admin.venues.create")}
          </h2>
          <label className="grid gap-1 text-sm">
            {t("admin.venues.name")}
            <Input
              required
              maxLength={160}
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              className="h-10"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("admin.venues.address")}
            <Input
              required
              maxLength={300}
              value={form.address}
              onChange={(e) => onChange({ ...form, address: e.target.value })}
              className="h-10"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("admin.venues.checkoutRegion")}
            <Select value={form.checkoutRegion} onChange={(e) => onChange({ ...form, checkoutRegion: e.target.value as typeof form.checkoutRegion })} className="h-10">
              <option value="">{t("common.selectPlaceholder")}</option><option value="ER">ER</option><option value="NUE">NUE</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm">
            {t("admin.venues.description")}
            <Textarea
              maxLength={2000}
              value={form.description}
              onChange={(e) =>
                onChange({ ...form, description: e.target.value })
              }
              className="min-h-20"
            />
          </label>
          <div className="flex gap-2">
            <Button disabled={saving} type="submit">
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

function EventPanel({
  events,
  venues,
  loading,
  error,
  formOpen,
  form,
  editing,
  saving,
  onCreate,
  onEdit,
  onChange,
  onSave,
  onPublishForm,
  onStatusChange,
  onPublishedChange,
  onClose,
  onCancel,
  onDelete,
}: {
  events: EventRecord[]
  venues: Venue[]
  loading: boolean
  error: boolean
  formOpen: boolean
  form: typeof emptyEvent
  editing: EventRecord | null
  saving: boolean
  onCreate: () => void
  onEdit: (e: EventRecord) => void
  onChange: (v: typeof emptyEvent) => void
  onSave: () => void
  onPublishForm: () => void
  onStatusChange: (event: EventRecord, status: EventStatus) => void
  onPublishedChange: (event: EventRecord, published: boolean) => void
  onClose: () => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useI18n()
  const [filter, setFilter] = useState<"ALL" | EventStatus>("ALL")
  const visibleEvents = filter === "ALL" ? events : events.filter((event) => event.status === filter)
  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Button onClick={onCreate}>{t("admin.events.create")}</Button>
        <label className="grid gap-1 text-sm">
          {t("admin.events.filter")}
          <Select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="h-10">
            <option value="ALL">{t("admin.events.filterAll")}</option>
            <option value="MEMBERS_ONLY">{t("admin.events.filterMembers")}</option>
            <option value="OPEN_TO_ALL">{t("admin.events.filterOpen")}</option>
            <option value="CANCELLED">{t("admin.events.filterCancelled")}</option>
            <option value="COMPLETED">{t("admin.events.filterCompleted")}</option>
          </Select>
        </label>
      </div>
      <div className="mt-4 grid gap-3">
        {loading && <p>{t("common.loading")}</p>}
        {error && <p>{t("admin.events.loadError")}</p>}
        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("admin.events.empty")}
          </p>
        )}
        {visibleEvents.map((event) => (
          <Card key={event.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-700">{event.title}</h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {event.venue.name} ·{" "}
                  {event.start.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              <span className="text-xs">
                {t(`events.status.${event.status}` as MessageKey)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select aria-label={t("admin.events.status")} value={event.status} disabled={saving} onChange={(e) => onStatusChange(event, e.target.value as EventStatus)} className="h-9 w-auto px-2 text-sm">
                {(["MEMBERS_ONLY", "OPEN_TO_ALL", "CANCELLED", "COMPLETED"] as EventStatus[]).map((status) => <option key={status} value={status}>{t(`events.status.${status}` as MessageKey)}</option>)}
              </Select>
              <label className="flex items-center gap-2 text-sm" title={!event.venue.active || !event.venue.checkoutRegion ? t("admin.events.publishVenueRequired") : undefined}><Checkbox checked={event.published} disabled={saving || (!event.published && (!event.venue.active || !event.venue.checkoutRegion))} onChange={(e) => onPublishedChange(event, e.target.checked)} />{event.published ? t("admin.events.published") : t("admin.events.unpublished")}</label>
              {!event.published && (!event.venue.active || !event.venue.checkoutRegion) && <span className="text-xs text-amber-700">{t("admin.events.publishVenueRequired")}</span>}
              <Button size="sm" variant="outline" onClick={() => onEdit(event)}>{t("common.edit")}</Button>
              {event.published && event.status !== "CANCELLED" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onCancel(event.id)}
                >
                  {t("admin.events.cancel")}
                </Button>
              )}
              {event.canDelete === true && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => onDelete(event.id)}
                >
                  {t("admin.events.delete")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {formOpen && (
        <form
          className="mt-5 grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <h2 className="font-700">
            {editing ? t("admin.events.title") : t("admin.events.create")}
          </h2>
          <label className="grid gap-1 text-sm">
            {t("admin.events.titleLabel")}
            <Input
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
              className="h-10"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("admin.events.description")}
            <Textarea
              maxLength={10000}
              value={form.description}
              onChange={(e) =>
                onChange({ ...form, description: e.target.value })
              }
              className="min-h-20"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("admin.venues.title")}
            <Select
              required
              value={form.venue}
              onChange={(e) => onChange({ ...form, venue: e.target.value })}
              className="h-10"
            >
              <option value="">{t("common.selectPlaceholder")}</option>
              {venues
                .filter((v) => v.active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}{v.checkoutRegion ? ` (${v.checkoutRegion})` : ` - ${t("admin.venues.checkoutRegionMissing")}`}
                  </option>
                ))}
            </Select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              {t("start")}
              <Input
                required
                type="datetime-local"
                value={form.start}
                onChange={(e) => onChange({ ...form, start: e.target.value })}
                className="h-10"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("end")}
              <Input
                required
                type="datetime-local"
                value={form.end}
                onChange={(e) => onChange({ ...form, end: e.target.value })}
                className="h-10"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            {t("admin.events.capacity")}
            <Input
              required
              min={1}
              max={100000}
              type="number"
              value={form.capacity}
              onChange={(e) =>
                onChange({ ...form, capacity: Number(e.target.value) })
              }
              className="h-10"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                onChange({ ...form, published: e.target.checked })
              }
            />
            {t("admin.events.published")}
          </label>
          <div className="flex gap-2">
            <Button disabled={saving} type="submit">
              {saving ? t("common.saving") : t("admin.events.saveDraft")}
            </Button>
            <Button disabled={saving} type="button" onClick={onPublishForm}>
              {t("admin.events.publish")}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

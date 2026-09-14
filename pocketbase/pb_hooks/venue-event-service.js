const MAX_TITLE = 200;
const MAX_DESCRIPTION = 10000;
const MAX_ADDRESS = 300;

function requireAuthenticatedReader(e) {
  const record = e.auth;
  return record && record.getBool("active") === true && record.getBool("verified") === true ? record : null;
}

function requireAdminActor(e) {
  const record = requireAuthenticatedReader(e);
  if (!record) return null;
  const role = record.getString("role");
  return ["ADMIN", "SUPER_ADMIN"].includes(role) ? record : null;
}

function actor(e) {
  return requireAdminActor(e);
}

function user(e) {
  return requireAuthenticatedReader(e);
}

function payload(e, allowed) {
  const value = e.requestInfo().body;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestError("Ungültige Daten");
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.includes(key))) throw new BadRequestError("Unbekanntes Feld");
  return value;
}

function text(value, max, required = true) {
  if (typeof value !== "string") throw new BadRequestError("Ungültiger Text");
  const normalized = value.trim().replace(/[ \t\r\n]+/g, " ");
  if (required && !normalized) throw new BadRequestError("Pflichtfeld fehlt");
  if (normalized.length > max) throw new BadRequestError("Text ist zu lang");
  return normalized;
}

function boolean(value, fallback) { return value === undefined ? fallback : typeof value === "boolean" ? value : (() => { throw new BadRequestError("Ungültiger Boolean-Wert"); })(); }

function date(value) {
  if (typeof value !== "string" || !value || Number.isNaN(Date.parse(value))) throw new BadRequestError("Ungültiger Zeitpunkt");
  return new Date(value).toISOString();
}

function capacity(value) {
  if (!Number.isInteger(value) || value < 1 || value > 100000) throw new BadRequestError("Ungültige Kapazität");
  return value;
}

function status(value) {
  if (!["MEMBERS_ONLY", "OPEN_TO_ALL", "CANCELLED", "COMPLETED"].includes(value)) throw new BadRequestError("Ungültiger Status");
  return value;
}

function venue(app, id) { try { return app.findRecordById("venues", id); } catch (_) { throw new ApiError(404, "Veranstaltungsort nicht gefunden", {}); } }
function event(app, id) { try { return app.findRecordById("events", id); } catch (_) { throw new ApiError(404, "Event nicht gefunden", {}); } }
function validateEventId(id) { if (typeof id !== "string" || !/^[a-z0-9]{15}$/.test(id)) throw new BadRequestError("Ungültige Event-ID"); return id; }
function userRecord(app, id) {
  if (typeof id !== "string" || !/^[a-z0-9]{15}$/.test(id)) throw new BadRequestError("Ungültige Benutzer-ID");
  try { return app.findRecordById("users", id); } catch (_) { throw new ApiError(404, "Benutzer nicht gefunden", {}); }
}
function venueDto(record) { return { id: record.id, name: record.getString("name"), address: record.getString("address"), description: record.getString("description"), checkoutRegion: record.getString("checkoutRegion"), active: record.getBool("active"), created: record.getString("created"), updated: record.getString("updated") }; }
function registrationCount(app, eventId) {
  return app.findRecordsByFilter("event_registrations", `event = '${eventId}' && status = 'REGISTERED'`, "", 100000, 0).length;
}
function roleCanRegister(role, status) {
  return status === "OPEN_TO_ALL" ? ["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"].includes(role) : status === "MEMBERS_ONLY" ? ["MEMBER", "ADMIN", "SUPER_ADMIN"].includes(role) : false;
}
function eventDto(app, record) {
  const v = venue(app, record.getString("venue"));
  const registeredCount = registrationCount(app, record.id);
  const spotsLeft = Math.max(0, record.getInt("capacity") - registeredCount);
  return { id: record.id, title: record.getString("title"), description: record.getString("description"), venue: venueDto(v), start: record.getString("start"), end: record.getString("end"), abmeldefrist: record.getString("abmeldefrist"), capacity: record.getInt("capacity"), registeredCount, spotsLeft, status: record.getString("status"), published: record.getBool("published"), firstPublishedAt: record.getString("firstPublishedAt") || null, canDelete: canDeleteEvent(app, record), createdBy: record.getString("createdBy"), created: record.getString("created"), updated: record.getString("updated") };
}
function canDeleteEvent(app, record) {
  return Boolean(record && record.id);
}
function purgeEventDependencies(app, eventId) {
  const registrations = app.findRecordsByFilter("event_registrations", `event = '${eventId}'`, "", 100000, 0);
  registrations.forEach((registration) => {
    app.findRecordsByFilter("notification_outbox", `registration = '${registration.id}'`, "", 100000, 0).forEach((entry) => app.delete(entry));
    app.delete(registration);
  });
  app.findRecordsByFilter("event_changelog", `event = '${eventId}'`, "", 100000, 0).forEach((entry) => app.delete(entry));
  try {
    app.findAllRecords("audit_events").forEach((entry) => {
      const raw = entry.get("metadata");
      let metadata = raw;
      if (typeof raw === "string") { try { metadata = JSON.parse(raw); } catch (_) {} }
      if (metadata && metadata.eventId === eventId) app.delete(entry);
    });
  } catch (_) {}
}
function eventDtoForUser(app, record, userRecord) {
  const dto = eventDto(app, record);
  const mine = app.findRecordsByFilter("event_registrations", `event = '${record.id}' && user = '${userRecord.id}'`, "", 1, 0)[0];
  dto.myRegistrationStatus = mine ? mine.getString("status") : null;
  const now = Date.now();
  dto.canRegister = dto.published === true && roleCanRegister(userRecord.getString("role"), dto.status) && dto.venue.active === true && Boolean(dto.venue.checkoutRegion) && Date.parse(dto.end) > now && dto.myRegistrationStatus !== "REGISTERED" && dto.myRegistrationStatus !== "WAITING";
  dto.canCancel = ["REGISTERED", "WAITING"].includes(dto.myRegistrationStatus) && Date.parse(dto.abmeldefrist) > now;
  return dto;
}
function idOf(e) {
  const pathValue = e.request && typeof e.request.pathValue === "function" ? e.request.pathValue("id") : "";
  if (pathValue) return pathValue;
  const path = String(e.request && e.request.url && e.request.url.path || "");
  const parts = path.split("/").filter(Boolean);
  const eventIndex = parts.indexOf("events");
  return eventIndex >= 0 && parts[eventIndex + 1] ? parts[eventIndex + 1] : parts.at(-1) || "";
}
function listVenues(app, admin) {
  const records = app.findRecordsByFilter("venues", admin ? "id != ''" : "active = true", "", 100, 0);
  return { items: records.map(venueDto), totalItems: records.length };
}
function listPublishedEvents(app) {
  const pageSize = 200;
  const records = [];
  let offset = 0;
  while (true) {
    const batch = app.findRecordsByFilter("events", "published = true", "", pageSize, offset);
    records.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  records.sort((a, b) => {
    const startDelta = Date.parse(a.getString("start")) - Date.parse(b.getString("start"));
    if (startDelta) return startDelta;
    const createdDelta = Date.parse(a.getString("created")) - Date.parse(b.getString("created"));
    if (createdDelta) return createdDelta;
    return String(a.id).localeCompare(String(b.id));
  });
  return records;
}
function publicEvents(app, e, detailId) {
  if (!requireAuthenticatedReader(e)) return { forbidden: true };
  if (detailId) {
    const record = event(app, detailId);
    if (!record.getBool("published")) throw new ApiError(404, "Event nicht gefunden", {});
    return eventDtoForUser(app, record, e.auth);
  }
  const records = listPublishedEvents(app);
  return { items: records.map((record) => eventDtoForUser(app, record, e.auth)), totalItems: records.length };
}
function parseVenue(value, existing) {
  const name = value.name !== undefined ? value.name : existing ? existing.getString("name") : "";
  const address = value.address !== undefined ? value.address : existing ? existing.getString("address") : "";
  const description = value.description !== undefined ? value.description : existing ? existing.getString("description") : "";
  const checkoutRegion = value.checkoutRegion !== undefined ? value.checkoutRegion : existing ? existing.getString("checkoutRegion") : "";
  if (checkoutRegion !== "" && !["ER", "NUE"].includes(checkoutRegion)) throw new BadRequestError("Ungültige Checkout-Region");
  return { name: text(name, MAX_TITLE), address: text(address, MAX_ADDRESS), description: text(description, MAX_DESCRIPTION, false), checkoutRegion, active: boolean(value.active, existing ? existing.getBool("active") : true) };
}
function parseEvent(value, existing) {
  const start = date(value.start !== undefined ? value.start : existing ? existing.getString("start") : "");
  const end = date(value.end !== undefined ? value.end : existing ? existing.getString("end") : "");
  if (Date.parse(start) >= Date.parse(end)) throw new BadRequestError("Beginn muss vor dem Ende liegen");
  const cancellationDeadline = date(value.abmeldefrist !== undefined ? value.abmeldefrist : existing ? existing.getString("abmeldefrist") : "");
  if (Date.parse(cancellationDeadline) > Date.parse(start)) throw new BadRequestError("Abmeldefrist darf nicht nach dem Beginn liegen");
  const title = value.title !== undefined ? value.title : existing ? existing.getString("title") : "";
  const description = value.description !== undefined ? value.description : existing ? existing.getString("description") : "";
  const venueId = value.venue !== undefined ? value.venue : existing ? existing.getString("venue") : "";
  const cap = value.capacity !== undefined ? value.capacity : existing ? existing.getInt("capacity") : 0;
  const eventStatus = value.status !== undefined ? value.status : existing ? existing.getString("status") : "MEMBERS_ONLY";
  return { title: text(title, MAX_TITLE), description: text(description, MAX_DESCRIPTION, false), venue: String(venueId), start, end, abmeldefrist: cancellationDeadline, capacity: capacity(cap), published: boolean(value.published, existing ? existing.getBool("published") : false), status: status(eventStatus) };
}
function nowIso() { return new Date().toISOString(); }
function correlationId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`; }
function appendChangelog(app, eventRecord, actorRecord, changes, action) {
  if (!Object.keys(changes).length) return;
  const record = new Record(app.findCollectionByNameOrId("event_changelog"));
  record.set("event", eventRecord.id); record.set("action", action || "UPDATED"); record.set("actor", actorRecord.id);
  record.set("actorName", actorRecord.getString("displayName")); record.set("actorRole", actorRecord.getString("role"));
  record.set("changes", changes); record.set("correlationId", correlationId()); app.save(record);
}
module.exports = { requireAuthenticatedReader, requireAdminActor, actor, user, userRecord, payload, venue, event, validateEventId, venueDto, eventDto, eventDtoForUser, canDeleteEvent, purgeEventDependencies, idOf, listVenues, listPublishedEvents, publicEvents, parseVenue, parseEvent, registrationCount, roleCanRegister, nowIso, appendChangelog };

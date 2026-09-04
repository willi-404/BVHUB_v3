const MAX_TITLE = 200;
const MAX_DESCRIPTION = 10000;
const MAX_ADDRESS = 300;

function actor(e) {
  const record = e.auth;
  if (!record || record.getBool("active") !== true || record.getBool("verified") !== true) throw new ApiError(403, "Zugriff nicht erlaubt", {});
  const role = record.getString("role");
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) throw new ApiError(403, "Zugriff nicht erlaubt", {});
  return record;
}

function user(e) {
  const record = e.auth;
  if (!record || record.getBool("active") !== true || record.getBool("verified") !== true) throw new ApiError(403, "Zugriff nicht erlaubt", {});
  return record;
}
function canRead(e) {
  const record = e.auth;
  return Boolean(record && record.getBool("active") === true && record.getBool("verified") === true);
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
  if (!["DRAFT", "PUBLISHED", "CANCELLED"].includes(value)) throw new BadRequestError("Ungültiger Status");
  return value;
}

function venue(app, id) { try { return app.findRecordById("venues", id); } catch (_) { throw new ApiError(404, "Veranstaltungsort nicht gefunden", {}); } }
function event(app, id) { try { return app.findRecordById("events", id); } catch (_) { throw new ApiError(404, "Event nicht gefunden", {}); } }
function venueDto(record) { return { id: record.id, name: record.getString("name"), address: record.getString("address"), description: record.getString("description"), active: record.getBool("active"), created: record.getString("created"), updated: record.getString("updated") }; }
function eventDto(app, record) {
  const v = venue(app, record.getString("venue"));
  return { id: record.id, title: record.getString("title"), description: record.getString("description"), venue: venueDto(v), start: record.getString("start"), end: record.getString("end"), capacity: record.getInt("capacity"), registrationOpen: record.getBool("registrationOpen"), status: record.getString("status"), createdBy: record.getString("createdBy"), created: record.getString("created"), updated: record.getString("updated") };
}
function parseVenue(value, existing) {
  const name = value.name !== undefined ? value.name : existing ? existing.getString("name") : "";
  const address = value.address !== undefined ? value.address : existing ? existing.getString("address") : "";
  const description = value.description !== undefined ? value.description : existing ? existing.getString("description") : "";
  return { name: text(name, MAX_TITLE), address: text(address, MAX_ADDRESS), description: text(description, MAX_DESCRIPTION, false), active: boolean(value.active, existing ? existing.getBool("active") : true) };
}
function parseEvent(value, existing) {
  const start = date(value.start !== undefined ? value.start : existing ? existing.getString("start") : "");
  const end = date(value.end !== undefined ? value.end : existing ? existing.getString("end") : "");
  if (Date.parse(start) >= Date.parse(end)) throw new BadRequestError("Beginn muss vor dem Ende liegen");
  const title = value.title !== undefined ? value.title : existing ? existing.getString("title") : "";
  const description = value.description !== undefined ? value.description : existing ? existing.getString("description") : "";
  const venueId = value.venue !== undefined ? value.venue : existing ? existing.getString("venue") : "";
  const cap = value.capacity !== undefined ? value.capacity : existing ? existing.getInt("capacity") : 0;
  const eventStatus = value.status !== undefined ? value.status : existing ? existing.getString("status") : "DRAFT";
  return { title: text(title, MAX_TITLE), description: text(description, MAX_DESCRIPTION, false), venue: String(venueId), start, end, capacity: capacity(cap), registrationOpen: boolean(value.registrationOpen, existing ? existing.getBool("registrationOpen") : false), status: status(eventStatus) };
}
module.exports = { actor, user, canRead, payload, venue, event, venueDto, eventDto, parseVenue, parseEvent };

function registrationFor(app, event, user) {
  return app.findRecordsByFilter("event_registrations", `event = '${event.id}' && user = '${user.id}'`, "", 1, 0)[0] || null;
}

function registrationDto(record) {
  return { id: record.id, event: record.getString("event"), user: record.getString("user"), status: record.getString("status"), registeredAt: record.getString("registeredAt"), waitingAt: record.getString("waitingAt"), cancelledAt: record.getString("cancelledAt"), checkoutRegion: record.getString("checkoutRegion"), termsVersion: record.getString("termsVersion"), termsAcceptedAt: record.getString("termsAcceptedAt"), created: record.getString("created"), updated: record.getString("updated") };
}

function registrationPayload(e) {
  const value = e.requestInfo().body;
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !["checkoutRegion", "termsVersion"].includes(key))) throw new BadRequestError("Ungültige Registrierungsdaten");
  if (!["ER", "NUE"].includes(value.checkoutRegion) || typeof value.termsVersion !== "string" || !value.termsVersion.trim()) throw new BadRequestError("Checkout-Zustimmung erforderlich");
  return { checkoutRegion: value.checkoutRegion, termsVersion: value.termsVersion.trim().slice(0, 80) };
}

function queueNotification(app, registration, user, event, venue, kind, now, extra) {
  const stateAt = now || new Date().toISOString();
  const dedupeKey = `${registration.id}:${kind}:${stateAt}`;
  const existing = app.findRecordsByFilter("notification_outbox", `dedupeKey = '${dedupeKey}'`, "", 1, 0)[0];
  if (existing) return existing;
  const record = new Record(app.findCollectionByNameOrId("notification_outbox"));
  record.set("kind", kind); record.set("registration", registration.id); record.set("recipient", user.getString("email"));
  record.set("payload", { eventTitle: event.getString("title"), venue: venue.getString("name"), address: venue.getString("address"), start: event.getString("start"), end: event.getString("end"), displayName: user.getString("displayName") || user.getString("firstName"), locale: "de", ...(extra || {}) });
  record.set("status", "PENDING"); record.set("attempts", 1); record.set("dedupeKey", dedupeKey); record.set("nextAttemptAt", stateAt); record.set("lastError", ""); record.set("processingStartedAt", "");
  app.save(record);
  return record;
}

function setStatus(record, status, now, waiting) {
  record.set("status", status);
  if (status === "REGISTERED") { record.set("registeredAt", now); record.set("waitingAt", ""); record.set("cancelledAt", ""); }
  else if (status === "WAITING") { record.set("waitingAt", waiting || now); record.set("registeredAt", ""); record.set("cancelledAt", ""); }
  else record.set("cancelledAt", now);
}

function promoteNextWaiting(app, event, now) {
  const waiting = app.findRecordsByFilter("event_registrations", `event = '${event.id}' && status = 'WAITING'`, "waitingAt,created,id", 1, 0)[0] || null;
  if (!waiting) return null;
  const user = app.findRecordById("users", waiting.getString("user"));
  const venue = app.findRecordById("venues", event.getString("venue"));
  setStatus(waiting, "REGISTERED", now); app.save(waiting);
  queueNotification(app, waiting, user, event, venue, "EVENT_WAITING_LIST_PROMOTED", now, {});
  return waiting;
}

function cancelRegistration(app, event, user, record, now) {
  const previous = record ? record.getString("status") : null;
  if (!record || !["REGISTERED", "WAITING"].includes(previous)) return { record, previous, promoted: null };
  record.set("status", "CANCELLED"); record.set("cancelledAt", now); app.save(record);
  const venue = app.findRecordById("venues", event.getString("venue"));
  queueNotification(app, record, user, event, venue, previous === "WAITING" ? "EVENT_WAITING_LIST_LEFT" : "EVENT_REGISTRATION_CANCELLED", now, {});
  const promoted = previous === "REGISTERED" ? promoteNextWaiting(app, event, now) : null;
  return { record, previous, promoted };
}

module.exports = { registrationFor, registrationDto, registrationPayload, queueNotification, setStatus, promoteNextWaiting, cancelRegistration };

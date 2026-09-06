/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/bvhub/events/{id}/registration", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  const registrations = require(`${__hooks}/event-registration-service.js`);
  const user = api.requireAuthenticatedReader(e);
  if (!user) throw new ForbiddenError("Zugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const mine = registrations.registrationFor($app, event, user);
  return e.json(200, mine ? registrations.registrationDto(mine) : { status: null });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/bvhub/events/{id}/registrations", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  const registrations = require(`${__hooks}/event-registration-service.js`);
  const user = api.requireAuthenticatedReader(e);
  if (!user) throw new ForbiddenError("Zugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const venue = api.venue($app, event.getString("venue"));
  const body = registrations.registrationPayload(e);
  if (!event.getBool("published") || !api.roleCanRegister(user.getString("role"), event.getString("status")) || ["CANCELLED", "COMPLETED"].includes(event.getString("status")) || Date.parse(event.getString("end")) <= Date.now() || !venue.getBool("active") || !venue.getString("checkoutRegion") || venue.getString("checkoutRegion") !== body.checkoutRegion) return e.json(409, { message: "Event ist nicht registrierbar" });
  let result;
  $app.runInTransaction((txApp) => {
    const current = registrations.registrationFor(txApp, event, user);
    if (current && current.getString("status") === "REGISTERED") { result = current; return; }
    const count = api.registrationCount(txApp, event.id);
    if (count >= event.getInt("capacity")) throw new ApiError(409, "Event ist ausgebucht", {});
    const record = current || new Record(txApp.findCollectionByNameOrId("event_registrations"));
    record.set("event", event.id); record.set("user", user.id); record.set("status", "REGISTERED"); record.set("registeredAt", api.nowIso()); record.set("cancelledAt", ""); record.set("checkoutRegion", body.checkoutRegion); record.set("termsVersion", body.termsVersion); record.set("termsAcceptedAt", api.nowIso());
    txApp.save(record); result = record;
    if (!current) { const outbox = new Record(txApp.findCollectionByNameOrId("notification_outbox")); outbox.set("kind", "EVENT_REGISTRATION_CONFIRMED"); outbox.set("registration", record.id); outbox.set("recipient", user.getString("email")); outbox.set("payload", JSON.stringify({ eventTitle: event.getString("title"), venue: venue.getString("name"), start: event.getString("start"), end: event.getString("end"), locale: "en" })); outbox.set("status", "PENDING"); outbox.set("attempts", 1); txApp.save(outbox); }
  });
  return e.json(201, registrations.registrationDto(result));
}, $apis.requireAuth("users"));

routerAdd("DELETE", "/api/bvhub/events/{id}/registrations/me", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  const registrations = require(`${__hooks}/event-registration-service.js`);
  const user = api.requireAuthenticatedReader(e);
  if (!user) throw new ForbiddenError("Zugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const record = registrations.registrationFor($app, event, user);
  if (!record || record.getString("status") !== "REGISTERED") return e.json(200, { status: "CANCELLED" });
  record.set("status", "CANCELLED"); record.set("cancelledAt", api.nowIso()); $app.save(record);
  return e.json(200, registrations.registrationDto(record));
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/events/{id}/participants", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  const user = api.requireAuthenticatedReader(e);
  if (!user) throw new ForbiddenError("Zugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.getString("role"));
  if (!isAdmin && !event.getBool("published")) throw new ApiError(404, "Event nicht gefunden", {});
  const records = $app.findRecordsByFilter("event_registrations", `event = '${event.id}' && status = 'REGISTERED'`, "registeredAt", 10000, 0);
  const items = records.map((registration) => {
    const target = api.userRecord($app, registration.getString("user"));
    if (!isAdmin) return { displayName: target.getString("displayName") };
    return { registrationId: registration.id, userId: target.id, displayName: target.getString("displayName"), firstName: target.getString("firstName"), lastName: target.getString("lastName"), registeredAt: registration.getString("registeredAt") };
  });
  e.response.header().set("Cache-Control", "no-store");
  e.response.header().set("Pragma", "no-cache");
  return e.json(200, { items, totalItems: items.length });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/bvhub/admin/events/{id}/participants", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  const admin = api.requireAdminActor(e);
  if (!admin) throw new ForbiddenError("Zugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const body = api.payload(e, ["userId"]);
  if (Object.keys(body).length !== 1 || typeof body.userId !== "string") throw new BadRequestError("Ungültiger Teilnehmer");
  const target = api.userRecord($app, body.userId);
  if (!target.getBool("active") || !target.getBool("verified")) throw new ForbiddenError("Benutzer nicht aktiv");
  if (!event.getBool("published") || ["CANCELLED", "COMPLETED"].includes(event.getString("status")) || Date.parse(event.getString("end")) <= Date.now()) throw new ApiError(409, "Event ist nicht registrierbar", {});
  const venue = api.venue($app, event.getString("venue"));
  if (!venue.getBool("active") || !venue.getString("checkoutRegion") || !api.roleCanRegister(target.getString("role"), event.getString("status"))) throw new ApiError(409, "Event ist nicht registrierbar", {});
  let result;
  $app.runInTransaction((txApp) => {
    const txEvent = api.event(txApp, event.id);
    const current = txApp.findRecordsByFilter("event_registrations", `event = '${txEvent.id}' && user = '${target.id}'`, "", 1, 0)[0] || null;
    if (current && current.getString("status") === "REGISTERED") { result = current; return; }
    if (api.registrationCount(txApp, txEvent.id) >= txEvent.getInt("capacity")) throw new ApiError(409, "Event ist ausgebucht", {});
    const registration = current || new Record(txApp.findCollectionByNameOrId("event_registrations"));
    registration.set("event", txEvent.id); registration.set("user", target.id); registration.set("status", "REGISTERED"); registration.set("registeredAt", api.nowIso()); registration.set("cancelledAt", ""); registration.set("checkoutRegion", venue.getString("checkoutRegion")); registration.set("termsVersion", "ADMIN-MANUAL"); registration.set("termsAcceptedAt", api.nowIso());
    txApp.save(registration); result = registration;
    const audit = new Record(txApp.findCollectionByNameOrId("audit_events")); audit.set("eventType", "PARTICIPANT_ADDED"); audit.set("actorUser", admin.id); audit.set("targetUser", target.id); audit.set("metadata", JSON.stringify({ eventId: txEvent.id })); txApp.save(audit);
  });
  return e.json(201, { registrationId: result.id, userId: target.id, status: result.getString("status") });
}, $apis.requireAuth("users"));

routerAdd("DELETE", "/api/bvhub/admin/events/{id}/participants/{userId}", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  const admin = api.requireAdminActor(e);
  if (!admin) throw new ForbiddenError("Verwaltungszugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const path = String(e.request && e.request.url && e.request.url.path || "");
  const userId = path.split("/").filter(Boolean).at(-1) || "";
  const target = api.userRecord($app, userId);
  let result = null;
  $app.runInTransaction((txApp) => {
    const current = txApp.findRecordsByFilter("event_registrations", `event = '${event.id}' && user = '${target.id}'`, "", 1, 0)[0] || null;
    if (!current || current.getString("status") !== "REGISTERED") { result = current; return; }
    current.set("status", "CANCELLED"); current.set("cancelledAt", api.nowIso()); txApp.save(current); result = current;
    const audit = new Record(txApp.findCollectionByNameOrId("audit_events")); audit.set("eventType", "PARTICIPANT_REMOVED"); audit.set("actorUser", admin.id); audit.set("targetUser", target.id); audit.set("metadata", JSON.stringify({ eventId: event.id })); txApp.save(audit);
  });
  return e.json(200, { status: result ? result.getString("status") : "CANCELLED" });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/events/{id}/changelog", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  if (!api.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
  const items = $app.findRecordsByFilter("event_changelog", `event = '${api.idOf(e)}'`, "-created", 100, 0).map((record) => ({ id: record.id, action: record.getString("action"), actorName: record.getString("actorName"), actorRole: record.getString("actorRole"), changes: record.get("changes"), correlationId: record.getString("correlationId"), created: record.getString("created") }));
  return e.json(200, { items, totalItems: items.length });
}, $apis.requireAuth("users"));

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
  if (!event.getBool("published") || !api.roleCanRegister(user.getString("role"), event.getString("status")) || ["CANCELLED", "COMPLETED"].includes(event.getString("status")) || Date.parse(event.getString("end")) <= Date.now() || !venue.getString("checkoutRegion") || venue.getString("checkoutRegion") !== body.checkoutRegion) return e.json(409, { message: "Event ist nicht registrierbar" });
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

routerAdd("GET", "/api/bvhub/admin/events/{id}/changelog", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  if (!api.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
  const items = $app.findRecordsByFilter("event_changelog", `event = '${api.idOf(e)}'`, "-created", 100, 0).map((record) => ({ id: record.id, action: record.getString("action"), actorName: record.getString("actorName"), actorRole: record.getString("actorRole"), changes: record.get("changes"), correlationId: record.getString("correlationId"), created: record.getString("created") }));
  return e.json(200, { items, totalItems: items.length });
}, $apis.requireAuth("users"));

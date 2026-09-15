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
  const payments = require(`${__hooks}/payment-service.js`);
  const user = api.requireAuthenticatedReader(e);
  if (!user) throw new ForbiddenError("Zugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const venue = api.venue($app, event.getString("venue"));
  const body = registrations.registrationPayload(e);
  if (!event.getBool("published") || !api.roleCanRegister(user.getString("role"), event.getString("status")) || ["CANCELLED", "COMPLETED"].includes(event.getString("status")) || Date.parse(event.getString("end")) <= Date.now() || !venue.getBool("active") || !venue.getString("checkoutRegion") || venue.getString("checkoutRegion") !== body.checkoutRegion) return e.json(409, { message: "Event ist nicht registrierbar" });
  let result;
  const notificationIds = [];
  $app.runInTransaction((txApp) => {
    const txEvent = api.event(txApp, event.id);
    const txUser = api.userRecord(txApp, user.id);
    const txVenue = api.venue(txApp, txEvent.getString("venue"));
    const current = registrations.registrationFor(txApp, txEvent, txUser);
    if (current && ["REGISTERED", "WAITING"].includes(current.getString("status"))) {
      if (current.getString("status") === "REGISTERED") payments.ensurePaymentForRegistration(txApp, current, txUser, txEvent);
      result = current;
      return;
    }
    const previousStatus = current ? current.getString("status") : null;
    const count = api.registrationCount(txApp, txEvent.id);
    const now = api.nowIso();
    const record = current || new Record(txApp.findCollectionByNameOrId("event_registrations"));
    const status = count >= txEvent.getInt("capacity") ? "WAITING" : "REGISTERED";
    record.set("event", txEvent.id); record.set("user", txUser.id); record.set("checkoutRegion", body.checkoutRegion); record.set("termsVersion", body.termsVersion); record.set("termsAcceptedAt", now);
    registrations.setStatus(record, status, now);
    txApp.save(record); result = record;
    if (status === "REGISTERED") payments.ensurePaymentForRegistration(txApp, record, txUser, txEvent);
    if (!current || previousStatus === "CANCELLED") registrations.queueNotification(txApp, record, txUser, txEvent, txVenue, status === "WAITING" ? "EVENT_WAITING_LIST_JOINED" : "EVENT_REGISTRATION_CONFIRMED", now, {}, notificationIds);
  });
  registrations.deliverNotifications($app, notificationIds);
  return e.json(201, registrations.registrationDto(result));
}, $apis.requireAuth("users"));

routerAdd("DELETE", "/api/bvhub/events/{id}/registrations/me", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  const registrations = require(`${__hooks}/event-registration-service.js`);
  const user = api.requireAuthenticatedReader(e);
  if (!user) throw new ForbiddenError("Zugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const existingRegistration = registrations.registrationFor($app, event, user);
  if (existingRegistration && ["REGISTERED", "WAITING"].includes(existingRegistration.getString("status")) && Date.parse(event.getString("abmeldefrist")) <= Date.now()) {
    return e.json(409, {
      code: 409,
      message: "Abmeldefrist ist abgelaufen",
      data: { code: "CANCELLATION_DEADLINE_PASSED" },
    });
  }
  let result;
  const notificationIds = [];
  $app.runInTransaction((txApp) => {
    const txEvent = api.event(txApp, event.id);
    const txUser = api.userRecord(txApp, user.id);
    const record = registrations.registrationFor(txApp, txEvent, txUser);
    const now = api.nowIso();
    result = registrations.cancelRegistration(txApp, txEvent, txUser, record, now, notificationIds).record;
  });
  registrations.deliverNotifications($app, notificationIds);
  return e.json(200, result ? registrations.registrationDto(result) : { status: "CANCELLED" });
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
  const registrations = require(`${__hooks}/event-registration-service.js`);
  const payments = require(`${__hooks}/payment-service.js`);
  const admin = api.requireAdminActor(e);
  if (!admin) throw new ForbiddenError("Zugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const body = api.payload(e, ["userId"]);
  if (Object.keys(body).length !== 1 || typeof body.userId !== "string") throw new BadRequestError("Ungültiger Teilnehmer");
  const target = api.userRecord($app, body.userId);
  if (!target.getBool("active") || !target.getBool("verified")) throw new ForbiddenError("Benutzer nicht aktiv");
  // Admin participant management is an explicit override of the public
  // registration gates (publication state, audience, and target role). It
  // still cannot mutate terminal or already-ended events.
  if (["CANCELLED", "COMPLETED"].includes(event.getString("status")) || Date.parse(event.getString("end")) <= Date.now()) throw new ApiError(409, "Event ist nicht registrierbar", {});
  const venue = api.venue($app, event.getString("venue"));
  if (!venue.getBool("active") || !venue.getString("checkoutRegion")) throw new ApiError(409, "Veranstaltungsort ist nicht konfiguriert", {});
  let result;
  const notificationIds = [];
  $app.runInTransaction((txApp) => {
    const txEvent = api.event(txApp, event.id);
    const txTarget = api.userRecord(txApp, target.id);
    const txVenue = api.venue(txApp, txEvent.getString("venue"));
    const current = txApp.findRecordsByFilter("event_registrations", `event = '${txEvent.id}' && user = '${txTarget.id}'`, "", 1, 0)[0] || null;
    if (current && current.getString("status") === "REGISTERED") {
      payments.ensurePaymentForRegistration(txApp, current, txTarget, txEvent);
      result = current;
      return;
    }
    if (api.registrationCount(txApp, txEvent.id) >= txEvent.getInt("capacity")) throw new ApiError(409, "Event ist ausgebucht", {});
    const registration = current || new Record(txApp.findCollectionByNameOrId("event_registrations"));
    const now = api.nowIso();
    registration.set("event", txEvent.id); registration.set("user", txTarget.id); registration.set("checkoutRegion", txVenue.getString("checkoutRegion")); registration.set("termsVersion", "ADMIN-MANUAL"); registration.set("termsAcceptedAt", now);
    registrations.setStatus(registration, "REGISTERED", now);
    txApp.save(registration); result = registration;
    payments.ensurePaymentForRegistration(txApp, registration, txTarget, txEvent);
    registrations.queueNotification(txApp, registration, txTarget, txEvent, txVenue, "EVENT_ADMIN_ADDED", now, {}, notificationIds);
    const audit = new Record(txApp.findCollectionByNameOrId("audit_events")); audit.set("eventType", "PARTICIPANT_ADDED"); audit.set("actorUser", admin.id); audit.set("targetUser", target.id); audit.set("metadata", JSON.stringify({ eventId: txEvent.id })); txApp.save(audit);
  });
  registrations.deliverNotifications($app, notificationIds);
  return e.json(201, { registrationId: result.id, userId: target.id, status: result.getString("status") });
}, $apis.requireAuth("users"));

routerAdd("DELETE", "/api/bvhub/admin/events/{id}/participants/{userId}", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  const registrations = require(`${__hooks}/event-registration-service.js`);
  const payments = require(`${__hooks}/payment-service.js`);
  const admin = api.requireAdminActor(e);
  if (!admin) throw new ForbiddenError("Verwaltungszugriff nicht erlaubt");
  const event = api.event($app, api.idOf(e));
  const pathValue = e.request && typeof e.request.pathValue === "function" ? e.request.pathValue("userId") : "";
  const path = String(e.request && e.request.url && e.request.url.path || "");
  const userId = pathValue || path.split("/").filter(Boolean).at(-1) || "";
  const target = api.userRecord($app, userId);
  let result = null;
  const notificationIds = [];
  $app.runInTransaction((txApp) => {
    const txEvent = api.event(txApp, event.id);
    const txTarget = api.userRecord(txApp, target.id);
    const txVenue = api.venue(txApp, txEvent.getString("venue"));
    const current = txApp.findRecordsByFilter("event_registrations", `event = '${txEvent.id}' && user = '${txTarget.id}'`, "", 1, 0)[0] || null;
    if (!current || current.getString("status") !== "REGISTERED") { result = current; return; }
    const now = api.nowIso();
    current.set("status", "CANCELLED"); current.set("cancelledAt", now); txApp.save(current); result = current;
    payments.deactivatePaymentForRegistration(txApp, current);
    registrations.queueNotification(txApp, current, txTarget, txEvent, txVenue, "EVENT_ADMIN_REMOVED", now, {}, notificationIds);
    registrations.promoteNextWaiting(txApp, txEvent, now, notificationIds);
    const audit = new Record(txApp.findCollectionByNameOrId("audit_events")); audit.set("eventType", "PARTICIPANT_REMOVED"); audit.set("actorUser", admin.id); audit.set("targetUser", target.id); audit.set("metadata", JSON.stringify({ eventId: event.id })); txApp.save(audit);
  });
  registrations.deliverNotifications($app, notificationIds);
  return e.json(200, { status: result ? result.getString("status") : "CANCELLED" });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/events/{id}/changelog", (e) => {
  const api = require(`${__hooks}/venue-event-service.js`);
  if (!api.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
  const items = $app.findRecordsByFilter("event_changelog", `event = '${api.idOf(e)}'`, "-created", 100, 0).map((record) => ({ id: record.id, action: record.getString("action"), actorName: record.getString("actorName"), actorRole: record.getString("actorRole"), changes: record.get("changes"), correlationId: record.getString("correlationId"), created: record.getString("created") }));
  return e.json(200, { items, totalItems: items.length });
}, $apis.requireAuth("users"));

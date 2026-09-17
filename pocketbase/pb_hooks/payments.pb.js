/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/bvhub/me/payments", (e) => {
  const service = require(`${__hooks}/payment-service.js`);
  const user = service.requireUser(e);
  service.noStore(e);
  const records = $app.findRecordsByFilter("payments", `user = '${user.id}' && active = true`, "-created", 500, 0);
  return e.json(200, { items: records.map((record) => service.paymentDto($app, record)), totalItems: records.length });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/me/payments/{id}", (e) => {
  const service = require(`${__hooks}/payment-service.js`);
  const user = service.requireUser(e);
  const payment = service.findPayment($app, service.pathValue(e, "paymentId"));
  if (payment.getString("user") !== user.id) throw new ApiError(404, "Zahlung nicht gefunden", {});
  service.noStore(e);
  return e.json(200, service.paymentDto($app, payment, { settings: true }));
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/payment-summary", (e) => {
  const service = require(`${__hooks}/payment-service.js`);
  service.requireAdmin(e);
  service.noStore(e);
  const query = e.requestInfo().query || {};
  const showAll = String(query.showAll || "") === "true";
  const recentSince = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const summaries = {};
  $app.findRecordsByFilter("payments", "active = true", "", 100000, 0).forEach((payment) => {
    const eventId = payment.getString("event");
    if (!summaries[eventId]) {
      const event = $app.findRecordById("events", eventId);
      summaries[eventId] = {
        eventId,
        title: event.getString("title"),
        start: event.getString("start"),
        end: event.getString("end"),
        guestFeeCents: event.getInt("guestFeeCents"),
        totalPayments: 0,
        paidCount: 0,
        unpaidCount: 0,
        paidAmountCents: 0,
        openAmountCents: 0,
      };
    }
    const summary = summaries[eventId];
    const amount = payment.getInt("amountCents");
    summary.totalPayments += 1;
    if (payment.getString("status") === "PAID") {
      summary.paidCount += 1;
      summary.paidAmountCents += amount;
    } else {
      summary.unpaidCount += 1;
      summary.openAmountCents += amount;
    }
  });
  const items = Object.values(summaries)
    .filter((summary) => showAll || Date.parse(summary.start) >= recentSince)
    .sort((left, right) => Date.parse(right.start) - Date.parse(left.start));
  return e.json(200, { items, totalItems: items.length });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/events/{eventId}/payments", (e) => {
  const service = require(`${__hooks}/payment-service.js`);
  service.requireAdmin(e);
  const eventId = service.validId(service.pathValue(e, "eventId"), "Event-ID");
  try { $app.findRecordById("events", eventId); } catch (_) { throw new ApiError(404, "Event nicht gefunden", {}); }
  service.noStore(e);
  const records = $app.findRecordsByFilter("payments", `event = '${eventId}' && active = true`, "created", 100000, 0);
  return e.json(200, { items: records.map((record) => service.paymentDto($app, record, { admin: true })), totalItems: records.length });
}, $apis.requireAuth("users"));

routerAdd("PATCH", "/api/bvhub/admin/payments/{paymentId}/status", (e) => {
  const service = require(`${__hooks}/payment-service.js`);
  const actor = service.requireAdmin(e);
  const payment = service.findPayment($app, service.pathValue(e, "paymentId"));
  const nextStatus = service.statusPayload(e);
  $app.runInTransaction((txApp) => {
    const current = txApp.findRecordById("payments", payment.id);
    const oldStatus = current.getString("status");
    if (oldStatus === nextStatus) return;
    current.set("status", nextStatus);
    current.set("paidAt", nextStatus === "PAID" ? new Date().toISOString() : "");
    current.set("paidBy", nextStatus === "PAID" ? actor.id : "");
    txApp.save(current);
    const audit = new Record(txApp.findCollectionByNameOrId("audit_events"));
    audit.set("eventType", "PAYMENT_STATUS_CHANGED");
    audit.set("actorUser", actor.id);
    audit.set("targetUser", current.getString("user"));
    audit.set("metadata", JSON.stringify({ paymentId: current.id, eventId: current.getString("event"), oldStatus, newStatus: nextStatus }));
    txApp.save(audit);
  });
  service.noStore(e);
  return e.json(200, service.paymentDto($app, service.findPayment($app, payment.id), { admin: true }));
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/payment-settings", (e) => {
  const service = require(`${__hooks}/payment-service.js`);
  service.requireAdmin(e);
  const settings = service.paymentSettings($app);
  if (!settings) throw new InternalServerError("Zahlungseinstellungen nicht verfügbar");
  service.noStore(e);
  return e.json(200, service.settingsDto(settings));
}, $apis.requireAuth("users"));

routerAdd("PATCH", "/api/bvhub/admin/payment-settings", (e) => {
  const service = require(`${__hooks}/payment-service.js`);
  const actor = service.requireAdmin(e);
  const data = service.settingsPayload(e);
  const settings = service.paymentSettings($app);
  if (!settings) throw new InternalServerError("Zahlungseinstellungen nicht verfügbar");
  $app.runInTransaction((txApp) => {
    const record = txApp.findRecordById("payment_settings", settings.id);
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    record.set("updatedBy", actor.id);
    txApp.save(record);
    const audit = new Record(txApp.findCollectionByNameOrId("audit_events"));
    audit.set("eventType", "PAYMENT_SETTINGS_CHANGED");
    audit.set("actorUser", actor.id);
    audit.set("targetUser", actor.id);
    audit.set("metadata", JSON.stringify({ changedFields: Object.keys(data).sort() }));
    txApp.save(audit);
  });
  service.noStore(e);
  return e.json(200, service.settingsDto(service.paymentSettings($app)));
}, $apis.requireAuth("users"));

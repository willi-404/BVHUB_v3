const SENDER = "noreply@bv-erlangen2025.de";
const RECIPIENT = "vorstand@bv-erlangen2025.de";
const DAY_MS = 24 * 60 * 60 * 1000;

function findAll(app, collection, filter, sort = "", params = {}) {
  const records = [];
  for (let offset = 0; ; offset += 200) {
    const batch = app.findRecordsByFilter(collection, filter, sort, 200, offset, params);
    records.push(...batch);
    if (batch.length < 200) return records;
  }
}

function requestFor(app, userId) {
  return app.findRecordsByFilter("user_deletion_requests", "user = {:user}", "", 1, 0, { user: userId })[0] || null;
}

function assertNotDeleting(app, userId) {
  const status = requestFor(app, userId)?.getString("status");
  if (status === "EMAIL_PENDING" || status === "SCHEDULED") throw new ApiError(409, "Dieses Konto wartet auf Löschung", { code: "DELETION_PENDING" });
}

function assertEligible(app, user) {
  if (user.getString("role") !== "GUEST") throw new ApiError(409, "Nur Gastkonten können gelöscht werden", { code: "DELETION_ROLE" });
  if (findAll(app, "payments", "user = {:user} && status != 'PAID'", "", { user: user.id }).length) {
    throw new ApiError(409, "Alle Zahlungen müssen bezahlt sein", { code: "DELETION_UNPAID" });
  }
  const active = findAll(app, "event_registrations", "user = {:user} && (status = 'REGISTERED' || status = 'WAITING')", "", { user: user.id });
  if (active.some((registration) => {
    const event = app.findRecordById("events", registration.getString("event"));
    return !["CANCELLED", "COMPLETED"].includes(event.getString("status"));
  })) throw new ApiError(409, "Aktive Event-Teilnahme oder Warteliste vorhanden", { code: "DELETION_ACTIVE_EVENT" });
}

function auditText(app, userId) {
  const entries = findAll(app, "audit_events", "actorUser = {:user} || targetUser = {:user}", "created,id", { user: userId });
  return entries.map((entry) => [
    `id: ${entry.id}`,
    `created: ${entry.getString("created")}`,
    `eventType: ${entry.getString("eventType")}`,
    `actorUser: ${entry.getString("actorUser")}`,
    `targetUser: ${entry.getString("targetUser")}`,
    `metadata: ${toString(entry.get("metadata"))}`,
  ].join("\n")).join("\n\n") + "\n";
}

function sendAuditMail(app, user, actor) {
  const meta = app.settings().meta;
  if (!app.settings().smtp.enabled) throw new Error("PocketBase SMTP is disabled");
  if (String(meta.senderAddress).toLowerCase() !== SENDER) throw new Error(`PocketBase senderAddress must be ${SENDER}`);
  const detail = require(`${__hooks}/admin-service.js`).memberDetailDto(app, user);
  const fields = ["id", "displayName", "firstName", "lastName", "email", "role", "active", "verified", "created", "updated", "street", "houseNumber", "postalCode", "city", "address", "birthDate", "phone", "contactInfo", "groups"];
  const body = [`requestedBy: ${actor.id}`, ...fields.map((field) => `${field}: ${field === "groups" ? detail.groups.map((group) => group.name).join(", ") : detail[field] ?? ""}`)].join("\n");
  const attachment = $filesystem.fileFromBytes(toBytes(auditText(app, user.id)), `audit-log-${user.id}.txt`).reader.open();
  try {
    const message = new MailerMessage({
      from: { address: SENDER, name: meta.senderName },
      to: [{ address: RECIPIENT }],
      subject: `systeminfo: deleted user ${detail.displayName} ${detail.firstName} ${detail.lastName}`,
      text: body,
      attachments: { [`audit-log-${user.id}.txt`]: attachment },
    });
    app.newMailClient().send(message);
  } finally {
    attachment.close();
  }
}

function start(app, actor, userId) {
  const service = require(`${__hooks}/admin-service.js`);
  const user = service.findUser(app, userId);
  const existing = requestFor(app, user.id);
  if (existing && (existing.getString("status") === "SCHEDULED" || (existing.getString("status") === "EMAIL_PENDING" && Date.now() - Date.parse(existing.getString("updated")) < 10 * 60 * 1000))) throw new ApiError(409, "Löschung bereits beantragt", { code: "DELETION_PENDING" });
  assertEligible(app, user);
  let request = existing;
  app.runInTransaction((txApp) => {
    const current = txApp.findRecordById("users", user.id);
    assertEligible(txApp, current);
    request = existing ? txApp.findRecordById("user_deletion_requests", existing.id) : new Record(txApp.findCollectionByNameOrId("user_deletion_requests"));
    request.set("user", user.id);
    request.set("requestedBy", actor.id);
    request.set("status", "EMAIL_PENDING");
    request.set("lastError", "");
    txApp.save(request);
    service.audit(txApp, actor.id, user.id, "USER_DELETION_REQUESTED", { requestId: request.id });
  });
  try {
    sendAuditMail(app, user, actor);
  } catch (error) {
    request.set("status", "EMAIL_FAILED");
    request.set("lastError", String(error && error.message || error).slice(0, 500));
    app.save(request);
    throw new ApiError(503, "Löschung nicht gestartet: E-Mail konnte nicht gesendet werden", { code: "DELETION_MAIL_FAILED" });
  }
  const sentAt = new Date();
  try {
    app.runInTransaction((txApp) => {
      const current = txApp.findRecordById("users", user.id);
      assertEligible(txApp, current);
      const job = txApp.findRecordById("user_deletion_requests", request.id);
      if (job.getString("status") !== "EMAIL_PENDING") throw new ApiError(409, "Löschauftrag wurde geändert", {});
      current.set("active", false);
      current.refreshTokenKey();
      txApp.save(current);
      job.set("status", "SCHEDULED");
      job.set("sentAt", sentAt.toISOString());
      job.set("deleteAfter", new Date(sentAt.getTime() + DAY_MS).toISOString());
      txApp.save(job);
    });
  } catch (error) {
    request.set("status", "EMAIL_FAILED");
    request.set("lastError", String(error && error.message || error).slice(0, 500));
    app.save(request);
    throw error;
  }
  return { status: "SCHEDULED", deleteAfter: new Date(sentAt.getTime() + DAY_MS).toISOString() };
}

function purge(app, request, now = new Date()) {
  if (request.getString("status") !== "SCHEDULED" || Date.parse(request.getString("deleteAfter")) > now.getTime()) return false;
  app.runInTransaction((txApp) => {
    const job = txApp.findRecordById("user_deletion_requests", request.id);
    if (job.getString("status") !== "SCHEDULED" || Date.parse(job.getString("deleteAfter")) > now.getTime()) return;
    const user = txApp.findRecordById("users", job.getString("user"));
    assertEligible(txApp, user);
    const deletedDate = require(`${__hooks}/notification-service.js`).berlinDate(now).toISOString().slice(0, 10);
    const note = `（此用户已于${deletedDate} 已删除）`;
    const name = `${user.getString("displayName")} (${user.getString("firstName")} ${user.getString("lastName")})${note}`;
    const registrations = findAll(txApp, "event_registrations", "user = {:user}", "", { user: user.id });
    for (const registration of registrations) {
      for (const notice of findAll(txApp, "notification_outbox", "registration = {:registration}", "", { registration: registration.id })) txApp.delete(notice);
      for (const payment of findAll(txApp, "payments", "registration = {:registration}", "", { registration: registration.id })) txApp.delete(payment);
      const event = txApp.findRecordById("events", registration.getString("event"));
      if (["CANCELLED", "COMPLETED"].includes(event.getString("status")) && registration.getString("status") === "REGISTERED") {
        registration.set("user", "");
        registration.set("deletedParticipantName", name);
        registration.set("deletedParticipantPublicName", `${user.getString("displayName")}${note}`);
        txApp.save(registration);
      } else txApp.delete(registration);
    }
    for (const payment of findAll(txApp, "payments", "user = {:user}", "", { user: user.id })) txApp.delete(payment);
    for (const payment of findAll(txApp, "payments", "paidBy = {:user}", "", { user: user.id })) { payment.set("paidBy", ""); txApp.save(payment); }
    for (const setting of findAll(txApp, "payment_settings", "updatedBy = {:user}", "", { user: user.id })) { setting.set("updatedBy", ""); txApp.save(setting); }
    for (const event of findAll(txApp, "events", "createdBy = {:user}", "", { user: user.id })) { event.set("createdBy", ""); txApp.save(event); }
    for (const entry of findAll(txApp, "event_changelog", "actor = {:user}", "", { user: user.id })) { entry.set("actor", ""); entry.set("actorName", "Deleted user"); txApp.save(entry); }
    for (const entry of findAll(txApp, "audit_events", "actorUser = {:user} || targetUser = {:user}", "", { user: user.id })) txApp.delete(entry);
    txApp.delete(job);
    txApp.delete(user);
  });
  return true;
}

module.exports = { assertEligible, assertNotDeleting, auditText, requestFor, start, purge, DAY_MS };

const MAX_ATTEMPTS = 5;
const RETRY_MINUTES = [1, 5, 15, 60];

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  const local = berlinDate(date);
  return `${String(local.getUTCDate()).padStart(2, "0")}.${String(local.getUTCMonth() + 1).padStart(2, "0")}.${local.getUTCFullYear()}`;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const local = berlinDate(date);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")} Uhr`;
}

function lastSundayDay(year, month) {
  const last = new Date(Date.UTC(year, month + 1, 0));
  return last.getUTCDate() - last.getUTCDay();
}

function berlinOffsetMinutes(date) {
  const year = date.getUTCFullYear();
  const summerStart = Date.UTC(year, 2, lastSundayDay(year, 2), 1, 0, 0);
  const summerEnd = Date.UTC(year, 9, lastSundayDay(year, 9), 1, 0, 0);
  return date.getTime() >= summerStart && date.getTime() < summerEnd ? 120 : 60;
}

function berlinDate(date) {
  return new Date(date.getTime() + berlinOffsetMinutes(date) * 60 * 1000);
}

function parsePayload(entry) {
  const serialized = entry.getString("payload");
  if (serialized) {
    try { return JSON.parse(serialized); } catch (_) {}
  }
  const raw = entry.get("payload");
  if (raw && typeof raw === "object") {
    try { return JSON.parse(JSON.stringify(raw)); } catch (_) {}
  }
  try { return JSON.parse(String(raw || "{}")); } catch (_) { return {}; }
}

function subjectFor(kind) {
  return ({
    EVENT_REGISTRATION_CONFIRMED: "Anmeldung bestätigt",
    EVENT_REGISTRATION_CANCELLED: "Anmeldung storniert",
    EVENT_ADMIN_ADDED: "Du wurdest zu einem Event hinzugefügt",
    EVENT_ADMIN_REMOVED: "Du wurdest von einem Event abgemeldet",
    EVENT_WAITING_LIST_JOINED: "Du bist auf der Warteliste",
    EVENT_WAITING_LIST_LEFT: "Du hast die Warteliste verlassen",
    EVENT_WAITING_LIST_PROMOTED: "Du bist von der Warteliste nachgerückt",
  })[kind] || "Aktualisierung deiner Event-Anmeldung";
}

function copyFor(kind) {
  return ({
    EVENT_REGISTRATION_CONFIRMED: ["Deine Anmeldung wurde erfolgreich bestätigt.", "Du bist damit in der Teilnehmerliste eingetragen."],
    EVENT_REGISTRATION_CANCELLED: ["Deine Anmeldung wurde storniert.", "Wenn du wieder teilnehmen möchtest, kannst du dich erneut anmelden, sofern Plätze verfügbar sind."],
    EVENT_ADMIN_ADDED: ["Du wurdest von einem Administrator zur Teilnehmerliste hinzugefügt.", ""],
    EVENT_ADMIN_REMOVED: ["Du wurdest von einem Administrator von der Teilnehmerliste abgemeldet.", "Bei Fragen wende dich bitte an das bvHub-Team."],
    EVENT_WAITING_LIST_JOINED: ["Für dieses Event sind derzeit alle Plätze belegt.", "Du wurdest deshalb auf die Warteliste gesetzt und wirst automatisch benachrichtigt, sobald ein Platz frei wird."],
    EVENT_WAITING_LIST_LEFT: ["Du hast die Warteliste für dieses Event verlassen.", "Du erhältst für dieses Event keine weiteren Nachrück-Benachrichtigungen."],
    EVENT_WAITING_LIST_PROMOTED: ["Ein Platz ist frei geworden und du bist automatisch nachgerückt.", "Du bist jetzt in der Teilnehmerliste eingetragen."],
  })[kind] || ["Der Status deiner Event-Anmeldung wurde aktualisiert.", ""];
}

function renderHtml(kind, payload) {
  const title = escapeHtml(payload.eventTitle || "Event");
  const venue = escapeHtml(payload.venue || "-");
  const venueDescription = escapeHtml(payload.venueDescription || "");
  const address = escapeHtml(payload.address || "");
  const name = escapeHtml(payload.displayName || "Mitglied");
  const date = escapeHtml(formatDate(payload.start));
  const time = `${escapeHtml(formatTime(payload.start))}–${escapeHtml(formatTime(payload.end))}`;
  const copy = copyFor(kind);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background-color:#f4f7f5;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid #e2e8e4;border-radius:12px;overflow:hidden;"><tr><td style="padding:28px 24px;background-color:#0f2d1a;background-image:linear-gradient(145deg,#0a1f10 0%,#14532d 100%);font-family:'Outfit','Segoe UI',Arial,sans-serif;"><div style="font-size:24px;line-height:30px;font-weight:700;color:#ffffff;">bvHub</div><div style="margin-top:4px;font-size:13px;line-height:20px;color:#b9d9c3;">Badminton Verein Erlangen n.e.V. · Member Portal</div></td></tr><tr><td style="padding:32px 24px 16px;font-family:'Outfit','Segoe UI',Arial,sans-serif;color:#1a211d;"><h1 style="margin:0;font-size:24px;line-height:32px;font-weight:700;">${escapeHtml(subjectFor(kind))}</h1><p style="margin:14px 0 0;font-size:15px;line-height:24px;color:#5f6963;">Hallo ${name},<br>${escapeHtml(copy[0])}</p></td></tr><tr><td style="padding:12px 24px 20px;"><div style="padding:18px 16px;background-color:#eefbf3;border:1px solid #bbf7d0;border-radius:10px;font-family:'Outfit','Segoe UI',Arial,sans-serif;"><div style="font-size:18px;line-height:25px;font-weight:700;color:#15803d;">${title}</div><div style="margin-top:8px;font-size:14px;line-height:22px;color:#1a211d;">${date}<br>${time}<br>${venue}${address ? `<br>${address}` : ""}${venueDescription ? `<br><span style="color:#5f6963;">${venueDescription}</span>` : ""}</div></div></td></tr><tr><td style="padding:0 24px 32px;font-family:'Outfit','Segoe UI',Arial,sans-serif;"><p style="margin:0;font-size:14px;line-height:22px;color:#5f6963;">${escapeHtml(copy[1])}</p><p style="margin:18px 0 0;padding:12px 14px;font-size:13px;line-height:20px;color:#6b5b16;background-color:#fff8e1;border-left:4px solid #f59e0b;">Dies ist eine automatisch versendete Nachricht. Bitte antworte nicht auf diese E-Mail.</p></td></tr><tr><td style="padding:18px 24px;border-top:1px solid #e7ebe8;background-color:#fafbfa;font-family:'Outfit','Segoe UI',Arial,sans-serif;text-align:center;"><p style="margin:0;font-size:12px;line-height:19px;color:#89918c;">Badminton Verein Erlangen n.e.V. · Est. 2025</p><p style="margin:4px 0 0;font-size:11px;line-height:18px;color:#a0a7a3;">Automatisch versendete Event-Benachrichtigung</p></td></tr></table></td></tr></table>`;
}

function send(entry) {
  const payload = parsePayload(entry);
  const meta = $app.settings().meta;
  const recipient = entry.getString("recipient");
  const message = new MailerMessage({ from: { address: meta.senderAddress, name: meta.senderName }, to: [{ address: recipient }], subject: `bvHub · ${subjectFor(entry.getString("kind"))}`, html: renderHtml(entry.getString("kind"), payload) });
  $app.newMailClient().send(message);
}

function deliver(app, id) {
  let entry;
  try {
    entry = app.findRecordById("notification_outbox", id);
    if (entry.getString("status") === "SENT") return;
    entry.set("status", "PROCESSING");
    entry.set("processingStartedAt", new Date().toISOString());
    app.save(entry);
    send(entry);
    entry.set("status", "SENT");
    entry.set("sentAt", new Date().toISOString());
    entry.set("lastError", "");
    entry.set("processingStartedAt", "");
    app.save(entry);
    app.logger().info("[bvhub notifications] email sent", "notificationId", id, "kind", entry.getString("kind"));
  } catch (error) {
    try { entry = entry || app.findRecordById("notification_outbox", id); } catch (_) { return; }
    const attempts = entry.getInt("attempts") + 1;
    const message = String(error && error.message || error).slice(0, 500);
    entry.set("attempts", attempts);
    entry.set("lastError", message);
    entry.set("processingStartedAt", "");
    // There is intentionally no background consumer: delivery is attempted
    // synchronously after the business transaction. Keep failures terminal so
    // operators can inspect and manually retry the outbox record.
    entry.set("status", "FAILED");
    try { app.save(entry); } catch (saveError) { app.logger().error("[bvhub notifications] failed to persist delivery error", "notificationId", id, "err", saveError); }
    app.logger().error("[bvhub notifications] email send failed", "notificationId", id, "kind", entry.getString("kind"), "attempts", attempts, "err", message);
  }
}

function retryDelayMinutes(attempts) { return RETRY_MINUTES[Math.min(Math.max(attempts - 1, 0), RETRY_MINUTES.length - 1)]; }

module.exports = { MAX_ATTEMPTS, send, deliver, retryDelayMinutes, subjectFor, renderHtml };

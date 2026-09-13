/// <reference path="../pb_data/types.d.ts" />

function due(entry, now) {
  const status = entry.getString("status");
  if (status === "PENDING") {
    const next = Date.parse(entry.getString("nextAttemptAt") || "");
    return Number.isNaN(next) || next <= now;
  }
  if (status === "PROCESSING") {
    const started = Date.parse(entry.getString("processingStartedAt") || "");
    return Number.isNaN(started) || started <= now - (10 * 60 * 1000);
  }
  return false;
}

function claim(id, nowIso) {
  let claimed = false;
  $app.runInTransaction((txApp) => {
    const entry = txApp.findRecordById("notification_outbox", id);
    if (!["PENDING", "PROCESSING"].includes(entry.getString("status"))) return;
    if (entry.getString("status") === "PROCESSING" && !due(entry, Date.parse(nowIso))) return;
    entry.set("status", "PROCESSING");
    entry.set("processingStartedAt", nowIso);
    txApp.save(entry);
    claimed = true;
  });
  return claimed;
}

function processOne(id) {
  const notifications = require(`${__hooks}/notification-service.js`);
  const now = new Date();
  const nowIso = now.toISOString();
  if (!claim(id, nowIso)) return;
  let entry;
  try {
    entry = $app.findRecordById("notification_outbox", id);
    notifications.send(entry);
    entry.set("status", "SENT");
    entry.set("sentAt", new Date().toISOString());
    entry.set("lastError", "");
    entry.set("processingStartedAt", "");
    $app.save(entry);
    $app.logger().info("[bvhub notifications] email sent", "notificationId", id, "kind", entry.getString("kind"));
  } catch (error) {
    try { entry = entry || $app.findRecordById("notification_outbox", id); } catch (_) { return; }
    const attempts = entry.getInt("attempts") + 1;
    const message = String(error && error.message || error).slice(0, 500);
    entry.set("attempts", attempts);
    entry.set("lastError", message);
    entry.set("processingStartedAt", "");
    if (attempts >= notifications.MAX_ATTEMPTS) {
      entry.set("status", "FAILED");
    } else {
      entry.set("status", "PENDING");
      entry.set("nextAttemptAt", new Date(Date.now() + notifications.retryDelayMinutes(attempts) * 60000).toISOString());
    }
    try { $app.save(entry); } catch (saveError) { $app.logger().error("[bvhub notifications] failed to persist delivery error", "notificationId", id, "err", saveError); }
    $app.logger().error("[bvhub notifications] email send failed", "notificationId", id, "kind", entry.getString("kind"), "attempts", attempts, "err", message);
  }
}

cronAdd("bvhub-notification-outbox", "* * * * *", () => {
  const now = Date.now();
  const entries = $app.findRecordsByFilter("notification_outbox", "status = 'PENDING' || status = 'PROCESSING'", "created", 25, 0);
  let processed = 0;
  entries.forEach((entry) => { if (due(entry, now)) { processOne(entry.id); processed += 1; } });
  if (processed) $app.logger().info("[bvhub notifications] outbox run", "processed", processed);
});

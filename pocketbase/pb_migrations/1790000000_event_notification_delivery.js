/// <reference path="../pb_data/types.d.ts" />

function ensureField(collection, definition, FieldType) {
  const current = collection.fields.getByName(definition.name);
  if (!current) collection.fields.add(new FieldType(definition));
  else Object.keys(definition).forEach((key) => { if (key !== "id" && key !== "name" && key !== "type") current[key] = definition[key]; });
}

migrate((app) => {
  const registrations = app.findCollectionByNameOrId("event_registrations");
  const status = registrations.fields.getByName("status");
  if (status) status.values = ["REGISTERED", "WAITING", "CANCELLED"];
  ensureField(registrations, { id: "registration_waiting_at", name: "waitingAt", type: "date", required: false }, DateField);
  registrations.indexes = registrations.indexes.filter((index) => !String(index).includes("idx_event_registrations_waiting"));
  registrations.indexes.push("CREATE INDEX IF NOT EXISTS idx_event_registrations_waiting ON event_registrations (event, status, waitingAt, created)");
  app.save(registrations);

  const outbox = app.findCollectionByNameOrId("notification_outbox");
  const statusField = outbox.fields.getByName("status");
  if (statusField) statusField.values = ["PENDING", "PROCESSING", "SENT", "FAILED"];
  ensureField(outbox, { id: "outbox_dedupe_key", name: "dedupeKey", type: "text", required: false, max: 220, pattern: "" }, TextField);
  ensureField(outbox, { id: "outbox_last_error", name: "lastError", type: "text", required: false, max: 500, pattern: "" }, TextField);
  ensureField(outbox, { id: "outbox_sent_at", name: "sentAt", type: "date", required: false }, DateField);
  ensureField(outbox, { id: "outbox_next_attempt_at", name: "nextAttemptAt", type: "date", required: false }, DateField);
  ensureField(outbox, { id: "outbox_processing_started_at", name: "processingStartedAt", type: "date", required: false }, DateField);
  outbox.indexes = outbox.indexes.filter((index) => !String(index).includes("idx_notification_outbox_registration_kind") && !String(index).includes("idx_notification_outbox_dedupe") && !String(index).includes("idx_notification_outbox_pending"));
  outbox.indexes.push("CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_dedupe ON notification_outbox (dedupeKey) WHERE dedupeKey != ''");
  outbox.indexes.push("CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox (status, nextAttemptAt, created)");
  app.save(outbox);
}, () => {});

/// <reference path="../pb_data/types.d.ts" />

const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";

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
  app.save(registrations);

  const outbox = app.findCollectionByNameOrId("notification_outbox");
  ensureField(outbox, { id: "outbox_dedupe_key", name: "dedupeKey", type: "text", required: false, max: 220, pattern: "" }, TextField);
  ensureField(outbox, { id: "outbox_last_error", name: "lastError", type: "text", required: false, max: 500, pattern: "" }, TextField);
  ensureField(outbox, { id: "outbox_sent_at", name: "sentAt", type: "date", required: false }, DateField);
  outbox.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_dedupe ON notification_outbox (dedupeKey) WHERE dedupeKey != ''", "CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox (status, created)"];
  app.save(outbox);

  let cache;
  try { cache = app.findCollectionByNameOrId("external_cache"); } catch (_) { cache = new Collection({ name: "external_cache", type: "base", system: false, fields: [] }); }
  ensureField(cache, { id: "cache_key", name: "key", type: "text", required: true, max: 120, pattern: "" }, TextField);
  ensureField(cache, { id: "cache_body", name: "body", type: "json", required: true }, JSONField);
  ensureField(cache, { id: "cache_expires_at", name: "expiresAt", type: "date", required: true }, DateField);
  cache.listRule = ACTIVE_AUTH; cache.viewRule = ACTIVE_AUTH; cache.createRule = null; cache.updateRule = null; cache.deleteRule = null;
  cache.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_external_cache_key ON external_cache (key)"];
  app.save(cache);
}, () => {});

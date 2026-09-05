/// <reference path="../pb_data/types.d.ts" />

const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
const ADMIN_AUTH = `${ACTIVE_AUTH} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;

function ensureField(collection, definition, FieldType) {
  const current = collection.fields.getByName(definition.name);
  if (!current) collection.fields.add(new FieldType(definition));
  else Object.keys(definition).forEach((key) => { if (key !== "id" && key !== "name" && key !== "type") current[key] = definition[key]; });
}
function ensureCollection(app, name, definition) {
  try { return app.findCollectionByNameOrId(name); } catch (_) { return new Collection(definition); }
}

migrate((app) => {
  const venues = app.findCollectionByNameOrId("venues");
  ensureField(venues, { id: "venue_checkout_region", name: "checkoutRegion", type: "select", required: false, maxSelect: 1, values: ["ER", "NUE"] }, SelectField);
  app.save(venues);

  const events = app.findCollectionByNameOrId("events");
  const status = events.fields.getByName("status");
  if (status) status.values = ["MEMBERS_ONLY", "OPEN_TO_ALL", "CANCELLED", "COMPLETED"];
  ensureField(events, { id: "event_published", name: "published", type: "bool", required: false, default: false }, BoolField);
  events.listRule = `${ACTIVE_AUTH} && ((published = true && venue.active = true) || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  events.viewRule = events.listRule;
  app.save(events);
  app.findAllRecords("events").forEach((record) => {
    const previous = record.getString("status");
    record.set("published", previous === "PUBLISHED" || previous === "CANCELLED");
    record.set("status", previous === "CANCELLED" ? "CANCELLED" : "MEMBERS_ONLY");
    app.save(record);
  });

  const registrations = ensureCollection(app, "event_registrations", { name: "event_registrations", type: "base", system: false, fields: [] });
  ensureField(registrations, { id: "registration_event", name: "event", type: "relation", required: true, collectionId: events.id, minSelect: 1, maxSelect: 1, cascadeDelete: false }, RelationField);
  ensureField(registrations, { id: "registration_user", name: "user", type: "relation", required: true, collectionId: app.findCollectionByNameOrId("users").id, minSelect: 1, maxSelect: 1, cascadeDelete: false }, RelationField);
  ensureField(registrations, { id: "registration_status", name: "status", type: "select", required: true, maxSelect: 1, values: ["REGISTERED", "CANCELLED"] }, SelectField);
  ensureField(registrations, { id: "registration_registered_at", name: "registeredAt", type: "date", required: false }, DateField);
  ensureField(registrations, { id: "registration_cancelled_at", name: "cancelledAt", type: "date", required: false }, DateField);
  ensureField(registrations, { id: "registration_checkout_region", name: "checkoutRegion", type: "select", required: true, maxSelect: 1, values: ["ER", "NUE"] }, SelectField);
  ensureField(registrations, { id: "registration_terms_version", name: "termsVersion", type: "text", required: true, max: 80, pattern: "" }, TextField);
  ensureField(registrations, { id: "registration_terms_accepted_at", name: "termsAcceptedAt", type: "date", required: true }, DateField);
  ensureField(registrations, { id: "registration_created", name: "created", type: "date", required: false }, DateField);
  ensureField(registrations, { id: "registration_updated", name: "updated", type: "date", required: false }, DateField);
  registrations.listRule = `${ACTIVE_AUTH} && user = @request.auth.id`;
  registrations.viewRule = registrations.listRule;
  registrations.createRule = null; registrations.updateRule = null; registrations.deleteRule = null;
  registrations.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_event_user ON event_registrations (event, user)", "CREATE INDEX IF NOT EXISTS idx_event_registrations_event_status ON event_registrations (event, status)"];
  app.save(registrations);

  const changelog = ensureCollection(app, "event_changelog", { name: "event_changelog", type: "base", system: false, fields: [] });
  ensureField(changelog, { id: "changelog_event", name: "event", type: "relation", required: true, collectionId: events.id, minSelect: 1, maxSelect: 1, cascadeDelete: false }, RelationField);
  ensureField(changelog, { id: "changelog_action", name: "action", type: "text", required: true, max: 60, pattern: "" }, TextField);
  ensureField(changelog, { id: "changelog_actor", name: "actor", type: "relation", required: true, collectionId: app.findCollectionByNameOrId("users").id, minSelect: 1, maxSelect: 1, cascadeDelete: false }, RelationField);
  ensureField(changelog, { id: "changelog_actor_name", name: "actorName", type: "text", required: true, max: 120, pattern: "" }, TextField);
  ensureField(changelog, { id: "changelog_actor_role", name: "actorRole", type: "text", required: true, max: 20, pattern: "" }, TextField);
  ensureField(changelog, { id: "changelog_changes", name: "changes", type: "json", required: true }, JSONField);
  ensureField(changelog, { id: "changelog_correlation", name: "correlationId", type: "text", required: true, max: 80, pattern: "" }, TextField);
  ensureField(changelog, { id: "changelog_created", name: "created", type: "date", required: false }, DateField);
  ensureField(changelog, { id: "changelog_updated", name: "updated", type: "date", required: false }, DateField);
  changelog.listRule = ADMIN_AUTH; changelog.viewRule = ADMIN_AUTH; changelog.createRule = null; changelog.updateRule = null; changelog.deleteRule = null;
  changelog.indexes = ["CREATE INDEX IF NOT EXISTS idx_event_changelog_event_created ON event_changelog (event, created)"];
  app.save(changelog);

  const outbox = ensureCollection(app, "notification_outbox", { name: "notification_outbox", type: "base", system: false, fields: [] });
  ensureField(outbox, { id: "outbox_kind", name: "kind", type: "text", required: true, max: 40, pattern: "" }, TextField);
  ensureField(outbox, { id: "outbox_registration", name: "registration", type: "relation", required: true, collectionId: registrations.id, minSelect: 1, maxSelect: 1, cascadeDelete: false }, RelationField);
  ensureField(outbox, { id: "outbox_recipient", name: "recipient", type: "text", required: true, max: 320, pattern: "" }, TextField);
  ensureField(outbox, { id: "outbox_payload", name: "payload", type: "json", required: true }, JSONField);
  ensureField(outbox, { id: "outbox_status", name: "status", type: "select", required: true, maxSelect: 1, values: ["PENDING", "SENT", "FAILED"] }, SelectField);
  ensureField(outbox, { id: "outbox_attempts", name: "attempts", type: "number", required: true, min: 0, max: 1000 }, NumberField);
  ensureField(outbox, { id: "outbox_sent_at", name: "sentAt", type: "date", required: false }, DateField);
  ensureField(outbox, { id: "outbox_created", name: "created", type: "date", required: false }, DateField);
  ensureField(outbox, { id: "outbox_updated", name: "updated", type: "date", required: false }, DateField);
  outbox.listRule = null; outbox.viewRule = null; outbox.createRule = null; outbox.updateRule = null; outbox.deleteRule = null;
  outbox.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_registration_kind ON notification_outbox (registration, kind)"];
  app.save(outbox);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("notification_outbox")); } catch (_) {}
  try { app.delete(app.findCollectionByNameOrId("event_changelog")); } catch (_) {}
  try { app.delete(app.findCollectionByNameOrId("event_registrations")); } catch (_) {}
});

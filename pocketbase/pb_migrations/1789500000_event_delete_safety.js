/// <reference path="../pb_data/types.d.ts" />

function ensureField(collection, definition, FieldType) {
  const current = collection.fields.getByName(definition.name);
  if (!current) collection.fields.add(new FieldType(definition));
  else Object.keys(definition).forEach((key) => { if (key !== "id" && key !== "name" && key !== "type") current[key] = definition[key]; });
}

migrate((app) => {
  const events = app.findCollectionByNameOrId("events");
  ensureField(events, { id: "event_first_published_at", name: "firstPublishedAt", type: "date", required: false }, DateField);
  app.save(events);

  // Audit entries for a never-published draft are intentionally removed with
  // the draft. Registrations and outbox relations remain non-cascading and
  // are checked by the delete service before a transaction starts.
  const changelog = app.findCollectionByNameOrId("event_changelog");
  const eventField = changelog.fields.getByName("event");
  if (eventField) eventField.cascadeDelete = true;
  app.save(changelog);

  // Conservative backfill: all rows that predate this migration are marked
  // as historically published. This prevents an ambiguous legacy row from
  // ever being hard-deleted; newly-created drafts retain a null value.
  app.findAllRecords("events").forEach((record) => {
    if (record.getString("firstPublishedAt")) return;
    record.set("firstPublishedAt", record.getString("created") || new Date().toISOString());
    app.save(record);
  });
}, (app) => {
  const events = app.findCollectionByNameOrId("events");
  const field = events.fields.getByName("firstPublishedAt");
  if (field) events.fields.removeById(field.id);
  app.save(events);
  const changelog = app.findCollectionByNameOrId("event_changelog");
  const eventField = changelog.fields.getByName("event");
  if (eventField) eventField.cascadeDelete = false;
  app.save(changelog);
});

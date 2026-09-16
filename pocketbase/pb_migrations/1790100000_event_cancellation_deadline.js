/// <reference path="../pb_data/types.d.ts" />

function ensureField(collection, definition, FieldType) {
  const current = collection.fields.getByName(definition.name);
  if (!current) collection.fields.add(new FieldType(definition));
  else Object.keys(definition).forEach((key) => { if (key !== "id" && key !== "name" && key !== "type") current[key] = definition[key]; });
}

migrate((app) => {
  const events = app.findCollectionByNameOrId("events");
  // Add as optional first so existing rows can be backfilled safely.
  ensureField(events, { id: "event_abmeldefrist", name: "abmeldefrist", type: "date", required: false }, DateField);
  app.save(events);

  app.findAllRecords("events").forEach((event) => {
    if (!event.getString("abmeldefrist")) {
      event.set("abmeldefrist", event.getString("start"));
      app.save(event);
    }
  });

  const updatedEvents = app.findCollectionByNameOrId("events");
  const deadline = updatedEvents.fields.getByName("abmeldefrist");
  if (deadline) deadline.required = true;
  app.save(updatedEvents);
}, (app) => {
  const events = app.findCollectionByNameOrId("events");
  events.fields.removeByName("abmeldefrist");
  app.save(events);
});

/// <reference path="../pb_data/types.d.ts" />
function setCascade(collection, name, value) {
  const field = collection.fields.getByName(name);
  if (field) field.cascadeDelete = value;
}
migrate((app) => {
  setCascade(app.findCollectionByNameOrId("event_registrations"), "event", true);
  setCascade(app.findCollectionByNameOrId("notification_outbox"), "registration", true);
  setCascade(app.findCollectionByNameOrId("event_changelog"), "event", true);
  app.save(app.findCollectionByNameOrId("event_registrations"));
  app.save(app.findCollectionByNameOrId("notification_outbox"));
  app.save(app.findCollectionByNameOrId("event_changelog"));
}, (app) => {
  const registrations = app.findCollectionByNameOrId("event_registrations");
  const outbox = app.findCollectionByNameOrId("notification_outbox");
  const changelog = app.findCollectionByNameOrId("event_changelog");
  setCascade(registrations, "event", false);
  setCascade(outbox, "registration", false);
  setCascade(changelog, "event", true);
  app.save(registrations); app.save(outbox); app.save(changelog);
});

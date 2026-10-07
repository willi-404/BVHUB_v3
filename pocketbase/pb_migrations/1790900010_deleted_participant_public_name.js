/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const registrations = app.findCollectionByNameOrId("event_registrations");
  registrations.fields.add(new TextField({ name: "deletedParticipantPublicName", required: false, max: 300 }));
  app.save(registrations);
}, (app) => {
  const registrations = app.findCollectionByNameOrId("event_registrations");
  registrations.fields.removeByName("deletedParticipantPublicName");
  app.save(registrations);
});

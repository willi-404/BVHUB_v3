/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.deleteRule = null;
  app.save(users);

  const registrations = app.findCollectionByNameOrId("event_registrations");
  registrations.fields.getByName("user").required = false;
  registrations.fields.getByName("user").minSelect = 0;
  registrations.fields.add(new TextField({ name: "deletedParticipantName", required: false, max: 400 }));
  registrations.indexes = registrations.indexes.filter((index) => !String(index).includes("idx_event_registrations_event_user"));
  registrations.indexes.push("CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_event_user ON event_registrations (event, user) WHERE user != ''");
  app.save(registrations);

  for (const [collectionName, fieldName] of [["events", "createdBy"], ["event_changelog", "actor"]]) {
    const collection = app.findCollectionByNameOrId(collectionName);
    collection.fields.getByName(fieldName).required = false;
    collection.fields.getByName(fieldName).minSelect = 0;
    app.save(collection);
  }

  const requests = new Collection({ name: "user_deletion_requests", type: "base", system: false, fields: [] });
  requests.fields.add(new RelationField({ name: "user", required: true, collectionId: users.id, minSelect: 1, maxSelect: 1, cascadeDelete: false }));
  requests.fields.add(new TextField({ name: "requestedBy", required: true, max: 15 }));
  requests.fields.add(new SelectField({ name: "status", required: true, maxSelect: 1, values: ["EMAIL_PENDING", "EMAIL_FAILED", "SCHEDULED"] }));
  requests.fields.add(new DateField({ name: "sentAt", required: false }));
  requests.fields.add(new DateField({ name: "deleteAfter", required: false }));
  requests.fields.add(new TextField({ name: "lastError", required: false, max: 500 }));
  requests.fields.add(new AutodateField({ name: "created", onCreate: true, onUpdate: false }));
  requests.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }));
  requests.listRule = null;
  requests.viewRule = null;
  requests.createRule = null;
  requests.updateRule = null;
  requests.deleteRule = null;
  requests.indexes = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_deletion_requests_user ON user_deletion_requests (user)",
    "CREATE INDEX IF NOT EXISTS idx_user_deletion_requests_due ON user_deletion_requests (status, deleteAfter)",
  ];
  app.save(requests);
}, () => {});

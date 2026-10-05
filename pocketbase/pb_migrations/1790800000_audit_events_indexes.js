migrate((app) => {
  const audit = app.findCollectionByNameOrId("audit_events");
  if (!audit.fields.getByName("created")) {
    audit.fields.add(new AutodateField({ id: "audit_event_created", name: "created", onCreate: true, onUpdate: false }));
  }
  app.save(audit);
  app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_audit_events_target_created ON audit_events (targetUser, created DESC)").execute();
  app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_audit_events_target_type_created ON audit_events (targetUser, eventType, created DESC)").execute();
}, (app) => {
  app.db().newQuery("DROP INDEX IF EXISTS idx_audit_events_target_created").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_audit_events_target_type_created").execute();
});

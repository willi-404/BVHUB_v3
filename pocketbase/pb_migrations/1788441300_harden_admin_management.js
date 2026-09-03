/// <reference path="../pb_data/types.d.ts" />

const ACTIVE_VERIFIED = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
const ELEVATED = `${ACTIVE_VERIFIED} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;

function ensureField(collection, definition, FieldType) {
  if (!collection.fields.getByName(definition.name)) collection.fields.add(new FieldType(definition));
}

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const groups = app.findCollectionByNameOrId("groups");
  const userGroups = app.findCollectionByNameOrId("user_groups");

  // The auth collection owns this setting; existing records are repaired as well.
  users.emailVisibility = true;
  app.findAllRecords("users").forEach((record) => {
    if (record.getBool("emailVisibility") !== true) {
      record.set("emailVisibility", true);
      app.save(record);
    }
  });

  // Group writes are exposed only through the transaction-backed management route.
  // This prevents direct requests from bypassing target/group validation.
  userGroups.createRule = null;
  userGroups.updateRule = null;
  userGroups.deleteRule = null;
  app.save(userGroups);

  // Keep the canonical management groups in the existing many-to-many collection.
  ["Member ER", "Member NUE", "Guest"].forEach((name) => {
    try {
      app.findFirstRecordByData("groups", "name", name);
    } catch (_) {
      const record = new Record(groups);
      record.set("name", name);
      record.set("active", true);
      app.save(record);
    }
  });

  let audit;
  try {
    audit = app.findCollectionByNameOrId("audit_events");
  } catch (_) {
    audit = new Collection({
      name: "audit_events",
      type: "base",
      system: false,
      fields: [
        { id: "event_type", name: "eventType", type: "text", required: true, max: 80 },
        { id: "actor_user", name: "actorUser", type: "text", required: true, max: 15 },
        { id: "target_user", name: "targetUser", type: "text", required: true, max: 15 },
        { id: "metadata", name: "metadata", type: "json", required: false },
      ],
    });
  }
  ensureField(audit, { id: "event_type", name: "eventType", type: "text", required: true, max: 80 }, TextField);
  ensureField(audit, { id: "actor_user", name: "actorUser", type: "text", required: true, max: 15 }, TextField);
  ensureField(audit, { id: "target_user", name: "targetUser", type: "text", required: true, max: 15 }, TextField);
  ensureField(audit, { id: "metadata", name: "metadata", type: "json", required: false }, JSONField);
  audit.listRule = null;
  audit.viewRule = null;
  audit.createRule = null;
  audit.updateRule = null;
  audit.deleteRule = null;
  app.save(audit);

  // PocketBase's JS bridge exposes auth options as a read-only nested value on
  // some 0.40 builds. Persist the duration through the collection options JSON
  // so the setting is deterministic across fresh and upgraded instances.
  app.db().newQuery(`UPDATE _collections SET options = json_set(options, '$.authToken.duration', 43200) WHERE id = '${users.id}'`).execute();
}, (app) => {
  // This migration is intentionally additive. Data and auth settings are retained on rollback.
  try { app.delete(app.findCollectionByNameOrId("audit_events")); } catch (_) {}
});

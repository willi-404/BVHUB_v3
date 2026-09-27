/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
  const users = app.findCollectionByNameOrId("users");
  const announcements = new Collection({ name: "announcements", type: "base", system: false, fields: [] });
  for (const field of [
    ["announcement_zh_title", "zhTitle", 100],
    ["announcement_zh_content", "zhContent", 800],
    ["announcement_de_title", "deTitle", 100],
    ["announcement_de_content", "deContent", 800],
  ]) announcements.fields.add(new TextField({ id: field[0], name: field[1], required: false, max: field[2], pattern: "" }));
  announcements.fields.add(new AutodateField({ id: "announcement_created", name: "created", onCreate: true, onUpdate: false }));
  announcements.fields.add(new AutodateField({ id: "announcement_updated", name: "updated", onCreate: true, onUpdate: true }));
  announcements.listRule = ACTIVE_AUTH; announcements.viewRule = ACTIVE_AUTH; announcements.createRule = null; announcements.updateRule = null; announcements.deleteRule = null;
  app.save(announcements);

  const slots = new Collection({ name: "announcement_slots", type: "base", system: false, fields: [] });
  slots.fields.add(new SelectField({ id: "announcement_slot_locale", name: "locale", required: true, maxSelect: 1, values: ["zh", "de"] }));
  slots.fields.add(new NumberField({ id: "announcement_slot_position", name: "position", required: true, onlyInt: true, min: 1, max: 5 }));
  slots.fields.add(new RelationField({ id: "announcement_slot_announcement", name: "announcement", required: true, collectionId: announcements.id, minSelect: 1, maxSelect: 1, cascadeDelete: true }));
  slots.fields.add(new AutodateField({ id: "announcement_slot_created", name: "created", onCreate: true, onUpdate: false }));
  slots.fields.add(new AutodateField({ id: "announcement_slot_updated", name: "updated", onCreate: true, onUpdate: true }));
  slots.listRule = ACTIVE_AUTH; slots.viewRule = ACTIVE_AUTH; slots.createRule = null; slots.updateRule = null; slots.deleteRule = null;
  slots.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_slots_locale_position ON announcement_slots (locale, position)", "CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_slots_locale_announcement ON announcement_slots (locale, announcement)"];
  app.save(slots);

  const reads = new Collection({ name: "announcement_reads", type: "base", system: false, fields: [] });
  reads.fields.add(new RelationField({ id: "announcement_read_user", name: "user", required: true, collectionId: users.id, minSelect: 1, maxSelect: 1, cascadeDelete: true }));
  reads.fields.add(new RelationField({ id: "announcement_read_announcement", name: "announcement", required: true, collectionId: announcements.id, minSelect: 1, maxSelect: 1, cascadeDelete: true }));
  reads.fields.add(new AutodateField({ id: "announcement_read_created", name: "created", onCreate: true, onUpdate: false }));
  reads.fields.add(new AutodateField({ id: "announcement_read_updated", name: "updated", onCreate: true, onUpdate: true }));
  const READ_ACCESS = `${ACTIVE_AUTH} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  reads.listRule = READ_ACCESS; reads.viewRule = READ_ACCESS; reads.createRule = null; reads.updateRule = null; reads.deleteRule = null;
  reads.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_reads_user_announcement ON announcement_reads (user, announcement)"];
  app.save(reads);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("announcement_reads")); } catch (_) {}
  try { app.delete(app.findCollectionByNameOrId("announcement_slots")); } catch (_) {}
  try { app.delete(app.findCollectionByNameOrId("announcements")); } catch (_) {}
});

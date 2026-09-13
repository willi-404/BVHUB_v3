/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const outbox = app.findCollectionByNameOrId("notification_outbox");
  // The original registration+kind index permits only one status mail per
  // registration. Status transitions need independent, stable dedupe keys.
  outbox.indexes = outbox.indexes.filter((index) => !String(index).includes("idx_notification_outbox_registration_kind") && !String(index).includes("idx_notification_outbox_dedupe") && !String(index).includes("idx_notification_outbox_pending"));
  outbox.indexes.push("CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_dedupe ON notification_outbox (dedupeKey) WHERE dedupeKey != ''");
  outbox.indexes.push("CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox (status, created)");
  app.save(outbox);
}, () => {});

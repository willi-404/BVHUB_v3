/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const payments = app.findCollectionByNameOrId("payments");
  const purpose = payments.fields.getByName("purpose");
  purpose.pattern = "";
  payments.indexes = payments.indexes.filter((index) => !index.includes("idx_payments_purpose"));
  app.save(payments);
}, () => {
  // New payment purposes and duplicate values must remain valid after a rollback.
});

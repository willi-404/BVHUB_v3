/// <reference path="../pb_data/types.d.ts" />

const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
const PAYMENT_READ = `${ACTIVE_AUTH} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;

function purpose(eventId, paymentId) {
  return `BVHUB-EVT-${eventId}-PAY-${paymentId}`;
}

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const events = app.findCollectionByNameOrId("events");
  const registrations = app.findCollectionByNameOrId("event_registrations");

  const payments = new Collection({ name: "payments", type: "base", system: false, fields: [] });
  payments.fields.add(new RelationField({ id: "payment_registration", name: "registration", required: true, collectionId: registrations.id, cascadeDelete: false, minSelect: 1, maxSelect: 1 }));
  payments.fields.add(new RelationField({ id: "payment_event", name: "event", required: true, collectionId: events.id, cascadeDelete: false, minSelect: 1, maxSelect: 1 }));
  payments.fields.add(new RelationField({ id: "payment_user", name: "user", required: true, collectionId: users.id, cascadeDelete: false, minSelect: 1, maxSelect: 1 }));
  payments.fields.add(new SelectField({ id: "payment_role_snapshot", name: "roleSnapshot", required: true, maxSelect: 1, values: ["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"] }));
  payments.fields.add(new BoolField({ id: "payment_required", name: "paymentRequired", required: false, default: false }));
  payments.fields.add(new NumberField({ id: "payment_amount_cents", name: "amountCents", required: false, onlyInt: true, min: 0, max: 99999999999 }));
  payments.fields.add(new SelectField({ id: "payment_status", name: "status", required: true, maxSelect: 1, values: ["PAID", "UNPAID"] }));
  payments.fields.add(new TextField({ id: "payment_purpose", name: "purpose", required: true, min: 1, max: 140, pattern: "^BVHUB-EVT-[a-z0-9]{15}-PAY-[a-z0-9]{15}$" }));
  payments.fields.add(new BoolField({ id: "payment_active", name: "active", required: false, default: true }));
  payments.fields.add(new DateField({ id: "payment_paid_at", name: "paidAt", required: false }));
  payments.fields.add(new RelationField({ id: "payment_paid_by", name: "paidBy", required: false, collectionId: users.id, cascadeDelete: false, minSelect: 0, maxSelect: 1 }));
  payments.fields.add(new AutodateField({ id: "payment_created", name: "created", onCreate: true, onUpdate: false }));
  payments.fields.add(new AutodateField({ id: "payment_updated", name: "updated", onCreate: true, onUpdate: true }));
  payments.listRule = PAYMENT_READ;
  payments.viewRule = PAYMENT_READ;
  payments.createRule = null;
  payments.updateRule = null;
  payments.deleteRule = null;
  payments.indexes = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_registration ON payments (registration)",
    "CREATE INDEX IF NOT EXISTS idx_payments_user_active_status ON payments (user, active, status)",
    "CREATE INDEX IF NOT EXISTS idx_payments_event_active_status ON payments (event, active, status)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_purpose ON payments (purpose)",
  ];
  app.save(payments);

  const settings = new Collection({ name: "payment_settings", type: "base", system: false, fields: [] });
  settings.fields.add(new TextField({ id: "payment_settings_recipient", name: "recipientName", required: false, max: 70, pattern: "" }));
  settings.fields.add(new TextField({ id: "payment_settings_iban", name: "iban", required: false, max: 34, pattern: "" }));
  settings.fields.add(new TextField({ id: "payment_settings_bic", name: "bic", required: false, max: 11, pattern: "" }));
  settings.fields.add(new RelationField({ id: "payment_settings_updated_by", name: "updatedBy", required: false, collectionId: users.id, cascadeDelete: false, minSelect: 0, maxSelect: 1 }));
  settings.fields.add(new AutodateField({ id: "payment_settings_created", name: "created", onCreate: true, onUpdate: false }));
  settings.fields.add(new AutodateField({ id: "payment_settings_updated", name: "updated", onCreate: true, onUpdate: true }));
  settings.listRule = null;
  settings.viewRule = null;
  settings.createRule = null;
  settings.updateRule = null;
  settings.deleteRule = null;
  settings.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_settings_singleton ON payment_settings (id)"];
  app.save(settings);

  const defaults = new Record(settings);
  defaults.set("recipientName", "");
  defaults.set("iban", "");
  defaults.set("bic", "");
  app.save(defaults);

  app.findRecordsByFilter("event_registrations", "status = 'REGISTERED'", "", 100000, 0).forEach((registration) => {
    const existing = app.findRecordsByFilter("payments", `registration = '${registration.id}'`, "", 1, 0)[0];
    if (existing) return;
    const user = app.findRecordById("users", registration.getString("user"));
    const event = app.findRecordById("events", registration.getString("event"));
    const role = user.getString("role");
    const amountCents = role === "GUEST" ? event.getInt("guestFeeCents") : 0;
    const paymentRequired = role === "GUEST" && amountCents > 0;
    const payment = new Record(payments);
    payment.id = $security.randomStringWithAlphabet(15, "abcdefghijklmnopqrstuvwxyz0123456789");
    payment.set("registration", registration.id);
    payment.set("event", event.id);
    payment.set("user", user.id);
    payment.set("roleSnapshot", role);
    payment.set("paymentRequired", paymentRequired);
    payment.set("amountCents", amountCents);
    payment.set("status", paymentRequired ? "UNPAID" : "PAID");
    payment.set("purpose", purpose(event.id, payment.id));
    payment.set("active", true);
    app.save(payment);
  });
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("payment_settings")); } catch (_) {}
  try { app.delete(app.findCollectionByNameOrId("payments")); } catch (_) {}
});

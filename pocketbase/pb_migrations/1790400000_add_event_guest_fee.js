/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  let events = app.findCollectionByNameOrId("events");
  let field = events.fields.getByName("guestFeeCents");
  if (!field) {
    field = new NumberField({
      id: "event_guest_fee_cents",
      name: "guestFeeCents",
      required: false,
      onlyInt: true,
      min: 0,
      max: 99999999999,
    });
    events.fields.add(field);
    app.save(events);
    events = app.findCollectionByNameOrId("events");
  }

  app.findAllRecords("events").forEach((record) => {
    record.set("guestFeeCents", 380);
    app.save(record);
  });

  field = events.fields.getByName("guestFeeCents");
  // PocketBase treats numeric zero as blank when a NumberField is required.
  // The admin API enforces presence while keeping EUR 0.00 representable.
  field.required = false;
  field.onlyInt = true;
  field.min = 0;
  field.max = 99999999999;
  app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("events");
  const field = events.fields.getByName("guestFeeCents");
  if (field) events.fields.removeById(field.id);
  app.save(events);
});

/// <reference path="../pb_data/types.d.ts" />

const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
const ADMIN_AUTH = `${ACTIVE_AUTH} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;

function ensureField(collection, definition, FieldType) {
  const current = collection.fields.getByName(definition.name);
  if (!current) collection.fields.add(new FieldType(definition));
  else Object.keys(definition).forEach((key) => { if (key !== "id" && key !== "name" && key !== "type") current[key] = definition[key]; });
}

migrate((app) => {
  let venues;
  try { venues = app.findCollectionByNameOrId("venues"); } catch (_) { venues = new Collection({ name: "venues", type: "base", system: false, fields: [] }); }
  ensureField(venues, { id: "venue_name", name: "name", type: "text", required: true, min: 1, max: 160, pattern: "" }, TextField);
  ensureField(venues, { id: "venue_address", name: "address", type: "text", required: true, min: 1, max: 300, pattern: "" }, TextField);
  ensureField(venues, { id: "venue_description", name: "description", type: "text", required: false, max: 2000, pattern: "" }, TextField);
  ensureField(venues, { id: "venue_active", name: "active", type: "bool", required: false, default: true }, BoolField);
  venues.listRule = `${ACTIVE_AUTH} && (active = true || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  venues.viewRule = venues.listRule;
  venues.createRule = null;
  venues.updateRule = null;
  venues.deleteRule = null;
  venues.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_name ON venues (name)"];
  app.save(venues);

  let events;
  try { events = app.findCollectionByNameOrId("events"); } catch (_) { events = new Collection({ name: "events", type: "base", system: false, fields: [] }); }
  ensureField(events, { id: "event_title", name: "title", type: "text", required: true, min: 1, max: 200, pattern: "" }, TextField);
  ensureField(events, { id: "event_description", name: "description", type: "text", required: false, max: 10000, pattern: "" }, TextField);
  ensureField(events, { id: "event_venue", name: "venue", type: "relation", required: true, collectionId: venues.id, minSelect: 1, maxSelect: 1, cascadeDelete: false }, RelationField);
  ensureField(events, { id: "event_start", name: "start", type: "date", required: true }, DateField);
  ensureField(events, { id: "event_end", name: "end", type: "date", required: true }, DateField);
  ensureField(events, { id: "event_capacity", name: "capacity", type: "number", required: true, min: 1, max: 100000 }, NumberField);
  ensureField(events, { id: "event_registration_open", name: "registrationOpen", type: "bool", required: false, default: false }, BoolField);
  ensureField(events, { id: "event_status", name: "status", type: "select", required: true, maxSelect: 1, values: ["DRAFT", "PUBLISHED", "CANCELLED"] }, SelectField);
  ensureField(events, { id: "event_created_by", name: "createdBy", type: "relation", required: true, collectionId: app.findCollectionByNameOrId("users").id, minSelect: 1, maxSelect: 1, cascadeDelete: false }, RelationField);
  events.listRule = `${ACTIVE_AUTH} && ((status = 'PUBLISHED' && venue.active = true) || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  events.viewRule = events.listRule;
  events.createRule = null;
  events.updateRule = null;
  events.deleteRule = null;
  events.indexes = [
    "CREATE INDEX IF NOT EXISTS idx_events_status_start ON events (status, start)",
    "CREATE INDEX IF NOT EXISTS idx_events_venue ON events (venue)",
  ];
  app.save(events);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("events")); } catch (_) {}
  try { app.delete(app.findCollectionByNameOrId("venues")); } catch (_) {}
});

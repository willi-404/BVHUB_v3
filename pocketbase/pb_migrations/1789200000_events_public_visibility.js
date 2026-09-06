/// <reference path="../pb_data/types.d.ts" />

const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";

migrate((app) => {
  const events = app.findCollectionByNameOrId("events");
  events.listRule = `${ACTIVE_AUTH} && (published = true || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  events.viewRule = events.listRule;
  app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("events");
  events.listRule = `${ACTIVE_AUTH} && ((published = true && venue.active = true) || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  events.viewRule = events.listRule;
  app.save(events);
});

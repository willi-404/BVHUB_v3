/// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "GET",
  "/api/bvhub/venues",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAuthenticatedReader(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    return e.json(200, service.listVenues($app, false));
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "GET",
  "/api/bvhub/admin/venues",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    return e.json(200, service.listVenues($app, true));
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "POST",
  "/api/bvhub/admin/venues",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    const data = service.parseVenue(
      service.payload(e, ["name", "address", "description", "active"]),
    );
    const record = new Record($app.findCollectionByNameOrId("venues"));
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    try {
      $app.save(record);
    } catch (_) {
      throw new ApiError(409, "Veranstaltungsort existiert bereits", {});
    }
    return e.json(201, service.venueDto(record));
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "PATCH",
  "/api/bvhub/admin/venues/{id}",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    const record = service.venue($app, service.idOf(e));
    const data = service.parseVenue(
      service.payload(e, ["name", "address", "description", "active"]),
      record,
    );
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    try {
      $app.save(record);
    } catch (_) {
      throw new ApiError(409, "Veranstaltungsort existiert bereits", {});
    }
    return e.json(200, service.venueDto(record));
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "DELETE",
  "/api/bvhub/admin/venues/{id}",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    const record = service.venue($app, service.idOf(e));
    const used = $app.findRecordsByFilter(
      "events",
      `venue = '${record.id}'`,
      "",
      1,
      0,
    );
    if (used.length)
      throw new ApiError(409, "Veranstaltungsort wird verwendet", {});
    $app.delete(record);
    return e.json(204, {});
  },
  $apis.requireAuth("users"),
);

routerAdd(
  "GET",
  "/api/bvhub/events",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    const result = service.publicEvents($app, e);
    if (result.forbidden) throw new ForbiddenError("Zugriff nicht erlaubt");
    return e.json(200, result);
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "GET",
  "/api/bvhub/events/{id}",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    const result = service.publicEvents($app, e, service.idOf(e));
    if (result.forbidden) throw new ForbiddenError("Zugriff nicht erlaubt");
    return e.json(200, result);
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "GET",
  "/api/bvhub/admin/events",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    const records = $app.findRecordsByFilter("events", "id != ''", "start", 500, 0);
    return e.json(200, {
      items: records.map((record) => service.eventDto($app, record)),
      totalItems: records.length,
    });
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "POST",
  "/api/bvhub/admin/events",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    const current = e.auth;
    const data = service.parseEvent(
      service.payload(e, [
        "title",
        "description",
        "venue",
        "start",
        "end",
        "capacity",
        "registrationOpen",
        "status",
      ]),
    );
    const v = service.venue($app, data.venue);
    if (data.status === "PUBLISHED" && !v.getBool("active"))
      throw new ApiError(409, "Aktiver Veranstaltungsort erforderlich", {});
    const record = new Record($app.findCollectionByNameOrId("events"));
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    record.set("createdBy", current.id);
    $app.save(record);
    return e.json(201, service.eventDto($app, record));
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "PATCH",
  "/api/bvhub/admin/events/{id}",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    const record = service.event($app, service.idOf(e));
    const data = service.parseEvent(
      service.payload(e, [
        "title",
        "description",
        "venue",
        "start",
        "end",
        "capacity",
        "registrationOpen",
        "status",
      ]),
      record,
    );
    const v = service.venue($app, data.venue);
    if (data.status === "PUBLISHED" && !v.getBool("active"))
      throw new ApiError(409, "Aktiver Veranstaltungsort erforderlich", {});
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    $app.save(record);
    return e.json(200, service.eventDto($app, record));
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "DELETE",
  "/api/bvhub/admin/events/{id}",
  (e) => {
    const service = require(`${__hooks}/venue-event-service.js`);
    if (!service.requireAdminActor(e)) throw new ForbiddenError("Zugriff nicht erlaubt");
    const record = service.event($app, service.idOf(e));
    if (record.getString("status") === "PUBLISHED") {
      record.set("status", "CANCELLED");
      record.set("registrationOpen", false);
      $app.save(record);
      return e.json(200, service.eventDto($app, record));
    }
    $app.delete(record);
    return e.json(204, {});
  },
  $apis.requireAuth("users"),
);

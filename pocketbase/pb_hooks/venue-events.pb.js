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
      service.payload(e, ["name", "address", "description", "checkoutRegion", "active"]),
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
      service.payload(e, ["name", "address", "description", "checkoutRegion", "active"]),
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
    let records = [];
    ["MEMBERS_ONLY", "OPEN_TO_ALL", "CANCELLED", "COMPLETED"].forEach((status) => { records = records.concat($app.findRecordsByFilter("events", `status = '${status}'`, "", 100, 0)); });
    records.sort((a, b) => { const startDelta = Date.parse(b.getString("start")) - Date.parse(a.getString("start")); if (startDelta) return startDelta; return Date.parse(b.getString("created")) - Date.parse(a.getString("created")); });
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
        "published",
        "status",
      ]),
    );
    const v = service.venue($app, data.venue);
    if (data.published && (!v.getBool("active") || !v.getString("checkoutRegion")))
      throw new ApiError(409, "Aktiver Veranstaltungsort erforderlich", {});
    const record = new Record($app.findCollectionByNameOrId("events"));
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    record.set("createdBy", current.id);
    $app.save(record);
    service.appendChangelog($app, record, current, {
      title: { old: null, new: data.title }, description: { old: null, new: data.description }, venue: { old: null, new: data.venue }, start: { old: null, new: data.start }, end: { old: null, new: data.end }, capacity: { old: null, new: data.capacity }, status: { old: null, new: data.status }, published: { old: null, new: data.published },
    }, "CREATED");
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
        "published",
        "status",
      ]),
      record,
    );
    const v = service.venue($app, data.venue);
    if (data.published && (!v.getBool("active") || !v.getString("checkoutRegion")))
      throw new ApiError(409, "Aktiver Veranstaltungsort erforderlich", {});
    const changes = {};
    Object.keys(data).forEach((key) => { const old = key === "venue" ? record.getString(key) : key === "published" ? record.getBool(key) : key === "capacity" ? record.getInt(key) : record.getString(key); const equal = ["start", "end"].includes(key) ? Date.parse(old) === Date.parse(data[key]) : old === data[key]; if (!equal) changes[key] = { old, new: data[key] }; record.set(key, data[key]); });
    $app.runInTransaction((txApp) => { txApp.save(record); service.appendChangelog(txApp, record, e.auth, changes); });
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
    if (record.getBool("published") && record.getString("status") !== "CANCELLED") {
      const previous = record.getString("status");
      record.set("status", "CANCELLED");
      $app.runInTransaction((txApp) => { txApp.save(record); service.appendChangelog(txApp, record, e.auth, { status: { old: previous, new: "CANCELLED" } }, "CANCELLED"); });
      return e.json(200, service.eventDto($app, record));
    }
    $app.delete(record);
    return e.json(204, {});
  },
  $apis.requireAuth("users"),
);

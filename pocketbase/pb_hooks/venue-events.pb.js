/// <reference path="../pb_data/types.d.ts" />
const service = require(`${__hooks}/venue-event-service.js`);

function requireUser(e) {
  const record = e.auth;
  return (
    record &&
    record.getBool("active") === true &&
    record.getBool("verified") === true
  );
}
function requireAdmin(e) {
  return (
    requireUser(e) &&
    ["ADMIN", "SUPER_ADMIN"].includes(e.auth.getString("role"))
  );
}
function idOf(e) {
  return e.request && typeof e.request.pathValue === "function"
    ? e.request.pathValue("id")
    : "";
}
function venueInput(e) {
  const body = e.requestInfo().body || {};
  const name = String(body.name || "").trim().replace(/[ \t\r\n]+/g, " ");
  const address = String(body.address || "").trim().replace(/[ \t\r\n]+/g, " ");
  const description = String(body.description || "").trim();
  if (!name || !address || name.length > 160 || address.length > 300 || description.length > 2000) throw new BadRequestError("Ungültige Veranstaltungsdaten");
  return { name, address, description, active: body.active === undefined ? true : body.active === true };
}
function listVenues(admin) {
  const records = $app.findRecordsByFilter("venues", admin ? "id != ''" : "active = true", "+name", 100, 1);
  return {
    items: records.map((record) => service.venueDto(record)),
    totalItems: records.length,
  };
}
function canRead(e) { return e.auth && e.auth.getBool("active") === true && e.auth.getBool("verified") === true; }

routerAdd(
  "GET",
  "/api/bvhub/venues",
  (e) => {
    if (!canRead(e)) return e.json(403, { message: "forbidden" });
    return e.json(200, { items: [], totalItems: 0 });
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "GET",
  "/api/bvhub/admin/venues",
  (e) => {
    if (!canRead(e) || !["ADMIN", "SUPER_ADMIN"].includes(e.auth.getString("role"))) return e.json(403, { message: "forbidden" });
    return e.json(200, listVenues(true));
  },
  $apis.requireAuth("users"),
);
routerAdd(
  "POST",
  "/api/bvhub/admin/venues",
  (e) => {
  if (!canRead(e) || !["ADMIN", "SUPER_ADMIN"].includes(e.auth.getString("role"))) return e.json(403, { message: "forbidden" });
    const data = venueInput(e);
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
    if (!canRead(e) || !["ADMIN", "SUPER_ADMIN"].includes(e.auth.getString("role"))) return e.json(403, { message: "forbidden" });
    const record = service.venue($app, idOf(e));
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
    if (!canRead(e) || !["ADMIN", "SUPER_ADMIN"].includes(e.auth.getString("role"))) return e.json(403, { message: "forbidden" });
    const record = service.venue($app, idOf(e));
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

function publicEvents(e, detailId) {
  if (!canRead(e)) return { forbidden: true };
  if (detailId) {
    const record = service.event($app, detailId);
    if (
      record.getString("status") !== "PUBLISHED" ||
      !service.venue($app, record.getString("venue")).getBool("active")
    )
      throw new ApiError(404, "Event nicht gefunden", {});
    return service.eventDto($app, record);
  }
  const records = $app
    .findRecordsByFilter(
      "events",
      "status = 'PUBLISHED' && start >= @now",
      "start",
      500,
      0,
    )
    .filter((record) =>
      service.venue($app, record.getString("venue")).getBool("active"),
    );
  return {
    items: records.map((record) => service.eventDto($app, record)),
    totalItems: records.length,
  };
}
routerAdd(
  "GET",
  "/api/bvhub/events",
  (e) => { const result = publicEvents(e); return result.forbidden ? e.json(403, { message: "forbidden" }) : e.json(200, result); },
  $apis.requireAuth("users"),
);
routerAdd(
  "GET",
  "/api/bvhub/events/{id}",
  (e) => { const result = publicEvents(e, idOf(e)); return result.forbidden ? e.json(403, { message: "forbidden" }) : e.json(200, result); },
  $apis.requireAuth("users"),
);
routerAdd(
  "GET",
  "/api/bvhub/admin/events",
  (e) => {
    if (!canRead(e) || !["ADMIN", "SUPER_ADMIN"].includes(e.auth.getString("role"))) return e.json(403, { message: "forbidden" });
    const records = $app.findRecordsByFilter("events", "", "start", 500, 0);
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
    if (!canRead(e) || !["ADMIN", "SUPER_ADMIN"].includes(e.auth.getString("role"))) return e.json(403, { message: "forbidden" });
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
    if (!canRead(e) || !["ADMIN", "SUPER_ADMIN"].includes(e.auth.getString("role"))) return e.json(403, { message: "forbidden" });
    const record = service.event($app, idOf(e));
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
    if (!requireAdmin(e)) return e.json(403, { message: "forbidden" });
    const record = service.event($app, idOf(e));
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

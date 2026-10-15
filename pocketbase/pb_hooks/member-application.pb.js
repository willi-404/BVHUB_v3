/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/bvhub/me/member-application", (e) => {
  e.response.header().set("Cache-Control", "no-store");
  return e.json(200, require(`${__hooks}/member-application-service.js`).current(e));
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/bvhub/me/member-application", (e) => {
  e.response.header().set("Cache-Control", "no-store");
  return e.json(200, require(`${__hooks}/member-application-service.js`).submit(e));
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/bvhub/me/member-application/retry", (e) => {
  e.response.header().set("Cache-Control", "no-store");
  return e.json(200, require(`${__hooks}/member-application-service.js`).retry(e));
}, $apis.requireAuth("users"));

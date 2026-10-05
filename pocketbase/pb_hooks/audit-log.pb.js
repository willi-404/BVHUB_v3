/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/bvhub/me/audit-log", (e) => {
  const user = require(`${__hooks}/profile-service.js`).user(e);
  return require(`${__hooks}/audit-log-service.js`).list(e, user.id);
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/users/{id}/audit-log", (e) => {
  const service = require(`${__hooks}/admin-service.js`);
  service.actor(e);
  const target = service.findUser($app, service.pathId(e));
  return require(`${__hooks}/audit-log-service.js`).list(e, target.id);
}, $apis.requireAuth("users"));

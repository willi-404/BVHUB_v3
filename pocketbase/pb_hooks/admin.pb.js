/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/bvhub/admin/groups", (e) => {
  const service = require(`${__hooks}/admin-service.js`);
  service.actor(e);
  return e.json(200, { groups: service.groupRecords($app).map((group) => ({ id: group.id, name: group.getString("name"), active: group.getBool("active") })) });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/users", (e) => {
  const service = require(`${__hooks}/admin-service.js`);
  service.actor(e);
  const query = e.requestInfo().query || {};
  const search = String(query.search || "").trim().toLocaleLowerCase();
  const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10) || 1);
  const perPage = Math.min(100, Math.max(1, Number.parseInt(String(query.perPage || "50"), 10) || 50));
  let users = $app.findRecordsByFilter("users", "role != 'SUPER_ADMIN'", "displayName,firstName,lastName,email", 10000, 0);
  if (search) users = users.filter((user) => ["email", "displayName", "firstName", "lastName"].some((field) => user.getString(field).toLocaleLowerCase().includes(search)));
  const totalItems = users.length;
  const items = users.slice((page - 1) * perPage, page * perPage).map((user) => service.userDto($app, user));
  return e.json(200, { items, page, perPage, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / perPage)) });
}, $apis.requireAuth("users"));

routerAdd("PUT", "/api/bvhub/admin/users/{id}/groups", (e) => {
  const service = require(`${__hooks}/admin-service.js`);
  const current = service.actor(e);
  const targetId = service.pathId(e);
  const payload = service.body(e);
  if (Object.keys(payload).length !== 1 || !Object.hasOwn(payload, "groups")) throw new BadRequestError("Ungültige Gruppenänderung");
  const target = service.findUser($app, targetId);
  if (target.id === current.id || !service.MANAGED_ROLES.includes(target.getString("role"))) throw new ForbiddenError("Dieser Benutzer darf nicht verwaltet werden");
  const ids = service.targetGroupIds($app, payload.groups);

  $app.runInTransaction((txApp) => {
    txApp.findRecordsByFilter("user_groups", `user = '${target.id}'`, "", 100, 0).forEach((assignment) => txApp.delete(assignment));
    ids.forEach((groupId) => {
      const assignment = new Record(txApp.findCollectionByNameOrId("user_groups"));
      assignment.set("user", target.id);
      assignment.set("group", groupId);
      txApp.save(assignment);
    });
    service.audit(txApp, current.id, target.id, "USER_GROUPS_CHANGED");
  });
  return e.json(200, service.userDto($app, service.findUser($app, targetId)));
}, $apis.requireAuth("users"));

routerAdd("PATCH", "/api/bvhub/admin/users/{id}/role", (e) => {
  const service = require(`${__hooks}/admin-service.js`);
  const current = service.actor(e);
  const actorRole = current.getString("role");
  const targetId = service.pathId(e);
  const payload = service.body(e);
  if (Object.keys(payload).length !== 2 || payload.confirmation !== "ROLE_CHANGE" || !["ADMIN", "MEMBER", "GUEST"].includes(payload.role)) throw new BadRequestError("Bestätigung oder Zielrolle ungültig");
  const target = service.findUser($app, targetId);
  const previousRole = target.getString("role");
  if (target.id === current.id || previousRole === "SUPER_ADMIN") throw new ForbiddenError("Dieser Benutzer darf nicht verwaltet werden");
  if (actorRole === "ADMIN" && (!service.MANAGED_ROLES.includes(previousRole) || !service.MANAGED_ROLES.includes(payload.role))) throw new ForbiddenError("Admins dürfen nur Gäste und Mitglieder verwalten");
  if (actorRole === "SUPER_ADMIN" && ![...service.MANAGED_ROLES, "ADMIN"].includes(previousRole)) throw new ForbiddenError("Diese Zielrolle darf nicht verwaltet werden");
  if (payload.role === previousRole) throw new BadRequestError("Die Rolle ist bereits gesetzt");

  // Generate the replacement before entering the transaction, then persist the
  // role, token invalidation and audit atomically through the scoped app.
  target.refreshTokenKey();
  const tokenKey = target.getString("tokenKey");
  $app.runInTransaction((txApp) => {
    txApp.db().newQuery("UPDATE users SET role = {:role}, tokenKey = {:tokenKey} WHERE id = {:id}").bind({ role: payload.role, tokenKey, id: targetId }).execute();
    service.audit(txApp, current.id, targetId, "USER_ROLE_CHANGED");
    require(`${__hooks}/dashboard-statistics-service.js`).upsertSnapshot(txApp, new Date());
  });
  return e.json(200, service.userDto($app, service.findUser($app, targetId)));
}, $apis.requireAuth("users"));

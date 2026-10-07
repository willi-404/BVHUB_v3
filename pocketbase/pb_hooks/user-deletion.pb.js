/// <reference path="../pb_data/types.d.ts" />

onRecordDeleteRequest(() => { throw new ForbiddenError("Benutzer können nur über die Löschverwaltung entfernt werden"); }, "users");

onRecordUpdateRequest((e) => {
  require(`${__hooks}/user-deletion-service.js`).assertNotDeleting(e.app, e.record.id);
  e.next();
}, "users");

routerAdd("POST", "/api/bvhub/admin/users/{id}/deletion", (e) => {
  const admin = require(`${__hooks}/admin-service.js`);
  const actor = admin.actor(e);
  const id = admin.pathId(e);
  const body = admin.body(e);
  if (Object.keys(body).length !== 1 || body.confirmationId !== id) throw new BadRequestError("Benutzer-ID stimmt nicht überein");
  return e.json(202, require(`${__hooks}/user-deletion-service.js`).start(e.app, actor, id));
}, $apis.requireAuth("users"));

cronAdd("user-deletion-cleanup", "* * * * *", () => {
  const service = require(`${__hooks}/user-deletion-service.js`);
  const now = new Date();
  const due = $app.findRecordsByFilter("user_deletion_requests", "status = 'SCHEDULED' && deleteAfter <= {:now}", "deleteAfter", 10000, 0, { now: now.toISOString() });
  for (const request of due) {
    try { service.purge($app, request, now); }
    catch (error) {
      try {
        const job = $app.findRecordById("user_deletion_requests", request.id);
        job.set("lastError", String(error && error.message || error).slice(0, 500));
        $app.save(job);
      } catch (_) {}
      $app.logger().error("[bvhub deletion] cleanup blocked", "requestId", request.id, "err", error);
    }
  }
});

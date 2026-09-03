const MANAGED_ROLES = ["GUEST", "MEMBER"];
const MANAGED_GROUPS = ["Member ER", "Member NUE", "Guest"];

function pathId(e) {
  const value = e.request && typeof e.request.pathValue === "function" ? e.request.pathValue("id") : "";
  if (value) return value;
  const path = String(e.request && e.request.url && e.request.url.path || "");
  const parts = path.split("/").filter(Boolean);
  return parts.at(-2) || "";
}

function body(e) {
  const value = e.requestInfo().body;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestError("Ungültige Verwaltungsdaten");
  return value;
}

function actor(e, superOnly = false) {
  const record = e.auth;
  if (!record || record.getBool("active") !== true || record.getBool("verified") !== true) throw new ForbiddenError("Verwaltungszugriff nicht erlaubt");
  const role = record.getString("role");
  if (superOnly ? role !== "SUPER_ADMIN" : !["ADMIN", "SUPER_ADMIN"].includes(role)) throw new ForbiddenError("Verwaltungszugriff nicht erlaubt");
  return record;
}

function findUser(app, id) {
  if (!id || !/^[a-z0-9]{15}$/.test(id)) throw new BadRequestError("Ungültige Benutzer-ID");
  try { return app.findRecordById("users", id); } catch (_) { throw new ApiError(404, "Benutzer nicht gefunden", {}); }
}

function groupRecords(app) {
  return app.findRecordsByFilter("groups", "active = true", "name", 100, 0)
    .filter((group) => MANAGED_GROUPS.includes(group.getString("name")));
}

function groupsFor(app, userId) {
  const allowed = new Map(groupRecords(app).map((group) => [group.id, group]));
  return app.findRecordsByFilter("user_groups", `user = '${userId}'`, "created", 100, 0)
    .map((assignment) => {
      const group = allowed.get(assignment.getString("group"));
      if (!group) return null;
      return {
        membershipId: assignment.id,
        id: group.id,
        name: group.getString("name"),
        active: group.getBool("active"),
        created: assignment.getString("created"),
        updated: assignment.getString("updated"),
      };
    })
    .filter(Boolean);
}

function userDto(app, user) {
  return {
    id: user.id,
    username: user.getString("username") || user.getString("email"),
    displayName: user.getString("displayName"),
    firstName: user.getString("firstName"),
    lastName: user.getString("lastName"),
    email: user.getString("email"),
    role: user.getString("role"),
    active: user.getBool("active"),
    verified: user.getBool("verified"),
    created: user.getString("created"),
    updated: user.getString("updated"),
    groups: groupsFor(app, user.id),
  };
}

function audit(app, actorId, targetId, eventType, metadata) {
  const collection = app.findCollectionByNameOrId("audit_events");
  const record = new Record(collection);
  record.set("eventType", eventType);
  record.set("actorUser", actorId);
  record.set("targetUser", targetId);
  if (metadata !== undefined) {
    try { record.set("metadata", JSON.stringify(metadata)); } catch (_) {}
  }
  app.save(record);
}

function targetGroupIds(app, value) {
  if (!Array.isArray(value) || value.length > MANAGED_GROUPS.length || value.some((id) => typeof id !== "string" || !/^[a-z0-9]{15}$/.test(id))) {
    throw new BadRequestError("Ungültige Gruppen");
  }
  const unique = new Set(value);
  if (unique.size !== value.length) throw new BadRequestError("Doppelte Gruppen sind nicht erlaubt");
  const allowed = new Map(groupRecords(app).map((group) => [group.id, group]));
  if (value.some((id) => !allowed.has(id))) throw new BadRequestError("Gruppe nicht erlaubt");
  return value;
}

module.exports = { MANAGED_GROUPS, MANAGED_ROLES, body, actor, findUser, groupRecords, groupsFor, userDto, audit, targetGroupIds, pathId };

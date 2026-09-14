const MEMBER_ROLES = ["MEMBER", "ADMIN", "SUPER_ADMIN"];
const MEMBER_GROUPS = ["Member ER", "Member NUE"];
const MIN_TTL_SECONDS = 30;
const MAX_TTL_SECONDS = 900;

function isCurrentMember(app, user) {
  if (!user || user.getBool("active") !== true || user.getBool("verified") !== true) return false;
  if (!MEMBER_ROLES.includes(user.getString("role"))) return false;
  return app.findRecordsByFilter("user_groups", `user = '${user.id}'`, "", 100, 0).some((assignment) => {
    try {
      const group = app.findRecordById("groups", assignment.getString("group"));
      return group.getBool("active") === true && MEMBER_GROUPS.includes(group.getString("name"));
    } catch (_) {
      return false;
    }
  });
}

function currentMemberGroups(app, user) {
  const groups = [];
  app.findRecordsByFilter("user_groups", `user = '${user.id}'`, "", 100, 0).forEach((assignment) => {
    try {
      const group = app.findRecordById("groups", assignment.getString("group"));
      if (group.getBool("active") === true && MEMBER_GROUPS.includes(group.getString("name"))) groups.push(group.getString("name"));
    } catch (_) {}
  });
  return [...new Set(groups)];
}

function settings(app) {
  let record;
  try { record = app.findFirstRecordByFilter("member_card_settings", "id != ''"); } catch (_) { return null; }
  const ttl = record.getInt("tokenTtlSeconds");
  const refreshLead = record.getInt("refreshLeadSeconds");
  if (ttl < MIN_TTL_SECONDS || ttl > MAX_TTL_SECONDS || refreshLead < 1 || refreshLead >= ttl) return null;
  return { record, enabled: record.getBool("enabled") === true, tokenTtlSeconds: ttl, refreshLeadSeconds: refreshLead };
}

function requestBody(e) {
  const body = e.requestInfo().body;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequestError("Invalid request");
  return body;
}

function tokenFromBody(e) {
  const body = requestBody(e);
  if (Object.keys(body).length !== 1 || typeof body.token !== "string" || !/^[A-Za-z0-9]{48,256}$/.test(body.token)) throw new BadRequestError("Invalid request");
  return body.token;
}

function admin(e, superOnly = false) {
  const user = e.auth;
  if (!user || user.getBool("active") !== true || user.getBool("verified") !== true) throw new ForbiddenError("Forbidden");
  const role = user.getString("role");
  if (superOnly ? role !== "SUPER_ADMIN" : !["ADMIN", "SUPER_ADMIN"].includes(role)) throw new ForbiddenError("Forbidden");
  return user;
}

function settingsPayload(e) {
  const body = requestBody(e);
  if (Object.keys(body).some((key) => !["enabled", "tokenTtlSeconds", "refreshLeadSeconds"].includes(key)) || Object.keys(body).length === 0) throw new BadRequestError("Invalid settings");
  const value = {};
  if (Object.hasOwn(body, "enabled")) {
    if (typeof body.enabled !== "boolean") throw new BadRequestError("Invalid settings");
    value.enabled = body.enabled;
  }
  if (Object.hasOwn(body, "tokenTtlSeconds")) {
    if (!Number.isInteger(body.tokenTtlSeconds) || body.tokenTtlSeconds < MIN_TTL_SECONDS || body.tokenTtlSeconds > MAX_TTL_SECONDS) throw new BadRequestError("Invalid settings");
    value.tokenTtlSeconds = body.tokenTtlSeconds;
  }
  if (Object.hasOwn(body, "refreshLeadSeconds")) {
    if (!Number.isInteger(body.refreshLeadSeconds) || body.refreshLeadSeconds < 1 || body.refreshLeadSeconds >= 900) throw new BadRequestError("Invalid settings");
    value.refreshLeadSeconds = body.refreshLeadSeconds;
  }
  const current = settings($app);
  const ttl = value.tokenTtlSeconds ?? current?.tokenTtlSeconds;
  const lead = value.refreshLeadSeconds ?? current?.refreshLeadSeconds;
  if (!Number.isInteger(ttl) || !Number.isInteger(lead) || lead >= ttl) throw new BadRequestError("Invalid settings");
  return value;
}

function settingsDto(value) {
  return { enabled: value.enabled === true, tokenTtlSeconds: value.tokenTtlSeconds, refreshLeadSeconds: value.refreshLeadSeconds };
}

function noStore(e) {
  e.response.header().set("Cache-Control", "no-store");
  e.response.header().set("Pragma", "no-cache");
}

function invalid(e) {
  noStore(e);
  return e.json(200, { valid: false });
}

module.exports = { MEMBER_GROUPS, isCurrentMember, currentMemberGroups, settings, settingsPayload, settingsDto, admin, tokenFromBody, noStore, invalid };

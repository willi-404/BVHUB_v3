/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/bvhub/me/member-card-token", (e) => {
  const api = require(`${__hooks}/member-card-service.js`);
  api.noStore(e);
  const user = e.auth;
  if (!user || user.getBool("active") !== true || user.getBool("verified") !== true || !api.isCurrentMember($app, user)) throw new ForbiddenError("Member card unavailable");
  const config = api.settings($app);
  if (!config || config.enabled !== true) throw new ForbiddenError("Member card unavailable");

  const rawToken = $security.randomString(48);
  const tokenHash = $security.sha256(rawToken);
  const expiresAt = new Date(Date.now() + config.tokenTtlSeconds * 1000).toISOString();
  const record = new Record($app.findCollectionByNameOrId("member_card_tokens"));
  record.set("user", user.id);
  record.set("tokenHash", tokenHash);
  record.set("expiresAt", expiresAt);
  $app.save(record);
  return e.json(200, {
    token: rawToken,
    expiresAt,
    refreshAt: new Date(Date.now() + (config.tokenTtlSeconds - config.refreshLeadSeconds) * 1000).toISOString(),
  });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/bvhub/member-card/verify", (e) => {
  const api = require(`${__hooks}/member-card-service.js`);
  api.noStore(e);
  const rawToken = api.tokenFromBody(e);

  let tokenRecord;
  try { tokenRecord = $app.findFirstRecordByData("member_card_tokens", "tokenHash", $security.sha256(rawToken)); } catch (_) { return api.invalid(e); }
  if (Date.parse(tokenRecord.getString("expiresAt")) <= Date.now()) return api.invalid(e);

  let user;
  try { user = $app.findRecordById("users", tokenRecord.getString("user")); } catch (_) { return api.invalid(e); }
  const config = api.settings($app);
  if (!config || config.enabled !== true || !api.isCurrentMember($app, user)) return api.invalid(e);

  api.noStore(e);
  return e.json(200, {
    valid: true,
    member: {
      id: user.id,
      displayName: user.getString("displayName"),
      groups: api.currentMemberGroups($app, user),
    },
    tokenExpiresAt: tokenRecord.getString("expiresAt"),
    verifiedAt: new Date().toISOString(),
  });
});

routerAdd("POST", "/api/bvhub/admin/member-card/verify", (e) => {
  const card = require(`${__hooks}/member-card-service.js`);
  const admin = require(`${__hooks}/admin-service.js`);
  card.admin(e);
  card.noStore(e);
  const body = e.requestInfo().body;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.token !== "string") {
    return e.json(200, { status: "INVALID", reason: "MALFORMED_TOKEN" });
  }
  const rawToken = body.token;
  if (!/^[A-Za-z0-9]{48,256}$/.test(rawToken)) return e.json(200, { status: "INVALID", reason: "MALFORMED_TOKEN" });
  const config = card.settings($app);
  if (!config || config.enabled !== true) return e.json(200, { status: "INVALID", reason: "FEATURE_DISABLED" });

  let tokenRecord;
  try { tokenRecord = $app.findFirstRecordByData("member_card_tokens", "tokenHash", $security.sha256(rawToken)); } catch (_) {
    return e.json(200, { status: "INVALID", reason: "UNKNOWN_TOKEN" });
  }
  const tokenExpiresAt = tokenRecord.getString("expiresAt");
  if (Date.parse(tokenExpiresAt) <= Date.now()) return e.json(200, { status: "INVALID", reason: "EXPIRED_TOKEN" });
  let user;
  try { user = $app.findRecordById("users", tokenRecord.getString("user")); } catch (_) {
    return e.json(200, { status: "INVALID", reason: "USER_NOT_FOUND" });
  }
  if (user.getBool("active") !== true) return e.json(200, { status: "INVALID", reason: "INACTIVE_ACCOUNT" });
  if (user.getBool("verified") !== true) return e.json(200, { status: "INVALID", reason: "UNVERIFIED_ACCOUNT" });

  const member = admin.memberDetailDto($app, user);
  const verifiedAt = new Date().toISOString();
  if (card.isCurrentMember($app, user)) return e.json(200, { status: "VALID_MEMBER", reason: null, member, tokenExpiresAt, verifiedAt });
  const reason = user.getString("role") === "GUEST" ? "GUEST_ACCOUNT" : "NO_ACTIVE_MEMBER_GROUP";
  return e.json(200, { status: "GUEST_NON_MEMBER", reason, member, tokenExpiresAt, verifiedAt });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/member-card-settings", (e) => {
  const api = require(`${__hooks}/member-card-service.js`);
  api.admin(e);
  const config = api.settings($app);
  if (!config) throw new InternalServerError("Member card settings unavailable");
  api.noStore(e);
  return e.json(200, api.settingsDto(config));
}, $apis.requireAuth("users"));

routerAdd("PATCH", "/api/bvhub/admin/member-card-settings", (e) => {
  const api = require(`${__hooks}/member-card-service.js`);
  const actor = api.admin(e, true);
  const value = api.settingsPayload(e);
  const config = api.settings($app);
  if (!config) throw new InternalServerError("Member card settings unavailable");
  $app.runInTransaction((txApp) => {
    const record = txApp.findRecordById("member_card_settings", config.record.id);
    Object.keys(value).forEach((key) => record.set(key, value[key]));
    txApp.save(record);
    const audit = new Record(txApp.findCollectionByNameOrId("audit_events"));
    audit.set("eventType", "MEMBER_CARD_SETTINGS_CHANGED");
    audit.set("actorUser", actor.id);
    audit.set("targetUser", actor.id);
    audit.set("metadata", JSON.stringify({ fields: Object.keys(value).sort() }));
    txApp.save(audit);
  });
  api.noStore(e);
  return e.json(200, api.settingsDto(api.settings($app)));
}, $apis.requireAuth("users"));

function cleanupMemberCardTokens() {
  try {
    const cutoff = new Date().toISOString();
    $app.findRecordsByFilter("member_card_tokens", `expiresAt < '${cutoff}'`, "", 500, 0).forEach((record) => $app.delete(record));
  } catch (_) {
    console.error("[bvhub member-card] token cleanup failed");
  }
}

cronAdd("member-card-token-cleanup", "*/20 * * * *", cleanupMemberCardTokens);

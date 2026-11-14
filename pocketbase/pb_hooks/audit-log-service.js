const CATEGORY_EVENTS = {
  1: ["USER_LOGIN", "USER_LOGIN_FAILED"],
  2: ["EVENT_REGISTERED", "EVENT_CANCELLED"],
  3: ["USER_PROFILE_UPDATED"],
  4: ["PARTICIPANT_ADDED", "PARTICIPANT_REMOVED"],
  5: ["USER_ROLE_CHANGED", "USER_GROUPS_CHANGED"],
};
const DEFAULT_CATEGORIES = ["2", "3", "4", "5"];

function categoriesFrom(e) {
  const query = e.requestInfo().query || {};
  if (!Object.hasOwn(query, "categories")) return DEFAULT_CATEGORIES;
  const values = String(query.categories).split(",").filter(Boolean);
  if (values.length > 5 || values.some((value) => !Object.hasOwn(CATEGORY_EVENTS, value))) {
    throw new BadRequestError("Invalid audit log filters");
  }
  return [...new Set(values)];
}

function responseItem(record) {
  let metadata = record.get("metadata");
  if (typeof metadata === "string") {
    try { metadata = JSON.parse(metadata); } catch (_) { metadata = {}; }
  }
  return {
    id: record.id,
    eventType: record.getString("eventType"),
    actorUser: record.getString("actorUser"),
    targetUser: record.getString("targetUser"),
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    created: record.getString("created"),
  };
}

function list(e, targetUser) {
  e.response.header().set("Cache-Control", "no-store");
  e.response.header().set("Pragma", "no-cache");
  const categories = categoriesFrom(e);
  const events = [...new Set(categories.flatMap((category) => CATEGORY_EVENTS[category]))];
  const query = e.requestInfo().query || {};
  const page = Math.max(1, Math.min(10000, Number.parseInt(String(query.page || "1"), 10) || 1));
  const perPage = Math.max(1, Math.min(100, Number.parseInt(String(query.perPage || "30"), 10) || 30));
  if (!events.length) return e.json(200, { items: [], page, perPage, totalItems: 0, totalPages: 0 });

  const eventFilter = events.map((event) => `'${event}'`).join(",");
  const filter = `targetUser = {:target} && (${events.map((event) => `eventType = '${event}'`).join(" || ")})`;
  const count = new DynamicModel({ total: 0 });
  e.app.db().newQuery(`SELECT COUNT(*) AS total FROM audit_events WHERE targetUser = {:target} AND eventType IN (${eventFilter})`).bind({ target: targetUser }).one(count);
  const totalItems = Number(count.total || 0);
  const items = e.app.findRecordsByFilter("audit_events", filter, "-created,-id", perPage, (page - 1) * perPage, { target: targetUser }).map(responseItem);
  return e.json(200, { items, page, perPage, totalItems, totalPages: Math.ceil(totalItems / perPage) });
}

function headerValue(headers, name) {
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase().replace(/_/g, "-") === name);
  const value = key ? headers[key] : "";
  return Array.isArray(value) ? value.join(", ") : String(value || "");
}

function locationText(value, maxLength) {
  let text = value.trim();
  try { text = decodeURIComponent(text); } catch (_) {}
  return text.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

function loginLocation(headers) {
  const city = locationText(headerValue(headers, "cf-ipcity"), 100);
  const region = locationText(headerValue(headers, "cf-region"), 100);
  const rawCountry = locationText(headerValue(headers, "cf-ipcountry"), 2).toUpperCase();
  const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : "";
  return city || region || country ? { city, region, country, source: "cloudflare" } : null;
}

function recordLogin(e, eventType, method) {
  if (!e.record) return;
  const request = require(`${__hooks}/user-deletion-service.js`).requestFor(e.app, e.record.id);
  if (request && ["EMAIL_PENDING", "SCHEDULED"].includes(request.getString("status"))) return;
  const service = require(`${__hooks}/admin-service.js`);
  const headers = e.requestInfo().headers || {};
  const userAgent = headerValue(headers, "user-agent").slice(0, 500);
  const location = loginLocation(headers);
  try {
    service.audit(e.app, e.record.id, e.record.id, eventType, { method, ip: e.realIP(), userAgent, ...(location ? { location } : {}) });
  } catch (_) {
    console.error(`[bvhub audit] login event could not be stored for user ${e.record.id}`);
  }
}

module.exports = { list, recordLogin };

const LOCALES = ["zh", "de"];
const POSITIONS = [1, 2, 3, 4, 5];

function requireUser(e) {
  const user = e.auth;
  if (!user || user.getBool("active") !== true || user.getBool("verified") !== true) throw new ForbiddenError("Zugriff nicht erlaubt");
  return user;
}

function requireAdmin(e) {
  const user = requireUser(e);
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.getString("role"))) throw new ForbiddenError("Zugriff nicht erlaubt");
  return user;
}

function noStore(e) { e.response.header().set("Cache-Control", "no-store"); e.response.header().set("Pragma", "no-cache"); }

function idOf(e) {
  const direct = e.request && typeof e.request.pathValue === "function" ? e.request.pathValue("id") : "";
  const path = String(e.request && e.request.url && e.request.url.path || "");
  const parts = path.split("/").filter(Boolean);
  const marker = parts.indexOf("announcements");
  const id = String(direct || (marker >= 0 && parts[marker + 1]) || parts.at(-1) || "");
  if (!/^[a-zA-Z0-9]{10,30}$/.test(id)) throw new BadRequestError("Ungültige Ankündigungs-ID");
  return id;
}

function text(body, key, max) {
  if (typeof body[key] !== "string") throw new BadRequestError("Ungültige Ankündigung");
  const value = body[key].trim();
  if (Array.from(value).length > max || /[\x00-\x1f\x7f-\x9f]/.test(value)) throw new BadRequestError("Ungültige Ankündigung");
  return value;
}

function parseAnnouncement(body) {
  const allowed = ["zhTitle", "zhContent", "deTitle", "deContent"];
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !allowed.includes(key)) || Object.keys(body).length !== allowed.length) throw new BadRequestError("Ungültige Ankündigungsfelder");
  const value = { zhTitle: text(body, "zhTitle", 100), zhContent: text(body, "zhContent", 800), deTitle: text(body, "deTitle", 100), deContent: text(body, "deContent", 800) };
  const hasZh = value.zhTitle && value.zhContent;
  const hasDe = value.deTitle && value.deContent;
  if (!hasZh && !hasDe) throw new BadRequestError("Mindestens eine Sprache muss vollständig ausgefüllt sein");
  if ((value.zhTitle && !value.zhContent) || (value.zhContent && !value.zhTitle) || (value.deTitle && !value.deContent) || (value.deContent && !value.deTitle)) throw new BadRequestError("Titel und Inhalt müssen gemeinsam ausgefüllt werden");
  return value;
}

function announcementDto(record) {
  return { id: record.id, zhTitle: record.getString("zhTitle"), zhContent: record.getString("zhContent"), deTitle: record.getString("deTitle"), deContent: record.getString("deContent"), created: record.getString("created"), updated: record.getString("updated") };
}

function slotDto(record) { return { position: record.getInt("position"), announcementId: record.getString("announcement") }; }

function slots(app, locale) {
  return app.findRecordsByFilter("announcement_slots", `locale = '${locale}'`, "position", 20, 0).sort((a, b) => a.getInt("position") - b.getInt("position")).map(slotDto);
}

function adminDto(app) { return { announcements: app.findRecordsByFilter("announcements", "", "-updated", 1000, 0).map(announcementDto), slots: { zh: slots(app, "zh"), de: slots(app, "de") } }; }

function localized(record, locale) {
  const primary = locale === "zh" ? ["zhTitle", "zhContent"] : ["deTitle", "deContent"];
  const fallback = locale === "zh" ? ["deTitle", "deContent"] : ["zhTitle", "zhContent"];
  const title = record.getString(primary[0]) || record.getString(fallback[0]);
  const content = record.getString(primary[1]) || record.getString(fallback[1]);
  return { title, content };
}

function userItems(app, userId, locale) {
  const readIds = new Set(app.findRecordsByFilter("announcement_reads", `user = '${userId}'`, "", 1000, 0).map((record) => record.getString("announcement")));
  const currentSlots = slots(app, locale);
  const activePositions = new Map(currentSlots.map((slot) => [slot.announcementId, slot.position]));
  const currentIdsByPosition = new Map(currentSlots.map((slot) => [slot.position, slot.announcementId]));
  const otherLocale = locale === "zh" ? "de" : "zh";
  const hiddenIds = new Set(slots(app, otherLocale).flatMap((slot) => currentIdsByPosition.has(slot.position) && currentIdsByPosition.get(slot.position) !== slot.announcementId ? [slot.announcementId] : []));
  return app.findRecordsByFilter("announcements", "", "-updated", 1000, 0).flatMap((record) => {
    try {
      if (hiddenIds.has(record.id)) return [];
      const copy = localized(record, locale);
      return copy.title && copy.content ? [{ id: record.id, position: activePositions.get(record.id) || 0, active: activePositions.has(record.id), ...copy, read: readIds.has(record.id), created: record.getString("created"), updated: record.getString("updated") }] : [];
    } catch (_) { return []; }
  });
}

function localeFrom(e) {
  const locale = String((e.requestInfo().query || {}).locale || "de");
  if (!LOCALES.includes(locale)) throw new BadRequestError("Ungültige Sprache");
  return locale;
}

function saveSlots(app, body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !LOCALES.includes(key)) || Object.keys(body).length !== LOCALES.length) throw new BadRequestError("Ungültige Ankündigungsreihenfolge");
  const values = {};
  for (const locale of LOCALES) {
    if (!Array.isArray(body[locale])) throw new BadRequestError("Ungültige Ankündigungsreihenfolge");
    const seenPositions = new Set(); const seenAnnouncements = new Set();
    values[locale] = body[locale].map((entry) => {
      if (!entry || !Number.isInteger(entry.position) || !POSITIONS.includes(entry.position) || typeof entry.announcementId !== "string") throw new BadRequestError("Ungültige Ankündigungsreihenfolge");
      const announcementId = entry.announcementId.trim();
      if (announcementId && !/^[a-zA-Z0-9]{10,30}$/.test(announcementId)) throw new BadRequestError("Ungültige Ankündigungs-ID");
      if (seenPositions.has(entry.position) || (announcementId && seenAnnouncements.has(announcementId))) throw new BadRequestError("Doppelte Ankündigungsauswahl");
      seenPositions.add(entry.position); if (announcementId) seenAnnouncements.add(announcementId);
      return { position: entry.position, announcementId };
    });
  }
  app.runInTransaction((txApp) => {
    for (const locale of LOCALES) {
      txApp.findRecordsByFilter("announcement_slots", `locale = '${locale}'`, "", 20, 0).forEach((record) => txApp.delete(record));
      values[locale].filter((entry) => entry.announcementId).forEach((entry) => {
        txApp.findRecordById("announcements", entry.announcementId);
        const record = new Record(txApp.findCollectionByNameOrId("announcement_slots"));
        record.set("locale", locale); record.set("position", entry.position); record.set("announcement", entry.announcementId); txApp.save(record);
      });
    }
  });
}

function markRead(app, userId, announcementId) {
  const announcement = app.findRecordById("announcements", announcementId);
  const relatedIds = new Set([announcement.id]);
  const positions = new Set(app.findRecordsByFilter("announcement_slots", `announcement = '${announcement.id}'`, "", 20, 0).map((record) => record.getInt("position")));
  positions.forEach((position) => app.findRecordsByFilter("announcement_slots", `position = ${position}`, "", 20, 0).forEach((record) => relatedIds.add(record.getString("announcement"))));
  relatedIds.forEach((id) => {
    const existing = app.findRecordsByFilter("announcement_reads", `user = '${userId}' && announcement = '${id}'`, "", 1, 0)[0];
    if (existing) return;
    const record = new Record(app.findCollectionByNameOrId("announcement_reads"));
    record.set("user", userId); record.set("announcement", id); app.save(record);
  });
}

module.exports = { requireUser, requireAdmin, noStore, idOf, parseAnnouncement, announcementDto, adminDto, userItems, localeFrom, saveSlots, markRead };

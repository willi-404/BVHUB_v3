const FEEDS = { zh: "https://bv-erlangen2025.de/zh/posts/index.xml", de: "https://bv-erlangen2025.de/de/posts/index.xml" };
const LOCALES = ["zh", "de"];
const HOST = "bv-erlangen2025.de";

function decodeXml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&(?:amp|#38);/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");
}

function plainText(value) {
  return decodeXml(String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function xmlValue(xml, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return match ? match[1] : "";
}

function safeLink(value, locale) {
  let parsed;
  try { parsed = new URL(decodeXml(plainText(value))); } catch (_) { return ""; }
  if (parsed.protocol !== "https:" || parsed.hostname !== HOST || !parsed.pathname.startsWith(`/${locale}/posts/`)) return "";
  return parsed.toString();
}

function slugFromLink(link) {
  const parts = new URL(link).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function parseFeed(xml, locale) {
  if (!LOCALES.includes(locale) || typeof xml !== "string") throw new Error("Invalid news feed");
  if (!/<(?:rss|feed)\b/i.test(xml) || !/<(?:item|entry)\b/i.test(xml)) throw new Error("Invalid news feed");
  const posts = [];
  const itemPattern = /<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemPattern.exec(xml))) {
    const item = match[0];
    const link = safeLink(xmlValue(item, "link"), locale) || safeLink(xmlValue(item, "atom:link"), locale);
    const slug = link && slugFromLink(link);
    const title = plainText(xmlValue(item, "title"));
    if (!link || !slug || !title) continue;
    const rawExcerpt = xmlValue(item, "description") || xmlValue(item, "summary") || xmlValue(item, "content:encoded");
    const publishedAt = plainText(xmlValue(item, "pubDate") || xmlValue(item, "published") || xmlValue(item, "updated"));
    if (!posts.some((post) => post.slug === slug)) posts.push({ locale, slug, title, link, publishedAt, excerpt: plainText(rawExcerpt).slice(0, 2000) });
  }
  return posts;
}

function bodyText(body) {
  let result = "";
  for (let index = 0; index < body.length; index += 8192) result += String.fromCharCode(...body.slice(index, index + 8192));
  return result;
}

function fetchFeed(locale) {
  const response = $http.send({ url: FEEDS[locale], method: "GET", timeout: 20, headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
  if (!response || response.statusCode < 200 || response.statusCode >= 300) throw new Error(`News feed unavailable (${locale})`);
  return parseFeed(response.raw || bodyText(response.body || []), locale);
}

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

function posts(app, locale) {
  return app.findRecordsByFilter("news_posts", `locale = '${locale}'`, "-publishedAt,-created", 1000, 0).map(postDto);
}

function postDto(record) {
  return { id: record.id, locale: record.getString("locale"), slug: record.getString("slug"), title: record.getString("title"), link: record.getString("link"), publishedAt: record.getString("publishedAt"), excerpt: record.getString("excerpt") };
}

function slotDto(record) { return { position: record.getInt("position"), slug: record.getString("slug") || null }; }

function configured(app, locale) {
  const available = new Map(posts(app, locale).map((post) => [post.slug, post]));
  return app.findRecordsByFilter("news_slots", `locale = '${locale}'`, "position", 1000, 0).sort((a, b) => a.getInt("position") - b.getInt("position")).map((slot) => available.get(slot.getString("slug"))).filter(Boolean);
}

function defaultSlots(app, locale) {
  const existingSlots = app.findRecordsByFilter("news_slots", `locale = '${locale}'`, "position", 1000, 0).map(slotDto);
  const count = Math.max(10, posts(app, locale).length, ...existingSlots.map((slot) => slot.position));
  const existing = new Map(existingSlots.map((slot) => [slot.position, slot.slug]));
  return Array.from({ length: count }, (_, index) => ({ position: index + 1, slug: existing.get(index + 1) || null }));
}

function adminLocale(app, locale) { return { locale, posts: posts(app, locale), slots: defaultSlots(app, locale) }; }

function payload(e) {
  const body = e.requestInfo().body;
  if (!body || typeof body !== "object" || Array.isArray(body) || !LOCALES.every((locale) => Array.isArray(body[locale])) || Object.keys(body).some((key) => !LOCALES.includes(key))) throw new BadRequestError("Ungültige News-Konfiguration");
  const result = {};
  for (const locale of LOCALES) {
    const seenPositions = new Set(); const seenSlugs = new Set();
    result[locale] = body[locale].map((entry) => {
      if (!entry || !Number.isInteger(entry.position) || entry.position < 1 || entry.position > 1000 || typeof entry.slug !== "string") throw new BadRequestError("Ungültige News-Konfiguration");
      if (seenPositions.has(entry.position)) throw new BadRequestError("Doppelte News-Position");
      seenPositions.add(entry.position);
      const slug = entry.slug.trim();
      if (slug && seenSlugs.has(slug)) throw new BadRequestError("Doppelte News-Auswahl");
      if (slug) seenSlugs.add(slug);
      return { position: entry.position, slug };
    });
  }
  return result;
}

function saveSlots(app, values) {
  for (const locale of LOCALES) {
    const allowed = new Set(posts(app, locale).map((post) => post.slug));
    if (values[locale].some((entry) => entry.slug && !allowed.has(entry.slug))) throw new BadRequestError("News-Artikel nicht gefunden");
  }
  app.runInTransaction((txApp) => {
    for (const locale of LOCALES) {
      txApp.findRecordsByFilter("news_slots", `locale = '${locale}'`, "", 1000, 0).forEach((record) => txApp.delete(record));
      values[locale].forEach((entry) => { const record = new Record(txApp.findCollectionByNameOrId("news_slots")); record.set("locale", locale); record.set("position", entry.position); record.set("slug", entry.slug); txApp.save(record); });
    }
  });
}

module.exports = { FEEDS, decodeXml, plainText, parseFeed, fetchFeed, posts, configured, adminLocale, payload, saveSlots, requireUser, requireAdmin, noStore };

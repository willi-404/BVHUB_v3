routerAdd("GET", "/api/bvhub/news", (e) => {
  const service = require(`${__hooks}/news-service.js`);
  service.requireUser(e); service.noStore(e);
  const locale = String((e.requestInfo().query || {}).locale || "de");
  if (!["zh", "de"].includes(locale)) throw new BadRequestError("Ungültige Sprache");
  return e.json(200, { items: service.configured($app, locale) });
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/news", (e) => {
  const service = require(`${__hooks}/news-service.js`);
  service.requireAdmin(e); service.noStore(e);
  return e.json(200, { locales: [service.adminLocale($app, "zh"), service.adminLocale($app, "de")] });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/bvhub/admin/news/refresh", (e) => {
  const service = require(`${__hooks}/news-service.js`);
  service.requireAdmin(e);
  const fetched = { zh: service.fetchFeed("zh"), de: service.fetchFeed("de") };
  $app.runInTransaction((txApp) => {
    for (const locale of ["zh", "de"]) {
      txApp.findRecordsByFilter("news_posts", `locale = '${locale}'`, "", 1000, 0).forEach((record) => txApp.delete(record));
      fetched[locale].forEach((post) => { const record = new Record(txApp.findCollectionByNameOrId("news_posts")); Object.keys(post).forEach((key) => record.set(key, post[key])); txApp.save(record); });
    }
  });
  service.noStore(e);
  return e.json(200, { locales: [service.adminLocale($app, "zh"), service.adminLocale($app, "de")] });
}, $apis.requireAuth("users"));

routerAdd("PUT", "/api/bvhub/admin/news", (e) => {
  const service = require(`${__hooks}/news-service.js`);
  service.requireAdmin(e); service.saveSlots($app, service.payload(e)); service.noStore(e);
  return e.json(200, { locales: [service.adminLocale($app, "zh"), service.adminLocale($app, "de")] });
}, $apis.requireAuth("users"));

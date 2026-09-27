/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/bvhub/me/announcements", (e) => {
  const service = require(`${__hooks}/announcement-service.js`); const user = service.requireUser(e); service.noStore(e);
  const items = service.userItems($app, user.id, service.localeFrom(e));
  return e.json(200, { items, unreadCount: items.filter((item) => !item.read).length });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/bvhub/me/announcements/{id}/read", (e) => {
  const service = require(`${__hooks}/announcement-service.js`); const user = service.requireUser(e); service.noStore(e);
  service.markRead($app, user.id, service.idOf(e)); return e.json(204, {});
}, $apis.requireAuth("users"));

routerAdd("GET", "/api/bvhub/admin/announcements", (e) => {
  const service = require(`${__hooks}/announcement-service.js`); service.requireAdmin(e); service.noStore(e); return e.json(200, service.adminDto($app));
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/bvhub/admin/announcements", (e) => {
  const service = require(`${__hooks}/announcement-service.js`); service.requireAdmin(e); const data = service.parseAnnouncement(e.requestInfo().body);
  const record = new Record($app.findCollectionByNameOrId("announcements")); Object.keys(data).forEach((key) => record.set(key, data[key])); $app.save(record); service.noStore(e); return e.json(201, service.announcementDto(record));
}, $apis.requireAuth("users"));

routerAdd("PATCH", "/api/bvhub/admin/announcements/{id}", (e) => {
  const service = require(`${__hooks}/announcement-service.js`); service.requireAdmin(e); const record = $app.findRecordById("announcements", service.idOf(e)); const data = service.parseAnnouncement(e.requestInfo().body);
  Object.keys(data).forEach((key) => record.set(key, data[key])); $app.save(record); service.noStore(e); return e.json(200, service.announcementDto(record));
}, $apis.requireAuth("users"));

routerAdd("DELETE", "/api/bvhub/admin/announcements/{id}", (e) => {
  const service = require(`${__hooks}/announcement-service.js`); service.requireAdmin(e); const record = $app.findRecordById("announcements", service.idOf(e)); $app.delete(record); service.noStore(e); return e.json(204, {});
}, $apis.requireAuth("users"));

routerAdd("PUT", "/api/bvhub/admin/announcements/slots", (e) => {
  const service = require(`${__hooks}/announcement-service.js`); service.requireAdmin(e); service.saveSlots($app, e.requestInfo().body); service.noStore(e); return e.json(200, service.adminDto($app));
}, $apis.requireAuth("users"));

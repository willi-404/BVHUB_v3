/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/bvhub/dashboard/statistics", (e) => {
  if (!e.auth || !e.auth.id || !e.auth.getBool("active") || !e.auth.getBool("verified")) {
    throw new ForbiddenError("Dieses Konto ist nicht verfügbar");
  }
  const statistics = require(`${__hooks}/dashboard-statistics-service.js`);
  return e.json(200, statistics.dashboardStatistics($app, e.auth.id, new Date()));
}, $apis.requireAuth("users"));

function refreshMemberStatistics() {
  const statistics = require(`${__hooks}/dashboard-statistics-service.js`);
  statistics.upsertSnapshot($app, new Date());
}

onRecordAfterCreateSuccess(refreshMemberStatistics, "users");
onRecordAfterUpdateSuccess(refreshMemberStatistics, "users");
onRecordAfterDeleteSuccess(refreshMemberStatistics, "users");

cronAdd("dashboard-member-statistics", "0 * * * *", () => {
  refreshMemberStatistics();
});

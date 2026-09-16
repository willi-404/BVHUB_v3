/// <reference path="../pb_data/types.d.ts" />

function lastSundayUtc(year, monthIndex) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  return Date.UTC(year, monthIndex, lastDay.getUTCDate() - lastDay.getUTCDay(), 1);
}

function berlinMonthKey(date) {
  const year = date.getUTCFullYear();
  const isDst = date.getTime() >= lastSundayUtc(year, 2) && date.getTime() < lastSundayUtc(year, 9);
  const local = new Date(date.getTime() + (isDst ? 120 : 60) * 60_000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

migrate((app) => {
  const statistics = new Collection({
    name: "dashboard_member_statistics",
    type: "base",
    system: false,
    fields: [],
  });
  statistics.fields.add(new TextField({
    id: "dashboard_stats_month",
    name: "month",
    required: true,
    min: 7,
    max: 7,
    pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$",
  }));
  statistics.fields.add(new NumberField({
    id: "dashboard_registered_users",
    name: "registeredUsers",
    required: false,
    onlyInt: true,
    min: 0,
  }));
  statistics.fields.add(new NumberField({
    id: "dashboard_members",
    name: "members",
    required: false,
    onlyInt: true,
    min: 0,
  }));
  statistics.fields.add(new DateField({
    id: "dashboard_captured_at",
    name: "capturedAt",
    required: true,
  }));
  statistics.fields.add(new AutodateField({
    id: "dashboard_stats_created",
    name: "created",
    onCreate: true,
    onUpdate: false,
  }));
  statistics.fields.add(new AutodateField({
    id: "dashboard_stats_updated",
    name: "updated",
    onCreate: true,
    onUpdate: true,
  }));
  statistics.listRule = null;
  statistics.viewRule = null;
  statistics.createRule = null;
  statistics.updateRule = null;
  statistics.deleteRule = null;
  statistics.indexes = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_member_statistics_month ON dashboard_member_statistics (month)",
  ];
  app.save(statistics);

  const counts = app.findRecordsByFilter("users", "role = 'GUEST' || role = 'MEMBER'", "", 0, 0);
  const record = new Record(statistics);
  record.set("month", berlinMonthKey(new Date()));
  record.set("registeredUsers", counts.length);
  record.set("members", counts.filter((user) => user.getString("role") === "MEMBER").length);
  record.set("capturedAt", new Date().toISOString());
  app.save(record);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("dashboard_member_statistics")); } catch (_) {}
});

/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const settings = app.settings();
  const limits = [
    { label: "POST /api/bvhub/me/member-application", audience: "@auth", duration: 3600, maxRequests: 5 },
    { label: "POST /api/bvhub/me/member-application/retry", audience: "@auth", duration: 3600, maxRequests: 10 },
  ];
  const labels = new Set(limits.map((rule) => rule.label));
  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = Array.from(settings.rateLimits.rules || []).filter((rule) => !labels.has(rule.label)).concat(limits);
  app.save(settings);
  const users = app.findCollectionByNameOrId("users");
  const applications = new Collection({ name: "member_applications", type: "base", system: false, fields: [] });
  applications.fields.add(new RelationField({ name: "user", required: true, collectionId: users.id, minSelect: 1, maxSelect: 1, cascadeDelete: true }));
  applications.fields.add(new FileField({ name: "pdf", required: true, maxSelect: 1, maxSize: 3 * 1024 * 1024, mimeTypes: ["application/pdf"], protected: true }));
  applications.fields.add(new SelectField({ name: "status", required: true, maxSelect: 1, values: ["SENDING", "FAILED", "SENT"] }));
  applications.fields.add(new TextField({ name: "signedDate", required: true, max: 10 }));
  applications.fields.add(new AutodateField({ name: "created", onCreate: true, onUpdate: false }));
  applications.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }));
  const owner = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true && user = @request.auth.id";
  applications.listRule = owner;
  applications.viewRule = owner;
  applications.createRule = null;
  applications.updateRule = null;
  applications.deleteRule = null;
  applications.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_member_applications_user ON member_applications (user)"];
  app.save(applications);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("member_applications"));
  const settings = app.settings();
  settings.rateLimits.rules = Array.from(settings.rateLimits.rules || []).filter((rule) => !["POST /api/bvhub/me/member-application", "POST /api/bvhub/me/member-application/retry"].includes(rule.label));
  app.save(settings);
});

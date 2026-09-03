/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const profiles = app.findCollectionByNameOrId("user_profiles");
  profiles.createRule = null;
  profiles.updateRule = null;
  profiles.deleteRule = null;
  app.save(profiles);
}, (app) => {
  const profiles = app.findCollectionByNameOrId("user_profiles");
  const activeVerified = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
  profiles.createRule = `${activeVerified} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  profiles.updateRule = profiles.createRule;
  profiles.deleteRule = `${activeVerified} && @request.auth.role = 'SUPER_ADMIN'`;
  app.save(profiles);
});

/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const profiles = app.findCollectionByNameOrId("user_profiles");
  const activeVerified = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
  profiles.updateRule = `${activeVerified} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  app.save(profiles);
}, (app) => {
  const profiles = app.findCollectionByNameOrId("user_profiles");
  const active = "@request.auth.id != '' && @request.auth.active = true";
  profiles.updateRule = `${active} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  app.save(profiles);
});

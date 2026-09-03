/// <reference path="../pb_data/types.d.ts" />

const DISPLAY_NAME_INDEX =
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name_normalized " +
  "ON users (lower(trim(displayName, " +
  "char(9)||char(10)||char(11)||char(12)||char(13)||char(32)||char(133)||" +
  "char(160)||char(5760)||char(8192)||char(8193)||char(8194)||char(8195)||" +
  "char(8196)||char(8197)||char(8198)||char(8199)||char(8200)||char(8201)||" +
  "char(8202)||char(8232)||char(8233)||char(8239)||char(8287)||char(12288)||" +
  "char(65279))))";

function normalizedDisplayName(value) {
  return String(value).trim().replace(/[A-Z]/g, (character) => character.toLowerCase());
}

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const profiles = app.findCollectionByNameOrId("user_profiles");
  const seen = Object.create(null);
  const duplicateIds = [];

  app.findAllRecords("users").forEach((record) => {
    const key = `name:${normalizedDisplayName(record.getString("displayName"))}`;
    if (seen[key]) {
      if (!duplicateIds.includes(seen[key])) duplicateIds.push(seen[key]);
      duplicateIds.push(record.id);
      return;
    }
    seen[key] = record.id;
  });

  if (duplicateIds.length > 0) {
    duplicateIds.sort();
    throw new Error(`Duplicate displayName record IDs: ${duplicateIds.join(",")}`);
  }

  const indexes = Array.from(users.indexes || []);
  if (!indexes.some((index) => String(index).includes("idx_users_display_name_normalized"))) {
    indexes.push(DISPLAY_NAME_INDEX);
  }
  users.indexes = indexes;
  app.save(users);

  const activeVerified = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
  const elevated = `${activeVerified} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  profiles.listRule = `${activeVerified} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  profiles.viewRule = profiles.listRule;
  profiles.createRule = elevated;
  profiles.updateRule = `${profiles.listRule} && @request.body.user:changed = false`;
  profiles.deleteRule = `${activeVerified} && @request.auth.role = 'SUPER_ADMIN'`;
  app.save(profiles);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.indexes = Array.from(users.indexes || []).filter(
    (index) => !String(index).includes("idx_users_display_name_normalized"),
  );
  app.save(users);

  const profiles = app.findCollectionByNameOrId("user_profiles");
  const active = "@request.auth.id != '' && @request.auth.active = true";
  profiles.listRule = `${active} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  profiles.viewRule = profiles.listRule;
  profiles.createRule = `${active} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  profiles.updateRule = profiles.listRule;
  profiles.deleteRule = "@request.auth.role = 'SUPER_ADMIN' && @request.auth.active = true";
  app.save(profiles);
});

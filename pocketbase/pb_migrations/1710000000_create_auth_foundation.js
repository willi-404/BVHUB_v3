const ROLES = ["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"];
const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true";
const ELEVATED_AUTH = `${ACTIVE_AUTH} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
const SUPER_ADMIN_AUTH = `${ACTIVE_AUTH} && @request.auth.role = 'SUPER_ADMIN'`;
const MANAGED_ROLE = "(role = 'GUEST' || role = 'MEMBER')";
const MANAGED_BODY_ROLE = "(@request.body.role != 'ADMIN' && @request.body.role != 'SUPER_ADMIN')";

function findOrCreate(app, name, definition) {
  try { return app.findCollectionByNameOrId(name); } catch (_) { return new Collection(definition); }
}

function ensureField(collection, definition, FieldType) {
  const current = collection.fields.getByName(definition.name);
  if (!current) { collection.fields.add(new FieldType(definition)); return; }
  // Repair fields created by an earlier schema rather than leaving a truthy-only field behind.
  if (current.type !== definition.type) {
    collection.fields.removeByName(definition.name);
    collection.fields.add(new FieldType(definition));
    return;
  }
  Object.keys(definition).forEach((key) => {
    if (key !== "id" && key !== "name" && key !== "type") current[key] = definition[key];
  });
}

function ensureTextFields(collection, fields) { fields.forEach((field) => ensureField(collection, field, TextField)); }

migrate((app) => {
  // PocketBase creates no application auth collection on a fresh data directory.
  // This migration creates it, then also repairs compatible existing collections.
  const users = findOrCreate(app, "users", { name: "users", type: "auth", system: false, fields: [] });
  ensureTextFields(users, [
    { id: "display_name", name: "displayName", type: "text", required: true, min: 1, max: 120, pattern: "" },
    { id: "first_name", name: "firstName", type: "text", required: true, min: 1, max: 80, pattern: "" },
    { id: "last_name", name: "lastName", type: "text", required: true, min: 1, max: 80, pattern: "" },
  ]);
  ensureField(users, { id: "role", name: "role", type: "select", required: true, maxSelect: 1, values: ROLES }, SelectField);
  ensureField(users, { id: "active", name: "active", type: "bool", required: false, default: true }, BoolField);
  const passwordField = users.fields.getByName("password");
  if (passwordField) {
    passwordField.min = 12;
    passwordField.required = true;
  }
  users.listRule = ELEVATED_AUTH;
  users.viewRule = `${ACTIVE_AUTH} && (id = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  users.createRule = `${SUPER_ADMIN_AUTH} || (${ACTIVE_AUTH} && @request.auth.role = 'ADMIN' && (@request.body.role = 'GUEST' || @request.body.role = 'MEMBER'))`;
  users.updateRule = `${SUPER_ADMIN_AUTH} || (${ACTIVE_AUTH} && @request.auth.role = 'ADMIN' && ${MANAGED_ROLE} && ${MANAGED_BODY_ROLE})`;
  users.deleteRule = `${SUPER_ADMIN_AUTH} || (${ACTIVE_AUTH} && @request.auth.role = 'ADMIN' && ${MANAGED_ROLE})`;
  users.passwordAuth = { enabled: true, identityFields: ["email"], requireEmail: true };
  users.otp = { enabled: true, duration: 900, length: 6, emailTemplate: { subject: "bvHub Anmeldecode", body: "Dein bvHub-Code lautet: {OTP}" } };
  users.mfa = { enabled: false };
  users.oauth2 = { enabled: false };
  users.indexes = ["CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, active)"];
  app.save(users);

  const groups = findOrCreate(app, "groups", {
    name: "groups", type: "base", system: false,
    fields: [
      { id: "group_name", name: "name", type: "text", required: true, min: 1, max: 80, pattern: "" },
      { id: "description", name: "description", type: "text", required: false, max: 500, pattern: "" },
      { id: "active", name: "active", type: "bool", required: false, default: true },
    ],
  });
  ensureTextFields(groups, [
    { id: "group_name", name: "name", type: "text", required: true, min: 1, max: 80, pattern: "" },
    { id: "description", name: "description", type: "text", required: false, max: 500, pattern: "" },
  ]);
  ensureField(groups, { id: "active", name: "active", type: "bool", required: false, default: true }, BoolField);
  groups.listRule = ACTIVE_AUTH;
  groups.viewRule = ACTIVE_AUTH;
  groups.createRule = ELEVATED_AUTH;
  groups.updateRule = ELEVATED_AUTH;
  groups.deleteRule = SUPER_ADMIN_AUTH;
  groups.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name ON groups (name)"];
  app.save(groups);

  const userGroups = findOrCreate(app, "user_groups", {
    name: "user_groups", type: "base", system: false,
    fields: [
      { id: "user_relation", name: "user", type: "relation", required: true, collectionId: users.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { id: "group_relation", name: "group", type: "relation", required: true, collectionId: groups.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
    ],
  });
  userGroups.listRule = `${ACTIVE_AUTH} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  userGroups.viewRule = `${ACTIVE_AUTH} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  userGroups.createRule = ELEVATED_AUTH;
  userGroups.updateRule = ELEVATED_AUTH;
  userGroups.deleteRule = ELEVATED_AUTH;
  userGroups.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_user_groups_pair ON user_groups (user, group)"];
  app.save(userGroups);
}, (app) => {
  // Keep the auth collection and its data on rollback; only remove collections owned here.
  ["user_groups", "groups"].forEach((name) => {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  });
});

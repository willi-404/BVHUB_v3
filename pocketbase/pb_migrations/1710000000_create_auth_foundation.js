const ROLES = ["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"];

const userFields = [
  {
    id: "display_name",
    name: "displayName",
    type: "text",
    required: true,
    min: 1, max: 120, pattern: "",
  },
  {
    id: "first_name",
    name: "firstName",
    type: "text",
    required: true,
    min: 1, max: 80, pattern: "",
  },
  {
    id: "last_name",
    name: "lastName",
    type: "text",
    required: true,
    min: 1, max: 80, pattern: "",
  },
  {
    id: "role",
    name: "role",
    type: "select",
    required: true,
    maxSelect: 1, values: ROLES,
  },
  {
    id: "active",
    name: "active",
    type: "bool",
    required: true,
  },
];

function findOrCreate(app, name, definition) {
  try {
    return app.findCollectionByNameOrId(name);
  } catch (_) {
    return new Collection(definition);
  }
}

function ensureFields(collection, fields) {
  fields.forEach((field) => {
    if (!collection.fields.getByName(field.name)) {
      const FieldType = field.type === "select" ? SelectField : field.type === "bool" ? BoolField : TextField;
      collection.fields.add(new FieldType(field));
    }
  });
}

migrate((app) => {
  // PocketBase creates the initial `users` auth collection during first-run setup.
  // Extend it when present so this migration works on both fresh and existing data.
  const users = findOrCreate(app, "users", {
    name: "users",
    type: "auth",
    system: false,
    fields: [],
  });
  ensureFields(users, userFields);
  users.listRule = "@request.auth.active = true && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')";
  users.viewRule = "id = @request.auth.id || (@request.auth.active = true && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN'))";
  users.createRule = "@request.auth.role = 'SUPER_ADMIN'";
  users.updateRule = "@request.auth.role = 'SUPER_ADMIN'";
  users.deleteRule = "@request.auth.role = 'SUPER_ADMIN'";
  users.passwordAuth = {
    enabled: true,
    identityFields: ["email"],
    minPasswordLength: 12,
    requireEmail: true,
  };
  users.otp = {
    enabled: true,
    duration: 900,
    length: 6,
    emailTemplate: {
      subject: "bvHub Anmeldecode",
      body: "Dein bvHub-Code lautet: {OTP}",
    },
  };
  users.mfa = { enabled: false };
  users.oauth2 = { enabled: false };
  users.indexes = ["CREATE INDEX idx_users_role_active ON users (role, active)"];
  app.save(users);

  const groups = findOrCreate(app, "groups", {
    name: "groups",
    type: "base",
    system: false,
    fields: [
      { id: "group_name", name: "name", type: "text", required: true, min: 1, max: 80, pattern: "" },
      { id: "description", name: "description", type: "text", required: false, max: 500, pattern: "" },
      { id: "active", name: "active", type: "bool", required: true },
    ],
  });
  groups.listRule = "@request.auth.active = true";
  groups.viewRule = "@request.auth.active = true";
  groups.createRule = "@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN'";
  groups.updateRule = "@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN'";
  groups.deleteRule = "@request.auth.role = 'SUPER_ADMIN'";
  groups.indexes = ["CREATE UNIQUE INDEX idx_groups_name ON groups (name)"];
  app.save(groups);

  const userGroups = findOrCreate(app, "user_groups", {
    name: "user_groups",
    type: "base",
    system: false,
    fields: [
      { id: "user_relation", name: "user", type: "relation", required: true, collectionId: users.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { id: "group_relation", name: "group", type: "relation", required: true, collectionId: groups.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
    ],
  });
  userGroups.listRule = "@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN'";
  userGroups.viewRule = "@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN'";
  userGroups.createRule = "@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN'";
  userGroups.updateRule = "@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN'";
  userGroups.deleteRule = "@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN'";
  userGroups.indexes = ["CREATE UNIQUE INDEX idx_user_groups_pair ON user_groups (user, group)"];
  app.save(userGroups);
}, (app) => {
  // `users` may be PocketBase's first-run auth collection, so never delete it
  // during rollback. A future migration can explicitly remove only our fields.
  ["user_groups", "groups"].forEach((name) => {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  });
});

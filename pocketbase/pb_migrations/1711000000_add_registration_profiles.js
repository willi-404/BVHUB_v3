const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true";
const ELEVATED_AUTH = `${ACTIVE_AUTH} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;

function ensureField(collection, definition, FieldType) {
  const current = collection.fields.getByName(definition.name);
  if (!current) collection.fields.add(new FieldType(definition));
}

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const profiles = new Collection({
    name: "user_profiles",
    type: "base",
    system: false,
    fields: [
      { id: "user_relation", name: "user", type: "relation", required: true, collectionId: users.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
      { id: "street", name: "street", type: "text", required: true, min: 1, max: 120 },
      { id: "house_number", name: "houseNumber", type: "text", required: true, min: 1, max: 20 },
      { id: "postal_code", name: "postalCode", type: "text", required: true, min: 5, max: 5 },
      { id: "city", name: "city", type: "text", required: true, min: 1, max: 100 },
      { id: "birth_date", name: "birthDate", type: "date", required: true },
      { id: "phone", name: "phone", type: "text", required: false, max: 40 },
      { id: "contact_info", name: "contactInfo", type: "text", required: false, max: 500 },
    ],
  });
  profiles.listRule = `${ACTIVE_AUTH} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  profiles.viewRule = profiles.listRule;
  profiles.createRule = ELEVATED_AUTH;
  profiles.updateRule = `${ACTIVE_AUTH} && (user = @request.auth.id || @request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
  profiles.deleteRule = `@request.auth.role = 'SUPER_ADMIN' && @request.auth.active = true`;
  profiles.indexes = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles (user)",
  ];
  app.save(profiles);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("user_profiles")); } catch (_) {}
});

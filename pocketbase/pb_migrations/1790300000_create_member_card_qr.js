/// <reference path="../pb_data/types.d.ts" />

// Member-card tokens are intentionally opaque and server-only.  The settings
// record is a singleton so operators can tune rotation without rebuilding the
// frontend.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  const tokens = new Collection({
    name: "member_card_tokens",
    type: "base",
    system: false,
    fields: [],
  });
  tokens.fields.add(new RelationField({
    id: "member_card_token_user",
    name: "user",
    required: true,
    collectionId: users.id,
    cascadeDelete: true,
    minSelect: 1,
    maxSelect: 1,
  }));
  tokens.fields.add(new TextField({
    id: "member_card_token_hash",
    name: "tokenHash",
    required: true,
    min: 64,
    max: 64,
    pattern: "^[a-f0-9]{64}$",
  }));
  tokens.fields.add(new DateField({
    id: "member_card_token_expires_at",
    name: "expiresAt",
    required: true,
  }));
  tokens.fields.add(new AutodateField({
    id: "member_card_token_created",
    name: "created",
    onCreate: true,
    onUpdate: false,
  }));
  tokens.fields.add(new AutodateField({
    id: "member_card_token_updated",
    name: "updated",
    onCreate: true,
    onUpdate: true,
  }));
  tokens.listRule = null;
  tokens.viewRule = null;
  tokens.createRule = null;
  tokens.updateRule = null;
  tokens.deleteRule = null;
  tokens.indexes = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_member_card_tokens_hash ON member_card_tokens (tokenHash)",
    "CREATE INDEX IF NOT EXISTS idx_member_card_tokens_user_expires ON member_card_tokens (user, expiresAt)",
  ];
  app.save(tokens);

  const settings = new Collection({
    name: "member_card_settings",
    type: "base",
    system: false,
    fields: [],
  });
  settings.fields.add(new BoolField({
    id: "member_card_settings_enabled",
    name: "enabled",
    required: false,
    default: true,
  }));
  settings.fields.add(new NumberField({
    id: "member_card_settings_ttl",
    name: "tokenTtlSeconds",
    required: true,
    onlyInt: true,
    min: 30,
    max: 900,
  }));
  settings.fields.add(new NumberField({
    id: "member_card_settings_refresh_lead",
    name: "refreshLeadSeconds",
    required: true,
    onlyInt: true,
    min: 1,
    max: 899,
  }));
  settings.fields.add(new AutodateField({
    id: "member_card_settings_created",
    name: "created",
    onCreate: true,
    onUpdate: false,
  }));
  settings.fields.add(new AutodateField({
    id: "member_card_settings_updated",
    name: "updated",
    onCreate: true,
    onUpdate: true,
  }));
  settings.listRule = null;
  settings.viewRule = null;
  settings.createRule = null;
  settings.updateRule = null;
  settings.deleteRule = null;
  settings.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_member_card_settings_singleton ON member_card_settings (id)"];
  app.save(settings);

  const defaults = new Record(settings);
  defaults.set("enabled", true);
  defaults.set("tokenTtlSeconds", 120);
  defaults.set("refreshLeadSeconds", 20);
  app.save(defaults);
}, (app) => {
  ["member_card_tokens", "member_card_settings"].forEach((name) => {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  });
});

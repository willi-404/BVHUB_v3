/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const avatars = new Collection({ name: "user_avatars", type: "base", system: false, fields: [] });
  avatars.fields.add(new RelationField({ name: "user", required: true, collectionId: users.id, minSelect: 1, maxSelect: 1, cascadeDelete: true }));
  avatars.fields.add(new FileField({ name: "image", required: true, maxSelect: 1, maxSize: 5 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: ["64x64", "160x160"], protected: true }));
  avatars.listRule = null;
  avatars.viewRule = "@request.auth.id != '' && @request.auth.active = true && @request.auth.verified = true";
  avatars.createRule = null;
  avatars.updateRule = null;
  avatars.deleteRule = null;
  avatars.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_user_avatars_user ON user_avatars (user)"];
  app.save(avatars);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("user_avatars"));
});

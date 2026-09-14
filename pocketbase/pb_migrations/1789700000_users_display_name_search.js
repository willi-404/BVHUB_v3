/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  // Email is the sole authentication identity. Display name and legal name
  // fields are the application profile; username is not user input.
  users.usernameAuth = { enabled: false };
  // Keep the pre-existing unique normalized display-name index intact.
  users.indexes.push("CREATE INDEX IF NOT EXISTS idx_users_display_name ON users (displayName)");
  users.indexes.push("CREATE INDEX IF NOT EXISTS idx_users_first_last_name ON users (firstName, lastName)");
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.usernameAuth = { enabled: true };
  users.indexes = users.indexes.filter((index) => !String(index).includes("idx_users_display_name ON users") && !String(index).includes("idx_users_first_last_name"));
  app.save(users);
});

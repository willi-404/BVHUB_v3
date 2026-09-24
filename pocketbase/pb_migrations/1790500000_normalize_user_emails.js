/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  app.runInTransaction((txApp) => {
    const users = txApp.findAllRecords("users");
    const normalizedEmails = new Map();

    users.forEach((user) => {
      const normalized = user.getString("email").trim().toLowerCase();
      const conflictingUserId = normalizedEmails.get(normalized);
      if (conflictingUserId && conflictingUserId !== user.id) {
        throw new Error("Cannot normalize user email addresses because case-folding conflicts exist");
      }
      normalizedEmails.set(normalized, user.id);
    });

    users.forEach((user) => {
      const normalized = user.getString("email").trim().toLowerCase();
      if (user.getString("email") !== normalized) {
        user.set("email", normalized);
        txApp.save(user);
      }
    });
  });
}, () => {
  // Restoring case is ambiguous, so a rollback intentionally preserves normalized addresses.
});

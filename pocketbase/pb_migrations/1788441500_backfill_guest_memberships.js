migrate((app) => {
  let guestGroup;
  try { guestGroup = app.findFirstRecordByData("groups", "name", "Guest"); } catch (_) { return; }
  const userGroups = app.findCollectionByNameOrId("user_groups");
  let offset = 0;
  while (true) {
    const users = app.findRecordsByFilter("users", "role = 'GUEST'", "", 500, offset);
    users.forEach((user) => {
      const assignments = app.findRecordsByFilter("user_groups", `user = '${user.id}'`, "", 100, 0);
      if (assignments.length !== 0) return;
      const assignment = new Record(userGroups);
      assignment.set("user", user.id);
      assignment.set("group", guestGroup.id);
      app.save(assignment);
    });
    if (users.length < 500) break;
    offset += users.length;
  }
}, () => {});

const ACTIVE_AUTH = "@request.auth.id != '' && @request.auth.active = true";
const ELEVATED = `${ACTIVE_AUTH} && (@request.auth.role = 'ADMIN' || @request.auth.role = 'SUPER_ADMIN')`;
const SUPER = `${ACTIVE_AUTH} && @request.auth.role = 'SUPER_ADMIN'`;
const MANAGED_BY_ADMIN = `${ACTIVE_AUTH} && @request.auth.role = 'ADMIN' && (role = 'GUEST' || role = 'MEMBER')`;

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  // Generic record updates may edit ordinary profile/status fields, but a
  // submitted role must always equal the persisted role. Privileged role
  // changes therefore remain confined to /api/bvhub/admin/users/{id}/role.
  users.updateRule = `(((${SUPER}) && role != 'SUPER_ADMIN') || (${MANAGED_BY_ADMIN})) && (@request.body.role = role || @request.body.role = '' || @request.body.confirmation = 'ROLE_CHANGE')`;
  app.save(users);
}, () => {});

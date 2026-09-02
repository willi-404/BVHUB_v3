import assert from "node:assert/strict";
import fs from "node:fs";

const baseUrl = process.env.PB_TEST_URL;
const superuserEmail = process.env.PB_TEST_SUPERUSER_EMAIL;
const superuserPassword = process.env.PB_TEST_SUPERUSER_PASSWORD;
if (!baseUrl || !superuserEmail || !superuserPassword) throw new Error("Missing integration test configuration");

async function request(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data, text };
}

function expectStatus(result, expected, label) {
  assert.equal(result.status, expected, `${label}: ${result.status} ${result.text}`);
  return result.data;
}

const userBody = (email, role, password = "Synthetic-password-12!") => ({
  email, password, passwordConfirm: password, displayName: `Test ${role}`,
  firstName: "Synthetic", lastName: "Account", role, active: true, verified: true,
});

const auth = expectStatus(await request("POST", "/api/collections/_superusers/auth-with-password", {
  body: { identity: superuserEmail, password: superuserPassword },
}), 200, "superuser login");
const rootToken = auth.token;

const registrationEmail = "new-registration@example.test";
const registrationDisplayName = "New Registration";
const registration = expectStatus(await request("POST", "/api/bvhub/register", {
  body: {
    displayName: registrationDisplayName,
    firstName: "New",
    lastName: "Registration",
    email: registrationEmail,
    street: "Teststrasse",
    houseNumber: "12a",
    postalCode: "91052",
    city: "Erlangen",
    birthDate: "2000-01-01",
    phone: "",
    contactInfo: "",
    role: "SUPER_ADMIN",
    active: true,
    verified: true,
    groups: ["forbidden"],
  },
}), 201, "guest registration");
assert.equal(registration.email, "ne***@example.test", "registration response masks email");

const registeredUsers = expectStatus(await request(
  "GET",
  `/api/collections/users/records?filter=${encodeURIComponent(`email = "${registrationEmail}"`)}`,
  { token: rootToken },
), 200, "find registered guest");
assert.equal(registeredUsers.items.length, 1, "registration creates one user");
const registeredUser = registeredUsers.items[0];
assert.equal(registeredUser.displayName, registrationDisplayName, "registration stores one public name");
assert.equal(registeredUser.role, "GUEST");
assert.equal(registeredUser.active, false);
assert.equal(registeredUser.verified, false);

const registeredProfiles = expectStatus(await request(
  "GET",
  `/api/collections/user_profiles/records?filter=${encodeURIComponent(`user = "${registeredUser.id}"`)}`,
  { token: rootToken },
), 200, "find registered profile");
assert.equal(registeredProfiles.items.length, 1, "registration creates one profile");
assert.equal(registeredProfiles.items[0].postalCode, "91052");

expectStatus(await request("POST", "/api/bvhub/register", {
  body: {
    displayName: "",
    firstName: "New",
    lastName: "Registration",
    email: "invalid@example.test",
    street: "Teststrasse",
    houseNumber: "12a",
    postalCode: "91052",
    city: "Erlangen",
    birthDate: "2000-01-01",
  },
}), 400, "invalid registration");

expectStatus(await request("POST", "/api/bvhub/verify-email", {
  body: { token: "invalid-token" },
}), 400, "invalid verification token");

for (const length of [8, 11]) {
  const password = "x".repeat(length);
  expectStatus(await request("POST", "/api/collections/users/records", {
    token: rootToken, body: userBody(`short-${length}@example.test`, "MEMBER", password),
  }), 400, `password length ${length}`);
}

const superAdmin = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: userBody("app-superadmin@example.test", "SUPER_ADMIN"),
}), 200, "create BVHUB superadmin");
const admin = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: userBody("admin@example.test", "ADMIN"),
}), 200, "create admin");
const member = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: userBody("member@example.test", "MEMBER"),
}), 200, "create member with 12+ password");
const guest = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: userBody("guest@example.test", "GUEST"),
}), 200, "create guest");

const superLogin = expectStatus(await request("POST", "/api/collections/users/auth-with-password", {
  body: { identity: superAdmin.email, password: "Synthetic-password-12!" },
}), 200, "superadmin password login");
const adminLogin = expectStatus(await request("POST", "/api/collections/users/auth-with-password", {
  body: { identity: admin.email, password: "Synthetic-password-12!" },
}), 200, "admin password login");
const otpUnknown = await request("POST", "/api/collections/users/request-otp", { body: { email: "unknown@example.test" } });
for (const account of [admin, superAdmin]) {
  const result = await request("POST", "/api/collections/users/request-otp", { body: { email: account.email } });
  assert.equal(result.status, otpUnknown.status, "privileged OTP status must match unknown account");
  assert.deepEqual(Object.keys(result.data || {}).sort(), Object.keys(otpUnknown.data || {}).sort(), "privileged OTP response shape must not enumerate role");
}
const managed = expectStatus(await request("POST", "/api/collections/users/records", {
  token: adminLogin.token, body: { ...userBody("managed@example.test", "MEMBER"), verified: undefined },
}), 200, "admin creates member");
expectStatus(await request("POST", "/api/collections/users/records", {
  token: adminLogin.token, body: userBody("forbidden-admin@example.test", "ADMIN"),
}), 400, "admin cannot grant privileged role");
expectStatus(await request("PATCH", `/api/collections/users/records/${managed.id}`, {
  token: adminLogin.token, body: { role: "ADMIN" },
}), 404, "admin cannot promote member");
expectStatus(await request("PATCH", `/api/collections/users/records/${superAdmin.id}`, {
  token: adminLogin.token, body: { active: false },
}), 404, "admin cannot modify privileged account");
expectStatus(await request("PATCH", `/api/collections/users/records/${managed.id}`, {
  token: adminLogin.token, body: { active: false },
}), 200, "admin deactivates member");

const groupA = expectStatus(await request("POST", "/api/collections/groups/records", {
  token: adminLogin.token, body: { name: "Integration A", active: true },
}), 200, "admin creates group");
const groupB = expectStatus(await request("POST", "/api/collections/groups/records", {
  token: superLogin.token, body: { name: "Integration B", active: true },
}), 200, "superadmin creates group");
expectStatus(await request("PATCH", `/api/collections/groups/records/${groupA.id}`, {
  token: adminLogin.token, body: { active: false },
}), 200, "groups active false");

for (const group of [groupA, groupB]) {
  expectStatus(await request("POST", "/api/collections/user_groups/records", {
    token: adminLogin.token, body: { user: member.id, group: group.id },
  }), 200, "admin assigns member group");
}
expectStatus(await request("POST", "/api/collections/user_groups/records", {
  token: adminLogin.token, body: { user: member.id, group: groupA.id },
}), 400, "duplicate group relation");
const impersonation = expectStatus(await request("POST", `/api/collections/users/impersonate/${member.id}`, {
  token: rootToken, body: { duration: 300 },
}), 200, "member impersonation for rule test");
const ownGroups = expectStatus(await request("GET", "/api/collections/user_groups/records?perPage=50", {
  token: impersonation.token,
}), 200, "member reads own group relations");
assert.equal(ownGroups.items.length, 2, "member must see both own groups");

expectStatus(await request("PATCH", `/api/collections/users/records/${admin.id}`, {
  token: rootToken, body: { active: false },
}), 200, "deactivate admin");
expectStatus(await request("POST", "/api/collections/users/auth-with-password", {
  body: { identity: admin.email, password: "Synthetic-password-12!" },
}), 400, "inactive admin login");
assert.notEqual((await request("POST", "/api/collections/users/auth-refresh", { token: adminLogin.token })).status, 200, "inactive token refresh must fail");
const inactiveRead = await request("GET", "/api/collections/groups/records", { token: adminLogin.token });
assert.equal(inactiveRead.status, 200, "list rules return an empty result when denied");
assert.equal(inactiveRead.data.items.length, 0, "inactive token must not read protected data");

fs.writeSync(process.stdout.fd, "PocketBase RBAC integration matrix passed\n");

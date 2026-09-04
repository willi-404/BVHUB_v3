import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";

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
  return { status: response.status, data, text, headers: response.headers };
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

const smtpMessages = [];
const smtpServer = net.createServer((socket) => {
  socket.setEncoding("utf8");
  let smtpBuffer = "";
  let smtpDataMode = false;
  let smtpMessage = "";
  socket.write("220 bvhub-integration.test ESMTP\r\n");
  socket.on("data", (chunk) => {
    smtpBuffer += chunk;
    const lines = smtpBuffer.split(/\r?\n/);
    smtpBuffer = lines.pop() || "";
    for (const line of lines) {
      if (smtpDataMode) {
        if (line === ".") {
          smtpMessages.push(smtpMessage);
          smtpMessage = "";
          smtpDataMode = false;
          socket.write("250 2.0.0 Accepted\r\n");
        } else {
          smtpMessage += `${line}\n`;
        }
        continue;
      }
      const command = line.toUpperCase();
      if (command.startsWith("DATA")) socket.write("354 End data with <CRLF>.<CRLF>\r\n");
      else if (command.startsWith("QUIT")) socket.write("221 2.0.0 Bye\r\n");
      else if (command.startsWith("EHLO") || command.startsWith("HELO")) socket.write("250-bvhub-integration.test\r\n250 OK\r\n");
      else socket.write("250 2.0.0 OK\r\n");
      if (command.startsWith("DATA")) smtpDataMode = true;
    }
  });
});
await new Promise((resolve) => smtpServer.listen(0, "127.0.0.1", resolve));
const smtpPort = smtpServer.address().port;
const settings = expectStatus(await request("GET", "/api/settings", { token: rootToken }), 200, "read settings");
expectStatus(await request("PATCH", "/api/settings", {
  token: rootToken,
  body: {
    ...settings,
    smtp: { ...settings.smtp, enabled: true, host: "127.0.0.1", port: smtpPort, username: "", password: "", authMethod: "", tls: false, localName: "bvhub-integration.test" },
    meta: { ...settings.meta, appURL: "https://v2.bv-erlangen2025.de", senderName: "bvHub Test", senderAddress: "test@example.test" },
  },
}), 200, "configure isolated SMTP sink");

async function waitForMail(previousCount) {
  for (let i = 0; i < 40; i += 1) {
    if (smtpMessages.length > previousCount) return smtpMessages.at(-1);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("SMTP sink did not receive the expected message");
}

function otpCode(message) {
  const code = message.match(/\b\d{6}\b/);
  assert.ok(code, "OTP mail contains a six-digit code");
  return code[0];
}

const registrationEmail = "new-registration@example.test";
const registrationDisplayName = "New Registration";
const registrationBeforeMail = smtpMessages.length;
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
await waitForMail(registrationBeforeMail);

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
assert.equal(registeredUser.emailVisibility, true, "registration forces email visibility");
const registeredGroups = expectStatus(await request("GET", `/api/collections/user_groups/records?filter=${encodeURIComponent(`user = "${registeredUser.id}"`)}`, { token: rootToken }), 200, "registration default group");
assert.equal(registeredGroups.items.length, 1, "new users receive one default group");
const registeredGuestGroup = expectStatus(await request("GET", `/api/collections/groups/records/${registeredGroups.items[0].group}`, { token: rootToken }), 200, "read registration default group");
assert.equal(registeredGuestGroup.name, "Guest");
const forcedVisibility = expectStatus(await request("PATCH", `/api/collections/users/records/${registeredUser.id}`, { token: rootToken, body: { emailVisibility: false } }), 200, "force email visibility on update");
assert.equal(forcedVisibility.emailVisibility, true);
assert.equal(registeredUser.verified, false);

const registeredProfiles = expectStatus(await request(
  "GET",
  `/api/collections/user_profiles/records?filter=${encodeURIComponent(`user = "${registeredUser.id}"`)}`,
  { token: rootToken },
), 200, "find registered profile");
assert.equal(registeredProfiles.items.length, 1, "registration creates one profile");
assert.equal(registeredProfiles.items[0].postalCode, "91052");
for (const [firstName, lastName] of [["É", "O'Neil"], ["张", "李"], ["Märie", "D'Angelo"]]) {
  const unicodeEmail = `${firstName.codePointAt(0)}-${Date.now()}@example.test`;
  const before = smtpMessages.length;
  const result = expectStatus(await request("POST", "/api/bvhub/register", { body: { displayName: `${firstName} ${lastName}`, firstName, lastName, email: unicodeEmail, street: "Teststrasse", houseNumber: "12-14", postalCode: "91052", city: "Erlangen", birthDate: "2000-01-01" } }), 201, `unicode registration ${firstName}`);
  await waitForMail(before);
  assert.equal(result.success, true);
}

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

expectStatus(await request("POST", "/api/bvhub/verify-email", { body: { token: "invalid-token" } }), 400, "invalid verification token");

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

const inactiveGuest = expectStatus(await request("POST", "/api/collections/users/records", { token: rootToken, body: { ...userBody("inactive-guest@example.test", "GUEST"), displayName: "Inactive Guest" } }), 200, "create inactive test user");
expectStatus(await request("PATCH", `/api/collections/users/records/${inactiveGuest.id}`, { token: rootToken, body: { active: false } }), 200, "deactivate guest");
const unverifiedGuest = expectStatus(await request("POST", "/api/collections/users/records", { token: rootToken, body: { ...userBody("unverified-guest@example.test", "GUEST"), displayName: "Unverified Guest", verified: false } }), 200, "create unverified test user");

for (const account of [inactiveGuest, unverifiedGuest]) {
  const result = await request("POST", "/api/collections/users/request-otp", { body: { email: account.email } });
  assert.equal(result.status, 400, "inactive or unverified OTP request is rejected");
  assert.deepEqual(Object.keys(result.data || {}).sort(), ["data", "message", "status"]);
}

const otpRequests = [];
let memberLoginToken = "";
let guestLoginToken = "";
for (const account of [member, guest]) {
  const before = smtpMessages.length;
  const otp = expectStatus(await request("POST", "/api/collections/users/request-otp", { body: { email: account.email } }), 200, `request OTP for ${account.role}`);
  assert.equal(typeof otp.otpId, "string");
  const message = await waitForMail(before);
  const code = otpCode(message);
  otpRequests.push({ account, otpId: otp.otpId, code });
  const login = expectStatus(await request("POST", "/api/collections/users/auth-with-otp", { body: { otpId: otp.otpId, password: code } }), 200, `authenticate ${account.role} with OTP`);
  assert.equal(typeof login.token, "string");
  assert.equal(login.record.role, account.role);
  assert.equal(login.record.active, true);
  assert.equal(login.record.verified, true);
  if (account === member) memberLoginToken = login.token;
  if (account === guest) guestLoginToken = login.token;
}

const ownProfileResponse = await request("GET", "/api/bvhub/me/profile", { token: memberLoginToken });
const ownProfile = expectStatus(ownProfileResponse, 200, "member reads own profile");
assert.equal(ownProfileResponse.headers.get("cache-control"), "no-store", "profile response is not cacheable");
assert.equal(ownProfile.user.id, member.id);
assert.equal(ownProfile.profile, null, "missing profile is represented as null");
assert.equal(Object.hasOwn(ownProfile.user, "password"), false, "profile response excludes password");
const profilePatch = {
  displayName: "Updated Member",
  firstName: "Updated",
  lastName: "Member",
  street: "Teststrasse",
  houseNumber: "12a",
  postalCode: "91052",
  city: "Erlangen",
  birthDate: "2000-01-01",
  phone: "+49 911 123456",
  contactInfo: "Integration profile",
};
const savedProfile = expectStatus(await request("PATCH", "/api/bvhub/me/profile", { token: memberLoginToken, body: profilePatch }), 200, "member updates own profile");
assert.equal(savedProfile.user.displayName, profilePatch.displayName);
assert.equal(savedProfile.profile.birthDate, profilePatch.birthDate, "calendar date remains unchanged");
expectStatus(await request("PATCH", "/api/bvhub/me/profile", { token: memberLoginToken, body: { birthDate: "2001-02-29" } }), 400, "invalid calendar date rejected");
expectStatus(await request("PATCH", "/api/bvhub/me/profile", { token: memberLoginToken, body: { birthDate: "2999-01-01" } }), 400, "future birth date rejected");
expectStatus(await request("PATCH", "/api/bvhub/me/profile", { token: memberLoginToken, body: { postalCode: "91A52" } }), 400, "invalid postal code rejected");
expectStatus(await request("PATCH", "/api/bvhub/me/profile", { token: memberLoginToken, body: { displayName: "Rollback Candidate", postalCode: "invalid" } }), 400, "invalid transaction rejected");
const afterRollback = expectStatus(await request("GET", "/api/bvhub/me/profile", { token: memberLoginToken }), 200, "read profile after rollback");
assert.equal(afterRollback.user.displayName, profilePatch.displayName, "failed update changes no user fields");
const duplicateProfile = await request("PATCH", "/api/bvhub/me/profile", { token: memberLoginToken, body: { displayName: "  test guest  " } });
assert.equal(duplicateProfile.status, 409, "duplicate displayName returns conflict");
const forbiddenFields = await request("PATCH", "/api/bvhub/me/profile", { token: memberLoginToken, body: { role: "ADMIN" } });
assert.equal(forbiddenFields.status, 400, "privileged profile fields are rejected");
const guestProfile = expectStatus(await request("PATCH", "/api/bvhub/me/profile", { token: guestLoginToken, body: { displayName: "Updated Guest" } }), 200, "guest updates own profile");
assert.equal(guestProfile.user.displayName, "Updated Guest");
const refreshedGuestProfile = expectStatus(await request("GET", "/api/bvhub/me/profile", { token: guestLoginToken }), 200, "guest reloads updated profile");
assert.equal(refreshedGuestProfile.user.displayName, "Updated Guest");
expectStatus(await request("PATCH", "/api/bvhub/me/profile", { token: guestLoginToken, body: { displayName: "Updated Guest", created: "forged" } }), 400, "profile metadata mass assignment rejected");
const memberProfileRecord = expectStatus(await request("GET", `/api/collections/user_profiles/records?filter=${encodeURIComponent(`user = "${member.id}"`)}`, { token: rootToken }), 200, "find member profile");
const relationAttempt = await request("PATCH", `/api/collections/user_profiles/records/${memberProfileRecord.items[0].id}`, { token: memberLoginToken, body: { user: guest.id } });
assert.notEqual(relationAttempt.status, 200, "profile user relation cannot be rebound");
assert.notEqual((await request("GET", "/api/bvhub/me/profile", { token: rootToken })).status, 200, "technical superuser cannot use application profile API");

const concurrentResults = await Promise.all([
  request("PATCH", "/api/bvhub/me/profile", { token: memberLoginToken, body: { displayName: "Concurrent Name" } }),
  request("PATCH", "/api/bvhub/me/profile", { token: guestLoginToken, body: { displayName: "Concurrent Name" } }),
]);
assert.deepEqual(concurrentResults.map((result) => result.status).sort((a, b) => a - b), [200, 409], "concurrent identical names have exactly one winner");

const tokenPayload = JSON.parse(Buffer.from(memberLoginToken.split(".")[1], "base64url").toString("utf8"));
assert.equal(typeof tokenPayload.iat, "undefined", "PocketBase auth token does not include iat");
assert.ok(Math.abs((tokenPayload.exp - Math.floor(Date.now() / 1000)) - 43200) <= 5, "fresh local auth token lasts twelve hours");
const stale = otpRequests[0];
const secondBefore = smtpMessages.length;
const secondOtp = expectStatus(await request("POST", "/api/collections/users/request-otp", { body: { email: stale.account.email } }), 200, "request replacement OTP");
const secondCode = otpCode(await waitForMail(secondBefore));
expectStatus(await request("POST", "/api/collections/users/auth-with-otp", { body: { otpId: stale.otpId, password: secondCode } }), 400, "mismatched OTP id and code rejected");
expectStatus(await request("POST", "/api/collections/users/auth-with-otp", { body: { otpId: stale.otpId, password: stale.code } }), 400, "reused OTP rejected");

const rateLimitSettings = expectStatus(await request("GET", "/api/settings", { token: rootToken }), 200, "read rate limit settings");
expectStatus(await request("PATCH", "/api/settings", {
  token: rootToken,
  body: { ...rateLimitSettings, rateLimits: { ...rateLimitSettings.rateLimits, enabled: true, rules: [{ label: "users:requestOTP", duration: 60, maxRequests: 1 }] } },
}), 200, "configure OTP rate limit test");
await request("POST", "/api/collections/users/request-otp", { body: { email: member.email } });
const rateLimited = await request("POST", "/api/collections/users/request-otp", { body: { email: member.email } });
assert.equal(rateLimited.status, 429, "OTP request rate limit is enforced");
assert.deepEqual(Object.keys(rateLimited.data || {}).sort(), ["data", "message", "status"]);

const superLogin = expectStatus(await request("POST", "/api/collections/users/auth-with-password", {
  body: { identity: superAdmin.email, password: "Synthetic-password-12!" },
}), 200, "superadmin password login");
const adminLogin = expectStatus(await request("POST", "/api/collections/users/auth-with-password", {
  body: { identity: admin.email, password: "Synthetic-password-12!" },
}), 200, "admin password login");
for (const [label, token, displayName] of [["admin", adminLogin.token, "Updated Admin"], ["superadmin", superLogin.token, "Updated Superadmin"]]) {
  const updated = expectStatus(await request("PATCH", "/api/bvhub/me/profile", { token, body: { displayName } }), 200, `${label} updates own profile`);
  assert.equal(updated.user.displayName, displayName, `${label} profile response contains updated name`);
  const reloaded = expectStatus(await request("GET", "/api/bvhub/me/profile", { token }), 200, `${label} reloads updated profile`);
  assert.equal(reloaded.user.displayName, displayName, `${label} profile reload contains updated name`);
}
expectStatus(await request("GET", "/api/bvhub/admin/users", { token: adminLogin.token }), 200, "admin lists users with legacy user_groups schema");
expectStatus(await request("GET", "/api/bvhub/admin/users", { token: superLogin.token }), 200, "superadmin lists users");
expectStatus(await request("GET", "/api/bvhub/admin/users", { token: memberLoginToken }), 403, "member cannot list users");
expectStatus(await request("GET", "/api/bvhub/admin/users", { token: guestLoginToken }), 403, "guest cannot list users");
expectStatus(await request("GET", "/api/bvhub/admin/groups", { token: memberLoginToken }), 403, "member cannot list managed groups");
const otpUnknown = await request("POST", "/api/collections/users/request-otp", { body: { email: "unknown@example.test" } });
for (const account of [admin, superAdmin]) {
  const result = await request("POST", "/api/collections/users/request-otp", { body: { email: account.email } });
  assert.equal(result.status, otpUnknown.status, "privileged OTP status must match unknown account");
  assert.deepEqual(Object.keys(result.data || {}).sort(), Object.keys(otpUnknown.data || {}).sort(), "privileged OTP response shape must not enumerate role");
}
const managed = expectStatus(await request("POST", "/api/collections/users/records", {
  token: adminLogin.token, body: { ...userBody("managed@example.test", "MEMBER"), displayName: "Managed Member", verified: undefined },
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

// Direct role mass-assignment is rejected; only the dedicated super-admin route may change roles.
expectStatus(await request("PATCH", `/api/collections/users/records/${managed.id}`, {
  token: superLogin.token, body: { role: "ADMIN" },
}), 404, "direct role update rejected");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: adminLogin.token, body: { role: "GUEST", confirmation: "ROLE_CHANGE" },
}), 200, "admin changes member to guest");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: adminLogin.token, body: { role: "ADMIN", confirmation: "ROLE_CHANGE" },
}), 403, "admin cannot grant admin role");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: superLogin.token, body: { role: "ADMIN", confirmation: "ROLE_CHANGE" },
}), 200, "superadmin promotes member");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: memberLoginToken, body: { role: "ADMIN", confirmation: "ROLE_CHANGE" },
}), 403, "member cannot change roles");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: superLogin.token, body: { role: "SUPER_ADMIN", confirmation: "ROLE_CHANGE" },
}), 400, "management route cannot grant superadmin");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: superLogin.token, body: { role: "ADMIN", confirmation: "ROLE_CHANGE", active: true },
}), 400, "role endpoint rejects mass assignment");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${superAdmin.id}/role`, {
  token: superLogin.token, body: { role: "MEMBER", confirmation: "ROLE_CHANGE" },
}), 403, "superadmin cannot modify own role");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: superLogin.token, body: { role: "MEMBER", confirmation: "ROLE_CHANGE" },
}), 200, "superadmin demotes admin");
const roleSessionTarget = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: userBody("role-session@example.test", "MEMBER"),
}), 200, "create role session target");
const roleSession = expectStatus(await request("POST", `/api/collections/users/impersonate/${roleSessionTarget.id}`, {
  token: rootToken, body: { duration: 300 },
}), 200, "create target session before role change");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${roleSessionTarget.id}/role`, {
  token: superLogin.token, body: { role: "ADMIN", confirmation: "ROLE_CHANGE" },
}), 200, "superadmin promotes active member");
assert.notEqual((await request("POST", "/api/collections/users/auth-refresh", { token: roleSession.token })).status, 200, "role change invalidates existing target sessions");

const managementGroups = expectStatus(await request("GET", "/api/bvhub/admin/groups", { token: adminLogin.token }), 200, "admin reads canonical groups");
assert.deepEqual(managementGroups.groups.map((group) => group.name).sort(), ["Guest", "Member ER", "Member NUE"]);
const groupIds = managementGroups.groups.slice(0, 2).map((group) => group.id);
expectStatus(await request("POST", "/api/collections/user_groups/records", {
  token: adminLogin.token, body: { user: member.id, group: groupIds[0] },
}), 403, "direct group relation rejected");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, {
  token: adminLogin.token, body: { groups: groupIds },
}), 200, "admin assigns member groups");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, {
  token: adminLogin.token, body: { groups: [groupIds[0]] },
}), 200, "admin removes a member group");
const refreshedUsers = expectStatus(await request("GET", "/api/bvhub/admin/users", { token: adminLogin.token }), 200, "reload users after group removal");
assert.deepEqual(refreshedUsers.items.find((user) => user.id === member.id).groups.map((group) => group.id), [groupIds[0]], "reloaded user contains current groups");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, {
  token: adminLogin.token, body: { groups: groupIds },
}), 200, "admin restores member groups");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${guest.id}/groups`, {
  token: superLogin.token, body: { groups: [groupIds[0]] },
}), 200, "superadmin assigns guest groups");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, {
  token: memberLoginToken, body: { groups: [] },
}), 403, "member cannot change groups");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, {
  token: guestLoginToken, body: { groups: [] },
}), 403, "guest cannot change groups");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, {
  token: adminLogin.token, body: { groups: [groupIds[0], groupIds[0]] },
}), 400, "duplicate group ids rejected");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, {
  token: adminLogin.token, body: { groups: ["invalid00000000"] },
}), 400, "unknown group id rejected");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, {
  token: adminLogin.token, body: { groups: groupIds, role: "ADMIN" },
}), 400, "group endpoint rejects mass assignment");
expectStatus(await request("PUT", `/api/bvhub/admin/users/${admin.id}/groups`, {
  token: adminLogin.token, body: { groups: groupIds },
}), 403, "admin cannot assign groups to admin");
expectStatus(await request("PUT", "/api/bvhub/admin/users/notavalidid/groups", {
  token: adminLogin.token, body: { groups: groupIds },
}), 400, "invalid target id is rejected");
const impersonation = expectStatus(await request("POST", `/api/collections/users/impersonate/${member.id}`, {
  token: rootToken, body: { duration: 300 },
}), 200, "member impersonation for rule test");
const ownGroups = expectStatus(await request("GET", "/api/collections/user_groups/records?perPage=50", {
  token: impersonation.token,
}), 200, "member reads own group relations");
assert.equal(ownGroups.items.length, 2, "member must see both own groups");
const foreignGroups = expectStatus(await request("GET", `/api/collections/user_groups/records?filter=${encodeURIComponent(`user = "${guest.id}"`)}`, {
  token: impersonation.token,
}), 200, "member attempts to read foreign group relations");
assert.equal(foreignGroups.items.length, 0, "member cannot read foreign group relations");
const audits = expectStatus(await request("GET", "/api/collections/audit_events/records?perPage=100", { token: rootToken }), 200, "read audit events");
assert.ok(audits.items.some((event) => event.eventType === "USER_ROLE_CHANGED"), "role changes are audited");
assert.ok(audits.items.some((event) => event.eventType === "USER_GROUPS_CHANGED"), "group changes are audited");
assert.ok(audits.items.every((event) => !Object.hasOwn(event, "email") && !Object.hasOwn(event, "token")), "audit events contain no token or email");

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
smtpServer.close();

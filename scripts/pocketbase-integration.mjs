import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dashboardTime = require("../pocketbase/pb_hooks/dashboard-statistics-service.js");
const paymentService = require("../pocketbase/pb_hooks/payment-service.js");

const purposeEventId = "abc123def456ghi";
assert.equal(paymentService.paymentPurpose(purposeEventId, "\u0000 \t"), `EVT-${purposeEventId}-PAY-MEMBER`, "an empty normalized payment name has a stable fallback");
const normalizedPurpose = paymentService.paymentPurpose(purposeEventId, `${"A".repeat(200)}\nUnsafe[]`);
assert.equal(normalizedPurpose.length, 140, "normalized payment purposes fit the EPC message limit");
assert.match(normalizedPurpose, /^[A-Za-z0-9 /?:().,'+\-]+$/, "normalized payment purposes contain EPC-safe characters only");

assert.equal(dashboardTime.berlinMonthKey(new Date("2026-03-31T21:59:59.999Z")), "2026-03", "Berlin month remains March before local midnight");
assert.equal(dashboardTime.berlinMonthKey(new Date("2026-03-31T22:00:00.000Z")), "2026-04", "Berlin summer-time month starts at 22:00 UTC");
assert.equal(dashboardTime.berlinMonthKey(new Date("2026-10-31T22:59:59.999Z")), "2026-10", "Berlin month remains October after DST ends");
assert.equal(dashboardTime.berlinMonthKey(new Date("2026-10-31T23:00:00.000Z")), "2026-11", "Berlin winter-time month starts at 23:00 UTC");
assert.deepEqual(dashboardTime.recentMonths("2026-01", 6), ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"], "cross-year cron month sequence is stable");
assert.equal(dashboardTime.monthStartUtc("2026-04").toISOString(), "2026-03-31T22:00:00.000Z", "Berlin April starts at summer-time midnight");
assert.equal(dashboardTime.monthStartUtc("2026-11").toISOString(), "2026-10-31T23:00:00.000Z", "Berlin November starts at winter-time midnight");
globalThis.DynamicModel = class DynamicModel { constructor(shape) { Object.assign(this, shape); } };
const memberCountQueries = [];
const dashboardTestApp = { db: () => ({ newQuery(sql) {
  const query = {
    bind(params) { this.params = params; return this; },
    one(model) {
      if (sql.includes("FROM users")) {
        memberCountQueries.push({ sql, params: this.params });
        const value = memberCountQueries.length;
        model.registeredUsers = value === 1 ? 5 : value;
        model.members = value === 1 ? 1 : value;
      } else if (sql.includes("FROM events")) {
        model.total = 7;
      } else {
        model.total = 2;
      }
    },
  };
  return query;
} }) };
const serviceStatistics = dashboardTime.dashboardStatistics(dashboardTestApp, "user-id", new Date("2026-09-17T12:00:00.000Z"));
assert.equal(serviceStatistics.current.registeredUsers, 5, "all current user roles are registered users");
assert.equal(serviceStatistics.current.members, 1, "only current MEMBER roles are formal members");
assert.deepEqual(serviceStatistics.months.map((item) => item.month), ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"], "dashboard returns six Berlin calendar months");
assert.deepEqual(serviceStatistics.months.map((item) => item.registeredUsers), [2, 3, 4, 5, 6, 5], "each historical month has a cumulative registered-user count");
assert.deepEqual(serviceStatistics.months.map((item) => item.members), [2, 3, 4, 5, 6, 1], "historical member counts use the user's current role");
assert.deepEqual(memberCountQueries.slice(1).map((query) => query.params.createdBefore), [
  "2026-04-30T22:00:00.000Z",
  "2026-05-31T22:00:00.000Z",
  "2026-06-30T22:00:00.000Z",
  "2026-07-31T22:00:00.000Z",
  "2026-08-31T22:00:00.000Z",
], "historical counts end at the following Berlin month boundary");
assert.ok(memberCountQueries.every((query) => query.sql.includes("COUNT(*) AS registeredUsers")), "registered users include every role");
assert.ok(memberCountQueries.every((query) => query.sql.includes("role = 'MEMBER'")), "formal members are filtered by current MEMBER role");
assert.equal(serviceStatistics.trackingSince, "2026-04", "tracking starts at the first returned month");
assert.deepEqual(serviceStatistics.months.map((item) => item.complete), [true, true, true, true, true, false], "only the live month is incomplete");
delete globalThis.DynamicModel;

const baseUrl = process.env.PB_TEST_URL;
const superuserEmail = process.env.PB_TEST_SUPERUSER_EMAIL;
const superuserPassword = process.env.PB_TEST_SUPERUSER_PASSWORD;
const serverLogPath = process.env.PB_TEST_SERVER_LOG;
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

async function paymentsForRegistration(registrationId, rootToken) {
  return expectStatus(await request("GET", `/api/collections/payments/records?filter=${encodeURIComponent(`registration = "${registrationId}"`)}`, { token: rootToken }), 200, "read registration payments").items;
}

const userBody = (email, role, password = "Synthetic-password-12!") => ({
  email, password, passwordConfirm: password, displayName: `Test ${role}`,
  firstName: "Synthetic", lastName: "Account", role, active: true, verified: true,
});

const auth = expectStatus(await request("POST", "/api/collections/_superusers/auth-with-password", {
  body: { identity: superuserEmail, password: superuserPassword },
}), 200, "superuser login");
const rootToken = auth.token;

if (process.env.PB_TEST_STAGE_LEGACY === "1") {
  const legacyEventSchema = expectStatus(await request("GET", "/api/collections/events", { token: rootToken }), 200, "read pre-payment event schema");
  assert.equal(legacyEventSchema.fields.some((field) => field.name === "guestFeeCents"), false, "guest fee migration is down before seeding legacy records");
  expectStatus(await request("GET", "/api/collections/payments", { token: rootToken }), 404, "payments collection is absent before migration");
  const legacyUser = expectStatus(await request("POST", "/api/collections/users/records", {
    token: rootToken,
    body: { ...userBody("legacy-payment-registration@example.test", "GUEST"), displayName: "Legacy Payment Guest" },
  }), 200, "seed pre-payment guest");
  const legacyMember = expectStatus(await request("POST", "/api/collections/users/records", {
    token: rootToken,
    body: { ...userBody("legacy-member-payment@example.test", "MEMBER"), displayName: "Legacy Payment Member" },
  }), 200, "seed pre-payment member");
  const legacyVenue = expectStatus(await request("POST", "/api/collections/venues/records", {
    token: rootToken,
    body: { name: "Legacy Payment Migration Venue", address: "Migrationstrasse 1", description: "", checkoutRegion: "ER", active: true },
  }), 200, "seed pre-payment venue");
  const legacyEvent = expectStatus(await request("POST", "/api/collections/events/records", {
    token: rootToken,
    body: { title: "Legacy Payment Migration Event", description: "", venue: legacyVenue.id, start: "2098-01-01T18:00:00.000Z", end: "2098-01-01T20:00:00.000Z", abmeldefrist: "2097-12-31T18:00:00.000Z", capacity: 10, published: false, status: "OPEN_TO_ALL", createdBy: legacyUser.id },
  }), 200, "seed event before guest fee migration");
  expectStatus(await request("POST", "/api/collections/event_registrations/records", {
    token: rootToken,
    body: { event: legacyEvent.id, user: legacyUser.id, status: "REGISTERED", registeredAt: "2097-12-01T12:00:00.000Z", checkoutRegion: "ER", termsVersion: "LEGACY-PAYMENT-MIGRATION", termsAcceptedAt: "2097-12-01T12:00:00.000Z" },
  }), 200, "seed registered participant before payment migration");
  expectStatus(await request("POST", "/api/collections/event_registrations/records", {
    token: rootToken,
    body: { event: legacyEvent.id, user: legacyMember.id, status: "REGISTERED", registeredAt: "2097-12-01T12:00:00.000Z", checkoutRegion: "ER", termsVersion: "LEGACY-PAYMENT-MIGRATION-MEMBER", termsAcceptedAt: "2097-12-01T12:00:00.000Z" },
  }), 200, "seed registered member before payment migration");
  fs.writeSync(process.stdout.fd, "Legacy payment migration fixture seeded\n");
  process.exit(0);
}

const migratedEvents = expectStatus(await request("GET", `/api/collections/events/records?filter=${encodeURIComponent('title = "Legacy Payment Migration Event"')}`, { token: rootToken }), 200, "read migrated legacy event");
assert.equal(migratedEvents.items.length, 1, "legacy migration event remains present");
assert.equal(migratedEvents.items[0].guestFeeCents, 380, "old events are backfilled to 380 cents");
const migratedRegistration = expectStatus(await request("GET", `/api/collections/event_registrations/records?filter=${encodeURIComponent('termsVersion = "LEGACY-PAYMENT-MIGRATION"')}`, { token: rootToken }), 200, "read migrated registration").items[0];
const migratedPayment = await paymentsForRegistration(migratedRegistration.id, rootToken);
assert.equal(migratedPayment.length, 1, "old registered participant is backfilled exactly once");
assert.equal(migratedPayment[0].roleSnapshot, "GUEST");
assert.equal(migratedPayment[0].paymentRequired, true);
assert.equal(migratedPayment[0].amountCents, 380);
assert.equal(migratedPayment[0].status, "UNPAID");
assert.equal(migratedPayment[0].active, true);
assert.match(migratedPayment[0].purpose, /^BVHUB-EVT-[a-z0-9]{15}-PAY-[a-z0-9]{15}$/, "legacy payment purpose remains unchanged");
const paymentSchema = expectStatus(await request("GET", "/api/collections/payments", { token: rootToken }), 200, "read migrated payment schema");
assert.equal(paymentSchema.fields.find((field) => field.name === "purpose").pattern, "", "new payment purposes are not constrained to the legacy format");
assert.equal(paymentSchema.indexes.some((index) => index.includes("idx_payments_purpose")), false, "payment purposes are not unique");
const migratedMemberRegistration = expectStatus(await request("GET", `/api/collections/event_registrations/records?filter=${encodeURIComponent('termsVersion = "LEGACY-PAYMENT-MIGRATION-MEMBER"')}`, { token: rootToken }), 200, "read migrated member registration").items[0];
const migratedMemberPayment = await paymentsForRegistration(migratedMemberRegistration.id, rootToken);
assert.equal(migratedMemberPayment.length, 1, "old registered member is backfilled exactly once");
assert.equal(migratedMemberPayment[0].roleSnapshot, "MEMBER");
assert.equal(migratedMemberPayment[0].paymentRequired, false);
assert.equal(migratedMemberPayment[0].amountCents, 0);
assert.equal(migratedMemberPayment[0].status, "PAID");

const initialSettings = expectStatus(await request("GET", "/api/settings", { token: rootToken }), 200, "read initial settings");
const registrationRateLimit = initialSettings.rateLimits.rules.find((rule) => rule.label === "POST /api/bvhub/register");
assert.equal(initialSettings.rateLimits.enabled, true, "rate limiting is enabled");
assert.deepEqual(registrationRateLimit, {
  label: "POST /api/bvhub/register",
  audience: "@guest",
  duration: 60,
  maxRequests: 5,
}, "guest registration has a dedicated rate limit");
expectStatus(await request("PATCH", "/api/settings", {
  token: rootToken,
  body: { ...initialSettings, rateLimits: { ...initialSettings.rateLimits, rules: [registrationRateLimit] } },
}), 200, "isolate registration rate limit test");

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
const registeredEmailStatus = expectStatus(await request("POST", "/api/bvhub/auth/account-status", { body: { email: registrationEmail } }), 200, "registered email status");
assert.equal(registeredEmailStatus.exists, true, "registered email is reported as existing");
const unknownEmailStatus = expectStatus(await request("POST", "/api/bvhub/auth/account-status", { body: { email: "unknown@example.test" } }), 200, "unknown email status");
assert.equal(unknownEmailStatus.exists, false, "unknown email is reported as not existing");
expectStatus(await request("POST", "/api/bvhub/auth/account-status", { body: { email: "not-an-email" } }), 400, "invalid email status request");
expectStatus(await request("POST", "/api/bvhub/auth/account-status", { body: { email: registrationEmail, role: "ADMIN" } }), 400, "account status rejects extra fields");
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
expectStatus(await request("POST", "/api/bvhub/register", {
  body: {
    displayName: "Rate Limited Registration",
    firstName: "Rate",
    lastName: "Limited",
    email: "rate-limited@example.test",
    street: "Teststrasse",
    houseNumber: "12a",
    postalCode: "91052",
    city: "Erlangen",
    birthDate: "2000-01-01",
  },
}), 429, "registration rate limit");

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
const inactiveAdmin = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: { ...userBody("inactive-admin@example.test", "ADMIN"), displayName: "Inactive Admin" },
}), 200, "create inactive admin");
const inactiveAdminSession = expectStatus(await request("POST", `/api/collections/users/impersonate/${inactiveAdmin.id}`, {
  token: rootToken, body: { duration: 300 },
}), 200, "create inactive admin session");
expectStatus(await request("PATCH", `/api/collections/users/records/${inactiveAdmin.id}`, {
  token: rootToken, body: { active: false },
}), 200, "deactivate admin test account");
const unverifiedAdmin = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: { ...userBody("unverified-admin@example.test", "ADMIN"), displayName: "Unverified Admin" },
}), 200, "create unverified admin");
const unverifiedAdminSession = expectStatus(await request("POST", `/api/collections/users/impersonate/${unverifiedAdmin.id}`, {
  token: rootToken, body: { duration: 300 },
}), 200, "create unverified admin session");
expectStatus(await request("PATCH", `/api/collections/users/records/${unverifiedAdmin.id}`, {
  token: rootToken, body: { verified: false },
}), 200, "unverify admin test account");
const member = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: userBody("member@example.test", "MEMBER"),
}), 200, "create member with 12+ password");
const guest = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: userBody("guest@example.test", "GUEST"),
}), 200, "create guest");
const paymentGuest = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken, body: { ...userBody("payment-guest@example.test", "GUEST"), displayName: "Payment Guest" },
}), 200, "create second guest for payment snapshots");
const paymentGuestToken = expectStatus(await request("POST", `/api/collections/users/impersonate/${paymentGuest.id}`, {
  token: rootToken, body: { duration: 300 },
}), 200, "impersonate second payment guest").token;

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

expectStatus(await request("GET", "/api/bvhub/admin/payment-settings"), 401, "unauthenticated payment settings read");
for (const [label, token] of [["guest", guestLoginToken], ["member", memberLoginToken]]) {
  expectStatus(await request("GET", "/api/bvhub/admin/payment-settings", { token }), 403, `${label} cannot read payment settings`);
  expectStatus(await request("PATCH", "/api/bvhub/admin/payment-settings", { token, body: { recipientName: "Forbidden" } }), 403, `${label} cannot update payment settings`);
}
const emptyPaymentSettings = expectStatus(await request("GET", "/api/bvhub/admin/payment-settings", { token: adminLogin.token }), 200, "admin reads empty payment settings");
assert.equal(emptyPaymentSettings.configured, false);
expectStatus(await request("PATCH", "/api/bvhub/admin/payment-settings", {
  token: adminLogin.token, body: { recipientName: "Badminton Verein Erlangen", iban: "DE00 0000 0000 0000 0000 00", bic: "COBADEFFXXX" },
}), 400, "payment settings reject invalid IBAN checksum");
const adminPaymentSettings = expectStatus(await request("PATCH", "/api/bvhub/admin/payment-settings", {
  token: adminLogin.token, body: { recipientName: "  Badminton Verein Erlangen  ", iban: "de89 3704 0044 0532 0130 00", bic: "cobadeffxxx" },
}), 200, "admin updates payment settings");
assert.deepEqual({ recipientName: adminPaymentSettings.recipientName, iban: adminPaymentSettings.iban, bic: adminPaymentSettings.bic, configured: adminPaymentSettings.configured }, {
  recipientName: "Badminton Verein Erlangen", iban: "DE89370400440532013000", bic: "COBADEFFXXX", configured: true,
});
const superPaymentSettings = expectStatus(await request("PATCH", "/api/bvhub/admin/payment-settings", {
  token: superLogin.token, body: { iban: "DE12500105170648489890" },
}), 200, "superadmin updates payment settings");
assert.equal(superPaymentSettings.iban, "DE12500105170648489890");

expectStatus(await request("GET", "/api/bvhub/dashboard/statistics"), 401, "unauthenticated dashboard statistics");
expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: inactiveAdminSession.token }), 403, "inactive account cannot read dashboard statistics");
expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: unverifiedAdminSession.token }), 403, "unverified account cannot read dashboard statistics");
const allUsersForDashboard = expectStatus(await request("GET", "/api/collections/users/records?perPage=500", { token: rootToken }), 200, "read users for dashboard boundary assertions").items;
const expectedRegisteredUsers = allUsersForDashboard.length;
const expectedMembers = allUsersForDashboard.filter((user) => user.role === "MEMBER").length;
assert.ok(allUsersForDashboard.some((user) => user.role === "SUPER_ADMIN"), "dashboard fixture includes a superadmin");
assert.ok(allUsersForDashboard.some((user) => user.role === "ADMIN"), "dashboard fixture includes an admin");
for (const [label, token] of [["guest", guestLoginToken], ["member", memberLoginToken], ["admin", adminLogin.token], ["superadmin", superLogin.token]]) {
  const dashboard = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token }), 200, `${label} reads dashboard statistics`);
  assert.equal(dashboard.timezone, "Europe/Berlin");
  assert.equal(dashboard.current.registeredUsers, expectedRegisteredUsers, "every current user role is counted regardless of activation state");
  assert.equal(dashboard.current.members, expectedMembers, "only member roles are counted");
  assert.equal(dashboard.months.length, 6);
  assert.ok(dashboard.months.every((month) => Number.isInteger(month.registeredUsers) && Number.isInteger(month.members)), "all six dashboard months contain cumulative values");
  assert.equal(dashboard.months.at(-1).complete, false, "current month remains live rather than complete");
}
expectStatus(await request("GET", "/api/collections/dashboard_member_statistics/records", { token: memberLoginToken }), 403, "client cannot list private dashboard snapshots");
expectStatus(await request("POST", "/api/collections/dashboard_member_statistics/records", {
  token: memberLoginToken,
  body: { month: "2020-01", registeredUsers: 999, members: 999, capturedAt: new Date().toISOString() },
}), 403, "client cannot write private dashboard snapshots");

const transientDashboardGuest = expectStatus(await request("POST", "/api/collections/users/records", {
  token: rootToken,
  body: userBody("dashboard-delete@example.test", "GUEST"),
}), 200, "create dashboard deletion boundary user");
const dashboardAfterCreate = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: memberLoginToken }), 200, "dashboard refreshes after user create");
assert.equal(dashboardAfterCreate.current.registeredUsers, expectedRegisteredUsers + 1);
expectStatus(await request("DELETE", `/api/collections/users/records/${transientDashboardGuest.id}`, { token: rootToken }), 204, "delete dashboard boundary user");
const dashboardAfterDelete = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: memberLoginToken }), 200, "dashboard refreshes after user delete");
assert.equal(dashboardAfterDelete.current.registeredUsers, expectedRegisteredUsers);

// WU-05 routes must load their authorization helpers explicitly in the hook module.
expectStatus(await request("GET", "/api/bvhub/admin/events"), 401, "unauthenticated admin event list");
expectStatus(await request("DELETE", "/api/bvhub/admin/events/not-an-id"), 401, "unauthenticated draft delete");
expectStatus(await request("GET", "/api/bvhub/admin/venues"), 401, "unauthenticated admin venue list");
for (const [label, token] of [["guest", guestLoginToken], ["member", memberLoginToken]]) {
  expectStatus(await request("GET", "/api/bvhub/admin/events", { token }), 403, `${label} cannot list admin events`);
  expectStatus(await request("GET", "/api/bvhub/admin/venues", { token }), 403, `${label} cannot list admin venues`);
  expectStatus(await request("POST", "/api/bvhub/admin/events", { token, body: {} }), 403, `${label} cannot create admin events`);
  expectStatus(await request("DELETE", "/api/bvhub/admin/events/not-an-id", { token }), 403, `${label} cannot delete events`);
  expectStatus(await request("POST", "/api/bvhub/admin/venues", { token, body: {} }), 403, `${label} cannot create admin venues`);
}
for (const [account, session] of [[inactiveAdmin, inactiveAdminSession], [unverifiedAdmin, unverifiedAdminSession]]) {
  expectStatus(await request("GET", "/api/bvhub/admin/events", { token: session.token }), 403, `${account.displayName} cannot list admin events`);
  expectStatus(await request("GET", "/api/bvhub/admin/venues", { token: session.token }), 403, `${account.displayName} cannot list admin venues`);
}
for (const [label, token] of [["admin", adminLogin.token], ["superadmin", superLogin.token]]) {
  expectStatus(await request("GET", "/api/bvhub/admin/events", { token }), 200, `${label} lists admin events`);
  expectStatus(await request("GET", "/api/bvhub/admin/venues", { token }), 200, `${label} lists admin venues`);
}
const searchByDisplayName = expectStatus(await request("GET", `/api/bvhub/admin/users?search=${encodeURIComponent("Test ADMIN")}`, { token: adminLogin.token }), 200, "search admin users by display name");
assert.ok(searchByDisplayName.items.some((item) => item.displayName === "Test ADMIN"));
const searchByEmail = expectStatus(await request("GET", `/api/bvhub/admin/users?search=${encodeURIComponent("admin@example.test")}`, { token: adminLogin.token }), 200, "search users by email");
assert.ok(searchByEmail.items.some((item) => item.email === admin.email));
const searchByFirstName = expectStatus(await request("GET", `/api/bvhub/admin/users?search=${encodeURIComponent("Synthetic")}`, { token: adminLogin.token }), 200, "search users by first name");
assert.ok(searchByFirstName.items.length > 0);
const venuePayload = {
  name: "  WU-05 Integration Venue  ",
  address: "Teststrasse 42, 91052 Erlangen",
  description: "Integration venue",
  checkoutRegion: "ER",
};
const createdVenue = expectStatus(await request("POST", "/api/bvhub/admin/venues", {
  token: adminLogin.token, body: venuePayload,
}), 201, "admin creates venue");
assert.equal(createdVenue.name, venuePayload.name.trim(), "venue name is normalized");
assert.equal(createdVenue.active, true, "new venue is active by default");
assert.equal(createdVenue.createdBy, undefined, "venue does not expose a client-controlled creator");
const unconfiguredVenue = expectStatus(await request("POST", "/api/bvhub/admin/venues", {
  token: adminLogin.token, body: { name: "WU-05 Unconfigured Venue", address: "No checkout region" },
}), 201, "admin creates venue without checkout region");
const unconfiguredEvent = expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: { title: "Unconfigured publish test", description: "", venue: unconfiguredVenue.id, start: "2099-08-01T16:00:00.000Z", end: "2099-08-01T18:00:00.000Z", abmeldefrist: "2099-08-01T15:00:00.000Z", capacity: 5, guestFeeCents: 380, published: false, status: "MEMBERS_ONLY" },
}), 201, "admin creates unpublished event with unconfigured venue");
const blockedPublish = await request("PATCH", `/api/bvhub/admin/events/${unconfiguredEvent.id}`, { token: adminLogin.token, body: { published: true } });
assert.notEqual(blockedPublish.status, 500, "publishing an unconfigured venue never returns 500");
assert.ok([400, 409].includes(blockedPublish.status), "publishing an unconfigured venue is rejected");
expectStatus(await request("GET", "/api/bvhub/venues", { token: memberLoginToken }), 200, "member reads active venues");
expectStatus(await request("POST", "/api/bvhub/admin/venues", {
  token: adminLogin.token, body: { ...venuePayload, name: "Invalid extra field venue", createdBy: superAdmin.id },
}), 400, "venue rejects protected payload fields");
const eventPayload = {
  title: "WU-05 Integration Event",
  description: "Plaintext integration event",
  venue: createdVenue.id,
  start: "2099-07-01T16:00:00.000Z",
  end: "2099-07-01T18:00:00.000Z",
  abmeldefrist: "2099-07-01T15:00:00.000Z",
  capacity: 25,
  guestFeeCents: 380,
  published: false,
  status: "MEMBERS_ONLY",
};
const { guestFeeCents: _guestFee, ...eventWithoutGuestFee } = eventPayload;
expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: eventWithoutGuestFee,
}), 400, "event requires guest fee");
expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: { ...eventPayload, createdBy: superAdmin.id },
}), 400, "event rejects client-controlled creator");
const validEvent = expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: eventPayload,
}), 201, "admin creates event");
assert.equal(validEvent.createdBy, admin.id, "event creator is set from authenticated actor");
assert.equal(validEvent.status, "MEMBERS_ONLY");
assert.equal(validEvent.guestFeeCents, 380, "event exposes the integer guest fee");
const dashboardBeforePublish = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: memberLoginToken }), 200, "dashboard before event publish");
const initialChangelog = expectStatus(await request("GET", `/api/bvhub/admin/events/${validEvent.id}/changelog`, { token: adminLogin.token }), 200, "admin reads event changelog");
assert.equal(initialChangelog.items.length, 1, "event creation creates one changelog entry");
const editedFeeEvent = expectStatus(await request("PATCH", `/api/bvhub/admin/events/${validEvent.id}`, {
  token: adminLogin.token, body: { guestFeeCents: 500 },
}), 200, "admin edits event guest fee");
assert.equal(editedFeeEvent.guestFeeCents, 500);
expectStatus(await request("PATCH", `/api/bvhub/admin/events/${validEvent.id}`, {
  token: adminLogin.token, body: { guestFeeCents: 380 },
}), 200, "restore event guest fee for payment fixtures");
const changelogAfterFeeEdit = expectStatus(await request("GET", `/api/bvhub/admin/events/${validEvent.id}/changelog`, { token: adminLogin.token }), 200, "guest fee edits are in the changelog");
assert.equal(changelogAfterFeeEdit.items.length, initialChangelog.items.length + 2);

// Regression: a never-published draft with its CREATED audit row is physically
// deletable. The venue and a control event must remain intact.
const draftEvent = expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token,
  body: { ...eventPayload, title: "WU-05 Draft Delete Regression" },
}), 201, "create real draft");
const draftChangelog = expectStatus(await request("GET", `/api/bvhub/admin/events/${draftEvent.id}/changelog`, { token: adminLogin.token }), 200, "draft changelog exists");
assert.equal(draftChangelog.items.length, 1);
assert.equal(draftEvent.canDelete, true);
expectStatus(await request("DELETE", `/api/bvhub/admin/events/${draftEvent.id}`, { token: adminLogin.token }), 204, "delete real draft");
expectStatus(await request("GET", `/api/collections/events/records/${draftEvent.id}`, { token: rootToken }), 404, "deleted draft is gone");
const adminAfterDraftDelete = expectStatus(await request("GET", "/api/bvhub/admin/events", { token: adminLogin.token }), 200, "admin list after draft delete");
assert.equal(adminAfterDraftDelete.items.some((item) => item.id === draftEvent.id), false);
const orphanChangelog = expectStatus(await request("GET", `/api/collections/event_changelog/records?filter=${encodeURIComponent(`event = "${draftEvent.id}"`)}`, { token: rootToken }), 200, "draft changelog cleanup");
assert.equal(orphanChangelog.items.length, 0);
const superDraft = expectStatus(await request("POST", "/api/bvhub/admin/events", { token: superLogin.token, body: { ...eventPayload, title: "WU-05 Superadmin Draft Delete" } }), 201, "superadmin creates draft");
expectStatus(await request("DELETE", `/api/bvhub/admin/events/${superDraft.id}`, { token: superLogin.token }), 204, "superadmin deletes draft");
const dashboardDraft = expectStatus(await request("POST", "/api/bvhub/admin/events", { token: adminLogin.token, body: { ...eventPayload, title: "WU-05 Dashboard Draft Delete" } }), 201, "create dashboard draft");
const dashboardDelete = await request("DELETE", `/api/collections/events/records/${dashboardDraft.id}`, { token: rootToken });
assert.ok([200, 204].includes(dashboardDelete.status), `dashboard direct draft delete: ${dashboardDelete.status}`);
expectStatus(await request("GET", `/api/collections/events/records/${dashboardDraft.id}`, { token: rootToken }), 404, "dashboard draft is gone");
expectStatus(await request("GET", `/api/bvhub/admin/venues/${createdVenue.id}`, { token: adminLogin.token }), 404, "venue direct route unavailable");
const noOpEvent = expectStatus(await request("PATCH", `/api/bvhub/admin/events/${validEvent.id}`, { token: adminLogin.token, body: eventPayload }), 200, "no-op event patch");
assert.equal(noOpEvent.id, validEvent.id);
const noOpChangelog = expectStatus(await request("GET", `/api/bvhub/admin/events/${validEvent.id}/changelog`, { token: adminLogin.token }), 200, "read changelog after no-op");
assert.equal(noOpChangelog.items.length, changelogAfterFeeEdit.items.length, "no-op patch does not create changelog");
expectStatus(await request("GET", `/api/bvhub/admin/events/${validEvent.id}/changelog`, { token: memberLoginToken }), 403, "member cannot read event changelog");
expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: { ...eventPayload, title: "Invalid range", start: eventPayload.end, end: eventPayload.start },
}), 400, "event rejects invalid time range");
const { abmeldefrist: _deadline, ...eventWithoutDeadline } = eventPayload;
expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: eventWithoutDeadline,
}), 400, "event requires cancellation deadline");
expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: { ...eventPayload, title: "Invalid cancellation deadline", abmeldefrist: eventPayload.end },
}), 400, "event rejects cancellation deadline after event start");
expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: { ...eventPayload, title: "Unknown field", unexpected: true },
}), 400, "event rejects unknown fields");
const publishedEvent = expectStatus(await request("PATCH", `/api/bvhub/admin/events/${validEvent.id}`, {
  token: adminLogin.token, body: { published: true },
}), 200, "admin publishes event");
assert.equal(publishedEvent.published, true);
const dashboardAfterPublish = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: memberLoginToken }), 200, "dashboard after event publish");
assert.equal(dashboardAfterPublish.current.publishedEventsThisMonth, dashboardBeforePublish.current.publishedEventsThisMonth + 1, "first publication in the Berlin month is counted");
const activityEvents = await Promise.all([
  ["WU-05 Activity Members", "2099-08-01T16:00:00.000Z", "MEMBERS_ONLY"],
  ["WU-05 Activity Open", "2099-09-01T16:00:00.000Z", "OPEN_TO_ALL"],
  ["WU-05 Activity Cancelled", "2099-10-01T16:00:00.000Z", "CANCELLED"],
  ["WU-05 Activity Completed", "2099-11-01T16:00:00.000Z", "COMPLETED"],
].map(async ([title, start, status]) => expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token,
  body: { ...eventPayload, title, start, end: new Date(Date.parse(start) + 2 * 60 * 60 * 1000).toISOString(), abmeldefrist: new Date(Date.parse(start) - 60 * 60 * 1000).toISOString(), published: true, status },
}), 201, `create ${title}`)));
const defaultActivityList = expectStatus(await request("GET", "/api/bvhub/events", { token: memberLoginToken }), 200, "member reads default activity list");
assert.ok(defaultActivityList.items.every((item) => ["MEMBERS_ONLY", "OPEN_TO_ALL"].includes(item.status)), "default activity list hides cancelled and completed events");
assert.deepEqual(defaultActivityList.items.map((item) => item.start), [...defaultActivityList.items].map((item) => item.start).sort().reverse(), "default activity list is newest first");
const allActivityList = expectStatus(await request("GET", "/api/bvhub/events?showAll=true", { token: memberLoginToken }), 200, "member reads complete activity list");
assert.ok(allActivityList.items.some((item) => item.id === activityEvents[2].id && item.status === "CANCELLED"), "complete activity list includes cancelled events");
assert.ok(allActivityList.items.some((item) => item.id === activityEvents[3].id && item.status === "COMPLETED"), "complete activity list includes completed events");
assert.deepEqual(allActivityList.items.map((item) => item.start), [...allActivityList.items].map((item) => item.start).sort().reverse(), "complete activity list is newest first");
const adminAddMailBefore = smtpMessages.length;
const paymentPurposeNames = {
  guest: expectStatus(await request("GET", `/api/collections/users/records/${guest.id}`, { token: rootToken }), 200, "read guest payment display name").displayName,
  member: expectStatus(await request("GET", `/api/collections/users/records/${member.id}`, { token: rootToken }), 200, "read member payment display name").displayName,
  paymentGuest: expectStatus(await request("GET", `/api/collections/users/records/${paymentGuest.id}`, { token: rootToken }), 200, "read second guest payment display name").displayName,
};
const adminAdded = expectStatus(await request("POST", `/api/bvhub/admin/events/${validEvent.id}/participants`, { token: adminLogin.token, body: { userId: guest.id } }), 201, "admin add participant immediate mail");
assert.match(await waitForMail(adminAddMailBefore), /hinzugef/);
const adminGuestPayments = await paymentsForRegistration(adminAdded.registrationId, rootToken);
assert.equal(adminGuestPayments.length, 1, "admin manual add creates exactly one payment");
const adminGuestPayment = adminGuestPayments[0];
assert.equal(adminGuestPayment.user, guest.id);
assert.equal(adminGuestPayment.roleSnapshot, "GUEST");
assert.equal(adminGuestPayment.paymentRequired, true);
assert.equal(adminGuestPayment.amountCents, 380);
assert.equal(adminGuestPayment.status, "UNPAID");
assert.equal(adminGuestPayment.active, true);
assert.equal(adminGuestPayment.purpose, `EVT-${validEvent.id}-PAY-${paymentPurposeNames.guest}`, "admin-added participant uses the display name in its payment purpose");
assert.ok(adminGuestPayment.purpose.length <= 140, "payment purpose fits EPC message limit");
const guestOwnPayments = expectStatus(await request("GET", "/api/bvhub/me/payments", { token: guestLoginToken }), 200, "guest reads own payments");
assert.ok(guestOwnPayments.items.some((payment) => payment.id === adminGuestPayment.id));
const guestPaymentDetail = expectStatus(await request("GET", `/api/bvhub/me/payments/${adminGuestPayment.id}`, { token: guestLoginToken }), 200, "guest reads own payment detail");
assert.equal(guestPaymentDetail.paymentSettings.iban, "DE12500105170648489890", "payment detail uses current settings");
assert.equal(guestPaymentDetail.amountCents, 380);
expectStatus(await request("PATCH", "/api/bvhub/admin/payment-settings", {
  token: superLogin.token, body: { iban: "DE89370400440532013000" },
}), 200, "admin bank account can change after payment creation");
const detailAfterBankChange = expectStatus(await request("GET", `/api/bvhub/me/payments/${adminGuestPayment.id}`, { token: guestLoginToken }), 200, "payment detail reloads current bank settings");
assert.equal(detailAfterBankChange.paymentSettings.iban, "DE89370400440532013000");
assert.equal(detailAfterBankChange.amountCents, adminGuestPayment.amountCents, "bank setting changes do not alter amount snapshot");
assert.equal(detailAfterBankChange.purpose, adminGuestPayment.purpose, "bank setting changes do not alter purpose snapshot");
expectStatus(await request("GET", `/api/bvhub/me/payments/${adminGuestPayment.id}`, { token: memberLoginToken }), 404, "user cannot read another user's payment");
expectStatus(await request("GET", `/api/bvhub/me/payments/${adminGuestPayment.id}`, { token: paymentGuestToken }), 404, "second guest cannot read another guest payment");
expectStatus(await request("POST", "/api/collections/payments/records", { token: guestLoginToken, body: { registration: adminAdded.registrationId } }), 403, "guest cannot create payment directly");
expectStatus(await request("PATCH", `/api/collections/payments/records/${adminGuestPayment.id}`, { token: guestLoginToken, body: { status: "PAID" } }), 403, "guest cannot mutate payment collection directly");
expectStatus(await request("DELETE", `/api/collections/payments/records/${adminGuestPayment.id}`, { token: guestLoginToken }), 403, "guest cannot delete payment directly");
for (const [label, token] of [["guest", guestLoginToken], ["member", memberLoginToken]]) {
  expectStatus(await request("PATCH", `/api/bvhub/admin/payments/${adminGuestPayment.id}/status`, { token, body: { status: "PAID" } }), 403, `${label} cannot change payment status`);
}
const paidGuestPayment = expectStatus(await request("PATCH", `/api/bvhub/admin/payments/${adminGuestPayment.id}/status`, {
  token: adminLogin.token, body: { status: "PAID" },
}), 200, "admin marks guest payment paid");
assert.equal(paidGuestPayment.status, "PAID");
assert.ok(paidGuestPayment.paidAt);
assert.equal(paidGuestPayment.paidBy.id, admin.id);
expectStatus(await request("PATCH", `/api/bvhub/admin/events/${validEvent.id}`, {
  token: adminLogin.token, body: { guestFeeCents: 500 },
}), 200, "change event fee after payment creation");
assert.equal((await paymentsForRegistration(adminAdded.registrationId, rootToken))[0].amountCents, 380, "existing payment keeps its amount snapshot");
const secondAdminAddMailBefore = smtpMessages.length;
const secondAdminAdded = expectStatus(await request("POST", `/api/bvhub/admin/events/${validEvent.id}/participants`, {
  token: adminLogin.token, body: { userId: paymentGuest.id },
}), 201, "admin adds guest after fee change");
await waitForMail(secondAdminAddMailBefore);
const secondGuestPayment = (await paymentsForRegistration(secondAdminAdded.registrationId, rootToken))[0];
assert.equal(secondGuestPayment.amountCents, 500, "new payment uses the updated event fee");
assert.equal(secondGuestPayment.status, "UNPAID");
assert.equal(secondGuestPayment.purpose, `EVT-${validEvent.id}-PAY-${paymentPurposeNames.paymentGuest}`, "later payments use the current display name format");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${paymentGuest.id}/role`, {
  token: superLogin.token, body: { role: "MEMBER", confirmation: "ROLE_CHANGE" },
}), 200, "payment guest later becomes a member");
const paymentAfterRoleChange = (await paymentsForRegistration(secondAdminAdded.registrationId, rootToken))[0];
assert.equal(paymentAfterRoleChange.roleSnapshot, "GUEST", "role changes do not rewrite payment role snapshot");
assert.equal(paymentAfterRoleChange.amountCents, 500, "role changes do not rewrite payment amount snapshot");
assert.equal(paymentAfterRoleChange.status, "UNPAID", "role changes do not auto-settle an existing guest payment");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${paymentGuest.id}/role`, {
  token: superLogin.token, body: { role: "GUEST", confirmation: "ROLE_CHANGE" },
}), 200, "restore second payment guest role");
const adminRemoveMailBefore = smtpMessages.length;
expectStatus(await request("DELETE", `/api/bvhub/admin/events/${validEvent.id}/participants/${guest.id}`, { token: adminLogin.token }), 200, "admin remove participant immediate mail");
assert.match(await waitForMail(adminRemoveMailBefore), /abgemeldet/);
const inactivePaidPayment = (await paymentsForRegistration(adminAdded.registrationId, rootToken))[0];
assert.equal(inactivePaidPayment.active, false, "cancellation deactivates payment without deleting it");
assert.equal(inactivePaidPayment.status, "PAID", "cancellation preserves paid status");
const adminParticipantOutbox = expectStatus(await request("GET", `/api/collections/notification_outbox/records?filter=${encodeURIComponent(`registration = "${adminAdded.registrationId}"`)}`, { token: rootToken }), 200, "admin participant notification outbox");
assert.deepEqual(adminParticipantOutbox.items.map((item) => item.kind).sort(), ["EVENT_ADMIN_ADDED", "EVENT_ADMIN_REMOVED"].sort());
const adminReaddMailBefore = smtpMessages.length;
const adminReadded = expectStatus(await request("POST", `/api/bvhub/admin/events/${validEvent.id}/participants`, { token: adminLogin.token, body: { userId: guest.id } }), 201, "admin re-adds cancelled guest");
await waitForMail(adminReaddMailBefore);
assert.equal(adminReadded.registrationId, adminAdded.registrationId, "re-registration reuses the registration");
const reactivatedPayment = (await paymentsForRegistration(adminAdded.registrationId, rootToken))[0];
assert.equal(reactivatedPayment.id, adminGuestPayment.id, "re-registration reuses the payment");
assert.equal(reactivatedPayment.active, true);
assert.equal(reactivatedPayment.status, "PAID", "reactivation does not reset paid status");
assert.equal(reactivatedPayment.amountCents, 380, "reactivation does not update amount snapshot");
const paymentSummary = expectStatus(await request("GET", "/api/bvhub/admin/payment-summary", { token: adminLogin.token }), 200, "admin reads compact payment summary");
assert.ok(paymentSummary.items.some((item) => item.eventId === validEvent.id && item.totalPayments >= 2));

const oldPaymentEvent = expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token,
  body: { ...eventPayload, title: "WU-05 Old Payment Event", start: "2020-01-01T16:00:00.000Z", end: "2020-01-01T18:00:00.000Z", abmeldefrist: "2019-12-
  31T16:00:00.000Z", published: true, status: "COMPLETED" },
}), 201, "create old event with payment history");
const oldRegistration = expectStatus(await request("POST", "/api/collections/event_registrations/records", {
  token: rootToken,
  body: { event: oldPaymentEvent.id, user: guest.id, status: "REGISTERED", registeredAt: "2019-12-01T12:00:00.000Z", checkoutRegion: "ER", termsVersion:
  "PAYMENT-SUMMARY-OLD-EVENT", termsAcceptedAt: "2019-12-01T12:00:00.000Z" },
}), 200, "create old event registration");
const oldPaymentId = "oldpayment00001";
expectStatus(await request("POST", "/api/collections/payments/records", {
  token: rootToken,
  body: { id: oldPaymentId, registration: oldRegistration.id, event: oldPaymentEvent.id, user: guest.id, roleSnapshot: "GUEST", paymentRequired: true,
  amountCents: 380, status: "UNPAID", purpose: `BVHUB-EVT-${oldPaymentEvent.id}-PAY-${oldPaymentId}`, active: true },
}), 200, "create old event payment");

const duplicatePurposePayment = expectStatus(await request("PATCH", `/api/collections/payments/records/${secondGuestPayment.id}`, {
  token: rootToken,
  body: { purpose: adminGuestPayment.purpose },
}), 200, "duplicate payment purpose is accepted");
assert.equal(duplicatePurposePayment.purpose, adminGuestPayment.purpose);

const recentPaymentSummary = expectStatus(await request("GET", "/api/bvhub/admin/payment-summary", { token: adminLogin.token }), 200, "read recent payment
summary");
assert.ok(recentPaymentSummary.items.some((item) => item.eventId === validEvent.id), "recent payment summary keeps future events");
assert.equal(recentPaymentSummary.items.some((item) => item.eventId === oldPaymentEvent.id), false, "recent payment summary hides events older than 30
days");
assert.deepEqual(recentPaymentSummary.items.map((item) => item.start), [...recentPaymentSummary.items].map((item) => item.start).sort().reverse(), "recent
payment summary is newest first");

const allPaymentSummary = expectStatus(await request("GET", "/api/bvhub/admin/payment-summary?showAll=true", { token: adminLogin.token }), 200, "read
complete payment summary");
assert.ok(allPaymentSummary.items.some((item) => item.eventId === oldPaymentEvent.id), "complete payment summary includes old events");
assert.deepEqual(allPaymentSummary.items.map((item) => item.start), [...allPaymentSummary.items].map((item) => item.start).sort().reverse(), "complete
payment summary is newest first");

const eventPaymentDetails = expectStatus(await request("GET", `/api/bvhub/admin/events/${validEvent.id}/payments`, { token: superLogin.token }), 200, "superadmin lazily loads event payments");
assert.ok(eventPaymentDetails.items.some((payment) => payment.id === adminGuestPayment.id));
const publicEventList = expectStatus(await request("GET", "/api/bvhub/events", { token: memberLoginToken }), 200, "member reads published events");
assert.ok(publicEventList.items.some((item) => item.id === validEvent.id), "published future event appears in public event list");
expectStatus(await request("GET", `/api/bvhub/events/${validEvent.id}`, { token: guestLoginToken }), 200, "guest reads published event detail");
expectStatus(await request("POST", `/api/bvhub/events/${validEvent.id}/registrations`, {
  token: guestLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" },
}), 409, "guest cannot register for members-only event");
expectStatus(await request("POST", `/api/bvhub/events/${validEvent.id}/registrations`, {
  token: memberLoginToken, body: { checkoutRegion: "NUE", termsVersion: "NUE-v1" },
}), 409, "registration rejects wrong checkout region");
const eventRegistrationMailBefore = smtpMessages.length;
const wuRegistration = expectStatus(await request("POST", `/api/bvhub/events/${validEvent.id}/registrations`, {
  token: memberLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" },
}), 201, "member registers for event");
assert.equal(wuRegistration.status, "REGISTERED");
const memberPayments = await paymentsForRegistration(wuRegistration.id, rootToken);
assert.equal(memberPayments.length, 1, "member registration creates one payment");
const memberPayment = memberPayments[0];
assert.equal(memberPayment.roleSnapshot, "MEMBER");
assert.equal(memberPayment.paymentRequired, false);
assert.equal(memberPayment.amountCents, 0);
assert.equal(memberPayment.status, "PAID");
assert.equal(memberPayment.purpose, `EVT-${validEvent.id}-PAY-${paymentPurposeNames.member}`, "self-registration uses the display name format");
const dashboardAfterRegistration = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: memberLoginToken }), 200, "dashboard after event registration");
assert.equal(dashboardAfterRegistration.current.myUpcomingRegistrations, 1, "only the member's future REGISTERED event is counted");
assert.match(await waitForMail(eventRegistrationMailBefore), /Anmeldung best/);
assert.match(smtpMessages.at(-1), /WU-05 Integration Event/);
assert.match(smtpMessages.at(-1), /Integration venue/);
assert.match(smtpMessages.at(-1), /01\.07\.2099/);
assert.match(smtpMessages.at(-1), /18:00 Uhr/);
const repeatedRegistration = expectStatus(await request("POST", `/api/bvhub/events/${validEvent.id}/registrations`, {
  token: memberLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" },
}), 201, "repeated registration is idempotent");
assert.equal(repeatedRegistration.id, wuRegistration.id);
assert.equal((await paymentsForRegistration(wuRegistration.id, rootToken)).length, 1, "duplicate registration does not duplicate payment");
expectStatus(await request("GET", `/api/bvhub/events/${validEvent.id}/registration`, { token: memberLoginToken }), 200, "member reads own registration");
const adminRemoveAgainMailBefore = smtpMessages.length;
expectStatus(await request("DELETE", `/api/bvhub/admin/events/${validEvent.id}/participants/${member.id}`, { token: adminLogin.token }), 200, "admin removes participant immediate mail");
assert.match(await waitForMail(adminRemoveAgainMailBefore), /abgemeldet/);
assert.equal((await paymentsForRegistration(wuRegistration.id, rootToken))[0].active, false, "admin removal deactivates member payment");
const rejoinMailBefore = smtpMessages.length;
expectStatus(await request("POST", `/api/bvhub/events/${validEvent.id}/registrations`, { token: memberLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" } }), 201, "member re-registers after admin remove");
assert.match(await waitForMail(rejoinMailBefore), /Anmeldung best/);
let reloadedMemberPayment = (await paymentsForRegistration(wuRegistration.id, rootToken))[0];
assert.equal(reloadedMemberPayment.id, memberPayment.id);
assert.equal(reloadedMemberPayment.active, true);
const cancellationMailBefore = smtpMessages.length;
expectStatus(await request("DELETE", `/api/bvhub/events/${validEvent.id}/registrations/me`, { token: memberLoginToken }), 200, "member cancels own registration");
assert.match(await waitForMail(cancellationMailBefore), /Anmeldung storniert/);
assert.equal((await paymentsForRegistration(wuRegistration.id, rootToken))[0].active, false, "self cancellation deactivates payment");
const reRegistrationMailBefore = smtpMessages.length;
expectStatus(await request("POST", `/api/bvhub/events/${validEvent.id}/registrations`, {
  token: memberLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" },
}), 201, "member registers again after cancellation");
assert.match(await waitForMail(reRegistrationMailBefore), /Anmeldung best/);
reloadedMemberPayment = (await paymentsForRegistration(wuRegistration.id, rootToken))[0];
assert.equal(reloadedMemberPayment.id, memberPayment.id);
assert.equal(reloadedMemberPayment.active, true);
assert.equal(reloadedMemberPayment.status, "PAID");
const outbox = expectStatus(await request("GET", `/api/collections/notification_outbox/records?filter=${encodeURIComponent(`registration = "${wuRegistration.id}"`)}`, { token: rootToken }), 200, "registration creates notification outbox");
assert.equal(outbox.items.length, 5, "each registration state transition creates one notification outbox item");
assert.deepEqual(outbox.items.map((item) => item.kind).sort(), [
  "EVENT_ADMIN_REMOVED",
  "EVENT_REGISTRATION_CANCELLED",
  "EVENT_REGISTRATION_CONFIRMED",
  "EVENT_REGISTRATION_CONFIRMED",
  "EVENT_REGISTRATION_CONFIRMED",
].sort(), "registration, cancellation, and re-registration are notified once each");

const waitingEvent = expectStatus(await request("POST", "/api/bvhub/admin/events", { token: adminLogin.token, body: { ...eventPayload, title: "WU-05 Waiting Event", capacity: 1, published: true, status: "OPEN_TO_ALL" } }), 201, "create waiting-list event");
expectStatus(await request("POST", `/api/bvhub/events/${waitingEvent.id}/registrations`, { token: memberLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" } }), 201, "fill waiting-list event");
const waitingMailBefore = smtpMessages.length;
const waitingRegistration = expectStatus(await request("POST", `/api/bvhub/events/${waitingEvent.id}/registrations`, { token: guestLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" } }), 201, "join waiting list");
assert.equal(waitingRegistration.status, "WAITING");
assert.equal((await paymentsForRegistration(waitingRegistration.id, rootToken)).length, 0, "waiting registration has no payment");
assert.match(await waitForMail(waitingMailBefore), /Warteliste/);
const promotionMailBefore = smtpMessages.length;
expectStatus(await request("DELETE", `/api/bvhub/events/${waitingEvent.id}/registrations/me`, { token: memberLoginToken }), 200, "cancel and promote waiting member");
assert.match(await waitForMail(promotionMailBefore), /nachger/);
assert.match(smtpMessages.at(-1), /WU-05 Waiting Event/);
const promotedRegistration = expectStatus(await request("GET", `/api/bvhub/events/${waitingEvent.id}/registration`, { token: guestLoginToken }), 200, "read promoted registration");
assert.equal(promotedRegistration.status, "REGISTERED");
const promotedPayments = await paymentsForRegistration(waitingRegistration.id, rootToken);
assert.equal(promotedPayments.length, 1, "waiting-list promotion creates a payment atomically");
assert.equal(promotedPayments[0].roleSnapshot, "GUEST");
assert.equal(promotedPayments[0].amountCents, 380);
assert.equal(promotedPayments[0].status, "UNPAID");
assert.equal(promotedPayments[0].purpose, `EVT-${waitingEvent.id}-PAY-${paymentPurposeNames.guest}`, "waiting-list promotion uses the display name format");
const promotedOutbox = expectStatus(await request("GET", `/api/collections/notification_outbox/records?filter=${encodeURIComponent(`registration = "${waitingRegistration.id}"`)}`, { token: rootToken }), 200, "waiting-list outbox");
assert.deepEqual(promotedOutbox.items.map((item) => item.kind).sort(), ["EVENT_WAITING_LIST_JOINED", "EVENT_WAITING_LIST_PROMOTED"].sort());

const voluntaryEvent = expectStatus(await request("POST", "/api/bvhub/admin/events", { token: adminLogin.token, body: { ...eventPayload, title: "WU-05 Voluntary Waiting Event", capacity: 1, published: true, status: "OPEN_TO_ALL" } }), 201, "create voluntary waiting event");
expectStatus(await request("POST", `/api/bvhub/events/${voluntaryEvent.id}/registrations`, { token: memberLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" } }), 201, "fill voluntary event");
const voluntary = expectStatus(await request("POST", `/api/bvhub/events/${voluntaryEvent.id}/registrations`, { token: guestLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" } }), 201, "voluntarily join waiting list");
assert.equal((await paymentsForRegistration(voluntary.id, rootToken)).length, 0, "voluntary waiting registration has no payment");
const voluntaryMailBefore = smtpMessages.length;
expectStatus(await request("DELETE", `/api/bvhub/events/${voluntaryEvent.id}/registrations/me`, { token: guestLoginToken }), 200, "leave waiting list");
assert.match(await waitForMail(voluntaryMailBefore), /Warteliste verlassen/);
assert.equal((await paymentsForRegistration(voluntary.id, rootToken)).length, 0, "cancelled waiting registration remains without payment");

const freeEvent = expectStatus(await request("POST", "/api/bvhub/admin/events", {
  token: adminLogin.token, body: { ...eventPayload, title: "WU-05 Free Guest Event", guestFeeCents: 0, published: true, status: "OPEN_TO_ALL" },
}), 201, "create zero-fee guest event");
const freeAddMailBefore = smtpMessages.length;
const freeRegistration = expectStatus(await request("POST", `/api/bvhub/admin/events/${freeEvent.id}/participants`, {
  token: adminLogin.token, body: { userId: paymentGuest.id },
}), 201, "admin adds guest to zero-fee event");
await waitForMail(freeAddMailBefore);
const freePayment = (await paymentsForRegistration(freeRegistration.registrationId, rootToken))[0];
assert.equal(freePayment.amountCents, 0);
assert.equal(freePayment.paymentRequired, false);
assert.equal(freePayment.status, "PAID");
expectStatus(await request("PATCH", `/api/bvhub/admin/events/${freeEvent.id}`, { token: adminLogin.token, body: { status: "CANCELLED" } }), 200, "cancel zero-fee event before deletion");
expectStatus(await request("DELETE", `/api/bvhub/admin/events/${freeEvent.id}`, { token: adminLogin.token }), 204, "event deletion purges payment dependencies");
expectStatus(await request("GET", `/api/collections/payments/records/${freePayment.id}`, { token: rootToken }), 404, "event payment is purged during hard delete");

const closedCancellationEvent = expectStatus(await request("POST", "/api/bvhub/admin/events", { token: adminLogin.token, body: { ...eventPayload, title: "WU-05 Closed Cancellation Event", status: "OPEN_TO_ALL", published: true, abmeldefrist: "2020-01-01T12:00:00.000Z" } }), 201, "create event with passed cancellation deadline");
const closedRegistration = expectStatus(await request("POST", `/api/bvhub/events/${closedCancellationEvent.id}/registrations`, { token: memberLoginToken, body: { checkoutRegion: "ER", termsVersion: "ER-v1" } }), 201, "register before testing closed cancellation");
const closedEventForMember = expectStatus(await request("GET", `/api/bvhub/events/${closedCancellationEvent.id}`, { token: memberLoginToken }), 200, "read event with passed cancellation deadline");
assert.equal(closedEventForMember.canCancel, false, "public event DTO disables self-cancellation after deadline");
const deniedCancellation = await request("DELETE", `/api/bvhub/events/${closedCancellationEvent.id}/registrations/me`, { token: memberLoginToken });
assert.equal(deniedCancellation.status, 409, "member cannot cancel after deadline");
assert.equal(deniedCancellation.data?.data?.code, "CANCELLATION_DEADLINE_PASSED");
const registrationAfterDenial = expectStatus(await request("GET", `/api/bvhub/events/${closedCancellationEvent.id}/registration`, { token: memberLoginToken }), 200, "read registration after denied cancellation");
assert.equal(registrationAfterDenial.status, "REGISTERED", "denied cancellation keeps registration active");
expectStatus(await request("DELETE", `/api/bvhub/admin/events/${closedCancellationEvent.id}/participants/${member.id}`, { token: adminLogin.token }), 200, "admin removes participant after cancellation deadline");
expectStatus(await request("POST", `/api/bvhub/admin/events/${closedCancellationEvent.id}/participants`, { token: superLogin.token, body: { userId: member.id } }), 201, "superadmin adds participant after cancellation deadline");
assert.equal(closedRegistration.status, "REGISTERED");

const cancelledEvent = expectStatus(await request("PATCH", `/api/bvhub/admin/events/${validEvent.id}`, {
  token: adminLogin.token, body: { status: "CANCELLED" },
}), 200, "admin cancels published event");
assert.equal(cancelledEvent.status, "CANCELLED");
assert.equal(cancelledEvent.canDelete, true, "cancelled event can be explicitly hard deleted");
expectStatus(await request("DELETE", `/api/bvhub/admin/events/${validEvent.id}`, { token: adminLogin.token }), 204, "registered event hard delete purges dependencies");
expectStatus(await request("GET", `/api/collections/events/records/${validEvent.id}`, { token: rootToken }), 404, "registered event is deleted");
expectStatus(await request("GET", `/api/collections/payments/records/${adminGuestPayment.id}`, { token: rootToken }), 404, "registered event payment is deleted with dependencies");
expectStatus(await request("DELETE", "/api/bvhub/admin/events/not-an-id", { token: adminLogin.token }), 400, "invalid event id");
expectStatus(await request("DELETE", `/api/bvhub/admin/events/zzzzzzzzzzzzzzz`, { token: adminLogin.token }), 404, "unknown event id");
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
const dashboardWithManagedMember = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: memberLoginToken }), 200, "dashboard with managed member");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: adminLogin.token, body: { role: "GUEST", confirmation: "ROLE_CHANGE" },
}), 200, "admin changes managed member to guest for dashboard statistics");
const dashboardAfterRoleChange = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: memberLoginToken }), 200, "dashboard reflects role change without a snapshot refresh");
assert.equal(dashboardAfterRoleChange.current.registeredUsers, dashboardWithManagedMember.current.registeredUsers, "role changes keep the registered-user total stable");
assert.equal(dashboardAfterRoleChange.current.members, dashboardWithManagedMember.current.members - 1, "role changes update formal-member totals on the next request");
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${managed.id}/role`, {
  token: adminLogin.token, body: { role: "MEMBER", confirmation: "ROLE_CHANGE" },
}), 200, "admin restores managed member after dashboard statistics test");
const dashboardAfterRoleRestore = expectStatus(await request("GET", "/api/bvhub/dashboard/statistics", { token: memberLoginToken }), 200, "dashboard reflects restored role without a snapshot refresh");
assert.equal(dashboardAfterRoleRestore.current.registeredUsers, dashboardWithManagedMember.current.registeredUsers);
assert.equal(dashboardAfterRoleRestore.current.members, dashboardWithManagedMember.current.members);
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
const memberGroupIds = managementGroups.groups.filter((group) => ["Member ER", "Member NUE"].includes(group.name)).map((group) => group.id);
const guestGroupId = managementGroups.groups.find((group) => group.name === "Guest").id;
const groupIds = [guestGroupId, memberGroupIds[0]];
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

// Dynamic member-card QR tokens are opaque, short-lived and validated against
// the current account and active member-group state on every scan.
const memberCardSettings = expectStatus(await request("GET", "/api/bvhub/admin/member-card-settings", { token: adminLogin.token }), 200, "admin reads member-card settings");
assert.deepEqual(memberCardSettings, { enabled: true, tokenTtlSeconds: 120, refreshLeadSeconds: 20 });
expectStatus(await request("GET", "/api/bvhub/admin/member-card-settings", { token: memberLoginToken }), 403, "member cannot read member-card settings");
expectStatus(await request("PATCH", "/api/bvhub/admin/member-card-settings", { token: adminLogin.token, body: { tokenTtlSeconds: 60 } }), 403, "admin cannot modify member-card settings");
expectStatus(await request("PATCH", "/api/bvhub/admin/member-card-settings", { token: superLogin.token, body: { tokenTtlSeconds: 120, refreshLeadSeconds: 20 } }), 200, "superadmin updates member-card settings");
expectStatus(await request("PATCH", "/api/bvhub/admin/member-card-settings", { token: superLogin.token, body: { tokenTtlSeconds: 29 } }), 400, "member-card settings reject short TTL");
expectStatus(await request("PATCH", "/api/bvhub/admin/member-card-settings", { token: superLogin.token, body: { tokenTtlSeconds: 60, refreshLeadSeconds: 60 } }), 400, "member-card settings reject refresh lead at TTL");

const memberCardIssued = expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token: memberLoginToken, body: {} }), 200, "member issues member-card token");
const issuedRawMemberCardTokens = [memberCardIssued.token];
assert.match(memberCardIssued.token, /^[A-Za-z0-9]{48}$/);
assert.ok(Date.parse(memberCardIssued.expiresAt) > Date.now());
assert.ok(Date.parse(memberCardIssued.refreshAt) < Date.parse(memberCardIssued.expiresAt));
const memberCardRefreshLeadMs = Date.parse(memberCardIssued.expiresAt) - Date.parse(memberCardIssued.refreshAt);
assert.ok(memberCardRefreshLeadMs >= 19_999 && memberCardRefreshLeadMs <= 20_000, "member-card refresh lead matches settings within date serialization precision");
const storedMemberCardTokens = expectStatus(await request("GET", `/api/collections/member_card_tokens/records?filter=${encodeURIComponent(`user = "${member.id}"`)}`, { token: rootToken }), 200, "superuser reads member-card token records");
assert.equal(storedMemberCardTokens.items.length > 0, true);
assert.match(storedMemberCardTokens.items.at(-1).tokenHash, /^[a-f0-9]{64}$/);
assert.equal(storedMemberCardTokens.items.some((item) => item.tokenHash === memberCardIssued.token), false, "raw member-card token is never stored");
const validMemberCard = expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: memberCardIssued.token } }), 200, "member-card token verifies");
assert.equal(validMemberCard.valid, true);
assert.equal(validMemberCard.member.id, member.id);
assert.equal(Object.hasOwn(validMemberCard.member, "email"), false);
assert.deepEqual(Object.keys(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: "U".repeat(48) } }), 200, "unknown member-card token is generic")).sort(), ["valid"]);
for (const body of [{}, { token: "" }, { token: 12 }, { token: "x".repeat(257) }, { token: memberCardIssued.token, extra: true }]) {
  expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body }), 400, "malformed member-card verification request");
}
expectStatus(await request("GET", "/api/collections/member_card_tokens/records", { token: memberLoginToken }), 403, "member cannot directly list member-card tokens");

const guestCardIssuedAt = Date.now();
const guestCardResponse = await request("POST", "/api/bvhub/me/member-card-token", { token: guestLoginToken, body: {} });
const guestCardIssued = expectStatus(guestCardResponse, 200, "active verified guest issues member-card token");
issuedRawMemberCardTokens.push(guestCardIssued.token);
assert.match(guestCardIssued.token, /^[A-Za-z0-9]{48}$/);
assert.ok(Date.parse(guestCardIssued.expiresAt) >= guestCardIssuedAt + 119_000, "guest token uses the configured short TTL");
assert.ok(Date.parse(guestCardIssued.expiresAt) <= Date.now() + 121_000, "guest token expiry is bounded by the configured TTL");
const guestCardRefreshLeadMs = Date.parse(guestCardIssued.expiresAt) - Date.parse(guestCardIssued.refreshAt);
assert.ok(guestCardRefreshLeadMs >= 19_999 && guestCardRefreshLeadMs <= 20_000, "guest token uses the configured refresh lead within date serialization precision");
assert.equal(guestCardResponse.headers.get("cache-control"), "no-store", "guest token response is not cacheable");
const guestTokenRecords = expectStatus(await request("GET", `/api/collections/member_card_tokens/records?filter=${encodeURIComponent(`user = "${guest.id}"`)}`, { token: rootToken }), 200, "read guest member-card token record");
assert.ok(guestTokenRecords.items.length > 0, "guest token is persisted for verification");
assert.match(guestTokenRecords.items.at(-1).tokenHash, /^[a-f0-9]{64}$/);
assert.equal(guestTokenRecords.items.some((item) => item.tokenHash === guestCardIssued.token), false, "raw guest token is never stored");
const expectedGuestDetailKeys = ["active", "address", "birthDate", "created", "displayName", "email", "firstName", "groups", "id", "lastName", "memberSince", "phone", "role", "updated", "username", "verified"];
const guestAdminScan = expectStatus(await request("POST", "/api/bvhub/admin/member-card/verify", { token: adminLogin.token, body: { token: guestCardIssued.token } }), 200, "admin scans guest token");
assert.equal(guestAdminScan.status, "GUEST_NON_MEMBER");
assert.equal(guestAdminScan.reason, "GUEST_ACCOUNT");
assert.deepEqual(Object.keys(guestAdminScan.member).sort(), expectedGuestDetailKeys);
assert.equal(guestAdminScan.member.id, guest.id);
assert.equal(guestAdminScan.member.email, guest.email);
assert.equal(guestAdminScan.member.role, "GUEST");
assert.equal(guestAdminScan.member.active, true);
assert.equal(guestAdminScan.member.verified, true);
const guestSuperScan = expectStatus(await request("POST", "/api/bvhub/admin/member-card/verify", { token: superLogin.token, body: { token: guestCardIssued.token } }), 200, "superadmin scans guest token");
assert.equal(guestSuperScan.status, "GUEST_NON_MEMBER");
assert.equal(guestSuperScan.reason, "GUEST_ACCOUNT");
assert.deepEqual(guestSuperScan.member, guestAdminScan.member, "admin roles receive the same complete guest details");
assert.deepEqual(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: guestCardIssued.token } }), 200, "anonymous guest verification remains private"), { valid: false });

expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token: inactiveAdminSession.token, body: {} }), 403, "inactive account cannot issue member-card token");
expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token: unverifiedAdminSession.token, body: {} }), 403, "unverified account cannot issue member-card token");
await request("PATCH", `/api/collections/users/records/${member.id}`, { token: rootToken, body: { active: false } });
assert.equal(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: memberCardIssued.token } }), 200, "inactive member-card user returns generic invalid").valid, false);
await request("PATCH", `/api/collections/users/records/${member.id}`, { token: rootToken, body: { active: true } });
await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, { token: adminLogin.token, body: { groups: [guestGroupId] } });
assert.equal(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: memberCardIssued.token } }), 200, "removed member group invalidates token").valid, false);
const noGroupMemberCard = expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token: memberLoginToken, body: {} }), 200, "active verified member without an active member group issues a token");
issuedRawMemberCardTokens.push(noGroupMemberCard.token);
const noGroupAdminScan = expectStatus(await request("POST", "/api/bvhub/admin/member-card/verify", { token: adminLogin.token, body: { token: noGroupMemberCard.token } }), 200, "admin scans token for member without active member group");
assert.equal(noGroupAdminScan.status, "GUEST_NON_MEMBER");
assert.equal(noGroupAdminScan.reason, "NO_ACTIVE_MEMBER_GROUP");
assert.equal(noGroupAdminScan.member.id, member.id);
assert.deepEqual(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: noGroupMemberCard.token } }), 200, "anonymous no-group verification remains private"), { valid: false });
await request("PUT", `/api/bvhub/admin/users/${member.id}/groups`, { token: adminLogin.token, body: { groups: groupIds } });
const expiringMemberCard = expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token: memberLoginToken, body: {} }), 200, "member issues token for expiry test");
issuedRawMemberCardTokens.push(expiringMemberCard.token);
const latestMemberCardRecord = expectStatus(await request("GET", `/api/collections/member_card_tokens/records?filter=${encodeURIComponent(`user = "${member.id}"`)}&sort=-created`, { token: rootToken }), 200, "find latest member-card token").items[0];
expectStatus(await request("PATCH", `/api/collections/member_card_tokens/records/${latestMemberCardRecord.id}`, { token: rootToken, body: { expiresAt: "2020-01-01T00:00:00.000Z" } }), 200, "expire member-card token in test setup");
assert.equal(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: expiringMemberCard.token } }), 200, "expired member-card token is invalid").valid, false);
const unverifiedMemberCard = expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token: memberLoginToken, body: {} }), 200, "member issues token for verification-state test");
issuedRawMemberCardTokens.push(unverifiedMemberCard.token);
expectStatus(await request("PATCH", `/api/collections/users/records/${member.id}`, { token: rootToken, body: { verified: false } }), 200, "test member becomes unverified");
assert.equal(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: unverifiedMemberCard.token } }), 200, "unverified member-card user is invalid").valid, false);
expectStatus(await request("PATCH", `/api/collections/users/records/${member.id}`, { token: rootToken, body: { verified: true } }), 200, "restore verified member");
const roleMemberCard = expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token: memberLoginToken, body: {} }), 200, "member issues token for role test");
issuedRawMemberCardTokens.push(roleMemberCard.token);
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${member.id}/role`, { token: adminLogin.token, body: { role: "GUEST", confirmation: "ROLE_CHANGE" } }), 200, "member becomes guest for QR test");
assert.equal(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: roleMemberCard.token } }), 200, "guest role invalidates member-card token").valid, false);
expectStatus(await request("PATCH", `/api/bvhub/admin/users/${member.id}/role`, { token: adminLogin.token, body: { role: "MEMBER", confirmation: "ROLE_CHANGE" } }), 200, "restore member role after QR test");
memberLoginToken = expectStatus(await request("POST", `/api/collections/users/impersonate/${member.id}`, { token: rootToken, body: { duration: 300 } }), 200, "refresh member token after role test").token;
const inactiveGroupMemberCard = expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token: memberLoginToken, body: {} }), 200, "member issues token for group-state test");
issuedRawMemberCardTokens.push(inactiveGroupMemberCard.token);
expectStatus(await request("PATCH", `/api/collections/groups/records/${memberGroupIds[0]}`, { token: rootToken, body: { active: false } }), 200, "deactivate member group for QR test");
assert.equal(expectStatus(await request("POST", "/api/bvhub/member-card/verify", { body: { token: inactiveGroupMemberCard.token } }), 200, "inactive member group invalidates token").valid, false);
expectStatus(await request("PATCH", `/api/collections/groups/records/${memberGroupIds[0]}`, { token: rootToken, body: { active: true } }), 200, "restore member group after QR test");

expectStatus(await request("PATCH", "/api/bvhub/admin/member-card-settings", { token: superLogin.token, body: { enabled: false } }), 200, "superadmin disables member-card issuance");
for (const [label, token] of [["guest", guestLoginToken], ["member", memberLoginToken], ["admin", adminLogin.token], ["superadmin", superLogin.token]]) {
  expectStatus(await request("POST", "/api/bvhub/me/member-card-token", { token, body: {} }), 403, `${label} cannot issue member-card token while feature is disabled`);
}
expectStatus(await request("PATCH", "/api/bvhub/admin/member-card-settings", { token: superLogin.token, body: { enabled: true } }), 200, "superadmin restores member-card issuance");
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
assert.ok(audits.items.some((event) => event.eventType === "MEMBER_CARD_SETTINGS_CHANGED"), "member-card settings changes are audited");
assert.ok(audits.items.some((event) => event.eventType === "PAYMENT_SETTINGS_CHANGED"), "payment settings changes are audited");
assert.ok(audits.items.some((event) => event.eventType === "PAYMENT_STATUS_CHANGED"), "payment status changes are audited");
for (const iban of ["DE12500105170648489890", "DE89370400440532013000"]) {
  assert.ok(audits.items.every((event) => !String(event.metadata || "").includes(iban)), "audit metadata contains no full IBAN");
}
assert.ok(audits.items.every((event) => !Object.hasOwn(event, "email") && !Object.hasOwn(event, "token")), "audit events contain no token or email");
for (const rawToken of issuedRawMemberCardTokens) {
  assert.ok(audits.items.every((event) => !String(event.metadata || "").includes(rawToken)), "audit metadata contains no raw member-card token");
}
const allStoredMemberCardTokens = expectStatus(await request("GET", "/api/collections/member_card_tokens/records?perPage=100", { token: rootToken }), 200, "read all stored member-card token hashes");
assert.ok(allStoredMemberCardTokens.items.every((item) => /^[a-f0-9]{64}$/.test(item.tokenHash)), "only SHA-256 member-card token hashes are stored");
assert.ok(allStoredMemberCardTokens.items.every((item) => !issuedRawMemberCardTokens.includes(item.tokenHash)), "no raw member-card token is stored in the hash field");
if (serverLogPath) {
  const serverLog = fs.readFileSync(serverLogPath, "utf8");
  for (const rawToken of issuedRawMemberCardTokens) assert.equal(serverLog.includes(rawToken), false, "server logs contain no raw member-card token");
}

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

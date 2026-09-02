/// <reference path="../pb_data/types.d.ts" />

const OTP_ROLES = ["GUEST", "MEMBER"];
const PASSWORD_ROLES = ["ADMIN", "SUPER_ADMIN"];

function genericAuthError() { throw new BadRequestError("Invalid credentials"); }

function activeRole(record, roles, requireVerified = false) {
  // PocketBase resolves the record for auth hooks; keep the nil guard for malformed requests.
  return Boolean(record && record.getBool("active") === true && (!requireVerified || record.getBool("verified") === true) && roles.includes(record.getString("role")));
}

// Password authentication is never available to guests or members, including direct API calls.
onRecordAuthWithPasswordRequest((e) => {
  e.next();
  if (!e.record || !PASSWORD_ROLES.includes(e.record.getString("role"))) genericAuthError();
}, "users");

// Password authentication is available only to active ADMIN/SUPER_ADMIN accounts.
// Every OTP request has the same generic failure for unknown, inactive, or disallowed accounts.
onRecordRequestOTPRequest((e) => {
  if (!activeRole(e.record, OTP_ROLES, true)) genericAuthError();
  e.next();
}, "users");

onRecordAuthWithOTPRequest((e) => {
  if (!activeRole(e.record, OTP_ROLES, true)) genericAuthError();
  e.next();
}, "users");

// This hook also runs during authRefresh, invalidating tokens for deactivated users.
onRecordAuthRequest((e) => {
  if (!e.record || e.record.getBool("active") !== true) genericAuthError();
  e.next();
}, "users");

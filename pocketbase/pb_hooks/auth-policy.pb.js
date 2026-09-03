/// <reference path="../pb_data/types.d.ts" />

function genericAuthError() { throw new BadRequestError("Invalid credentials"); }

// Password authentication is never available to guests or members, including direct API calls.
onRecordAuthWithPasswordRequest((e) => {
  e.next();
  const passwordRoles = ["ADMIN", "SUPER_ADMIN"];
  if (!e.record || !passwordRoles.includes(e.record.getString("role"))) genericAuthError();
}, "users");

// Password authentication is available only to active ADMIN/SUPER_ADMIN accounts.
// Every OTP request has the same generic failure for unknown, inactive, or disallowed accounts.
onRecordRequestOTPRequest((e) => {
  const otpRoles = ["GUEST", "MEMBER"];
  const record = e.record;
  if (!record || record.getBool("active") !== true || record.getBool("verified") !== true || !otpRoles.includes(record.getString("role"))) genericAuthError();
  e.next();
}, "users");

onRecordAuthWithOTPRequest((e) => {
  const otpRoles = ["GUEST", "MEMBER"];
  const record = e.record;
  if (!record || record.getBool("active") !== true || record.getBool("verified") !== true || !otpRoles.includes(record.getString("role"))) genericAuthError();
  e.next();
}, "users");

// This hook also runs during authRefresh, invalidating tokens for deactivated users.
onRecordAuthRequest((e) => {
  if (!e.record || e.record.getBool("active") !== true) genericAuthError();
  e.next();
}, "users");

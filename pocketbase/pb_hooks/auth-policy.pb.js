/// <reference path="../pb_data/types.d.ts" />

// Password authentication is server-side restricted to elevated bvHub roles.
onRecordAuthWithPasswordRequest((e) => {
  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];
  if (e.record && !(e.record.getBool("active") === true && allowedRoles.includes(e.record.getString("role")))) {
    throw new BadRequestError("Invalid credentials");
  }
  e.next();
}, "users");

// OTP is the standard flow for guests and members only.
onRecordRequestOTPRequest((e) => {
  const allowedRoles = ["GUEST", "MEMBER"];
  if (e.record && !(e.record.getBool("active") === true && allowedRoles.includes(e.record.getString("role")))) {
    throw new BadRequestError("Invalid credentials");
  }
  e.next();
}, "users");

onRecordAuthWithOTPRequest((e) => {
  const allowedRoles = ["GUEST", "MEMBER"];
  if (!(e.record && e.record.getBool("active") === true && allowedRoles.includes(e.record.getString("role")))) {
    throw new BadRequestError("Invalid credentials");
  }
  e.next();
}, "users");

// This also runs for authRefresh, invalidating sessions of deactivated users.
onRecordAuthRequest((e) => {
  if (!(e.record && e.record.getBool("active") === true)) {
    throw new BadRequestError("Invalid credentials");
  }
  e.next();
}, "users");

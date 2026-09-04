/// <reference path="../pb_data/types.d.ts" />

// Password authentication is never available to guests or members, including direct API calls.
onRecordAuthWithPasswordRequest((e) => {
  e.next();
  const passwordRoles = ["ADMIN", "SUPER_ADMIN"];
  if (!e.record || !passwordRoles.includes(e.record.getString("role"))) throw new BadRequestError("Invalid credentials");
}, "users");

// Password authentication is available only to active ADMIN/SUPER_ADMIN accounts.
// Every OTP request has the same generic failure for unknown, inactive, or disallowed accounts.
onRecordRequestOTPRequest((e) => {
  const otpRoles = ["GUEST", "MEMBER"];
  const record = e.record;
  if (!record || record.getBool("active") !== true || record.getBool("verified") !== true || !otpRoles.includes(record.getString("role"))) throw new BadRequestError("Invalid credentials");
  e.next();
}, "users");

onRecordAuthWithOTPRequest((e) => {
  const otpRoles = ["GUEST", "MEMBER"];
  const record = e.record;
  if (!record || record.getBool("active") !== true || record.getBool("verified") !== true || !otpRoles.includes(record.getString("role"))) throw new BadRequestError("Invalid credentials");
  e.next();
}, "users");

// This hook also runs during authRefresh, invalidating tokens for deactivated users.
onRecordAuthRequest((e) => {
  if (!e.record || e.record.getBool("active") !== true) throw new BadRequestError("Invalid credentials");
  e.next();
}, "users");

// emailVisibility is a server-controlled privacy setting. Role changes are only
// possible through the dedicated management route, never through mass assignment.
onRecordCreateRequest((e) => {
  e.record.set("emailVisibility", true);
  e.next();
}, "users");

onRecordUpdateRequest((e) => {
  e.record.set("emailVisibility", true);
  // Role changes are handled only by the dedicated management endpoint. Reject
  // attempts to change the role through the generic users records API while
  // still allowing trusted server-side profile updates.
  const path = String(e.request && e.request.url && e.request.url.path || "");
  if (path.includes("/api/collections/users/records/")) {
    const body = e.requestInfo().body || {};
    const original = e.record.original();
    const previousRole = original && typeof original.getString === "function" ? original.getString("role") : e.record.getString("role");
    if (Object.hasOwn(body, "role") && body.role !== previousRole) throw new ForbiddenError("Rollenänderungen sind nur über die Verwaltungs-API erlaubt");
  }
  e.next();
}, "users");

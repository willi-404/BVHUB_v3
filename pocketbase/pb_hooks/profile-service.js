function text(body, key, required, max) {
  if (typeof body[key] !== "string") throw new BadRequestError("Ungültige Profildaten");
  const value = body[key].trim();
  if ((required && !value) || Array.from(value).length > max || /[\x00-\x1f\x7f-\x9f]/.test(value)) throw new BadRequestError("Ungültige Profildaten");
  return value;
}

function validate(body) {
  const allowed = ["displayName", "firstName", "lastName", "street", "houseNumber", "postalCode", "city", "birthDate", "phone", "contactInfo"];
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length === 0 || Object.keys(body).some((key) => !allowed.includes(key))) throw new BadRequestError("Nicht erlaubte Profilfelder");
  const value = {};
  if (Object.hasOwn(body, "displayName")) value.displayName = text(body, "displayName", true, 120);
  for (const key of ["firstName", "lastName"]) if (Object.hasOwn(body, key)) { value[key] = text(body, key, true, 80); if (!/^(?!.*\d)(?!.*[_\x00-\x1f\x7f-\x9f])\S(?:.{0,79}\S)?$/u.test(value[key])) throw new BadRequestError("Ungültige Profildaten"); }
  if (Object.hasOwn(body, "street")) value.street = text(body, "street", true, 120);
  if (Object.hasOwn(body, "houseNumber")) { value.houseNumber = text(body, "houseNumber", true, 20); if (!/^\d+[a-zA-Z]?(?:[–-]\d+[a-zA-Z]?)?$/.test(value.houseNumber)) throw new BadRequestError("Ungültige Hausnummer"); }
  if (Object.hasOwn(body, "postalCode")) { value.postalCode = text(body, "postalCode", true, 5); if (!/^\d{5}$/.test(value.postalCode)) throw new BadRequestError("Ungültige Postleitzahl"); }
  if (Object.hasOwn(body, "city")) value.city = text(body, "city", true, 100);
  if (Object.hasOwn(body, "birthDate")) { value.birthDate = text(body, "birthDate", true, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate)) throw new BadRequestError("Ungültiges Geburtsdatum"); const p = value.birthDate.split("-").map(Number); const d = new Date(Date.UTC(p[0], p[1] - 1, p[2])); const n = new Date(); const today = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()); if (d.getUTCFullYear() !== p[0] || d.getUTCMonth() !== p[1] - 1 || d.getUTCDate() !== p[2] || d.getTime() > today) throw new BadRequestError("Ungültiges Geburtsdatum"); }
  if (Object.hasOwn(body, "phone")) { value.phone = text(body, "phone", false, 40); if (value.phone && !/^[+()\d][+()\d\s./-]{5,39}$/.test(value.phone)) throw new BadRequestError("Ungültige Telefonnummer"); }
  if (Object.hasOwn(body, "contactInfo")) value.contactInfo = text(body, "contactInfo", false, 500);
  return value;
}

function findProfile(app, userId) { try { return app.findFirstRecordByData("user_profiles", "user", userId); } catch (_) { return null; } }

function dto(app, user, profile) {
  const groups = [];
  app.findRecordsByFilter("user_groups", `user = '${user.id}'`, "", 500, 0).forEach((assignment) => {
    try { const group = app.findRecordById("groups", assignment.getString("group")); groups.push({ membershipId: assignment.id, id: group.id, name: group.getString("name"), active: group.getBool("active"), created: assignment.getString("created"), updated: assignment.getString("updated") }); } catch (_) { console.warn(`[bvhub profile] invalid group assignment ${assignment.id}`); }
  });
  return {
    user: { id: user.id, displayName: user.getString("displayName"), firstName: user.getString("firstName"), lastName: user.getString("lastName"), email: user.getString("email"), role: user.getString("role"), active: user.getBool("active"), verified: user.getBool("verified"), created: user.getString("created"), updated: user.getString("updated") },
    profile: profile ? { street: profile.getString("street"), houseNumber: profile.getString("houseNumber"), postalCode: profile.getString("postalCode"), city: profile.getString("city"), birthDate: profile.getString("birthDate").slice(0, 10), phone: profile.getString("phone"), contactInfo: profile.getString("contactInfo"), created: profile.getString("created"), updated: profile.getString("updated") } : null,
    groups,
  };
}

function user(e) {
  const record = e.auth;
  if (!record) throw new BadRequestError("Anmeldung erforderlich");
  if (record.getBool("active") !== true || record.getBool("verified") !== true || !["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"].includes(record.getString("role"))) throw new ForbiddenError("Profilzugriff nicht erlaubt");
  return record;
}

module.exports = { validate, findProfile, dto, user };

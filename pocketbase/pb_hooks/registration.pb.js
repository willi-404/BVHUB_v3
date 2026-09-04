function requireCsrf(e) {
  const info = e.requestInfo();
  const headers = info && info.headers || {};
  const header = headers["X-CSRF-Token"] || headers["x-csrf-token"] || "";
  const cookieHeader = headers.Cookie || headers.cookie || "";
  const cookie = String(cookieHeader).split(";").map((part) => part.trim()).find((part) => part.startsWith("csrf-token="));
  const cookieToken = cookie ? decodeURIComponent(cookie.slice("csrf-token=".length)) : "";
  if (typeof header !== "string" || !header || header !== cookieToken) throw new ForbiddenError("CSRF validation failed");
}

routerAdd("POST", "/api/bvhub/register", (e) => {
  requireCsrf(e);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Unicode-safe name guard: no digits or control/underscore characters.
  const NAME_RE = /^(?!.*\d)(?!.*[_\x00-\x1f])\S(?:.{0,79}\S)?$/u;
  const POSTAL_RE = /^\d{5}$/;
  const HOUSE_RE = /^\d+[a-zA-Z]?(?:[–-]\d+[a-zA-Z]?)?$/;
  const PHONE_RE = /^[+()\d][+()\d\s./-]{5,39}$/;
  const body = e.requestInfo().body;
  const text = (key) => typeof body[key] === "string" ? body[key].trim() : "";
  const value = {
    displayName: text("displayName"),
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email").toLowerCase(),
    street: text("street"),
    houseNumber: text("houseNumber"),
    postalCode: text("postalCode"),
    city: text("city"),
    birthDate: text("birthDate"),
    phone: text("phone"),
    contactInfo: text("contactInfo"),
  };
  const birthDate = new Date(`${value.birthDate}T00:00:00Z`);

  if (!value.displayName || value.displayName.length > 120) throw new BadRequestError("Ungültige Registrierungsdaten");
  if (!NAME_RE.test(value.firstName) || !NAME_RE.test(value.lastName) || !EMAIL_RE.test(value.email)) throw new BadRequestError("Ungültige Registrierungsdaten");
  if (!value.street || value.street.length > 120 || !HOUSE_RE.test(value.houseNumber) || !POSTAL_RE.test(value.postalCode) || !value.city || value.city.length > 100) throw new BadRequestError("Ungültige Registrierungsdaten");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate) || Number.isNaN(birthDate.getTime()) || birthDate >= new Date()) throw new BadRequestError("Ungültige Registrierungsdaten");
  if (value.phone && !PHONE_RE.test(value.phone)) throw new BadRequestError("Ungültige Registrierungsdaten");
  if (value.contactInfo.length > 500) throw new BadRequestError("Ungültige Registrierungsdaten");

  let user;
  try {
    $app.runInTransaction((txApp) => {
      const users = txApp.findCollectionByNameOrId("users");
      const profiles = txApp.findCollectionByNameOrId("user_profiles");
      user = new Record(users);
      user.set("email", value.email);
      user.set("displayName", value.displayName);
      user.set("firstName", value.firstName);
      user.set("lastName", value.lastName);
      user.set("role", "GUEST");
      user.set("active", false);
      user.set("emailVisibility", true);
      user.setVerified(false);
      user.setRandomPassword();
      txApp.save(user);

      // New accounts start in the canonical Guest group. Further group
      // assignments remain an explicit admin action through the management API.
      try {
        const guestGroup = txApp.findFirstRecordByData("groups", "name", "Guest");
        const assignment = new Record(txApp.findCollectionByNameOrId("user_groups"));
        assignment.set("user", user.id);
        assignment.set("group", guestGroup.id);
        txApp.save(assignment);
      } catch (_) {
        // Keep registration compatible with instances upgraded before the
        // canonical groups migration; admins can assign the group later.
      }

      const profile = new Record(profiles);
      profile.set("user", user.id);
      profile.set("street", value.street);
      profile.set("houseNumber", value.houseNumber);
      profile.set("postalCode", value.postalCode);
      profile.set("city", value.city);
      profile.set("birthDate", value.birthDate);
      if (value.phone) profile.set("phone", value.phone);
      if (value.contactInfo) profile.set("contactInfo", value.contactInfo);
      txApp.save(profile);
    });
  } catch (_) {
    // Do not reveal whether an address is registered or expose collection internals.
    throw new BadRequestError("Registrierung nicht möglich. Bitte prüfe deine Angaben.");
  }

  const settings = $app.settings().meta;
  const base = String(settings.appURL || "").replace(/\/$/, "");
  const link = `${base}/verify-email?token=${encodeURIComponent(user.newVerificationToken())}`;
  const message = new MailerMessage({
    from: { address: settings.senderAddress, name: settings.senderName },
    to: [{ address: value.email }],
    subject: "bvHub Registrierung bestätigen",
    html: `<p>Hallo,</p><p>bitte bestätige deine Registrierung:</p><p><a href="${link}">E-Mail-Adresse bestätigen</a></p><p>Falls du keine Registrierung angefordert hast, ignoriere diese Nachricht.</p>`,
  });
  try {
    $app.newMailClient().send(message);
  } catch (_) {
    // Never report success when the confirmation mail was not accepted.
    console.error("[bvhub registration] confirmation mail delivery failed");
    return e.json(503, { success: false, message: "Registrierung derzeit nicht möglich", code: 503, data: {} });
  }

  const [local, domain] = value.email.split("@");
  return e.json(201, { success: true, email: `${local.slice(0, 2)}***@${domain}` });
}, $apis.requireGuestOnly());

routerAdd("POST", "/api/bvhub/verify-email", (e) => {
  requireCsrf(e);
  const body = e.requestInfo().body;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 4096) throw new BadRequestError("Ungültiger oder abgelaufener Link");

  let user;
  try { user = $app.findAuthRecordByToken(token, "verification"); } catch (_) { throw new BadRequestError("Ungültiger oder abgelaufener Link"); }
  if (!user || user.getBool("verified") === true || user.getBool("active") === true) throw new BadRequestError("Ungültiger oder bereits verwendeter Link");

  user.setVerified(true);
  user.set("active", true);
  try { $app.save(user); } catch (_) { throw new BadRequestError("Aktivierung nicht möglich"); }
  return e.json(200, { success: true });
}, $apis.requireGuestOnly());

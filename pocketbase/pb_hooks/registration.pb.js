const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s'’-]{1,79}$/;
const POSTAL_RE = /^\d{5}$/;
const HOUSE_RE = /^\d+[a-zA-Z]?(?:[–-]\d+[a-zA-Z]?)?$/;
const PHONE_RE = /^[+()\d][+()\d\s./-]{5,39}$/;

function text(body, key) { return typeof body[key] === "string" ? body[key].trim() : ""; }
function invalid(message) { throw new BadRequestError(message); }

function validateRegistration(body) {
  const value = {
    username: text(body, "username"),
    displayName: text(body, "displayName") || text(body, "username"),
    firstName: text(body, "firstName"),
    lastName: text(body, "lastName"),
    email: text(body, "email").toLowerCase(),
    street: text(body, "street"),
    houseNumber: text(body, "houseNumber"),
    postalCode: text(body, "postalCode"),
    city: text(body, "city"),
    birthDate: text(body, "birthDate"),
    phone: text(body, "phone"),
    contactInfo: text(body, "contactInfo"),
  };
  if (!value.username || value.username.length > 80) invalid("Ungültige Registrierungsdaten");
  if (!value.firstName || !value.lastName || !value.displayName || value.displayName.length > 120 || !EMAIL_RE.test(value.email)) invalid("Ungültige Registrierungsdaten");
  if (!value.street || value.street.length > 120 || !HOUSE_RE.test(value.houseNumber) || !POSTAL_RE.test(value.postalCode) || !value.city || value.city.length > 100) invalid("Ungültige Registrierungsdaten");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate)) invalid("Ungültige Registrierungsdaten");
  return value;
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

routerAdd("POST", "/api/bvhub/register", (e) => {
  const body = JSON.parse(toString(e.request.body || "{}"));
  const value = validateRegistration(body);
  let user;

  try {
    $app.runInTransaction((txApp) => {
      const users = txApp.findCollectionByNameOrId("users");
      const profiles = txApp.findCollectionByNameOrId("user_profiles");
      user = new Record(users);
      user.set("username", value.username);
      user.set("email", value.email);
      user.set("displayName", value.displayName);
      user.set("firstName", value.firstName);
      user.set("lastName", value.lastName);
      user.set("role", "GUEST");
      user.set("active", false);
      user.setVerified(false);
      user.setRandomPassword();
      txApp.save(user);

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
  } catch (err) {
    // Do not reveal whether an address is registered or expose collection internals.
    throw new BadRequestError("Registrierung nicht möglich. Bitte prüfe deine Angaben.");
  }

  const token = user.newVerificationToken();
  const origin = e.request.header.get("Origin") || "";
  const base = origin && /^https?:\/\//i.test(origin) ? origin.replace(/\/$/, "") : "";
  const link = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  const settings = $app.settings().meta;
  const message = new MailerMessage({
    from: { address: settings.senderAddress, name: settings.senderName },
    to: [{ address: value.email }],
    subject: "bvHub Registrierung bestätigen",
    html: `<p>Hallo ${value.firstName},</p><p>bitte bestätige deine Registrierung:</p><p><a href="${link}">E-Mail-Adresse bestätigen</a></p><p>Falls du keine Registrierung angefordert hast, ignoriere diese Nachricht.</p>`,
  });
  try { $app.newMailClient().send(message); } catch (_) { /* account remains inactive; resend can be added later */ }
  return e.json(201, { success: true, email: maskEmail(value.email) });
}, $apis.requireGuestOnly());

routerAdd("POST", "/api/bvhub/verify-email", (e) => {
  const body = JSON.parse(toString(e.request.body || "{}"));
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

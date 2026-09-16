const ROLES = ["GUEST", "MEMBER", "ADMIN", "SUPER_ADMIN"];
const STATUSES = ["PAID", "UNPAID"];

function requireUser(e) {
  const user = e.auth;
  if (!user || user.getBool("active") !== true || user.getBool("verified") !== true) throw new ForbiddenError("Zugriff nicht erlaubt");
  return user;
}

function requireAdmin(e) {
  const user = requireUser(e);
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.getString("role"))) throw new ForbiddenError("Zugriff nicht erlaubt");
  return user;
}

function noStore(e) {
  e.response.header().set("Cache-Control", "no-store");
  e.response.header().set("Pragma", "no-cache");
}

function pathValue(e, name) {
  const direct = e.request && typeof e.request.pathValue === "function" ? e.request.pathValue(name) : "";
  if (direct) return direct;
  const parts = String(e.request && e.request.url && e.request.url.path || "").split("/").filter(Boolean);
  if (name === "eventId") {
    const index = parts.indexOf("events");
    return index >= 0 ? parts[index + 1] || "" : "";
  }
  const index = parts.indexOf("payments");
  return index >= 0 ? parts[index + 1] || "" : "";
}

function validId(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9]{15}$/.test(value)) throw new BadRequestError(`Ungültige ${label}`);
  return value;
}

function findPayment(app, id) {
  const paymentId = validId(id, "Payment-ID");
  try { return app.findRecordById("payments", paymentId); } catch (_) { throw new ApiError(404, "Zahlung nicht gefunden", {}); }
}

function paymentForRegistration(app, registrationId) {
  return app.findRecordsByFilter("payments", `registration = '${registrationId}'`, "", 1, 0)[0] || null;
}

function ensurePaymentForRegistration(app, registration, user, event) {
  if (!registration || registration.getString("status") !== "REGISTERED") return null;
  const existing = paymentForRegistration(app, registration.id);
  if (existing) {
    if (!existing.getBool("active")) {
      existing.set("active", true);
      app.save(existing);
    }
    return existing;
  }

  const role = user.getString("role");
  if (!ROLES.includes(role)) throw new BadRequestError("Ungültige Benutzerrolle");
  const amountCents = role === "GUEST" ? event.getInt("guestFeeCents") : 0;
  const paymentRequired = role === "GUEST" && amountCents > 0;
  const payment = new Record(app.findCollectionByNameOrId("payments"));
  payment.id = $security.randomStringWithAlphabet(15, "abcdefghijklmnopqrstuvwxyz0123456789");
  payment.set("registration", registration.id);
  payment.set("event", event.id);
  payment.set("user", user.id);
  payment.set("roleSnapshot", role);
  payment.set("paymentRequired", paymentRequired);
  payment.set("amountCents", amountCents);
  payment.set("status", paymentRequired ? "UNPAID" : "PAID");
  payment.set("purpose", `BVHUB-EVT-${event.id}-PAY-${payment.id}`);
  payment.set("active", true);
  app.save(payment);
  return payment;
}

function deactivatePaymentForRegistration(app, registration) {
  if (!registration) return null;
  const payment = paymentForRegistration(app, registration.id);
  if (payment && payment.getBool("active")) {
    payment.set("active", false);
    app.save(payment);
  }
  return payment;
}

function paymentSettings(app) {
  try { return app.findFirstRecordByFilter("payment_settings", "id != ''"); } catch (_) { return null; }
}

function normalizeIban(value) {
  if (typeof value !== "string") throw new BadRequestError("Ungültige IBAN");
  const iban = value.replace(/\s+/g, "").toUpperCase();
  if (!iban) return "";
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban) || iban.length > 34) throw new BadRequestError("Ungültige IBAN");
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (let index = 0; index < rearranged.length; index += 1) {
    const code = rearranged.charCodeAt(index);
    const digits = code >= 65 && code <= 90 ? String(code - 55) : rearranged[index];
    for (let digitIndex = 0; digitIndex < digits.length; digitIndex += 1) remainder = (remainder * 10 + Number(digits[digitIndex])) % 97;
  }
  if (remainder !== 1) throw new BadRequestError("Ungültige IBAN-Prüfsumme");
  return iban;
}

function normalizeBic(value) {
  if (typeof value !== "string") throw new BadRequestError("Ungültiger BIC");
  const bic = value.replace(/\s+/g, "").toUpperCase();
  if (bic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) throw new BadRequestError("Ungültiger BIC");
  return bic;
}

function normalizeRecipient(value) {
  if (typeof value !== "string") throw new BadRequestError("Ungültiger Empfänger");
  const recipientName = value.trim().replace(/[ \t\r\n]+/g, " ");
  if (recipientName.length > 70) throw new BadRequestError("Empfänger ist zu lang");
  return recipientName;
}

function settingsPayload(e) {
  const body = e.requestInfo().body;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequestError("Ungültige Zahlungsdaten");
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !["recipientName", "iban", "bic"].includes(key))) throw new BadRequestError("Ungültige Zahlungsdaten");
  const data = {};
  if (Object.hasOwn(body, "recipientName")) data.recipientName = normalizeRecipient(body.recipientName);
  if (Object.hasOwn(body, "iban")) data.iban = normalizeIban(body.iban);
  if (Object.hasOwn(body, "bic")) data.bic = normalizeBic(body.bic);
  return data;
}

function settingsDto(record) {
  const recipientName = record ? record.getString("recipientName") : "";
  const iban = record ? record.getString("iban") : "";
  const bic = record ? record.getString("bic") : "";
  return { recipientName, iban, bic, configured: Boolean(recipientName && iban), updated: record ? record.getString("updated") : "" };
}

function eventDto(event) {
  return { id: event.id, title: event.getString("title"), start: event.getString("start"), end: event.getString("end"), guestFeeCents: event.getInt("guestFeeCents") };
}

function paymentDto(app, payment, options) {
  const event = app.findRecordById("events", payment.getString("event"));
  const value = {
    id: payment.id,
    registrationId: payment.getString("registration"),
    event: eventDto(event),
    roleSnapshot: payment.getString("roleSnapshot"),
    paymentRequired: payment.getBool("paymentRequired"),
    amountCents: payment.getInt("amountCents"),
    status: payment.getString("status"),
    purpose: payment.getString("purpose"),
    active: payment.getBool("active"),
    paidAt: payment.getString("paidAt") || null,
    created: payment.getString("created"),
    updated: payment.getString("updated"),
  };
  if (options && options.settings) value.paymentSettings = settingsDto(paymentSettings(app));
  if (options && options.admin) {
    const user = app.findRecordById("users", payment.getString("user"));
    value.user = { id: user.id, displayName: user.getString("displayName"), firstName: user.getString("firstName"), lastName: user.getString("lastName") };
    const paidById = payment.getString("paidBy");
    let paidBy = null;
    if (paidById) {
      try {
        const actor = app.findRecordById("users", paidById);
        paidBy = { id: actor.id, displayName: actor.getString("displayName") };
      } catch (_) {}
    }
    value.paidBy = paidBy;
  }
  return value;
}

function statusPayload(e) {
  const body = e.requestInfo().body;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !STATUSES.includes(body.status)) throw new BadRequestError("Ungültiger Zahlungsstatus");
  return body.status;
}

module.exports = {
  deactivatePaymentForRegistration,
  ensurePaymentForRegistration,
  findPayment,
  noStore,
  normalizeBic,
  normalizeIban,
  pathValue,
  paymentDto,
  paymentForRegistration,
  paymentSettings,
  requireAdmin,
  requireUser,
  settingsDto,
  settingsPayload,
  statusPayload,
  validId,
};

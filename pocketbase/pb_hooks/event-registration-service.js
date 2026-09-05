function registrationFor(app, event, user) {
  return app.findRecordsByFilter("event_registrations", `event = '${event.id}' && user = '${user.id}'`, "", 1, 0)[0] || null;
}
function registrationDto(record) {
  return { id: record.id, event: record.getString("event"), user: record.getString("user"), status: record.getString("status"), registeredAt: record.getString("registeredAt"), cancelledAt: record.getString("cancelledAt"), checkoutRegion: record.getString("checkoutRegion"), termsVersion: record.getString("termsVersion"), termsAcceptedAt: record.getString("termsAcceptedAt"), created: record.getString("created"), updated: record.getString("updated") };
}
function registrationPayload(e) {
  const value = e.requestInfo().body;
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !["checkoutRegion", "termsVersion"].includes(key))) throw new BadRequestError("Ungültige Registrierungsdaten");
  if (!["ER", "NUE"].includes(value.checkoutRegion) || typeof value.termsVersion !== "string" || !value.termsVersion.trim()) throw new BadRequestError("Checkout-Zustimmung erforderlich");
  return { checkoutRegion: value.checkoutRegion, termsVersion: value.termsVersion.trim().slice(0, 80) };
}
module.exports = { registrationFor, registrationDto, registrationPayload };

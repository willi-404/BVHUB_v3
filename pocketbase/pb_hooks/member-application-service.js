const SENDER = "noreply@bv-erlangen2025.de";
const RECIPIENT = "vorstand@bv-erlangen2025.de";

function berlinToday() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const lastSunday = (month) => {
    const last = new Date(Date.UTC(year, month + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
  };
  const summer = now.getTime() >= Date.UTC(year, 2, lastSunday(2), 1) && now.getTime() < Date.UTC(year, 9, lastSunday(9), 1);
  return new Date(now.getTime() + (summer ? 2 : 1) * 3600000).toISOString().slice(0, 10);
}

function user(e) {
  const record = require(`${__hooks}/profile-service.js`).user(e);
  if (record.getString("role") !== "GUEST" && record.getString("role") !== "MEMBER") throw new ForbiddenError("Kein Zugriff auf Mitgliedsanträge");
  return record;
}

function assertEligible(e, record) {
  if (record.getString("role") !== "GUEST") throw new ForbiddenError("Nur Gäste können einen Mitgliedsantrag stellen");
  const profile = require(`${__hooks}/profile-service.js`).findProfile(e.app, record.id);
  if (!profile || ["street", "houseNumber", "postalCode", "city", "birthDate"].some((key) => !profile.getString(key)) || !record.getString("firstName") || !record.getString("lastName") || !record.getString("email")) throw new BadRequestError("Profilangaben sind unvollständig");
  const birthday = profile.getString("birthDate").slice(0, 10);
  const today = berlinToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || birthday > `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`) throw new ForbiddenError("Der Antrag setzt ein Mindestalter von 18 Jahren voraus");
}

function find(app, userId) {
  return app.findRecordsByFilter("member_applications", "user = {:user}", "", 1, 0, { user: userId })[0] || null;
}

function dto(record) {
  return record ? { id: record.id, pdf: record.getString("pdf"), status: record.getString("status"), signedDate: record.getString("signedDate"), updated: record.getString("updated") } : null;
}

function current(e) {
  const currentUser = user(e);
  return { today: berlinToday(), application: dto(find(e.app, currentUser.id)) };
}

function assertAvailable(record) {
  if (record && record.getString("status") === "SENDING" && Date.now() - Date.parse(record.getString("updated")) < 5 * 60 * 1000) throw new ApiError(409, "Der Antrag wird bereits gesendet", {});
}

function send(e, record, currentUser) {
  const settings = e.app.settings();
  let filesystem;
  let attachment;
  try {
    if (!settings.smtp.enabled || String(settings.meta.senderAddress).toLowerCase() !== SENDER) throw new Error("SMTP sender is not configured");
    filesystem = e.app.newFilesystem();
    attachment = filesystem.getReader(`${record.baseFilesPath()}/${record.getString("pdf")}`);
    const message = new MailerMessage({
      from: { address: SENDER, name: "Noreply BV Portal new Member" },
      to: [{ address: RECIPIENT }],
      subject: `Neuer Mitgliedsantrag: ${currentUser.getString("firstName")} ${currentUser.getString("lastName")}`,
      text: `Ein neuer unterschriebener Mitgliedsantrag liegt bei. Benutzer-ID: ${currentUser.id}`,
      attachments: { "Aufnahmeantrag.pdf": attachment },
    });
    e.app.newMailClient().send(message);
    record.set("status", "SENT");
    e.app.save(record);
    return { today: berlinToday(), application: dto(record) };
  } catch (error) {
    record.set("status", "FAILED");
    e.app.save(record);
    console.error(`[bvhub member application] mail failed for ${currentUser.id}: ${error}`);
    throw new ApiError(503, "Antrag gespeichert, E-Mail konnte nicht gesendet werden", { code: "MAIL_FAILED" });
  } finally {
    if (attachment) attachment.close();
    if (filesystem) filesystem.close();
  }
}

function submit(e) {
  const currentUser = user(e);
  assertEligible(e, currentUser);
  const body = e.requestInfo().body;
  const signedDate = body && body.signedDate;
  if (signedDate !== berlinToday()) throw new BadRequestError("Das Unterschriftsdatum ist nicht aktuell");
  const files = e.findUploadedFiles("pdf");
  if (files.length !== 1 || !files[0] || files[0].size < 1000 || files[0].size > 3 * 1024 * 1024) throw new BadRequestError("Gültige PDF-Datei erforderlich");
  let record;
  e.app.runInTransaction((txApp) => {
    record = find(txApp, currentUser.id) || new Record(txApp.findCollectionByNameOrId("member_applications"));
    assertAvailable(record);
    record.set("user", currentUser.id);
    record.set("pdf", files[0]);
    record.set("signedDate", signedDate);
    record.set("status", "SENDING");
    txApp.save(record);
  });
  return send(e, record, currentUser);
}

function retry(e) {
  const currentUser = user(e);
  if (currentUser.getString("role") !== "GUEST") throw new ForbiddenError("Nur Gäste können einen Antrag senden");
  let record;
  e.app.runInTransaction((txApp) => {
    record = find(txApp, currentUser.id);
    if (!record || record.getString("status") === "SENT") throw new ApiError(409, "Kein fehlgeschlagener Antrag vorhanden", {});
    assertAvailable(record);
    record.set("status", "SENDING");
    txApp.save(record);
  });
  return send(e, record, currentUser);
}

module.exports = { current, submit, retry };

/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/bvhub/me/profile", (e) => {
  const api = require(`${__hooks}/profile-service.js`);
  e.response.header().set("Cache-Control", "no-store");
  e.response.header().set("Pragma", "no-cache");
  const currentUser = api.user(e);
  return e.json(200, api.dto($app, currentUser, api.findProfile($app, currentUser.id)));
}, $apis.requireAuth("users"));

routerAdd("PATCH", "/api/bvhub/me/profile", (e) => {
  const api = require(`${__hooks}/profile-service.js`);
  e.response.header().set("Cache-Control", "no-store");
  e.response.header().set("Pragma", "no-cache");
  const authUser = api.user(e);
  let value;
  try {
    value = api.validate(e.requestInfo().body);
  } catch (error) {
    console.warn(`[bvhub profile] rejected update for user record ${authUser.id}`);
    throw error;
  }

  let updatedUser;
  let updatedProfile;
  try {
    $app.runInTransaction((txApp) => {
      updatedUser = txApp.findRecordById("users", authUser.id);
      updatedProfile = api.findProfile(txApp, authUser.id);
      const profileFields = ["street", "houseNumber", "postalCode", "city", "birthDate", "phone", "contactInfo"];
      const submittedProfileFields = profileFields.filter((key) => Object.hasOwn(value, key));

      if (!updatedProfile && submittedProfileFields.length > 0) {
        const required = ["street", "houseNumber", "postalCode", "city", "birthDate"];
        if (required.some((key) => !Object.hasOwn(value, key))) throw new BadRequestError("Profilangaben sind noch nicht vollständig");
        updatedProfile = new Record(txApp.findCollectionByNameOrId("user_profiles"));
        updatedProfile.set("user", authUser.id);
      }

      if (updatedProfile && submittedProfileFields.length > 0) {
        submittedProfileFields.forEach((key) => updatedProfile.set(key, value[key]));
        txApp.save(updatedProfile);
      }

      ["displayName", "firstName", "lastName"].forEach((key) => {
        if (Object.hasOwn(value, key)) updatedUser.set(key, value[key]);
      });
      txApp.save(updatedUser);
    });
  } catch (error) {
    if (error && (error.status === 400 || error.status === 409)) throw error;
    const message = String(error && (error.message || error)).toLowerCase();
    if (message.includes("idx_users_display_name_normalized") || message.includes("users.displayname")) {
      throw new ApiError(409, "Anzeigename bereits vergeben", {});
    }
    console.error(`[bvhub profile] transactional update failed for user record ${authUser.id}`);
    throw new InternalServerError("Profil konnte nicht gespeichert werden");
  }

  return e.json(200, api.dto($app, updatedUser, updatedProfile));
}, $apis.requireAuth("users"));

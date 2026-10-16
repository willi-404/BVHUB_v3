/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const applications = app.findCollectionByNameOrId("member_applications");
  applications.fields.add(new TextField({ name: "fileName", max: 220 }));
  app.save(applications);
}, (app) => {
  const applications = app.findCollectionByNameOrId("member_applications");
  applications.fields.removeByName("fileName");
  app.save(applications);
});

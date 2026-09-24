/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const posts = new Collection({ name: "news_posts", type: "base", system: false, fields: [] });
  posts.fields.add(new SelectField({ id: "news_post_locale", name: "locale", required: true, maxSelect: 1, values: ["zh", "de"] }));
  posts.fields.add(new TextField({ id: "news_post_slug", name: "slug", required: true, min: 1, max: 180, pattern: "^[a-zA-Z0-9._~-]+$" }));
  posts.fields.add(new TextField({ id: "news_post_title", name: "title", required: true, min: 1, max: 300, pattern: "" }));
  posts.fields.add(new TextField({ id: "news_post_link", name: "link", required: true, min: 1, max: 500, pattern: "^https://bv-erlangen2025\\.de/(zh|de)/posts/" }));
  posts.fields.add(new TextField({ id: "news_post_published", name: "publishedAt", required: false, max: 80, pattern: "" }));
  posts.fields.add(new TextField({ id: "news_post_excerpt", name: "excerpt", required: false, max: 2000, pattern: "" }));
  posts.fields.add(new AutodateField({ id: "news_post_created", name: "created", onCreate: true, onUpdate: false }));
  posts.fields.add(new AutodateField({ id: "news_post_updated", name: "updated", onCreate: true, onUpdate: true }));
  posts.listRule = null; posts.viewRule = null; posts.createRule = null; posts.updateRule = null; posts.deleteRule = null;
  posts.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_news_posts_locale_slug ON news_posts (locale, slug)"];
  app.save(posts);

  const slots = new Collection({ name: "news_slots", type: "base", system: false, fields: [] });
  slots.fields.add(new SelectField({ id: "news_slot_locale", name: "locale", required: true, maxSelect: 1, values: ["zh", "de"] }));
  slots.fields.add(new NumberField({ id: "news_slot_position", name: "position", required: true, onlyInt: true, min: 1, max: 1000 }));
  slots.fields.add(new TextField({ id: "news_slot_slug", name: "slug", required: false, max: 180, pattern: "^[a-zA-Z0-9._~-]*$" }));
  slots.fields.add(new AutodateField({ id: "news_slot_created", name: "created", onCreate: true, onUpdate: false }));
  slots.fields.add(new AutodateField({ id: "news_slot_updated", name: "updated", onCreate: true, onUpdate: true }));
  slots.listRule = null; slots.viewRule = null; slots.createRule = null; slots.updateRule = null; slots.deleteRule = null;
  slots.indexes = ["CREATE UNIQUE INDEX IF NOT EXISTS idx_news_slots_locale_position ON news_slots (locale, position)"];
  app.save(slots);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("news_slots")); } catch (_) {}
  try { app.delete(app.findCollectionByNameOrId("news_posts")); } catch (_) {}
});

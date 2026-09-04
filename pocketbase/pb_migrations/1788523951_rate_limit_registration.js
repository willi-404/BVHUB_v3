/// <reference path="../pb_data/types.d.ts" />

const REGISTRATION_RATE_LIMIT = {
  label: "POST /api/bvhub/register",
  audience: "@guest",
  duration: 60,
  maxRequests: 5,
};

migrate((app) => {
  const settings = app.settings();
  const rules = Array.from(settings.rateLimits.rules || []).filter(
    (rule) => rule.label !== REGISTRATION_RATE_LIMIT.label,
  );
  rules.push(REGISTRATION_RATE_LIMIT);
  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = rules;
  app.save(settings);
}, (app) => {
  const settings = app.settings();
  settings.rateLimits.rules = Array.from(settings.rateLimits.rules || []).filter(
    (rule) => rule.label !== REGISTRATION_RATE_LIMIT.label,
  );
  app.save(settings);
});

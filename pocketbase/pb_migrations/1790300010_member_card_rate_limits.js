/// <reference path="../pb_data/types.d.ts" />

const MEMBER_CARD_RATE_LIMITS = [
  {
    label: "POST /api/bvhub/me/member-card-token",
    audience: "@auth",
    duration: 60,
    maxRequests: 20,
  },
  {
    label: "POST /api/bvhub/member-card/verify",
    audience: "@guest",
    duration: 60,
    maxRequests: 120,
  },
];

migrate((app) => {
  const settings = app.settings();
  const labels = new Set(MEMBER_CARD_RATE_LIMITS.map((rule) => rule.label));
  const rules = Array.from(settings.rateLimits.rules || []).filter((rule) => !labels.has(rule.label));
  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = rules.concat(MEMBER_CARD_RATE_LIMITS);
  app.save(settings);
}, (app) => {
  const labels = new Set(MEMBER_CARD_RATE_LIMITS.map((rule) => rule.label));
  const settings = app.settings();
  settings.rateLimits.rules = Array.from(settings.rateLimits.rules || []).filter((rule) => !labels.has(rule.label));
  app.save(settings);
});

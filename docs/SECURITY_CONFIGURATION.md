# Security Configuration

Most settings must be applied manually in the PocketBase Admin UI or through
an operator-owned migration. The registration rate limit is versioned in the
repository because it is part of the public endpoint's security boundary.

## Rate limiting

`1788523951_rate_limit_registration.js` enables PocketBase rate limiting and
enforces at most **5 guest requests per minute per source IP** for:

- `POST /api/bvhub/register`

Additionally configure a rate limit of at most **5 requests per minute per
source IP** for:

- `/api/collections/users/request-otp`
- `/api/collections/users/auth-with-password`

Use a stricter limit for repeated failures where the deployment supports a
separate failure counter. Return HTTP 429 and a short `Retry-After` value when
the limit is reached. Confirm that proxies pass the real client IP safely and
that an untrusted `X-Forwarded-For` header cannot bypass the limiter.

## API rules

- Users may authenticate only through the configured OTP/password endpoints.
- Public user record listing and creation must remain disabled.
- A user may read only their own record/profile; updates must not allow changes
  to `role`, `active`, `verified`, or email ownership fields.
- Administrative user and role operations must be restricted to
  `ADMIN`/`SUPER_ADMIN` through the dedicated server routes.
- Keep `_superusers` API access disabled from the browser.

## Login location headers

Production login audits use Cloudflare's approximate IP location. Enable the
**Add visitor location headers** Managed Transform for the API zone so the
origin receives `CF-IPCity`, `CF-Region`, and `CF-IPCountry`.

Keep the PocketBase origin reachable only through the Cloudflare Tunnel. The
application must not trust these headers on an origin that clients can reach
directly. Missing headers are allowed and must never block authentication.
The audit log stores only city, region, and country. It does not store the
Cloudflare latitude, longitude, postal code, or timezone headers.

## CSRF boundary

Registration and email verification do not use cookie authentication or any
other ambient browser credential. They are guest-only `POST` routes, so a
cross-origin site cannot exercise existing user authority through them. Keep
authenticated API calls on PocketBase bearer tokens and do not add a
frontend-origin double-submit cookie to the separate PocketBase origin; the
browser cannot send that cookie to the backend. If cookie authentication is
introduced later, add server-issued CSRF tokens on the PocketBase origin at
the same time.

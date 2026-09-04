# Security Configuration

These settings must be applied manually in the PocketBase Admin UI or through
an operator-owned migration script. The deployment scripts intentionally do
not change them.

## Rate limiting

Configure a rate limit of at most **5 requests per minute per source IP** for:

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

## CSRF hook

The frontend creates a per-tab `csrf-token` value in `sessionStorage` and a
JavaScript-readable `SameSite=Strict` cookie. Registration and email
verification send the same value as `X-CSRF-Token`. The
`pocketbase/pb_hooks/registration.pb.js` hook compares the header with the
`csrf-token` cookie and rejects a mismatch with HTTP 403. If the frontend and
PocketBase use different origins, deploy them behind the same origin (or add a
server-issued CSRF endpoint that sets the cookie on the PocketBase origin),
otherwise the browser will not send the cookie.

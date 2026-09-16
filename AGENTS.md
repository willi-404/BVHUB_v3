# BVHUB Repository Instructions

## Release Metadata Is Required

Release Drafter maintains the next release draft from merged pull requests.
Every change intended for a release MUST use a pull request. Do not rely on a
direct push to `master` appearing in the generated changelog.

- PR titles MUST use Conventional Commit form: `type(optional-scope): summary`.
- Commits MUST use the same form so local history remains readable and can be
  reused if a PR needs to be reconstructed.
- Use a specific, present-tense summary without a trailing period.
- Read `docs/RELEASE_WORKFLOW.md` before creating a PR or publishing a release.

Release Drafter categories and version effects are:

| Change | Required title form | Release Drafter result |
| --- | --- | --- |
| User-facing feature | `feat(scope): summary` | Features, minor version |
| Bug fix | `fix(scope): summary` | Fixes, patch version |
| Performance fix | `perf(scope): summary` | Fixes, patch version |
| Security fix | `fix(security): summary` and `security` or `security-fix` label | Security, patch version |
| Maintenance | `build`, `chore`, `ci`, `docs`, `refactor`, `style`, or `test` | Maintenance, patch version |
| Breaking change | Conventional Commit `!` and `breaking-change` or `major` label | Major version |

Labels are optional for ordinary categorized changes when the PR title is
conventional. Apply the matching label when it improves discovery; labels are
mandatory for an intentional major release and for a security fix.

The `Release Metadata` GitHub Actions check validates non-draft PR titles and
commit subjects for `master`. It also requires the security or major labels
above. Keep its status check required in GitHub branch protection.

Do not use `skip-changelog` unless the change is deliberately excluded from
user-visible release notes and a maintainer has agreed.

## Publishing

Release Drafter creates or updates a draft; it does not publish releases.
Before manually publishing, verify the exact target commit, tag and title,
green CI for that commit, and the draft notes. See `docs/RELEASE_WORKFLOW.md`.

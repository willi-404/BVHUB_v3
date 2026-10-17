# Release Workflow

BVHUB uses Release Drafter to maintain a draft for pull request releases. A
direct push to `master` that has no merged pull request is published as the
next patch release with GitHub's default generated release notes.

## Required Change Metadata

Release Drafter reads pull request metadata. The PR title is the authoritative
release-note input; individual commits must follow the same convention for
clear history. A pull request merge keeps the draft workflow so a maintainer can
set the version and edit the release notes before publishing.

Use this title format:

```text
type(optional-scope): concise present-tense summary
```

| Intent | Title example | Generated section | Version effect |
| --- | --- | --- | --- |
| Feature | `feat(events): add cancellation deadline` | Features | minor |
| Fix | `fix(payments): preserve EPC payment purpose` | Fixes | patch |
| Performance | `perf(members): cache member lookup` | Fixes | patch |
| Maintenance | `ci(frontend): install PocketBase for E2E` | Maintenance | patch |
| Security | `fix(security): validate CSRF origin` | Security | patch |
| Breaking change | `feat(api)!: rename event status` | major | major |

Allowed maintenance types are `build`, `chore`, `ci`, `docs`, `refactor`,
`style`, and `test`. Use `feat`, `fix`, or `perf` for product changes. Keep the
scope specific to the affected area, such as `auth`, `events`, `payments`,
`members`, `frontend`, `pocketbase`, `ci`, or `security`.

## Automated Validation

`.github/workflows/release-metadata.yml` validates every non-draft PR targeting
`master`. It rejects a non-conventional PR title or commit subject and requires
the security or major labels defined below. In GitHub branch protection, require
the **Release Metadata / validate** status check before merge and enable
**Require a pull request before merging**. Restrict direct pushes to `master`.
Without those branch rules, a failing check is visible but does not block a
maintainer from merging or pushing.

## Direct Push Releases

The `Release Drafter and automatic patch releases` workflow classifies each
push to `master`:

- A push with an associated merged pull request updates the Release Drafter
  draft. The maintainer chooses the version and writes the final notes.
- A push without an associated merged pull request creates the next patch tag
  from the latest semantic version tag and publishes a release with GitHub's
  default generated notes.

The workflow checks the commit already tagged by the latest release before
publishing. Re-running the same workflow therefore does not create another
patch release. This path does not change the frontend `package.json` version.

## Labels

Conventional PR titles classify ordinary changes. Add labels when a change needs
an explicit signal:

- `security` or `security-fix`: required together with `fix(security): ...`;
  the workflow rejects either signal by itself.
- `breaking-change` or `major`: required for an intentional major release. Use
  `!` in the PR title, for example `feat(api)!: rename event status`; the
  workflow rejects either signal by itself.
- `feature` or `enhancement`, `bug` or `bugfix`, and maintenance labels such as
  `chore`, `dependencies`, `documentation`, `refactor`, or `test`: optional
  aids for review and changelog discovery.
- `skip-changelog`: use only with maintainer approval for a change that must not
  appear in release notes.

## Pull Request Checklist

1. Use a PR for features, security changes, and major changes. Intentional
   direct patch commits are supported by the automatic patch release path.
2. Use a valid Conventional Commit PR title and matching commit messages. The
   Release Metadata workflow checks both for non-draft PRs.
3. Apply the security or major label when required above.
4. Ensure CI is green before merge.
5. Check the updated Release Drafter draft after merge. Correct the human
   summary when needed; do not treat generated text as a substitute for review.

## Pull Request Release Checklist

1. Confirm the intended target commit and its CI status.
2. Open the existing Release Drafter draft rather than creating a duplicate.
3. Confirm the tag, release title, and generated categories.
4. Add a plain-language `User summary` for members and review the maintenance
   changelog for accuracy.
5. Confirm whether this is a normal release or prerelease, then select
   **Publish release** manually.

The first release may need substantial manual notes because it has no earlier
published release boundary and contains historical direct commits. After a
release is published, Release Drafter can calculate subsequent drafts from that
tag more reliably.

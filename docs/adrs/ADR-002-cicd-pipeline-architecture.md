# ADR-002: CI/CD Pipeline Architecture for katalyst-bdd-test

## Status

Accepted

## Date

2026-10-13

## Context

The `katalyst-bdd-test` repo needed automated CI and CD pipelines to:

- Validate code quality and commit conventions on every PR.
- Automatically version, publish, and release both npm packages (`stack-tests` and `create-stack-tests`) on merge to `main`.
- Keep both packages in lockstep versioning despite being separate npm packages in a monorepo.
- Avoid manual release steps that had led to version inconsistencies (e.g., `create-stack-tests` at `0.3.0` in `package.json` but never published).

## Decision

We implement a two-workflow architecture in GitHub Actions:

### CI Workflow (`.github/workflows/ci.yml`)

Triggered on: `pull_request` to `main` and `push` to `main`.

| Job | Trigger | Purpose |
|---|---|---|
| `commitlint` | PR only | Validates all PR commits follow Conventional Commits |
| `lint-and-typecheck` | PR + push | Runs `tsc --noEmit` for type safety |
| `test` | PR + push | Builds and runs the test suite |
| `dependency-review` | PR only | Scans new dependencies for known vulnerabilities |

All jobs set `HUSKY=0` to skip git hooks in CI.

### CD Workflow (`.github/workflows/cd.yml`)

Triggered on: `push` to `main` only.

Single `release` job that:
1. Checks out with full history (`fetch-depth: 0`) for semantic-release tag analysis.
2. Installs, builds, then runs `npx semantic-release`.
3. semantic-release determines the version, updates changelogs, bumps all workspace `package.json` files, publishes both packages to npm, creates a GitHub Release, and commits version files back to `main`.

Uses `concurrency` with `cancel-in-progress: false` to serialize releases — concurrent pushes to `main` queue rather than cancel each other.

### semantic-release Configuration (`.releaserc.json`)

Plugin chain (order matters):

1. `commit-analyzer` — determines version bump from commits.
2. `release-notes-generator` — generates markdown release notes.
3. `changelog` — writes `CHANGELOG.md`.
4. `exec` — runs `npm version --workspaces` to bump all `package.json` files in lockstep.
5. `npm` (stack-tests) — publishes `stack-tests` to npm.
6. `npm` (create-stack-tests) — publishes `create-stack-tests` to npm.
7. `git` — commits version files and changelog back to `main`.
8. `github` — creates the GitHub Release.

### Lockstep Versioning

Both packages always share the same version. The `@semantic-release/exec` plugin runs `npm version ${nextRelease.version} --no-git-tag-version --workspaces --include-workspace-root` to bump the root and both workspace `package.json` files atomically before publish.

### Secrets Required

| Secret | Purpose |
|---|---|
| `GITHUB_TOKEN` | Provided automatically. Used for GitHub Release creation and git push. |
| `NPM_TOKEN` | Must be configured manually. npm automation token for publishing. |

## Consequences

### Positive

- **Zero-touch releases**: Merging to `main` is the only human action required. Versioning, changelog, npm publish, and GitHub Release are fully automated.
- **Lockstep consistency**: Both packages always have the same version. No more divergence between `package.json` and what's on npm.
- **Quality gates**: PRs must pass commitlint, type-check, tests, and dependency review before merge. Broken code and bad commit messages don't reach `main`.
- **Idempotent releases**: Re-running the CD workflow for the same commit is safe — semantic-release skips if the version is already published.
- **Serialized releases**: The concurrency group prevents race conditions when multiple PRs merge in quick succession.

### Negative

- **Single-branch model**: Only `main` triggers releases. Pre-release channels (`beta`, `next`) are not configured. This can be added later by extending `.releaserc.json` branches.
- **Full history checkout**: `fetch-depth: 0` is slower than shallow clones. Required for semantic-release to analyze tags. Acceptable for this repo's size.
- **npm token management**: The `NPM_TOKEN` secret must be manually rotated. No automated rotation is configured.

### Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Accidental major version bump | commitlint enforces format; PR review catches `!` or `BREAKING CHANGE` |
| npm publish failure mid-release | semantic-release is idempotent; re-run the workflow |
| Bad version published | `npm deprecate` + fix forward (see release runbook) |

## References

- [semantic-release documentation](https://semantic-release.gitbook.io/)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- Full cross-repo CI/CD architecture ADR: `katalyst-taxonomy/docs/adrs/ADR-002-cicd-pipeline-architecture.md`
- Release runbook: `docs/release-runbook.md`

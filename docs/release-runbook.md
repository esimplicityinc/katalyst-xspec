# Release Runbook — katalyst-bdd-test

## How Releases Work

This repo uses **semantic-release** to fully automate versioning and publishing. On every push to `main`, the CD workflow:

1. Analyzes commit messages since the last release using [Conventional Commits](https://www.conventionalcommits.org/).
2. Determines the next version bump (patch, minor, or major).
3. Generates release notes and updates `CHANGELOG.md`.
4. Bumps `package.json` versions across the root and both workspaces (`stack-tests`, `create-stack-tests`).
5. Publishes **both** npm packages: `@katalyst/stack-tests` and `create-stack-tests`.
6. Creates a GitHub Release with the generated notes.
7. Commits the version bumps and changelog back to `main` with `[skip ci]`.

No human intervention is required for standard releases.

## Commit Convention Quick Reference

| Prefix | Version Bump | Example |
|---|---|---|
| `fix(scope):` | Patch (0.0.x) | `fix(stack-tests): correct timeout handling` |
| `feat(scope):` | Minor (0.x.0) | `feat(create-stack-tests): add API test scaffold` |
| `feat(scope)!:` | Major (x.0.0) | `feat(stack-tests)!: drop Node 18 support` |
| `BREAKING CHANGE:` in footer | Major (x.0.0) | Any commit type with this footer |

### Scopes

| Scope | When to use |
|---|---|
| `stack-tests` | Changes to the `stack-tests` package |
| `create-stack-tests` | Changes to the `create-stack-tests` scaffold |
| `docs` | Documentation-only changes |
| `deps` | Dependency updates |

Scopes are enforced by commitlint in CI. Commits without a scope produce a warning; commits with an invalid scope are rejected.

### Non-releasing types

These types are valid but do **not** trigger a release: `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `revert`.

## Day-to-Day Workflow

1. Create a feature branch from `main`.
2. Write code. Write conventional commit messages.
3. Open a PR to `main`. CI runs commitlint, type-check, tests, and dependency review.
4. Get review approval and merge.
5. The CD workflow runs automatically — version, changelog, npm publish, and GitHub Release are all handled.
6. Check the [Actions tab](../../actions) to confirm the release succeeded.

That's it. Don't manually bump versions. Don't manually tag. Don't manually publish.

## Manual Procedures

### Dry Run

To test what semantic-release *would* do without actually publishing:

```bash
# Locally (requires GITHUB_TOKEN)
npx semantic-release --dry-run
```

Or trigger the CD workflow manually via `workflow_dispatch` if that trigger is added in the future.

### Forcing a Release

If commits since the last tag are all non-releasing types (e.g., `chore`, `ci`) but you need a release, add an empty commit:

```bash
git commit --allow-empty -m "fix(stack-tests): trigger release for config changes"
```

## Troubleshooting

### Merge to main didn't create a release

- **All commits are non-releasing types.** Only `feat` and `fix` (and `perf` with the default analyzer) trigger releases. Check the commit history since the last tag.
- **Commit messages don't follow the convention.** Squash-merges rewrite the message — make sure the squash commit message is conventional.
- **semantic-release found no unreleased commits.** Check `git log $(git describe --tags --abbrev=0)..HEAD --oneline`.

### Wrong version was released

- Likely a commit was tagged with `!` or `BREAKING CHANGE` unintentionally.
- Fix forward: make the correction and let the next release supersede it.
- If the version is truly wrong, see Recovery below.

### npm publish failed

- Check that `NPM_TOKEN` secret is set and not expired.
- Check that the package names aren't taken by another org on npm.
- Check the CD workflow logs for the specific npm error.
- Re-run the failed workflow from the Actions tab (the release is idempotent for the same commit).

### commitlint fails on PR

- One or more commits in the PR don't follow the convention.
- Interactive rebase to fix: `git rebase -i origin/main` then edit the commit messages.
- If using squash merge, the individual commit messages don't matter — only the squash commit message does.

## Recovery

**Do not `npm unpublish`.** npm unpublish has a 72-hour window and breaks anyone who already installed that version.

Instead:

1. `npm deprecate @katalyst/stack-tests@"<bad-version>" "Use <good-version> instead"` — marks it as deprecated in the registry.
2. Fix the issue on `main` with a new commit.
3. Let semantic-release publish the corrected version.

## Version Reconciliation Note

`create-stack-tests` was at version `0.3.0` in `package.json` but was **never published to npm** at that version. `stack-tests` was last published at an earlier version.

On the first automated release, semantic-release will analyze commits since the last Git tag and determine the next version. Both packages will be bumped to the **same** version together (lockstep versioning via the `@semantic-release/exec` plugin running `npm version --workspaces`). This means:

- The first automated release will unify both packages under one version number.
- There is no gap or inconsistency — npm treats the first publish as authoritative regardless of what `package.json` said before.

## Cross-Repo Context

This repo (`katalyst-bdd-test`) provides the BDD testing framework (`stack-tests`) and its scaffolding CLI (`create-stack-tests`). It consumes other Katalyst repos as **test targets**:

- **katalyst-taxonomy** — the taxonomy CLI and data model being tested
- **katalyst-forge** — the Forge SDLC orchestrator
- **katalyst-engine** — the execution engine

Those repos have their own independent release pipelines. Changes in those repos may require corresponding test updates here, but version coupling is intentional — the BDD tests validate the contracts those repos expose.

The full cross-repo CI/CD architecture is documented in `katalyst-taxonomy/docs/adrs/ADR-002-cicd-pipeline-architecture.md`.

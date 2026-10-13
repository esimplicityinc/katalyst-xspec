# ADR-001: Conventional Commits for katalyst-bdd-test

## Status

Accepted

## Date

2026-10-13

## Context

The `katalyst-bdd-test` monorepo contains two npm packages (`stack-tests` and `create-stack-tests`) that need a consistent, automated release process. Before this decision, version bumps were manual and inconsistent — `create-stack-tests` reached `0.3.0` in `package.json` without ever being published to npm.

We needed a commit convention that would:
- Enable fully automated version determination and changelog generation.
- Distinguish changes to `stack-tests` vs `create-stack-tests` vs shared infrastructure.
- Integrate with semantic-release for zero-touch publishing.
- Be enforceable in CI to prevent convention drift.

## Decision

We adopt the [Conventional Commits](https://www.conventionalcommits.org/v1.0.0/) specification with the `@commitlint/config-conventional` preset, extended with repo-specific scopes.

### Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

Standard Conventional Commits types apply: `feat`, `fix`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `revert`.

### Scopes

Enforced via commitlint (`scope-enum` rule, severity: error):

| Scope | Purpose |
|---|---|
| `stack-tests` | Changes to the `stack-tests` package |
| `create-stack-tests` | Changes to the `create-stack-tests` scaffold CLI |
| `docs` | Documentation-only changes |
| `deps` | Dependency updates (Dependabot, manual upgrades) |

Omitting a scope produces a warning (`scope-empty` at severity 1). Using an unlisted scope is a hard error.

### Version Mapping

| Commit Pattern | Version Bump |
|---|---|
| `fix(scope):` | Patch |
| `feat(scope):` | Minor |
| `feat(scope)!:` or `BREAKING CHANGE:` footer | Major |

### Enforcement

- **CI**: The `commitlint` job in `.github/workflows/ci.yml` validates all commits in a PR against the convention. Runs only on `pull_request` events.
- **Local**: Husky + commitlint git hook validates on `git commit` (opt-out via `HUSKY=0` in CI).

## Consequences

### Positive

- **Automated releases**: semantic-release reads commit types to determine version bumps — no human judgment needed for versioning.
- **Meaningful changelogs**: `@semantic-release/release-notes-generator` produces grouped, readable release notes from commit messages.
- **Scope tracking**: Scopes make it trivial to filter which package was affected in `git log` and changelogs.
- **Consistency**: Enforced in CI, so convention drift is impossible on `main`.

### Negative

- **Learning curve**: Contributors must learn the convention. Mitigated by commitlint providing clear error messages and the release runbook documenting the format.
- **Squash merge discipline**: When using GitHub squash merge, the squash commit message must follow the convention — the individual branch commits are discarded. This requires PR authors to set a proper squash message.
- **Scope maintenance**: New packages or major subsystems require updating the `scope-enum` in `commitlint.config.js`.

### Neutral

- The convention is already standard across the broader Katalyst ecosystem. This ADR applies it specifically to the BDD test repo's two-package structure.

## References

- [Conventional Commits 1.0.0 spec](https://www.conventionalcommits.org/v1.0.0/)
- [commitlint documentation](https://commitlint.js.org/)
- Full cross-repo commit convention ADR: `katalyst-taxonomy/docs/adrs/ADR-001-conventional-commits.md`

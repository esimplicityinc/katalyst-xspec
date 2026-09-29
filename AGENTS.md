# Katalyst Agent Workflow

## Repository Overview

This is `katalyst-bdd-test`, a reusable Playwright-BDD testing framework providing:

- **`@esimplicity/stack-tests`** - Core library with ports, adapters, fixtures, and pre-built step definitions for API, UI, TUI, and hybrid testing
- **`@esimplicity/create-stack-tests`** - CLI scaffolding tool (`npx create-stack-tests`) and upgrade utility (`npx upgrade-stack-tests`)

### Key Directories

| Path | Description |
|------|-------------|
| `stack-tests/` | Main library package (ports, adapters, steps, fixtures) |
| `create-stack-tests/` | CLI tools for scaffolding and upgrading |
| `examples/` | Example projects (api-example, ui-example, tui-example, full-stack-example) |
| `docs/` | Documentation (guides, reference, concepts) |

### Architecture

Uses hexagonal (ports & adapters) architecture:
- **Ports**: `ApiPort`, `UiPort`, `TuiPort`, `AuthPort`, `CleanupPort`
- **Adapters**: `PlaywrightApiAdapter`, `PlaywrightUiAdapter`, `TuiTesterAdapter`, etc.
- **Tags**: `@api`, `@ui`, `@tui`, `@hybrid` control which steps are available

## Git Commit Policy

- **NEVER commit changes yourself.** Always wait for the user to review and commit.
- Stage files and show what would be committed, but do not run `git commit`.
- When ready to commit, inform the user and let them decide when to commit.

## Core Working Principles

- **Test-Driven Development (TDD):**
  1. Write or update tests that capture the required behaviour.
  2. Implement the minimum code to make the tests pass.
  3. Refactor and tidy up, keeping tests green and code readable.

- **Hexagonal Architecture:**
  - Consider adapters like `discovery/filesystem.py`, `ignore.py`, and `cli.py` as ports/adapters.
  - Keep domain logic independent of external concerns (filesystem, CLI, logging).
  - Respect package boundaries—avoid reaching across layers directly.

## Development Loop

1. Update / add tests in `tests/` for the new behaviour.
2. Make code changes under `src/` to satisfy the tests, staying within the hexagonal boundaries.
3. Run the linters and test suite locally before requesting review.

## Commands

Run from `.global/utils/katalyst/` unless noted:

- **Format:**
  ```bash
  uv run ruff format
  ```

- **Lint:**
  ```bash
  uv run ruff check -- src tests
  ```

- **Type Check (Pyright):**
  ```bash
  uv run pyright
  ```

- **Tests (Pytest):**
  ```bash
  uv run pytest
  ```
- **Coverage HTML (optional):**
  ```bash
  uv run pytest --cov-report=html
  ```

- **CLI Smoke Test:**
  ```bash
  uv run python -m katalyst taxprint --path <repo-root>
  uv run python -m katalyst taxget --path <repo-root> | jq '.errors | length'
  uv run python -m katalyst taxtree --path <repo-root>
  kata taxcreate --path <repo-root> --name <layer-node> --type layer \
    --description "..." --parent <stack> --parent-subsystem <subsystem> \
    --parent-system <system> --environment dev --owner team@example.com
  ```

- **TUI (Textual) Preview:**
  ```bash
  uv run python -m katalyst.tui --path <repo-root>
  ```
  Use the left tree to browse the taxonomy, press `c` to open the creation
  dialog scoped to the selected node, `r` to refresh from disk, and `w`
  to toggle loader warnings.

- **Dependency Install / Reinstall:**
  ```bash
  uv pip install --upgrade --force-reinstall .
  ```

## Logging Guidelines

- Use `loguru` (`logger.info`, `logger.warning`) for significant events, error paths, and summary output.
- Keep logging in the adapters (CLI, filesystem discovery, service entry points), not inside core domain models.

## Ignore Rules

- `.taxignore` at repo root defines directories/files skipped during taxonomy discovery.
- Tests in `tests/fixtures/taxonomy/layouts/` demonstrate valid patterns (file rules, directory rules, negation, dot directories).

## Miscellaneous

- Curated taxonomy fixtures live under `tests/fixtures/taxonomy/layouts/`; keep them up to date when schemas change.
- Fully qualified taxonomy names (FQTN) are resolved via parent relationships in `taxonomy/service.py` and surfaced in CLI/JSON outputs.

## Pull request size

Every PR adds at most 400 source lines (ric-team git-workflow practice, katalyst-forge NFR-060). Tests, BDD `.feature` specs, Markdown, `docs/`, lockfiles, and generated code do not count, and deletions do not count.

Measure the PR before you open or update it. Use the PR's base branch as the base. For a stacked PR, the base is its parent branch, not main:

```
bash ~/.claude/skills/katalyst-forge/scripts/forge-size-gate.sh origin/main HEAD
```

If the Forge skill is not installed, run `skills/katalyst-forge/scripts/forge-size-gate.sh` from a katalyst-forge checkout.

- Exit 1 means the PR is over budget. Split the branch into stacked PRs before you request review, and give each one its own revert path. A "Size Justification" section, a scope note, or a follow-up promise in the PR body does not satisfy the rule.
- Exit 2 means the gate could not run. Fix the problem and run the gate again. Never skip the gate, and never count lines by hand.

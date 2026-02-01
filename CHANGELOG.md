# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8] - 2026-02-01

### Added

- **Agent Skills for AI-assisted development**: Added 5 comprehensive Agent Skills following the [agentskills.io](https://agentskills.io) specification:
  - `katalyst-bdd-quickstart` - Getting started guide for new users
  - `katalyst-bdd-step-reference` - Complete step definition reference with all API, UI, TUI, and shared steps
  - `katalyst-bdd-create-test` - Test creation wizard with patterns for API, UI, TUI, and hybrid testing
  - `katalyst-bdd-troubleshooting` - Debug and fix common issues
  - `katalyst-bdd-architecture` - Framework internals and extension guide for custom adapters/steps

- **Skills installation in scaffolder** (`create-stack-tests` v0.1.5):
  - Interactive prompt to install skills during project scaffolding
  - Support for multiple AI agent targets: OpenCode, Claude Code, Cursor, and generic
  - New CLI flags: `--with-skills`, `--no-skills`, `--skills-agents <agents>`
  - Skills bundled in npm package for offline installation

- **Skills update command** (`upgrade-stack-tests`):
  - New `--update-skills` flag to refresh installed Agent Skills to latest version

### Changed

- Skills are installed to agent-specific directories following the skills.sh convention:
  - `.opencode/skills/` for OpenCode
  - `.claude/skills/` for Claude Code
  - `.cursor/skills/` for Cursor
  - `skills/` for generic Agent Skills spec

## [0.1.7] - 2026-01-28

### Changed

- Documentation improvements and troubleshooting section additions
- Added common UI steps for improved developer experience

## [0.1.6] - 2026-01-21

### Added

- **New UI step definitions**:
  - `ui.form.ts` - Bulk form filling steps
  - `ui.debug.ts` - Debugging utility steps
  - `ui.layout.ts` - Panel, split view, and responsive layout assertions
  - `ui.auth.ts` - Fetch intercept authentication steps
- **Feature flag system**: Added `setFlag()` and `isFlagEnabled()` utilities with `shared.flags.ts` step definitions for conditional test logic.
- **Fetch intercept auth adapter**: New `FetchInterceptAuthAdapter` for UI authentication via fetch request interception.
- **TUI steps in registerAllSteps**: `registerAllSteps()` now includes TUI steps for complete test suite registration.

### Changed

- **Package name standardization**: Unified all package references to `@esimplicity/stack-tests` across documentation, examples, website, and tooling (previously mixed `@kata/stack-tests` and `@esimplicityinc/stack-tests`).

### Fixed

- **Unused import**: Removed unused `World` import from `fetch-intercept-auth.adapter.ts`.

## [0.1.4] - 2026-01-10

### Fixed

- **Scaffolding package name**: Fixed `create-stack-tests` to use correct npm package name `@esimplicity/stack-tests` instead of `@kata/stack-tests` in generated files.

## [0.1.3] - 2026-01-10

### Added

- **Postinstall warning**: Shows a clear warning when `tmux` is not installed, explaining it's required for TUI testing.

## [0.1.2] - 2026-01-10

### Added

- **`upgrade-stack-tests` CLI**: New command to check for and install updates to `@esimplicity/stack-tests`.
  - `npx upgrade-stack-tests` - Upgrade to latest version
  - `npx upgrade-stack-tests --check` - Check for updates without installing
  - `npx upgrade-stack-tests -v 0.1.1` - Install a specific version

### Changed

- `create-stack-tests` package now includes both `create-stack-tests` and `upgrade-stack-tests` binaries.

## [0.1.1] - 2026-01-10

### Fixed

- **Hybrid scenario support**: Updated step tags from single tags (`@api`, `@ui`) to combined expressions (`@api or @hybrid`, `@ui or @hybrid`) so that `@hybrid` scenarios can use both API and UI steps.
- **Playwright version conflict**: Removed `@playwright/test`, `playwright-bdd`, and `typescript` from `devDependencies` (keeping them only in `peerDependencies`) to prevent duplicate Playwright installations when using `file:` links.

### Changed

- Updated `docs/concepts/tag-system.md` to document the step-level tag expression pattern.

## [0.1.0] - 2025-01-09

### Added

- Initial release of the Katalyst BDD Test framework.
- **Ports & Adapters Architecture**:
  - `ApiPort` - HTTP/REST API testing with request/response handling
  - `UiPort` - Browser UI testing with Playwright
  - `TuiPort` - Terminal UI testing for CLI applications
  - `AuthPort` - Pluggable authentication handling
  - `CleanupPort` - Test data cleanup management
- **Built-in Adapters**:
  - `PlaywrightApiAdapter` - API testing via Playwright's request context
  - `PlaywrightUiAdapter` - Full browser automation
  - `TuiTesterAdapter` - Terminal application testing
  - `UniversalAuthAdapter` - Flexible authentication (basic, bearer, API key, custom)
  - `DefaultCleanupAdapter` - Automatic test cleanup
- **Pre-built Step Definitions** for API, UI, TUI, Hybrid, and Shared testing.
- **Example Projects**: `api-example`, `ui-example`, `tui-example`, `full-stack-example`.
- Comprehensive documentation including guides and API reference.

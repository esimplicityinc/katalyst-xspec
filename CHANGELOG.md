# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-01-10

### Fixed

- **Hybrid scenario support**: Updated step tags from single tags (`@api`, `@ui`) to combined expressions (`@api or @hybrid`, `@ui or @hybrid`) so that `@hybrid` scenarios can use both API and UI steps.
- **Playwright version conflict**: Removed `@playwright/test`, `playwright-bdd`, and `typescript` from `devDependencies` (keeping them only in `peerDependencies`) to prevent duplicate Playwright installations when using `file:` links.

### Changed

- Updated `docs/concepts/tag-system.md` to document the step-level tag expression pattern.

### Files Changed

- `stack-tests/src/steps/api.http.ts`
- `stack-tests/src/steps/api.auth.ts`
- `stack-tests/src/steps/api.assertion.ts`
- `stack-tests/src/steps/ui.basic.ts`
- `stack-tests/src/steps/ui.wizard.ts`
- `stack-tests/package.json`
- `docs/concepts/tag-system.md`

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

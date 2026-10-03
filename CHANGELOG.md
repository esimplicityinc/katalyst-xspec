# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-10-02

### Breaking Changes

- **The `@api` / `@ui` / `@hybrid` / `@tui` type tags are gone.** Built-in steps are no longer scoped to a tag, so any step works in any scenario. API and UI steps can be mixed freely, and there's no `@hybrid` tag or project to set up. Scaffolded Playwright projects now pick feature files by folder only. Before, a project filter like `tags: '@ui'` silently skipped any scenario that lacked the tag.
  - **Action required:** run `npx katalyst-xspec upgrade --migrate`. It removes `tags: '@api'`-style filters and `projectTag: '@ui'` from `playwright.config.*`, and plain `upgrade` now warns if they're still there.
  - Feature files that still have `@api`/`@ui` tags keep working; the tags just don't do anything now.
  - Your own tags (`@smoke`, `@wip`, …) and `TEST_TAGS` filtering work as before, and scenarios tagged `@Skip` or `@ignore` are still skipped.
- **Two TUI steps changed** so their wording no longer clashes with UI steps now that tags don't keep them apart:
  - The TUI copy of `Then I should see text {string}` is removed. Use `Then I should see {string}` (or `… in the terminal`); the wording now always means the UI step.
  - TUI `When I fill the form:` is renamed **`When I fill the TUI form:`**. The UI step keeps `I fill the form:`.

### Changed

- **`tagsForProject()`:** `projectTag` is now optional, so `tagsForProject()` returns `not @Skip and not @ignore`.
- **`katalyst-xspec init` names the project after its folder.** For example, `init my-tests` gives `"name": "my-tests"`, and `init .` uses the current folder's name, made npm-safe. Before, every project was called `katalyst-xspec`.
- **The scaffolded examples pass out of the box.** `init` creates `features/api/example.feature` (JSONPlaceholder) and `features/ui/example.feature` (Sauce Demo). Both use public demo sites with absolute URLs, so a first `npm test` passes with no `.env`. The `localhost:3000` placeholders and the hybrid/TUI examples that failed until configured are no longer scaffolded.
- **`init` lists `npx playwright install chromium` in its next steps,** and the generated README and the docs cover it.
- **Docs:** rewritten for the above, including a new quick start, a "Tags" concept page and troubleshooting for scenarios that don't run. Node.js >= 20 is now listed everywhere.

### Fixed

- **`upgrade --migrate` no longer crashes on projects without custom step files.** It failed with `ENOENT … steps/steps.ts.original` because the backup `steps/` folder was only created when custom step files existed, which isn't the case for a freshly scaffolded project.

## [0.6.0] - 2026-10-02

### Breaking Changes

- **The package moved to npmjs.com as `@esimplicitylabs/katalyst-xspec`.** Installing no longer needs a GitHub token or registry setup:

  ```bash
  npx @esimplicitylabs/katalyst-xspec init my-tests
  ```

  Imports change from `@esimplicityinc/katalyst-xspec` (and `/steps`) to `@esimplicitylabs/katalyst-xspec`. `@esimplicityinc/katalyst-xspec@0.5.0` stays on GitHub Packages but won't be updated.
- **Action required:** in an existing project, run `npx @esimplicitylabs/katalyst-xspec upgrade`. It works from `@esimplicityinc/katalyst-xspec` and from `@esimplicity/stack-tests`. It rewrites imports in `features/` and `playwright.config.*`, updates `package.json` scripts, removes the `@esimplicityinc:registry=https://npm.pkg.github.com` line from `.npmrc`, and swaps the dependency. The `.npmrc` line is left in place if the file also sets a GitHub Packages token, since the project probably uses other `@esimplicityinc` packages.

### Changed

- **`init` no longer writes an `.npmrc`.**
- **The publish workflow publishes to npmjs.com via npm trusted publishing (OIDC)** instead of to GitHub Packages.

### Fixed

- **`upgrade --migrate` now keeps custom imports in `steps.ts`.** Since 0.4.0 it searched for the pre-rename package name, so it never found the import block to insert them after.

## [0.5.0] - 2026-10-02

### Breaking Changes

- **There's now a single package.** `@esimplicityinc/create-katalyst-xspec` has been merged into `@esimplicityinc/katalyst-xspec`, which ships one `katalyst-xspec` command:

  | Before | Now |
  |---|---|
  | `npx @esimplicityinc/create-katalyst-xspec` | `npx @esimplicityinc/katalyst-xspec init` |
  | `upgrade-katalyst-xspec` | `katalyst-xspec upgrade` |
  | `generate-step-stubs` | `katalyst-xspec stubs` |

  Flags are unchanged. `@esimplicityinc/create-katalyst-xspec@0.4.0` stays on GitHub Packages but won't be updated.
- **Action required:** in an existing project, run `npx katalyst-xspec upgrade`. Besides upgrading, it rewrites `package.json` scripts that call the old command names (including `generate-step-stubs`). Projects still on `@esimplicity/stack-tests` are migrated in the same run. If you have `@esimplicityinc/create-katalyst-xspec` as a dependency, remove it.

### Added

- **`katalyst-xspec init <dir>`** accepts the target directory as a positional argument, as well as `--dir <dir>`.
- **`katalyst-xspec --help` and `--version`.**

### Removed

- **The duplicate root `skills/` directory.** The skills bundled in the package (`katalyst-xspec/skills/`) are the only copy, and they were already the more up-to-date one.

## [0.4.0] - 2026-10-02

### Breaking Changes

- **Renamed the project to `katalyst-xspec`.** The repository is now `esimplicityinc/katalyst-xspec` (GitHub redirects the old URL).
  - `@esimplicity/stack-tests` → **`@esimplicityinc/katalyst-xspec`** (`/steps` subpath unchanged)
  - `@esimplicity/create-stack-tests` → **`@esimplicityinc/create-katalyst-xspec`**
  - CLI binaries `create-stack-tests` / `upgrade-stack-tests` → **`create-katalyst-xspec`** / **`upgrade-katalyst-xspec`** (`generate-step-stubs` is unchanged)
- **Packages are now published to GitHub Packages, not npmjs.com.** Consumers need `@esimplicityinc:registry=https://npm.pkg.github.com` in `.npmrc` and a GitHub token with `read:packages`. The old `@esimplicity/stack-tests` releases stay on npmjs.com but won't receive updates.
- **Action required:** in an existing project, run `npx -p @esimplicityinc/create-katalyst-xspec upgrade-katalyst-xspec`. It detects `@esimplicity/stack-tests`, adds the `.npmrc` scope line, rewrites imports in `features/` and `playwright.config.*`, and swaps the dependency. `--migrate` does the same as part of a full scaffolding migration. To migrate by hand, do those three steps yourself.

### Changed

- **The IPv4 opt-out env var is now `KATALYST_XSPEC_FORCE_IPV4`.** `STACK_TESTS_FORCE_IPV4` is still honoured.
- **`create-katalyst-xspec` scaffolds an `.npmrc`** that maps the `@esimplicityinc` scope to GitHub Packages, and the default output directory is now `katalyst-xspec/`.
- **The publish workflow publishes to GitHub Packages with the built-in `GITHUB_TOKEN`** and runs the test suite before publishing. No npm secrets are needed.

## [0.3.1] - 2026-10-02

### Added

- **`When I set the file input {string} to a file named {string} with content {string}`** UI step. Attaches an in-memory file to an `<input type="file">`, so uploads can be tested without a fixture on disk. The content type is inferred from the extension (`.csv`, `.json`, `.xml`, otherwise `text/plain`).
- **`Then the element {string} should have attribute {string} equal to {string}`** UI step. An auto-retrying assertion on any attribute, such as `data-state`, `aria-*` or `href`.
- **`resolveApiRequestTarget(baseURL, env?)`** exported helper. This is the logic behind the IPv4 fix below.

### Fixed

- **API requests to `http://*.localhost` targets no longer fail with `ECONNRESET` on macOS.** macOS resolves `*.localhost` to `::1` first, but local kind/k3d ingresses usually bind IPv4 only. The `apiRequest` fixture now connects to `127.0.0.1` and sends the original host as the `Host` header, so host-based ingress routing still matches. This only applies to plain `http:` `*.localhost` hosts. Bare `localhost` is left alone because dev servers often bind `::1` only, and so is `https:`, where TLS SNI and certificate checks need the real hostname. Set `STACK_TESTS_FORCE_IPV4=false` to opt out.
- **`exports` map now lists the `types` condition first and adds a `default` fallback** for `.` and `./steps`. TypeScript only honours `types` when it comes before the conditions it matches, and resolvers that don't match `import` now resolve too.

## [0.3.0] - 2026-06-13

### Breaking Changes

- **`createBddTest()` returns `{ test, expect }`, not a bare test function.** The documented and scaffolded usage has always been the destructured form, but the function returned the bare Playwright test. Destructuring `.test`/`.expect` off a function yields `undefined`, so `registerXSteps(test)` registered steps on `undefined`/the base test. playwright-bdd's codegen then imported the **base** test (without `api`/`ui`/`world` fixtures) and runtime failed with `Test has unknown parameter "ui"`/`"world"`. All four example projects and the forge `tests-bdd` bundle use the destructured form and were affected. **Action required:** in `features/steps/fixtures.ts`, change `export const test = createBddTest({ ... })` to `export const { test } = createBddTest({ ... })`. That single line is the entire migration.

- **`playwright-bdd` peer range is now `^9.1.0`, which excludes the whole v8 line.** 9.1.0 is the floor because this package declares `@playwright/test: ^1.49.0`, a caret range that resolves to Playwright 1.61.1 on a clean install, and 9.1.0 is the playwright-bdd release that added Playwright 1.61 support. **Action required:** bump `playwright-bdd` to `^9.1.0` in your project's devDependencies and re-run `npm install`. Installing this release alongside playwright-bdd v8 fails with `ERESOLVE`.

- **Node 20 is now the minimum.** `engines.node` is declared as `>=20` (previously undeclared). **Action required:** upgrade any Node 18 runners; the published CI workflow already uses Node 20.

### Changed

- **Upgraded to playwright-bdd v9.** v9 moves to `@cucumber/messages@32.3.1`, which depends only on `class-transformer` and `reflect-metadata`. This removes `uuid` from the dependency tree entirely instead of upgrading it, clearing a transitive advisory that had no fix available anywhere on the playwright-bdd v8 line.
- **JUnit reporter default test case naming is now Cucumber-compatible** (playwright-bdd v9 behavior change; it was Playwright style on v8). Restore the previous naming with `nameFormat: 'playwright'`. No package or example in this repository configures a JUnit reporter, and the scaffolder does not emit one, so nothing here is affected. Downstream projects that configure their own JUnit reporter should check what parses the XML before upgrading, since test case names will change.
- **Cucumber JSON reporter now defaults `skipAttachments` to `true`** (playwright-bdd v9 behavior change; the default was `false` on v8, so screenshots and traces were embedded). The `@esimplicity/stack-tests` library itself configures no reporters, so importing it changes nothing. **This one does reach generated projects, though:** `create-stack-tests` scaffolds `cucumberReporter('json', ...)` into `playwright.config.ts` and sets no `skipAttachments`, as does `examples/full-stack-example`. On v9 those Cucumber JSON reports stop embedding attachments. **Action required** if anything consumes attachments out of `cucumber-report/report.json`: pass `skipAttachments: false` to the `cucumberReporter('json', ...)` call in your `playwright.config.ts`. The scaffolder template is left on the new upstream default deliberately; it is not overridden here.
- **`stack-tests` now has a runnable `test` script.** The three existing suites (`fixtures`, `paths`, `workers`) previously had no runner wired up and never executed. They now run via `node --import tsx --test`, and are picked up by the root `npm test`.

### Fixed

- **`create-stack-tests` published under the correct npm scope** — the package was named `@esimplicityinc/create-stack-tests` (a scope that 404s) instead of `@esimplicity/create-stack-tests`. Corrected the scope and bumped the scaffolded `@esimplicity/stack-tests` devDependency to `^0.3.0`.

### Added

- **`resolveFeatures()`, `resolveSteps()`, `resolveBddPaths()`** path helpers for configurable per-environment feature/step locations (multi-layer repos via `FEATURES_DIR`/`CUSTOM_STEPS_DIR`).

## [0.2.3] - 2026-03-11

### Added

- **`resolveWorkers()` utility**: Smart Playwright worker resolution based on environment variables, test type, and CI detection. Replaces the manual `workers: process.env.CI ? 1 : undefined` pattern.
  - `WORKERS` env var: Set to a positive integer for explicit worker count, or `'auto'` to let Playwright decide
  - CI detection: Defaults to 1 worker when `CI` env var is truthy (overridable via `WORKERS`)
  - TUI enforcement: `resolveWorkers({ testType: 'tui' })` always returns 1 (sequential execution)
  - Configurable via `ciWorkers` and `defaultWorkers` options

- **`getCpuCount()` helper**: Returns the number of available CPU cores for diagnostics and logging.

- **`WORKERS` environment variable**: New env var for controlling Playwright worker count across all projects. Documented in scaffolded `.env.example`.

### Changed

- Updated all example project configs (`api-example`, `ui-example`, `tui-example`, `full-stack-example`) to use `resolveWorkers()`.
- Updated `create-stack-tests` scaffolder template to include `resolveWorkers()` in generated `playwright.config.ts`.
- Updated documentation to replace `workers: process.env.CI ? 1 : undefined` with `resolveWorkers()`.

## [0.2.2] - 2026-03-09

### Breaking Changes

- **No hardcoded default credentials.** Auth methods (`apiLoginAsAdmin`, `uiLoginAsAdmin`, etc.) now **skip silently** with a `console.warn` when `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` env vars are not set. Previously, the framework fell back to hardcoded credentials. **Action required:** Ensure your `.env` file sets `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_USER_USERNAME`, and `DEFAULT_USER_PASSWORD`.

- **No built-in cleanup rules.** The `DefaultCleanupAdapter` now ships with an empty `defaultRules` array. Previously, 13 application-specific rules were built in. **Action required:** Define your cleanup rules via the `CLEANUP_RULES` env var (JSON array) or pass `rules` to the `DefaultCleanupAdapter` constructor.

- **`CONTROL_TOWER_BASE_URL` / `CONTROL_TOWER_PORT` removed.** Replaced with `TARGET_BASE_URL` / `TARGET_PORT`. **Action required:** Update your `.env` files if you used these variables.

- **Default API port changed** from `4000` to `3000`. If no `API_BASE_URL` or `TARGET_BASE_URL` is set, the framework now falls back to `http://localhost:3000`.

### Added

- **`getCleanupAuth` option** on `createBddTest()`: Plug in any auth provider for cleanup operations (Keycloak, Auth0, Okta, etc.) without coupling the framework to a specific identity provider.

- **`createOidcCleanupAuth()` helper**: Exported utility for OIDC-based cleanup auth. Works with any OIDC-compliant provider via generic `OIDC_*` env vars (`OIDC_TOKEN_URL`, `OIDC_CLIENT_ID`, `OIDC_GRANT_TYPE`, etc.).

- **`CLEANUP_AUTH_TOKEN` env var**: Set a static bearer token for cleanup operations (no login flow needed).

- **Configurable UI login selectors**: `UI_LOGIN_PATH`, `UI_USERNAME_FIELD`, `UI_PASSWORD_FIELD`, `UI_LOGIN_BUTTON` env vars let consumers customize the `UniversalAuthAdapter` UI login flow without writing a custom adapter.

- **Broader ID format support** in cleanup: `isIdLike` now recognizes UUIDs, prefixed nanoid IDs, numeric IDs, MongoDB ObjectIDs, CUIDs, and ULIDs.

- **Cleanup rules support request bodies**: `CleanupRule` and `CleanupItem` now accept an optional `body` field for cleanup operations that require a JSON payload.

### Removed

- All Keycloak-specific code from core fixtures (`KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `AUTH_MODE`, `DEFAULT_ADMIN_ROLES`, `x-user-roles` header injection). Use `createOidcCleanupAuth()` with `extraHeaders` instead.
- Application-specific cleanup rules (13 rules referencing `/admin/tool/`, `/admin/llm/`, `/admin/users/`, etc.).
- Hardcoded credentials (`admin@prima.com`, `bob@bob.com`, `admin1234`, `bob1234`).

## [0.2.0] - 2026-02-01

### Added

- **Migration Mode** (`upgrade-stack-tests --migrate`): Full scaffolding migration that preserves custom files while updating templates.
  - Automatic backup of custom step files, feature files, and environment files
  - Smart merging of `steps.ts` preserving custom imports
  - Smart merging of `fixtures.ts` preserving cleanup rules
  - Smart merging of `package.json` preserving custom scripts and dependencies
  - Dry-run mode (`--dry-run`) to preview changes before applying
  - Custom backup directory support (`--backup-dir`)

- **Interactive Upgrade Mode** (`upgrade-stack-tests -i`): Guided step-by-step upgrade process with prompts for:
  - Package version upgrade
  - Scaffolding migration
  - Agent Skills update

- **Step Stub Generator** (`generate-step-stubs`): New CLI tool to generate step definition stubs for missing steps.
  - Parses bddgen output to detect undefined steps
  - Generates TypeScript stubs with proper parameter typing
  - Outputs to `features/steps/generated-stubs.ts`
  - Dry-run mode to preview generated code

- **Environment File Preservation**: `.env.example` files are now merged instead of overwritten during scaffolding.
  - Existing custom variables are preserved
  - New template variables are appended with a comment header
  - `.env` files are never overwritten

- **Update Notification Scripts**: New npm scripts in scaffolded projects:
  - `npm run check-updates` - Check for framework updates
  - `npm run upgrade` - Upgrade to latest version
  - `npm run upgrade:migrate` - Full scaffolding migration
  - `npm run gen:stubs` - Generate step stubs

### Changed

- **Package Manager Detection**: Scaffolder now displays detected package manager during scaffolding.
- **TypeScript Import Fix**: Generated `steps.ts` now uses correct `.js` extension for imports (`./fixtures.js`), fixing NodeNext module resolution errors.
- **Version Bump**: Both `@esimplicity/stack-tests` and `@esimplicityinc/create-stack-tests` bumped to 0.2.0.

### Documentation

- New [Upgrading Guide](./docs/guides/upgrading.md) covering all upgrade and migration features
- Updated Quick Start with new commands
- Updated Troubleshooting guide with upgrade-related issues
- Updated Custom Steps guide with step stub generator workflow
- Added "Managing Work-in-Progress Features" section to [Tag System](./docs/concepts/tag-system.md) documenting `@wip`/`@ready` patterns for incremental development

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

# Upgrading and Migration

This guide covers upgrading @esimplicitylabs/katalyst-xspec and migrating existing scaffolded projects.

## Checking for Updates

From your katalyst-xspec directory:

```bash
# Check if updates are available
npm run check-updates

# Or directly
npx katalyst-xspec upgrade --check
```

Output:
```
[katalyst-xspec upgrade] Detected package manager: npm
[katalyst-xspec upgrade] Installed: @esimplicitylabs/katalyst-xspec@0.1.8
[katalyst-xspec upgrade] Latest available: 0.2.0
[katalyst-xspec upgrade] Update available: 0.1.8 -> 0.2.0
[katalyst-xspec upgrade] Run without --check to upgrade.
```

## Simple Package Upgrade

To upgrade just the `@esimplicitylabs/katalyst-xspec` package:

```bash
# Upgrade to latest
npm run upgrade

# Or directly
npx katalyst-xspec upgrade

# Or specify a version
npx katalyst-xspec upgrade -v 0.2.0
```

This updates the package in `node_modules` but doesn't touch your scaffolding files.

## Full Scaffolding Migration

When significant changes are made to scaffolding templates (like new step registrations, updated configurations), use the migration feature:

```bash
# Preview what will change (dry run)
npx katalyst-xspec upgrade --migrate --dry-run

# Perform the migration
npx katalyst-xspec upgrade --migrate
```

### What Migration Does

1. **Backs up your custom files:**
   - Custom step files (`*-steps.ts`)
   - Feature files
   - Environment files (`.env`, `.env.example`)
   - Original `steps.ts` and `fixtures.ts`

2. **Merges configurations (preserving your customizations):**
   - `package.json` - Updates dependencies, keeps your custom scripts
   - `steps.ts` - Adds new step registrations, preserves your custom imports
   - `fixtures.ts` - Kept as is (it holds your adapter wiring); the current template is saved next to the backup as `fixtures.ts.template` so you can compare
   - `playwright.config.*` - Removes old `@api`/`@ui`/`@hybrid`/`@tui` project tag filters (0.7.0+)

3. **Leaves untouched:**
   - Your feature files
   - Your custom step files
   - Your `.env` file

### Migration Example

```bash
$ npx katalyst-xspec upgrade --migrate --dry-run

[katalyst-xspec upgrade] Starting scaffolding migration...
[katalyst-xspec upgrade] Backup directory: /tmp/katalyst-xspec-backup-1234567890

[katalyst-xspec upgrade] Phase 1: Detecting custom files...
  Custom step files found: clawmarket-steps.ts, escrow-steps.ts
  Feature files found: 47
  Custom imports in steps.ts: 2
  Custom cleanup rules: yes
  Environment files: .env, .env.example

[katalyst-xspec upgrade] Phase 2: Backing up custom files...
  Backed up 51 files
  (dry run - no files actually backed up)

[katalyst-xspec upgrade] Phase 3: Merging configurations...
  package.json: merged (preserving custom scripts/dependencies)
  steps.ts: merged (2 custom imports preserved)
  fixtures.ts: kept (template saved as /tmp/katalyst-xspec-backup-1234567890/steps/fixtures.ts.template)

[katalyst-xspec upgrade] Phase 4: Writing updated files...
  Updated 3 files
  (dry run - no files actually written)

════════════════════════════════════════════════════════════
Migration Summary
════════════════════════════════════════════════════════════

This was a dry run. No files were actually modified.
Run without --dry-run to apply changes.
```

### After Migration

After running migration:

```bash
# Review changes
git diff

# Install updated dependencies
npm install

# Regenerate tests
npm run gen

# Run tests to verify
npm test
```

## Interactive Upgrade Mode

For a guided upgrade experience:

```bash
npx katalyst-xspec upgrade --interactive
# or
npx katalyst-xspec upgrade -i
```

This walks you through:
1. Package version upgrade
2. Scaffolding migration (optional)
3. Agent Skills update (if installed)

```
═══════════════════════════════════════════════════════════
Katalyst XSpec Interactive Upgrade
═══════════════════════════════════════════════════════════

Package manager: npm
Current version: 0.1.8
Latest version:  0.2.0

? Upgrade @esimplicitylabs/katalyst-xspec from 0.1.8 to 0.2.0? (y/n) y
[katalyst-xspec upgrade] Package upgraded successfully!

? Would you like to migrate scaffolding files? (y/n) y
? Would you like to preview changes first (dry run)? (y/n) y

[Migration preview output...]

? Apply these changes? (y/n) y

[Migration applied...]

[katalyst-xspec upgrade] Interactive upgrade complete!
```

## Updating Agent Skills

If you have Agent Skills installed:

```bash
npx katalyst-xspec upgrade --update-skills
```

This updates the skill files in your agent directories (`.opencode/skills/`, `.claude/skills/`, etc.) to the latest versions.

## Backup and Recovery

Migration automatically creates backups:

```
/tmp/katalyst-xspec-backup-<timestamp>/
├── steps/
│   ├── clawmarket-steps.ts
│   ├── escrow-steps.ts
│   ├── steps.ts.original
│   └── fixtures.ts.original
├── features/
│   ├── api/
│   ├── ui/
│   └── hybrid/
├── .env
└── .env.example
```

To recover from a failed migration:

```bash
# Copy back your files
cp -r /tmp/katalyst-xspec-backup-<timestamp>/* ./

# Or restore specific files
cp /tmp/katalyst-xspec-backup-<timestamp>/steps/steps.ts.original ./features/steps/steps.ts
```

## Custom Backup Location

Specify a custom backup directory:

```bash
npx katalyst-xspec upgrade --migrate --backup-dir ./backups/pre-migration
```

## Upgrading to 0.8

0.8 adds role-based login and makes `API_BASE_URL` optional. Your existing `.env` keeps working; one behavior change may surface misconfiguration that was hidden before.

**Breaking: missing credentials now fail.** Before 0.8, a login step with no credentials set printed a warning and continued logged out. Now it fails with a message naming the variables to set, e.g. `No username for role "admin". Set AUTH_ADMIN_USERNAME in .env (DEFAULT_ADMIN_USERNAME or DEFAULT_ADMIN_EMAIL also work)…`. A UI login that stays on the login page also fails now. If scenarios start failing after the upgrade, set the credentials they need.

**Optional: rename credential variables.** `DEFAULT_ADMIN_*`, `DEFAULT_USER_*` and `NON_ADMIN_*` still work. The new names are `AUTH_<ROLE>_USERNAME` / `AUTH_<ROLE>_PASSWORD` for any role:

| Before | After |
|--------|-------|
| `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_EMAIL` | `AUTH_ADMIN_USERNAME` |
| `DEFAULT_ADMIN_PASSWORD` | `AUTH_ADMIN_PASSWORD` |
| `DEFAULT_USER_USERNAME` / `NON_ADMIN_USERNAME` | `AUTH_USER_USERNAME` |
| `DEFAULT_USER_PASSWORD` / `NON_ADMIN_PASSWORD` | `AUTH_USER_PASSWORD` |

**`API_BASE_URL` falls back to `FRONTEND_URL`.** When no API URL is set, API requests now go to the frontend URL in every project, not `http://localhost:3000`. Scenarios in `features/ui/` that mix API and UI steps now reach the app. If you relied on the old default, set `API_BASE_URL=http://localhost:3000`. Each run prints `katalyst-xspec targets: UI … | API …` so you can check.

**Custom steps that log in through the UI need `ui`.** The `auth` fixture no longer starts a browser. A custom step calling `auth.uiLoginAsAdmin(world)` or `auth.uiLoginAs(world, role)` must list `ui` in its fixtures: `async ({ auth, ui, world }) => …`. Otherwise it fails with `UI login needs the browser`.

**New steps** (old ones still work):

```gherkin
Given I am authenticated as "pm" via API
Given I am logged in as "pm"
When I log in as "pm" in UI
```

Also new: `API_AUTH_BODY`, `API_AUTH_USERNAME_FIELD`, `API_AUTH_PASSWORD_FIELD`, `API_AUTH_TOKEN_PATH`, cookie-session API login, UI fields matched by label/placeholder/`name`, `UI_LOGIN_SUCCESS_URL` / `UI_LOGIN_SUCCESS_TEXT`, and UI session reuse. Custom `AuthPort`s keep compiling; implement the optional `apiLoginAs` / `uiLoginAs` to support any role. See the [Authentication guide](./authentication.md).

Newly scaffolded projects get a `.env.example` with "Where to test" / "Who logs in" / login settings sections, and a `playwright.config.ts` that prints the targets. To do the same in an existing project (optional), set `use.baseURL` from `resolveTargets()`:

```typescript
import { resolveTargets, logTargets } from '@esimplicitylabs/katalyst-xspec';

const targets = logTargets(resolveTargets());
// in defineConfig: use: { baseURL: targets.frontendUrl, ... }
```

## Version History

### 0.8.0

- Role-based login: `AUTH_<ROLE>_*` credentials, new role steps, configurable API and UI login, UI session reuse.
- Missing or wrong credentials fail the step with a message naming what to fix.
- `API_BASE_URL` is optional and falls back to `FRONTEND_URL`; `resolveTargets()` / `logTargets()` print the targets.

See [Upgrading to 0.8](#upgrading-to-08).

### 0.7.0

- Steps are no longer scoped by type tags: any step works in any scenario, and projects select feature files by folder only.
- TUI: `Then I should see text {string}` was removed (use `Then I should see {string}` or `Then I should see {string} in the terminal`); `When I fill the form:` was renamed to `When I fill the TUI form:`.
- `init` scaffolds `features/api/example.feature` and `features/ui/example.feature`, which pass with no `.env`.

**Migration note:** Run `npx katalyst-xspec upgrade --migrate` to drop the old tag filters from `playwright.config.*`. Old `@api`/`@ui` tags left in feature files are ignored and can be deleted.

### 0.2.3

New features:
- `resolveWorkers()` utility for smart Playwright worker configuration
- `getCpuCount()` helper for CPU core detection
- `WORKERS` env var support for explicit worker count override
- TUI tests auto-forced to sequential execution via `resolveWorkers({ testType: 'tui' })`

**Migration note:** Replace `workers: process.env.CI ? 1 : undefined` in your `playwright.config.ts` with:
```typescript
import { resolveWorkers } from '@esimplicitylabs/katalyst-xspec';

// In defineConfig:
workers: resolveWorkers(),
```

### 0.2.0

New features:
- Migration mode (`--migrate`)
- Interactive upgrade (`--interactive`)
- Step stub generator (`npm run gen:stubs`)
- Environment file merging
- Cleanup rules preservation
- Update notifications (`npm run check-updates`)

### 0.1.x

Initial releases with:
- Basic scaffolding
- Step registrations
- Agent Skills support

## Troubleshooting

### "Package is not installed"

You need to run upgrade from a scaffolded katalyst-xspec directory that has `node_modules` installed:

```bash
cd katalyst-xspec
npm install
npx katalyst-xspec upgrade
```

### Migration conflicts

If you've heavily customized `steps.ts` or `fixtures.ts`, the merge may not capture all changes. Review the diff carefully:

```bash
# Check what changed
git diff features/steps/steps.ts

# If needed, manually edit to add back customizations
```

### Custom imports not detected

The migration looks for imports like:
- `import './my-steps.js'`
- `import './custom-steps'`

If your imports don't match this pattern, manually add them after migration.

## Related Topics

- [Installation](../getting-started/installation.md)
- [Custom Steps](./custom-steps.md)
- [Agent Skills](./agent-skills.md)

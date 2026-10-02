# Upgrading and Migration

This guide covers upgrading @esimplicityinc/katalyst-xspec and migrating existing scaffolded projects.

## Checking for Updates

From your katalyst-xspec directory:

```bash
# Check if updates are available
npm run check-updates

# Or directly
npx upgrade-katalyst-xspec --check
```

Output:
```
[upgrade-katalyst-xspec] Detected package manager: npm
[upgrade-katalyst-xspec] Installed: @esimplicityinc/katalyst-xspec@0.1.8
[upgrade-katalyst-xspec] Latest available: 0.2.0
[upgrade-katalyst-xspec] Update available: 0.1.8 -> 0.2.0
[upgrade-katalyst-xspec] Run without --check to upgrade.
```

## Simple Package Upgrade

To upgrade just the `@esimplicityinc/katalyst-xspec` package:

```bash
# Upgrade to latest
npm run upgrade

# Or directly
npx upgrade-katalyst-xspec

# Or specify a version
npx upgrade-katalyst-xspec -v 0.2.0
```

This updates the package in `node_modules` but doesn't touch your scaffolding files.

## Full Scaffolding Migration

When significant changes are made to scaffolding templates (like new step registrations, updated configurations), use the migration feature:

```bash
# Preview what will change (dry run)
npx upgrade-katalyst-xspec --migrate --dry-run

# Perform the migration
npx upgrade-katalyst-xspec --migrate
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
   - `fixtures.ts` - Updates template, preserves your cleanup rules

3. **Leaves untouched:**
   - Your feature files
   - Your custom step files
   - Your `.env` file

### Migration Example

```bash
$ npx upgrade-katalyst-xspec --migrate --dry-run

[upgrade-katalyst-xspec] Starting scaffolding migration...
[upgrade-katalyst-xspec] Backup directory: /tmp/katalyst-xspec-backup-1234567890

[upgrade-katalyst-xspec] Phase 1: Detecting custom files...
  Custom step files found: clawmarket-steps.ts, escrow-steps.ts
  Feature files found: 47
  Custom imports in steps.ts: 2
  Custom cleanup rules: yes
  Environment files: .env, .env.example

[upgrade-katalyst-xspec] Phase 2: Backing up custom files...
  Backed up 51 files
  (dry run - no files actually backed up)

[upgrade-katalyst-xspec] Phase 3: Merging configurations...
  package.json: merged (preserving custom scripts/dependencies)
  steps.ts: merged (2 custom imports preserved)
  fixtures.ts: merged (cleanup rules preserved)

[upgrade-katalyst-xspec] Phase 4: Writing updated files...
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
npx upgrade-katalyst-xspec --interactive
# or
npx upgrade-katalyst-xspec -i
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

? Upgrade @esimplicityinc/katalyst-xspec from 0.1.8 to 0.2.0? (y/n) y
[upgrade-katalyst-xspec] Package upgraded successfully!

? Would you like to migrate scaffolding files? (y/n) y
? Would you like to preview changes first (dry run)? (y/n) y

[Migration preview output...]

? Apply these changes? (y/n) y

[Migration applied...]

[upgrade-katalyst-xspec] Interactive upgrade complete!
```

## Updating Agent Skills

If you have Agent Skills installed:

```bash
npx upgrade-katalyst-xspec --update-skills
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
npx upgrade-katalyst-xspec --migrate --backup-dir ./backups/pre-migration
```

## Version History

### 0.2.3

New features:
- `resolveWorkers()` utility for smart Playwright worker configuration
- `getCpuCount()` helper for CPU core detection
- `WORKERS` env var support for explicit worker count override
- TUI tests auto-forced to sequential execution via `resolveWorkers({ testType: 'tui' })`

**Migration note:** Replace `workers: process.env.CI ? 1 : undefined` in your `playwright.config.ts` with:
```typescript
import { resolveWorkers } from '@esimplicityinc/katalyst-xspec';

// In defineConfig:
workers: resolveWorkers(),
```

### 0.2.0 (Current)

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
npx upgrade-katalyst-xspec
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

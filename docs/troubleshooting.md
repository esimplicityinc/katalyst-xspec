# Troubleshooting

Common issues and solutions when working with @esimplicitylabs/katalyst-xspec.

## Installation Issues

### "Cannot find module '@esimplicitylabs/katalyst-xspec'"

The package isn't installed or isn't resolving correctly.

**Solution:**
```bash
npm install -D @esimplicitylabs/katalyst-xspec
```

If you're in a monorepo, ensure you're in the correct workspace directory.

---

### "Executable doesn't exist" when running UI tests

Playwright's browser hasn't been downloaded yet.

**Solution:**
```bash
npx playwright install chromium
```

This is a one-time step after `npm install`.

---

### "tui-tester is not installed"

TUI testing is optional and requires an additional package.

**Solution:**
```bash
npm install -D tui-tester
```

Also ensure tmux is installed on your system:
```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# Verify
tmux -V
```

---

### TypeScript errors about module resolution

Your `tsconfig.json` may need updating.

**Solution:**
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node", "@playwright/test"]
  }
}
```

---

## Test Execution Issues

### "No tests found" or empty test run

You likely forgot to generate tests from feature files.

**Solution:**
```bash
# REQUIRED before running tests
npm run gen

# Then run tests
npm test
```

> **Important:** Run `npm run gen` every time you add or modify `.feature` files.

---

### Step not found / undefined step

A step in your feature file doesn't match any registered step definition.

**Common causes:**
1. Missing step registration in fixtures
2. Typo in step text
3. Using a step that was renamed or removed in 0.7.0 (TUI: `I fill the form:` is now `I fill the TUI form:`; `Then I should see text {string}` is UI-only, use `Then I should see {string}` for TUI)

**Solution:**

1. Check your `fixtures.ts` includes the step registration:
```typescript
import { registerApiSteps, registerUiSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerApiSteps(test);
registerUiSteps(test);
```

2. Check step spelling matches exactly (case-sensitive)

3. Check the step exists in the [Step Reference](./reference/steps/quick-reference.md). Scenarios don't need any tag; every registered step works in any scenario.

4. **Generate step stubs** for missing steps:
```bash
npm run gen:stubs
```
This creates `features/steps/generated-stubs.ts` with stub implementations for all missing steps. Then add the import to your `steps.ts`:
```typescript
import './generated-stubs.js';
```

5. **Use `@wip` tag** to exclude incomplete features from generation:
```gherkin
@wip
Feature: Payment Processing
  # Excluded until steps are implemented
```

Configure your projects to exclude `@wip`:
```typescript
tags: tagsForProject({
  defaultExcludes: 'not @Skip and not @ignore and not @wip',
  extraTags: resolveExtraTags(process.env.TEST_TAGS),
}),
```

See [Managing Work-in-Progress Features](./concepts/tag-system.md#managing-work-in-progress-features) for details.

---

### A scenario isn't running

Since 0.7.0, steps are untagged and an untagged scenario is no longer skipped. If a scenario seems to be missing:

1. Check the feature file is in the folder its project reads (e.g. `features/api/**/*.feature` for the `api` project).
2. Check it isn't tagged `@Skip`/`@ignore`, and that `TEST_TAGS` isn't filtering it out.
3. If `playwright.config.*` still has filters like `tags: '@ui'` from an older version, run:
   ```bash
   npx katalyst-xspec upgrade --migrate
   ```

---

### "TUI tester not started"

You're using TUI steps without initializing the TUI adapter.

**Solution:**

Ensure `registerTuiSteps(test)` is enabled in `steps.ts` and your fixtures configure TUI:

```typescript
createBddTest({
  createTui: () => new TuiTesterAdapter({ 
    cols: 80, 
    rows: 24 
  }),
});
```

---

### Cleanup not running

Cleanup is registered but resources aren't being deleted.

**Causes:**
1. Cleanup errors are logged but don't fail tests
2. Auth token expired during cleanup

**Solution:**

Check test output for cleanup warnings. Enable verbose logging:

```bash
DEBUG=cleanup npm test
```

Ensure cleanup auth is configured. Set the admin credentials in `.env`:

```bash
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=changeme
API_AUTH_LOGIN_PATH=/auth/login
```

Or use a static token:

```bash
CLEANUP_AUTH_TOKEN=your-admin-token-here
```

For OIDC providers (Keycloak, Auth0, etc.), use the OIDC helper in your fixtures:

```typescript
import { createBddTest, createOidcCleanupAuth } from '@esimplicitylabs/katalyst-xspec';

export const test = createBddTest({
  getCleanupAuth: createOidcCleanupAuth({
    grantType: 'password',
  }),
});
```

---

### Tests running slowly in CI

By default, `resolveWorkers()` uses 1 worker in CI for stability. If your CI environment has multiple cores and your tests are isolated, increase the worker count:

```bash
# In your CI config
WORKERS=4 npm test
```

Or configure in your `playwright.config.ts`:

```typescript
workers: resolveWorkers({ ciWorkers: 4 }),
```

---

### TUI tests failing with parallel execution

TUI tests require sequential execution (1 worker) because they use tmux sessions. Use `resolveWorkers({ testType: 'tui' })` to enforce this:

```typescript
// playwright.config.ts
projects: [
  { ...tuiBdd, workers: resolveWorkers({ testType: 'tui' }) },
],
```

---

## Variable and State Issues

### Variable interpolation not working

Variables use `{varName}` syntax. Common issues:

**1. Variable not stored:**
```gherkin
# WRONG: Using variable before storing it
When I GET "/users/{userId}"

# RIGHT: Store first, then use
When I GET "/users/1"
And I store the value at "id" as "userId"
When I GET "/users/{userId}/posts"
```

**2. Typo in variable name:**
```gherkin
# Stored as "userId"
And I store the value at "id" as "userId"

# WRONG: Different name
When I GET "/users/{user_id}"

# RIGHT: Same name
When I GET "/users/{userId}"
```

---

### Response data from previous request overwritten

`world.lastJson` only holds the most recent response.

**Solution:**

Store values immediately after each request:

```gherkin
# WRONG
When I GET "/users/1"
When I GET "/posts/1"
Then the value at "name" should equal "Leanne Graham"  # Fails - lastJson is the post

# RIGHT
When I GET "/users/1"
And I store the value at "name" as "userName"
When I GET "/posts/1"
Then the variable "userName" should equal "Leanne Graham"
```

---

### All variables are strings

The `world.vars` store only holds strings.

**Impact:**

Numeric comparisons may fail if not handled correctly.

**Solution:**

The framework handles type coercion in assertions. If you need explicit types in custom steps:

```typescript
const count = parseInt(world.vars['count'], 10);
```

---

## Configuration Issues

### Tests hitting wrong environment

Multiple environment variables control base URLs.

**Priority order:**
1. `API_BASE_URL` - Explicit API URL
2. `FRONTEND_URL` - UI testing URL
3. Playwright config `baseURL`

**Solution:**

Create environment-specific `.env` files:

```bash
# .env.development
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# .env.staging
API_BASE_URL=https://api.staging.example.com
FRONTEND_URL=https://staging.example.com
```

Load with:
```bash
NODE_ENV=staging npm test
```

---

### Tags not filtering correctly

Tags are optional and only used for your own grouping. To run one area, use `--project api` / `--project ui` (or `TEST_TAGS`). Tag expressions have specific syntax.

**Examples:**
```bash
# Single tag
npx playwright test --grep "@smoke"

# AND
npx playwright test --grep "@smoke and @critical"

# OR
npx playwright test --grep "@smoke or @critical"

# NOT
npx playwright test --grep "not @slow"

# Complex
npx playwright test --grep "@regression and (@smoke or @critical) and not @external"
```

---

## Debugging

### How to pause test execution

Use the debug step:
```gherkin
When I pause for debugging
```

Or run with Playwright debugger:
```bash
PWDEBUG=1 npm test
```

---

### How to see what's on screen

```gherkin
# Log current URL
Then I log the current URL

# Print visible text
Then I print visible text

# Save screenshot
Then I save a screenshot as "debug.png"

# Log browser console
Then I print browser console messages
```

---

### How to inspect network requests

Run with trace enabled:
```bash
npx playwright test --trace on
```

View trace:
```bash
npx playwright show-trace trace.zip
```

---

## Upgrade Issues

### "Old version of scaffolding"

After upgrading `@esimplicitylabs/katalyst-xspec`, your scaffolding files may be outdated.

**Solution:**

Use the migration feature to update scaffolding while preserving your customizations:

```bash
# Preview changes first
npx katalyst-xspec upgrade --migrate --dry-run

# Apply migration
npx katalyst-xspec upgrade --migrate
```

See [Upgrading Guide](./guides/upgrading.md) for details.

---

### Custom files lost after update

If you ran the scaffolder again and lost custom files:

1. Check the backup directory (shown during migration)
2. Restore from backup:
```bash
cp /tmp/katalyst-xspec-backup-<timestamp>/steps/my-steps.ts ./features/steps/
```

**Prevention:** Always use `--migrate` instead of re-running the scaffolder:
```bash
# WRONG - overwrites custom files
npx @esimplicitylabs/katalyst-xspec init --force

# RIGHT - preserves custom files  
npx katalyst-xspec upgrade --migrate
```

---

## Getting Help

If your issue isn't covered here:

1. Check the [Step Reference](./reference/steps/quick-reference.md) for correct step syntax
2. Review [Architecture](./concepts/architecture.md) to understand data flow
3. Enable debug logging: `DEBUG=* npm test`
4. Open an issue with:
   - Feature file snippet
   - Error message
   - Node/npm versions
   - Framework version

---

## Related Topics

- [Installation](./getting-started/installation.md)
- [Quick Start](./getting-started/quick-start.md)
- [Upgrading](./guides/upgrading.md)
- [Tags](./concepts/tag-system.md)
- [CI/CD Guide](./guides/ci-cd.md)

# Troubleshooting

Common issues and solutions when working with @esimplicity/stack-tests.

## Installation Issues

### "Cannot find module '@esimplicity/stack-tests'"

The package isn't installed or isn't resolving correctly.

**Solution:**
```bash
npm install -D @esimplicity/stack-tests
```

If you're in a monorepo, ensure you're in the correct workspace directory.

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
3. Wrong tag on scenario

**Solution:**

1. Check your `fixtures.ts` includes the step registration:
```typescript
import { registerApiSteps, registerUiSteps } from '@esimplicity/stack-tests/steps';

registerApiSteps(test);
registerUiSteps(test);
```

2. Check step spelling matches exactly (case-sensitive)

3. Ensure your scenario has the correct tag (`@api`, `@ui`, `@tui`, `@hybrid`)

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
@api @wip
Feature: Payment Processing
  # Excluded until steps are implemented
```

Configure your project to exclude `@wip`:
```typescript
tags: '@api and not @wip'
```

See [Managing Work-in-Progress Features](./concepts/tag-system.md#managing-work-in-progress-features) for details.

---

### Steps work in one scenario but not another

Steps are tag-scoped. An `@api` step won't run in a `@ui`-only scenario.

**Solution:**

Check the step's tag requirement in the [Step Reference](./reference/steps/).

For steps that work across test types, use `@hybrid` tag on your scenario.

---

### "TUI tester not started"

You're using TUI steps without initializing the TUI adapter.

**Solution:**

Ensure your scenario has the `@tui` tag and your fixtures configure TUI:

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

Ensure cleanup auth is configured:

```typescript
createBddTest({
  cleanupAuthPath: '/auth/login',
  cleanupAuthBody: { email: 'admin@test.com', password: 'secret' },
});
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
API_BASE_URL=http://localhost:4000
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

Tag expressions have specific syntax.

**Examples:**
```bash
# Single tag
npx playwright test --grep "@api"

# AND
npx playwright test --grep "@api and @smoke"

# OR
npx playwright test --grep "@smoke or @critical"

# NOT
npx playwright test --grep "not @slow"

# Complex
npx playwright test --grep "@api and (@smoke or @critical) and not @external"
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

After upgrading `@esimplicity/stack-tests`, your scaffolding files may be outdated.

**Solution:**

Use the migration feature to update scaffolding while preserving your customizations:

```bash
# Preview changes first
npx upgrade-stack-tests --migrate --dry-run

# Apply migration
npx upgrade-stack-tests --migrate
```

See [Upgrading Guide](./guides/upgrading.md) for details.

---

### Custom files lost after update

If you ran the scaffolder again and lost custom files:

1. Check the backup directory (shown during migration)
2. Restore from backup:
```bash
cp /tmp/stack-tests-backup-<timestamp>/steps/my-steps.ts ./features/steps/
```

**Prevention:** Always use `--migrate` instead of re-running the scaffolder:
```bash
# WRONG - overwrites custom files
npx @esimplicity/create-stack-tests --force

# RIGHT - preserves custom files  
npx upgrade-stack-tests --migrate
```

---

## Getting Help

If your issue isn't covered here:

1. Check the [Step Reference](./reference/steps/) for correct step syntax
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
- [Tag System](./concepts/tag-system.md)
- [CI/CD Guide](./guides/ci-cd.md)

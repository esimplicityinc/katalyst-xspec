---
name: katalyst-bdd-troubleshooting
description: Debug and troubleshoot Katalyst BDD tests. Use when tests fail, steps are not recognized, authentication doesn't work, cleanup isn't running, elements can't be found, or you need debugging techniques like screenshots, pausing, and logging. Triggers on test errors, "no tests found", "step not defined", "debug", "test failing".
---

# Katalyst BDD Troubleshooting Guide

This skill helps diagnose and fix common issues with the Katalyst BDD testing framework.

## Quick Diagnosis

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| "No tests found" | Forgot to generate | Run `npm run gen` (or just `npm test`) |
| "Executable doesn't exist" | Browser not downloaded | Run `npx playwright install chromium` |
| Step is undefined | Typo, renamed step, or not registered | Check exact wording in the step reference |
| Scenario never runs | Feature outside a project's folder, `@Skip`, or old tag filter | See Issue 2b |
| Auth fails (401/403) | Bad credentials | Check `.env` variables |
| Element not found | Selector wrong or timing | Add waits or use debugging |
| Cleanup not running | Not registered | Add `Given I register cleanup DELETE...` |
| Variable undefined | Typo or not set | Check variable names match exactly |

## Issue 1: "No Tests Found"

**Error:**
```
Error: No tests found
```

**Cause:** Feature files haven't been converted to Playwright tests.

**Solution:**
```bash
# ALWAYS run this after creating/modifying feature files
npm run gen

# Then run tests
npm test
```

**Prevention:** `npm test` already runs `bddgen && playwright test`. If you call `npx playwright test` directly, run `npm run gen` first.

## Issue 2: Step Not Defined

**Error:**
```
Step "When I click the button Submit" is not defined
```

**Possible Causes:**

### 1. Renamed or Removed Step (0.7.0)
Steps are untagged and work in any scenario, so a tag is never the cause. Check for these 0.7.0 changes:

- TUI `When I fill the form:` is now `When I fill the TUI form:` (UI keeps `I fill the form:`).
- TUI `Then I should see text {string}` was removed; use `Then I should see {string}` or `Then I should see {string} in the terminal`.

### 2. Typo in Step
Steps must match exactly. Check:
- Quotation marks around strings
- Exact wording
- Correct parameter format

**Common mistakes:**
```gherkin
# Wrong - missing quotes
When I click the button Submit

# Right
When I click the button "Submit"

# Wrong - wrong step wording
When I click on button "Submit"

# Right
When I click the button "Submit"
```

### 3. Steps Not Registered
Ensure your `steps.ts` registers the needed steps:

```typescript
import { test } from './fixtures';
import { registerAllSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerAllSteps(test);  // Registers all step types

export { test };
```

## Issue 2b: Scenario Never Runs

Untagged scenarios are not skipped. If a scenario is missing:

1. Check the feature file is in the folder its project reads (e.g. `features/ui/**/*.feature` for the `ui` project).
2. Check it isn't tagged `@Skip`/`@ignore`, and that `TEST_TAGS` isn't filtering it out.
3. If `playwright.config.*` still has old filters like `tags: '@ui'` (pre-0.7), run `npx katalyst-xspec upgrade --migrate`.

Old `@api`/`@ui` tags left in feature files are harmless.

## Issue 3: Authentication Failures

### Login step fails

Role login steps (`Given I am authenticated as "pm" via API`, `Given I am logged in as "pm"`, `When I log in as "pm" in UI`, and the older admin/user steps) read `AUTH_<ROLE>_USERNAME` / `AUTH_<ROLE>_PASSWORD` (role upper-cased, spaces/dashes become `_`). Since 0.8, missing credentials **fail the step** with a message naming the variables; they no longer warn and continue logged out. Match the error message:

| Message | Fix |
|---------|-----|
| `No username for role "x"` | Set `AUTH_X_USERNAME` / `AUTH_X_PASSWORD` (check the role spelling) |
| `API login as "x" failed: POST /auth/login returned 401` | Wrong credentials, or wrong `API_AUTH_BODY` (`form`/`json`) / `API_AUTH_USERNAME_FIELD` / `API_AUTH_PASSWORD_FIELD`; the message includes the response body |
| `returned 404` | Wrong `API_AUTH_LOGIN_PATH`, or the API base URL is wrong; check the `katalyst-xspec targets:` line printed at the start of the run |
| `returned 200 but no token found` | Set `API_AUTH_TOKEN_PATH` to where the token is (e.g. `data.jwt`) |
| `No username field "Username" on /login` | Set `UI_USERNAME_FIELD` to the field's label, placeholder or `name`, or fix `UI_LOGIN_PATH` |
| `UI login as "x" stayed on /login` | Wrong credentials, or the app doesn't change URL after login: set `UI_LOGIN_SUCCESS_TEXT` (or `UI_LOGIN_SUCCESS_URL`) |
| Logged out in a later scenario | A previous scenario ended the shared session: use `When I log in as "x" in UI` there, or `UI_SESSION_REUSE=false` |
| `UI login needs the browser` | A custom step called `auth.uiLoginAs` without the `ui` fixture: add `ui` to its parameters (`async ({ auth, ui, world }) => ...`) |

**Typical `.env`:**
```bash
AUTH_ADMIN_USERNAME=admin@example.com
AUTH_ADMIN_PASSWORD=changeme
# Older names still work for admin/user: DEFAULT_ADMIN_*, DEFAULT_USER_*, NON_ADMIN_*

# API login (defaults shown)
# API_AUTH_LOGIN_PATH=/auth/login
# API_AUTH_BODY=form
# API_AUTH_TOKEN_PATH=access_token
```

Full settings: docs/guides/authentication.md.

### UI Auth Fails

For `Given I am authenticated in UI as "admin"` (header-based, not `I am logged in as`):
- This uses fetch intercept, not actual login
- Ensure your app accepts the intercepted auth headers
- Check the auth adapter configuration

### Token Issues

```gherkin
# Store and reuse token
When I POST "/auth/login" with JSON body:
  """
  { "email": "user@example.com", "password": "secret" }
  """
Then the response status should be 200
And I store the value at "token" as "authToken"

# Debug: Print the token
Then the variable "authToken" should equal "expected-format"

# Use the token
Given I set bearer token from variable "authToken"
```

## Issue 4: Element Not Found

**Error:**
```
Error: Timed out waiting for element
```

### Solution 1: Add Explicit Wait
```gherkin
Given I navigate to "/page"
Then I wait "2" seconds  # Wait for dynamic content
Then I should see text "Expected"
```

### Solution 2: Wait for Page Load
```gherkin
Given I navigate to "/page"
Then I wait for the page to load
Then I should see text "Expected"
```

### Solution 3: Use Debugging
```gherkin
Given I navigate to "/page"
When I pause for debugging  # Opens Playwright Inspector
# Now you can inspect the page manually
```

### Solution 4: Take Screenshot
```gherkin
Given I navigate to "/page"
When I save a screenshot as "debug-page"
# Check the screenshot to see what's visible
```

### Solution 5: Print Page Content
```gherkin
Given I navigate to "/page"
Then I print visible text  # See all text on page
Then I log the current URL  # Verify correct page
```

### Solution 6: Check Selector
For CSS selectors:
```gherkin
# Try different selectors
When I click the element "#submit-btn"
When I click the element ".submit-button"
When I click the element "[data-testid='submit']"
```

For text-based:
```gherkin
# Exact text match
When I click the button "Submit"

# Contains text
When I "click" the "button" element that contains "Submit"
```

## Issue 5: Variable Not Interpolated

**Symptom:** `{varName}` appears literally instead of being replaced.

### Check 1: Variable Was Set
```gherkin
# Make sure you set it first
Given I set variable "userId" to "123"

# Or store from response
And I store the value at "id" as "userId"

# Then use it
When I GET "/users/{userId}"
```

### Check 2: Correct Syntax
```gherkin
# Right - curly braces
When I GET "/users/{userId}"

# Wrong - other syntax
When I GET "/users/$userId"
When I GET "/users/{{userId}}"
When I GET "/users/[userId]"
```

### Check 3: Variable Name Matches
Variables are case-sensitive:
```gherkin
Given I set variable "userId" to "123"

# Right
When I GET "/users/{userId}"

# Wrong - case mismatch
When I GET "/users/{UserId}"
When I GET "/users/{USERID}"
```

## Issue 6: Cleanup Not Running

### Check 1: Registration Syntax
```gherkin
# After creating a resource
When I POST "/users" with JSON body:
  """
  { "email": "test@test.com" }
  """
Then the response status should be 201
And I store the value at "id" as "userId"

# MUST register cleanup with the ID
Given I register cleanup DELETE "/users/{userId}"
```

### Check 2: Cleanup Not Disabled
```gherkin
# This disables all cleanup for the scenario
Given I disable cleanup

# Remove this line if you want cleanup to run
```

### Check 3: API Base URL Set
Cleanup uses the API base URL (`API_BASE_URL`, or `FRONTEND_URL` when it isn't set). Check the `katalyst-xspec targets: UI … | API …` line at the start of the run:
```bash
# In .env (only if the API is on another origin than FRONTEND_URL)
API_BASE_URL=http://localhost:3000
```

## Issue 7: JSON Body Errors

### Invalid JSON
```gherkin
# Wrong - trailing comma
When I POST "/users" with JSON body:
  """
  {
    "name": "Test",  # <-- trailing comma not allowed
  }
  """

# Right
When I POST "/users" with JSON body:
  """
  {
    "name": "Test"
  }
  """
```

### Variable in JSON
```gherkin
# Variables work inside JSON
Given I generate a UUID and store as "runId"
When I POST "/users" with JSON body:
  """
  {
    "email": "test-{runId}@example.com"
  }
  """
```

## Issue 8: TUI Tests Failing

### tmux Not Installed
```bash
# Install tmux (macOS)
brew install tmux

# Install tmux (Ubuntu)
sudo apt-get install tmux
```

### TUI Not Configured
In `fixtures.ts`:
```typescript
import { TuiTesterAdapter } from '@esimplicitylabs/katalyst-xspec';

export const test = createBddTest({
  createTui: () => new TuiTesterAdapter({
    command: ['node', 'dist/cli.js'],  // Your CLI command
    size: { cols: 100, rows: 30 },
  }),
});
```

### Application Not Starting
```gherkin
# Add wait for ready state
Given I start the TUI application
When I wait for "Ready" for 10 seconds  # Increase timeout
Then I should see "Menu"
```

## Debugging Techniques

### 1. Pause and Inspect
```gherkin
When I pause for debugging
# Opens Playwright Inspector - click around, inspect elements
```

### 2. Screenshots
```gherkin
When I save a screenshot as "before-click"
When I click the button "Submit"
When I save a screenshot as "after-click"
```

### 3. Full Page Screenshot
```gherkin
When I save a full page screenshot as "entire-page"
```

### 4. Console Logging
```gherkin
Then I log the current URL
Then I log the page title
Then I print visible text
Then I log all cookies
Then I log localStorage
```

### 5. Browser Console
```gherkin
Then I print browser console messages
```

### 6. Highlight Element
```gherkin
When I highlight element "#my-button"
When I save a screenshot as "highlighted"
```

### 7. Capture HTML
```gherkin
When I capture the page HTML as "pageContent"
# pageContent variable now has full HTML
```

## Running Tests in Debug Mode

```bash
# Open Playwright Inspector
npx playwright test --debug

# Run with browser visible
npx playwright test --headed

# Slow down execution
npx playwright test --headed --slow-mo=1000

# Interactive UI mode
npx playwright test --ui
```

## Environment Variable Checklist

```bash
# Where to test
FRONTEND_URL=http://localhost:3000        # older alias: BASE_URL
# API_BASE_URL=http://localhost:4000      # optional; defaults to FRONTEND_URL
HEADLESS=true

# Who logs in: one pair per role used in features (no hardcoded defaults)
AUTH_ADMIN_USERNAME=admin@example.com
AUTH_ADMIN_PASSWORD=changeme
# AUTH_PM_USERNAME=pm@example.com
# AUTH_PM_PASSWORD=changeme

# API login (optional, defaults shown)
# API_AUTH_LOGIN_PATH=/auth/login
# API_AUTH_BODY=form
# API_AUTH_USERNAME_FIELD=username
# API_AUTH_PASSWORD_FIELD=password
# API_AUTH_TOKEN_PATH=access_token

# UI login (optional, defaults shown)
# UI_LOGIN_PATH=/login
# UI_USERNAME_FIELD=Username              # label, placeholder or name
# UI_PASSWORD_FIELD=Password
# UI_LOGIN_BUTTON=Login
# UI_LOGIN_SUCCESS_TEXT=Welcome
# UI_SESSION_REUSE=true

# Cleanup Auth (optional -- alternative to login-based auth)
# CLEANUP_AUTH_TOKEN=your-admin-token

# Cleanup Rules (required -- no built-in rules)
CLEANUP_RULES='[{"varMatch":"user","path":"/api/users/{id}"}]'
DEBUG=false
```

## Getting More Help

1. **Check the docs** - `docs/` folder in the repository
2. **Review examples** - `examples/` folder has working tests
3. **Enable verbose logging** - Set `DEBUG=true` in `.env`
4. **Use Playwright's trace** - `npx playwright test --trace on`

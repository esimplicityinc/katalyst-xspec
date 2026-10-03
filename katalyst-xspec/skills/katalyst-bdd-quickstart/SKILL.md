---
name: katalyst-bdd-quickstart
description: Get started with the Katalyst BDD testing framework. Use when setting up a new test project, scaffolding tests, configuring environment variables, understanding project structure, or running tests for the first time. Triggers on "set up tests", "install katalyst-xspec", "create test project", "configure BDD", "how to run tests".
---

# Katalyst BDD Quick Start Guide

This skill helps you get started with the @esimplicitylabs/katalyst-xspec BDD testing framework.

## Step 1: Scaffold a New Project

Run the scaffolding command (positional target folder, or `.` for the current folder):

```bash
npx @esimplicitylabs/katalyst-xspec init my-tests
cd my-tests
npm install
npx playwright install chromium   # REQUIRED once: UI tests fail without the browser
npm test                          # scaffolded examples pass with no .env
```

Options:
- `<dir>` or `--dir <name>` - Target directory (`init .` = current folder)
- `--force` - Overwrite existing files
- `--with-skills` / `--no-skills` - Install (or skip) agent skills without prompting
- `--skills-agents opencode,claude-code,cursor,generic` - Which agents get skills

The project's `package.json` name comes from the folder name (npm-safe, e.g. `My Demo` -> `my-demo`).

## Step 2: Understand the Project Structure

The scaffold creates:

```
my-tests/
├── features/
│   ├── api/
│   │   └── example.feature   # JSONPlaceholder: GET /users/1, POST /posts
│   ├── ui/
│   │   └── example.feature   # Sauce Demo login (standard_user / secret_sauce)
│   └── steps/
│       ├── fixtures.ts       # Adapter configuration
│       └── steps.ts          # Step registration
├── playwright.config.ts      # Projects: api, ui (tui commented out)
├── .env.example              # Environment template
├── tsconfig.json             # TypeScript config
└── package.json              # Dependencies
```

Each Playwright project reads one folder. Steps are untagged: any step works in any scenario. Do NOT add `@api`/`@ui`/`@hybrid`/`@tui` tags — they are not needed (and are ignored).

### Key Files

**`features/steps/fixtures.ts`** - Configures adapters:
```typescript
import { createBddTest } from '@esimplicitylabs/katalyst-xspec';

export const test = createBddTest({
  // Default adapters are used unless you customize
});
```

**`features/steps/steps.ts`** - Registers step definitions:
```typescript
import { test } from './fixtures';
import { registerAllSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerAllSteps(test);

export { test };
```

**`playwright.config.ts`** - Defines BDD projects:
```typescript
import { defineBddProject } from 'playwright-bdd';

import { tagsForProject, resolveExtraTags } from '@esimplicitylabs/katalyst-xspec';

const tags = tagsForProject({ extraTags: resolveExtraTags(process.env.TEST_TAGS) });

const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',   // selected by folder only
  steps: 'features/steps/**/*.ts',
  tags,                                     // only skips @Skip/@ignore + applies TEST_TAGS
});
```

## Step 3: Point It at Your App

The examples use absolute URLs to public demo sites. To test your own app, copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# API Configuration
API_BASE_URL=http://localhost:3000

# Authentication (required -- no hardcoded defaults)
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=changeme
DEFAULT_USER_USERNAME=user@example.com
DEFAULT_USER_PASSWORD=changeme
API_AUTH_LOGIN_PATH=/auth/login

# UI Configuration
FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:3000
HEADLESS=true

# Cleanup Rules (required -- no built-in rules)
# CLEANUP_RULES='[{"varMatch":"user","path":"/api/users/{id}"}]'
```

Then use relative paths in features, e.g. `Given I navigate to "/login"`, `When I GET "/health"`.

### Required Variables by Step Type

| Steps used | Required Variables |
|-----------|-------------------|
| API steps with relative paths | `API_BASE_URL` |
| UI steps with relative paths | `FRONTEND_URL` or `BASE_URL` |
| Both in one scenario | Both API and UI variables |
| Auth steps | `DEFAULT_*_USERNAME`, `DEFAULT_*_PASSWORD` |

## Step 4: Write Your First Test

### API Test

Create `features/api/health.feature`:

```gherkin
Feature: Health Check

  Scenario: API is healthy
    When I GET "/health"
    Then the response status should be 200
```

### UI Test

Create `features/ui/home.feature`:

```gherkin
Feature: Home Page

  Scenario: Home page loads
    Given I navigate to "/"
    Then I should see text "Welcome"
```

### Mixed API + UI Test

Any scenario can mix API and UI steps — no tag or separate project needed. Put it in a folder a project reads (e.g. `features/ui/`, since it needs a browser). Create `features/ui/workflow.feature`:

```gherkin
Feature: User Workflow

  Scenario: Create via API, verify in UI
    Given I am authenticated as an admin via API
    When I POST "/users" with JSON body:
      """
      { "name": "Test User" }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    
    Given I navigate to "/users/{userId}"
    Then I should see text "Test User"
```

## Step 5: Run Tests

`npm test` runs `bddgen && playwright test` (generates specs from features, then runs them). If you call `npx playwright test` directly, run `npm run gen` first.

```bash
# Run all tests
npm test

# Run one project (folder)
npx playwright test --project api
npx playwright test --project ui

# Run only scenarios with your own tag
TEST_TAGS=@smoke npm test
```

### Common Run Commands

```bash
# Run with specific tag
npx playwright test --grep "@smoke"

# Run single feature file
npx playwright test features/api/users.feature

# Debug mode (opens browser and pauses)
npx playwright test --debug

# UI mode (interactive test runner)
npx playwright test --ui

# Headed mode (see the browser)
npx playwright test --headed

# Run with verbose output
npx playwright test --reporter=list
```

## Step 6: View Results

After running tests, find reports at:

| Report | Location |
|--------|----------|
| Cucumber HTML | `cucumber-report/index.html` |
| Cucumber JSON | `cucumber-report/report.json` |
| Playwright HTML | `playwright-report/index.html` |

Open the Playwright report:
```bash
npx playwright show-report
```

## Optional Tags

Tags are only for your own grouping and filtering (`TEST_TAGS=@smoke npm test`, or `TEST_TAGS=smoke,critical`).

| Tag | Purpose |
|-----|---------|
| `@smoke` | Quick smoke tests |
| `@Skip` / `@ignore` | Skip this scenario (excluded by default) |
| `@wip` | Work in progress |

## Quick Reference: Essential Steps

### API Steps
```gherkin
When I GET "/endpoint"
When I POST "/endpoint" with JSON body:
Then the response status should be 200
And I store the value at "id" as "userId"
```

### UI Steps
```gherkin
Given I navigate to "/page"
When I click the button "Submit"
When I fill in "Email" with "test@example.com"
Then I should see text "Success"
```

### Shared Steps
```gherkin
Given I generate a UUID and store as "runId"
Given I set variable "name" to "value"
Given I register cleanup DELETE "/resource/{id}"
```

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| "No tests found" | Run `npm run gen` first; check the feature is in a folder a project reads |
| "Executable doesn't exist" | Run `npx playwright install chromium` |
| Step not found | Check exact step wording in `katalyst-bdd-step-reference` (no tags needed) |
| Auth fails | Verify `.env` credentials |
| Can't find element | Use `When I pause for debugging` |

## Next Steps

1. **Create more tests** - Add feature files to `features/api/` or `features/ui/`
2. **Learn steps** - See full step reference with `katalyst-bdd-step-reference` skill
3. **Patterns** - Learn test patterns with `katalyst-bdd-create-test` skill
4. **Custom adapters** - Extend framework with `katalyst-bdd-architecture` skill

## Upgrade Existing Project

To upgrade an existing project to the latest version:

```bash
npx @esimplicitylabs/katalyst-xspec upgrade
```

This updates:
- Package dependencies
- Configuration templates
- Step definitions

Upgrading from 0.6 or earlier: run `npx katalyst-xspec upgrade --migrate` to remove old `@api`/`@ui`/`@hybrid`/`@tui` tag filters from `playwright.config.*`. Old tags left in feature files are harmless.

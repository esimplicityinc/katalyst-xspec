---
name: katalyst-bdd-quickstart
description: Get started with the Katalyst BDD testing framework. Use when setting up a new test project, scaffolding tests, configuring environment variables, understanding project structure, or running tests for the first time. Triggers on "set up tests", "install katalyst-xspec", "create test project", "configure BDD", "how to run tests".
---

# Katalyst BDD Quick Start Guide

This skill helps you get started with the @esimplicityinc/katalyst-xspec BDD testing framework.

## Step 1: Scaffold a New Project

Run the scaffolding command:

```bash
npx @esimplicityinc/create-katalyst-xspec
```

Options:
- `--dir <name>` - Create in specific directory
- `--force` - Overwrite existing files

Example:
```bash
npx @esimplicityinc/create-katalyst-xspec --dir my-tests
cd my-tests
npm install
```

## Step 2: Understand the Project Structure

The scaffold creates:

```
my-tests/
├── features/
│   ├── api/
│   │   └── 00_api_examples.feature    # API test examples
│   ├── ui/
│   │   └── 00_ui_examples.feature     # UI test examples
│   ├── hybrid/
│   │   └── 00_hybrid_examples.feature # Combined API+UI tests
│   ├── tui/
│   │   └── 00_tui_examples.feature    # Terminal UI tests
│   └── steps/
│       ├── fixtures.ts                 # Adapter configuration
│       └── steps.ts                    # Step registration
├── playwright.config.ts                # BDD project config
├── .env.example                        # Environment template
├── tsconfig.json                       # TypeScript config
└── package.json                        # Dependencies
```

### Key Files

**`features/steps/fixtures.ts`** - Configures adapters:
```typescript
import { createBddTest } from '@esimplicityinc/katalyst-xspec';

export const test = createBddTest({
  // Default adapters are used unless you customize
});
```

**`features/steps/steps.ts`** - Registers step definitions:
```typescript
import { test } from './fixtures';
import { registerAllSteps } from '@esimplicityinc/katalyst-xspec/steps';

registerAllSteps(test);

export { test };
```

**`playwright.config.ts`** - Defines BDD projects:
```typescript
import { defineBddProject } from 'playwright-bdd';

const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: '@api',
});
```

## Step 3: Configure Environment

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# API Configuration
API_BASE_URL=http://localhost:4000

# Authentication (for admin/user auth steps)
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_USER_USERNAME=user@example.com
DEFAULT_USER_PASSWORD=user123
API_AUTH_LOGIN_PATH=/auth/login

# UI Configuration
FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:3000
HEADLESS=true

# Cleanup Rules (optional)
# CLEANUP_RULES='[{"varMatch":"user","path":"/admin/users/{id}"}]'
```

### Required Variables by Test Type

| Test Type | Required Variables |
|-----------|-------------------|
| `@api` | `API_BASE_URL` |
| `@ui` | `FRONTEND_URL` or `BASE_URL` |
| `@hybrid` | Both API and UI variables |
| Auth steps | `DEFAULT_*_USERNAME`, `DEFAULT_*_PASSWORD` |

## Step 4: Write Your First Test

### API Test

Create `features/api/health.feature`:

```gherkin
@api
Feature: Health Check

  Scenario: API is healthy
    When I GET "/health"
    Then the response status should be 200
```

### UI Test

Create `features/ui/home.feature`:

```gherkin
@ui
Feature: Home Page

  Scenario: Home page loads
    Given I navigate to "/"
    Then I should see text "Welcome"
```

### Hybrid Test

Create `features/hybrid/workflow.feature`:

```gherkin
@hybrid
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

**IMPORTANT:** You must generate Playwright tests before running.

```bash
# 1. Generate tests from feature files (REQUIRED)
npm run gen

# 2. Run all tests
npm test

# 3. Run specific project
npx playwright test --project=api
npx playwright test --project=ui
npx playwright test --project=hybrid
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

## Common Tags

| Tag | Purpose |
|-----|---------|
| `@api` | API-only tests |
| `@ui` | UI-only tests |
| `@tui` | Terminal UI tests |
| `@hybrid` | Combined API+UI tests |
| `@smoke` | Quick smoke tests |
| `@Skip` | Skip this scenario |
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
| "No tests found" | Run `npm run gen` first |
| Steps not available | Check you have the correct tag |
| Auth fails | Verify `.env` credentials |
| Can't find element | Use `When I pause for debugging` |

## Next Steps

1. **Create more tests** - Add feature files to `features/api/`, `features/ui/`, etc.
2. **Learn steps** - See full step reference with `katalyst-bdd-step-reference` skill
3. **Patterns** - Learn test patterns with `katalyst-bdd-create-test` skill
4. **Custom adapters** - Extend framework with `katalyst-bdd-architecture` skill

## Upgrade Existing Project

To upgrade an existing project to the latest version:

```bash
npx -p @esimplicityinc/create-katalyst-xspec upgrade-katalyst-xspec
```

This updates:
- Package dependencies
- Configuration templates
- Step definitions

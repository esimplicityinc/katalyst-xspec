# Quick Start

Get your first BDD test running in 5 minutes.

## Step 1: Scaffold a Test Project

```bash
npx @esimplicitylabs/katalyst-xspec init my-tests
cd my-tests
npm install
npx playwright install chromium   # one-time browser download, required for UI tests
```

Use `init .` to scaffold into the current folder. The project's `package.json` name is taken from the folder name (e.g. `My Demo` becomes `my-demo`).

> **Tip:** During scaffolding, you can optionally install [Agent Skills](../guides/agent-skills.md) for AI-assisted development. Add `--with-skills` (or `--no-skills`) to skip the prompt.

## Step 2: Run the Examples

```bash
npm test
```

`npm test` runs `bddgen && playwright test`: it generates Playwright specs from your `.feature` files, then runs them. The scaffolded examples call public demo sites, so they pass with no `.env`:

- `features/api/example.feature` calls [JSONPlaceholder](https://jsonplaceholder.typicode.com): `GET /users/1` checks `username` is `Bret`, and `POST /posts` expects `201`.
- `features/ui/example.feature` logs in to [Sauce Demo](https://www.saucedemo.com/) as `standard_user` / `secret_sauce`, and checks the error shown for a locked-out user.

## Step 3: Understand the Structure

```
my-tests/
├── features/
│   ├── api/
│   │   └── example.feature     # API example (project "api")
│   ├── ui/
│   │   └── example.feature     # UI example (project "ui")
│   └── steps/
│       ├── fixtures.ts         # Adapter configuration
│       └── steps.ts            # Registers the built-in steps
├── playwright.config.ts        # Projects: api, ui (tui commented out)
├── .env.example                # Environment template
├── tsconfig.json
└── package.json
```

Each Playwright project runs the feature files in its folder. Steps aren't tied to a folder or tag — any step works in any scenario.

## Step 4: Point It at Your App

```bash
cp .env.example .env
```

Set where to test and who logs in, in `.env`:

```bash
FRONTEND_URL=http://localhost:3000
# API_BASE_URL=http://localhost:4000   # only if the API is on another origin

AUTH_ADMIN_USERNAME=admin@example.com
AUTH_ADMIN_PASSWORD=changeme
```

Then use relative paths in your features, e.g. `Given I navigate to "/login"` or `When I GET "/health"`. Without `API_BASE_URL`, API steps go to `FRONTEND_URL`. Each run starts by printing `katalyst-xspec targets: UI … | API …` so you can see where tests point.

Add one `AUTH_<ROLE>_USERNAME` / `AUTH_<ROLE>_PASSWORD` pair per role you log in as, then:

```gherkin
Given I am authenticated as "admin" via API   # API login
Given I am logged in as "admin"               # UI login
```

If your login endpoint or form differs from the defaults (`/auth/login`, `/login`), see the [Authentication guide](../guides/authentication.md).

## Step 5: Write Your First Test

Create `features/ui/first.feature`. This scenario mixes an API step and UI steps — no special tag or project needed:

```gherkin
Feature: First test

  Scenario: API is up and the login page loads
    When I GET "/health"
    Then the response status should be 200
    Given I navigate to "/login"
    Then I should see text "Sign In"
```

Run it:

```bash
npm test
# or just the ui folder
npx playwright test --project ui
```

## Step 6: View Results

After running, find reports at:
- `cucumber-report/index.html` - Cucumber HTML report
- `cucumber-report/report.json` - JSON report
- `playwright-report/` - Playwright HTML report

## Using Variables

Variables enable dynamic test data:

```gherkin
Scenario: Use generated data
  Given I generate a UUID and store as "uniqueId"
  And I set variable "email" to "user-{uniqueId}@test.com"
  When I POST "/users" with JSON body:
    """
    { "email": "{email}" }
    """
  Then the response status should be 201
```

## Next Steps

- [Project Setup](./project-setup.md) - Playwright configuration
- [API Testing Guide](../guides/api-testing.md) - Deep dive into API testing
- [Tags](../concepts/tag-system.md) - Optional tags and filtering
- [Architecture](../concepts/architecture.md) - Understand the framework design

## Common Commands

```bash
# Generate specs and run all tests
npm test

# Only generate specs from features
npm run gen

# Generate step stubs for missing steps
npm run gen:stubs

# Run one project (folder)
npx playwright test --project api
npx playwright test --project ui

# Run scenarios you tagged yourself
TEST_TAGS=@smoke npm test

# Debug mode
npx playwright test --debug

# Show report
npx playwright show-report

# Check for framework updates
npm run check-updates

# Upgrade framework
npm run upgrade

# Full scaffolding migration
npm run upgrade:migrate
```

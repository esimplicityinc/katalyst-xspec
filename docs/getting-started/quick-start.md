# Quick Start

Get your first BDD test running in 5 minutes.

## Step 1: Scaffold a Test Project

```bash
npx @kata/create-stack-tests
cd stack-tests
npm install
```

## Step 2: Understand the Structure

The scaffold creates:

```
stack-tests/
├── features/
│   ├── api/
│   │   └── 00_api_examples.feature    # API test examples
│   ├── ui/
│   │   └── 00_ui_examples.feature     # UI test examples
│   ├── hybrid/
│   │   └── 00_hybrid_examples.feature # Mixed API+UI tests
│   ├── tui/
│   │   └── 00_tui_examples.feature    # Terminal UI tests
│   └── steps/
│       ├── fixtures.ts                 # Adapter configuration
│       └── steps.ts                    # Step registration
├── playwright.config.ts                # BDD project config
├── .env.example                        # Environment template
└── package.json
```

## Step 3: Configure Environment

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` with your API/UI URLs:

```bash
# API Configuration
API_BASE_URL=http://localhost:4000
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123

# UI Configuration
FRONTEND_URL=http://localhost:3000
HEADLESS=true
```

## Step 4: Write Your First Test

Create a feature file `features/api/health.feature`:

```gherkin
@api
Feature: Health Check API

  Scenario: Verify API is healthy
    When I GET "/health"
    Then the response status should be 200
```

## Step 5: Run Tests

Generate and execute tests:

```bash
# Generate Playwright tests from feature files
npm run gen

# Run all tests
npm test

# Or run specific project
npx playwright test --project=api
```

## Step 6: View Results

After running, find reports at:
- `cucumber-report/index.html` - Cucumber HTML report
- `cucumber-report/report.json` - JSON report
- `playwright-report/` - Playwright HTML report

## Example: Complete API Test

```gherkin
@api
Feature: User API

  Background:
    Given I am authenticated as an admin via API

  Scenario: Create a new user
    When I POST "/admin/users" with JSON body:
      """
      {
        "email": "newuser@example.com",
        "name": "New User",
        "role": "member"
      }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    And the value at "email" should equal "newuser@example.com"

  Scenario: List all users
    When I GET "/admin/users"
    Then the response status should be 200
    And the response should be a JSON array
```

## Example: UI Test

```gherkin
@ui
Feature: Login Page

  Scenario: Successful login
    Given I navigate to "/login"
    When I fill the field "Email" with "user@example.com"
    And I fill the field "Password" with "password123"
    And I click the button "Sign In"
    Then I should see text "Welcome"
    And the URL should contain "/dashboard"
```

## Example: Hybrid Test

```gherkin
@hybrid
Feature: User Onboarding

  Scenario: Create user via API, verify in UI
    # Setup via API
    Given I am authenticated as an admin via API
    When I POST "/admin/users" with JSON body:
      """
      { "email": "test@example.com", "name": "Test User" }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"

    # Verify via UI
    Given I navigate to "/admin/users"
    Then I should see text "test@example.com"
```

## Using Variables

Variables enable dynamic test data:

```gherkin
@api
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

- [Project Setup](./project-setup.md) - Advanced Playwright configuration
- [API Testing Guide](../guides/api-testing.md) - Deep dive into API testing
- [Architecture](../concepts/architecture.md) - Understand the framework design

## Common Commands

```bash
# Generate tests from features
npm run gen

# Run all tests
npm test

# Run specific project
npx playwright test --project=api
npx playwright test --project=ui

# Run with specific tags
npx playwright test --grep "@smoke"

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui

# Show report
npx playwright show-report
```

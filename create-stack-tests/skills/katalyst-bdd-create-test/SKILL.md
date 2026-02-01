---
name: katalyst-bdd-create-test
description: Create BDD tests for the Katalyst framework. Use when writing new feature files, creating test scenarios, choosing test types (@api, @ui, @tui, @hybrid), or implementing common testing patterns like CRUD operations, login flows, form handling, or API+UI verification workflows.
---

# Katalyst BDD Test Creation Guide

This skill guides you through creating BDD tests with the Katalyst framework.

## Test Type Decision Tree

Choose the right tag based on what you're testing:

```
What are you testing?
│
├─ HTTP API only → @api
│  (REST endpoints, JSON responses, status codes)
│
├─ Browser UI only → @ui
│  (Pages, forms, buttons, navigation)
│
├─ Terminal UI only → @tui
│  (CLI apps, interactive terminal programs)
│
└─ Multiple layers → @hybrid
   (Create via API, verify in UI)
   (Setup data, then test UI flows)
```

## Feature File Structure

Every feature file follows this structure:

```gherkin
@tag
Feature: Feature Name
  As a [role]
  I want [capability]
  So that [benefit]

  Background:
    # Shared setup for all scenarios

  Scenario: Scenario Name
    Given [precondition]
    When [action]
    Then [expected outcome]
```

## Creating API Tests (`@api`)

### Step 1: Create Feature File

Location: `features/api/[resource].feature`

```gherkin
@api
Feature: [Resource] API
  As a developer
  I want to test the [Resource] API
  So that I can verify CRUD operations work correctly
```

### Step 2: Add Background (if authenticated)

```gherkin
Background:
  Given I am authenticated as an admin via API
```

### Step 3: Write Scenarios

**Pattern: Simple GET**
```gherkin
Scenario: Fetch [resource]
  When I GET "/[endpoint]"
  Then the response status should be 200
  And the response should be a JSON [array|object]
```

**Pattern: Create Resource**
```gherkin
Scenario: Create [resource]
  Given I generate a UUID and store as "runId"
  When I POST "/[endpoint]" with JSON body:
    """
    {
      "field": "value-{runId}"
    }
    """
  Then the response status should be 201
  And I store the value at "id" as "[resource]Id"
  And the value at "field" should equal "value-{runId}"
```

**Pattern: Full CRUD**
```gherkin
Scenario: Full [resource] lifecycle
  # Create
  Given I generate a UUID and store as "runId"
  When I POST "/[endpoint]" with JSON body:
    """
    { "name": "Test {runId}" }
    """
  Then the response status should be 201
  And I store the value at "id" as "resourceId"
  Given I register cleanup DELETE "/[endpoint]/{resourceId}"
  
  # Read
  When I GET "/[endpoint]/{resourceId}"
  Then the response status should be 200
  And the value at "name" should equal "Test {runId}"
  
  # Update
  When I PATCH "/[endpoint]/{resourceId}" with JSON body:
    """
    { "name": "Updated {runId}" }
    """
  Then the response status should be 200
  
  # Delete
  When I DELETE "/[endpoint]/{resourceId}"
  Then the response status should be 204
```

See [API Patterns](references/api-patterns.md) for more examples.

## Creating UI Tests (`@ui`)

### Step 1: Create Feature File

Location: `features/ui/[page].feature`

```gherkin
@ui
Feature: [Page Name]
  As a user
  I want to [action on page]
  So that I can [benefit]
```

### Step 2: Write Navigation Scenario

```gherkin
Scenario: Navigate to [page]
  Given I navigate to "/[path]"
  Then I should see text "[expected text]"
  And the URL should contain "/[path]"
```

### Step 3: Write Interaction Scenarios

**Pattern: Form Submit**
```gherkin
Scenario: Submit [form name]
  Given I navigate to "/[path]"
  When I fill the form:
    | Field     | Value          |
    | Field1    | value1         |
    | Field2    | value2         |
  And I click the button "Submit"
  Then I should see text "Success"
```

**Pattern: Login Flow**
```gherkin
Scenario: User login
  Given I navigate to "/login"
  When I fill in "Email" with "user@example.com"
  And I fill in "Password" with "password123"
  And I click the button "Sign In"
  Then I should see text "Welcome"
  And the URL should contain "/dashboard"
```

See [UI Patterns](references/ui-patterns.md) for more examples.

## Creating TUI Tests (`@tui`)

### Step 1: Create Feature File

Location: `features/tui/[command].feature`

```gherkin
@tui
Feature: [CLI Command]
  As a user
  I want to use the [command] CLI
  So that I can [benefit]
```

### Step 2: Configure TUI in Fixtures

Ensure your `fixtures.ts` has TUI configured:

```typescript
createTui: () => new TuiTesterAdapter({
  command: ['node', 'dist/cli.js'],
  size: { cols: 100, rows: 30 },
}),
```

### Step 3: Write Scenarios

**Pattern: Basic Command**
```gherkin
Scenario: Run [command]
  Given I start the TUI application
  When I type "[command]"
  And I press enter
  Then I should see "[expected output]"
```

**Pattern: Interactive Menu**
```gherkin
Scenario: Navigate menu
  Given I start the TUI application
  When I wait for "Main Menu"
  And I navigate down 2 times
  And I press enter
  Then I should see "[selected option screen]"
```

See [TUI Patterns](references/tui-patterns.md) for more examples.

## Creating Hybrid Tests (`@hybrid`)

### Step 1: Create Feature File

Location: `features/hybrid/[workflow].feature`

```gherkin
@hybrid
Feature: [Workflow Name]
  As a tester
  I want to combine API and UI testing
  So that I can verify end-to-end workflows
```

### Step 2: Structure Your Scenario

```gherkin
Scenario: [Workflow description]
  # --- API SETUP PHASE ---
  Given I am authenticated as an admin via API
  [API steps to create test data]
  
  # --- UI VERIFICATION PHASE ---
  Given I navigate to "[page]"
  [UI steps to verify the data]
```

**Pattern: Create via API, Verify in UI**
```gherkin
Scenario: Create user via API, verify in admin panel
  # API: Create user
  Given I am authenticated as an admin via API
  Given I generate a UUID and store as "testId"
  When I POST "/admin/users" with JSON body:
    """
    {
      "email": "test-{testId}@example.com",
      "name": "Test User {testId}"
    }
    """
  Then the response status should be 201
  And I store the value at "id" as "userId"
  Given I register cleanup DELETE "/admin/users/{userId}"
  
  # UI: Verify user appears
  Given I navigate to "/admin/users"
  Then I should see text "test-{testId}@example.com"
  Then I should see text "Test User {testId}"
```

See [Hybrid Patterns](references/hybrid-patterns.md) for more examples.

## Best Practices

### 1. Always Use Unique Test Data

```gherkin
# Good: Unique data per run
Given I generate a UUID and store as "runId"
Given I set variable "email" to "test-{runId}@example.com"

# Bad: Hardcoded data that may conflict
Given I set variable "email" to "test@example.com"
```

### 2. Register Cleanup for Created Resources

```gherkin
When I POST "/users" with JSON body:
  """
  { "email": "{email}" }
  """
Then the response status should be 201
And I store the value at "id" as "userId"
Given I register cleanup DELETE "/users/{userId}"  # Important!
```

### 3. Use Background for Common Setup

```gherkin
Background:
  Given I am authenticated as an admin via API
  Given I generate a UUID and store as "runId"

Scenario: Test 1
  # No need to repeat auth and UUID generation

Scenario: Test 2
  # Background runs before each scenario
```

### 4. Keep Scenarios Independent

Each scenario should be able to run in isolation. Don't rely on state from previous scenarios.

### 5. Use Descriptive Variable Names

```gherkin
# Good
And I store the value at "id" as "createdUserId"
And I store the value at "token" as "authToken"

# Bad
And I store the value at "id" as "x"
And I store the value at "token" as "t"
```

## Running Your Tests

After creating feature files:

```bash
# 1. Generate Playwright tests (REQUIRED)
npm run gen

# 2. Run all tests
npm test

# 3. Run specific project
npx playwright test --project=api
npx playwright test --project=ui
npx playwright test --project=hybrid

# 4. Run specific feature
npx playwright test features/api/users.feature

# 5. Debug mode
npx playwright test --debug
```

## Common Mistakes to Avoid

| Mistake | Solution |
|---------|----------|
| Forgot to run `npm run gen` | Always run after creating/modifying features |
| Steps not available | Check you have the correct tag (`@api`, `@ui`, etc.) |
| Hardcoded test data | Use UUID generation for unique data |
| No cleanup registered | Always register cleanup for created resources |
| Scenarios depend on each other | Make each scenario independent |
| Missing Background auth | Add auth to Background if all scenarios need it |

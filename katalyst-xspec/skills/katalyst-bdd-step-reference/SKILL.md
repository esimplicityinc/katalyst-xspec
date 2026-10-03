---
name: katalyst-bdd-step-reference
description: Complete reference of all available BDD step definitions in the Katalyst framework. Use when writing feature files, looking up step syntax, checking exact step wording, or finding the right step for a specific action like clicking, filling forms, making API calls, or terminal interactions.
---

# Katalyst BDD Step Reference

This skill provides a complete reference of all step definitions available in @esimplicitylabs/katalyst-xspec.

## Where Steps Work

Built-in steps are untagged. Once registered (`registerApiSteps`, `registerUiSteps`, `registerSharedSteps`, `registerTuiSteps`, ...), **any step works in any scenario**, so a single scenario can mix API, UI and shared steps.

- Do not add `{ tags: ... }` to steps or type tags to scenarios; they are not needed.
- Playwright projects pick feature files by folder (`features/api/`, `features/ui/`).
- Tags like `@smoke` or `@wip` are optional, for the user's own filtering (`TEST_TAGS`).

## Variable Interpolation

All steps support variable interpolation using `{varName}` syntax:

```gherkin
Given I set variable "userId" to "123"
When I GET "/users/{userId}"  # Becomes /users/123
```

## Quick Reference - Most Common Steps

### API Steps

| Step | Example |
|------|---------|
| `When I GET {string}` | `When I GET "/users"` |
| `When I POST {string} with JSON body:` | `When I POST "/users" with JSON body:` + docstring |
| `When I PUT {string} with JSON body:` | `When I PUT "/users/1" with JSON body:` + docstring |
| `When I PATCH {string} with JSON body:` | `When I PATCH "/users/1" with JSON body:` + docstring |
| `When I DELETE {string}` | `When I DELETE "/users/1"` |
| `Then the response status should be {int}` | `Then the response status should be 200` |
| `Then the response should be a JSON array` | Asserts response is an array |
| `Then the response should be a JSON object` | Asserts response is an object |
| `Then the value at {string} should equal {string}` | `Then the value at "name" should equal "John"` |
| `And I store the value at {string} as {string}` | `And I store the value at "id" as "userId"` |
| `Given I am authenticated as {string} via API` | `Given I am authenticated as "pm" via API` (reads `AUTH_PM_*`) |
| `Given I am authenticated as an admin via API` | Shorthand for role `"admin"` |
| `Given I am authenticated as a user via API` | Shorthand for role `"user"` |
| `Given I set header {string} to {string}` | `Given I set header "X-Custom" to "value"` |

### UI Steps

| Step | Example |
|------|---------|
| `Given I navigate to {string}` | `Given I navigate to "/login"` |
| `Given I am logged in as {string}` | `Given I am logged in as "pm"` (UI login, session reused) |
| `When I log in as {string} in UI` | `When I log in as "pm" in UI` (always submits the form) |
| `When I click the button {string}` | `When I click the button "Submit"` |
| `When I click the link {string}` | `When I click the link "Sign Up"` |
| `When I fill the field {string} with {string}` | `When I fill the field "Email" with "test@example.com"` |
| `When I fill in {string} with {string}` | `When I fill in "Password" with "secret"` |
| `When I select {string} from dropdown {string}` | `When I select "Admin" from dropdown "Role"` |
| `Then I should see text {string}` | `Then I should see text "Welcome"` |
| `Then the URL should contain {string}` | `Then the URL should contain "/dashboard"` |
| `Then the element {string} should be visible` | `Then the element "#modal" should be visible` |
| `When I pause for debugging` | Opens Playwright Inspector |

### TUI Steps

| Step | Example |
|------|---------|
| `Given I start the TUI application` | Starts the configured TUI app |
| `When I type {string}` | `When I type "hello world"` |
| `When I press {string}` | `When I press "Enter"` |
| `When I press enter` | Press Enter key |
| `Then I should see {string}` | `Then I should see "Welcome"` |
| `Then I should see {string} in the terminal` | `Then I should see "Ready" in the terminal` |
| `Then the screen should contain {string}` | Assert screen has text |
| `When I fill the TUI form:` | Data table of `field`/`value` |

TUI has no `I should see text {string}` (that's the UI step), and the TUI form step is `I fill the TUI form:` (UI uses `I fill the form:`).

### Shared Steps

| Step | Example |
|------|---------|
| `Given I set variable {string} to {string}` | `Given I set variable "email" to "test@test.com"` |
| `Given I generate a UUID and store as {string}` | `Given I generate a UUID and store as "runId"` |
| `Given I register cleanup DELETE {string}` | `Given I register cleanup DELETE "/users/{userId}"` |

## Detailed Reference

For complete step definitions with all parameters and examples:

- [API Steps](references/api-steps.md) - HTTP methods, assertions, authentication
- [UI Steps](references/ui-steps.md) - Navigation, clicks, forms, assertions
- [TUI Steps](references/tui-steps.md) - Terminal input, output, snapshots
- [Shared Steps](references/shared-steps.md) - Variables, cleanup, feature flags

## Step Parameters

| Placeholder | Type | Example |
|-------------|------|---------|
| `{string}` | Text in quotes | `"hello"` or `"/api/users"` |
| `{int}` | Integer | `200`, `404` |
| Docstring | Multi-line text | Triple quotes `"""` |
| DataTable | Tabular data | Gherkin table format |

## Common Patterns

### API CRUD Test

```gherkin
Scenario: Create and fetch user
  Given I am authenticated as "admin" via API
  When I POST "/users" with JSON body:
    """
    { "email": "test@example.com", "name": "Test" }
    """
  Then the response status should be 201
  And I store the value at "id" as "userId"
  When I GET "/users/{userId}"
  Then the response status should be 200
```

### UI Login Test

```gherkin
Scenario: User login
  Given I navigate to "/login"
  When I fill in "Email" with "user@example.com"
  And I fill in "Password" with "password123"
  And I click the button "Sign In"
  Then I should see text "Dashboard"
```

### Mixed API + UI Test (no tag needed)

```gherkin
Scenario: Create via API, verify in UI
  Given I am authenticated as "admin" via API
  When I POST "/users" with JSON body:
    """
    { "email": "new@example.com" }
    """
  Then the response status should be 201
  Given I navigate to "/admin/users"
  Then I should see text "new@example.com"
```

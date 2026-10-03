# Shared Steps Reference

Complete reference for shared steps. Available in all scenarios; like every built-in step, they need no tag.

## Variable Steps

### Set Variable

```gherkin
Given I set variable {string} to {string}
```

Sets a variable that can be used in subsequent steps via `{varName}` interpolation.

**Example:**
```gherkin
Given I set variable "baseUrl" to "https://api.example.com"
Given I set variable "email" to "test@example.com"
Given I set variable "userId" to "123"
```

### Generate UUID

```gherkin
Given I generate a UUID and store as {string}
```

Generates a unique identifier useful for creating unique test data.

**Example:**
```gherkin
Given I generate a UUID and store as "runId"
Given I set variable "email" to "test-{runId}@example.com"
# email becomes something like "test-a1b2c3d4-e5f6-7890-abcd-ef1234567890@example.com"
```

### Assert Variable Value

```gherkin
Then the variable {string} should equal {string}
```

**Example:**
```gherkin
Then the variable "status" should equal "active"
Then the variable "userId" should equal "123"
```

## Variable Interpolation

Variables are interpolated in step parameters using `{varName}` syntax:

```gherkin
# Set variables
Given I set variable "userId" to "42"
Given I set variable "action" to "update"

# Use in API paths
When I GET "/users/{userId}"           # becomes /users/42
When I POST "/users/{userId}/{action}" # becomes /users/42/update

# Use in JSON bodies
When I POST "/users" with JSON body:
  """
  {
    "id": "{userId}",
    "email": "user-{userId}@example.com"
  }
  """

# Use in assertions
Then the value at "id" should equal "{userId}"

# Use in UI
Given I navigate to "/users/{userId}/profile"
Then I should see text "User {userId}"
```

## Header Steps

### Set HTTP Header

```gherkin
Given I set header {string} to {string}
```

Sets a header that will be included in subsequent API requests.

**Example:**
```gherkin
Given I set header "X-API-Key" to "abc123"
Given I set header "Content-Type" to "application/json"
Given I set header "Authorization" to "Bearer {token}"
Given I set header "X-Request-ID" to "{runId}"
```

## Cleanup Steps

Cleanup steps register resources to be deleted after the test completes.

### Register DELETE Cleanup

```gherkin
Given I register cleanup DELETE {string}
```

**Example:**
```gherkin
# After creating a user
When I POST "/users" with JSON body:
  """
  { "email": "test@example.com" }
  """
Then the response status should be 201
And I store the value at "id" as "userId"
Given I register cleanup DELETE "/users/{userId}"
```

### Register POST Cleanup

```gherkin
Given I register cleanup POST {string}
```

### Register PATCH Cleanup

```gherkin
Given I register cleanup PATCH {string}
```

### Register PUT Cleanup

```gherkin
Given I register cleanup PUT {string}
```

### Disable Cleanup

```gherkin
Given I disable cleanup
```

Prevents cleanup from running for the current scenario. Useful when you want to inspect data after test failure.

## Feature Flag Steps

Feature flags allow conditional behavior in tests.

### Enable Flag

```gherkin
Given the feature flag {string} is enabled
```

**Example:**
```gherkin
Given the feature flag "DARK_MODE" is enabled
Given the feature flag "NEW_CHECKOUT" is enabled
```

### Disable Flag

```gherkin
Given the feature flag {string} is disabled
```

**Example:**
```gherkin
Given the feature flag "BETA_FEATURES" is disabled
```

### Set Flag Value

```gherkin
Given the feature flag {string} is set to {string}
```

**Example:**
```gherkin
Given the feature flag "MAX_ITEMS" is set to "100"
Given the feature flag "THEME" is set to "dark"
```

### Enable Multiple Flags

```gherkin
Given the following feature flags are enabled:
  | Flag           |
  | DARK_MODE      |
  | NEW_CHECKOUT   |
  | BETA_FEATURES  |
```

### Disable Multiple Flags

```gherkin
Given the following feature flags are disabled:
  | Flag           |
  | LEGACY_MODE    |
  | OLD_DASHBOARD  |
```

### Assert Flag State

```gherkin
Then the feature flag {string} should be enabled
Then the feature flag {string} should be disabled
```

**Example:**
```gherkin
Then the feature flag "DARK_MODE" should be enabled
Then the feature flag "LEGACY_MODE" should be disabled
```

### Log All Flags

```gherkin
Then I log all feature flags
```

Prints all current feature flag states to console.

## World State

The World object stores test state:

```typescript
type World = {
  vars: Record<string, string>;      // Test variables
  headers: Record<string, string>;   // HTTP headers
  cleanup: CleanupItem[];            // Cleanup registrations
  skipCleanup?: boolean;             // Skip cleanup flag
  
  // Last API response (populated after API calls)
  lastResponse?: APIResponse;
  lastStatus?: number;
  lastText?: string;
  lastJson?: unknown;
  lastHeaders?: Record<string, string>;
  lastContentType?: string;
};
```

## Complete Examples

### API Test with Variables and Cleanup

```gherkin
Feature: User Management

  Background:
    Given I am authenticated as an admin via API
    Given I generate a UUID and store as "runId"

  Scenario: Create user with cleanup
    Given I set variable "email" to "test-{runId}@example.com"
    When I POST "/admin/users" with JSON body:
      """
      {
        "email": "{email}",
        "name": "Test User {runId}"
      }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    Given I register cleanup DELETE "/admin/users/{userId}"
    
    # Verify the user was created
    When I GET "/admin/users/{userId}"
    Then the response status should be 200
    And the value at "email" should equal "{email}"
```

### UI Test with Variables

```gherkin
Feature: Search

  Scenario: Search with generated term
    Given I generate a UUID and store as "searchId"
    Given I set variable "searchTerm" to "product-{searchId}"
    Given I navigate to "/search"
    When I fill in "Search" with "{searchTerm}"
    And I click the button "Search"
    Then I should see text "No results for {searchTerm}"
```

### Hybrid Test with Shared State

```gherkin
Feature: User Onboarding

  Scenario: Create user via API, verify in UI
    # Setup: Generate unique data
    Given I generate a UUID and store as "testId"
    Given I set variable "userEmail" to "onboard-{testId}@test.com"
    Given I set variable "userName" to "Test User {testId}"
    
    # API: Create user
    Given I am authenticated as an admin via API
    When I POST "/admin/users" with JSON body:
      """
      {
        "email": "{userEmail}",
        "name": "{userName}"
      }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    Given I register cleanup DELETE "/admin/users/{userId}"
    
    # UI: Verify user appears
    Given I navigate to "/admin/users"
    Then I should see text "{userEmail}"
    Then I should see text "{userName}"
```

### Feature Flags Example

```gherkin
Feature: Feature Flag Testing

  Scenario: Test with feature enabled
    Given the feature flag "NEW_DASHBOARD" is enabled
    Given the feature flag "ANALYTICS" is enabled
    Given I navigate to "/dashboard"
    Then I should see text "New Dashboard"
    And I should see text "Analytics Panel"

  Scenario: Test with feature disabled
    Given the feature flag "NEW_DASHBOARD" is disabled
    Given I navigate to "/dashboard"
    Then I should see text "Classic Dashboard"
    And I should not see text "Analytics Panel"
```

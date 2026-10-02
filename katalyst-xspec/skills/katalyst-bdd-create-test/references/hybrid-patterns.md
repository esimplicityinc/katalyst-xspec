# Hybrid Test Patterns

Common patterns for hybrid testing (combining API and UI) with the Katalyst BDD framework.

## Core Principle

Hybrid tests use `@hybrid` tag to access both API and UI steps. The typical flow:
1. **Setup** - Create test data via API (fast, reliable)
2. **Test** - Verify behavior in UI (user-facing validation)
3. **Cleanup** - Remove test data via API (automatic)

## Basic Patterns

### Create via API, Verify in UI

```gherkin
@hybrid
Scenario: Create user via API, verify in admin panel
  # API: Create test data
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

### Setup Data, Test Workflow

```gherkin
@hybrid
Scenario: Test order workflow with pre-created product
  # API: Create product
  Given I am authenticated as an admin via API
  Given I generate a UUID and store as "productId"
  When I POST "/admin/products" with JSON body:
    """
    {
      "name": "Test Product {productId}",
      "price": 99.99,
      "stock": 100
    }
    """
  Then the response status should be 201
  And I store the value at "id" as "prodId"
  Given I register cleanup DELETE "/admin/products/{prodId}"
  
  # UI: Test ordering flow
  Given I am authenticated in UI as "customer"
  Given I navigate to "/products/{prodId}"
  Then I should see text "Test Product {productId}"
  When I click the button "Add to Cart"
  Then I should see text "Added to cart"
```

### Verify API Changes Reflect in UI

```gherkin
@hybrid
Scenario: API update reflects in UI
  # API: Create and update
  Given I am authenticated as an admin via API
  When I POST "/users" with JSON body:
    """
    { "name": "Original Name" }
    """
  Then the response status should be 201
  And I store the value at "id" as "userId"
  Given I register cleanup DELETE "/users/{userId}"
  
  When I PATCH "/users/{userId}" with JSON body:
    """
    { "name": "Updated Name" }
    """
  Then the response status should be 200
  
  # UI: Verify update is visible
  Given I navigate to "/users/{userId}"
  Then I should see text "Updated Name"
  And I should not see text "Original Name"
```

## Variable Sharing Patterns

### Share IDs Between Layers

```gherkin
@hybrid
Scenario: Use API-created ID in UI navigation
  # API: Create resource
  Given I am authenticated as an admin via API
  When I POST "/projects" with JSON body:
    """
    { "name": "Test Project" }
    """
  Then the response status should be 201
  And I store the value at "id" as "projectId"
  Given I register cleanup DELETE "/projects/{projectId}"
  
  # UI: Navigate using ID
  Given I navigate to "/projects/{projectId}"
  Then I should see text "Test Project"
  And the URL should contain "/projects/{projectId}"
```

### Share Data Between Layers

```gherkin
@hybrid
Scenario: Verify API data in UI
  # Setup variables
  Given I generate a UUID and store as "runId"
  Given I set variable "testEmail" to "hybrid-{runId}@test.com"
  Given I set variable "testName" to "Hybrid User {runId}"
  
  # API: Create with variables
  Given I am authenticated as an admin via API
  When I POST "/users" with JSON body:
    """
    {
      "email": "{testEmail}",
      "name": "{testName}"
    }
    """
  Then the response status should be 201
  And I store the value at "id" as "userId"
  Given I register cleanup DELETE "/users/{userId}"
  
  # UI: Verify same variables
  Given I navigate to "/users/{userId}"
  Then I should see text "{testEmail}"
  Then I should see text "{testName}"
```

## Authentication Patterns

### Separate API and UI Auth

```gherkin
@hybrid
Scenario: Different auth for API vs UI
  # API: Admin creates data
  Given I am authenticated as an admin via API
  When I POST "/admin/announcements" with JSON body:
    """
    { "message": "Test announcement", "audience": "all" }
    """
  Then the response status should be 201
  And I store the value at "id" as "announcementId"
  Given I register cleanup DELETE "/admin/announcements/{announcementId}"
  
  # UI: Regular user sees announcement
  Given I am authenticated in UI as "user"
  Given I navigate to "/dashboard"
  Then I should see text "Test announcement"
```

### Use API Token in UI

```gherkin
@hybrid
Scenario: Get token from API, use in UI
  # API: Login and get token
  When I POST "/auth/login" with JSON body:
    """
    { "email": "user@example.com", "password": "password" }
    """
  Then the response status should be 200
  And I store the value at "token" as "authToken"
  
  # UI: Use token for authentication
  Given I am authenticated in UI with bearer token "{authToken}"
  Given I navigate to "/profile"
  Then I should see text "My Profile"
```

## Complex Workflow Patterns

### Multi-Step Business Process

```gherkin
@hybrid
Scenario: Complete order processing workflow
  # API: Setup - Create customer and product
  Given I am authenticated as an admin via API
  Given I generate a UUID and store as "runId"
  
  When I POST "/customers" with JSON body:
    """
    { "email": "customer-{runId}@test.com" }
    """
  Then the response status should be 201
  And I store the value at "id" as "customerId"
  Given I register cleanup DELETE "/customers/{customerId}"
  
  When I POST "/products" with JSON body:
    """
    { "name": "Product {runId}", "price": 50.00 }
    """
  Then the response status should be 201
  And I store the value at "id" as "productId"
  Given I register cleanup DELETE "/products/{productId}"
  
  # UI: Customer places order
  Given I am authenticated in UI as "customer-{runId}@test.com"
  Given I navigate to "/products/{productId}"
  When I click the button "Buy Now"
  Then I should see text "Order Confirmation"
  And I store the current URL as "orderUrl"
  
  # API: Verify order created
  When I GET "/customers/{customerId}/orders"
  Then the response status should be 200
  And the response should be a JSON array
```

### Data Synchronization Test

```gherkin
@hybrid
Scenario: Real-time sync between API and UI
  Given I am authenticated as an admin via API
  Given I generate a UUID and store as "runId"
  
  # API: Create initial data
  When I POST "/messages" with JSON body:
    """
    { "content": "Message {runId}" }
    """
  Then the response status should be 201
  And I store the value at "id" as "messageId"
  Given I register cleanup DELETE "/messages/{messageId}"
  
  # UI: Open page to watch for updates
  Given I am authenticated in UI as "user"
  Given I navigate to "/messages"
  Then I should see text "Message {runId}"
  
  # API: Update data
  When I PATCH "/messages/{messageId}" with JSON body:
    """
    { "content": "Updated Message {runId}" }
    """
  Then the response status should be 200
  
  # UI: Verify update (may need to refresh or wait for websocket)
  When I reload the page
  Then I should see text "Updated Message {runId}"
```

## State Management Patterns

### Clean State Between Tests

```gherkin
@hybrid
Feature: User Settings
  
  Background:
    Given I am authenticated as an admin via API
    Given I generate a UUID and store as "testId"
    
    # Create fresh user for each test
    When I POST "/users" with JSON body:
      """
      { "email": "settings-{testId}@test.com" }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    Given I register cleanup DELETE "/users/{userId}"

  Scenario: Update notification settings
    Given I navigate to "/users/{userId}/settings"
    When I click the "Notifications" tab
    And I click the element "#email-notifications"
    And I click the button "Save"
    Then I should see text "Settings saved"
    
    # Verify via API
    When I GET "/users/{userId}/settings"
    Then the value at "notifications.email" should equal "true"

  Scenario: Update privacy settings
    # Uses fresh user from Background
    Given I navigate to "/users/{userId}/settings"
    When I click the "Privacy" tab
    # ... test privacy settings
```

### Seed Multiple Resources

```gherkin
@hybrid
Scenario: Dashboard with multiple data types
  Given I am authenticated as an admin via API
  Given I generate a UUID and store as "runId"
  
  # Create multiple related resources
  When I POST "/projects" with JSON body:
    """
    { "name": "Project {runId}" }
    """
  Then the response status should be 201
  And I store the value at "id" as "projectId"
  Given I register cleanup DELETE "/projects/{projectId}"
  
  When I POST "/projects/{projectId}/tasks" with JSON body:
    """
    { "title": "Task 1" }
    """
  Then the response status should be 201
  
  When I POST "/projects/{projectId}/tasks" with JSON body:
    """
    { "title": "Task 2" }
    """
  Then the response status should be 201
  
  # UI: Verify dashboard shows all data
  Given I navigate to "/projects/{projectId}"
  Then I should see text "Project {runId}"
  And I should see text "Task 1"
  And I should see text "Task 2"
```

## Error Testing Patterns

### Test Error States

```gherkin
@hybrid
Scenario: UI shows error when API resource deleted
  # API: Create and immediately delete
  Given I am authenticated as an admin via API
  When I POST "/items" with JSON body:
    """
    { "name": "Temporary Item" }
    """
  Then the response status should be 201
  And I store the value at "id" as "itemId"
  
  When I DELETE "/items/{itemId}"
  Then the response status should be 204
  
  # UI: Try to access deleted resource
  Given I navigate to "/items/{itemId}"
  Then I should see text "Item not found"
```

## Complete Example: User Onboarding Flow

```gherkin
@hybrid
Feature: User Onboarding
  As a product owner
  I want to test the complete onboarding flow
  So that I can ensure new users have a smooth experience

  Scenario: Complete onboarding journey
    Given I generate a UUID and store as "testId"
    Given I set variable "userEmail" to "onboard-{testId}@test.com"
    Given I set variable "userName" to "New User {testId}"
    
    # Step 1: Admin creates user invitation via API
    Given I am authenticated as an admin via API
    When I POST "/admin/invitations" with JSON body:
      """
      {
        "email": "{userEmail}",
        "role": "member"
      }
      """
    Then the response status should be 201
    And I store the value at "token" as "inviteToken"
    And I store the value at "id" as "inviteId"
    Given I register cleanup DELETE "/admin/invitations/{inviteId}"
    
    # Step 2: User accepts invitation via UI
    Given I navigate to "/invite/{inviteToken}"
    Then I should see text "Welcome! Complete your profile"
    When I fill the form:
      | Field           | Value            |
      | Full Name       | {userName}       |
      | Password        | SecurePass123!   |
      | Confirm Password| SecurePass123!   |
    And I click the button "Complete Setup"
    Then I should see text "Welcome, {userName}"
    And the URL should contain "/dashboard"
    
    # Step 3: Verify user created via API
    Given I am authenticated as an admin via API
    When I GET "/admin/users?email={userEmail}"
    Then the response status should be 200
    And the value at "[0].name" should equal "{userName}"
    And I store the value at "[0].id" as "userId"
    Given I register cleanup DELETE "/admin/users/{userId}"
    
    # Step 4: User completes profile via UI
    Given I am authenticated in UI as "member" with id "{userId}"
    Given I navigate to "/profile/edit"
    When I fill in "Bio" with "I'm a new team member!"
    And I click the button "Save"
    Then I should see text "Profile updated"
    
    # Step 5: Verify profile update via API
    When I GET "/users/{userId}"
    Then the response status should be 200
    And the value at "bio" should equal "I'm a new team member!"
```

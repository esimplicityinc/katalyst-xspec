# API Test Patterns

Common patterns for API testing with the Katalyst BDD framework.

## Basic CRUD Patterns

### List Resources

```gherkin
Scenario: List all [resources]
  Given I am authenticated as an admin via API
  When I GET "/[endpoint]"
  Then the response status should be 200
  And the response should be a JSON array
```

### Get Single Resource

```gherkin
Scenario: Get [resource] by ID
  Given I am authenticated as an admin via API
  When I GET "/[endpoint]/1"
  Then the response status should be 200
  And the response should be a JSON object
  And the value at "id" should equal "1"
```

### Create Resource

```gherkin
Scenario: Create [resource]
  Given I am authenticated as an admin via API
  Given I generate a UUID and store as "runId"
  When I POST "/[endpoint]" with JSON body:
    """
    {
      "name": "Test {runId}",
      "email": "test-{runId}@example.com"
    }
    """
  Then the response status should be 201
  And I store the value at "id" as "resourceId"
  And the value at "name" should equal "Test {runId}"
  Given I register cleanup DELETE "/[endpoint]/{resourceId}"
```

### Update Resource (Full)

```gherkin
Scenario: Update [resource] with PUT
  Given I am authenticated as an admin via API
  # First create the resource
  When I POST "/[endpoint]" with JSON body:
    """
    { "name": "Original", "status": "draft" }
    """
  Then the response status should be 201
  And I store the value at "id" as "resourceId"
  Given I register cleanup DELETE "/[endpoint]/{resourceId}"
  
  # Then update it
  When I PUT "/[endpoint]/{resourceId}" with JSON body:
    """
    { "name": "Updated", "status": "published" }
    """
  Then the response status should be 200
  And the value at "name" should equal "Updated"
  And the value at "status" should equal "published"
```

### Update Resource (Partial)

```gherkin
Scenario: Partial update with PATCH
  Given I am authenticated as an admin via API
  When I PATCH "/[endpoint]/{resourceId}" with JSON body:
    """
    { "status": "active" }
    """
  Then the response status should be 200
  And the value at "status" should equal "active"
```

### Delete Resource

```gherkin
Scenario: Delete [resource]
  Given I am authenticated as an admin via API
  # Create resource to delete
  When I POST "/[endpoint]" with JSON body:
    """
    { "name": "To Delete" }
    """
  Then the response status should be 201
  And I store the value at "id" as "resourceId"
  
  # Delete it
  When I DELETE "/[endpoint]/{resourceId}"
  Then the response status should be 204
  
  # Verify it's gone
  When I GET "/[endpoint]/{resourceId}"
  Then the response status should be 404
```

## Authentication Patterns

### Admin Authentication

```gherkin
Background:
  Given I am authenticated as an admin via API
```

### User Authentication

```gherkin
Background:
  Given I am authenticated as a user via API
```

### Custom Token Authentication

```gherkin
Scenario: Use custom bearer token
  Given I set header "Authorization" to "Bearer custom-token-here"
  When I GET "/protected-endpoint"
  Then the response status should be 200
```

### Token from Variable

```gherkin
Scenario: Login and use token
  When I POST "/auth/login" with JSON body:
    """
    { "email": "user@example.com", "password": "secret" }
    """
  Then the response status should be 200
  And I store the value at "token" as "authToken"
  
  Given I set bearer token from variable "authToken"
  When I GET "/me"
  Then the response status should be 200
```

## Error Handling Patterns

### Not Found

```gherkin
Scenario: Resource not found
  Given I am authenticated as an admin via API
  When I GET "/[endpoint]/99999"
  Then the response status should be 404
```

### Validation Error

```gherkin
Scenario: Invalid data returns 400
  Given I am authenticated as an admin via API
  When I POST "/[endpoint]" with JSON body:
    """
    { "email": "not-valid-email" }
    """
  Then the response status should be 400
  And the value at "error" should contain "email"
```

### Unauthorized

```gherkin
Scenario: Unauthorized access
  # No authentication
  When I GET "/admin/users"
  Then the response status should be 401
```

### Forbidden

```gherkin
Scenario: User cannot access admin endpoint
  Given I am authenticated as a user via API
  When I GET "/admin/settings"
  Then the response status should be 403
```

## Data Extraction Patterns

### Extract Single Value

```gherkin
And I store the value at "id" as "resourceId"
And I store the value at "data.user.email" as "userEmail"
```

### Extract from Array

```gherkin
And I store the value at "items[0].id" as "firstItemId"
And I store the value at "results[0].name" as "firstName"
```

### Extract Nested Value

```gherkin
And I store the value at "response.data.attributes.name" as "attrName"
```

## Assertion Patterns

### Exact Value Match

```gherkin
Then the value at "status" should equal "active"
Then the value at "count" should equal "10"
```

### Contains

```gherkin
Then the value at "message" should contain "success"
Then the value at "email" should contain "@example.com"
```

### Pattern Match

```gherkin
Then the value at "id" should match "^[a-f0-9-]{36}$"
Then the value at "created_at" should match "^\d{4}-\d{2}-\d{2}"
```

## Complex Scenarios

### Pagination

```gherkin
Scenario: Paginated list
  Given I am authenticated as an admin via API
  When I GET "/[endpoint]?page=1&limit=10"
  Then the response status should be 200
  And the response should be a JSON object
  And the value at "data" should be a JSON array
  And the value at "meta.page" should equal "1"
  And the value at "meta.limit" should equal "10"
```

### Search/Filter

```gherkin
Scenario: Filter by status
  Given I am authenticated as an admin via API
  When I GET "/[endpoint]?status=active"
  Then the response status should be 200
  And the response should be a JSON array
```

### Bulk Operations

```gherkin
Scenario: Bulk create
  Given I am authenticated as an admin via API
  When I POST "/[endpoint]/bulk" with JSON body:
    """
    {
      "items": [
        { "name": "Item 1" },
        { "name": "Item 2" },
        { "name": "Item 3" }
      ]
    }
    """
  Then the response status should be 201
  And the value at "created" should equal "3"
```

### File Upload (Form Data)

```gherkin
Scenario: Upload file
  Given I am authenticated as an admin via API
  Given I set header "Content-Type" to "multipart/form-data"
  # Note: Actual file upload requires custom step implementation
```

## Complete Example: User Management API

```gherkin
Feature: User Management API
  As an admin
  I want to manage users via API
  So that I can control system access

  Background:
    Given I am authenticated as an admin via API
    Given I generate a UUID and store as "runId"

  Scenario: Create new user
    Given I set variable "email" to "user-{runId}@test.com"
    When I POST "/admin/users" with JSON body:
      """
      {
        "email": "{email}",
        "name": "Test User {runId}",
        "role": "member",
        "department": "Engineering"
      }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    And the value at "email" should equal "{email}"
    And the value at "role" should equal "member"
    Given I register cleanup DELETE "/admin/users/{userId}"

  Scenario: Update user role
    # Setup: Create user
    When I POST "/admin/users" with JSON body:
      """
      { "email": "role-test-{runId}@test.com", "name": "Role Test" }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    Given I register cleanup DELETE "/admin/users/{userId}"
    
    # Test: Update role
    When I PATCH "/admin/users/{userId}" with JSON body:
      """
      { "role": "admin" }
      """
    Then the response status should be 200
    And the value at "role" should equal "admin"

  Scenario: Deactivate user
    # Setup: Create user
    When I POST "/admin/users" with JSON body:
      """
      { "email": "deactivate-{runId}@test.com", "name": "Deactivate Test" }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    Given I register cleanup DELETE "/admin/users/{userId}"
    
    # Test: Deactivate
    When I PATCH "/admin/users/{userId}" with JSON body:
      """
      { "status": "inactive" }
      """
    Then the response status should be 200
    And the value at "status" should equal "inactive"

  Scenario: Search users by email domain
    When I GET "/admin/users?email_contains=@test.com"
    Then the response status should be 200
    And the response should be a JSON array
```

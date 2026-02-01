# API Steps Reference

Complete reference for API steps. Available in `@api` and `@hybrid` scenarios.

## HTTP Method Steps

### GET Request

```gherkin
When I GET {string}
```

**Example:**
```gherkin
When I GET "/users"
When I GET "/users/{userId}"
```

### POST Request with JSON

```gherkin
When I POST {string} with JSON body:
  """
  { JSON content }
  """
```

**Example:**
```gherkin
When I POST "/users" with JSON body:
  """
  {
    "email": "test@example.com",
    "name": "Test User",
    "role": "member"
  }
  """
```

### PUT Request with JSON

```gherkin
When I PUT {string} with JSON body:
  """
  { JSON content }
  """
```

**Example:**
```gherkin
When I PUT "/users/{userId}" with JSON body:
  """
  {
    "name": "Updated Name"
  }
  """
```

### PATCH Request with JSON

```gherkin
When I PATCH {string} with JSON body:
  """
  { JSON content }
  """
```

**Example:**
```gherkin
When I PATCH "/users/{userId}" with JSON body:
  """
  {
    "status": "active"
  }
  """
```

### DELETE Request

```gherkin
When I DELETE {string}
```

**Example:**
```gherkin
When I DELETE "/users/{userId}"
```

## Authentication Steps

### Admin Authentication

```gherkin
Given I am authenticated as an admin via API
```

Uses `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` env variables.

### User Authentication

```gherkin
Given I am authenticated as a user via API
```

Uses `DEFAULT_USER_USERNAME` and `DEFAULT_USER_PASSWORD` env variables.

### Set Bearer Token

```gherkin
Given I set bearer token from variable {string}
```

**Example:**
```gherkin
Given I set bearer token from variable "authToken"
```

### Set Custom Header

```gherkin
Given I set header {string} to {string}
```

**Example:**
```gherkin
Given I set header "X-API-Key" to "abc123"
Given I set header "Authorization" to "Bearer {token}"
```

## Response Assertion Steps

### Assert Status Code

```gherkin
Then the response status should be {int}
```

**Example:**
```gherkin
Then the response status should be 200
Then the response status should be 201
Then the response status should be 404
```

### Assert JSON Type

```gherkin
Then the response should be a JSON array
Then the response should be a JSON object
```

### Assert JSON Value

```gherkin
Then the value at {string} should equal {string}
```

Uses JSON path syntax for nested values.

**Example:**
```gherkin
Then the value at "id" should equal "123"
Then the value at "user.name" should equal "John"
Then the value at "items[0].id" should equal "1"
Then the value at "data.users[0].email" should equal "{expectedEmail}"
```

### Assert Value Contains

```gherkin
Then the value at {string} should contain {string}
```

**Example:**
```gherkin
Then the value at "message" should contain "success"
```

### Assert Value Matches Pattern

```gherkin
Then the value at {string} should match {string}
```

**Example:**
```gherkin
Then the value at "email" should match "^[a-z]+@example\\.com$"
```

## Value Extraction Steps

### Store Response Value

```gherkin
And I store the value at {string} as {string}
```

Extracts a value from the JSON response and stores it in a variable.

**Example:**
```gherkin
And I store the value at "id" as "userId"
And I store the value at "data.token" as "authToken"
And I store the value at "items[0].id" as "firstItemId"
```

## Complete API Example

```gherkin
@api
Feature: User Management API

  Background:
    Given I am authenticated as an admin via API

  Scenario: Full CRUD lifecycle
    # Create
    Given I generate a UUID and store as "runId"
    When I POST "/admin/users" with JSON body:
      """
      {
        "email": "test-{runId}@example.com",
        "name": "Test User {runId}",
        "role": "member"
      }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    And the value at "email" should equal "test-{runId}@example.com"
    
    # Read
    When I GET "/admin/users/{userId}"
    Then the response status should be 200
    And the value at "name" should contain "Test User"
    
    # Update
    When I PATCH "/admin/users/{userId}" with JSON body:
      """
      { "name": "Updated User" }
      """
    Then the response status should be 200
    And the value at "name" should equal "Updated User"
    
    # Delete
    When I DELETE "/admin/users/{userId}"
    Then the response status should be 204
```

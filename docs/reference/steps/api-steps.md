# API Steps Reference

Complete reference for all `@api` tagged step definitions.

## Registration

```typescript
import { registerApiSteps } from '@kata/stack-tests/steps';

registerApiSteps(test);
```

This registers:
- `registerApiAuthSteps` - Authentication steps
- `registerApiHttpSteps` - HTTP request steps
- `registerApiAssertionSteps` - Response assertion steps

---

## Authentication Steps

### Given I am authenticated as an admin via API

Authenticates as admin user, setting bearer token in headers.

**Tag:** `@api`

**Behavior:**
1. POSTs credentials to login endpoint
2. Extracts `access_token` from response
3. Sets `Authorization: Bearer <token>` in world.headers

**Environment Variables:**
- `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`
- `API_AUTH_LOGIN_PATH`

**Example:**
```gherkin
@api
Scenario: Admin operation
  Given I am authenticated as an admin via API
  When I GET "/admin/users"
  Then the response status should be 200
```

---

### Given I am authenticated as a user via API

Authenticates as standard user.

**Tag:** `@api`

**Environment Variables:**
- `DEFAULT_USER_USERNAME` / `NON_ADMIN_USERNAME`
- `DEFAULT_USER_PASSWORD` / `NON_ADMIN_PASSWORD`
- `API_AUTH_LOGIN_PATH`

**Example:**
```gherkin
@api
Scenario: User operation
  Given I am authenticated as a user via API
  When I GET "/profile"
  Then the response status should be 200
```

---

### Given I set bearer token from variable {string}

Sets bearer token from a stored variable.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| varName | string | Variable containing the token |

**Example:**
```gherkin
@api
Scenario: Use stored token
  Given I set variable "token" to "eyJhbG..."
  Given I set bearer token from variable "token"
  When I GET "/protected"
  Then the response status should be 200
```

---

## HTTP Request Steps

### When I GET {string}

Sends HTTP GET request.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | URL path (supports `{variable}` interpolation) |

**Updates World:**
- `lastResponse` - Full APIResponse
- `lastStatus` - HTTP status code
- `lastText` - Response body text
- `lastJson` - Parsed JSON
- `lastHeaders` - Response headers
- `lastContentType` - Content-Type header

**Example:**
```gherkin
When I GET "/users"
When I GET "/users/{userId}"
When I GET "/search?q={searchTerm}"
```

---

### When I DELETE {string}

Sends HTTP DELETE request.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | URL path |

**Example:**
```gherkin
When I DELETE "/users/{userId}"
```

---

### When I POST {string} with JSON body:

Sends HTTP POST request with JSON body.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | URL path |
| docString | string | JSON body (supports variable interpolation) |

**Example:**
```gherkin
When I POST "/users" with JSON body:
  """
  {
    "email": "{email}",
    "name": "Test User",
    "role": "member"
  }
  """
```

---

### When I PATCH {string} with JSON body:

Sends HTTP PATCH request with JSON body.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | URL path |
| docString | string | JSON body |

**Example:**
```gherkin
When I PATCH "/users/{userId}" with JSON body:
  """
  {
    "name": "Updated Name"
  }
  """
```

---

### When I PUT {string} with JSON body:

Sends HTTP PUT request with JSON body.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | URL path |
| docString | string | JSON body |

**Example:**
```gherkin
When I PUT "/users/{userId}" with JSON body:
  """
  {
    "email": "new@example.com",
    "name": "New Name"
  }
  """
```

---

## Response Assertion Steps

### Then the response status should be {int}

Asserts the HTTP status code.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| status | int | Expected status code |

**Example:**
```gherkin
Then the response status should be 200
Then the response status should be 201
Then the response status should be 204
Then the response status should be 404
```

---

### Then the response should be a JSON array

Asserts response is a JSON array.

**Tag:** `@api`

**Example:**
```gherkin
When I GET "/users"
Then the response status should be 200
Then the response should be a JSON array
```

---

### Then the response should be a JSON object

Asserts response is a JSON object.

**Tag:** `@api`

**Example:**
```gherkin
When I GET "/users/1"
Then the response status should be 200
Then the response should be a JSON object
```

---

### Then the value at {string} should equal {string}

Asserts a value at a JSONPath equals expected.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | JSONPath expression |
| expected | string | Expected value (supports interpolation) |

**Path Syntax:**
- `prop` - Direct property
- `prop.nested` - Nested property
- `arr[0]` - Array index
- `arr[0].prop` - Combined

**Example:**
```gherkin
Then the value at "email" should equal "test@example.com"
Then the value at "user.name" should equal "John"
Then the value at "items[0].id" should equal "1"
Then the value at "id" should equal "{expectedId}"
```

---

### Then I store the value at {string} as {string}

Stores a response value in a variable.

**Tag:** `@api`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | JSONPath expression |
| varName | string | Variable name to store in |

**Example:**
```gherkin
Then I store the value at "id" as "userId"
Then I store the value at "data.token" as "accessToken"
Then I store the value at "items[0].id" as "firstItemId"
```

---

## Complete Example

```gherkin
@api
Feature: User API

  Background:
    Given I am authenticated as an admin via API

  Scenario: Complete CRUD flow
    # Generate unique email
    Given I generate a UUID and store as "uuid"
    Given I set variable "email" to "test-{uuid}@example.com"
    
    # Create
    When I POST "/users" with JSON body:
      """
      {
        "email": "{email}",
        "name": "Test User",
        "role": "member"
      }
      """
    Then the response status should be 201
    And the response should be a JSON object
    And I store the value at "id" as "userId"
    And the value at "email" should equal "{email}"
    
    # Read
    When I GET "/users/{userId}"
    Then the response status should be 200
    And the value at "name" should equal "Test User"
    
    # Update
    When I PATCH "/users/{userId}" with JSON body:
      """
      {
        "name": "Updated User"
      }
      """
    Then the response status should be 200
    And the value at "name" should equal "Updated User"
    
    # Delete
    When I DELETE "/users/{userId}"
    Then the response status should be 204

  Scenario: List users
    When I GET "/users"
    Then the response status should be 200
    And the response should be a JSON array

  Scenario: Handle not found
    When I GET "/users/nonexistent-id"
    Then the response status should be 404
```

---

## Related Topics

- [API Testing Guide](../../guides/api-testing.md) - Usage patterns
- [World State](../../concepts/world-state.md) - Variable management
- [Shared Steps](./shared-steps.md) - Variable and cleanup steps

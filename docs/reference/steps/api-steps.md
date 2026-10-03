# API Steps Reference

Complete reference for the API step definitions. Like all built-in steps, they are untagged and work in any scenario, including alongside UI steps.

## Registration

```typescript
import { registerApiSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerApiSteps(test);
```

This registers:
- `registerApiAuthSteps` - Authentication steps
- `registerApiHttpSteps` - HTTP request steps
- `registerApiAssertionSteps` - Response assertion steps

---

## Authentication Steps

### Given I am authenticated as {string} via API

Logs in to the API as a named role. Later API steps in the scenario send the token (or session cookie).

See the [Authentication guide](../../guides/authentication.md) for all settings.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| role | string | Any role name, e.g. `admin`, `pm`. Supports `{var}` interpolation. |

**Behavior:**
1. Reads `AUTH_<ROLE>_USERNAME` / `AUTH_<ROLE>_PASSWORD` (or `roles` passed to `UniversalAuthAdapter`)
2. POSTs them to `API_AUTH_LOGIN_PATH` (default `/auth/login`) as a form, or JSON with `API_AUTH_BODY=json`
3. Reads the token from the response (`API_AUTH_TOKEN_PATH`, default `access_token`, `token`, ...) and sets `Authorization: Bearer <token>` in `world.headers`. If there's no token but a cookie was set, the cookie session is used.

If credentials are missing, the step fails with a message naming the variables to set. A failed login fails with the status, the response, and the settings to check.

**Environment Variables:**
- `AUTH_<ROLE>_USERNAME` / `AUTH_<ROLE>_PASSWORD`
- `API_AUTH_LOGIN_PATH`, `API_AUTH_BODY`, `API_AUTH_USERNAME_FIELD`, `API_AUTH_PASSWORD_FIELD`, `API_AUTH_TOKEN_PATH`

**Example:**
```gherkin
Scenario: Project manager lists projects
  Given I am authenticated as "pm" via API
  When I GET "/projects"
  Then the response status should be 200
```

---

### Given I am authenticated as an admin via API

Shorthand for `Given I am authenticated as "admin" via API`.

**Environment Variables:**
- `AUTH_ADMIN_USERNAME` / `AUTH_ADMIN_PASSWORD` (older `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` also work)

**Example:**
```gherkin
Scenario: Admin operation
  Given I am authenticated as an admin via API
  When I GET "/admin/users"
  Then the response status should be 200
```

---

### Given I am authenticated as a user via API

Shorthand for `Given I am authenticated as "user" via API`.

**Environment Variables:**
- `AUTH_USER_USERNAME` / `AUTH_USER_PASSWORD` (older `DEFAULT_USER_*` / `NON_ADMIN_*` also work)

**Example:**
```gherkin
Scenario: User operation
  Given I am authenticated as a user via API
  When I GET "/profile"
  Then the response status should be 200
```

---

### Given I set bearer token from variable {string}

Sets bearer token from a stored variable.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| varName | string | Variable containing the token |

**Example:**
```gherkin
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

**Example:**
```gherkin
When I GET "/users"
Then the response status should be 200
Then the response should be a JSON array
```

---

### Then the response should be a JSON object

Asserts response is a JSON object.

**Example:**
```gherkin
When I GET "/users/1"
Then the response status should be 200
Then the response should be a JSON object
```

---

### Then the value at {string} should equal {string}

Asserts a value at a JSONPath equals expected.

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
Feature: User API

  Background:
    Given I am authenticated as "admin" via API

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

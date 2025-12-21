# Shared Steps Reference

Complete reference for shared step definitions (variables and cleanup).

## Registration

```typescript
import { registerSharedSteps } from '@kata/stack-tests/steps';

registerSharedSteps(test);
```

This registers:
- `registerSharedVarSteps` - Variable management
- `registerSharedCleanupSteps` - Cleanup registration

---

## Variable Steps

These steps are available in all scenarios (no tag restriction).

### Given I set variable {string} to {string}

Sets a variable value.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| name | string | Variable name |
| value | string | Variable value (supports interpolation) |

**Example:**
```gherkin
Given I set variable "userId" to "123"
Given I set variable "email" to "user-{uuid}@test.com"
```

---

### Given I generate a UUID and store as {string}

Generates a UUID and stores it.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| name | string | Variable name |

**Example:**
```gherkin
Given I generate a UUID and store as "uniqueId"
# uniqueId = "550e8400-e29b-41d4-a716-446655440000"
```

---

### Given I set header {string} to {string}

Sets a request header.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| name | string | Header name |
| value | string | Header value (supports interpolation) |

**Example:**
```gherkin
Given I set header "X-API-Key" to "my-api-key"
Given I set header "Authorization" to "Bearer {token}"
Given I set header "X-Request-ID" to "{requestId}"
```

---

### Given I disable cleanup

Disables automatic cleanup for this scenario.

**Example:**
```gherkin
Given I disable cleanup
# Resources created won't be cleaned up after test
```

---

## Cleanup Steps

These steps are available in all scenarios (no tag restriction).

### Given I register cleanup DELETE {string}

Registers a DELETE cleanup action.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | Cleanup path (supports interpolation) |

**Example:**
```gherkin
Given I register cleanup DELETE "/users/{userId}"
```

---

### Given I register cleanup POST {string}

Registers a POST cleanup action.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | Cleanup path |

**Example:**
```gherkin
Given I register cleanup POST "/users/{userId}/deactivate"
```

---

### Given I register cleanup PATCH {string}

Registers a PATCH cleanup action.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | Cleanup path |

**Example:**
```gherkin
Given I register cleanup PATCH "/users/{userId}/reset"
```

---

### Given I register cleanup PUT {string}

Registers a PUT cleanup action.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | Cleanup path |

**Example:**
```gherkin
Given I register cleanup PUT "/users/{userId}/restore"
```

---

## Variable Usage

### In API Paths

```gherkin
Given I set variable "userId" to "123"
When I GET "/users/{userId}"
# Actual: GET /users/123
```

### In Request Bodies

```gherkin
Given I set variable "email" to "test@example.com"
When I POST "/users" with JSON body:
  """
  {
    "email": "{email}",
    "name": "Test"
  }
  """
```

### In Assertions

```gherkin
Given I set variable "expectedStatus" to "active"
Then the value at "status" should equal "{expectedStatus}"
```

### Chained Variables

```gherkin
Given I generate a UUID and store as "uuid"
Given I set variable "email" to "user-{uuid}@test.com"
# email = "user-550e8400-e29b-41d4-a716-446655440000@test.com"
```

---

## Cleanup Behavior

### Execution Order

Cleanup items are executed in **reverse order** (LIFO):

```gherkin
# Registration order
Given I register cleanup DELETE "/teams/{teamId}"      # Registered 1st
Given I register cleanup DELETE "/users/{userId}"      # Registered 2nd

# Execution order (reversed)
# 1. DELETE /users/{userId}
# 2. DELETE /teams/{teamId}
```

### Admin Authentication

Cleanup requests are authenticated with admin credentials:
- Uses `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD`
- Token is cached across tests
- Refreshes on 401/403

### Error Handling

- Cleanup errors are logged but don't fail the test
- 404 responses are ignored (resource already deleted)
- All cleanup items are attempted even if some fail

---

## Complete Example

```gherkin
@api
Feature: User Management with Cleanup

  Scenario: Create and cleanup user
    # Setup unique data
    Given I generate a UUID and store as "testId"
    Given I set variable "email" to "test-{testId}@example.com"
    
    # Custom header
    Given I set header "X-Test-ID" to "{testId}"
    
    # Create resource
    Given I am authenticated as an admin via API
    When I POST "/users" with JSON body:
      """
      {
        "email": "{email}",
        "name": "Test User"
      }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    
    # Register cleanup
    Given I register cleanup DELETE "/users/{userId}"
    
    # Test operations...
    When I GET "/users/{userId}"
    Then the response status should be 200
    
    # Cleanup runs automatically after test

  Scenario: Debug without cleanup
    Given I disable cleanup
    Given I am authenticated as an admin via API
    
    When I POST "/users" with JSON body:
      """
      { "email": "debug@test.com" }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    
    # Resource remains for inspection
```

---

## Best Practices

### Always Register Cleanup

```gherkin
# Good - explicit cleanup
When I POST "/users" with JSON body: ...
Then I store the value at "id" as "userId"
Given I register cleanup DELETE "/users/{userId}"

# Also good - DefaultCleanupAdapter auto-registers
# based on variable naming patterns
```

### Use Unique Identifiers

```gherkin
# Good - unique data
Given I generate a UUID and store as "uuid"
Given I set variable "email" to "test-{uuid}@example.com"

# Avoid - may conflict with other tests
Given I set variable "email" to "test@example.com"
```

### Meaningful Variable Names

```gherkin
# Good - descriptive
Then I store the value at "id" as "createdUserId"
Then I store the value at "token" as "adminAccessToken"

# Avoid - ambiguous
Then I store the value at "id" as "id"
Then I store the value at "token" as "t"
```

### Organize Related Cleanup

```gherkin
# Create parent first
When I POST "/teams" with JSON body: { "name": "Team A" }
Then I store the value at "id" as "teamId"

# Create child
When I POST "/teams/{teamId}/members" with JSON body: { "userId": "123" }
Then I store the value at "id" as "memberId"

# Register cleanup (child first due to LIFO)
Given I register cleanup DELETE "/teams/{teamId}/members/{memberId}"
Given I register cleanup DELETE "/teams/{teamId}"
```

---

## Environment Variables

These affect cleanup behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `CLEANUP_ALLOW_ALL` | `'false'` | Enable heuristic cleanup |
| `CLEANUP_RULES` | - | JSON array of custom rules |

---

## Related Topics

- [World State](../../concepts/world-state.md) - State management
- [Test Lifecycle](../../concepts/test-lifecycle.md) - Cleanup execution
- [API Testing Guide](../../guides/api-testing.md) - Using variables

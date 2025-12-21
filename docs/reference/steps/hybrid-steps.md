# Hybrid Steps Reference

Complete reference for `@hybrid` tagged step definitions.

## Registration

```typescript
import { registerHybridSuite } from '@kata/stack-tests/steps';

registerHybridSuite(test);
```

---

## Available Steps

### Given I navigate to interpolated path {string}

Navigates to a path with variable interpolation.

**Tag:** `@hybrid`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | URL path with `{variable}` placeholders |

**Example:**
```gherkin
@hybrid
Scenario: Navigate with variables
  Given I set variable "userId" to "123"
  Given I navigate to interpolated path "/users/{userId}/profile"
```

---

## Using Hybrid Tests

Hybrid tests combine API and UI steps in the same scenario. All `@api` and `@ui` steps are available in `@hybrid` scenarios.

### Available Step Types

When using `@hybrid` tag, you have access to:

| Category | Examples |
|----------|----------|
| **API Auth** | `Given I am authenticated as an admin via API` |
| **API HTTP** | `When I GET {string}`, `When I POST {string} with JSON body:` |
| **API Assertions** | `Then the response status should be {int}` |
| **UI Navigation** | `Given I navigate to {string}` |
| **UI Interaction** | `When I click the button {string}` |
| **UI Assertions** | `Then I should see text {string}` |
| **Shared** | `Given I set variable {string} to {string}` |

---

## Common Patterns

### API Setup, UI Verify

```gherkin
@hybrid
Scenario: Create user via API, verify in UI
  # API Setup
  Given I am authenticated as an admin via API
  When I POST "/users" with JSON body:
    """
    { "email": "test@example.com", "name": "Test User" }
    """
  Then the response status should be 201
  And I store the value at "id" as "userId"
  
  # UI Verification
  Given I navigate to "/admin/users"
  Then I should see text "test@example.com"
```

### UI Action, API Verify

```gherkin
@hybrid
Scenario: Update profile in UI, verify via API
  # UI Action
  Given I navigate to "/profile"
  When I fill the field "Name" with "New Name"
  And I click the button "Save"
  Then I should see text "Saved"
  
  # API Verification
  Given I am authenticated as a user via API
  When I GET "/profile"
  Then the response status should be 200
  And the value at "name" should equal "New Name"
```

### Authenticated Navigation

```gherkin
@hybrid
Scenario: Use API token for faster setup
  Given I am authenticated as an admin via API
  Given I navigate to interpolated path "/admin/dashboard"
  Then I should see text "Admin Dashboard"
```

---

## Variable Sharing

Variables set in API steps are available in UI steps:

```gherkin
@hybrid
Scenario: Share data between layers
  # Set via API
  Given I am authenticated as an admin via API
  When I POST "/products" with JSON body:
    """
    { "name": "Test Product", "price": 29.99 }
    """
  Then I store the value at "id" as "productId"
  
  # Use in UI
  Given I navigate to interpolated path "/products/{productId}"
  Then I should see text "Test Product"
```

---

## Complete Example

```gherkin
@hybrid
Feature: Order Management

  Scenario: Complete order workflow
    # 1. Create product via API
    Given I am authenticated as an admin via API
    When I POST "/products" with JSON body:
      """
      { "name": "Widget", "price": 19.99, "stock": 100 }
      """
    Then the response status should be 201
    And I store the value at "id" as "productId"
    
    # 2. Place order via UI
    Given I navigate to interpolated path "/products/{productId}"
    Then I should see text "Widget"
    When I click the button "Add to Cart"
    And I navigate to "/cart"
    And I click the button "Checkout"
    And I fill the field "Name" with "John Doe"
    And I fill the field "Address" with "123 Main St"
    And I click the button "Place Order"
    Then I should see text "Order Confirmed"
    
    # Extract order ID
    When I save the current URL as "orderUrl"
    When I get a part of the URL based on "/orders/(\d+)" regular expression and save it as "orderId"
    
    # 3. Verify order via API
    When I GET "/orders/{orderId}"
    Then the response status should be 200
    And the value at "status" should equal "confirmed"
    
    # 4. Admin ships order via API
    When I PATCH "/admin/orders/{orderId}" with JSON body:
      """
      { "status": "shipped" }
      """
    Then the response status should be 200
    
    # 5. Customer sees update in UI
    Given I navigate to interpolated path "/orders/{orderId}"
    Then I should see text "Shipped"
```

---

## Best Practices

### Use API for Setup

```gherkin
@hybrid
Background:
  # Fast setup via API
  Given I am authenticated as an admin via API
  When I POST "/test-data/reset" with JSON body:
    """
    {}
    """
```

### Verify Critical Paths in Both Layers

```gherkin
@hybrid
Scenario: Verify deletion
  # Delete via UI
  Given I navigate to "/users/{userId}"
  When I click the button "Delete"
  And I click the button "Confirm"
  Then I should see text "User deleted"
  
  # Verify via API
  When I GET "/users/{userId}"
  Then the response status should be 404
```

### Clear Layer Transitions

```gherkin
@hybrid
Scenario: Clear documentation
  # === API Setup ===
  Given I am authenticated as an admin via API
  When I POST "/users" with JSON body: ...
  
  # === UI Testing ===
  Given I navigate to "/users"
  Then I should see text "..."
  
  # === API Verification ===
  When I GET "/users/{userId}"
  Then the response status should be 200
```

---

## Related Topics

- [Hybrid Testing Guide](../../guides/hybrid-testing.md) - Detailed patterns
- [API Steps](./api-steps.md) - API step reference
- [UI Steps](./ui-steps.md) - UI step reference
- [Shared Steps](./shared-steps.md) - Variable management

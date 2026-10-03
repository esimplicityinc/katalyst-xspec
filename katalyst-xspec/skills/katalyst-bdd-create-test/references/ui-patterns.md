# UI Test Patterns

Common patterns for UI testing with the Katalyst BDD framework.

## Navigation Patterns

### Basic Navigation

```gherkin
Scenario: Navigate to page
  Given I navigate to "/dashboard"
  Then I should see text "Dashboard"
  And the URL should contain "/dashboard"
```

### Navigation with Auth

```gherkin
Scenario: Navigate after login
  Given I am authenticated in UI as "user"
  Given I navigate to "/profile"
  Then I should see text "My Profile"
```

### Back Navigation

```gherkin
Scenario: Go back to previous page
  Given I navigate to "/page1"
  When I click the link "Go to Page 2"
  Then the URL should contain "/page2"
  When I go back in the browser
  Then the URL should contain "/page1"
```

## Login Patterns

### Log in as a Role (real login form, session reused)

```gherkin
Scenario: Project manager dashboard
  Given I am logged in as "pm"
  Given I navigate to "/dashboard"
  Then I should see text "Projects"
```

Uses `AUTH_PM_USERNAME` / `AUTH_PM_PASSWORD` and the `UI_LOGIN_*` settings. Use `When I log in as "pm" in UI` when testing the login itself (always submits the form).

### Simple Login Form

```gherkin
Scenario: User login
  Given I navigate to "/login"
  When I fill in "Email" with "user@example.com"
  And I fill in "Password" with "password123"
  And I click the button "Sign In"
  Then I should see text "Welcome"
  And the URL should contain "/dashboard"
```

### Login with Fetch Intercept (Bypassing Auth)

```gherkin
Scenario: Test page as authenticated user
  Given I am authenticated in UI as "admin"
  Given I navigate to "/admin/dashboard"
  Then I should see text "Admin Dashboard"
```

### Login with Specific Roles

```gherkin
Scenario: Test with multiple roles
  Given I am authenticated in UI as "admin,manager,editor"
  Given I navigate to "/settings"
  Then I should see text "Admin Settings"
  And I should see text "Manager Settings"
```

### Login with Tenant

```gherkin
Scenario: Multi-tenant login
  Given I am authenticated in UI as "admin" for tenant "acme-corp"
  Given I navigate to "/dashboard"
  Then I should see text "ACME Corp Dashboard"
```

## Form Patterns

### Simple Form Fill

```gherkin
Scenario: Fill contact form
  Given I navigate to "/contact"
  When I fill in "Name" with "John Doe"
  And I fill in "Email" with "john@example.com"
  And I fill in "Message" with "Hello, this is a test message."
  And I click the button "Send"
  Then I should see text "Message sent"
```

### Form with Data Table

```gherkin
Scenario: Fill registration form
  Given I navigate to "/register"
  When I fill the form:
    | Field          | Value                |
    | First Name     | John                 |
    | Last Name      | Doe                  |
    | Email          | john.doe@example.com |
    | Password       | SecurePass123!       |
    | Confirm Password | SecurePass123!     |
  And I click the button "Register"
  Then I should see text "Account created"
```

### Form with Dropdowns

```gherkin
Scenario: Fill form with dropdown
  Given I navigate to "/settings"
  When I fill in "Display Name" with "John"
  And I select "Dark" from dropdown "Theme"
  And I select "English" from dropdown "Language"
  And I click the button "Save"
  Then I should see text "Settings saved"
```

### Clear and Fill Form

```gherkin
Scenario: Update existing form data
  Given I navigate to "/profile/edit"
  When I clear and fill the form:
    | Field    | Value           |
    | Name     | Updated Name    |
    | Bio      | Updated bio     |
  And I click the button "Save"
  Then I should see text "Profile updated"
```

### Form Validation

```gherkin
Scenario: Form shows validation errors
  Given I navigate to "/register"
  When I fill in "Email" with "invalid-email"
  And I click the button "Register"
  Then I should see text "Invalid email format"
  And the element ".error-message" should be visible
```

## Click Patterns

### Click Button

```gherkin
When I click the button "Submit"
When I click the "Save" button
```

### Click Link

```gherkin
When I click the link "Learn More"
When I click the link "Terms of Service"
```

### Click Element by Selector

```gherkin
When I click the element "#submit-btn"
When I click the element ".menu-item.active"
```

### Click Element with Text

```gherkin
When I "click" the "button" element that contains "Save Changes"
When I "force click" the "first" element with "test ID" "action-btn"
```

### Conditional Click

```gherkin
When If its visible, I "click" the "first" element with "text" "Dismiss"
When If its visible, I "click" the "first" element with "role" "button"
```

## Assertion Patterns

### Text Assertions

```gherkin
Then I should see text "Welcome"
Then I should see text "User {userName}"
Then I should not see text "Error"
```

### URL Assertions

```gherkin
Then the URL should contain "/dashboard"
Then I should be on page "/users"
Then I verify if the URL "equals" "https://example.com/home"
Then I verify if the URL "doesntContain" "error"
```

### Element Visibility

```gherkin
Then the element "#modal" should be visible
Then the element ".error" should not be visible
Then I verify that a "button" element with "Submit" text "is" visible
```

### Element State

```gherkin
Then I verify that "first" element with "test ID" "submit" is "enabled"
Then I verify that "first" element with "label" "Email" is "editable"
Then the element "#terms" should be checked
Then the element "#newsletter" should not be checked
```

### Element Value

```gherkin
Then the element "#email" should have value "test@example.com"
Then the element "#quantity" should have value "5"
```

### Wait for State Change

```gherkin
Then I verify that "first" element with "text" "Loading" becomes "hidden" during "5" seconds
Then I verify that "first" element with "test ID" "result" becomes "visible" during "3" seconds
```

## Modal/Dialog Patterns

### Modal Interaction

```gherkin
Scenario: Confirm deletion in modal
  Given I navigate to "/items"
  When I click the button "Delete"
  Then I should see a modal dialog
  And I should see text "Are you sure?"
  When I click the button "Confirm"
  Then I should not see a modal dialog
  And I should see text "Item deleted"
```

### Cancel Modal

```gherkin
Scenario: Cancel modal
  Given I navigate to "/items"
  When I click the button "Delete"
  Then I should see a modal dialog
  When I click the button "Cancel"
  Then I should not see a modal dialog
```

## Tab/Navigation Patterns

### Tab Interaction

```gherkin
Scenario: Switch between tabs
  Given I navigate to "/settings"
  Then the "General" tab should be active
  When I click the "Security" tab
  Then the "Security" tab should be active
  And I should see text "Password Settings"
```

### Sidebar Navigation

```gherkin
Scenario: Sidebar navigation
  Given I navigate to "/app"
  Then the sidebar should be visible
  When I click the link "Reports"
  Then the URL should contain "/reports"
```

## Responsive Testing

### Test Mobile View

```gherkin
Scenario: Mobile navigation
  Given the viewport is "mobile" size
  Given I navigate to "/home"
  Then the sidebar should be hidden
  When I click the button "Menu"
  Then the sidebar should be visible
```

### Test Custom Viewport

```gherkin
Scenario: Test at specific resolution
  Given the viewport is 1920x1080
  Given I navigate to "/dashboard"
  Then I should see a split view layout
```

## Wait Patterns

### Fixed Wait

```gherkin
When I click the button "Submit"
Then I wait "2" seconds
Then I should see text "Success"
```

### Wait for Page Load

```gherkin
When I click the link "Heavy Page"
Then I wait for the page to load
Then I should see text "Content Loaded"
```

## Debug Patterns

### Pause for Manual Inspection

```gherkin
When I pause for debugging
```

### Take Screenshot

```gherkin
When I save a screenshot as "login-page"
When I save a full page screenshot as "dashboard-full"
```

### Log Information

```gherkin
Then I log the current URL
Then I log the page title
Then I print visible text
Then I log all cookies
```

## Complete Example: E-commerce Checkout

```gherkin
Feature: Checkout Flow
  As a customer
  I want to complete checkout
  So that I can purchase products

  Background:
    Given I am authenticated in UI as "customer"

  Scenario: Complete checkout process
    # Add item to cart
    Given I navigate to "/products/widget-123"
    When I select "2" from dropdown "Quantity"
    And I click the button "Add to Cart"
    Then I should see text "Added to cart"
    
    # Go to cart
    When I click the link "Cart"
    Then I should see text "Shopping Cart"
    And I should see text "Widget"
    And I should see text "Qty: 2"
    
    # Proceed to checkout
    When I click the button "Checkout"
    Then I should see text "Shipping Information"
    
    # Fill shipping info
    When I fill the form:
      | Field    | Value           |
      | Address  | 123 Main St     |
      | City     | Springfield     |
      | Zip      | 12345           |
    And I click the button "Continue"
    Then I should see text "Payment Information"
    
    # Fill payment info
    When I fill in "Card Number" with "4111111111111111"
    And I fill in "Expiry" with "12/25"
    And I fill in "CVV" with "123"
    And I click the button "Place Order"
    
    # Confirm order
    Then I should see text "Order Confirmed"
    And the URL should contain "/order-confirmation"

  Scenario: Apply discount code
    Given I navigate to "/cart"
    When I fill in "Discount Code" with "SAVE20"
    And I click the button "Apply"
    Then I should see text "20% discount applied"
```

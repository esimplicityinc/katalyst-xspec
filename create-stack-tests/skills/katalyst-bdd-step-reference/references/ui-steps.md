# UI Steps Reference

Complete reference for UI steps. Available in `@ui` and `@hybrid` scenarios.

## Navigation Steps

### Navigate to Path

```gherkin
Given I navigate to {string}
Given I open {string} page
Given I open {string} in the browser
```

**Example:**
```gherkin
Given I navigate to "/login"
Given I navigate to "/users/{userId}/profile"
Given I open "/dashboard" page
```

### Browser Navigation

```gherkin
When I go back in the browser
When I reload the page
```

### Save Current URL

```gherkin
When I save the current URL as {string}
```

**Example:**
```gherkin
When I save the current URL as "currentPage"
```

### Extract URL Part

```gherkin
When I get a part of the URL based on {string} regular expression and save it as {string}
```

**Example:**
```gherkin
When I get a part of the URL based on "/users/(\d+)" regular expression and save it as "userId"
```

## Click Steps

### Click Button

```gherkin
When I click the button {string}
When I click the {string} button
```

**Example:**
```gherkin
When I click the button "Submit"
When I click the "Save" button
```

### Click Link

```gherkin
When I click the link {string}
```

**Example:**
```gherkin
When I click the link "Sign Up"
When I click the link "Forgot Password?"
```

### Click Element by Selector

```gherkin
When I click the element {string}
```

**Example:**
```gherkin
When I click the element "#submit-btn"
When I click the element ".menu-item"
```

### Click Element by Text/Locator

```gherkin
When I {string} the {string} element that contains {string}
When I {string} the {string} element with {string} {string}
```

Click modes: `click`, `dispatch click`, `force click`, `force dispatch click`
Locator methods: `text`, `label`, `placeholder`, `role`, `test ID`, `alternative text`, `title`, `locator`

**Example:**
```gherkin
When I "click" the "button" element that contains "Save"
When I "force click" the "first" element with "test ID" "submit-button"
When I "click" the "2nd" element with "role" "button"
```

### Conditional Click

```gherkin
When If its visible, I {string} the {string} element with {string} {string}
```

**Example:**
```gherkin
When If its visible, I "click" the "first" element with "text" "Dismiss"
```

## Form Input Steps

### Fill by Label

```gherkin
When I fill the field {string} with {string}
When I fill in {string} with {string}
```

**Example:**
```gherkin
When I fill the field "Email" with "test@example.com"
When I fill in "Password" with "secret123"
```

### Fill by Placeholder

```gherkin
When I fill the placeholder {string} with {string}
```

**Example:**
```gherkin
When I fill the placeholder "Enter your email" with "test@example.com"
```

### Select Dropdown

```gherkin
When I select {string} from dropdown {string}
Then I fill {string} into the {string} dropdown
```

**Example:**
```gherkin
When I select "Admin" from dropdown "Role"
Then I fill "United States" into the "Country" dropdown
```

### Fill Form with Data Table

```gherkin
When I fill the form:
  | Field    | Value           |
  | Email    | test@test.com   |
  | Password | secret123       |
```

```gherkin
When I fill the form with {string} locators:
  | Field      | Value    |
  | #email     | test@... |
  | #password  | secret   |
```

**Example:**
```gherkin
When I fill the form:
  | Field      | Value             |
  | First Name | John              |
  | Last Name  | Doe               |
  | Email      | john@example.com  |
```

### Clear and Fill

```gherkin
Given I clear and fill the form:
  | Field | Value |
```

### Fill and Submit

```gherkin
When I fill and submit the form:
  | Field | Value |
```

### Advanced Input

```gherkin
When I {string} {string} in the {string} element with {string} {string}
```

Actions: `type`, `fill`, `choose`

**Example:**
```gherkin
When I "type" "Hello" in the "first" element with "placeholder" "Search"
When I "fill" "test@example.com" in the "1st" element with "label" "Email"
```

## Keyboard Steps

### Type Text

```gherkin
Then I {string} {string}
```

**Example:**
```gherkin
Then I "type" "Hello World"
Then I "press" "Enter"
Then I "press" "Tab"
Then I "press" "Escape"
```

## Wait Steps

### Wait Fixed Time

```gherkin
Then I wait {string} seconds
```

**Example:**
```gherkin
Then I wait "2" seconds
Then I wait "0.5" seconds
```

### Wait for Page Load

```gherkin
Then I wait for the page to load
```

## Assertion Steps

### Assert Visible Text

```gherkin
Then I should see text {string}
```

**Example:**
```gherkin
Then I should see text "Welcome"
Then I should see text "User {userName} created"
```

### Assert URL

```gherkin
Then the URL should contain {string}
Then I should be on page {string}
Then I verify if the URL {string} {string}
```

URL modes: `contains`, `doesntContain`, `equals`

**Example:**
```gherkin
Then the URL should contain "/dashboard"
Then I should be on page "/users"
Then I verify if the URL "contains" "/success"
Then I verify if the URL "equals" "https://example.com/home"
```

### Assert New Tab URL

```gherkin
Then I verify if a new tab which URL {string} {string} opens
```

**Example:**
```gherkin
Then I verify if a new tab which URL "contains" "external-site.com" opens
```

### Assert Element Visibility

```gherkin
Then the element {string} should be visible
Then the element {string} should not be visible
Then I verify that a {string} element with {string} text {string} visible
```

**Example:**
```gherkin
Then the element "#modal" should be visible
Then the element ".error-message" should not be visible
Then I verify that a "button" element with "Submit" text "is" visible
Then I verify that a "div" element with "Error" text "is not" visible
```

### Assert Element State

```gherkin
Then I verify that {string} element with {string} {string} is {string}
Then I verify that {string} element with {string} {string} becomes {string} during {string} seconds
```

States: `visible`, `hidden`, `editable`, `disabled`, `enabled`, `read-only`

**Example:**
```gherkin
Then I verify that "first" element with "test ID" "submit-btn" is "enabled"
Then I verify that "1st" element with "label" "Email" is "editable"
Then I verify that "first" element with "text" "Loading" becomes "hidden" during "5" seconds
```

### Assert Element Value

```gherkin
Then the element {string} should have value {string}
Then the element {string} should be checked
Then the element {string} should not be checked
```

**Example:**
```gherkin
Then the element "#email" should have value "test@example.com"
Then the element "#terms" should be checked
Then the element "#newsletter" should not be checked
```

## UI Authentication Steps

### Auth with Fetch Intercept

```gherkin
Given I am authenticated in UI as {string}
Given I am authenticated in UI as {string} for tenant {string}
Given I am authenticated in UI as {string} with id {string}
Given I am authenticated in UI with bearer token {string}
```

**Example:**
```gherkin
Given I am authenticated in UI as "admin,manager"
Given I am authenticated in UI as "user" for tenant "acme-corp"
Given I am authenticated in UI as "admin" with id "user-123"
Given I am authenticated in UI with bearer token "{authToken}"
```

### Switch User

```gherkin
Given I switch UI user to {string} with id {string}
```

## Debug Steps

### Pause for Debugging

```gherkin
When I pause for debugging
```

Opens Playwright Inspector for interactive debugging.

### Logging

```gherkin
Then I log the current URL
Then I log the page title
Then I print visible text
Then I log all cookies
Then I log localStorage
```

### Screenshots

```gherkin
When I save a screenshot as {string}
When I save a full page screenshot as {string}
```

**Example:**
```gherkin
When I save a screenshot as "login-page"
When I save a full page screenshot as "full-dashboard"
```

### Capture Page Content

```gherkin
When I capture the page HTML as {string}
When I capture viewport size
Then I count elements matching {string}
Then I print browser console messages
```

### Highlight Element

```gherkin
When I highlight element {string}
```

Adds red border to element for visual debugging.

## Layout Steps

### Panel Assertions

```gherkin
Then I should see the {string} panel
Then I should not see the {string} panel
Then the {string} panel should be {string}
Then the {string} panel should be full width
Then the {string} panel should be narrow
```

### Split View

```gherkin
Then I should see a split view layout
Then I should not see a split view layout
```

### Sidebar

```gherkin
Then the sidebar should be visible
Then the sidebar should be hidden
Then the sidebar should be collapsed
```

### Modal

```gherkin
Then I should see a modal dialog
Then I should not see a modal dialog
Then I should see the {string} modal
```

### Viewport

```gherkin
Given the viewport is {string} size
Given the viewport is {int}x{int}
Then the layout should be responsive
```

Sizes: `mobile`, `tablet`, `desktop`

**Example:**
```gherkin
Given the viewport is "mobile" size
Given the viewport is 1920x1080
```

### Tabs

```gherkin
Then the {string} tab should be active
Then the {string} tab should not be active
When I click the {string} tab
```

## Zoom

```gherkin
Then I zoom to {string} in the browser
```

**Example:**
```gherkin
Then I zoom to "150" in the browser
```

## Complete UI Example

```gherkin
@ui
Feature: User Login

  Scenario: Successful login flow
    Given I navigate to "/login"
    When I fill in "Email" with "user@example.com"
    And I fill in "Password" with "password123"
    And I click the button "Sign In"
    Then I should see text "Welcome back"
    And the URL should contain "/dashboard"
    And the element "#user-menu" should be visible

  Scenario: Form validation
    Given I navigate to "/register"
    When I fill the form:
      | Field      | Value            |
      | First Name | John             |
      | Last Name  | Doe              |
      | Email      | invalid-email    |
    And I click the button "Register"
    Then I should see text "Invalid email format"
    And the element ".error-message" should be visible
```

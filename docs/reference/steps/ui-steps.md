# UI Steps Reference

Complete reference for all `@ui` tagged step definitions.

## Registration

```typescript
import { registerUiSteps } from '@kata/stack-tests/steps';

registerUiSteps(test);
```

This registers:
- `registerUiBasicSteps` - Basic UI interactions
- `registerWizardSteps` - Advanced UI interactions

---

## Navigation Steps

### Given I navigate to {string}

Navigates to a URL path.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| path | string | URL path (supports interpolation) |

**Example:**
```gherkin
Given I navigate to "/login"
Given I navigate to "/users/{userId}"
```

---

### Given I open {string} page

Opens a page by URL.

**Tag:** `@ui`

**Example:**
```gherkin
Given I open "/dashboard" page
```

---

### Given I open {string} in the browser

Opens a URL in the browser.

**Tag:** `@ui`

**Example:**
```gherkin
Given I open "https://example.com" in the browser
```

---

### When I go back in the browser

Navigates back in browser history.

**Tag:** `@ui`

**Example:**
```gherkin
When I go back in the browser
```

---

### When I reload the page

Reloads the current page.

**Tag:** `@ui`

**Example:**
```gherkin
When I reload the page
```

---

## Click Steps

### When I click the button {string}

Clicks a button by accessible name.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| name | string | Button text/name |

**Example:**
```gherkin
When I click the button "Submit"
When I click the button "Sign In"
When I click the button "{buttonName}"
```

---

### When I click the link {string}

Clicks a link by text.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| name | string | Link text |

**Example:**
```gherkin
When I click the link "Learn More"
When I click the link "Home"
```

---

### When I {string} the {string} element that contains {string}

Clicks an element containing specific text.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| clickMode | string | Click mode |
| elementType | string | HTML element type |
| text | string | Text content |

**Click Modes:** `click`, `force click`, `dispatch click`, `force dispatch click`

**Example:**
```gherkin
When I "click" the "div" element that contains "Click Me"
When I "force click" the "button" element that contains "Submit"
```

---

### When I {string} the {string} element with {string} {string}

Clicks an element by locator method.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| clickMode | string | Click mode |
| ordinal | string | Element index (1st, 2nd, etc.) |
| text | string | Locator value |
| method | string | Locator method |

**Locator Methods:** `text`, `label`, `placeholder`, `role`, `test ID`, `alternative text`, `title`, `locator`

**Example:**
```gherkin
When I "click" the "1st" element with "Submit" "text"
When I "click" the "2nd" element with "submit-btn" "test ID"
When I "force click" the "1st" element with "Email" "label"
```

---

### When I click on the top left corner of the page

Clicks at position (0, 0).

**Tag:** `@ui`

**Example:**
```gherkin
When I click on the top left corner of the page
```

---

### When If its visible, I {string} the {string} element with {string} {string}

Conditionally clicks an element if visible.

**Tag:** `@ui`

**Example:**
```gherkin
When If its visible, I "click" the "1st" element with "Dismiss" "text"
```

---

## Form Input Steps

### When I fill the placeholder {string} with {string}

Fills an input by placeholder text.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| placeholder | string | Placeholder text |
| value | string | Value to enter |

**Example:**
```gherkin
When I fill the placeholder "Enter your email" with "test@example.com"
```

---

### When I fill the field {string} with {string}

Fills an input by label.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| label | string | Field label |
| value | string | Value to enter |

**Example:**
```gherkin
When I fill the field "Email" with "test@example.com"
When I fill the field "Password" with "{password}"
```

---

### When I {string} {string} in the {string} element with {string} {string}

Performs input action on element.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| action | string | Input action |
| value | string | Value |
| ordinal | string | Element index |
| text | string | Locator value |
| method | string | Locator method |

**Actions:** `type`, `fill`, `choose`

**Example:**
```gherkin
When I "type" "hello" in the "1st" element with "search" "placeholder"
When I "fill" "test@example.com" in the "1st" element with "Email" "label"
When I "choose" "Option A" in the "1st" element with "Select..." "placeholder"
```

---

### Then I fill {string} into the {string} dropdown

Selects a dropdown option.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| value | string | Option to select |
| dropdownLabel | string | Dropdown label |

**Example:**
```gherkin
Then I fill "United States" into the "Country" dropdown
```

---

## Keyboard Steps

### Then I {string} {string}

Performs keyboard action.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| action | string | `type` or `press` |
| value | string | Text to type or key to press |

**Example:**
```gherkin
Then I "type" "hello world"
Then I "press" "Enter"
Then I "press" "Tab"
```

---

## Authentication Steps

### When I log in as admin in UI

Performs admin login through UI.

**Tag:** `@ui`

**Example:**
```gherkin
When I log in as admin in UI
```

---

### When I log in as user in UI

Performs user login through UI.

**Tag:** `@ui`

**Example:**
```gherkin
When I log in as user in UI
```

---

## URL Steps

### When I save the current URL as {string}

Stores current URL in a variable.

**Tag:** `@ui`

**Example:**
```gherkin
When I save the current URL as "startPage"
# Later...
Given I navigate to "{startPage}"
```

---

### When I get a part of the URL based on {string} regular expression and save it as {string}

Extracts URL part using regex.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| pattern | string | Regular expression |
| varName | string | Variable name |

**Example:**
```gherkin
# URL: /users/123/profile
When I get a part of the URL based on "/users/(\d+)/" regular expression and save it as "userId"
# userId = "123"
```

---

## Assertion Steps

### Then I should see text {string}

Asserts text is visible.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| text | string | Expected text |

**Example:**
```gherkin
Then I should see text "Welcome"
Then I should see text "Hello, {username}"
```

---

### Then the URL should contain {string}

Asserts URL contains substring.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| part | string | Expected URL part |

**Example:**
```gherkin
Then the URL should contain "/dashboard"
Then the URL should contain "{expectedPath}"
```

---

### Then I verify if the URL {string} {string}

Asserts URL with mode.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| mode | string | `contains`, `doesntContain`, `equals` |
| expected | string | Expected value |

**Example:**
```gherkin
Then I verify if the URL "contains" "/dashboard"
Then I verify if the URL "equals" "http://localhost:3000/home"
Then I verify if the URL "doesntContain" "/error"
```

---

### Then I verify if a new tab which URL {string} {string} opens

Asserts new tab URL.

**Tag:** `@ui`

**Example:**
```gherkin
When I click the link "Open in new tab"
Then I verify if a new tab which URL "contains" "/new-page" opens
```

---

### Then I verify that a {string} element with {string} text {string} visible

Checks element visibility by type and text.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| elementType | string | HTML element type |
| text | string | Element text |
| visibility | string | `is` or `is not` |

**Example:**
```gherkin
Then I verify that a "button" element with "Submit" text "is" visible
Then I verify that a "div" element with "Error" text "is not" visible
```

---

### Then I verify that {string} element with {string} {string} is {string}

Checks element state.

**Tag:** `@ui`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| ordinal | string | Element index |
| text | string | Locator value |
| method | string | Locator method |
| state | string | Expected state |

**States:** `visible`, `hidden`, `enabled`, `disabled`, `editable`, `read-only`

**Example:**
```gherkin
Then I verify that "1st" element with "Submit" "text" is "visible"
Then I verify that "1st" element with "Email" "label" is "editable"
Then I verify that "1st" element with "Disabled" "text" is "disabled"
```

---

### Then I verify that {string} element with {string} {string} becomes {string} during {string} seconds

Checks element state with timeout.

**Tag:** `@ui`

**Example:**
```gherkin
Then I verify that "1st" element with "Loading" "text" becomes "hidden" during "10" seconds
Then I verify that "1st" element with "Submit" "text" becomes "enabled" during "5" seconds
```

---

## Wait Steps

### Then I wait {string} seconds

Waits for specified duration.

**Tag:** `@ui`

**Example:**
```gherkin
Then I wait "2" seconds
```

---

### Then I wait for the page to load

Waits for page load states.

**Tag:** `@ui`

**Example:**
```gherkin
When I click the button "Submit"
Then I wait for the page to load
```

---

## Viewport Steps

### Then I zoom to {string} in the browser

Sets browser zoom level.

**Tag:** `@ui`

**Example:**
```gherkin
Then I zoom to "1.5" in the browser
Then I zoom to "0.75" in the browser
Then I zoom to "1" in the browser
```

---

## Complete Example

```gherkin
@ui
Feature: Login Page

  Scenario: Successful login
    Given I navigate to "/login"
    When I fill the field "Email" with "user@example.com"
    And I fill the field "Password" with "password123"
    And I click the button "Sign In"
    Then I should see text "Welcome"
    And the URL should contain "/dashboard"

  Scenario: Form validation
    Given I navigate to "/login"
    When I click the button "Sign In"
    Then I should see text "Email is required"

  Scenario: Navigation flow
    Given I navigate to "/dashboard"
    When I click the link "Settings"
    Then the URL should contain "/settings"
    When I go back in the browser
    Then the URL should contain "/dashboard"
```

---

## Related Topics

- [UI Testing Guide](../../guides/ui-testing.md) - Usage patterns
- [Hybrid Testing Guide](../../guides/hybrid-testing.md) - Combining with API
- [Shared Steps](./shared-steps.md) - Variable steps

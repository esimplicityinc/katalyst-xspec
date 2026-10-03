# TUI Steps Reference

Complete reference for the TUI (terminal) step definitions. Like all built-in steps, they are untagged and work in any scenario once registered.

## Registration

```typescript
import { registerTuiSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerTuiSteps(test);
```

This registers:
- `registerTuiBasicSteps` - Basic TUI interactions
- `registerTuiWizardSteps` - Advanced TUI interactions

---

## Lifecycle Steps

### Given I start the TUI application

Starts the TUI application and waits for ready state.

**Example:**
```gherkin
Given I start the TUI application
```

---

### Given the TUI application is running

Ensures TUI is running, starts if not.

**Example:**
```gherkin
Given the TUI application is running
```

---

### When I restart the TUI application

Restarts the TUI application.

**Example:**
```gherkin
When I restart the TUI application
```

---

### When I stop the TUI application

Stops the TUI application.

**Example:**
```gherkin
When I stop the TUI application
```

---

## Input Steps

### When I type {string}

Types text into the terminal.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| text | string | Text to type (supports interpolation) |

**Example:**
```gherkin
When I type "hello world"
When I type "{command}"
```

---

### When I type {string} slowly

Types text with 50ms delay between characters.

**Example:**
```gherkin
When I type "password123" slowly
```

---

### When I press {string}

Presses a keyboard key.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| key | string | Key name |

**Supported Keys:**
- `enter`, `tab`, `escape`, `backspace`, `delete`, `space`
- `up`, `down`, `left`, `right`
- `home`, `end`, `pageup`, `pagedown`
- `f1` through `f12`

**Example:**
```gherkin
When I press "enter"
When I press "tab"
When I press "f1"
```

---

### When I press enter

Presses the Enter key.

**Example:**
```gherkin
When I press enter
```

---

### When I press tab

Presses the Tab key.

**Example:**
```gherkin
When I press tab
```

---

### When I press escape

Presses the Escape key.

**Example:**
```gherkin
When I press escape
```

---

### When I press {string} with ctrl

Presses a key with Ctrl modifier.

**Example:**
```gherkin
When I press "c" with ctrl
When I press "s" with ctrl
```

---

### When I press {string} with alt

Presses a key with Alt modifier.

**Example:**
```gherkin
When I press "f" with alt
```

---

### When I press {string} with shift

Presses a key with Shift modifier.

**Example:**
```gherkin
When I press "tab" with shift
```

---

### When I press ctrl+{word}

Shorthand for Ctrl+key.

**Example:**
```gherkin
When I press ctrl+c
When I press ctrl+s
```

---

### When I press alt+{word}

Shorthand for Alt+key.

**Example:**
```gherkin
When I press alt+f
```

---

### When I press ctrl+shift+{word}

Combined Ctrl+Shift+key.

**Example:**
```gherkin
When I press ctrl+shift+s
```

---

## Field Input Steps

### When I fill the TUI field {string} with {string}

Fills a labeled field in the TUI.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| field | string | Field label |
| value | string | Value to enter |

**Example:**
```gherkin
When I fill the TUI field "Username" with "admin"
When I fill the TUI field "Password" with "{password}"
```

---

### When I enter {string} in the {string} field

Alternative syntax for field input.

**Example:**
```gherkin
When I enter "admin" in the "Username" field
```

---

## Selection Steps

### When I select {string}

Selects an option.

**Example:**
```gherkin
When I select "Settings"
```

---

### When I select option {string}

Alternative syntax for selection.

**Example:**
```gherkin
When I select option "Preferences"
```

---

### When I select menu item {string}

Selects a menu item.

**Example:**
```gherkin
When I select menu item "Exit"
```

---

## Navigation Steps

### When I navigate down {int} times

Presses down arrow multiple times.

**Example:**
```gherkin
When I navigate down 3 times
```

---

### When I navigate up {int} times

Presses up arrow multiple times.

**Example:**
```gherkin
When I navigate up 2 times
```

---

### When I navigate to {string} and select

Waits for text and presses Enter.

**Example:**
```gherkin
When I navigate to "Settings" and select
```

---

### When I go back

Presses Escape.

**Example:**
```gherkin
When I go back
```

---

## Mouse Steps

### When I click at position {int}, {int}

Clicks at screen coordinates.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| x | int | Column position (0-based) |
| y | int | Row position (0-based) |

**Example:**
```gherkin
When I click at position 10, 5
```

---

### When I click on {string}

Clicks on text in the terminal.

**Example:**
```gherkin
When I click on "Submit"
```

---

## Assertion Steps

### Then I should see {string}

Waits for text to appear.

**Example:**
```gherkin
Then I should see "Welcome"
Then I should see "Hello, {username}"
```

---

### Then I should see {string} in the terminal

Same as above, explicit terminal context.

**Example:**
```gherkin
Then I should see "Ready" in the terminal
```

---

### Then I should not see {string}

Asserts text is not present.

**Example:**
```gherkin
Then I should not see "Error"
```

---

### Then the screen should contain {string}

Immediate screen content check.

**Example:**
```gherkin
Then the screen should contain "Menu"
```

---

### Then the screen should match pattern {string}

Regex pattern matching.

**Example:**
```gherkin
Then the screen should match pattern "Version: \d+\.\d+\.\d+"
```

---

### Then line {int} should contain {string}

Checks specific line content.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| lineNum | int | Line number (1-based) |
| text | string | Expected text |

**Example:**
```gherkin
Then line 1 should contain "Title"
Then line 5 should contain "{expected}"
```

---

### Then the first line should contain {string}

Checks first line content.

**Example:**
```gherkin
Then the first line should contain "Application Name"
```

---

### Then the last line should contain {string}

Checks last line content.

**Example:**
```gherkin
Then the last line should contain "Status: Ready"
```

---

### Then I should see all of:

Checks multiple texts are present.

**Example:**
```gherkin
Then I should see all of:
  | Welcome          |
  | Main Menu        |
  | Press ? for help |
```

---

### Then I should not see any of:

Checks multiple texts are absent.

**Example:**
```gherkin
Then I should not see any of:
  | Error      |
  | Exception  |
  | Failed     |
```

---

## Wait Steps

### When I wait for {string}

Waits for text to appear.

**Example:**
```gherkin
When I wait for "Ready"
```

---

### When I wait for {string} for {int} seconds

Waits with explicit timeout.

**Example:**
```gherkin
When I wait for "Loading complete" for 30 seconds
```

---

### When I wait {int} seconds

Waits for specified duration.

**Example:**
```gherkin
When I wait 2 seconds
```

---

## Snapshot Steps

### Then the screen should match snapshot {string}

Compares screen to saved snapshot.

**Example:**
```gherkin
Then the screen should match snapshot "main-menu"
```

---

### Then I take a snapshot named {string}

Saves current screen as snapshot.

**Example:**
```gherkin
Then I take a snapshot named "login-screen"
```

---

## Form Steps

### When I fill the TUI form:

Fills multiple form fields from data table. (Renamed from `I fill the form:` in 0.7.0; the UI step keeps that wording.)

**Example:**
```gherkin
When I fill the TUI form:
  | field    | value            |
  | Username | admin            |
  | Password | secret           |
  | Email    | admin@example.com |
```

---

### When I submit the form

Presses Enter to submit.

**Example:**
```gherkin
When I submit the form
```

---

### When I submit the form with ctrl+s

Submits with Ctrl+S.

**Example:**
```gherkin
When I submit the form with ctrl+s
```

---

## Command Steps

### When I execute command {string}

Types command and presses Enter.

**Example:**
```gherkin
When I execute command "help"
When I execute command "list {filter}"
```

---

### When I run {string}

Same as execute command.

**Example:**
```gherkin
When I run "npm test"
```

---

## Dialog Steps

### When I confirm the dialog

Types 'y' and presses Enter.

**Example:**
```gherkin
When I confirm the dialog
```

---

### When I cancel the dialog

Types 'n' and presses Enter.

**Example:**
```gherkin
When I cancel the dialog
```

---

### When I dismiss the dialog

Presses Escape.

**Example:**
```gherkin
When I dismiss the dialog
```

---

## Application Steps

### When I quit the application

Presses 'q'.

**Example:**
```gherkin
When I quit the application
```

---

### When I force quit the application

Presses Ctrl+C.

**Example:**
```gherkin
When I force quit the application
```

---

## Utility Steps

### When I clear the terminal

Clears the screen.

**Example:**
```gherkin
When I clear the terminal
```

---

### When I resize the terminal to {int}x{int}

Resizes terminal dimensions.

**Example:**
```gherkin
When I resize the terminal to 120x40
```

---

### When I capture the screen

Stores screen in variable.

**Example:**
```gherkin
When I capture the screen
# Stored in world.vars['lastScreenCapture']
```

---

### Then I print the screen

Outputs screen to console.

**Example:**
```gherkin
Then I print the screen
```

---

## Complete Example

```gherkin
Feature: CLI Application

  Background:
    Given I start the TUI application
    And I should see "Welcome"

  Scenario: Login flow
    When I enter "admin" in the "Username" field
    And I press tab
    And I enter "password" in the "Password" field
    And I submit the form
    Then I should see "Dashboard"
    And the screen should match snapshot "dashboard"

  Scenario: Menu navigation
    When I navigate down 2 times
    And I press enter
    Then I should see "Settings"
    When I select menu item "Theme"
    Then I should see all of:
      | Light |
      | Dark  |
      | Auto  |

  Scenario: Execute command
    When I execute command "help"
    Then I should see "Available commands"
    And the screen should match pattern "version: \d+\.\d+"
```

---

## Related Topics

- [TUI Testing Guide](../../guides/tui-testing.md) - Usage patterns
- [TuiPort Reference](../api/ports.md#tuiport) - Port interface
- [Shared Steps](./shared-steps.md) - Variable steps

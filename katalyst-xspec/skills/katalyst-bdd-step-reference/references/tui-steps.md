# TUI Steps Reference

Complete reference for TUI (Terminal User Interface) steps. Available only in `@tui` scenarios.

**Prerequisites:** TUI testing requires `tmux` installed on the system and `tui-tester` configured.

## Lifecycle Steps

### Start Application

```gherkin
Given I start the TUI application
Given the TUI application is running
```

Starts the TUI application and waits for it to be ready.

### Stop Application

```gherkin
When I stop the TUI application
```

### Restart Application

```gherkin
When I restart the TUI application
```

## Input Steps

### Type Text

```gherkin
When I type {string}
When I type {string} slowly
```

**Example:**
```gherkin
When I type "hello world"
When I type "search term" slowly
```

### Press Key

```gherkin
When I press {string}
When I press enter
When I press tab
When I press escape
```

**Example:**
```gherkin
When I press "ArrowDown"
When I press "Backspace"
When I press enter
When I press tab
When I press escape
```

### Press Key with Modifier

```gherkin
When I press {string} with ctrl
When I press {string} with alt
When I press {string} with shift
When I press ctrl+{word}
When I press alt+{word}
When I press shift+{word}
When I press ctrl+shift+{word}
```

**Example:**
```gherkin
When I press "c" with ctrl
When I press "s" with ctrl
When I press "F1" with alt
When I press ctrl+c
When I press ctrl+shift+p
```

### Fill Field

```gherkin
When I fill the TUI field {string} with {string}
When I enter {string} in the {string} field
```

**Example:**
```gherkin
When I fill the TUI field "Username" with "admin"
When I enter "secret123" in the "Password" field
```

### Select Option

```gherkin
When I select {string}
When I select option {string}
```

**Example:**
```gherkin
When I select "Yes"
When I select option "Continue"
```

## Navigation Steps

### Navigate Up/Down

```gherkin
When I navigate down {int} times
When I navigate up {int} times
```

**Example:**
```gherkin
When I navigate down 3 times
When I navigate up 2 times
```

### Navigate to Option

```gherkin
When I navigate to {string} and select
```

**Example:**
```gherkin
When I navigate to "Settings" and select
```

### Go Back

```gherkin
When I go back
```

Presses Escape.

## Mouse Steps

### Click at Position

```gherkin
When I click at position {int}, {int}
```

**Example:**
```gherkin
When I click at position 10, 5
```

### Click on Text

```gherkin
When I click on {string}
```

**Example:**
```gherkin
When I click on "Submit"
```

## Menu Steps

### Open Menu

```gherkin
When I open the menu
```

Presses Alt+M.

### Select Menu Item

```gherkin
When I select menu item {string}
```

**Example:**
```gherkin
When I select menu item "File"
When I select menu item "Save As"
```

### Select from Dropdown

```gherkin
When I select from dropdown {string} value {string}
```

**Example:**
```gherkin
When I select from dropdown "Theme" value "Dark"
```

## Form Steps

### Fill Form

```gherkin
When I fill the form:
  | Field    | Value     |
  | Username | admin     |
  | Password | secret123 |
```

### Submit Form

```gherkin
When I submit the form
When I submit the form with ctrl+s
```

## Assertion Steps

### Assert Text Visible

```gherkin
Then I should see {string}
Then I should see {string} in the terminal
Then I should see text {string}
Then the screen should contain {string}
```

**Example:**
```gherkin
Then I should see "Welcome"
Then I should see "Login successful" in the terminal
Then the screen should contain "Press Enter to continue"
```

### Assert Text Not Visible

```gherkin
Then I should not see {string}
```

**Example:**
```gherkin
Then I should not see "Error"
```

### Assert Pattern

```gherkin
Then the screen should match pattern {string}
```

**Example:**
```gherkin
Then the screen should match pattern "Version \\d+\\.\\d+\\.\\d+"
```

### Assert Multiple Texts

```gherkin
Then I should see all of:
  | Text      |
  | Welcome   |
  | Username  |
  | Password  |
```

```gherkin
Then I should not see any of:
  | Text      |
  | Error     |
  | Failed    |
```

### Assert Line Content

```gherkin
Then line {int} should contain {string}
Then the first line should contain {string}
Then the last line should contain {string}
```

**Example:**
```gherkin
Then line 1 should contain "Welcome"
Then the first line should contain "Application Name"
Then the last line should contain "Press Q to quit"
```

## Wait Steps

### Wait for Text

```gherkin
When I wait for {string}
When I wait for {string} for {int} seconds
```

**Example:**
```gherkin
When I wait for "Ready"
When I wait for "Loading complete" for 10 seconds
```

### Wait Fixed Time

```gherkin
When I wait {int} seconds
```

**Example:**
```gherkin
When I wait 2 seconds
```

## Snapshot Steps

### Take Snapshot

```gherkin
Then I take a snapshot named {string}
```

**Example:**
```gherkin
Then I take a snapshot named "main-menu"
```

### Match Snapshot

```gherkin
Then the screen should match snapshot {string}
```

**Example:**
```gherkin
Then the screen should match snapshot "login-screen"
```

## Utility Steps

### Clear Terminal

```gherkin
When I clear the terminal
```

### Resize Terminal

```gherkin
When I resize the terminal to {int}x{int}
```

**Example:**
```gherkin
When I resize the terminal to 120x40
```

### Capture Screen

```gherkin
When I capture the screen
Then I print the screen
```

### Execute Command

```gherkin
When I execute command {string}
When I run {string}
```

**Example:**
```gherkin
When I execute command "ls -la"
When I run "npm test"
```

## Dialog Steps

### Confirm Dialog

```gherkin
When I confirm the dialog
```

Types 'y' and presses Enter.

### Cancel Dialog

```gherkin
When I cancel the dialog
```

Types 'n' and presses Enter.

### Dismiss Dialog

```gherkin
When I dismiss the dialog
```

Presses Escape.

## Quit Steps

### Quit Application

```gherkin
When I quit the application
When I force quit the application
```

`quit` presses Q, `force quit` presses Ctrl+C.

## Complete TUI Example

```gherkin
@tui
Feature: CLI Application

  Background:
    Given I start the TUI application

  Scenario: Navigate menu and select option
    When I wait for "Main Menu"
    Then I should see "1. Settings"
    And I should see "2. Help"
    And I should see "3. Exit"
    
    When I navigate down 1 times
    And I press enter
    Then I should see "Settings"
    
    When I go back
    Then I should see "Main Menu"

  Scenario: Fill login form
    When I wait for "Login"
    When I fill the form:
      | Field    | Value     |
      | Username | admin     |
      | Password | secret123 |
    And I submit the form
    Then I should see "Welcome, admin"

  Scenario: Use keyboard shortcuts
    When I press ctrl+s
    Then I should see "Saved"
    
    When I press "?" with shift
    Then I should see "Help"

  Scenario: Snapshot test
    When I wait for "Dashboard"
    Then I take a snapshot named "dashboard"
    Then the screen should match snapshot "dashboard"
```

## TUI Configuration

Configure TUI in your fixtures:

```typescript
import { createBddTest, TuiTesterAdapter } from '@esimplicityinc/katalyst-xspec';

const test = createBddTest({
  createTui: () => new TuiTesterAdapter({
    command: ['node', 'dist/cli.js'],
    size: { cols: 100, rows: 30 },
    cwd: process.cwd(),
    env: { NODE_ENV: 'test' },
    debug: false,
    snapshotDir: './snapshots',
  }),
});
```

Environment variables:
- `TUI_COLS` - Terminal columns (default: 80)
- `TUI_ROWS` - Terminal rows (default: 24)
- `DEBUG` - Enable debug output

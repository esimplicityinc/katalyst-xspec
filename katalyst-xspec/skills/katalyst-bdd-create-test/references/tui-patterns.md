# TUI Test Patterns

Common patterns for TUI (Terminal User Interface) testing with the Katalyst BDD framework.

## Basic Patterns

### Start and Verify

```gherkin
Scenario: Application starts successfully
  Given I start the TUI application
  When I wait for "Welcome"
  Then I should see "Press Enter to continue"
```

### Execute Command

```gherkin
Scenario: Run a command
  Given I start the TUI application
  When I type "help"
  And I press enter
  Then I should see "Available commands"
```

### Interactive Input

```gherkin
Scenario: Respond to prompt
  Given I start the TUI application
  When I wait for "Enter your name:"
  And I type "John"
  And I press enter
  Then I should see "Hello, John"
```

## Navigation Patterns

### Menu Navigation

```gherkin
Scenario: Navigate main menu
  Given I start the TUI application
  When I wait for "Main Menu"
  Then I should see all of:
    | Text       |
    | 1. New     |
    | 2. Open    |
    | 3. Save    |
    | 4. Exit    |
  
  When I type "2"
  And I press enter
  Then I should see "Open File"
```

### Arrow Key Navigation

```gherkin
Scenario: Navigate with arrow keys
  Given I start the TUI application
  When I wait for "Select option:"
  And I navigate down 2 times
  And I press enter
  Then I should see "Option 3 selected"
```

### Navigate to Specific Item

```gherkin
Scenario: Select specific menu item
  Given I start the TUI application
  When I wait for "Menu"
  And I navigate to "Settings" and select
  Then I should see "Settings Panel"
```

### Back Navigation

```gherkin
Scenario: Go back to previous screen
  Given I start the TUI application
  When I navigate to "Settings" and select
  Then I should see "Settings Panel"
  When I go back
  Then I should see "Main Menu"
```

## Form Patterns

### Fill Single Field

```gherkin
Scenario: Fill text field
  Given I start the TUI application
  When I wait for "Username:"
  And I fill the TUI field "Username" with "admin"
  And I press tab
  And I fill the TUI field "Password" with "secret123"
  And I press enter
  Then I should see "Login successful"
```

### Fill Form with Table

```gherkin
Scenario: Fill complete form
  Given I start the TUI application
  When I wait for "New User"
  And I fill the TUI form:
    | Field    | Value            |
    | Name     | John Doe         |
    | Email    | john@example.com |
    | Role     | Admin            |
  And I submit the form
  Then I should see "User created"
```

### Select from Dropdown

```gherkin
Scenario: Select dropdown value
  Given I start the TUI application
  When I wait for "Configuration"
  And I select from dropdown "Theme" value "Dark"
  And I select from dropdown "Language" value "English"
  And I submit the form with ctrl+s
  Then I should see "Configuration saved"
```

## Keyboard Patterns

### Special Keys

```gherkin
Scenario: Use special keys
  Given I start the TUI application
  When I press "F1"
  Then I should see "Help"
  When I press escape
  Then I should not see "Help"
```

### Modifier Keys

```gherkin
Scenario: Keyboard shortcuts
  Given I start the TUI application
  When I press ctrl+s
  Then I should see "Saved"
  
  When I press ctrl+n
  Then I should see "New Document"
  
  When I press ctrl+shift+p
  Then I should see "Command Palette"
```

### Text Editing

```gherkin
Scenario: Edit text
  Given I start the TUI application
  When I wait for "Editor"
  And I type "Hello World" slowly
  And I press "Home"
  And I type "Say: "
  Then the first line should contain "Say: Hello World"
```

## Assertion Patterns

### Text Visibility

```gherkin
Then I should see "Welcome"
Then I should not see "Error"
Then the screen should contain "Ready"
```

### Multiple Text Assertions

```gherkin
Then I should see all of:
  | Text        |
  | File        |
  | Edit        |
  | View        |
  | Help        |

Then I should not see any of:
  | Text        |
  | Error       |
  | Warning     |
  | Failed      |
```

### Line-Specific Assertions

```gherkin
Then the first line should contain "Application v1.0"
Then the last line should contain "Press Q to quit"
Then line 5 should contain "Status: Ready"
```

### Pattern Matching

```gherkin
Then the screen should match pattern "Version \d+\.\d+\.\d+"
Then the screen should match pattern "Connected to .+"
```

## Wait Patterns

### Wait for Text

```gherkin
When I wait for "Ready"
When I wait for "Loading complete" for 10 seconds
```

### Wait Fixed Time

```gherkin
When I wait 2 seconds
```

### Wait in Background

```gherkin
Scenario: Long operation
  Given I start the TUI application
  When I type "process-large-file"
  And I press enter
  When I wait for "Processing complete" for 30 seconds
  Then I should see "Done"
```

## Dialog Patterns

### Confirm Dialog

```gherkin
Scenario: Confirm action
  Given I start the TUI application
  When I type "delete all"
  And I press enter
  Then I should see "Are you sure? (y/n)"
  When I confirm the dialog
  Then I should see "Deleted"
```

### Cancel Dialog

```gherkin
Scenario: Cancel action
  Given I start the TUI application
  When I type "delete all"
  And I press enter
  Then I should see "Are you sure? (y/n)"
  When I cancel the dialog
  Then I should see "Cancelled"
```

### Dismiss Dialog

```gherkin
Scenario: Dismiss with escape
  Given I start the TUI application
  When I press "F1"
  Then I should see "Help Dialog"
  When I dismiss the dialog
  Then I should not see "Help Dialog"
```

## Snapshot Patterns

### Create Baseline Snapshot

```gherkin
Scenario: Capture main screen
  Given I start the TUI application
  When I wait for "Dashboard"
  Then I take a snapshot named "dashboard-baseline"
```

### Verify Against Snapshot

```gherkin
Scenario: Verify screen matches snapshot
  Given I start the TUI application
  When I wait for "Dashboard"
  Then the screen should match snapshot "dashboard-baseline"
```

### Multiple Snapshots

```gherkin
Scenario: Capture workflow snapshots
  Given I start the TUI application
  When I wait for "Welcome"
  Then I take a snapshot named "01-welcome"
  
  When I navigate to "Settings" and select
  Then I take a snapshot named "02-settings"
  
  When I go back
  Then the screen should match snapshot "01-welcome"
```

## Error Handling Patterns

### Error Messages

```gherkin
Scenario: Show error on invalid input
  Given I start the TUI application
  When I type "invalid-command"
  And I press enter
  Then I should see "Unknown command"
```

### Validation Errors

```gherkin
Scenario: Form validation
  Given I start the TUI application
  When I wait for "New User"
  And I fill the TUI form:
    | Field | Value         |
    | Email | not-an-email  |
  And I submit the form
  Then I should see "Invalid email format"
```

## Application Lifecycle Patterns

### Restart Application

```gherkin
Scenario: Application restart
  Given I start the TUI application
  When I wait for "Ready"
  And I type "corrupt-state"
  And I press enter
  Then I should see "Error"
  
  When I restart the TUI application
  Then I should see "Ready"
  And I should not see "Error"
```

### Quit Application

```gherkin
Scenario: Graceful quit
  Given I start the TUI application
  When I quit the application
  # Application should exit cleanly

Scenario: Force quit
  Given I start the TUI application
  When I force quit the application
  # Sends Ctrl+C
```

## Complete Example: CLI Todo App

```gherkin
Feature: Todo CLI Application
  As a user
  I want to manage todos from the terminal
  So that I can track my tasks efficiently

  Background:
    Given I start the TUI application
    When I wait for "Todo Manager"

  Scenario: Add new todo
    When I type "add Buy groceries"
    And I press enter
    Then I should see "Todo added: Buy groceries"
    And I should see "[ ] Buy groceries"

  Scenario: Complete todo
    # Setup
    When I type "add Test todo"
    And I press enter
    Then I should see "[ ] Test todo"
    
    # Complete it
    When I type "done 1"
    And I press enter
    Then I should see "[x] Test todo"

  Scenario: List todos with filter
    # Add some todos
    When I type "add Task 1"
    And I press enter
    When I type "add Task 2"
    And I press enter
    When I type "done 1"
    And I press enter
    
    # Filter completed
    When I type "list --completed"
    And I press enter
    Then I should see "[x] Task 1"
    And I should not see "[ ] Task 2"

  Scenario: Interactive menu navigation
    When I type "menu"
    And I press enter
    Then I should see all of:
      | Text         |
      | 1. Add Todo  |
      | 2. List      |
      | 3. Settings  |
      | 4. Exit      |
    
    When I navigate down 2 times
    And I press enter
    Then I should see "Settings"
    
    When I fill the TUI form:
      | Field     | Value |
      | Theme     | Dark  |
      | Compact   | Yes   |
    And I submit the form
    Then I should see "Settings saved"

  Scenario: Snapshot test for main screen
    Then the screen should match snapshot "main-menu"
```

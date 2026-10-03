Feature: Todo CLI
  Drives a small interactive command-line app (app.mjs) through tmux.

  Background:
    Given I start the TUI application
    And I wait for "Welcome to Todo CLI"

  Scenario: Shows the help line on start
    Then I should see "Commands: add <text>, list, done <n>, quit"

  Scenario: Add and list items
    When I type "add Buy milk"
    And I press enter
    Then I should see "Added: Buy milk"
    When I type "list"
    And I press enter
    Then I should see "1. [ ] Buy milk"

  Scenario: Complete an item
    When I type "add Write tests"
    And I press enter
    And I type "done 1"
    And I press enter
    Then I should see "Completed: Write tests"

  Scenario: Unknown commands are reported
    When I type "dance"
    And I press enter
    Then I should see "Unknown command: dance"
    And I should not see "Added:"

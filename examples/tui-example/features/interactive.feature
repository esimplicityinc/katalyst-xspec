@tui
Feature: Interactive Terminal
  As a developer
  I want to test interactive terminal applications
  So that I can verify user prompts work correctly

  Scenario: Interactive input with cat
    When I spawn the terminal with "cat"
    And I type "Hello from test" in terminal
    And I press Enter in terminal
    Then I should see "Hello from test" in terminal
    When I send Ctrl+C to terminal
    Then the terminal process should exit

  Scenario: Read command with input
    When I spawn the terminal with "read -p 'Enter name: ' name && echo \"Hello, $name\""
    And I wait for "Enter name:" in terminal
    And I type "TestUser" in terminal
    And I press Enter in terminal
    Then I should see "Hello, TestUser" in terminal

  Scenario: Navigate with arrow keys
    When I spawn the terminal with "bash"
    And I type "echo first" in terminal
    And I press Enter in terminal
    And I type "echo second" in terminal
    And I press Enter in terminal
    And I press Up in terminal
    And I press Up in terminal
    Then the terminal should contain "echo first"

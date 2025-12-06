@tui
Feature: Shell Commands
  As a developer
  I want to test shell command interactions
  So that I can verify CLI tools work correctly

  Scenario: Run echo command
    When I spawn the terminal with "echo 'Hello, TUI Testing!'"
    Then I should see "Hello, TUI Testing!" in terminal

  Scenario: Run command with environment variable
    When I spawn the terminal with "echo $HOME"
    Then the terminal should contain text matching "/Users|/home"

  Scenario: Run pwd command
    When I spawn the terminal with "pwd"
    Then the terminal output should not be empty

  Scenario: Run ls command
    When I spawn the terminal with "ls -la"
    Then I should see "total" in terminal

  Scenario: Check command exit code
    When I spawn the terminal with "true"
    Then the terminal process should exit with code 0

  Scenario: Check failed command exit code
    When I spawn the terminal with "false"
    Then the terminal process should exit with code 1

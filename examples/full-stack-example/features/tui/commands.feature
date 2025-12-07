@tui
Feature: Terminal Commands
  As a developer
  I want to test terminal interactions
  So that I can verify CLI functionality

  Scenario: Echo command
    When I spawn the terminal with "echo 'Full Stack Test'"
    Then I should see "Full Stack Test" in terminal

  Scenario: Environment check
    When I spawn the terminal with "node --version"
    Then the terminal should contain text matching "v[0-9]+"

  Scenario: Working directory
    When I spawn the terminal with "pwd"
    Then the terminal output should not be empty

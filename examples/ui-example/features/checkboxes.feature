@ui
Feature: Checkboxes
  As a user
  I want to interact with checkboxes
  So that I can verify checkbox functionality

  Background:
    Given I navigate to "/checkboxes"

  Scenario: Toggle checkbox state
    # First checkbox is unchecked by default
    When I click the element "input[type='checkbox']:first-of-type"
    Then the element "input[type='checkbox']:first-of-type" should be checked

  Scenario: Verify checkbox initial state
    # Second checkbox is checked by default
    Then the element "input[type='checkbox']:last-of-type" should be checked

  Scenario: Uncheck a checked checkbox
    # Second checkbox starts checked
    When I click the element "input[type='checkbox']:last-of-type"
    Then the element "input[type='checkbox']:last-of-type" should not be checked

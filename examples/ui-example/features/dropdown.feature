@ui
Feature: Dropdown
  As a user
  I want to interact with dropdown menus
  So that I can verify selection functionality

  Background:
    Given I navigate to "/dropdown"

  Scenario: Select option 1 from dropdown
    When I select "Option 1" from dropdown "#dropdown"
    Then the element "#dropdown" should have value "1"

  Scenario: Select option 2 from dropdown
    When I select "Option 2" from dropdown "#dropdown"
    Then the element "#dropdown" should have value "2"

  Scenario: Dropdown displays all options
    Then the element "#dropdown" should be visible
    And I should see text "Option 1"
    And I should see text "Option 2"

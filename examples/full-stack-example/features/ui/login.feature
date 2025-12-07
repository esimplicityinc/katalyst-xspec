@ui
Feature: Login UI
  As a user
  I want to log in to the application
  So that I can access protected features

  Background:
    Given I navigate to "/login"

  Scenario: View login form
    Then the element "#username" should be visible
    And the element "#password" should be visible
    And the element "button[type='submit']" should be visible

  Scenario: Successful login
    When I fill in "username" with "tomsmith"
    And I fill in "password" with "SuperSecretPassword!"
    And I click the "Login" button
    Then I should see text "You logged into a secure area!"

  Scenario: Failed login
    When I fill in "username" with "invalid"
    And I fill in "password" with "invalid"
    And I click the "Login" button
    Then I should see text "Your username is invalid!"

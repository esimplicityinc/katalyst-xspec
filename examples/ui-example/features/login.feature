@ui
Feature: Login Page
  As a user
  I want to test the login functionality
  So that I can verify authentication works correctly

  Background:
    Given I navigate to "/login"

  Scenario: Successful login with valid credentials
    When I fill in "username" with "tomsmith"
    And I fill in "password" with "SuperSecretPassword!"
    And I click the "Login" button
    Then I should see text "You logged into a secure area!"
    And I should be on page "/secure"

  Scenario: Failed login with invalid username
    When I fill in "username" with "invaliduser"
    And I fill in "password" with "SuperSecretPassword!"
    And I click the "Login" button
    Then I should see text "Your username is invalid!"

  Scenario: Failed login with invalid password
    When I fill in "username" with "tomsmith"
    And I fill in "password" with "wrongpassword"
    And I click the "Login" button
    Then I should see text "Your password is invalid!"

  Scenario: Login form displays required elements
    Then the element "#username" should be visible
    And the element "#password" should be visible
    And the element "button[type='submit']" should be visible

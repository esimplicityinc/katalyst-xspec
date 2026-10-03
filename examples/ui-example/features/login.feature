Feature: Login
  Background:
    Given I navigate to "/"

  Scenario: Standard user can log in
    When I fill the placeholder "Username" with "standard_user"
    And I fill the placeholder "Password" with "secret_sauce"
    And I click the button "Login"
    Then the URL should contain "/inventory.html"
    And I should see text "Products"

  Scenario: Locked-out user sees an error
    When I fill the placeholder "Username" with "locked_out_user"
    And I fill the placeholder "Password" with "secret_sauce"
    And I click the button "Login"
    Then I should see text "Sorry, this user has been locked out."

  Scenario: Wrong password is rejected
    When I fill the placeholder "Username" with "standard_user"
    And I fill the placeholder "Password" with "nope"
    And I click the button "Login"
    Then I should see text "Username and password do not match any user in this service"

  Scenario: Login form shows its fields
    Then the element "[data-test='username']" should be visible
    And the element "[data-test='password']" should be visible
    And the element "[data-test='login-button']" should have attribute "value" equal to "Login"

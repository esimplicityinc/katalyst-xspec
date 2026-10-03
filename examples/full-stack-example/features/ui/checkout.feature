Feature: Checkout
  Background:
    Given I navigate to "/"
    When I fill the placeholder "Username" with "standard_user"
    And I fill the placeholder "Password" with "secret_sauce"
    And I click the button "Login"

  @smoke
  Scenario: Buy a backpack
    When I click the element "[data-test='add-to-cart-sauce-labs-backpack']"
    And I click the element "[data-test='shopping-cart-link']"
    And I click the button "Checkout"
    And I fill the placeholder "First Name" with "Ada"
    And I fill the placeholder "Last Name" with "Lovelace"
    And I fill the placeholder "Zip/Postal Code" with "12345"
    And I click the button "Continue"
    And I click the button "Finish"
    Then I should see text "Thank you for your order!"

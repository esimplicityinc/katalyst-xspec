Feature: Mixing API and UI steps
  One scenario can use API and UI steps together, and share values through variables.

  Scenario: Use data from the API in the UI
    When I GET "/users/1"
    Then the response status should be 200
    And I store the value at "address.zipcode" as "zip"
    Given I navigate to "/"
    When I fill the placeholder "Username" with "standard_user"
    And I fill the placeholder "Password" with "secret_sauce"
    And I click the button "Login"
    And I click the element "[data-test='add-to-cart-sauce-labs-bike-light']"
    And I click the element "[data-test='shopping-cart-link']"
    And I click the button "Checkout"
    And I fill the placeholder "First Name" with "Leanne"
    And I fill the placeholder "Last Name" with "Graham"
    And I fill the placeholder "Zip/Postal Code" with "{zip}"
    Then the element "[data-test='postalCode']" should have value "92998-3874"

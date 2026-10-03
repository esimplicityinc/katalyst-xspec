Feature: Inventory
  Background:
    Given I navigate to "/"
    When I fill the placeholder "Username" with "standard_user"
    And I fill the placeholder "Password" with "secret_sauce"
    And I click the button "Login"

  Scenario: Sort products by price
    When I select "Price (low to high)" from dropdown "[data-test='product-sort-container']"
    Then the element "[data-test='product-sort-container']" should have value "lohi"

  Scenario: Add a product to the cart
    When I click the element "[data-test='add-to-cart-sauce-labs-backpack']"
    Then the element "[data-test='shopping-cart-badge']" should be visible
    And I should see text "Remove"

  Scenario: Open a product page
    When I click the element "[data-test='item-4-title-link']"
    Then the URL should contain "/inventory-item.html"
    And I should see text "Back to products"

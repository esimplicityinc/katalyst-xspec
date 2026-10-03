Feature: Users API
  @smoke
  Scenario: Fetch a user
    When I GET "/users/1"
    Then the response status should be 200
    And the value at "name" should equal "Leanne Graham"

  Scenario: Create a user
    When I POST "/users" with JSON body:
      """
      { "name": "Full Stack User", "username": "fullstack" }
      """
    Then the response status should be 201
    And the value at "username" should equal "fullstack"

  Scenario: List users
    When I GET "/users"
    Then the response status should be 200
    And the response should be a JSON array

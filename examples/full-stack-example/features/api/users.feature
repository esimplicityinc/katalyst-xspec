@api
Feature: User API
  As a developer
  I want to test the User API
  So that I can verify backend functionality

  Scenario: Fetch user by ID
    When I GET "/users/1"
    Then the response status should be 200
    And the value at "name" should equal "Leanne Graham"
    And I store the value at "id" as "userId"

  Scenario: Create new user
    When I POST "/users" with JSON body:
      """
      {
        "name": "Full Stack User",
        "email": "fullstack@example.com",
        "username": "fullstackuser"
      }
      """
    Then the response status should be 201
    And I store the value at "id" as "newUserId"

  Scenario: List all users
    When I GET "/users"
    Then the response status should be 200
    And the response should be a JSON array

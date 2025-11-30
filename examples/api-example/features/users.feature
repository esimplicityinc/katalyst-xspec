@api
Feature: User API
  As a developer
  I want to test the Users API
  So that I can verify user data retrieval works correctly

  Scenario: Fetch a single user by ID
    When I GET "/users/1"
    Then the response status should be 200
    And the response should be a JSON object
    And the value at "id" should equal "1"
    And the value at "name" should equal "Leanne Graham"

  Scenario: Fetch all users
    When I GET "/users"
    Then the response status should be 200
    And the response should be a JSON array

  Scenario: Fetch user and store values
    When I GET "/users/1"
    Then the response status should be 200
    And I store the value at "id" as "userId"
    And I store the value at "email" as "userEmail"
    When I GET "/users/{userId}"
    Then the response status should be 200
    And the value at "email" should equal "{userEmail}"

  Scenario: Create a new user
    When I POST "/users" with JSON body:
      """
      {
        "name": "Test User",
        "username": "testuser",
        "email": "test@example.com"
      }
      """
    Then the response status should be 201
    And the value at "name" should equal "Test User"
    And I store the value at "id" as "newUserId"

  Scenario: Fetch non-existent user
    When I GET "/users/99999"
    Then the response status should be 404

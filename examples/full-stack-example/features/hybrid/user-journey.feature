@hybrid
Feature: User Journey
  As a tester
  I want to combine API and UI testing
  So that I can verify complete user workflows

  Scenario: Fetch user via API and store for later use
    # This demonstrates variable sharing
    When I GET "/users/1"
    Then the response status should be 200
    And I store the value at "name" as "userName"
    And I store the value at "email" as "userEmail"
    
    # Variables can be verified
    Then the variable "userName" should equal "Leanne Graham"

  Scenario: Create data via API then navigate UI
    # Step 1: Create user via API
    Given I generate a UUID and store as "testId"
    Given I set variable "testEmail" to "test-{testId}@example.com"
    When I POST "/users" with JSON body:
      """
      {
        "name": "Hybrid Test User",
        "email": "{testEmail}"
      }
      """
    Then the response status should be 201
    And I store the value at "id" as "userId"
    
    # Step 2: Navigate to UI (in a real app, you'd verify the user appears)
    Given I navigate to "/"
    Then I should see text "Welcome"

  Scenario: Multi-step workflow with variables
    # API: Get some data
    When I GET "/posts/1"
    Then the response status should be 200
    And I store the value at "title" as "postTitle"
    
    # Store more variables
    Given I set variable "currentTime" to "2024-01-15"
    
    # API: Use stored variable
    When I GET "/posts?userId=1"
    Then the response status should be 200
    And the response should be a JSON array

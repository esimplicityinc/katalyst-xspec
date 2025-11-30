@api
Feature: Posts API
  As a developer
  I want to test the Posts API
  So that I can verify post creation and retrieval

  Background:
    Given I set variable "testUserId" to "1"

  Scenario: Fetch posts for a user
    When I GET "/posts?userId={testUserId}"
    Then the response status should be 200
    And the response should be a JSON array

  Scenario: Fetch a single post
    When I GET "/posts/1"
    Then the response status should be 200
    And the value at "userId" should equal "1"
    And the value at "title" should equal "sunt aut facere repellat provident occaecati excepturi optio reprehenderit"

  Scenario: Create a new post
    When I POST "/posts" with JSON body:
      """
      {
        "title": "Test Post Title",
        "body": "This is a test post body",
        "userId": 1
      }
      """
    Then the response status should be 201
    And the value at "title" should equal "Test Post Title"
    And I store the value at "id" as "postId"

  Scenario: Create post with dynamic data
    Given I generate a UUID and store as "uniqueId"
    Given I set variable "postTitle" to "Dynamic Post {uniqueId}"
    When I POST "/posts" with JSON body:
      """
      {
        "title": "{postTitle}",
        "body": "Post with unique identifier",
        "userId": 1
      }
      """
    Then the response status should be 201

  Scenario Outline: Fetch posts for different users
    When I GET "/posts?userId=<userId>"
    Then the response status should be 200
    And the response should be a JSON array

    Examples:
      | userId |
      | 1      |
      | 2      |
      | 3      |

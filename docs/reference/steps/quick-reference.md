# Step Quick Reference

All available steps at a glance. Steps are untagged: once registered, any step works in any scenario, so you can mix API, UI and shared steps freely.

## API Steps

| Step | Description |
|------|-------------|
| `When I GET {string}` | Send GET request |
| `When I POST {string} with JSON body:` | Send POST with JSON |
| `When I PUT {string} with JSON body:` | Send PUT with JSON |
| `When I PATCH {string} with JSON body:` | Send PATCH with JSON |
| `When I DELETE {string}` | Send DELETE request |
| `Then the response status should be {int}` | Assert status code |
| `Then the response should be a JSON object` | Assert JSON object |
| `Then the response should be a JSON array` | Assert JSON array |
| `Then the value at {string} should equal {string}` | Assert JSON value |
| `Then the value at {string} should contain {string}` | Assert value contains |
| `Then the value at {string} should match {string}` | Assert regex match |
| `And I store the value at {string} as {string}` | Store response value |
| `Given I am authenticated as {string} via API` | Log in to the API as a role (`AUTH_<ROLE>_*`) |
| `Given I am authenticated as an admin via API` | Shorthand for role `"admin"` |
| `Given I am authenticated as a user via API` | Shorthand for role `"user"` |
| `Given I set bearer token from variable {string}` | Use a stored token |
| `Given I set header {string} to {string}` | Set request header |

[Full API Steps Reference](./api-steps.md)

---

## UI Steps

### Navigation

| Step | Description |
|------|-------------|
| `Given I navigate to {string}` | Go to URL path |
| `Given I open {string} page` | Open page |
| `When I go back in the browser` | Browser back |
| `When I reload the page` | Refresh page |

### Clicking

| Step | Description |
|------|-------------|
| `When I click the button {string}` | Click button by name |
| `When I click the {string} button` | Click button (alt syntax) |
| `When I click the link {string}` | Click link by text |
| `When I click the element {string}` | Click by CSS selector |

### Form Input

| Step | Description |
|------|-------------|
| `When I fill the field {string} with {string}` | Fill by label |
| `When I fill in {string} with {string}` | Fill by label (alt syntax) |
| `When I fill the placeholder {string} with {string}` | Fill by placeholder |
| `When I select {string} from dropdown {string}` | Select dropdown option |
| `When I set the file input {string} to a file named {string} with content {string}` | Upload in-memory file |
| `When I fill the form:` | Fill multiple fields |

### Login

| Step | Description |
|------|-------------|
| `Given I am logged in as {string}` | UI login as a role, session reused |
| `When I log in as {string} in UI` | UI login as a role, always submits the form |
| `When I log in as admin in UI` | Shorthand for role `"admin"` |
| `When I log in as user in UI` | Shorthand for role `"user"` |

See the [Authentication guide](../../guides/authentication.md).

### Assertions

| Step | Description |
|------|-------------|
| `Then I should see text {string}` | Assert visible text |
| `Then the URL should contain {string}` | Assert URL contains |
| `Then I should be on page {string}` | Assert URL (alt syntax) |
| `Then the element {string} should be visible` | Assert element visible |
| `Then the element {string} should not be visible` | Assert element hidden |
| `Then the element {string} should have value {string}` | Assert input value |
| `Then the element {string} should have attribute {string} equal to {string}` | Assert attribute value |
| `Then the element {string} should be checked` | Assert checkbox checked |
| `Then the element {string} should not be checked` | Assert unchecked |

### Waiting

| Step | Description |
|------|-------------|
| `Then I wait {string} seconds` | Wait fixed time |
| `Then I wait for the page to load` | Wait for load states |

### Debugging

| Step | Description |
|------|-------------|
| `When I pause for debugging` | Open Playwright Inspector |
| `Then I log the current URL` | Print URL |
| `Then I print visible text` | Print page text |
| `Then I save a screenshot as {string}` | Capture screenshot |

[Full UI Steps Reference](./ui-steps.md)

---

## TUI Steps

| Step | Description |
|------|-------------|
| `Given I start the TUI application` | Start the configured CLI |
| `When I type {string}` | Type text |
| `When I press enter` | Press Enter key |
| `When I press {string}` | Press any key |
| `When I fill the TUI form:` | Fill multiple fields (UI uses `I fill the form:`) |
| `Then I should see {string}` | Wait for text |
| `Then I should see {string} in the terminal` | Wait for text (alt syntax) |
| `Then the screen should contain {string}` | Immediate text check |
| `Then the screen should match pattern {string}` | Assert regex match |
| `When I quit the application` | Quit the CLI |

> TUI has no `I should see text {string}` step; that wording belongs to the UI steps.

[Full TUI Steps Reference](./tui-steps.md)

---

## Shared Steps

| Step | Description |
|------|-------------|
| `Given I generate a UUID and store as {string}` | Create unique ID |
| `Given I set variable {string} to {string}` | Set variable |
| `Then the variable {string} should equal {string}` | Assert variable |
| `Given I register cleanup for {string} {string}` | Register cleanup |

[Full Shared Steps Reference](./shared-steps.md)

---

## Where Steps Work

Every registered step works in every scenario — no tags required. Playwright projects choose which feature files run by folder (e.g. `features/api/`, `features/ui/`). Tags such as `@smoke` or `@wip` are optional and only used for filtering. See [Tags](../../concepts/tag-system.md).

---

## Common Patterns

### API: Create and verify resource

```gherkin
Scenario: Create user
  Given I am authenticated as "admin" via API
  When I POST "/users" with JSON body:
    """
    { "email": "test@example.com", "name": "Test User" }
    """
  Then the response status should be 201
  And I store the value at "id" as "userId"
  And the value at "email" should equal "test@example.com"
```

### UI: Log in as a role

```gherkin
Scenario: Dashboard
  Given I am logged in as "pm"
  When I navigate to "/dashboard"
  Then I should see text "Welcome"
```

### UI: Login form by hand

```gherkin
Scenario: Login
  Given I navigate to "/login"
  When I fill in "username" with "testuser"
  And I fill in "password" with "secret123"
  And I click the button "Sign In"
  Then I should see text "Welcome"
  And the URL should contain "/dashboard"
```

### Hybrid: API setup, UI verify

```gherkin
Scenario: Create via API, verify in UI
  Given I am authenticated as "admin" via API
  When I POST "/users" with JSON body:
    """
    { "email": "newuser@test.com" }
    """
  Then the response status should be 201
  
  Given I navigate to "/admin/users"
  Then I should see text "newuser@test.com"
```

---

## Related Topics

- [API Steps Reference](./api-steps.md)
- [UI Steps Reference](./ui-steps.md)
- [TUI Steps Reference](./tui-steps.md)
- [Shared Steps Reference](./shared-steps.md)
- [Hybrid Steps Reference](./hybrid-steps.md)
- [Tags](../../concepts/tag-system.md)

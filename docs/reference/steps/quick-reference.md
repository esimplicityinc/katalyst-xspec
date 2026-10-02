# Step Quick Reference

All available steps at a glance. Click step names for detailed documentation.

## API Steps (`@api` or `@hybrid`)

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
| `Given I am authenticated as an admin via API` | Admin auth |
| `Given I am authenticated as a user via API` | User auth |
| `Given I set header {string} to {string}` | Set request header |

[Full API Steps Reference](./api-steps.md)

---

## UI Steps (`@ui` or `@hybrid`)

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

## TUI Steps (`@tui`)

| Step | Description |
|------|-------------|
| `When I spawn the terminal with {string}` | Start terminal with command |
| `When I type {string} in terminal` | Type text |
| `When I press Enter in terminal` | Press Enter key |
| `When I press {string} in terminal` | Press any key |
| `When I send Ctrl+C to terminal` | Send interrupt |
| `Then I should see {string} in terminal` | Assert text visible |
| `Then the terminal should contain text matching {string}` | Assert regex match |
| `Then the terminal output should not be empty` | Assert has output |
| `Then the terminal process should exit` | Assert process ended |
| `Then the terminal process should exit with code {int}` | Assert exit code |

[Full TUI Steps Reference](./tui-steps.md)

---

## Shared Steps (All tags)

| Step | Description |
|------|-------------|
| `Given I generate a UUID and store as {string}` | Create unique ID |
| `Given I set variable {string} to {string}` | Set variable |
| `Then the variable {string} should equal {string}` | Assert variable |
| `Given I register cleanup for {string} {string}` | Register cleanup |

[Full Shared Steps Reference](./shared-steps.md)

---

## Tag Requirements

| Tag | Available Steps |
|-----|-----------------|
| `@api` | API steps, Shared steps |
| `@ui` | UI steps, Shared steps |
| `@tui` | TUI steps, Shared steps |
| `@hybrid` | API steps, UI steps, Shared steps |

---

## Common Patterns

### API: Create and verify resource

```gherkin
@api
Scenario: Create user
  Given I am authenticated as an admin via API
  When I POST "/users" with JSON body:
    """
    { "email": "test@example.com", "name": "Test User" }
    """
  Then the response status should be 201
  And I store the value at "id" as "userId"
  And the value at "email" should equal "test@example.com"
```

### UI: Login flow

```gherkin
@ui
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
@hybrid
Scenario: Create via API, verify in UI
  Given I am authenticated as an admin via API
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
- [Tag System](../../concepts/tag-system.md)

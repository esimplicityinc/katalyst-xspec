# Full-Stack Testing Example

Demonstrates comprehensive full-stack testing with @kata/stack-tests, combining API, UI, and TUI testing in a single project.

## What This Example Shows

- Multi-layer test organization with tags
- Hybrid testing (API + UI in same scenario)
- Shared variable state across layers
- Authentication across different layers
- Cleanup and test isolation
- Tag-based test filtering

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Playwright browsers
- Unix-like environment for TUI tests

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Copy environment file
cp .env.example .env
```

## Running Tests

```bash
# Run all tests
npm test

# Run only API tests
npm run test:api

# Run only UI tests
npm run test:ui

# Run only TUI tests
npm run test:tui

# Run hybrid tests
npm run test:hybrid

# Run with visible browser
npm run test:headed

# Run with debugger
npm run test:debug
```

## Feature Files

### api/users.feature
API-only tests for user endpoints.

### ui/login.feature
UI-only tests for the login page.

### tui/commands.feature
TUI-only tests for terminal commands.

### hybrid/user-journey.feature
Cross-layer tests combining API and UI:
- Create user via API
- Verify user appears in UI
- Clean up via API

## Project Structure

```
full-stack-example/
├── features/
│   ├── api/
│   │   └── users.feature     # API tests
│   ├── ui/
│   │   └── login.feature     # UI tests
│   ├── tui/
│   │   └── commands.feature  # TUI tests
│   └── hybrid/
│       └── user-journey.feature  # Cross-layer tests
├── fixtures.ts               # All adapters configured
├── playwright.config.ts      # Playwright setup
├── package.json
└── .env.example
```

## Tag Organization

| Tag | Description | Adapters Used |
|-----|-------------|---------------|
| `@api` | API-only tests | ApiPort |
| `@ui` | UI-only tests | UiPort |
| `@tui` | TUI-only tests | TuiPort |
| `@hybrid` | Cross-layer tests | Multiple ports |

## Hybrid Testing Pattern

```gherkin
@hybrid
Scenario: Create user via API and verify in UI
  # API layer - create test data
  Given I am authenticated as an admin via API
  When I POST "/users" with JSON body:
    """
    { "email": "test@example.com" }
    """
  And I store the value at "id" as "userId"
  
  # UI layer - verify the data
  Given I navigate to "/admin/users"
  Then I should see text "test@example.com"
  
  # Cleanup happens automatically via CleanupAdapter
```

## Configuration

### adapters Configured

This example configures all available adapters:

1. **PlaywrightApiAdapter** - HTTP API testing
2. **PlaywrightUiAdapter** - Browser automation
3. **TuiTesterAdapter** - Terminal UI testing
4. **DefaultAuthAdapter** - Authentication handling
5. **DefaultCleanupAdapter** - Test data cleanup

### Environment Variables

See `.env.example` for all available configuration options.

## Best Practices Demonstrated

1. **Test Isolation**: Each scenario is independent
2. **Automatic Cleanup**: Resources cleaned up after tests
3. **Shared Variables**: Pass data between layers using variables
4. **Tag Filtering**: Run specific test types
5. **Configuration**: Environment-based settings

## Related Documentation

- [Hybrid Testing Guide](../../docs/guides/hybrid-testing.md)
- [Architecture Concepts](../../docs/concepts/architecture.md)
- [Tag System](../../docs/concepts/tag-system.md)

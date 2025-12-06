# TUI Testing Example

Demonstrates terminal UI testing with @kata/stack-tests using common Unix commands.

## What This Example Shows

- Spawning terminal processes
- Sending input to terminal
- Waiting for specific output
- Testing interactive prompts
- Terminal state assertions

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Unix-like environment (macOS, Linux, WSL)

## Setup

```bash
# Install dependencies
npm install

# Copy environment file (optional)
cp .env.example .env
```

## Running Tests

```bash
# Run all tests
npm test

# Run with debug output
npm run test:debug
```

## Feature Files

### shell.feature
Tests basic shell interactions:
- Running commands
- Checking output
- Environment variables

### interactive.feature
Tests interactive terminal applications:
- Text input
- Navigation
- Menu selection

## Project Structure

```
tui-example/
├── features/
│   ├── shell.feature       # Basic shell tests
│   └── interactive.feature # Interactive app tests
├── fixtures.ts             # Test configuration
├── playwright.config.ts    # Playwright setup
├── package.json
└── .env.example
```

## Testing Your Own CLI

1. Update `fixtures.ts` with your CLI path:

```typescript
export const { test, expect } = createBddTest({
  createTui: () => new TuiTesterAdapter({
    defaultCommand: './my-cli',
  }),
});
```

2. Write feature files for your CLI:

```gherkin
@tui
Feature: My CLI
  Scenario: Run help command
    When I spawn the terminal with "my-cli --help"
    Then I should see "Usage: my-cli [options]" in terminal
```

## Customizing

### Set Terminal Size

Edit `.env`:

```bash
TUI_COLS=120
TUI_ROWS=40
```

### Add Timeout for Slow Commands

In feature file:

```gherkin
When I spawn the terminal with "slow-command"
And I wait up to 30 seconds for "Done" in terminal
```

## Related Documentation

- [TUI Testing Guide](../../docs/guides/tui-testing.md)
- [TUI Steps Reference](../../docs/reference/steps/tui-steps.md)

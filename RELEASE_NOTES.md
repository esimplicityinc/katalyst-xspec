# Release v0.1.0

Initial release of the Katalyst BDD Test framework.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@esimplicity/stack-tests` | 0.1.0 | Core testing library with fixtures, ports, adapters, and step definitions |
| `@esimplicity/create-stack-tests` | 0.1.0 | CLI scaffolding tool for new projects |

## Highlights

### Ports & Adapters Architecture

A clean, extensible architecture using the Ports and Adapters pattern:

- **ApiPort** - HTTP/REST API testing with request/response handling
- **UiPort** - Browser UI testing with Playwright
- **TuiPort** - Terminal UI testing for CLI applications
- **AuthPort** - Pluggable authentication handling
- **CleanupPort** - Test data cleanup management

### Built-in Adapters

- `PlaywrightApiAdapter` - API testing via Playwright's request context
- `PlaywrightUiAdapter` - Full browser automation
- `TuiTesterAdapter` - Terminal application testing
- `UniversalAuthAdapter` - Flexible authentication (basic, bearer, API key, custom)
- `DefaultCleanupAdapter` - Automatic test cleanup

### Pre-built Step Definitions

Ready-to-use Cucumber/Gherkin steps for:

- **API Testing** - HTTP methods, headers, authentication, response assertions
- **UI Testing** - Navigation, clicks, form filling, element assertions, wizards
- **TUI Testing** - Terminal output, keyboard input, interactive prompts
- **Hybrid Testing** - Cross-layer scenarios combining API + UI + TUI
- **Shared Steps** - Variable management, cleanup, common utilities

### Example Projects

Four complete example projects demonstrating real-world usage:

- `api-example` - REST API testing with JSONPlaceholder
- `ui-example` - Browser testing with The Internet
- `tui-example` - Terminal UI testing
- `full-stack-example` - Combined API + UI + TUI testing

### Comprehensive Documentation

- Getting started guides
- Testing guides for each layer (API, UI, TUI, Hybrid)
- Custom adapter and step creation guides
- Full API reference
- Contributing guidelines

## Installation

```bash
# From npm
npm install @esimplicity/stack-tests

# Scaffold a new project
npx @esimplicity/create-stack-tests my-tests
```

## Requirements

- Node.js >= 18.0.0
- Playwright >= 1.49.0
- playwright-bdd >= 8.3.0

## Links

- [Documentation](./docs/README.md)
- [Examples](./examples/README.md)
- [Contributing](./docs/contributing/CONTRIBUTING.md)

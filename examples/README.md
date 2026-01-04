# @kata/stack-tests Examples

Runnable example projects demonstrating @kata/stack-tests usage.

## Available Examples

| Example | Description | Tags Used |
|---------|-------------|-----------|
| [api-example](./api-example/) | REST API testing | `@api` |
| [ui-example](./ui-example/) | Browser UI testing | `@ui` |
| [tui-example](./tui-example/) | Terminal UI testing | `@tui` |
| [full-stack-example](./full-stack-example/) | Combined API + UI + TUI | `@api`, `@ui`, `@tui`, `@hybrid` |

## Quick Start

### Running an Example

```bash
# Navigate to example
cd examples/api-example

# Install dependencies
npm install

# Run tests
npm test
```

### Running with Real Services

Most examples use mock servers by default. To run against real services:

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
vim .env

# Run tests
npm test
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Playwright browsers (installed automatically)

## Example Structure

Each example follows this structure:

```
example-name/
├── features/              # Gherkin feature files
│   └── *.feature
├── steps/                 # Custom step definitions (if any)
│   └── custom.steps.ts
├── fixtures.ts            # Test fixture configuration
├── playwright.config.ts   # Playwright configuration
├── package.json
├── tsconfig.json
├── .env.example           # Environment template
└── README.md              # Example-specific docs
```

## What Each Example Demonstrates

### API Example
- HTTP request methods (GET, POST, PUT, PATCH, DELETE)
- Response assertions
- Variable storage and interpolation
- Authentication flow
- Cleanup registration

### UI Example
- Page navigation
- Form interactions
- Element assertions
- Screenshot capture
- Visual regression (optional)

### TUI Example
- Terminal application spawning
- Text input and navigation
- Screen content assertions
- Wizard/multi-step flows

### Full-Stack Example
- Cross-layer testing (API to seed, UI to verify)
- Hybrid scenarios
- Shared authentication
- Complete user workflows

## Creating Your Own Project

Use the CLI to scaffold a new project:

```bash
npx @kata/create-stack-tests my-project
cd my-project
npm install
npm test
```

## Troubleshooting

### Browser Not Found

```bash
npx playwright install
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Tests Timeout

Increase timeout in `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 60000, // 60 seconds
});
```

## Contributing Examples

To add a new example:

1. Create directory in `examples/`
2. Follow the standard structure
3. Include `README.md` with:
   - What the example demonstrates
   - Prerequisites
   - How to run
4. Test that it runs standalone
5. Submit PR

## Related Documentation

- [Getting Started Guide](../docs/getting-started/quick-start.md)
- [API Testing Guide](../docs/guides/api-testing.md)
- [UI Testing Guide](../docs/guides/ui-testing.md)
- [TUI Testing Guide](../docs/guides/tui-testing.md)

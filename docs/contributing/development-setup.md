# Development Setup

Complete guide to setting up your local development environment for contributing to @kata/stack-tests.

## Prerequisites

| Requirement | Version | Check Command |
|------------|---------|---------------|
| Node.js | >= 18.0.0 | `node --version` |
| npm | >= 9.0.0 | `npm --version` |
| Git | >= 2.30.0 | `git --version` |

## Repository Structure

```
testconvergence/
├── stack-tests/              # Core library (@kata/stack-tests)
│   ├── src/
│   │   ├── ports/            # Interface definitions
│   │   ├── adapters/         # Adapter implementations
│   │   ├── steps/            # Step definitions
│   │   ├── fixtures.ts       # Playwright-BDD fixtures
│   │   └── index.ts          # Public exports
│   ├── tests/                # Unit tests
│   ├── package.json
│   └── tsconfig.json
├── create-stack-tests/       # CLI scaffolding tool
│   └── bin/
│       └── create-stack-tests.js
├── docs/                     # Documentation
├── examples/                 # Example projects
└── package.json              # Root workspace config
```

## Initial Setup

### 1. Fork and Clone

```bash
# Fork via GitHub UI, then:
git clone https://github.com/YOUR_USERNAME/stack-tests.git
cd stack-tests

# Add upstream remote
git remote add upstream https://github.com/kata/stack-tests.git
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Install Playwright browsers (for testing)
npx playwright install
```

### 3. Build the Project

```bash
# Build core library
npm run build -w stack-tests

# Build all packages
npm run build --workspaces
```

### 4. Verify Setup

```bash
# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run typecheck
```

## Development Commands

### Core Library (stack-tests)

```bash
# Build
npm run build -w stack-tests

# Build in watch mode
npm run build:watch -w stack-tests

# Run tests
npm test -w stack-tests

# Type check
npm run typecheck -w stack-tests

# Lint
npm run lint -w stack-tests

# Clean build artifacts
npm run clean -w stack-tests
```

### CLI Tool (create-stack-tests)

```bash
# Test the CLI locally
node create-stack-tests/bin/create-stack-tests.js test-project

# Run CLI tests
npm test -w create-stack-tests
```

### All Packages

```bash
# Build everything
npm run build --workspaces

# Test everything
npm test --workspaces

# Lint everything
npm run lint --workspaces
```

## IDE Setup

### VS Code (Recommended)

Install these extensions:
- **ESLint** - Linting integration
- **Prettier** - Code formatting
- **TypeScript Importer** - Auto-import assistance
- **Cucumber (Gherkin)** - Feature file syntax highlighting

Workspace settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.validate": ["typescript", "javascript"],
  "[typescript]": {
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    }
  }
}
```

### WebStorm/IntelliJ

1. Enable ESLint: **Preferences > Languages & Frameworks > ESLint**
2. Set Prettier as formatter: **Preferences > Languages & Frameworks > Prettier**
3. Install Cucumber plugin for Gherkin support

## Working with Ports and Adapters

### Creating a New Port

```bash
# Create port file
touch stack-tests/src/ports/my-feature.port.ts

# Create adapter directory
mkdir stack-tests/src/adapters/my-feature

# Create adapter files
touch stack-tests/src/adapters/my-feature/my-feature.adapter.ts
touch stack-tests/src/adapters/my-feature/index.ts
```

### Creating Step Definitions

```bash
# Create step file
touch stack-tests/src/steps/my-feature.basic.ts

# Register in steps index
# Edit stack-tests/src/steps/index.ts
```

## Testing During Development

### Unit Tests

```bash
# Run specific test file
npm test -- --grep "ApiPort"

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Integration Testing

Test your changes against a real project:

```bash
# Create test project
cd /tmp
npx create-stack-tests my-test-app

# Link local library
cd my-test-app
npm link ../path/to/stack-tests

# Run tests
npm test
```

### Manual Testing

```bash
# Build and link
cd stack-tests
npm run build
npm link

# Use in test project
cd ../my-test-project
npm link @kata/stack-tests

# Make changes, rebuild, and test
cd ../stack-tests
npm run build
# Changes automatically reflected via link
```

## Debugging

### Debug Tests in VS Code

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/playwright",
      "args": ["test", "--debug"],
      "cwd": "${workspaceFolder}/stack-tests",
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Step Definitions

```typescript
// Add console.log for debugging
Given('I debug this step', async ({ world }) => {
  console.log('Variables:', world.variables);
  console.log('Last Response:', world.lastJson);
  debugger; // Breakpoint if using debugger
});
```

### Playwright Inspector

```bash
# Run with Playwright Inspector
PWDEBUG=1 npm test
```

## Syncing with Upstream

```bash
# Fetch upstream changes
git fetch upstream

# Merge into your branch
git checkout main
git merge upstream/main

# Rebase your feature branch
git checkout feat/my-feature
git rebase main
```

## Troubleshooting

### Build Errors

```bash
# Clear all build artifacts
npm run clean --workspaces

# Remove node_modules
rm -rf node_modules
rm -rf stack-tests/node_modules
rm -rf create-stack-tests/node_modules

# Reinstall
npm install
```

### Type Errors

```bash
# Regenerate TypeScript build info
rm -rf stack-tests/dist
rm stack-tests/*.tsbuildinfo

npm run build -w stack-tests
```

### Test Failures

```bash
# Run tests with verbose output
npm test -- --verbose

# Run single test in isolation
npm test -- --grep "specific test name" --workers=1
```

## Related Guides

- [Coding Standards](./coding-standards.md) - Style guidelines
- [Testing](./testing.md) - How to write tests
- [Adding Ports](./adding-ports.md) - Create new ports

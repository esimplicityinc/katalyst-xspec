# Development Setup

Complete guide to setting up your local development environment for contributing to @esimplicityinc/katalyst-xspec.

## Prerequisites

| Requirement | Version | Check Command |
|------------|---------|---------------|
| Node.js | >= 18.0.0 | `node --version` |
| npm | >= 9.0.0 | `npm --version` |
| Git | >= 2.30.0 | `git --version` |

## Repository Structure

```
testconvergence/
├── katalyst-xspec/              # Core library (@esimplicityinc/katalyst-xspec)
│   ├── src/
│   │   ├── ports/            # Interface definitions
│   │   ├── adapters/         # Adapter implementations
│   │   ├── steps/            # Step definitions
│   │   ├── fixtures.ts       # Playwright-BDD fixtures
│   │   └── index.ts          # Public exports
│   ├── bin/katalyst-xspec.cjs  # CLI entry point (dispatches subcommands)
│   ├── cli/                  # init / upgrade / stubs subcommands
│   ├── skills/               # Agent Skills bundled for `init --with-skills`
│   ├── test/                 # CLI tests
│   ├── package.json
│   └── tsconfig.json
├── docs/                     # Documentation
├── examples/                 # Example projects
└── package.json              # Root workspace config
```

## Initial Setup

### 1. Fork and Clone

```bash
# Fork via GitHub UI, then:
git clone https://github.com/YOUR_USERNAME/katalyst-xspec.git
cd katalyst-xspec

# Add upstream remote
git remote add upstream https://github.com/kata/katalyst-xspec.git
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
npm run build -w katalyst-xspec

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

### Core Library (katalyst-xspec)

```bash
# Build
npm run build -w katalyst-xspec

# Build in watch mode
npm run build:watch -w katalyst-xspec

# Run tests
npm test -w katalyst-xspec

# Type check
npm run typecheck -w katalyst-xspec

# Lint
npm run lint -w katalyst-xspec

# Clean build artifacts
npm run clean -w katalyst-xspec
```

### CLI (`katalyst-xspec`)

```bash
# Run the CLI locally
node katalyst-xspec/bin/katalyst-xspec.cjs init --dir test-project

# Library + CLI tests
npm test -w katalyst-xspec
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
touch katalyst-xspec/src/ports/my-feature.port.ts

# Create adapter directory
mkdir katalyst-xspec/src/adapters/my-feature

# Create adapter files
touch katalyst-xspec/src/adapters/my-feature/my-feature.adapter.ts
touch katalyst-xspec/src/adapters/my-feature/index.ts
```

### Creating Step Definitions

```bash
# Create step file
touch katalyst-xspec/src/steps/my-feature.basic.ts

# Register in steps index
# Edit katalyst-xspec/src/steps/index.ts
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
npx @esimplicityinc/katalyst-xspec init my-test-app

# Link local library
cd my-test-app
npm link ../path/to/katalyst-xspec

# Run tests
npm test
```

### Manual Testing

```bash
# Build and link
cd katalyst-xspec
npm run build
npm link

# Use in test project
cd ../my-test-project
npm link @esimplicityinc/katalyst-xspec

# Make changes, rebuild, and test
cd ../katalyst-xspec
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
      "cwd": "${workspaceFolder}/katalyst-xspec",
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
rm -rf katalyst-xspec/node_modules

# Reinstall
npm install
```

### Type Errors

```bash
# Regenerate TypeScript build info
rm -rf katalyst-xspec/dist
rm katalyst-xspec/*.tsbuildinfo

npm run build -w katalyst-xspec
```

### Test Failures

```bash
# Run tests with verbose output
npm test -- --verbose

# Run single test in isolation
npm test -- --grep "specific test name" --workers=1

# Or use the WORKERS env var (respected by resolveWorkers)
WORKERS=1 npm test
```

## Related Guides

- [Coding Standards](./coding-standards.md) - Style guidelines
- [Testing](./testing.md) - How to write tests
- [Adding Ports](./adding-ports.md) - Create new ports

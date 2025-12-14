# Installation

This guide covers installing @kata/stack-tests and its dependencies.

## Prerequisites

### Required
- **Node.js** 18.x or higher
- **npm**, **yarn**, **pnpm**, or **bun**

### Optional (for TUI testing)
- **tmux** - Required for terminal UI testing

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# Fedora
sudo dnf install tmux

# Verify installation
tmux -V
```

## Installation Methods

### Method 1: Using the Scaffold CLI (Recommended)

The fastest way to get started is using the `create-stack-tests` CLI:

```bash
# From your project root
npx @kata/create-stack-tests

# Or with a custom directory name
npx @kata/create-stack-tests --dir e2e-tests
```

This creates a complete test package with:
- Pre-configured Playwright setup
- Example feature files
- Step registration
- Environment template

### Method 2: Manual Installation

#### Via GitHub Packages

1. Configure npm to use GitHub Packages for @kata scope:

```bash
npm config set @kata:registry https://npm.pkg.github.com
```

2. Authenticate with GitHub:

```bash
npm set //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

3. Install the package:

```bash
npm install -D @kata/stack-tests
```

4. Install peer dependencies:

```bash
npm install -D @playwright/test playwright-bdd typescript
```

5. (Optional) Install TUI testing support:

```bash
npm install -D tui-tester
```

#### Local/Workspace Development

If working within the monorepo:

```bash
# Using npm workspaces
npm install

# Or link directly
npm install -D @kata/stack-tests@"file:../stack-tests"
```

## Peer Dependencies

@kata/stack-tests requires these peer dependencies:

| Package | Version | Required |
|---------|---------|----------|
| `@playwright/test` | ^1.49.0 | Yes |
| `playwright-bdd` | ^8.3.0 | Yes |
| `typescript` | ^5.6.0 | Yes |
| `tui-tester` | ^1.0.0 | No (optional) |

## Verify Installation

Create a simple test to verify everything works:

```typescript
// test-setup.ts
import { createBddTest } from '@kata/stack-tests';

const test = createBddTest();
console.log('Installation successful!');
```

```bash
npx tsx test-setup.ts
```

## Project Structure

After installation, your project should look like:

```
your-project/
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── features/
│   ├── api/
│   │   └── *.feature
│   ├── ui/
│   │   └── *.feature
│   └── steps/
│       ├── fixtures.ts
│       └── steps.ts
└── .env (optional)
```

## Next Steps

- [Quick Start](./quick-start.md) - Write your first test
- [Project Setup](./project-setup.md) - Configure Playwright projects

## Troubleshooting

### "Cannot find module '@kata/stack-tests'"

Ensure you've configured the GitHub Packages registry:

```bash
npm config get @kata:registry
# Should output: https://npm.pkg.github.com
```

### "tui-tester is not installed"

TUI testing is optional. Install if needed:

```bash
npm install -D tui-tester
```

Also ensure tmux is installed on your system.

### TypeScript errors

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node", "@playwright/test"]
  }
}
```

# Installation

This guide covers installing @esimplicityinc/katalyst-xspec and its dependencies.

## Prerequisites

### Required
- **Node.js** 20.x or higher
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

## Registry Setup (GitHub Packages)

`@esimplicityinc/katalyst-xspec` and `@esimplicityinc/create-katalyst-xspec` are published to GitHub Packages. Before installing, map the scope in your project's `.npmrc`:

```
@esimplicityinc:registry=https://npm.pkg.github.com
```

and authenticate with a GitHub token that has `read:packages` in your user `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=<your_github_token>
```

## Installation Methods

### Method 1: Using the Scaffold CLI (Recommended)

The fastest way to get started is using the `create-katalyst-xspec` CLI:

```bash
# From your project root
npx @esimplicityinc/create-katalyst-xspec

# Or with a custom directory name
npx @esimplicityinc/create-katalyst-xspec --dir e2e-tests
```

This creates a complete test package with:
- Pre-configured Playwright setup
- Example feature files
- Step registration
- Environment template
- Utility scripts for upgrading and step generation

#### Agent Skills (Optional)

The CLI can also install [Agent Skills](../guides/agent-skills.md) for AI-assisted development:

```bash
# Install with Agent Skills (you'll be prompted to select agents)
npx @esimplicityinc/create-katalyst-xspec --with-skills

# Install skills for specific agents
npx @esimplicityinc/create-katalyst-xspec --with-skills --skills-agents opencode,claude

# Skip skills installation
npx @esimplicityinc/create-katalyst-xspec --no-skills
```

Available agent options: `opencode`, `claude`, `cursor`, `generic`

### Method 2: Manual Installation

1. Install the package:

```bash
npm install -D @esimplicityinc/katalyst-xspec
```

2. Install peer dependencies:

```bash
npm install -D @playwright/test playwright-bdd typescript
```

3. (Optional) Install TUI testing support:

```bash
npm install -D tui-tester
```

### Local/Workspace Development

If working within the monorepo:

```bash
# Using npm workspaces
npm install

# Or link directly
npm install -D @esimplicityinc/katalyst-xspec@"file:../katalyst-xspec"
```

## Peer Dependencies

@esimplicityinc/katalyst-xspec requires these peer dependencies:

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
import { createBddTest } from '@esimplicityinc/katalyst-xspec';

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

## Included Scripts

The scaffolded project includes these npm scripts:

| Script | Description |
|--------|-------------|
| `npm run gen` | Generate Playwright tests from feature files |
| `npm run gen:stubs` | Generate step stubs for undefined steps |
| `npm test` | Generate tests and run them |
| `npm run check-updates` | Check for framework updates |
| `npm run upgrade` | Upgrade framework to latest version |
| `npm run upgrade:migrate` | Full scaffolding migration |
| `npm run clean` | Remove generated files and node_modules |

## Next Steps

- [Quick Start](./quick-start.md) - Write your first test
- [Project Setup](./project-setup.md) - Configure Playwright projects
- [Upgrading](../guides/upgrading.md) - Keep your framework up to date

## Troubleshooting

### "Cannot find module '@esimplicityinc/katalyst-xspec'"

Ensure you've installed the package:

```bash
npm install -D @esimplicityinc/katalyst-xspec
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

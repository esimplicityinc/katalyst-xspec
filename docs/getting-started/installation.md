# Installation

This guide covers installing @esimplicitylabs/katalyst-xspec and its dependencies.

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

## Installation Methods

### Method 1: Using the Scaffold CLI (Recommended)

The fastest way to get started is using the `katalyst-xspec init` command:

```bash
# Scaffold into a new folder
npx @esimplicitylabs/katalyst-xspec init my-tests

# Or into the current folder
npx @esimplicitylabs/katalyst-xspec init .

# --dir also works; --force overwrites existing files
npx @esimplicitylabs/katalyst-xspec init --dir e2e-tests
```

Then install dependencies and the browser (one-time, required for UI tests):

```bash
cd my-tests
npm install
npx playwright install chromium
npm test
```

This creates a complete test package with:
- Pre-configured Playwright setup (`api` and `ui` projects; `tui` commented out)
- Two example features (`features/api/example.feature`, `features/ui/example.feature`) that pass with no `.env`
- Step registration
- Environment template
- Utility scripts for upgrading and step generation

The `package.json` name is taken from the target folder (npm-safe, e.g. `My Demo` becomes `my-demo`).

#### Agent Skills (Optional)

The CLI can also install [Agent Skills](../guides/agent-skills.md) for AI-assisted development:

```bash
# Install with Agent Skills (you'll be prompted to select agents)
npx @esimplicitylabs/katalyst-xspec init --with-skills

# Install skills for specific agents
npx @esimplicitylabs/katalyst-xspec init --with-skills --skills-agents opencode,claude-code

# Skip skills installation
npx @esimplicitylabs/katalyst-xspec init --no-skills
```

Available agent options: `opencode`, `claude-code`, `cursor`, `generic`

### Method 2: Manual Installation

1. Install the package:

```bash
npm install -D @esimplicitylabs/katalyst-xspec
```

2. Install peer dependencies:

```bash
npm install -D @playwright/test playwright-bdd typescript
```

3. Download the browser used by UI tests:

```bash
npx playwright install chromium
```

4. (Optional) Install TUI testing support:

```bash
npm install -D tui-tester
```

### Local/Workspace Development

If working within the monorepo:

```bash
# Using npm workspaces
npm install

# Or link directly
npm install -D @esimplicitylabs/katalyst-xspec@"file:../katalyst-xspec"
```

## Peer Dependencies

@esimplicitylabs/katalyst-xspec requires these peer dependencies:

| Package | Version | Required |
|---------|---------|----------|
| `@playwright/test` | ^1.49.0 | Yes |
| `playwright-bdd` | ^9.1.0 | Yes |
| `typescript` | ^5.6.0 | Yes |
| `tui-tester` | ^1.0.0 | No (optional) |

## Verify Installation

Create a simple test to verify everything works:

```typescript
// test-setup.ts
import { createBddTest } from '@esimplicitylabs/katalyst-xspec';

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
│   │   └── example.feature
│   ├── ui/
│   │   └── example.feature
│   └── steps/
│       ├── fixtures.ts
│       └── steps.ts
├── .env.example
└── .env (optional)
```

Each folder under `features/` is read by one Playwright project. Any step works in any scenario.

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

### "Cannot find module '@esimplicitylabs/katalyst-xspec'"

Ensure you've installed the package:

```bash
npm install -D @esimplicitylabs/katalyst-xspec
```

### "Executable doesn't exist" / browser not found

UI tests need a Playwright browser. Run once:

```bash
npx playwright install chromium
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

# Katalyst XSpec

Internal monorepo for Playwright BDD testing utilities and scaffolding.

## Packages

| Package | Description |
|---------|-------------|
| **@esimplicitylabs/katalyst-xspec** (`katalyst-xspec/`) | Fixtures, ports, adapters and step definitions for API/UI/TUI testing, plus the `katalyst-xspec` CLI (`init`, `upgrade`, `stubs`) |

## Quick Start

```bash
# Install dependencies
npm install

# Build the library
npm run build -w @esimplicitylabs/katalyst-xspec

# Scaffold a new test project
npx @esimplicitylabs/katalyst-xspec init my-tests
```

## Documentation

Full documentation is available in the [`docs/`](./docs/) folder:

- **[Getting Started](./docs/getting-started/)** - Installation, quick start, project setup
- **[Concepts](./docs/concepts/)** - Architecture, world state, test lifecycle, tag system
- **[Guides](./docs/guides/)** - API, UI, TUI, and hybrid testing guides
- **[Agent Skills](./docs/guides/agent-skills.md)** - AI-assisted development with OpenCode, Claude Code, Cursor
- **[Reference](./docs/reference/)** - API reference for ports, adapters, fixtures, and steps
- **[Contributing](./docs/contributing/)** - How to contribute to the project

## Examples

Runnable example projects are in the [`examples/`](./examples/) folder:

| Example | Description |
|---------|-------------|
| [api-example](./examples/api-example/) | REST API testing with JSONPlaceholder |
| [ui-example](./examples/ui-example/) | Browser UI testing with The Internet |
| [tui-example](./examples/tui-example/) | Terminal UI testing |
| [full-stack-example](./examples/full-stack-example/) | Combined API + UI + TUI testing |

## Architecture

The framework uses a **Ports and Adapters** pattern:

```
Feature Files (.feature)
        |
        v
  Step Definitions
        |
        v
     Ports (interfaces)
        |
        v
   Adapters (implementations)
        |
        v
  Playwright / tui-tester
```

### Available Ports

- **ApiPort** - HTTP API testing
- **UiPort** - Browser UI testing
- **TuiPort** - Terminal UI testing
- **AuthPort** - Authentication handling
- **CleanupPort** - Test data cleanup

### Tag System

| Tag | Description |
|-----|-------------|
| `@api` | API-only scenarios |
| `@ui` | Browser UI scenarios |
| `@tui` | Terminal UI scenarios |
| `@hybrid` | Cross-layer scenarios |

## Agent Skills

Katalyst BDD includes [Agent Skills](./docs/guides/agent-skills.md) for AI-assisted development. These help AI coding assistants (OpenCode, Claude Code, Cursor) understand the framework and generate better tests.

```bash
# Install with Agent Skills
npx @esimplicitylabs/katalyst-xspec init --with-skills

# Update skills in existing project
npx katalyst-xspec upgrade --update-skills
```

## Upgrading

The framework includes powerful upgrade and migration tools:

```bash
# Check for updates
npm run check-updates

# Simple package upgrade
npm run upgrade

# Full scaffolding migration (preserves custom files)
npm run upgrade:migrate

# Interactive upgrade mode
npx katalyst-xspec upgrade -i

# Generate step stubs for missing steps
npm run gen:stubs
```

See the [Upgrading Guide](./docs/guides/upgrading.md) for details.

## Development

```bash
# Build all packages
npm run build --workspaces

# Run tests
npm test --workspaces

# Lint code
npm run lint --workspaces
```

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- Playwright >= 1.49.0
- playwright-bdd >= 8.3.0

## Installation

Published on npmjs.com as [`@esimplicitylabs/katalyst-xspec`](https://www.npmjs.com/package/@esimplicitylabs/katalyst-xspec). No registry setup or token needed.

```bash
# scaffold a new project
npx @esimplicitylabs/katalyst-xspec init my-tests

# or add to an existing one
npm install -D @esimplicitylabs/katalyst-xspec
```

### Migrating from an older name

Earlier releases were `@esimplicity/stack-tests` (npmjs.com, up to 0.3.0) and `@esimplicityinc/katalyst-xspec` (GitHub Packages, 0.4.0–0.5.0). In an existing project, run:

```bash
npx @esimplicitylabs/katalyst-xspec upgrade
```

It rewrites imports in `features/` and `playwright.config.*`, updates `package.json` scripts, removes the old GitHub Packages line from `.npmrc`, and swaps the dependency.

## Publishing

Publishing a **GitHub Release** (or manually running the `Publish Packages` workflow) publishes to npmjs.com via npm trusted publishing (OIDC). No tokens are stored; see `.github/workflows/publish.yml` for the one-time npmjs.com setup.

## Notes

- Keep `@playwright/test` and `playwright-bdd` versions aligned with peer requirements
- TUI testing requires `tui-tester` (optional peer dependency)

## License

SEE LICENSE IN LICENSE

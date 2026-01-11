# Katalyst BDD-Test

Internal monorepo for Playwright BDD testing utilities and scaffolding.

## Packages

| Package | Description |
|---------|-------------|
| **@esimplicityinc/stack-tests** (`stack-tests/`) | Reusable fixtures, ports, adapters, and step definitions for API/UI/TUI testing |
| **@esimplicityinc/create-stack-tests** (`create-stack-tests/`) | CLI to scaffold a new Playwright-BDD test project |

## Quick Start

```bash
# Install dependencies
npm install

# Build the library
npm run build -w @esimplicityinc/stack-tests

# Scaffold a new test project
npx @esimplicityinc/create-stack-tests my-tests
```

## Documentation

Full documentation is available in the [`docs/`](./docs/) folder:

- **[Getting Started](./docs/getting-started/)** - Installation, quick start, project setup
- **[Concepts](./docs/concepts/)** - Architecture, world state, test lifecycle, tag system
- **[Guides](./docs/guides/)** - API, UI, TUI, and hybrid testing guides
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

### From npm (Recommended)

```bash
npm install @esimplicity/stack-tests

# or scaffold a new project
npx @esimplicity/create-stack-tests my-tests
```

### From GitHub Packages

For internal use, install from GitHub Packages:

1. Create or update `.npmrc` in your project root:

```
@esimplicityinc:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

2. Generate a GitHub Personal Access Token with `read:packages` scope

3. Set the token as an environment variable:

```bash
export NPM_TOKEN=your_github_token
```

4. Install the packages:

```bash
npm install @esimplicityinc/stack-tests
```

> **Note:** Packages are published with different scopes:
> - **npm:** `@esimplicity/stack-tests`
> - **GitHub Packages:** `@esimplicityinc/stack-tests`

## Publishing

Packages are automatically published to **both npm and GitHub Packages** when:
- A new **GitHub Release** is created
- The workflow is **manually triggered** from the Actions tab

### Setup Required

- **npm:** Add `NPM_TOKEN` secret to your repository (generate at [npmjs.com](https://www.npmjs.com/settings/~/tokens))
- **GitHub Packages:** Uses `GITHUB_TOKEN` automatically

## Notes

- Packages are intended for internal use via GitHub Packages
- Keep `@playwright/test` and `playwright-bdd` versions aligned with peer requirements
- TUI testing requires `tui-tester` (optional peer dependency)

## License

SEE LICENSE IN LICENSE

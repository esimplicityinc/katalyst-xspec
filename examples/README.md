# @esimplicitylabs/katalyst-xspec Examples

Runnable example projects. The API and UI examples call public demo sites, so they pass with no setup.

| Example | What it tests | Target |
|---------|---------------|--------|
| [api-example](./api-example/) | REST API requests and JSON assertions | [JSONPlaceholder](https://jsonplaceholder.typicode.com) |
| [ui-example](./ui-example/) | Browser login, forms, dropdowns, cart | [Sauce Demo](https://www.saucedemo.com) |
| [full-stack-example](./full-stack-example/) | API and UI projects, plus a scenario mixing both; `@smoke` grouping | both of the above |
| [tui-example](./tui-example/) | An interactive command-line app driven through tmux | `app.mjs` (included) |

## Run one

Requires Node.js >= 20.

```bash
cd examples/ui-example
npm install
npx playwright install chromium   # UI examples only; one-time browser download
npm test
```

The TUI example also needs [tmux](https://github.com/tmux/tmux).

## Layout

Every example uses the same layout as a project created with `katalyst-xspec init`:

```
example-name/
├── features/
│   ├── *.feature           # scenarios
│   └── steps/
│       ├── fixtures.ts     # createBddTest(...) adapter wiring
│       └── steps.ts        # registers the built-in steps
├── playwright.config.ts
├── package.json            # "test": "bddgen && playwright test"
└── README.md
```

Steps are untagged, so any registered step works in any scenario.

## Pointing an example at your own app

Set `API_BASE_URL` and/or `FRONTEND_URL` when running, e.g. `FRONTEND_URL=https://app.example.com npm test`, and change the paths in the feature files.

## Start your own project

```bash
npx @esimplicitylabs/katalyst-xspec init my-tests
cd my-tests
npm install
npx playwright install chromium
npm test
```

## Related docs

- [Quick Start](../docs/getting-started/quick-start.md)
- [API Testing](../docs/guides/api-testing.md) · [UI Testing](../docs/guides/ui-testing.md) · [Hybrid Testing](../docs/guides/hybrid-testing.md) · [TUI Testing](../docs/guides/tui-testing.md)
- [CLI reference](../docs/reference/cli.md)

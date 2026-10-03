# Full-Stack Example

API and UI tests in one project, including a scenario that mixes both. Uses [JSONPlaceholder](https://jsonplaceholder.typicode.com) for the API and [Sauce Demo](https://www.saucedemo.com) for the UI.

## What it shows

- Two Playwright projects, `api` and `ui`, each running the feature files in its folder
- A scenario that calls the API, stores a value, and types it into the UI (`features/ui/api-then-ui.feature`), with no special tags or setup
- Your own tags for grouping: scenarios tagged `@smoke` can be run on their own

## Run it

Requires Node.js >= 20.

```bash
npm install
npx playwright install chromium   # one-time browser download
npm test             # everything
npm run test:api     # just features/api
npm run test:ui      # just features/ui
npm run test:smoke   # just @smoke scenarios (TEST_TAGS=@smoke)
```

## Files

```
features/
├── api/users.feature         # API scenarios
├── ui/checkout.feature       # full checkout in the browser
├── ui/api-then-ui.feature    # API + UI steps in one scenario
└── steps/
    ├── fixtures.ts           # createBddTest() with default adapters
    └── steps.ts              # registers API, UI and shared steps
playwright.config.ts          # api + ui projects, TEST_TAGS, cucumber reports
```

Reports are written to `cucumber-report/index.html`. Override targets with `API_BASE_URL` and `FRONTEND_URL`.

For terminal apps see the [TUI example](../tui-example/). More: [Hybrid Testing guide](../../docs/guides/hybrid-testing.md), [Tags](../../docs/concepts/tag-system.md).

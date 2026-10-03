# UI Example

Browser tests with `@esimplicitylabs/katalyst-xspec` against [Sauce Demo](https://www.saucedemo.com), a public shop built for test automation.

## What it shows

- Filling fields by placeholder and clicking buttons by name
- Text, URL, visibility, attribute and input-value assertions
- Selecting from a dropdown
- Clicking by CSS selector (`[data-test='...']`)

## Run it

Requires Node.js >= 20.

```bash
npm install
npx playwright install chromium   # one-time browser download
npm test
```

## Files

```
features/
├── login.feature         # valid, locked-out and wrong-password logins
├── inventory.feature     # sorting, cart, product page
└── steps/
    ├── fixtures.ts       # createBddTest() with default adapters
    └── steps.ts          # registers UI + shared steps
playwright.config.ts      # baseURL (default Sauce Demo), Chromium project
```

To test your own app, run with `FRONTEND_URL=https://app.example.com npm test` and change the paths in the features.

See the [UI Testing guide](../../docs/guides/ui-testing.md) and [UI steps](../../docs/reference/steps/ui-steps.md).

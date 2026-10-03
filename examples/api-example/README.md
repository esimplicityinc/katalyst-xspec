# API Example

API tests with `@esimplicitylabs/katalyst-xspec` against [JSONPlaceholder](https://jsonplaceholder.typicode.com), a free public fake REST API.

## What it shows

- `GET`/`POST` requests and status assertions
- JSON assertions (`the value at "address.city" should equal ...`)
- Storing values and reusing them (`{userId}`)
- Generated data (`I generate a UUID and store as ...`) and a Scenario Outline

## Run it

Requires Node.js >= 20.

```bash
npm install
npm test
```

## Files

```
features/
├── users.feature         # users endpoints
├── posts.feature         # posts endpoints, variables, outline
└── steps/
    ├── fixtures.ts       # createBddTest() with default adapters
    └── steps.ts          # registers API + shared steps
playwright.config.ts      # sets API_BASE_URL (default JSONPlaceholder)
```

To test your own API, run with `API_BASE_URL=https://api.example.com npm test`.

See the [API Testing guide](../../docs/guides/api-testing.md) and [API steps](../../docs/reference/steps/api-steps.md).

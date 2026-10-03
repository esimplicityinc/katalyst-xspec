# @esimplicitylabs/katalyst-xspec

Reusable Playwright-BDD fixtures, ports, adapters, and step registrations for API, UI, and hybrid testing. Designed to be consumed as a dev dependency across repos.

## Install

```bash
npm install -D @esimplicitylabs/katalyst-xspec @playwright/test playwright-bdd
```

Or scaffold a new project:

```bash
npx @esimplicitylabs/katalyst-xspec init my-tests
cd my-tests
npm install
npx playwright install chromium   # one-time browser download for UI tests
npm test
```

## What’s included

- **Fixtures**: `createBddTest` wiring world, api/ui/auth/cleanup adapters.
- **Ports**: `ApiPort`, `UiPort`, `AuthPort`, `CleanupPort`.
- **Adapters**: Playwright API/UI adapters, default cleanup, `UniversalAuthAdapter` (role-based API and UI login).
- **Step registrations**: API (auth/http/assertions), UI (basic + wizard), shared vars/cleanup, hybrid helpers.
- **Config helpers**: `tagsForProject` / `resolveExtraTags` for optional tag filtering (`@Skip`/`@ignore`, `TEST_TAGS`).

## Minimal usage

1) Create fixtures (consumer repo):
```ts
// features/steps/fixtures.ts
import {
  createBddTest,
  PlaywrightApiAdapter,
  PlaywrightUiAdapter,
  UniversalAuthAdapter,
  DefaultCleanupAdapter,
} from '@esimplicitylabs/katalyst-xspec';

export const { test } = createBddTest({
  createApi: ({ apiRequest }) => new PlaywrightApiAdapter(apiRequest),
  createUi: ({ page }) => new PlaywrightUiAdapter(page),
  createAuth: ({ api, ui }) => new UniversalAuthAdapter({ api, ui }),
  createCleanup: () => new DefaultCleanupAdapter(),
});
```

2) Register steps (thin wrappers):
```ts
// features/steps/steps_api/index.ts
import { test } from '../fixtures';
import { registerApiSteps } from '@esimplicitylabs/katalyst-xspec/steps';
registerApiSteps(test);
```

3) Configure Playwright projects with your features/steps globs (each project selects feature files by folder; tags are optional). Keep `@playwright/test` and `playwright-bdd` aligned with peer ranges.

## Logging in

Set credentials per role in `.env` (`AUTH_ADMIN_USERNAME` / `AUTH_ADMIN_PASSWORD`, `AUTH_PM_USERNAME` / ..., any role name) and use the role in features:

```gherkin
Given I am authenticated as "pm" via API
Given I am logged in as "pm"
When I log in as "pm" in UI
```

Missing credentials fail the step with a message naming the variables. Login endpoint, body format, token location and form fields are set with `API_AUTH_*` / `UI_*` variables; see the [Authentication guide](https://github.com/esimplicityinc/katalyst-xspec/blob/main/docs/guides/authentication.md).

`FRONTEND_URL` sets where UI steps go; `API_BASE_URL` is optional (API calls go to `FRONTEND_URL` without it).

## Publishing (npm)

Publishing is automated. The `.github/workflows/publish.yml` workflow builds the package and publishes it to the
public npm registry, authenticating via `actions/setup-node` with `registry-url: https://registry.npmjs.org` and the
`NODE_AUTH_TOKEN` secret. There is no `.npmrc` in this package and none is needed.

To release: bump `version` in `katalyst-xspec/package.json`, land the change, and the workflow publishes it. The
workflow skips any version already present on npm, so a change without a version bump merges green and never
reaches the registry.

## Notes
- Peer dependencies: `@playwright/test`, `playwright-bdd`, `typescript` must be installed in the consuming repo.
- Defaults (auth/cleanup) are examples; override via `createBddTest` options for app-specific behavior.
- Tagging: steps are untagged and work in any scenario; projects select features by folder. Tags are optional for your own grouping (`@smoke`, `@slow`, `@external`), filtered via `TEST_TAGS`; combine with Playwright’s `maxFailures`/reporters as needed.

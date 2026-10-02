# @esimplicitylabs/katalyst-xspec

Reusable Playwright-BDD fixtures, ports, adapters, and step registrations for API, UI, and hybrid testing. Designed to be consumed as a dev dependency across repos.

## Install

```bash
npm install -D @esimplicitylabs/katalyst-xspec @playwright/test playwright-bdd
```

Or scaffold a new project:

```bash
npx @esimplicitylabs/katalyst-xspec init my-tests
```

## What’s included

- **Fixtures**: `createBddTest` wiring world, api/ui/auth/cleanup adapters.
- **Ports**: `ApiPort`, `UiPort`, `AuthPort`, `CleanupPort`.
- **Adapters**: Playwright API/UI adapters, default cleanup, example auth adapter.
- **Step registrations**: API (auth/http/assertions), UI (basic + wizard), shared vars/cleanup, hybrid helpers.
- **Config helpers**: tag expression helpers for project tagging.

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

3) Configure Playwright projects with your features/steps globs and tag expressions. Keep `@playwright/test` and `playwright-bdd` aligned with peer ranges.

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
- Tagging: supports `@api`, `@ui`, `@hybrid`, plus your own (`@smoke`, `@slow`, `@external`); combine with Playwright’s `maxFailures`/reporters as needed.

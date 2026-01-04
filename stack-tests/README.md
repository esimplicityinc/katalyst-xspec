# @kata/stack-tests

Reusable Playwright-BDD fixtures, ports, adapters, and step registrations for API, UI, and hybrid testing. Designed to be consumed as a dev dependency across repos.

## Install

GitHub Packages (recommended for release builds):

```bash
npm config set @kata:registry https://npm.pkg.github.com
npm set //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
npm install -D @kata/stack-tests @playwright/test playwright-bdd
```

Workspace/local development (from this monorepo):

```bash
bun add -d @kata/stack-tests@"file:../packages/stack-tests" @playwright/test playwright-bdd
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
} from '@kata/stack-tests';

export const test = createBddTest({
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
import { registerApiSteps } from '@kata/stack-tests/steps';
registerApiSteps(test);
```

3) Configure Playwright projects with your features/steps globs and tag expressions. Keep `@playwright/test` and `playwright-bdd` aligned with peer ranges.

## Publishing (GitHub Packages)

- Ensure `.npmrc` includes:
  ```
  @kata:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
  ```
- Build then publish:
  ```bash
  npm run build
  npm publish --access public
  ```
  (Adjust access per your org policy.)

## Notes
- Peer dependencies: `@playwright/test`, `playwright-bdd`, `typescript` must be installed in the consuming repo.
- Defaults (auth/cleanup) are examples; override via `createBddTest` options for app-specific behavior.
- Tagging: supports `@api`, `@ui`, `@hybrid`, plus your own (`@smoke`, `@slow`, `@external`); combine with Playwright’s `maxFailures`/reporters as needed.

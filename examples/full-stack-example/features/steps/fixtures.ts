import { createBddTest } from '@esimplicitylabs/katalyst-xspec';

// Defaults: Playwright API + UI adapters, UniversalAuthAdapter, DefaultCleanupAdapter.
// Pass createApi/createUi/createAuth/createCleanup/createTui to customise.
export const { test } = createBddTest();

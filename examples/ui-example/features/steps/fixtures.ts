import { createBddTest } from '@esimplicitylabs/katalyst-xspec';

// Defaults wire PlaywrightUiAdapter to the page; relative paths resolve
// against `use.baseURL` in playwright.config.ts.
export const { test } = createBddTest();

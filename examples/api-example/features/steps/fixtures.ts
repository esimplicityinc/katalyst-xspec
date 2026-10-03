import { createBddTest } from '@esimplicitylabs/katalyst-xspec';

// Defaults wire PlaywrightApiAdapter to the request context; its base URL
// comes from API_BASE_URL (set in playwright.config.ts).
export const { test } = createBddTest();

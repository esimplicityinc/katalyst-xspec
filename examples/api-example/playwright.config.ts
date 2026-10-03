import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { resolveWorkers } from '@esimplicitylabs/katalyst-xspec';

// JSONPlaceholder: a free public fake REST API. Override with API_BASE_URL.
process.env.API_BASE_URL ??= 'https://jsonplaceholder.typicode.com';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'features/steps/**/*.ts',
});

export default defineConfig({
  testDir,
  workers: resolveWorkers(),
  reporter: [['list'], ['html', { open: 'never' }]],
});

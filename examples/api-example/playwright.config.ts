import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'fixtures.ts',
});

export default defineConfig({
  testDir,
  timeout: 30000,
  retries: 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },
});

import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'fixtures.ts',
});

export default defineConfig({
  testDir,
  timeout: 60000, // TUI tests may need longer timeout
  retries: 0,
  reporter: [['html', { open: 'never' }]],
  workers: 1, // Run TUI tests sequentially
});

import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { resolveWorkers } from '@esimplicity/stack-tests';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'fixtures.ts',
});

export default defineConfig({
  testDir,
  timeout: 60000, // TUI tests may need longer timeout
  retries: 0,
  reporter: [['html', { open: 'never' }]],
  workers: resolveWorkers({ testType: 'tui' }), // TUI tests always run sequentially
});

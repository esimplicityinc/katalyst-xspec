import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { resolveWorkers } from '@esimplicitylabs/katalyst-xspec';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'features/steps/**/*.ts',
});

export default defineConfig({
  testDir,
  timeout: 60_000,
  // TUI tests share tmux; run them one at a time.
  workers: resolveWorkers({ testType: 'tui' }),
  reporter: [['list'], ['html', { open: 'never' }]],
});

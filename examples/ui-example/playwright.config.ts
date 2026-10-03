import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { resolveWorkers } from '@esimplicitylabs/katalyst-xspec';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'features/steps/**/*.ts',
});

export default defineConfig({
  testDir,
  workers: resolveWorkers(),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Sauce Demo: a public shop built for test automation. Override with FRONTEND_URL.
    baseURL: process.env.FRONTEND_URL || 'https://www.saucedemo.com',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

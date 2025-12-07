import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'fixtures.ts',
});

export default defineConfig({
  testDir,
  timeout: 60000,
  retries: 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.UI_BASE_URL || 'https://the-internet.herokuapp.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';
import { defineBddProject, cucumberReporter } from 'playwright-bdd';
import { resolveWorkers } from '@esimplicitylabs/katalyst-xspec';

// Define separate BDD projects for each test type
const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',
  steps: 'fixtures.ts',
});

const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'fixtures.ts',
});

const tuiBdd = defineBddProject({
  name: 'tui',
  features: 'features/tui/**/*.feature',
  steps: 'fixtures.ts',
});

const hybridBdd = defineBddProject({
  name: 'hybrid',
  features: 'features/hybrid/**/*.feature',
  steps: 'fixtures.ts',
});

export default defineConfig({
  timeout: 60000,
  retries: 0,
  workers: resolveWorkers(),
  reporter: [
    ['html', { open: 'never' }],
    cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  use: {
    baseURL: process.env.UI_BASE_URL || 'https://the-internet.herokuapp.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { ...apiBdd, use: { ...devices['Desktop Chrome'] } },
    { ...uiBdd, use: { ...devices['Desktop Chrome'] } },
    { ...tuiBdd, workers: resolveWorkers({ testType: 'tui' }) },
    { ...hybridBdd, use: { ...devices['Desktop Chrome'] } },
  ],
});

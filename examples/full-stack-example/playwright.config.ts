import { defineConfig, devices } from '@playwright/test';
import { defineBddProject, cucumberReporter } from 'playwright-bdd';
import { resolveWorkers, resolveExtraTags, tagsForProject } from '@esimplicitylabs/katalyst-xspec';

// Public demo targets; override with API_BASE_URL / FRONTEND_URL.
process.env.API_BASE_URL ??= 'https://jsonplaceholder.typicode.com';
const frontendUrl = process.env.FRONTEND_URL || 'https://www.saucedemo.com';

// Skips @Skip/@ignore and applies TEST_TAGS (e.g. TEST_TAGS=@smoke).
const tags = tagsForProject({ extraTags: resolveExtraTags(process.env.TEST_TAGS) });

// Each project runs the feature files in its folder.
const api = defineBddProject({ name: 'api', features: 'features/api/**/*.feature', steps: 'features/steps/**/*.ts', tags });
const ui = defineBddProject({ name: 'ui', features: 'features/ui/**/*.feature', steps: 'features/steps/**/*.ts', tags });

export default defineConfig({
  workers: resolveWorkers(),
  reporter: [
    ['list'],
    cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  use: { baseURL: frontendUrl, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [api, { ...ui, use: { ...devices['Desktop Chrome'], baseURL: frontendUrl } }],
});

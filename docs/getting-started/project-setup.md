# Project Setup

Configure Playwright and BDD projects for your testing needs.

## Playwright Configuration

### Basic Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { defineBddProject, cucumberReporter } from 'playwright-bdd';
import dotenv from 'dotenv';

dotenv.config();

// Define BDD projects
const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',
  steps: 'features/steps/**/*.ts',
});

const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'features/steps/**/*.ts',
});

export default defineConfig({
  reporter: [
    cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  projects: [apiBdd, uiBdd],
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    headless: process.env.HEADLESS !== 'false',
  },
});
```

### Full Configuration Example

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { defineBddProject, cucumberReporter } from 'playwright-bdd';
import { tagsForProject, resolveExtraTags, resolveWorkers } from '@esimplicitylabs/katalyst-xspec';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Load environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localEnv = path.resolve(__dirname, '.env');
const rootEnv = path.resolve(process.cwd(), '.env');

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}

// Get extra tags from environment or CLI
const extraTags = resolveExtraTags(process.env.TEST_TAGS);

// Define projects
const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: tagsForProject({ extraTags }),
});

const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: tagsForProject({ extraTags }),
});

const tuiBdd = defineBddProject({
  name: 'tui',
  features: 'features/tui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: tagsForProject({ extraTags }),
});

export default defineConfig({
  // Test directory
  testDir: '.features-gen',
  
  // Timeouts
  timeout: 60_000,
  expect: { timeout: 10_000 },
  
  // Parallelism
  fullyParallel: true,
  workers: resolveWorkers(),
  
  // Retries
  retries: process.env.CI ? 2 : 0,
  
  // Reporters
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  
  // Global settings
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    headless: process.env.HEADLESS !== 'false',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  // Projects
  projects: [
    apiBdd,
    {
      ...uiBdd,
      use: { ...devices['Desktop Chrome'] },
    },
    { ...tuiBdd, workers: resolveWorkers({ testType: 'tui' }) },
  ],
  
  // Output
  outputDir: 'test-results',
});
```

## Project Types

Projects select feature files by folder. Steps are not tied to a project: every registered step works in any scenario, so a feature in `features/ui/` can also use API steps.

### API Project

Tests HTTP APIs without a browser:

```typescript
const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',
  steps: 'features/steps/**/*.ts',
});
```

### UI Project

Tests browser-based interfaces:

```typescript
const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'features/steps/**/*.ts',
});

// With specific browser
{
  ...uiBdd,
  use: { ...devices['Desktop Chrome'] },
}
```

### TUI Project

Tests terminal user interfaces:

```typescript
const tuiBdd = defineBddProject({
  name: 'tui',
  features: 'features/tui/**/*.feature',
  steps: 'features/steps/**/*.ts',
});
```

### Hybrid Scenarios

No separate project is needed. A hybrid scenario is simply one that mixes API and UI steps; put it in whichever folder fits (e.g. `features/ui/`). If you prefer a dedicated folder, add another project pointing at it, such as `features/e2e/**/*.feature`.

## Tag Filtering

Tags are optional. The `tags` option on each project only skips `@Skip`/`@ignore` scenarios and applies any tags from `TEST_TAGS`. See [Tags](../concepts/tag-system.md).

### Using tagsForProject Helper

```typescript
import { tagsForProject, resolveExtraTags } from '@esimplicitylabs/katalyst-xspec';

// Basic usage - excludes @Skip and @ignore by default
tagsForProject()
// Result: "not @Skip and not @ignore"

// With extra tags
tagsForProject({ extraTags: '@smoke' })
// Result: "not @Skip and not @ignore and (@smoke)"

// Custom excludes
tagsForProject({ 
  defaultExcludes: 'not @Skip and not @wip' 
})
```

### Environment-Based Tags

```bash
# Run only smoke tests
TEST_TAGS=@smoke npm test

# Run critical and regression
TEST_TAGS="@critical or @regression" npm test

# Comma-separated (auto-converted to OR)
TEST_TAGS=smoke,critical npm test
```

## Fixtures Configuration

### features/steps/fixtures.ts

```typescript
import {
  createBddTest,
  PlaywrightApiAdapter,
  PlaywrightUiAdapter,
  UniversalAuthAdapter,
  DefaultCleanupAdapter,
  TuiTesterAdapter,
} from '@esimplicitylabs/katalyst-xspec';

export const test = createBddTest({
  // API adapter - uses Playwright's request context
  createApi: ({ apiRequest }) => new PlaywrightApiAdapter(apiRequest),
  
  // UI adapter - uses Playwright's page
  createUi: ({ page }) => new PlaywrightUiAdapter(page),
  
  // Auth adapter - combines API and UI auth
  createAuth: ({ api, ui }) => new UniversalAuthAdapter({ api, ui }),
  
  // Cleanup adapter - auto-cleanup after tests
  createCleanup: () => new DefaultCleanupAdapter(),
  
  // TUI adapter (optional) - for terminal testing
  createTui: () => new TuiTesterAdapter({
    command: ['node', 'dist/cli.js'],
    size: { cols: 100, rows: 30 },
    debug: process.env.DEBUG === 'true',
  }),
});
```

### features/steps/steps.ts

```typescript
import { test } from './fixtures';
import {
  registerApiSteps,
  registerUiSteps,
  registerSharedSteps,
  registerHybridSuite,
  registerTuiSteps,
} from '@esimplicitylabs/katalyst-xspec/steps';

// Register step definitions
registerApiSteps(test);
registerUiSteps(test);
registerSharedSteps(test);
registerHybridSuite(test);
registerTuiSteps(test);

export { test };
```

## Environment Variables

### .env File

```bash
# API Configuration
API_BASE_URL=http://localhost:3000
API_AUTH_LOGIN_PATH=/auth/login

# Authentication (required -- no hardcoded defaults)
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=changeme
DEFAULT_USER_USERNAME=user@example.com
DEFAULT_USER_PASSWORD=changeme

# UI Configuration
FRONTEND_URL=http://localhost:3000
HEADLESS=true

# Cleanup Configuration
CLEANUP_ALLOW_ALL=false
# CLEANUP_RULES=[{"varMatch":"user","path":"/api/users/{id}"}]

# Tag Filtering
TEST_TAGS=

# Worker Configuration
# Set to a number for explicit worker count, or "auto" to let Playwright decide
# In CI, defaults to 1 for stability unless explicitly overridden
# WORKERS=auto

# Debug
DEBUG=false
```

## Multiple Browser Testing

```typescript
export default defineConfig({
  projects: [
    // API (no browser needed)
    apiBdd,
    
    // Chrome
    {
      ...uiBdd,
      name: 'ui-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Firefox
    {
      ...uiBdd,
      name: 'ui-firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    // Safari
    {
      ...uiBdd,
      name: 'ui-safari',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile
    {
      ...uiBdd,
      name: 'ui-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
```

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "@playwright/test"]
  },
  "include": [
    "features/**/*.ts",
    "playwright.config.ts"
  ]
}
```

## Next Steps

- [Architecture](../concepts/architecture.md) - Understand ports and adapters
- [API Testing Guide](../guides/api-testing.md) - Detailed API testing
- [UI Testing Guide](../guides/ui-testing.md) - Browser automation patterns

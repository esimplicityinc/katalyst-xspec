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
  tags: '@api',
});

const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: '@ui',
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
import { tagsForProject, resolveExtraTags } from '@kata/stack-tests';
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
  tags: tagsForProject({ projectTag: '@api', extraTags }),
});

const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: tagsForProject({ projectTag: '@ui', extraTags }),
});

const hybridBdd = defineBddProject({
  name: 'hybrid',
  features: 'features/hybrid/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: tagsForProject({ projectTag: '@hybrid', extraTags }),
});

const tuiBdd = defineBddProject({
  name: 'tui',
  features: 'features/tui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: tagsForProject({ projectTag: '@tui', extraTags }),
});

export default defineConfig({
  // Test directory
  testDir: '.features-gen',
  
  // Timeouts
  timeout: 60_000,
  expect: { timeout: 10_000 },
  
  // Parallelism
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  
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
    hybridBdd,
    tuiBdd,
  ],
  
  // Output
  outputDir: 'test-results',
});
```

## Project Types

### API Project

Tests HTTP APIs without a browser:

```typescript
const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: '@api',
});
```

### UI Project

Tests browser-based interfaces:

```typescript
const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: '@ui',
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
  tags: '@tui',
});
```

### Hybrid Project

Tests spanning multiple layers:

```typescript
const hybridBdd = defineBddProject({
  name: 'hybrid',
  features: 'features/hybrid/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: '@hybrid',
});
```

## Tag Filtering

### Using tagsForProject Helper

```typescript
import { tagsForProject, resolveExtraTags } from '@kata/stack-tests';

// Basic usage - excludes @Skip and @ignore by default
tagsForProject({ projectTag: '@api' })
// Result: "not @Skip and not @ignore and @api"

// With extra tags
tagsForProject({ projectTag: '@api', extraTags: '@smoke' })
// Result: "not @Skip and not @ignore and @api and (@smoke)"

// Custom excludes
tagsForProject({ 
  projectTag: '@api', 
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
} from '@kata/stack-tests';

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
} from '@kata/stack-tests/steps';

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
API_BASE_URL=http://localhost:4000
API_AUTH_LOGIN_PATH=/auth/login

# Authentication
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_USER_USERNAME=user@example.com
DEFAULT_USER_PASSWORD=user123

# UI Configuration
FRONTEND_URL=http://localhost:3000
HEADLESS=true

# Cleanup Configuration
CLEANUP_ALLOW_ALL=false

# Tag Filtering
TEST_TAGS=

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

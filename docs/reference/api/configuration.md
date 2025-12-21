# Configuration Reference

Environment variables and configuration helpers.

## Environment Variables

### API Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `'http://localhost:4000'` | Base URL for API requests |
| `CONTROL_TOWER_BASE_URL` | - | Alternative API base URL |
| `CONTROL_TOWER_PORT` | - | Port for localhost URL construction |

**Priority:** `API_BASE_URL` > `CONTROL_TOWER_BASE_URL` > project baseURL > `CONTROL_TOWER_PORT` > default

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_ADMIN_USERNAME` | `'admin@prima.com'` | Admin login username |
| `DEFAULT_ADMIN_EMAIL` | - | Alternative admin username |
| `DEFAULT_ADMIN_PASSWORD` | `'admin1234'` | Admin login password |
| `DEFAULT_USER_USERNAME` | `'bob@bob.com'` | Standard user username |
| `NON_ADMIN_USERNAME` | - | Alternative user username |
| `DEFAULT_USER_PASSWORD` | `'bob1234'` | Standard user password |
| `NON_ADMIN_PASSWORD` | - | Alternative user password |
| `API_AUTH_LOGIN_PATH` | `'/auth/login'` | Login endpoint path |

### UI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `'http://localhost:3000'` | Frontend base URL |
| `BASE_URL` | - | Alternative frontend URL |
| `HEADLESS` | `'true'` | Run browser headless |

### Cleanup Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CLEANUP_RULES` | - | JSON array of custom cleanup rules |
| `CLEANUP_ALLOW_ALL` | `'false'` | Enable heuristic cleanup |

**CLEANUP_ALLOW_ALL values:** `'1'`, `'true'`, `'yes'`, `'on'` (case-insensitive)

### TUI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `'false'` | Enable TUI debug output |

---

## Configuration Helpers

### tagsForProject

Builds tag filter expressions with default excludes.

```typescript
import { tagsForProject } from '@kata/stack-tests';
```

#### Signature

```typescript
function tagsForProject(options: {
  projectTag: string;
  extraTags?: string;
  defaultExcludes?: string;
}): string
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `projectTag` | `string` | Required | Main project tag (e.g., `'@api'`) |
| `extraTags` | `string` | `undefined` | Additional tag filter |
| `defaultExcludes` | `string` | `'not @Skip and not @ignore'` | Tags to exclude |

#### Returns

Tag expression string.

#### Examples

```typescript
// Basic usage
tagsForProject({ projectTag: '@api' })
// Result: "not @Skip and not @ignore and @api"

// With extra tags
tagsForProject({ projectTag: '@api', extraTags: '@smoke' })
// Result: "not @Skip and not @ignore and @api and (@smoke)"

// Complex extra tags
tagsForProject({ projectTag: '@ui', extraTags: '@smoke or @critical' })
// Result: "not @Skip and not @ignore and @ui and (@smoke or @critical)"

// Custom excludes
tagsForProject({ 
  projectTag: '@api', 
  defaultExcludes: 'not @Skip and not @wip and not @flaky' 
})
// Result: "not @Skip and not @wip and not @flaky and @api"
```

---

### resolveExtraTags

Normalizes tag filter input from environment or CLI.

```typescript
import { resolveExtraTags } from '@kata/stack-tests';
```

#### Signature

```typescript
function resolveExtraTags(raw?: string | null): string | undefined
```

#### Behavior

| Input | Result |
|-------|--------|
| Empty/null | `undefined` |
| Tag expression | Passed through |
| Comma-separated | Converted to OR expression |
| Single word | Prefixed with `@` |

#### Examples

```typescript
// Empty input
resolveExtraTags('')
resolveExtraTags(null)
resolveExtraTags(undefined)
// Result: undefined

// Tag expression (passed through)
resolveExtraTags('@smoke or @critical')
// Result: "@smoke or @critical"

resolveExtraTags('not @slow')
// Result: "not @slow"

// Comma-separated (converted to OR)
resolveExtraTags('smoke,critical')
// Result: "@smoke or @critical"

resolveExtraTags('@smoke, @critical, @regression')
// Result: "@smoke or @critical or @regression"

// Single tag
resolveExtraTags('smoke')
// Result: "@smoke"

resolveExtraTags('@smoke')
// Result: "@smoke"
```

---

## Playwright Configuration

### Example Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { defineBddProject, cucumberReporter } from 'playwright-bdd';
import { tagsForProject, resolveExtraTags } from '@kata/stack-tests';
import dotenv from 'dotenv';

dotenv.config();

// Get extra tags from environment
const extraTags = resolveExtraTags(process.env.TEST_TAGS);

// Define BDD projects
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

const tuiBdd = defineBddProject({
  name: 'tui',
  features: 'features/tui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: tagsForProject({ projectTag: '@tui', extraTags }),
});

const hybridBdd = defineBddProject({
  name: 'hybrid',
  features: 'features/hybrid/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: tagsForProject({ projectTag: '@hybrid', extraTags }),
});

export default defineConfig({
  testDir: '.features-gen',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    headless: process.env.HEADLESS !== 'false',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [apiBdd, uiBdd, tuiBdd, hybridBdd],
});
```

---

## Environment File

### .env Example

```bash
# API Configuration
API_BASE_URL=http://localhost:4000
API_AUTH_LOGIN_PATH=/auth/login

# Authentication - Admin
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=AdminPass123

# Authentication - User
DEFAULT_USER_USERNAME=user@example.com
DEFAULT_USER_PASSWORD=UserPass123

# UI Configuration
FRONTEND_URL=http://localhost:3000
HEADLESS=true

# Cleanup
CLEANUP_ALLOW_ALL=false

# Tag Filtering
TEST_TAGS=

# Debug
DEBUG=false
```

### Multiple Environments

```bash
# .env.development
API_BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000

# .env.staging
API_BASE_URL=https://api.staging.example.com
FRONTEND_URL=https://staging.example.com

# .env.production
API_BASE_URL=https://api.example.com
FRONTEND_URL=https://example.com
```

Load specific environment:

```typescript
// playwright.config.ts
import dotenv from 'dotenv';

const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile });
```

```bash
# Run with specific environment
ENV_FILE=.env.staging npm test
```

---

## CLI Usage

### Tag Filtering

```bash
# Via environment variable
TEST_TAGS=@smoke npm test
TEST_TAGS="@smoke or @critical" npm test
TEST_TAGS=smoke,critical npm test

# Via Playwright grep
npx playwright test --grep "@smoke"
npx playwright test --grep "@smoke and @api"
npx playwright test --grep "not @slow"
```

### Project Selection

```bash
# Run specific project
npx playwright test --project=api
npx playwright test --project=ui
npx playwright test --project=tui

# Run multiple projects
npx playwright test --project=api --project=ui
```

### Combined

```bash
# Smoke tests for API only
TEST_TAGS=@smoke npx playwright test --project=api
```

---

## Related Topics

- [Project Setup](../../getting-started/project-setup.md) - Full configuration
- [Tag System](../../concepts/tag-system.md) - Tag filtering details
- [CI/CD Integration](../../guides/ci-cd.md) - CI configuration

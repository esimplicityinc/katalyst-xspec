# Configuration Reference

Environment variables and configuration helpers.

## Environment Variables

### API Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `'http://localhost:3000'` | Base URL for API requests |
| `TARGET_BASE_URL` | - | Alternative API base URL |
| `TARGET_PORT` | - | Port for localhost URL construction |

**Priority:** `API_BASE_URL` > `TARGET_BASE_URL` > project baseURL > `TARGET_PORT` > default

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_ADMIN_USERNAME` | - | Admin login username (required for auth) |
| `DEFAULT_ADMIN_EMAIL` | - | Alternative admin username |
| `DEFAULT_ADMIN_PASSWORD` | - | Admin login password (required for auth) |
| `DEFAULT_USER_USERNAME` | - | Standard user username |
| `NON_ADMIN_USERNAME` | - | Alternative user username |
| `DEFAULT_USER_PASSWORD` | - | Standard user password |
| `NON_ADMIN_PASSWORD` | - | Alternative user password |
| `API_AUTH_LOGIN_PATH` | `'/auth/login'` | Login endpoint path |
| `CLEANUP_AUTH_TOKEN` | - | Static bearer token for cleanup (skips login) |

### UI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `'http://localhost:3000'` | Frontend base URL |
| `BASE_URL` | - | Alternative frontend URL |
| `HEADLESS` | `'true'` | Run browser headless |
| `UI_LOGIN_PATH` | `'/login'` | UI login page path |
| `UI_USERNAME_FIELD` | `'Username'` | Login form username field placeholder |
| `UI_PASSWORD_FIELD` | `'Password'` | Login form password field placeholder |
| `UI_LOGIN_BUTTON` | `'Login'` | Login form submit button text |

### Cleanup Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CLEANUP_RULES` | - | JSON array of custom cleanup rules |
| `CLEANUP_ALLOW_ALL` | `'false'` | Enable heuristic cleanup |

**CLEANUP_ALLOW_ALL values:** `'1'`, `'true'`, `'yes'`, `'on'` (case-insensitive)

**CLEANUP_RULES example:**
```json
[
  {"varMatch": "user", "path": "/api/users/{id}"},
  {"varMatch": "org", "path": "/api/orgs/{id}"},
  {"varMatch": "/^item_/", "method": "POST", "path": "/api/items/{id}/deactivate", "body": {"active": false}}
]
```

### OIDC Cleanup Auth (Optional)

For consumers using `createOidcCleanupAuth()` in their fixture setup:

| Variable | Default | Description |
|----------|---------|-------------|
| `OIDC_TOKEN_URL` | - | Full OIDC token endpoint URL |
| `OIDC_CLIENT_ID` | - | OAuth2 client ID |
| `OIDC_CLIENT_SECRET` | - | OAuth2 client secret (confidential clients) |
| `OIDC_GRANT_TYPE` | `'client_credentials'` | OAuth2 grant type |
| `OIDC_SCOPE` | - | Requested scopes |
| `OIDC_USERNAME` | - | Username for password grant |
| `OIDC_PASSWORD` | - | Password for password grant |
| `OIDC_EXTRA_HEADERS` | - | JSON object of extra headers to include |

### TUI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `'false'` | Enable TUI debug output |

---

## Configuration Helpers

### tagsForProject

Builds tag filter expressions with default excludes.

```typescript
import { tagsForProject } from '@esimplicity/stack-tests';
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
import { resolveExtraTags } from '@esimplicity/stack-tests';
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
import { tagsForProject, resolveExtraTags } from '@esimplicity/stack-tests';
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
API_BASE_URL=http://localhost:3000
API_AUTH_LOGIN_PATH=/auth/login

# Authentication - Admin
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=changeme

# Authentication - User
DEFAULT_USER_USERNAME=user@example.com
DEFAULT_USER_PASSWORD=changeme

# UI Configuration
FRONTEND_URL=http://localhost:3000
HEADLESS=true

# Cleanup
CLEANUP_ALLOW_ALL=false
# CLEANUP_RULES=[{"varMatch":"user","path":"/api/users/{id}"}]

# Tag Filtering
TEST_TAGS=

# Debug
DEBUG=false
```

### Multiple Environments

```bash
# .env.development
API_BASE_URL=http://localhost:3000
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

# Configuration Reference

Environment variables and configuration helpers.

## Environment Variables

### Where tests point

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `http://localhost:3000` | Base URL for UI steps (relative paths like `/login`) |
| `API_BASE_URL` | the frontend URL | Base URL for API steps. Leave unset when the API is on the same origin (`/api/...`). |
| `BASE_URL` | - | Older alias for `FRONTEND_URL` |
| `TARGET_BASE_URL` | - | Older alias for `API_BASE_URL` |
| `TARGET_PORT` | - | API at `http://localhost:<port>` |
| `HEADLESS` | `true` | `false` shows the browser |
| `KATALYST_XSPEC_QUIET` | - | `true` stops the `katalyst-xspec targets: …` line printed at the start of each run |
| `KATALYST_XSPEC_FORCE_IPV4` | `true` | `false` (or `0`) stops rewriting `http://*.localhost` API targets to `127.0.0.1`. See [`resolveApiRequestTarget`](./utilities.md#resolveapirequesttarget). `STACK_TESTS_FORCE_IPV4` also works. |

**API base URL order:** `API_BASE_URL` > `TARGET_BASE_URL` > `baseURL` of a project whose name contains `api` > `TARGET_PORT` > the project's `baseURL` (any project, i.e. the frontend URL) > `http://localhost:3000`.

Absolute URLs in steps (`When I GET "https://…"`) always go exactly where they say.

The scaffolded `playwright.config.ts` resolves these once and prints them:

```typescript
import { resolveTargets, logTargets } from '@esimplicitylabs/katalyst-xspec';

const targets = logTargets(resolveTargets()); // katalyst-xspec targets: UI … | API …
export default defineConfig({ use: { baseURL: targets.frontendUrl } /* ... */ });
```

`resolveTargets(env?)` returns `{ frontendUrl, frontendSource, apiBaseUrl, apiSource }`; `logTargets` prints them in the main process only (not in workers or `bddgen`).

### Authentication

See the [Authentication guide](../../guides/authentication.md) for how these fit together.

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_<ROLE>_USERNAME` / `AUTH_<ROLE>_PASSWORD` | - | Credentials for a role, e.g. `AUTH_ADMIN_*`, `AUTH_PM_*` |
| `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | - | Older names for the `admin` role |
| `DEFAULT_USER_USERNAME` / `DEFAULT_USER_PASSWORD`, `NON_ADMIN_USERNAME` / `NON_ADMIN_PASSWORD` | - | Older names for the `user` role |
| `API_AUTH_LOGIN_PATH` | `/auth/login` | API login endpoint |
| `API_AUTH_BODY` | `form` | `form` or `json` |
| `API_AUTH_USERNAME_FIELD` | `username` | Body field for the username |
| `API_AUTH_PASSWORD_FIELD` | `password` | Body field for the password |
| `API_AUTH_TOKEN_PATH` | common names | Where the token is in the response, e.g. `data.jwt` |
| `UI_LOGIN_PATH` | `/login` | Login page |
| `UI_USERNAME_FIELD` | `Username` | Label, placeholder or `name` of the username field |
| `UI_PASSWORD_FIELD` | `Password` | Label, placeholder or `name` of the password field |
| `UI_LOGIN_BUTTON` | `Login` | Submit button text |
| `UI_LOGIN_SUCCESS_URL` | - | URL part that means "logged in" (default: left the login page) |
| `UI_LOGIN_SUCCESS_TEXT` | - | Text that means "logged in" |
| `UI_LOGIN_TIMEOUT` | `10000` | Milliseconds to wait for the login to finish |
| `UI_SESSION_REUSE` | `true` | `false`: `I am logged in as` submits the form every time |
| `CLEANUP_AUTH_TOKEN` | - | Static bearer token for cleanup (skips login) |

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

### Execution Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKERS` | `undefined` | Worker count override. Set to a positive integer for explicit count, or `'auto'` to let Playwright decide. |
| `CI` | `undefined` | When truthy, `resolveWorkers()` defaults to 1 worker for stability |

---

## Configuration Helpers

### tagsForProject

Builds tag filter expressions with default excludes.

```typescript
import { tagsForProject } from '@esimplicitylabs/katalyst-xspec';
```

#### Signature

```typescript
function tagsForProject(options?: {
  projectTag?: string;
  extraTags?: string;
  defaultExcludes?: string;
}): string
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `projectTag` | `string` | `undefined` | Optional tag to limit the project to (e.g. `'@smoke'`). Not needed for the built-in steps, which work in any scenario. |
| `extraTags` | `string` | `undefined` | Additional tag filter, usually `resolveExtraTags(process.env.TEST_TAGS)` |
| `defaultExcludes` | `string` | `'not @Skip and not @ignore'` | Tags to exclude |

#### Returns

Tag expression string.

#### Examples

```typescript
// Basic usage
tagsForProject()
// Result: "not @Skip and not @ignore"

// With extra tags
tagsForProject({ extraTags: '@smoke' })
// Result: "not @Skip and not @ignore and (@smoke)"

// Complex extra tags
tagsForProject({ extraTags: '@smoke or @critical' })
// Result: "not @Skip and not @ignore and (@smoke or @critical)"

// Optional project tag
tagsForProject({ projectTag: '@regression' })
// Result: "not @Skip and not @ignore and @regression"

// Custom excludes
tagsForProject({ 
  defaultExcludes: 'not @Skip and not @wip and not @flaky' 
})
// Result: "not @Skip and not @wip and not @flaky"
```

---

### resolveExtraTags

Normalizes tag filter input from environment or CLI.

```typescript
import { resolveExtraTags } from '@esimplicitylabs/katalyst-xspec';
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

### resolveWorkers

Resolves the Playwright worker count based on environment variables, test type, and CI detection.

```typescript
import { resolveWorkers } from '@esimplicitylabs/katalyst-xspec';
```

#### Signature

```typescript
function resolveWorkers(options?: ResolveWorkersOptions): number | undefined
```

#### Options

```typescript
type ResolveWorkersOptions = {
  testType?: 'api' | 'ui' | 'tui' | 'hybrid';
  ciWorkers?: number;       // default: 1
  defaultWorkers?: number;  // default: undefined (Playwright decides)
};
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `testType` | `string` | `undefined` | Test type. `'tui'` forces 1 worker. |
| `ciWorkers` | `number` | `1` | Workers in CI when `WORKERS` is not set |
| `defaultWorkers` | `number` | `undefined` | Workers locally when `WORKERS` is not set |

#### Precedence

1. `testType: 'tui'` -- always returns `1`
2. `WORKERS` env var with valid positive integer -- returns that number
3. `CI` env var is truthy -- returns `ciWorkers` (default: `1`)
4. Otherwise -- returns `defaultWorkers` (default: `undefined`, letting Playwright decide)

#### Examples

```typescript
// Basic usage - auto-detects CI, respects WORKERS env var
workers: resolveWorkers(),

// TUI tests - always sequential
workers: resolveWorkers({ testType: 'tui' }),

// Custom CI workers
workers: resolveWorkers({ ciWorkers: 2 }),

// Explicit local default
workers: resolveWorkers({ defaultWorkers: 4 }),
```

```bash
# Override via environment variable
WORKERS=4 npm test

# Let Playwright decide (same as default)
WORKERS=auto npm test
```

---

### getCpuCount

Returns the number of available CPU cores. Useful for logging or diagnostics.

```typescript
import { getCpuCount } from '@esimplicitylabs/katalyst-xspec';
```

#### Signature

```typescript
function getCpuCount(): number
```

#### Example

```typescript
console.log(`Running on ${getCpuCount()} CPU cores`);
```

---

## Playwright Configuration

### Example Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { defineBddProject, cucumberReporter } from 'playwright-bdd';
import {
  tagsForProject,
  resolveExtraTags,
  resolveWorkers,
  resolveTargets,
  logTargets,
} from '@esimplicitylabs/katalyst-xspec';
import dotenv from 'dotenv';

dotenv.config();

// FRONTEND_URL / API_BASE_URL, printed once: "katalyst-xspec targets: UI … | API …"
const targets = logTargets(resolveTargets());

// Get extra tags from environment
const extraTags = resolveExtraTags(process.env.TEST_TAGS);

// Define BDD projects (each selects feature files by folder;
// any step works in any scenario)
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
  testDir: '.features-gen',
  timeout: 60_000,
  fullyParallel: true,
  workers: resolveWorkers(),
  retries: process.env.CI ? 2 : 0,
  
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  
  use: {
    baseURL: targets.frontendUrl,
    headless: process.env.HEADLESS !== 'false',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [apiBdd, uiBdd, tuiBdd],
});
```

---

## Environment File

### .env Example

```bash
# Where to test
FRONTEND_URL=http://localhost:3000
# API_BASE_URL=http://localhost:4000   # only if the API is on another origin
HEADLESS=true

# Who logs in (any role: AUTH_<ROLE>_USERNAME / AUTH_<ROLE>_PASSWORD)
AUTH_ADMIN_USERNAME=admin@example.com
AUTH_ADMIN_PASSWORD=changeme
AUTH_USER_USERNAME=user@example.com
AUTH_USER_PASSWORD=changeme

# API login (defaults shown)
# API_AUTH_LOGIN_PATH=/auth/login
# API_AUTH_BODY=form
# API_AUTH_USERNAME_FIELD=username
# API_AUTH_PASSWORD_FIELD=password
# API_AUTH_TOKEN_PATH=access_token

# UI login (defaults shown)
# UI_LOGIN_PATH=/login
# UI_USERNAME_FIELD=Username
# UI_PASSWORD_FIELD=Password
# UI_LOGIN_BUTTON=Login

# Cleanup
CLEANUP_ALLOW_ALL=false
# CLEANUP_RULES=[{"varMatch":"user","path":"/api/users/{id}"}]

# Tag Filtering
TEST_TAGS=

# Worker Configuration
# WORKERS=auto

# Debug
DEBUG=false
```

### Multiple Environments

```bash
# .env.development (API on the same origin: no API_BASE_URL needed)
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
npx playwright test --grep "@smoke and not @slow"
npx playwright test --grep "not @slow"
```

### Project Selection

Each project runs the feature files in its folder.

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
- [Tags](../../concepts/tag-system.md) - Tag filtering details
- [CI/CD Integration](../../guides/ci-cd.md) - CI configuration
- [Authentication](../../guides/authentication.md) - Roles and login settings

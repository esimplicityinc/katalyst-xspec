# Adapters Reference

Complete reference for all built-in adapters in the Katalyst BDD framework.

## PlaywrightApiAdapter

Implements `ApiPort` using Playwright's `APIRequestContext`.

### Constructor

```typescript
class PlaywrightApiAdapter implements ApiPort {
  constructor(private readonly request: APIRequestContext) {}
}
```

### Configuration

```typescript
// In fixtures.ts
import { createBddTest, PlaywrightApiAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createApi: ({ apiRequest }) => new PlaywrightApiAdapter(apiRequest),
});
```

### Environment Variables

```bash
API_BASE_URL=http://localhost:3000   # optional: defaults to FRONTEND_URL (older alias TARGET_BASE_URL)
```

### Features

- Automatic JSON serialization/deserialization
- Header management via World state
- Response capture for assertions

## PlaywrightUiAdapter

Implements `UiPort` using Playwright's `Page`.

### Constructor

```typescript
class PlaywrightUiAdapter implements UiPort {
  constructor(private readonly page: Page) {}
}
```

### Configuration

```typescript
import { createBddTest, PlaywrightUiAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createUi: ({ page }) => new PlaywrightUiAdapter(page),
});
```

### Environment Variables

```bash
FRONTEND_URL=http://localhost:3000   # older alias BASE_URL
HEADLESS=true
```

### Features

- Intelligent element location (by role, label, text, etc.)
- Automatic waiting for elements
- Multiple click modes (normal, force, dispatch)
- Screenshot and debugging support
- Login helpers used by `UniversalAuthAdapter` (optional on `UiPort`): `fillField(name, value, { timeoutMs })` (label, placeholder or `name`), `waitForUrl(predicate, timeoutMs)`, `waitForText(text, timeoutMs)`, `saveSession()`, `restoreSession(state)`

## TuiTesterAdapter

Implements `TuiPort` using the `tui-tester` library (wraps tmux).

### Constructor

```typescript
class TuiTesterAdapter implements TuiPort {
  constructor(config: TuiConfig) {}
}

type TuiConfig = {
  command: string[];          // Command to run
  size?: { cols: number; rows: number };  // Terminal size
  cwd?: string;               // Working directory
  env?: Record<string, string>;  // Environment variables
  debug?: boolean;            // Enable debug output
  snapshotDir?: string;       // Snapshot directory
  shell?: string;             // Shell to use
};
```

### Configuration

```typescript
import { createBddTest, TuiTesterAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createTui: () => new TuiTesterAdapter({
    command: ['node', 'dist/cli.js'],
    size: { cols: 100, rows: 30 },
    cwd: process.cwd(),
    env: { NODE_ENV: 'test' },
    debug: false,
    snapshotDir: './snapshots',
  }),
});
```

### Prerequisites

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux
```

### Environment Variables

```bash
TUI_COLS=80
TUI_ROWS=24
DEBUG=false
```

### Features

- Full terminal emulation
- Keyboard input (including modifiers)
- Screen capture and assertions
- Snapshot testing
- Mouse support (for TUI apps that support it)

## UniversalAuthAdapter

Implements `AuthPort` for both API and UI authentication.

### Constructor

```typescript
new UniversalAuthAdapter({
  api,                 // ApiPort
  ui,                  // UiPort
  roles?,              // { pm: { username, password } } - overrides AUTH_<ROLE>_* env vars
  env?,                // settings source, default process.env
})
```

### Configuration

```typescript
import { createBddTest, UniversalAuthAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createAuth: ({ api, ui }) => new UniversalAuthAdapter({ api, ui }),
});
```

### Environment Variables

```bash
# Credentials per role (any role name; "project manager" -> AUTH_PROJECT_MANAGER_*)
AUTH_ADMIN_USERNAME=admin@example.com
AUTH_ADMIN_PASSWORD=changeme
AUTH_PM_USERNAME=pm@example.com
AUTH_PM_PASSWORD=secret
# admin/user also accept the older DEFAULT_ADMIN_*, DEFAULT_USER_*, NON_ADMIN_*

# API login (defaults)
API_AUTH_LOGIN_PATH=/auth/login
API_AUTH_BODY=form            # or json
API_AUTH_USERNAME_FIELD=username
API_AUTH_PASSWORD_FIELD=password
# API_AUTH_TOKEN_PATH=data.jwt  # default tries access_token, token, accessToken, data.*

# UI login (defaults)
UI_LOGIN_PATH=/login
UI_USERNAME_FIELD=Username    # label, placeholder or name
UI_PASSWORD_FIELD=Password
UI_LOGIN_BUTTON=Login
# UI_LOGIN_SUCCESS_URL / UI_LOGIN_SUCCESS_TEXT / UI_LOGIN_TIMEOUT=10000 / UI_SESSION_REUSE=true
```

### Behavior

**API login (`apiLoginAs(world, role)`):**
1. POSTs the role's credentials to `API_AUTH_LOGIN_PATH` (form or JSON)
2. Reads the token and sets `world.headers.Authorization = Bearer <token>`; with no token but a `Set-Cookie`, keeps the cookie session
3. Fails with status, response body and the settings to check on error. Never starts a browser.

**UI login (`uiLoginAs(world, role, { reuseSession })`):**
1. Navigates to `UI_LOGIN_PATH`
2. Fills username/password fields matched by label, placeholder or `name`
3. Clicks `UI_LOGIN_BUTTON` and waits to leave the login page (or for `UI_LOGIN_SUCCESS_URL` / `UI_LOGIN_SUCCESS_TEXT`); fails if it doesn't
4. With `reuseSession` (used by `Given I am logged in as`), saves cookies + localStorage per role per worker and restores them later

**Missing credentials fail** with `MissingCredentialsError` naming the variables to set (no hardcoded defaults, no silent skip).

`apiLoginAsAdmin` / `apiLoginAsUser` / `uiLoginAsAdmin` / `uiLoginAsUser` are the roles `admin` / `user`. `credentialsFor(role)` returns resolved credentials; `clearUiSessions()` forgets saved sessions.

### Extending

Subclass and override `protected apiLogin(world, role, creds)` or `protected uiLogin(world, role, creds)` (e.g. SSO or a multi-step form). `this.api`, `this.ui`, `this.roles`, `this.env` are available. Role lookup, steps and session reuse keep working.

## DefaultCleanupAdapter

Implements `CleanupPort` for automatic resource cleanup.

### Constructor

```typescript
class DefaultCleanupAdapter implements CleanupPort {
  constructor(input?: {
    rules?: CleanupRule[];
    allowHeuristic?: boolean;
  }) {}
}

type CleanupRule = {
  varMatch: string;  // Variable name pattern
  method?: 'DELETE' | 'POST' | 'PATCH' | 'PUT';  // Default: DELETE
  path: string;      // Cleanup path (with {id} placeholder)
  body?: unknown;    // Optional request body
};
```

### Configuration

```typescript
import { createBddTest, DefaultCleanupAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createCleanup: () => new DefaultCleanupAdapter({
    rules: [
      { varMatch: 'userId', path: '/admin/users/{id}' },
      { varMatch: 'projectId', path: '/projects/{id}' },
    ],
    allowHeuristic: true,
  }),
});
```

### Environment Variables

```bash
# JSON array of cleanup rules (no built-in rules -- consumers must define their own)
CLEANUP_RULES='[{"varMatch":"userId","path":"/api/users/{id}"}]'

# Allow heuristic matching
CLEANUP_ALLOW_ALL=false

# Static auth token for cleanup (alternative to login-based auth)
CLEANUP_AUTH_TOKEN=your-admin-token
```

### Behavior

1. Matches variable names against rules (from `CLEANUP_RULES` env var or constructor)
2. At test teardown, executes cleanup requests (DELETE by default)
3. Authenticates via `getCleanupAuth` (configurable on `createBddTest`)
4. Recognizes UUIDs, prefixed IDs, numeric IDs, MongoDB ObjectIDs, CUIDs, and ULIDs

### Heuristic Matching

When `allowHeuristic` is true, the adapter guesses cleanup paths:
- `userId` → DELETE `/users/{id}`
- `projectId` → DELETE `/projects/{id}`

## FetchInterceptAuthAdapter

Helper for UI authentication via fetch request interception.

### Functions

```typescript
// Setup fetch interception with auth data
async function setupFetchIntercept(
  page: Page,
  authData: AuthData,
  config?: InterceptConfig
): Promise<void>;

// Bypass auth with specific user
async function setupBypassAuth(
  page: Page,
  userId: string,
  roles: string[],
  tenantId?: string
): Promise<void>;

// Use bearer token
async function setupBearerAuth(
  page: Page,
  token: string
): Promise<void>;
```

### Usage

```typescript
// In a custom auth adapter
class CustomUiAuthAdapter implements AuthPort {
  async uiLoginAsAdmin(world: World): Promise<void> {
    await setupBypassAuth(this.page, 'admin-id', ['admin']);
  }
}
```

### How It Works

1. Injects a script via `page.addInitScript()`
2. Intercepts all fetch requests
3. Adds authentication headers automatically
4. Works without actual login flow

### Benefits

- Faster tests (no login page interaction)
- Test protected pages directly
- Switch users mid-test
- Test role-based access

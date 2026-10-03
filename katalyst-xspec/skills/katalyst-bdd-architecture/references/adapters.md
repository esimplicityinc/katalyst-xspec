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
API_BASE_URL=http://localhost:3000
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
FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:3000
HEADLESS=true
```

### Features

- Intelligent element location (by role, label, text, etc.)
- Automatic waiting for elements
- Multiple click modes (normal, force, dispatch)
- Screenshot and debugging support

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
class UniversalAuthAdapter implements AuthPort {
  constructor(private readonly deps: { api: ApiPort; ui: UiPort }) {}
}
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
# Admin credentials
DEFAULT_ADMIN_USERNAME=admin@example.com
DEFAULT_ADMIN_PASSWORD=changeme

# User credentials
DEFAULT_USER_USERNAME=user@example.com
DEFAULT_USER_PASSWORD=user123

# Auth endpoint
API_AUTH_LOGIN_PATH=/auth/login
```

### Behavior

**API Authentication:**
1. POSTs to `API_AUTH_LOGIN_PATH`
2. Stores token in `world.headers['Authorization']`
3. If credentials not set, skips silently with `console.warn`

**UI Authentication:**
1. Navigates to `UI_LOGIN_PATH` (default: `/login`)
2. Fills fields by placeholder (configurable via `UI_USERNAME_FIELD`, `UI_PASSWORD_FIELD`)
3. Clicks login button (configurable via `UI_LOGIN_BUTTON`)
4. If credentials not set, skips silently with `console.warn`

> **Note:** No hardcoded default credentials are used. All credentials must be set via env vars.

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

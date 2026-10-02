# Adapters Reference

Complete reference for all adapter implementations in @esimplicitylabs/katalyst-xspec.

## Overview

Adapters implement port interfaces using specific technologies.

```mermaid
classDiagram
    class ApiPort {
        <<interface>>
    }
    class UiPort {
        <<interface>>
    }
    class TuiPort {
        <<interface>>
    }
    
    class PlaywrightApiAdapter
    class PlaywrightUiAdapter
    class TuiTesterAdapter
    
    ApiPort <|.. PlaywrightApiAdapter
    UiPort <|.. PlaywrightUiAdapter
    TuiPort <|.. TuiTesterAdapter
```

## PlaywrightApiAdapter

HTTP API adapter using Playwright's request context.

### Import

```typescript
import { PlaywrightApiAdapter } from '@esimplicitylabs/katalyst-xspec';
```

### Constructor

```typescript
new PlaywrightApiAdapter(request: APIRequestContext)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `APIRequestContext` | Playwright's API request context |

### Usage

```typescript
import { createBddTest, PlaywrightApiAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createApi: ({ apiRequest }) => new PlaywrightApiAdapter(apiRequest),
});
```

### Features

- Automatic JSON serialization/parsing
- Form URL encoding support
- Response header extraction
- Content-type detection

---

## PlaywrightUiAdapter

Browser UI adapter using Playwright's Page.

### Import

```typescript
import { PlaywrightUiAdapter } from '@esimplicitylabs/katalyst-xspec';
```

### Constructor

```typescript
new PlaywrightUiAdapter(page: Page)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | `Page` | Playwright Page instance |

### Usage

```typescript
import { createBddTest, PlaywrightUiAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createUi: ({ page }) => new PlaywrightUiAdapter(page),
});
```

### Features

- Semantic locators (role, label, text, placeholder)
- Multiple click modes (click, force click, dispatch)
- Auto-waiting for elements
- URL assertion support
- Multi-tab handling

### Locator Methods

| Method | Playwright API |
|--------|---------------|
| `text` | `getByText()` |
| `label` | `getByLabel()` |
| `placeholder` | `getByPlaceholder()` |
| `role` | `getByRole()` |
| `test ID` | `getByTestId()` |
| `alternative text` | `getByAltText()` |
| `title` | `getByTitle()` |
| `locator` | `locator()` |

---

## TuiTesterAdapter

Terminal UI adapter using tui-tester library.

### Import

```typescript
import { TuiTesterAdapter } from '@esimplicitylabs/katalyst-xspec';
```

### Constructor

```typescript
new TuiTesterAdapter(config: TuiConfig)
```

### Configuration

```typescript
type TuiConfig = {
  command: string[];           // Command to run (e.g., ['node', 'cli.js'])
  size?: {                     // Terminal size
    cols: number;              // Default: 80
    rows: number;              // Default: 24
  };
  cwd?: string;                // Working directory
  env?: Record<string, string>; // Environment variables
  debug?: boolean;             // Debug output
  snapshotDir?: string;        // Snapshot directory
  shell?: string;              // Shell to use
};
```

### Usage

```typescript
import { createBddTest, TuiTesterAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createTui: () => new TuiTesterAdapter({
    command: ['node', 'dist/cli.js'],
    size: { cols: 100, rows: 30 },
    debug: process.env.DEBUG === 'true',
  }),
});
```

### Features

- tmux-based terminal emulation
- Keyboard and mouse input
- Screen capture and snapshots
- Pattern matching assertions
- Lazy loading (tui-tester only loaded when used)

### Requirements

- tmux installed on system
- tui-tester npm package (optional peer dependency)

---

## UniversalAuthAdapter

Authentication adapter supporting both API and UI login.

### Import

```typescript
import { UniversalAuthAdapter } from '@esimplicitylabs/katalyst-xspec';
```

### Constructor

```typescript
new UniversalAuthAdapter(deps: { api: ApiPort; ui: UiPort })
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `deps.api` | `ApiPort` | API adapter for token-based auth |
| `deps.ui` | `UiPort` | UI adapter for form-based auth |

### Usage

```typescript
import { createBddTest, UniversalAuthAdapter } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  createAuth: ({ api, ui }) => new UniversalAuthAdapter({ api, ui }),
});
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_ADMIN_USERNAME` | - | Admin email/username (required for auth) |
| `DEFAULT_ADMIN_EMAIL` | - | Alternative admin username |
| `DEFAULT_ADMIN_PASSWORD` | - | Admin password (required for auth) |
| `DEFAULT_USER_USERNAME` | - | User email/username (required for user auth) |
| `DEFAULT_USER_PASSWORD` | - | User password (required for user auth) |
| `NON_ADMIN_USERNAME` | - | Alternative user username |
| `NON_ADMIN_PASSWORD` | - | Alternative user password |
| `API_AUTH_LOGIN_PATH` | `'/auth/login'` | Login endpoint |
| `UI_LOGIN_PATH` | `'/login'` | UI login page path |
| `UI_USERNAME_FIELD` | `'Username'` | Login form username field placeholder |
| `UI_PASSWORD_FIELD` | `'Password'` | Login form password field placeholder |
| `UI_LOGIN_BUTTON` | `'Login'` | Login form submit button text |

> **Note:** If credentials are not configured, login methods will skip silently and log a warning. No hardcoded defaults are used.

### API Login Flow

1. POST to login endpoint with credentials
2. Extract `access_token` from response
3. Set `Authorization: Bearer <token>` in world.headers

### UI Login Flow

1. Navigate to `UI_LOGIN_PATH` (default: `/login`)
2. Fill username and password fields (by placeholder text)
3. Click login button

---

## DefaultCleanupAdapter

Resource cleanup adapter with rule-based cleanup registration.

### Import

```typescript
import { DefaultCleanupAdapter } from '@esimplicitylabs/katalyst-xspec';
```

### Constructor

```typescript
new DefaultCleanupAdapter(options?: {
  rules?: CleanupRule[];
  allowHeuristic?: boolean;
})
```

### Configuration

```typescript
type CleanupRule = {
  varMatch: string;            // Pattern to match variable name
  method?: 'DELETE' | 'POST' | 'PATCH' | 'PUT';  // Default: DELETE
  path: string;                // Cleanup path with {id} placeholder
  body?: unknown;              // Optional request body
};
```

### Usage

```typescript
import { createBddTest, DefaultCleanupAdapter } from '@esimplicitylabs/katalyst-xspec';

// With rules from CLEANUP_RULES env var
const test = createBddTest({
  createCleanup: () => new DefaultCleanupAdapter(),
});

// With explicit rules
const test = createBddTest({
  createCleanup: () => new DefaultCleanupAdapter({
    rules: [
      { varMatch: 'user', path: '/api/users/{id}' },
      { varMatch: 'order', path: '/api/orders/{id}' },
      { varMatch: '/^item_/', method: 'POST', path: '/api/items/{id}/archive', body: { archived: true } },
    ],
    allowHeuristic: false,
  }),
});
```

### Cleanup Rules

No built-in rules are provided. Consumers must define cleanup rules for their application, either via:

1. **`CLEANUP_RULES` env var** -- JSON array of rules
2. **Constructor `rules` param** -- Passed directly in code

Rules from the env var and constructor are merged. Each rule has:
- `varMatch`: substring match against variable name, or `/regex/` syntax for regex matching
- `method`: HTTP method (default: `DELETE`)
- `path`: API path with `{id}` placeholder for the resource ID
- `body`: optional request body (sent as JSON)

### ID Format Support

The cleanup adapter recognizes these ID formats:
- UUIDs (`123e4567-e89b-12d3-a456-426614174000`)
- Prefixed IDs (`org_abc123`, `team_xyz`)
- Numeric IDs (`42`, `99999`)
- MongoDB ObjectIDs (24-char hex)
- CUIDs (`c` + 24+ alphanumeric chars)
- ULIDs (26-char Crockford base32)

### Heuristic Cleanup

When `allowHeuristic: true` (or `CLEANUP_ALLOW_ALL=true`), cleanup is registered for any variable with:
- Name containing `__` (double underscore)
- Name containing `test` (case-insensitive)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLEANUP_RULES` | - | JSON array of custom rules |
| `CLEANUP_ALLOW_ALL` | `'false'` | Enable heuristic cleanup |

---

## Cleanup Authentication

By default, cleanup operations authenticate using a form-based API login (same credentials as `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`). You can customize this with:

### Static Token

Set `CLEANUP_AUTH_TOKEN` env var to use a pre-generated bearer token (no login needed).

### Custom Auth Provider

Pass a `getCleanupAuth` callback to `createBddTest()`:

```typescript
import { createBddTest, type CleanupAuthProvider } from '@esimplicitylabs/katalyst-xspec';

const myAuth: CleanupAuthProvider = async (request) => {
  // Authenticate however your app requires
  return { Authorization: 'Bearer my-token', 'x-custom': 'header' };
};

const test = createBddTest({
  getCleanupAuth: myAuth,
});
```

### OIDC Provider Helper

For OIDC-compliant providers (Keycloak, Auth0, Okta, Azure AD), use the built-in helper:

```typescript
import { createBddTest, createOidcCleanupAuth } from '@esimplicitylabs/katalyst-xspec';

const test = createBddTest({
  getCleanupAuth: createOidcCleanupAuth({
    // All values can also come from OIDC_* env vars
    grantType: 'password',
    extraHeaders: { 'x-user-roles': 'admin' },
  }),
});
```

See [Configuration Reference](./configuration.md#oidc-cleanup-auth-optional) for the full list of `OIDC_*` env vars.

---

## Creating Custom Adapters

### Implement a Port Interface

```typescript
import type { ApiPort, ApiResult, ApiMethod } from '@esimplicitylabs/katalyst-xspec';

export class CustomApiAdapter implements ApiPort {
  async sendJson(
    method: ApiMethod,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    // Your implementation
  }

  async sendForm(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    form: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    // Your implementation
  }
}
```

### Register Custom Adapter

```typescript
const test = createBddTest({
  createApi: () => new CustomApiAdapter(),
});
```

---

## Related Topics

- [Ports Reference](./ports.md) - Port interfaces
- [Custom Adapters Guide](../../guides/custom-adapters.md) - Creating adapters
- [Architecture](../../concepts/architecture.md) - Design patterns

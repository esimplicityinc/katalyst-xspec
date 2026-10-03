# Ports Reference

Complete reference for all port interfaces in the Katalyst BDD framework.

## ApiPort

Handles HTTP API interactions.

```typescript
interface ApiPort {
  sendJson(
    method: ApiMethod,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResult>;
  
  sendForm(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    form: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ApiResult>;
}

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiResult = {
  status: number;
  text: string;
  json?: unknown;
  headers: Record<string, string>;
  contentType?: string;
  response: APIResponse;  // Playwright's raw response
};
```

### Usage in Steps

```typescript
When('I GET {string}', async ({ api, world }, path) => {
  const result = await api.sendJson('GET', path, undefined, world.headers);
  world.lastStatus = result.status;
  world.lastJson = result.json;
});
```

## UiPort

Handles browser UI interactions.

```typescript
interface UiPort {
  // Navigation
  goto(path: string): Promise<void>;
  goBack(): Promise<void>;
  reload(): Promise<void>;
  getCurrentUrl(): Promise<string>;
  
  // Clicks
  clickButton(name: string): Promise<void>;
  clickLink(name: string): Promise<void>;
  clickElementThatContains(
    clickMode: UiClickMode,
    elementType: string,
    text: string
  ): Promise<void>;
  clickElementWith(
    clickMode: UiClickMode,
    ordinal: string,
    text: string,
    method: UiLocatorMethod
  ): Promise<void>;
  
  // Inputs
  fillPlaceholder(placeholder: string, value: string): Promise<void>;
  fillLabel(label: string, value: string): Promise<void>;
  fillDropdown(value: string, dropdownLabel: string): Promise<void>;
  inputInElement(
    action: UiInputMode,
    value: string,
    ordinal: string,
    text: string,
    method: UiLocatorMethod
  ): Promise<void>;
  
  // Keyboard
  typeText(text: string): Promise<void>;
  pressKey(key: string): Promise<void>;
  
  // Waits
  waitSeconds(seconds: number): Promise<void>;
  waitForPageLoad(): Promise<void>;
  
  // Assertions
  expectText(text: string): Promise<void>;
  expectUrlContains(part: string): Promise<void>;
  expectUrl(mode: UiUrlAssertMode, expected: string): Promise<void>;
  expectNewTabUrl(mode: UiUrlAssertMode, expected: string): Promise<void>;
  expectElementWithTextVisible(
    elementType: string,
    text: string,
    shouldBeVisible: boolean
  ): Promise<void>;
  expectElementState(
    ordinal: string,
    text: string,
    method: UiLocatorMethod,
    state: UiElementState
  ): Promise<void>;
  expectElementStateWithin(
    ordinal: string,
    text: string,
    method: UiLocatorMethod,
    state: UiElementState,
    seconds: number
  ): Promise<void>;
  
  // Utilities
  zoomTo(scale: number): Promise<void>;

  // Optional: used by UniversalAuthAdapter for UI login. Custom UiPorts may omit
  // them; login then uses fillPlaceholder and skips the success check and session reuse.
  fillField?(name: string, value: string, options?: { timeoutMs?: number }): Promise<boolean>;
  waitForUrl?(predicate: (url: string) => boolean, timeoutMs: number): Promise<boolean>;
  waitForText?(text: string, timeoutMs: number): Promise<boolean>;
  saveSession?(): Promise<UiSessionState>;            // cookies + localStorage
  restoreSession?(state: UiSessionState): Promise<void>;
}

type UiClickMode = 'click' | 'dispatch click' | 'force click' | 'force dispatch click';
type UiInputMode = 'type' | 'fill' | 'choose';
type UiUrlAssertMode = 'contains' | 'doesntContain' | 'equals';
type UiLocatorMethod = 'text' | 'label' | 'placeholder' | 'role' | 'test ID' | 'alternative text' | 'title' | 'locator';
type UiElementState = 'visible' | 'hidden' | 'editable' | 'disabled' | 'enabled' | 'read-only';
```

## TuiPort

Handles terminal UI interactions.

```typescript
interface TuiPort {
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  isRunning(): boolean;
  
  // Input
  typeText(text: string, options?: { delay?: number }): Promise<void>;
  pressKey(key: string, modifiers?: TuiKeyModifiers): Promise<void>;
  sendText(text: string): Promise<void>;
  fillField(fieldLabel: string, value: string): Promise<void>;
  selectOption(option: string): Promise<void>;
  
  // Mouse
  sendMouse(event: TuiMouseEvent): Promise<void>;
  click(x: number, y: number, button?: TuiMouseButton): Promise<void>;
  clickOnText(text: string): Promise<void>;
  
  // Assertions
  expectText(text: string, options?: TuiWaitOptions): Promise<void>;
  expectPattern(pattern: RegExp, options?: TuiWaitOptions): Promise<void>;
  expectNotText(text: string): Promise<void>;
  assertScreenContains(text: string): Promise<void>;
  assertScreenMatches(pattern: RegExp): Promise<void>;
  
  // Waits
  waitForText(text: string, options?: TuiWaitOptions): Promise<void>;
  waitForPattern(pattern: RegExp, options?: TuiWaitOptions): Promise<void>;
  waitForReady(): Promise<void>;
  waitSeconds(seconds: number): Promise<void>;
  
  // Screen capture
  captureScreen(): Promise<TuiScreenCapture>;
  getScreenText(): Promise<string>;
  getScreenLines(): Promise<string[]>;
  
  // Snapshots
  takeSnapshot(name: string): Promise<void>;
  matchSnapshot(name: string): Promise<TuiSnapshotResult>;
  
  // Utilities
  clear(): Promise<void>;
  resize(size: { cols: number; rows: number }): Promise<void>;
  getSize(): { cols: number; rows: number };
  getConfig(): TuiConfig;
}

type TuiConfig = {
  command: string[];
  size?: { cols: number; rows: number };
  cwd?: string;
  env?: Record<string, string>;
  debug?: boolean;
  snapshotDir?: string;
  shell?: string;
};

type TuiKeyModifiers = {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
};

type TuiWaitOptions = {
  timeout?: number;
  interval?: number;
};

type TuiMouseButton = 'left' | 'middle' | 'right';
```

## AuthPort

Handles authentication across layers.

```typescript
interface AuthPort {
  apiLoginAsAdmin(world: World): Promise<void>;
  apiLoginAsUser(world: World): Promise<void>;
  apiSetBearer(world: World, token: string): void;
  
  uiLoginAsAdmin(world: World): Promise<void>;
  uiLoginAsUser(world: World): Promise<void>;

  // Optional (0.8+): any named role. Steps fall back to the admin/user methods if absent.
  apiLoginAs?(world: World, role: string): Promise<void>;
  uiLoginAs?(world: World, role: string, options?: { reuseSession?: boolean }): Promise<void>;
}
```

### Implementation Notes

The default `UniversalAuthAdapter`:
- Credentials: `roles` option, then `AUTH_<ROLE>_USERNAME` / `AUTH_<ROLE>_PASSWORD` (older `DEFAULT_ADMIN_*` / `DEFAULT_USER_*` for admin/user). Missing ones throw, naming the variables.
- API login: POSTs to `API_AUTH_LOGIN_PATH` (form or JSON per `API_AUTH_BODY`), reads the token (`API_AUTH_TOKEN_PATH`) or keeps the session cookie
- UI login: fills the form at `UI_LOGIN_PATH` (fields by label, placeholder or `name`), checks the page left the login page, optionally reuses the session
- Extend by subclassing and overriding `protected apiLogin` / `uiLogin`

## CleanupPort

Handles resource cleanup after tests.

```typescript
interface CleanupPort {
  registerFromVar(
    world: World,
    varName: string,
    id: unknown,
    meta?: unknown
  ): void;
}
```

### Implementation Notes

The default `DefaultCleanupAdapter`:
- Matches variable names to cleanup patterns
- Uses `CLEANUP_RULES` env variable for custom rules
- Executes DELETE requests at test teardown

```bash
# Example CLEANUP_RULES
CLEANUP_RULES='[
  {"varMatch": "userId", "path": "/admin/users/{id}"},
  {"varMatch": "projectId", "path": "/projects/{id}"}
]'
```

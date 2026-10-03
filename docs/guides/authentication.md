# Authentication

Log in by **role name** in a feature file, and put the credentials and login details in `.env`. Most apps need no code.

```gherkin
Given I am authenticated as "admin" via API   # API calls carry the token or session
Given I am logged in as "pm"                  # browser is logged in (session reused)
```

## Quick start

1. Add a username and password per role to `.env`. Any role name works; `"pm"` reads `AUTH_PM_*`:

   ```bash
   AUTH_ADMIN_USERNAME=admin@example.com
   AUTH_ADMIN_PASSWORD=secret
   AUTH_PM_USERNAME=pm@example.com
   AUTH_PM_PASSWORD=secret
   ```

2. Run a scenario. If the defaults below don't match your app, set the few settings that differ.

If something is missing or wrong, the step fails right away with a message that names the setting to fix, for example:

```
No username for role "reviewer". Set AUTH_REVIEWER_USERNAME in .env, or pass roles: { 'reviewer': { username, password } } to UniversalAuthAdapter.
```

## Which approach do I need?

| Your app | Use | Configure |
|----------|-----|-----------|
| API with a login endpoint that returns a token | `Given I am authenticated as "pm" via API` | `API_AUTH_*` if not the defaults |
| API with a cookie session | same step | `API_AUTH_LOGIN_PATH` (the cookie is kept automatically) |
| A token you already have (CI secret, previous step) | `Given I set bearer token from variable "token"` | nothing |
| Web app with a login form | `Given I am logged in as "pm"` | `UI_*` if not the defaults |
| Testing the login page itself | `When I log in as "pm" in UI` (always submits the form) | same as above |
| SPA whose API accepts test headers (no real login) | `Given I am authenticated in UI as "pm"` | see [Header-based UI auth](#header-based-ui-auth) |
| SSO, MFA, multi-step login | subclass the adapter | see [Extending](#extending-the-login) |

## API login

`Given I am authenticated as "<role>" via API` POSTs the role's credentials to your login endpoint. The token it gets back is sent as `Authorization: Bearer …` on every later API step in the scenario.

| Setting | Default | Example |
|---------|---------|---------|
| `API_AUTH_LOGIN_PATH` | `/auth/login` | `/api/v1/session` |
| `API_AUTH_BODY` | `form` | `json` |
| `API_AUTH_USERNAME_FIELD` | `username` | `email` |
| `API_AUTH_PASSWORD_FIELD` | `password` | `pass` |
| `API_AUTH_TOKEN_PATH` | first of `access_token`, `token`, `accessToken`, `data.access_token`, `data.token`, `data.accessToken` | `result.jwt` |

**Cookie sessions:** if the login response has no token but succeeds and sets a cookie, the cookie is kept by the request context and sent with later API requests. Nothing else to configure.

Example: a JSON login that returns `{ "data": { "jwt": "..." } }`:

```bash
API_AUTH_LOGIN_PATH=/api/login
API_AUTH_BODY=json
API_AUTH_USERNAME_FIELD=email
API_AUTH_TOKEN_PATH=data.jwt
```

The login is sent to the API base URL (`API_BASE_URL`, or `FRONTEND_URL` when that isn't set). See [Configuration](../reference/api/configuration.md#where-tests-point).

## UI login

`Given I am logged in as "<role>"` opens the login page, fills the username and password, clicks the button, and waits until it leaves the login page.

| Setting | Default | Notes |
|---------|---------|-------|
| `UI_LOGIN_PATH` | `/login` | relative to `FRONTEND_URL` |
| `UI_USERNAME_FIELD` | `Username` | the field's **label, placeholder, or `name`** |
| `UI_PASSWORD_FIELD` | `Password` | same |
| `UI_LOGIN_BUTTON` | `Login` | the button's text |
| `UI_LOGIN_SUCCESS_URL` | *(any page other than the login page)* | e.g. `/dashboard` |
| `UI_LOGIN_SUCCESS_TEXT` | — | text shown once logged in; use when the URL doesn't change |
| `UI_LOGIN_TIMEOUT` | `10000` | milliseconds |
| `UI_SESSION_REUSE` | `true` | `false` makes `I am logged in as` submit the form every time |

**Session reuse:** `I am logged in as "pm"` submits the form the first time a worker needs "pm". It saves the cookies and localStorage, and later scenarios start already logged in, which is much faster than logging in every time. If a scenario logs out or changes the password, later scenarios may restore a dead session; use `When I log in as "pm" in UI` there instead, or set `UI_SESSION_REUSE=false`.

**`I log in as "pm" in UI`** always submits the form. Use it when the login itself is under test.

The older steps `I log in as admin in UI`, `I log in as user in UI`, `I am authenticated as an admin via API` and `… as a user via API` still work. They're the roles `"admin"` and `"user"`.

## Credentials

For a role `R`, credentials are looked up in this order:

1. `roles` passed in code (below)
2. `AUTH_<R>_USERNAME` / `AUTH_<R>_PASSWORD`. The role is upper-cased and spaces or dashes become `_`, so `"project manager"` reads `AUTH_PROJECT_MANAGER_*`.
3. For `admin` only: `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`. For `user` only: `DEFAULT_USER_*` / `NON_ADMIN_*`. These are the pre-0.8 names.

Credentials can also come from code, e.g. a secrets manager or computed values, in `features/steps/fixtures.ts`:

```typescript
createAuth: ({ api, ui }) =>
  new UniversalAuthAdapter({
    api,
    ui,
    roles: {
      pm: { username: 'pm@example.com', password: process.env.PM_PASSWORD },
      auditor: { username: 'audit@example.com', password: process.env.AUDIT_PASSWORD },
    },
  }),
```

Keep real passwords out of git: `.env` is in the scaffolded `.gitignore`, and in CI set the `AUTH_*` variables from your secret store.

## Header-based UI auth

For single-page apps whose backend accepts identity headers in test environments, there's no login form to drive. These steps make the page's `fetch` calls to `/api/` carry `x-user-id`, `x-tenant-id` and `x-user-roles`, or a bearer token:

```gherkin
Given I am authenticated in UI as "pm,analyst"
Given I am authenticated in UI as "pm" for tenant "org-b"
Given I am authenticated in UI with bearer token "{access_token}"
```

See [UI steps](../reference/steps/ui-steps.md).

## Cleanup authentication

Data registered for cleanup is deleted after each scenario as the `admin` role, using the same `API_AUTH_*` settings. Alternatives:

- `CLEANUP_AUTH_TOKEN`: a static bearer token, so no login is needed
- OIDC client credentials: `OIDC_TOKEN_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (see `createOidcCleanupAuth` in [Utilities](../reference/api/utilities.md))
- `getCleanupAuth` in `createBddTest({...})` for anything else

Cleanup is best-effort: if no admin credentials are set, it runs unauthenticated instead of failing the scenario.

## Extending the login

Subclass `UniversalAuthAdapter` and override only the part that differs. Role lookup, the steps, and session reuse keep working.

```typescript
// features/steps/my-auth.ts
import { UniversalAuthAdapter, type Credentials, type World } from '@esimplicitylabs/katalyst-xspec';

export class MyAuth extends UniversalAuthAdapter {
  // Example: an API that needs a client id header and returns the token in a header.
  protected async apiLogin(world: World, role: string, creds: Credentials) {
    const res = await this.api.sendJson('POST', '/oauth/login', creds, { 'x-client-id': 'tests' });
    if (res.status !== 200) throw new Error(`login as ${role} failed: ${res.status}`);
    this.apiSetBearer(world, res.headers['x-auth-token']);
  }

  // Example: SSO that redirects to an identity provider.
  protected async uiLogin(world: World, role: string, creds: Credentials) {
    await this.ui.goto('/');
    await this.ui.clickButton('Sign in with SSO');
    await this.ui.fillLabel('Email address', creds.username);
    await this.ui.clickButton('Next');
    await this.ui.fillLabel('Password', creds.password);
    await this.ui.clickButton('Verify');
    await this.ui.expectUrlContains('/home');
  }
}
```

```typescript
// features/steps/fixtures.ts
createAuth: ({ api, ui }) => new MyAuth({ api, ui }),
```

You can also write an `AuthPort` from scratch: implement `apiLoginAs(world, role)` and `uiLoginAs(world, role, { reuseSession })`, plus the admin/user methods. See [Custom Adapters](./custom-adapters.md).

If you write your own steps that log in through the UI, include `ui` in the step's fixtures so the browser is available: `async ({ auth, ui, world }) => …`. API logins never start a browser.

## Troubleshooting

| Message | Fix |
|---------|-----|
| `No username for role "x"` | Set `AUTH_X_USERNAME` / `AUTH_X_PASSWORD` (check the role spelling) |
| `API login as "x" failed: POST /auth/login returned 401` | Wrong credentials, or wrong `API_AUTH_BODY` / field names; the message includes the response body |
| `returned 404` | Wrong `API_AUTH_LOGIN_PATH`, or the API base URL is wrong; check the `katalyst-xspec targets:` line printed at the start of the run |
| `returned 200 but no token found` | Set `API_AUTH_TOKEN_PATH` to where the token is |
| `No username field "Username" on /login` | Set `UI_USERNAME_FIELD` to the field's label, placeholder or `name`, or fix `UI_LOGIN_PATH` |
| `UI login as "x" stayed on /login` | Wrong credentials, or the app doesn't change URL after login: set `UI_LOGIN_SUCCESS_TEXT` |
| Logged out in a later scenario | A previous scenario ended the shared session: use `When I log in as "x" in UI` there, or `UI_SESSION_REUSE=false` |
| `UI login needs the browser` | A custom step called `auth.uiLoginAs` without the `ui` fixture: add `ui` to its parameters |

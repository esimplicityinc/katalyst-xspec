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
| API that only accepts the browser login's session (BFF, SSO) | same step | `API_AUTH_MODE=ui-session`, see [API calls with the browser session](#api-calls-with-the-browser-session) |
| API protected by an OIDC provider (Keycloak, Auth0, Okta, Entra ID): password, client credentials or authorization code + PKCE; secret, JWT or mTLS client auth; DPoP | same step | `API_AUTH_MODE=oidc` + `OIDC_*`, see [OIDC login](#oidc-login) |
| A token you already have (CI secret, previous step) | `Given I set bearer token from variable "token"` | nothing |
| Web app with a login form | `Given I am logged in as "pm"` | `UI_*` if not the defaults |
| Testing the login page itself | `When I log in as "pm" in UI` (always submits the form) | same as above |
| SPA whose API accepts test headers (no real login) | `Given I am authenticated in UI as "pm"` | see [Header-based UI auth](#header-based-ui-auth) |
| A one-time code from an authenticator app (TOTP) | `When I fill the one-time code for "pm" in "One-time code"` | `AUTH_<ROLE>_OTP_SECRET`, see [One-time passcodes](#one-time-passcodes-totp) |
| Login on an identity provider's pages (BFF `/auth/start`, SSO), username-first pages, consent pages | `Given I am logged in as "pm"` | `UI_LOGIN_PATH` and the `UI_*` settings, see [Apps with a BFF login](#apps-with-a-bff-login) |
| Anything the page-by-page login can't handle (CAPTCHA, SMS, custom widgets) | subclass the adapter | see [Extending](#extending-the-login) |

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

## OIDC login

If your API accepts tokens from an OIDC / OAuth2 provider (Keycloak, Auth0, Okta, Entra ID…), set `API_AUTH_MODE=oidc`. `Given I am authenticated as "<role>" via API` then logs in to the provider with [openid-client](https://github.com/panva/openid-client) and later API steps send the token. Feature files don't change.

```bash
API_AUTH_MODE=oidc
OIDC_ISSUER=https://sso.example.com/realms/myapp
OIDC_CLIENT_ID=e2e-tests
OIDC_CLIENT_SECRET=…          # confidential clients only
OIDC_SCOPE=openid
AUTH_PM_USERNAME=pm@example.com
AUTH_PM_PASSWORD=secret
```

`OIDC_ISSUER` is recommended: the endpoints are discovered and ID tokens are validated, including their signature. With only `OIDC_TOKEN_URL`, logins work but ID tokens are dropped, because there's nothing to validate them against.

Provider requests go through Playwright's request API, so they get Playwright's proxy and TLS handling. `http://` URLs (a local Keycloak) are allowed.

### Grants

| `OIDC_GRANT_TYPE` | Logs in as | Needs |
|-------------------|------------|-------|
| `password` (default) | the role's user (`AUTH_<ROLE>_USERNAME` / `_PASSWORD`) | the client to allow it (Keycloak: **Direct access grants**) |
| `client_credentials` | a service account; no user | Keycloak: **Service accounts** |
| `authorization_code` | the role's user, through the provider's login page, with PKCE (S256), `state` and `nonce` | `OIDC_ISSUER`, `OIDC_REDIRECT_URI` |

**Authorization code + PKCE** is the flow most production clients use, and the one to choose when the password grant is disabled. The API step fills in the provider's login page and catches the redirect back to `OIDC_REDIRECT_URI`. That URI must be registered for the client, but nothing needs to listen on it.

```bash
OIDC_GRANT_TYPE=authorization_code
OIDC_REDIRECT_URI=http://localhost:9/callback
OIDC_CODE_FLOW_DRIVER=http        # or browser
```

- `http` (default): no browser. Fetches the login page, submits its form with the provider's cookies, and follows redirects. Works with server-rendered login pages (Keycloak, Okta, Auth0 Universal Login), including identifier-first pages that ask for the username and the password on separate screens.
- `browser`: drives the page in headless Chromium, for login pages built by JavaScript. It needs `npx playwright install chromium`.

Both drivers find the username and password fields themselves. Set `OIDC_LOGIN_USERNAME_FIELD` / `OIDC_LOGIN_PASSWORD_FIELD` if they pick the wrong ones: the field `name` for `http`, or the label, placeholder or `name` for `browser`. For `browser` you can also set `OIDC_LOGIN_BUTTON`, the submit button's text (otherwise it presses Enter). A wrong password fails with the error the page shows. For MFA or consent pages, override `oidcAuthorize` (see [Extending](#extending-the-login)).

### Client authentication

`OIDC_CLIENT_AUTH` defaults to `post` when there's a client secret, `private_key_jwt` when there's a private key, and `none` (public client) otherwise.

| `OIDC_CLIENT_AUTH` | Settings |
|--------------------|----------|
| `post` / `basic` | `OIDC_CLIENT_SECRET`, sent in the body or an HTTP Basic header |
| `client_secret_jwt` | `OIDC_CLIENT_SECRET`, used to sign an HS256 client assertion |
| `private_key_jwt` | `OIDC_CLIENT_PRIVATE_KEY`: a PEM or JWK, or a path to one. Optional: `OIDC_CLIENT_KEY_ID` (`kid`), `OIDC_CLIENT_SIGNING_ALG` (default from the key: RS256, ES256, …) |
| `tls_client_auth` | a client certificate (see [mTLS](#mtls)); `self_signed_tls_client_auth` is accepted too |
| `none` | public client; use with `authorization_code` |

Every client setting can be set per role: `AUTH_<ROLE>_CLIENT_ID`, `AUTH_<ROLE>_CLIENT_SECRET`, `AUTH_<ROLE>_CLIENT_PRIVATE_KEY`, `AUTH_<ROLE>_CLIENT_KEY_ID` and `AUTH_<ROLE>_CLIENT_SIGNING_ALG` override the `OIDC_` value for that role.

### mTLS

```bash
OIDC_TLS_CERT=certs/client.pem    # or OIDC_TLS_PFX=certs/client.p12
OIDC_TLS_KEY=certs/client.key
OIDC_TLS_PASSPHRASE=…             # if the key is encrypted
OIDC_CLIENT_AUTH=tls_client_auth  # or keep another method and use mTLS only for certificate-bound tokens
OIDC_MTLS_ENDPOINT_ALIASES=true   # if the provider publishes mtls_endpoint_aliases
```

The certificate is sent to the provider (as a Playwright `clientCertificates` entry) and to the API under test, which certificate-bound tokens (RFC 8705) need. It's only sent to `https` origins. `OIDC_TLS_INSECURE=true` skips verification of the provider's server certificate (self-signed test servers). To trust a private CA instead, set `NODE_EXTRA_CA_CERTS`.

### DPoP

`OIDC_DPOP=true` sender-constrains tokens with DPoP (RFC 9449). Each login gets its own key pair (`OIDC_DPOP_ALG`, default ES256). Token requests carry a DPoP proof, the API steps send `Authorization: DPoP …` with a fresh proof on every request, and when the API asks for a nonce (`use_dpop_nonce`) the request is retried once with it. In Keycloak, turn on **DPoP bound access tokens** for the client (a preview feature before 26.4: start Keycloak with `--features=dpop`).

Custom steps need nothing special: any request through the `api` fixture that carries the login's token (e.g. `api.sendJson('GET', path, undefined, world.headers)`) gets a fresh proof, and a refreshed token when it's expiring. Requests with no token or a different one are sent as given.

### Token reuse and refresh

Sessions are kept per worker and per role. The next `I am authenticated as "pm" via API` reuses the token while it's valid. An expiring token (30s before `expires_in`, or halfway through a short lifetime) is renewed with the refresh token, both between scenarios and in the middle of a long one. `world.headers` always carries the current token. If refreshing fails, the next login starts from scratch.

| Setting | Default | Notes |
|---------|---------|-------|
| `OIDC_TOKEN_CACHE` | `true` | `false`: log in again for every scenario |
| `OIDC_REFRESH` | `true` | `false`: never use refresh tokens |

### ID token claims

When the provider returns an ID token, it's validated (issuer, audience, expiry, `nonce`, and the signature against the provider's keys) and its claims are available to steps:

```gherkin
Given I am authenticated as "pm" via API
Then the ID token claim "email" should equal "pm@example.com"
And I store the ID token claim "sub" as "userId"
When I GET "/users/{userId}"
```

`OIDC_VERIFY_ID_TOKEN=false` skips the signature check. The claims are also on `world.idTokenClaims` for custom steps.

### All OIDC settings

| Setting | Default | Notes |
|---------|---------|-------|
| `OIDC_ISSUER` / `OIDC_TOKEN_URL` | — | one is required; with both, the token URL overrides the discovered one |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_CLIENT_PRIVATE_KEY`, `OIDC_CLIENT_KEY_ID`, `OIDC_CLIENT_SIGNING_ALG` | — | per role: `AUTH_<ROLE>_CLIENT_*` |
| `OIDC_CLIENT_AUTH` | see above | `post`, `basic`, `client_secret_jwt`, `private_key_jwt`, `tls_client_auth`, `none` |
| `OIDC_GRANT_TYPE` | `password` | `client_credentials`, `authorization_code` |
| `OIDC_SCOPE`, `OIDC_AUDIENCE` | — | `scope` (code flow default `openid`) / `audience` (Auth0 and others) |
| `OIDC_REDIRECT_URI` | — | required for `authorization_code` |
| `OIDC_CODE_FLOW_DRIVER` | `http` | `browser` |
| `OIDC_LOGIN_USERNAME_FIELD`, `OIDC_LOGIN_PASSWORD_FIELD`, `OIDC_LOGIN_BUTTON` | auto | code flow login page fields |
| `OIDC_LOGIN_TIMEOUT` | `15000` | ms, browser driver |
| `OIDC_TLS_CERT` + `OIDC_TLS_KEY`, or `OIDC_TLS_PFX`; `OIDC_TLS_PASSPHRASE` | — | client certificate |
| `OIDC_TLS_INSECURE` | `false` | skip the provider's server certificate check |
| `OIDC_MTLS_ENDPOINT_ALIASES` | `false` | use the provider's mTLS endpoints |
| `OIDC_DPOP`, `OIDC_DPOP_ALG` | `false`, `ES256` | DPoP |
| `OIDC_TOKEN_CACHE`, `OIDC_REFRESH`, `OIDC_VERIFY_ID_TOKEN` | `true` | see above |
| `API_AUTH_TOKEN_PATH` | `access_token` | send another field of the token response, e.g. `id_token` |

Cleanup uses the same settings and logs in as the `admin` role, with DPoP proofs when they're needed.

This covers API logins. For browser logins that redirect to the provider's page, point the `UI_*` settings at that page's fields (e.g. `UI_LOGIN_BUTTON=Sign In`), or subclass the adapter for multi-step and MFA flows (see [Extending](#extending-the-login)).

## UI login

`Given I am logged in as "<role>"` opens the login page and logs in **page by page** until it's back on the app. On each page it fills whatever is asked for and submits:

- username and password on one page, or the username first and the password on the next page (Okta, Entra ID, Google, Auth0)
- a one-time code from an authenticator app, if the role has an [OTP secret](#one-time-passcodes-totp)
- a consent page, if `UI_CONSENT_BUTTON` is set

That covers an app's own login form, and apps that send the browser to an identity provider and back (see [Apps with a BFF login](#apps-with-a-bff-login)).

| Setting | Default | Notes |
|---------|---------|-------|
| `UI_LOGIN_PATH` | `/login` | where the login starts, relative to `FRONTEND_URL`, e.g. `/auth/start` |
| `UI_USERNAME_FIELD` | *(recognized)* | the field's **label, placeholder, or `name`**. Unset: a field labelled `Username`, or a usual username/email field |
| `UI_PASSWORD_FIELD` | *(recognized)* | same. Unset: a field labelled `Password`, or any password field |
| `UI_OTP_FIELD` | *(recognized)* | the one-time code field. Unset: `autocomplete="one-time-code"`, a name like `otp`/`code`/`totp`, or a label like "One-time code" |
| `UI_LOGIN_BUTTON` | `Login` | the button's text. If there's no such button, Enter is pressed in the field |
| `UI_OTP_BUTTON` | `UI_LOGIN_BUTTON` | the button that submits the one-time code |
| `UI_CONSENT_BUTTON` | — | a button to click on a page with nothing to fill, e.g. `Agree and continue` |
| `UI_LOGIN_SUCCESS_URL` | *(any page other than the login page)* | e.g. `/dashboard` |
| `UI_LOGIN_SUCCESS_TEXT` | — | text shown once logged in; use when the URL doesn't change |
| `UI_LOGIN_SUCCESS_URL_EXCLUDES` | — | comma-separated URL parts that mean "still logging in", e.g. `/realms/` for Keycloak pages |
| `UI_LOGIN_TIMEOUT` | `10000` | milliseconds to wait for each page |
| `UI_SESSION_REUSE` | `true` | `false` makes `I am logged in as` submit the form every time |
| `UI_SESSION_DIR` | `.xspec/auth` | where saved sessions are kept (git-ignored) |
| `UI_SESSION_TTL` | `30m` | how long a saved session is used; e.g. `90s`, `30m`, `2h`. Set it below your app's session timeout |
| `UI_SESSION_SCOPE` | `run` | `persistent`: keep using sessions saved by earlier runs (until the TTL), for fast local re-runs |
| `UI_SESSION_LOCK_TIMEOUT` | `2m` | how long a login may hold the lock before another worker takes over |
| `UI_SESSION_CHECK` | `true` | `false`: restore saved sessions without checking they're still logged in |
| `UI_SESSION_CHECK_PATH` | `/` | the page loaded to check a restored session |

When a login doesn't work, the error names the page it stopped on, quotes the page's error message, and says which setting to change: for example `the password was asked for again (the page says "Invalid username or password.")`, or `/realms/app/login-actions asks for a one-time code. Set AUTH_PM_OTP_SECRET`.

### Apps with a BFF login

In a backend-for-frontend (BFF) setup, the app owns the login: `/auth/start` sends the browser to an OIDC provider, the provider sends it back to `/auth/callback`, and the app sets a session cookie. API calls then use that cookie. Tests drive the provider's pages and let the app finish the login:

```bash
FRONTEND_URL=http://localhost:3000
UI_LOGIN_PATH=/auth/start
AUTH_APPLICANT_USERNAME=facial@test.local
AUTH_APPLICANT_PASSWORD=password
AUTH_APPLICANT_OTP_SECRET=logingov-local-otp-secret
AUTH_OTP_ENCODING=latin1
```

```gherkin
Given I am logged in as "applicant"
When I navigate to "/applications"
```

With `FRONTEND_URL` set, any page on another origin counts as part of the login, so the login is done when the browser is back on the app. If the provider shares the app's origin, set `UI_LOGIN_SUCCESS_URL_EXCLUDES` to part of its URLs (`/realms/` for Keycloak). Thanks to [session reuse](#session-reuse) each role goes through the provider once per run, which keeps one-time codes from clashing and puts little load on the provider.

**Keycloak** (for example as a local stand-in for login.gov): username and password are on one page, then the "One-time code" page. The defaults recognize both, and the submit button (`Sign In`) is pressed with Enter. Give each test user an OTP credential with a known secret and set `AUTH_<ROLE>_OTP_SECRET` to it.

**login.gov:** use its sandbox (`idp.int.identitysandbox.gov`) with test accounts that use an authentication app. Automating sign-ins against login.gov (sandbox or production) is up to login.gov's partner terms, so check with login.gov first; for production, prefer tests that don't sign in, or a test login the app itself provides.

### API calls with the browser session

In a BFF the API accepts only the app's session cookie, so there's no token for API steps to get. With `API_AUTH_MODE=ui-session`, `Given I am authenticated as "<role>" via API` uses the role's **browser session** instead: the one `I am logged in as` saved, or, if there's none yet, it logs in through a headless browser of its own (the same page-by-page login, one-time code included). Later API steps send the session cookie.

```bash
API_AUTH_MODE=ui-session
FRONTEND_URL=http://localhost:3000
UI_LOGIN_PATH=/auth/start
```

```gherkin
Scenario: Create an application, then see it
  Given I am authenticated as "applicant" via API
  When I POST "/api/applications" with JSON body:
    """
    { "name": "Test" }
    """
  Then the response status should be 201
  Given I am logged in as "applicant"
  When I navigate to "/applications"
  Then I should see text "Test"
```

API and UI steps share the same saved session, so the role logs in once per run however it's used. The API must be on the app's site: the same host as `FRONTEND_URL`, or a subdomain the session cookie covers. Before using a saved session, it's checked without a browser: a request to `UI_SESSION_CHECK_PATH` that ends on the login page or returns 401/403 means it has expired, and the role logs in again. Set `UI_LOGIN_IGNORE_HTTPS_ERRORS=true` if the headless login browser should accept self-signed certificates.

Cleanup uses the same session (as `admin`, or `CLEANUP_AUTH_ROLE`), see [Cleanup authentication](#cleanup-authentication).

**All together**, a BFF app behind Keycloak with one-time codes needs only `.env`:

```bash
FRONTEND_URL=http://localhost:3000
UI_LOGIN_PATH=/auth/start
API_AUTH_MODE=ui-session

AUTH_APPLICANT_USERNAME=facial@test.local
AUTH_APPLICANT_PASSWORD=password
AUTH_ADMIN_USERNAME=admin@test.local
AUTH_ADMIN_PASSWORD=admin-password
AUTH_OTP_SECRET=logingov-local-otp-secret   # every role's TOTP secret
AUTH_OTP_ENCODING=latin1
```

Each role then logs in once per run, through `/auth/start`, the provider's pages and the one-time code, and the session is used by UI steps, API steps and cleanup in every worker.

The other way round: after an API login that set a session cookie (a cookie-session `API_AUTH_LOGIN_PATH`, or `ui-session`), `Given I use the API session in the browser` gives the browser the same cookies.

### Session reuse

`I am logged in as "pm"` submits the login form **once per role for the whole run**, then every scenario in every worker starts already logged in:

1. The first worker that needs "pm" takes a lock and logs in. It saves the cookies and localStorage to `.xspec/auth/pm-….json`, readable only by you.
2. Workers that need "pm" at the same time wait for that login and use its session instead of logging in themselves.
3. Later scenarios restore the saved session. A worker restarted after a failure reads it from disk too.

This is much faster than logging in every time, and it avoids problems with login pages that rate-limit or lock accounts, and with [one-time codes](#one-time-passcodes-totp), which a provider accepts only once.

A saved session is used if it was saved **by this run** (with `UI_SESSION_SCOPE=run`, the default) and **within `UI_SESSION_TTL`**; otherwise the role logs in again.

**Expired sessions are replaced automatically.** After restoring a session, `I am logged in as` loads `UI_SESSION_CHECK_PATH` (default `/`). If that ends up on the login page, the session has expired on the server: the role logs in again, the new session is saved for the other workers, and the scenario carries on. "The login page" means `UI_LOGIN_PATH`, a URL containing one of `UI_LOGIN_SUCCESS_URL_EXCLUDES`, or (when `FRONTEND_URL` is set) any page outside the app, such as the identity provider. With `UI_LOGIN_SUCCESS_TEXT` set, the check is that the text appears instead. A session whose cookies have passed their expiry date is replaced without loading anything. The check leaves the browser on `UI_SESSION_CHECK_PATH`; set it to a light page that requires login, or `UI_SESSION_CHECK=false` to skip it. Sessions are kept apart by role, username, `UI_LOGIN_PATH` and `FRONTEND_URL`, so changing any of them logs in again. Workers recognize their run by the Playwright runner's process; set `XSPEC_RUN_ID` to choose the run id yourself.

**Logging in before the run.** If you'd rather log every role in up front (Playwright's setup-project pattern), `createAuthSetup` writes the same session files, so scenarios start logged in:

```typescript
// tests/auth.setup.ts
import { createAuthSetup } from '@esimplicitylabs/katalyst-xspec';

createAuthSetup({ roles: ['applicant', 'admin'] });
```

```typescript
// playwright.config.ts
projects: [
  { name: 'auth-setup', testMatch: /auth\.setup\.ts/ },
  { ...apiBdd, dependencies: ['auth-setup'] },
  { ...uiBdd, dependencies: ['auth-setup'] },
],
```

Each role logs in once, in its own setup test, so a failing login is reported by role before any scenario runs. Sessions that are still usable are reused; `createAuthSetup({ roles, fresh: true })` always logs in. Pass `createAuth` if you use a custom auth adapter. Roles not listed still log in on demand.

If a scenario logs out or changes the password, later scenarios may restore a dead session. Clear it in that scenario, use `When I log in as "pm" in UI` (always submits the form), or set `UI_SESSION_REUSE=false`:

```gherkin
Given I clear the saved session for "pm"   # one role
Given I clear saved sessions               # every role
```

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

Keep real passwords out of git: `.env` is in the scaffolded `.gitignore`, and in CI set the `AUTH_*` variables from your secret store. See [Keeping secrets out of logs and git](#keeping-secrets-out-of-logs-and-git).

## One-time passcodes (TOTP)

For logins that ask for a code from an authenticator app (Google Authenticator, Authy, Keycloak OTP, login.gov's authentication app option), give the role its TOTP secret. The secret is what's behind the QR code shown when the authenticator was set up.

```bash
AUTH_PM_OTP_SECRET=JBSWY3DPEHPK3PXP      # base32, as authenticator apps show it
```

Then fill the current code in a step:

```gherkin
When I fill the one-time code for "pm" in "One-time code"
And I click the button "Verify"
```

or store it for later steps (it's valid for the rest of its 30-second window):

```gherkin
Given I generate a one-time code for "pm" as "otp"
When I fill the field "otp" with "{otp}"
```

The field is found by label, placeholder or `name`, like `I fill the field`.

| Setting | Default | Notes |
|---------|---------|-------|
| `AUTH_<ROLE>_OTP_SECRET` | — | The shared secret, or a full `otpauth://totp/...` URI (its `digits`, `period` and `algorithm` are used) |
| `AUTH_<ROLE>_OTP_ENCODING` | `base32` | `latin1` (or `ascii`) for a plain-text secret, `hex` for hex |
| `AUTH_<ROLE>_OTP_DIGITS` | `6` | 6 to 10 |
| `AUTH_<ROLE>_OTP_PERIOD` | `30` | seconds |
| `AUTH_<ROLE>_OTP_ALGORITHM` | `SHA1` | `SHA256`, `SHA512` |
| `AUTH_OTP_*` | — | The same settings for every role, e.g. `AUTH_OTP_ENCODING=latin1`. A role's own setting wins |

Example: a local Keycloak whose test users share the plain-text secret `logingov-local-otp-secret`:

```bash
AUTH_OTP_SECRET=logingov-local-otp-secret
AUTH_OTP_ENCODING=latin1
```

In code, pass `otp` with the role, either the secret or the full settings:

```typescript
roles: {
  pm: { username: 'pm@example.com', password: process.env.PM_PASSWORD, otp: process.env.PM_TOTP_SECRET },
  auditor: { username: 'audit@example.com', password: process.env.AUDIT_PASSWORD, otp: { secret: 'logingov-local-otp-secret', encoding: 'latin1' } },
},
```

`generateTotp({ secret, encoding, digits, period, algorithm })` is exported for your own steps and adapters, and the auth adapter's `oneTimeCodeFor(role)` returns the role's current code using the settings above.

### Codes from email or elsewhere

Not every login uses an authenticator app. For codes **sent by email**, point the role at a test inbox (see [Email Testing](./email-testing.md)):

```bash
MAIL_API_URL=http://localhost:8025
AUTH_PM_OTP_SOURCE=email          # or AUTH_OTP_SOURCE=email for every role
# AUTH_PM_OTP_EMAIL=pm+codes@test.local   # default: the role's username
# AUTH_PM_OTP_EMAIL_SUBJECT=sign-in code  # or AUTH_OTP_EMAIL_SUBJECT
# MAIL_CODE_PATTERN=code: ([A-Z0-9]+)     # default: the first 4 to 8 digit number
```

The page-by-page login and the one-time code steps then use the code in the newest email to the role that arrived during the login (or the scenario). A retry waits for a newer email.

For **anything else** (an SMS test service, a backdoor endpoint in a test environment), pass a function that returns the current code:

```typescript
roles: {
  pm: { username: 'pm@example.com', password: process.env.PM_PASSWORD, otp: () => smsInbox.latestCode('+15550100') },
},
```

| Setting | Default | Notes |
|---------|---------|-------|
| `AUTH_<ROLE>_OTP_SOURCE` | `totp` | `email`: read the code from the test inbox. `AUTH_OTP_SOURCE` for every role |
| `AUTH_<ROLE>_OTP_EMAIL` | the role's username | the address the codes are sent to |
| `AUTH_<ROLE>_OTP_EMAIL_SUBJECT` | — | only emails whose subject contains this. `AUTH_OTP_EMAIL_SUBJECT` for every role |

**Codes can only be used once.** Most providers (login.gov, Keycloak) reject a code that was already accepted, and Keycloak also accepts the next window's code early, then refuses it in its own window. The built-in logins never submit a code that any worker of the run already used for that account: workers record the last window they used in `UI_SESSION_DIR`, and a login that would reuse it waits for the next window (up to one period, 30 s). `Given I am logged in as "pm"` logs in once per run, so this only comes up when the same account logs in again, for example `When I log in as "pm" in UI`, or a UI and an API scenario starting at the same time. Give such scenarios room: set Playwright's `timeout` to at least 60 s, or use different test users (each with its own secret) for them. Custom steps that use `I generate a one-time code` are not coordinated.

## Keeping secrets out of logs and git

Test reports and CI logs are often shared more widely than credentials should be. katalyst-xspec keeps them out:

- **Error messages.** When an API request fails, Playwright's error lists the request headers. The built-in API adapter and cleanup replace the values of `Authorization`, `Cookie`, `Set-Cookie`, `DPoP`, `Proxy-Authorization`, `X-Api-Key`, `X-Auth-Token` and `X-CSRF-Token`, and any `Bearer` / `DPoP` / `Basic` credential, with `[redacted]`.
- **Debug steps.** `Then I log all cookies` prints cookie values as `[redacted, N chars]`; `Then I log localStorage` does the same for keys that look like tokens or sessions (`token`, `auth`, `session`, `jwt`, …) and for values that look like JWTs.
- **Saved sessions.** [Session reuse](#session-reuse) files go in `.xspec/auth/` (`UI_SESSION_DIR`), written so only your user can read them (`0600`, in a `0700` folder). `katalyst-xspec init` and `katalyst-xspec upgrade` add `.xspec/` to `.gitignore`. In CI, they're deleted with the workspace; locally, delete the folder to log everyone out.
- **One-time code secrets** never appear in messages; errors name the variable instead.

`XSPEC_SHOW_SECRETS=true` turns redaction off, for debugging on your own machine. Don't set it in CI.

For your own steps and adapters, `redactSecrets(text)`, `redactHeaders(headers)`, `redactError(err)` and `writeSecretFile(path, content)` are exported (see [Utilities](../reference/api/utilities.md#secrets)).

## Header-based UI auth

For single-page apps whose backend accepts identity headers in test environments, there's no login form to drive. These steps make the page's `fetch` calls to `/api/` carry `x-user-id`, `x-tenant-id` and `x-user-roles`, or a bearer token:

```gherkin
Given I am authenticated in UI as "pm,analyst"
Given I am authenticated in UI as "pm" for tenant "org-b"
Given I am authenticated in UI with bearer token "{access_token}"
```

See [UI steps](../reference/steps/ui-steps.md).

## Cleanup authentication

Data registered for cleanup is deleted after each scenario as the `admin` role, using the same `API_AUTH_*` settings (including `API_AUTH_MODE=oidc`, with DPoP proofs per request). With `API_AUTH_MODE=ui-session`, cleanup sends the `admin` role's browser session cookie, from the same shared saved sessions (logging in once if needed); set `CLEANUP_AUTH_ROLE` to clean up as another role. Alternatives:

- `CLEANUP_AUTH_TOKEN`: a static bearer token, so no login is needed
- `createOidcCleanupAuth` (see [Utilities](../reference/api/utilities.md)): OIDC for cleanup only
- `getCleanupAuth` in `createBddTest({...})` for anything else; `defaultCleanupAuth` is the built-in one, to wrap or fall back to

Cleanup is best-effort: if no admin credentials are set, it runs unauthenticated instead of failing the scenario.

## Extending the login

Subclass `UniversalAuthAdapter` and override only the part that differs. Role lookup, the steps, and session reuse keep working. The built-in UI login already handles multi-page, one-time code and consent pages (see [UI login](#ui-login)); override `uiLogin` for pages it can't handle. `runLoginFlow` (from `auth/login-flow`) and `this.loginOneTimeCode(role)` are available to reuse in your override.

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

  // Example: SSO that redirects to an identity provider and asks for a one-time code.
  protected async uiLogin(world: World, role: string, creds: Credentials) {
    await this.ui.goto('/');
    await this.ui.clickButton('Sign in with SSO');
    await this.ui.fillLabel('Email address', creds.username);
    await this.ui.clickButton('Next');
    await this.ui.fillLabel('Password', creds.password);
    await this.ui.clickButton('Sign in');
    await this.ui.fillLabel('One-time code', await this.oneTimeCodeFor(role)); // AUTH_<ROLE>_OTP_SECRET
    await this.ui.clickButton('Verify');
    await this.ui.expectUrlContains('/home');
  }
}
```

```typescript
// features/steps/fixtures.ts
createAuth: ({ api, ui }) => new MyAuth({ api, ui }),
```

**OIDC login pages with MFA or consent:** override `oidcAuthorize`. It gets the authorization URL (PKCE, `state` and `nonce` already in it) and returns the URL the provider redirected back to. The token exchange, ID token validation, DPoP and refresh keep working:

```typescript
import { UniversalAuthAdapter, createBrowserAuthorize, type AuthorizeRequest } from '@esimplicitylabs/katalyst-xspec';
import { chromium } from '@playwright/test';

export class MfaAuth extends UniversalAuthAdapter {
  protected async oidcAuthorize({ url, redirectUri, credentials, settings }: AuthorizeRequest): Promise<URL> {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let callback: URL | undefined;
    page.on('request', (r) => { if (r.url().startsWith(redirectUri)) callback = new URL(r.url()); });
    await page.goto(url.href);
    await page.getByLabel('Username').fill(credentials.username);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByLabel('One-time code').fill(await this.oneTimeCodeFor(settings.role));
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForEvent('request', (r) => r.url().startsWith(redirectUri));
    await browser.close();
    return callback!;
  }
}
```

**Custom steps that call the API** keep working with OIDC: the `api` fixture applies `world.apiAuth` to any request carrying the login's token, so tokens are refreshed and DPoP proofs added. If you build your own `ApiPort` outside the fixtures, wrap it with `withApiRequestAuth(api, () => world)`, or send with `sendAuthenticated(api, world, method, path, body)`.

You can also write an `AuthPort` from scratch: implement `apiLoginAs(world, role)` and `uiLoginAs(world, role, { reuseSession })`, plus the admin/user methods. See [Custom Adapters](./custom-adapters.md).

If you write your own steps that log in through the UI, include `ui` in the step's fixtures so the browser is available: `async ({ auth, ui, world }) => …`. API logins never start a browser.

## Troubleshooting

| Message | Fix |
|---------|-----|
| `No username for role "x"` | Set `AUTH_X_USERNAME` / `AUTH_X_PASSWORD` (check the role spelling) |
| `No one-time code secret for role "x"` | Set `AUTH_X_OTP_SECRET`, or `AUTH_OTP_SECRET` for every role |
| `The TOTP secret is not valid base32` | The secret is plain text or hex: set `AUTH_OTP_ENCODING=latin1` or `hex` |
| The provider says the code is invalid | Check the secret, and `AUTH_OTP_DIGITS` / `_PERIOD` / `_ALGORITHM` against the provider's OTP policy; check the machine's clock; a code can't be used twice in one window |
| `API login as "x" failed: POST /auth/login returned 401` | Wrong credentials, or wrong `API_AUTH_BODY` / field names; the message includes the response body |
| `returned 404` | Wrong `API_AUTH_LOGIN_PATH`, or the API base URL is wrong; check the `katalyst-xspec targets:` line printed at the start of the run |
| `returned 200 but no token found` | Set `API_AUTH_TOKEN_PATH` to where the token is |
| `OIDC login as "x" failed … invalid_client` | Wrong client id, secret, key or certificate; the message names the settings for your `OIDC_CLIENT_AUTH` |
| `OIDC login as "x" failed … unauthorized_client` | Enable the grant on the client (Keycloak: Direct access grants / Service accounts / Standard flow) |
| `… invalid_dpop_proof … DPoP proof is missing` | The client requires DPoP: set `OIDC_DPOP=true` |
| `the provider showed the login form again` | Wrong `AUTH_X_USERNAME` / `AUTH_X_PASSWORD` (code flow); the page's error is quoted |
| `no login form on …` | The login page is built by JavaScript: set `OIDC_CODE_FLOW_DRIVER=browser` |
| `the ID token didn't validate` | Wrong `OIDC_ISSUER`, or the provider's signing keys aren't reachable; `OIDC_VERIFY_ID_TOKEN=false` skips the signature check |
| `OIDC discovery failed` | Check `OIDC_ISSUER` (it's the URL before `/.well-known/openid-configuration`) |
| `No username field "Username" on /login` | Set `UI_USERNAME_FIELD` to the field's label, placeholder or `name`, or fix `UI_LOGIN_PATH` |
| `UI login as "x" stayed on /login` | Wrong credentials, or the app doesn't change URL after login: set `UI_LOGIN_SUCCESS_TEXT` |
| Logged out in a later scenario | A previous scenario ended the shared session: use `When I log in as "x" in UI` there, or `UI_SESSION_REUSE=false` |
| `UI login needs the browser` | A custom step called `auth.uiLoginAs` without the `ui` fixture: add `ui` to its parameters |

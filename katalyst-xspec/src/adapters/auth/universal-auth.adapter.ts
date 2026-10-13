import type { ApiPort } from '../../ports/api.port';
import type { AuthPort, UiLoginOptions } from '../../ports/auth.port';
import type { UiPort } from '../../ports/ui.port';
import type { World } from '../../world';
import { resolveCredentials, roleEnvKeys, type Credentials, type RoleCredentials } from '../../auth/credentials';
import { oneTimeCode } from '../../auth/otp';
import { apiLoginErrorMessage, buildApiLoginRequest, extractToken } from '../../auth/api-login';
import { isOidcMode, oidcNeedsUserCredentials } from '../../auth/oidc/settings';
import { OidcClient, type OidcSession } from '../../auth/oidc/client';
import { createBrowserAuthorize, createHttpAuthorize, type AuthorizeRequest } from '../../auth/oidc/code-flow';
import { resolveApiBaseUrl, resolveTargets } from '../../targets';
import { SessionStore, type SessionKey } from '../../auth/session-store';

type Env = Record<string, string | undefined>;

export type UniversalAuthOptions = {
  api: ApiPort;
  ui: UiPort;
  /** Credentials per role, e.g. { pm: { username, password, otp } }. Overrides AUTH_<ROLE>_* env vars. */
  roles?: RoleCredentials;
  /** Settings source; defaults to process.env. */
  env?: Env;
  /** API base URL, used to sign DPoP proofs for relative paths. Defaults to API_BASE_URL resolution. */
  apiBaseUrl?: string;
};

/** Forget every saved UI session, in all workers (e.g. after changing a password mid-run). */
export function clearUiSessions({ env = process.env }: { env?: Env } = {}): void {
  SessionStore.fromEnv(env).clear();
}

/**
 * Logs in by role through the API or the UI, configured by environment
 * variables (see docs/guides/authentication.md). With API_AUTH_MODE=oidc, API
 * logins get their token from an OIDC provider instead (see auth/oidc/).
 *
 * Extend it by subclassing and overriding `apiLogin` / `uiLogin` (e.g. for SSO
 * or a multi-step form), or `oidcAuthorize` for an authorization code login
 * page the built-in drivers can't handle (MFA, consent); credentials, steps
 * and session reuse keep working.
 */
export class UniversalAuthAdapter implements AuthPort {
  protected readonly api: ApiPort;
  protected readonly ui: UiPort;
  protected readonly roles?: RoleCredentials;
  protected readonly env: Env;
  protected readonly apiBaseUrl: string;
  private oidcClient?: OidcClient;

  constructor(options: UniversalAuthOptions) {
    this.api = options.api;
    this.ui = options.ui;
    this.roles = options.roles;
    this.env = options.env ?? process.env;
    this.apiBaseUrl = options.apiBaseUrl ?? resolveApiBaseUrl({ env: this.env });
  }

  /** Credentials for a role; throws MissingCredentialsError with the variables to set. */
  credentialsFor(role: string): Credentials {
    return resolveCredentials(role, { env: this.env, roles: this.roles });
  }

  /** The role's current one-time code from its TOTP secret (AUTH_<ROLE>_OTP_SECRET or `roles: { x: { otp } }`). */
  async oneTimeCodeFor(role: string): Promise<string> {
    return oneTimeCode(role, { env: this.env, roles: this.roles });
  }

  apiSetBearer(world: World, token: string): void {
    world.headers = { ...(world.headers || {}), Authorization: `Bearer ${token}` };
    delete world.apiAuth;
    delete world.idTokenClaims;
  }

  async apiLoginAs(world: World, role: string): Promise<void> {
    if (isOidcMode(this.env)) {
      await this.oidcLogin(world, role);
      return;
    }
    await this.apiLogin(world, role, this.credentialsFor(role));
  }

  async uiLoginAs(world: World, role: string, options: UiLoginOptions = {}): Promise<void> {
    const creds = this.credentialsFor(role);
    const reuse = options.reuseSession && this.sessionReuseEnabled() && this.ui.restoreSession && this.ui.saveSession;
    if (!reuse) {
      await this.uiLogin(world, role, creds);
      return;
    }

    // Shared by every worker: one login per role per run (see auth/session-store.ts).
    const store = SessionStore.fromEnv(this.env);
    const key = this.sessionKey(role, creds);
    const saved = store.read(key);
    if (saved) return this.ui.restoreSession!(saved.state);

    await store.withLock(key, async () => {
      // Another worker may have logged in while this one waited for the lock.
      const theirs = store.read(key);
      if (theirs) return this.ui.restoreSession!(theirs.state);
      await this.uiLogin(world, role, creds);
      store.write(key, await this.ui.saveSession!());
    });
  }

  /** What a saved UI session is for: the role, its username, the login page and the app. */
  protected sessionKey(role: string, creds: Credentials): SessionKey {
    return {
      role,
      username: creds.username,
      loginPath: this.env.UI_LOGIN_PATH || '/login',
      app: resolveTargets(this.env).frontendUrl,
    };
  }

  /** Forget the role's saved UI session in every worker, so the next `I am logged in as` logs in again. */
  clearSavedSession(role: string): void {
    SessionStore.fromEnv(this.env).clear(this.sessionKey(role, this.credentialsFor(role)));
  }

  apiLoginAsAdmin(world: World): Promise<void> {
    return this.apiLoginAs(world, 'admin');
  }
  apiLoginAsUser(world: World): Promise<void> {
    return this.apiLoginAs(world, 'user');
  }
  uiLoginAsAdmin(world: World): Promise<void> {
    return this.uiLoginAs(world, 'admin');
  }
  uiLoginAsUser(world: World): Promise<void> {
    return this.uiLoginAs(world, 'user');
  }

  /** POST credentials to the login endpoint; keep the bearer token or session cookie. */
  protected async apiLogin(world: World, role: string, creds: Credentials): Promise<void> {
    const req = buildApiLoginRequest(creds, this.env);
    const result =
      req.body === 'json'
        ? await this.api.sendJson('POST', req.path, req.fields)
        : await this.api.sendForm('POST', req.path, req.fields);
    world.lastStatus = result.status;
    world.lastText = result.text;
    world.lastJson = result.json;
    world.lastHeaders = result.headers;

    const ok = result.status >= 200 && result.status < 300;
    if (!ok) throw new Error(apiLoginErrorMessage({ role, path: req.path, status: result.status, text: result.text }));

    const token = extractToken(result.json, this.env);
    if (token) {
      this.apiSetBearer(world, token);
      return;
    }
    // Cookie sessions: the API request context keeps Set-Cookie for later requests.
    const setsCookie = Object.keys(result.headers || {}).some((h) => h.toLowerCase() === 'set-cookie');
    if (!setsCookie) {
      throw new Error(apiLoginErrorMessage({ role, path: req.path, status: result.status, text: result.text, noToken: true }));
    }
  }

  /** The OIDC client (one per adapter; sessions and provider configuration are cached per worker). */
  protected get oidc(): OidcClient {
    this.oidcClient ??= new OidcClient({ env: this.env, authorize: (request) => this.oidcAuthorize(request) });
    return this.oidcClient;
  }

  /** API_AUTH_MODE=oidc: log in with the configured grant and use the session for later API steps. */
  protected async oidcLogin(world: World, role: string): Promise<void> {
    const creds = oidcNeedsUserCredentials(this.env) ? this.credentialsFor(role) : undefined;
    this.useOidcSession(world, await this.oidc.login(role, creds));
  }

  /**
   * Authorization code flow: get from the provider's authorization URL to the
   * redirect back (returns that URL). Defaults to OIDC_CODE_FLOW_DRIVER.
   * Override for login pages that need more than a username and password.
   */
  protected oidcAuthorize(request: AuthorizeRequest): Promise<URL> {
    const driver = request.settings.codeFlowDriver === 'browser' ? createBrowserAuthorize() : createHttpAuthorize();
    return driver(request);
  }

  /** Point the scenario's API requests at an OIDC session (token refresh and DPoP proofs per request). */
  protected useOidcSession(world: World, session: OidcSession): void {
    const absolute = (url: string) => new URL(url, this.apiBaseUrl).href;
    world.headers = { ...(world.headers || {}), Authorization: `${session.scheme} ${session.token}` };
    world.idTokenClaims = session.idTokenClaims;
    world.apiAuth = {
      headers: async (method, url) => {
        const headers = await session.requestHeaders(method, absolute(url));
        world.headers = { ...world.headers, Authorization: headers.Authorization };
        return headers;
      },
      afterResponse: (url, status, headers) => session.afterResponse(absolute(url), status, headers),
      matches: (authorization) => session.owns(authorization),
    };
  }

  /** Fill and submit the login form, then confirm the login worked. */
  protected async uiLogin(_world: World, role: string, creds: Credentials): Promise<void> {
    const loginPath = this.env.UI_LOGIN_PATH || '/login';
    const usernameField = this.env.UI_USERNAME_FIELD || 'Username';
    const passwordField = this.env.UI_PASSWORD_FIELD || 'Password';
    const button = this.env.UI_LOGIN_BUTTON || 'Login';
    const timeoutMs = Number(this.env.UI_LOGIN_TIMEOUT) || 10_000;
    const keys = roleEnvKeys(role);

    await this.ui.goto(loginPath);
    const loginUrl = await this.ui.getCurrentUrl();

    if (this.ui.fillField) {
      for (const [kind, field, value, setting] of [
        ['username', usernameField, creds.username, 'UI_USERNAME_FIELD'],
        ['password', passwordField, creds.password, 'UI_PASSWORD_FIELD'],
      ] as const) {
        if (!(await this.ui.fillField(field, value, { timeoutMs }))) {
          throw new Error(
            `UI login as "${role}": No ${kind} field "${field}" on ${loginPath} (looked for a label, placeholder or name). ` +
              `Set ${setting} to the field's label or placeholder, or UI_LOGIN_PATH to the login page.`,
          );
        }
      }
    } else {
      await this.ui.fillPlaceholder(usernameField, creds.username);
      await this.ui.fillPlaceholder(passwordField, creds.password);
    }
    await this.ui.clickButton(button);

    const successUrl = this.env.UI_LOGIN_SUCCESS_URL;
    const successText = this.env.UI_LOGIN_SUCCESS_TEXT;
    let ok: boolean | undefined;
    if (successText && this.ui.waitForText) {
      ok = await this.ui.waitForText(successText, timeoutMs);
    } else if (this.ui.waitForUrl) {
      const loginPathname = new URL(loginUrl).pathname;
      ok = await this.ui.waitForUrl(
        (u) => (successUrl ? u.includes(successUrl) : new URL(u).pathname !== loginPathname),
        timeoutMs,
      );
    }
    if (ok === false) {
      const expected = successText
        ? `for "${successText}" to appear`
        : successUrl
          ? `for a URL containing "${successUrl}"`
          : 'to leave the login page';
      throw new Error(
        `UI login as "${role}" stayed on ${new URL(loginUrl).pathname} (waited ${timeoutMs}ms ${expected}). ` +
          `Check ${keys.username} / ${keys.password}. If your app doesn't navigate after login, set UI_LOGIN_SUCCESS_TEXT ` +
          `(text shown once logged in) or UI_LOGIN_SUCCESS_URL.`,
      );
    }
  }

  private sessionReuseEnabled(): boolean {
    const v = this.env.UI_SESSION_REUSE?.trim().toLowerCase();
    return v !== 'false' && v !== '0';
  }
}

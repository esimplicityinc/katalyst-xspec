import type { ApiPort } from '../../ports/api.port';
import type { AuthPort, UiLoginOptions } from '../../ports/auth.port';
import type { UiPort } from '../../ports/ui.port';
import type { World } from '../../world';
import { resolveCredentials, roleEnvKeys, type Credentials, type RoleCredentials } from '../../auth/credentials';
import { freshOneTimeCode, oneTimeCode, otpSourceEnvKeys, resolveOtpSource } from '../../auth/otp';
import type { MailPort } from '../../ports/mail.port';
import { MailpitAdapter } from '../mail/mailpit.adapter';
import { emailCode, emailCodePattern } from '../../helpers/email';
import { runLoginFlow } from '../../auth/login-flow';
import { apiLoginErrorMessage, buildApiLoginRequest, extractToken } from '../../auth/api-login';
import { apiAuthMode, oidcNeedsUserCredentials } from '../../auth/oidc/settings';
import { cookieHeaderFor, newLoginContext } from '../../auth/ui-session';
import { PlaywrightUiAdapter } from '../ui/playwright-ui.adapter';
import type { UiSessionState } from '../../ports/ui.port';
import { OidcClient, type OidcSession } from '../../auth/oidc/client';
import { createBrowserAuthorize, createHttpAuthorize, type AuthorizeRequest } from '../../auth/oidc/code-flow';
import { resolveApiBaseUrl, resolveTargets } from '../../targets';
import { SessionStore, type SavedSession, type SessionKey } from '../../auth/session-store';
import { loginPageMatcher, loginUrlExcludes, sessionCheckSettings, sessionCookiesExpired } from '../../auth/session-check';

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
  /** Test inbox for one-time codes sent by email (AUTH_<ROLE>_OTP_SOURCE=email). Defaults to Mailpit at MAIL_API_URL. */
  mail?: MailPort;
};

// Per role, when the last emailed code used for a login arrived: a retry needs a newer email.
const lastEmailedCode = new Map<string, number>();

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
  private mailPort?: MailPort;

  constructor(options: UniversalAuthOptions) {
    this.mailPort = options.mail;
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

  /**
   * The role's current one-time code: from its TOTP secret (AUTH_<ROLE>_OTP_SECRET),
   * the newest email to it (AUTH_<ROLE>_OTP_SOURCE=email, received since `since`),
   * or a function passed as `roles: { x: { otp: () => code } }`.
   */
  async oneTimeCodeFor(role: string, { since }: { since?: Date } = {}): Promise<string> {
    const source = resolveOtpSource(role, { env: this.env, roles: this.roles });
    if (source?.kind === 'custom') return String(await source.provide());
    if (source?.kind === 'email') return this.emailedOneTimeCode(role, since);
    return oneTimeCode(role, { env: this.env, roles: this.roles });
  }

  /** The test inbox for emailed codes. */
  protected get mail(): MailPort {
    if (this.mailPort) return this.mailPort;
    if (!this.env.MAIL_API_URL) {
      throw new Error(
        `One-time codes by email (AUTH_<ROLE>_OTP_SOURCE=email) need a test inbox: set MAIL_API_URL to your Mailpit address, ` +
          'or pass mail to UniversalAuthAdapter.',
      );
    }
    this.mailPort = new MailpitAdapter({ baseUrl: this.env.MAIL_API_URL });
    return this.mailPort;
  }

  /** The code in the newest email to the role (AUTH_<ROLE>_OTP_EMAIL, default its username) received since `since`. */
  protected async emailedOneTimeCode(role: string, since?: Date): Promise<string> {
    const source = resolveOtpSource(role, { env: this.env, roles: this.roles });
    const subject = source?.kind === 'email' ? source.subject : undefined;
    const to = (source?.kind === 'email' && source.to) || this.credentialsFor(role).username;
    const keys = otpSourceEnvKeys(role);
    const message = await this.mail.waitFor({ to, subject, since }, Number(this.env.MAIL_TIMEOUT) || 10_000).catch((err: Error) => {
      throw new Error(`One-time code for "${role}" by email: ${err.message} Check ${keys.email} (default: the role's username) and ${keys.subject}.`);
    });
    const pattern = emailCodePattern(this.env);
    const code = emailCode(message, pattern);
    if (!code) throw new Error(`One-time code for "${role}": no code matching ${pattern} in the email "${message.subject}" to ${to}. Set MAIL_CODE_PATTERN.`);
    lastEmailedCode.set(role.toLowerCase(), message.date.getTime());
    return code;
  }

  apiSetBearer(world: World, token: string): void {
    world.headers = { ...(world.headers || {}), Authorization: `Bearer ${token}` };
    delete world.apiAuth;
    delete world.idTokenClaims;
  }

  async apiLoginAs(world: World, role: string): Promise<void> {
    const mode = apiAuthMode(this.env);
    if (mode === 'oidc') return this.oidcLogin(world, role);
    if (mode === 'ui-session') return this.uiSessionApiLogin(world, role);
    await this.apiLogin(world, role, this.credentialsFor(role));
  }

  /**
   * API_AUTH_MODE=ui-session: send the role's browser session cookie with API
   * requests, for APIs that only accept the app's session (a BFF). Uses the
   * session saved by `I am logged in as`, or logs in through a browser first.
   */
  protected async uiSessionApiLogin(world: World, role: string): Promise<void> {
    const state = await this.savedUiSession(world, role);
    const cookie = cookieHeaderFor(state, this.apiBaseUrl);
    if (!cookie) {
      throw new Error(
        `API login as "${role}" (API_AUTH_MODE=ui-session): the browser session has no cookies for ${new URL(this.apiBaseUrl).origin}. ` +
          `The API must be on the app's site (API_BASE_URL on the same host as FRONTEND_URL, or a subdomain the session cookie covers).`,
      );
    }
    world.headers = { ...(world.headers || {}), Cookie: cookie };
    delete world.headers.Authorization;
    delete world.apiAuth;
    delete world.idTokenClaims;
  }

  /**
   * The role's saved UI session, logging in (once, across workers) if there
   * is none or it has expired. Logs in through a browser of its own, so API
   * scenarios don't need one.
   */
  protected async savedUiSession(world: World, role: string): Promise<UiSessionState> {
    const creds = this.credentialsFor(role);
    const store = SessionStore.fromEnv(this.env);
    const key = this.sessionKey(role, creds);
    const saved = store.read(key);
    if (saved && (await this.savedSessionWorks(role, saved))) return saved.state;

    return store.withLock(key, async () => {
      const theirs = store.read(key);
      if (theirs && theirs.savedAt !== saved?.savedAt && (await this.savedSessionWorks(role, theirs))) return theirs.state;
      const state = await this.uiLoginInOwnBrowser(world, role, creds);
      store.write(key, state);
      return state;
    });
  }

  /** A saved session's cookies are current, and (UI_SESSION_CHECK) the app still accepts them, checked without a browser. */
  protected async savedSessionWorks(role: string, saved: SavedSession): Promise<boolean> {
    const app = resolveTargets(this.env).frontendUrl;
    const expired = (reason: string) => {
      console.log(`katalyst-xspec: the saved session for "${role}" ${reason}; logging in again.`);
      return false;
    };
    if (sessionCookiesExpired(saved.state, { host: new URL(app).hostname })) return expired('has expired cookies');
    const check = sessionCheckSettings(this.env);
    if (!check.enabled) return true;
    const url = new URL(check.path, app).href;
    const cookie = cookieHeaderFor(saved.state, url);
    if (!cookie) return expired(`has no cookies for ${new URL(app).origin}`);
    const res = await this.api.sendJson('GET', url, undefined, { Accept: 'text/html,application/json', Cookie: cookie });
    const finalUrl = res.response?.url?.() ?? url;
    if (res.status === 401 || res.status === 403) return expired(`is refused by ${check.path} (${res.status})`);
    if (loginPageMatcher(this.env)(finalUrl)) return expired(`is logged out (${check.path} went to ${new URL(finalUrl).pathname})`);
    return true;
  }

  /** Run the UI login in a headless browser of its own and return the session. */
  protected async uiLoginInOwnBrowser(world: World, role: string, creds: Credentials): Promise<UiSessionState> {
    const insecure = /^(1|true|yes)$/i.test(this.env.UI_LOGIN_IGNORE_HTTPS_ERRORS?.trim() ?? '');
    const context = await newLoginContext({ baseURL: resolveTargets(this.env).frontendUrl, ignoreHTTPSErrors: insecure });
    try {
      const ui = new PlaywrightUiAdapter(await context.newPage());
      // Same adapter (subclass overrides included), different browser.
      const self = Object.create(this) as this;
      Object.defineProperty(self, 'ui', { value: ui });
      await self.uiLogin(world, role, creds);
      return await ui.saveSession();
    } finally {
      await context.close();
    }
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
    if (saved && (await this.restoreSavedSession(role, saved))) return;

    await store.withLock(key, async () => {
      // Another worker may have logged in again while this one waited for the lock.
      const theirs = store.read(key);
      if (theirs && theirs.savedAt !== saved?.savedAt && (await this.restoreSavedSession(role, theirs))) return;
      await this.uiLogin(world, role, creds);
      store.write(key, await this.ui.saveSession!());
    });
  }

  /**
   * Restore a saved session and check it's still logged in (UI_SESSION_CHECK):
   * load UI_SESSION_CHECK_PATH and make sure it doesn't end up on the login
   * page (or, with UI_LOGIN_SUCCESS_TEXT, that the text appears). Returns false
   * if the session has expired, so the caller logs in again.
   */
  protected async restoreSavedSession(role: string, saved: SavedSession): Promise<boolean> {
    const check = sessionCheckSettings(this.env);
    const app = resolveTargets(this.env).frontendUrl;
    const expired = (reason: string) => {
      console.log(`katalyst-xspec: the saved session for "${role}" ${reason}; logging in again.`);
      return false;
    };
    if (sessionCookiesExpired(saved.state, { host: new URL(app).hostname })) return expired('has expired cookies');
    await this.ui.restoreSession!(saved.state);
    if (!check.enabled) return true;

    await this.ui.goto(check.path);
    if (check.text && this.ui.waitForText) {
      return (await this.ui.waitForText(check.text, check.timeoutMs)) || expired(`doesn't show "${check.text}" on ${check.path}`);
    }
    await this.ui.waitForPageLoad();
    const url = await this.ui.getCurrentUrl();
    return !loginPageMatcher(this.env)(url) || expired(`is logged out (${check.path} went to ${new URL(url).pathname})`);
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

  /**
   * Log in through the browser: the login page (UI_LOGIN_PATH), then page by
   * page (username, password, one-time code, consent) until it's back on the
   * app. See auth/login-flow.ts.
   */
  protected async uiLogin(world: World, role: string, creds: Credentials): Promise<void> {
    if (!this.ui.loginPage) return this.singlePageUiLogin(world, role, creds);
    const hasOtp = resolveOtpSource(role, { env: this.env, roles: this.roles }) !== undefined;
    // Emailed codes for this login arrive after it starts (allowing for the mail server's clock).
    const startedAt = new Date(Date.now() - 2000);
    await runLoginFlow({
      page: this.ui.loginPage(),
      role,
      creds,
      env: this.env,
      oneTimeCode: hasOtp ? () => this.loginOneTimeCode(role, startedAt) : undefined,
    });
  }

  /**
   * The one-time code for a login, never one already used: a TOTP code from a
   * new window, or an email newer than the last one used.
   */
  protected async loginOneTimeCode(role: string, loginStartedAt = new Date()): Promise<string> {
    const source = resolveOtpSource(role, { env: this.env, roles: this.roles });
    if (source?.kind === 'email') {
      const used = lastEmailedCode.get(role.toLowerCase());
      const since = used !== undefined && used >= loginStartedAt.getTime() ? new Date(used + 1) : loginStartedAt;
      return this.emailedOneTimeCode(role, since);
    }
    if (source?.kind === 'custom') return String(await source.provide());
    return freshOneTimeCode(role, { env: this.env, roles: this.roles, username: this.credentialsFor(role).username });
  }

  /** For UiPort adapters without loginPage(): fill the username and password on one page and submit. */
  protected async singlePageUiLogin(_world: World, role: string, creds: Credentials): Promise<void> {
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
      const excludes = loginUrlExcludes(this.env);
      ok = await this.ui.waitForUrl(
        (u) =>
          successUrl
            ? u.includes(successUrl) && !excludes.some((part) => u.includes(part))
            : new URL(u).pathname !== loginPathname && !excludes.some((part) => u.includes(part)),
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

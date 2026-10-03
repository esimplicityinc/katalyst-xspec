import type { ApiPort } from '../../ports/api.port';
import type { AuthPort, UiLoginOptions } from '../../ports/auth.port';
import type { UiPort, UiSessionState } from '../../ports/ui.port';
import type { World } from '../../world';
import { resolveCredentials, roleEnvKeys, type Credentials, type RoleCredentials } from '../../auth/credentials';
import { apiLoginErrorMessage, buildApiLoginRequest, extractToken } from '../../auth/api-login';

type Env = Record<string, string | undefined>;

export type UniversalAuthOptions = {
  api: ApiPort;
  ui: UiPort;
  /** Credentials per role, e.g. { pm: { username, password } }. Overrides AUTH_<ROLE>_* env vars. */
  roles?: RoleCredentials;
  /** Settings source; defaults to process.env. */
  env?: Env;
};

// Saved UI sessions, per worker process: role + username + login path -> state.
const uiSessions = new Map<string, UiSessionState>();

/** Forget saved UI sessions (e.g. after changing a password mid-run). */
export function clearUiSessions(): void {
  uiSessions.clear();
}

/**
 * Logs in by role through the API or the UI, configured by environment
 * variables (see docs/guides/authentication.md).
 *
 * Extend it by subclassing and overriding `apiLogin` / `uiLogin` (e.g. for SSO
 * or a multi-step form); credentials, steps and session reuse keep working.
 */
export class UniversalAuthAdapter implements AuthPort {
  protected readonly api: ApiPort;
  protected readonly ui: UiPort;
  protected readonly roles?: RoleCredentials;
  protected readonly env: Env;

  constructor(options: UniversalAuthOptions) {
    this.api = options.api;
    this.ui = options.ui;
    this.roles = options.roles;
    this.env = options.env ?? process.env;
  }

  /** Credentials for a role; throws MissingCredentialsError with the variables to set. */
  credentialsFor(role: string): Credentials {
    return resolveCredentials(role, { env: this.env, roles: this.roles });
  }

  apiSetBearer(world: World, token: string): void {
    world.headers = { ...(world.headers || {}), Authorization: `Bearer ${token}` };
  }

  async apiLoginAs(world: World, role: string): Promise<void> {
    await this.apiLogin(world, role, this.credentialsFor(role));
  }

  async uiLoginAs(world: World, role: string, options: UiLoginOptions = {}): Promise<void> {
    const creds = this.credentialsFor(role);
    const reuse = options.reuseSession && this.sessionReuseEnabled();
    const key = `${role.toLowerCase()}\u0000${creds.username}\u0000${this.env.UI_LOGIN_PATH || '/login'}`;

    if (reuse && this.ui.restoreSession) {
      const saved = uiSessions.get(key);
      if (saved) {
        await this.ui.restoreSession(saved);
        return;
      }
    }
    await this.uiLogin(world, role, creds);
    if (reuse && this.ui.saveSession) uiSessions.set(key, await this.ui.saveSession());
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

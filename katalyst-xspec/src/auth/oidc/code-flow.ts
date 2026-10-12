/**
 * Authorization code flow drivers: get from the provider's authorization URL
 * to the redirect back to OIDC_REDIRECT_URI by logging in as the role.
 *
 * - http (default): fetch the login page, submit its form, follow redirects.
 *   No browser. Handles identifier-first (username, then password) pages.
 * - browser: drive the page in headless Chromium, for login pages built by
 *   JavaScript.
 *
 * Nothing needs to listen on the redirect URI: the redirect is caught before
 * it is requested.
 */
import type { Browser, Locator, Page } from '@playwright/test';
import type { Credentials } from '../credentials';
import { roleEnvKeys } from '../credentials';
import type { OidcSettings } from './settings';
import { clientCertificateFor, createPlaywrightTransport, type OidcTransport } from './transport';
import { findLoginForm, formFields, pageErrorText, pageTitle, parseForms } from './html-form';

export type AuthorizeRequest = {
  /** Authorization URL to start from (includes PKCE challenge, state and nonce). */
  url: URL;
  redirectUri: string;
  credentials: Credentials;
  settings: OidcSettings;
};

/** Returns the URL the provider redirected back to (with `code` and `state`). */
export type Authorize = (request: AuthorizeRequest) => Promise<URL>;

function isCallback(url: URL, redirectUri: string): boolean {
  const r = new URL(redirectUri);
  return url.origin === r.origin && url.pathname === r.pathname;
}

function wrongCredentials(settings: OidcSettings, detail?: string): Error {
  const keys = roleEnvKeys(settings.role);
  return new Error(
    `OIDC login as "${settings.role}" failed: the provider showed the login form again${detail ? ` ("${detail}")` : ''}. ` +
      `Check ${keys.username} / ${keys.password}.`,
  );
}

export function createHttpAuthorize({ transportFor = (s: OidcSettings) => createPlaywrightTransport({ tls: s.tls }) } = {}): Authorize {
  return async ({ url, redirectUri, credentials, settings }) => {
    // Fresh cookies for every login, so one role's provider session never leaks into another's.
    const transport: OidcTransport = transportFor(settings);
    try {
      let current = new URL(url);
      let method = 'GET';
      let body: string | undefined;
      let submitted = { username: false, password: false };
      let submissions = 0;

      for (let hop = 0; hop < 40; hop++) {
        const res = await transport.fetch(current.href, {
          method,
          headers: { Accept: 'text/html,application/xhtml+xml', ...(body !== undefined ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
          body,
          redirect: 'manual',
        });
        const location = res.headers.get('location');
        if (res.status >= 300 && res.status < 400 && location) {
          const next = new URL(location, current);
          if (isCallback(next, redirectUri)) return next;
          current = next;
          method = 'GET';
          body = undefined;
          continue;
        }

        const html = await res.text();
        const where = `${current.origin}${current.pathname}`;
        if (res.status >= 400) {
          const detail = pageErrorText(html) || pageTitle(html);
          throw new Error(
            `OIDC login as "${settings.role}" failed: the provider returned ${res.status} on ${where}${detail ? ` ("${detail}")` : ''}. ` +
              'Check OIDC_REDIRECT_URI is registered for the client and the client allows the authorization code flow.',
          );
        }
        const login = findLoginForm(parseForms(html), settings.login);
        if (!login) {
          const title = pageTitle(html);
          throw new Error(
            `OIDC login as "${settings.role}": no login form on ${where}${title ? ` (page "${title}")` : ''}. ` +
              'If the page is built by JavaScript, set OIDC_CODE_FLOW_DRIVER=browser; if it asks for something else ' +
              '(consent, MFA), override oidcAuthorize in a UniversalAuthAdapter subclass. ' +
              'OIDC_LOGIN_USERNAME_FIELD / OIDC_LOGIN_PASSWORD_FIELD set the field names.',
          );
        }
        if ((login.password && submitted.password) || (login.username && !login.password && submitted.username)) {
          throw wrongCredentials(settings, pageErrorText(html));
        }
        if (++submissions > 5) throw new Error(`OIDC login as "${settings.role}": gave up after 5 login forms on ${where}.`);

        const values: Record<string, string> = {};
        if (login.username) values[login.username] = credentials.username;
        if (login.password) values[login.password] = credentials.password;
        submitted = { username: submitted.username || Boolean(login.username), password: submitted.password || Boolean(login.password) };

        const action = new URL(login.form.action ?? current.href, current);
        const fields = new URLSearchParams(formFields(login.form, values)).toString();
        if (login.form.method === 'POST') {
          current = action;
          method = 'POST';
          body = fields;
        } else {
          action.search = fields;
          current = action;
          method = 'GET';
          body = undefined;
        }
      }
      throw new Error(`OIDC login as "${settings.role}": too many redirects starting from ${url.origin}${url.pathname}.`);
    } finally {
      await transport.dispose();
    }
  };
}

let sharedBrowser: Promise<Browser> | undefined;

async function launchBrowser(): Promise<Browser> {
  sharedBrowser ??= import('@playwright/test').then(({ chromium }) => chromium.launch()).catch((err) => {
    sharedBrowser = undefined;
    throw new Error(`OIDC_CODE_FLOW_DRIVER=browser needs Chromium: run "npx playwright install chromium" (${(err as Error).message.split('\n')[0]})`);
  });
  return sharedBrowser;
}

/** Close the browser used by the browser driver (it is otherwise shared by every login in the worker). */
export async function closeOidcBrowser(): Promise<void> {
  const b = sharedBrowser;
  sharedBrowser = undefined;
  await (await b?.catch(() => undefined))?.close();
}

function field(page: Page, name: string): Locator {
  return page
    .getByLabel(name, { exact: true })
    .or(page.getByPlaceholder(name, { exact: true }))
    .or(page.locator(`[name="${name.replace(/"/g, '\\"')}"]`))
    .first();
}

const TEXT_INPUT = 'input:is([type="text" i], [type="email" i], [type="tel" i], :not([type]))';
const USERNAME_SELECTOR = [
  'input[autocomplete="username"]',
  'input[type="email"]',
  `${TEXT_INPUT}[name*="user" i]`,
  `${TEXT_INPUT}[name*="email" i]`,
  `${TEXT_INPUT}[name*="login" i]`,
  `${TEXT_INPUT}[id*="user" i]`,
  `${TEXT_INPUT}[name*="identifier" i]`,
]
  .map((s) => `${s}:visible`)
  .join(', ');

async function visible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

export function createBrowserAuthorize(): Authorize {
  return async ({ url, redirectUri, credentials, settings }) => {
    const browser = await launchBrowser();
    const cert = clientCertificateFor(url.origin, settings.tls);
    const context = await browser.newContext({ ignoreHTTPSErrors: settings.tls.insecure, ...(cert ? { clientCertificates: [cert] } : {}) });
    try {
      let resolveCallback!: (u: URL) => void;
      const callback = new Promise<URL>((r) => (resolveCallback = r));
      let done: URL | undefined;
      const capture = (raw: string) => {
        const u = new URL(raw);
        if (!done && isCallback(u, redirectUri)) {
          done = u;
          resolveCallback(u);
        }
      };
      // Redirects aren't routed, but they do emit request events.
      context.on('request', (req) => capture(req.url()));
      await context.route(
        (u) => isCallback(u, redirectUri),
        async (route) => {
          capture(route.request().url());
          await route.fulfill({ status: 200, contentType: 'text/plain', body: 'katalyst-xspec: login complete' });
        },
      );

      const page = await context.newPage();
      const deadline = Date.now() + settings.login.timeoutMs;
      await Promise.race([page.goto(url.href, { timeout: settings.login.timeoutMs }), callback]);

      const { usernameField, passwordField, button } = settings.login;
      let passwordSubmitted = false;
      let usernameSubmitted = false;

      while (!done) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          const text = await page.locator('[role="alert"], [class*="error" i], [id*="error" i]').first().innerText({ timeout: 500 }).catch(() => '');
          throw new Error(
            `OIDC login as "${settings.role}": no redirect to OIDC_REDIRECT_URI within ${settings.login.timeoutMs}ms (stuck on ${page.url()}` +
              `${text.trim() ? `, page says "${text.trim().slice(0, 200)}"` : ''}). Check the credentials, or raise OIDC_LOGIN_TIMEOUT.`,
          );
        }
        const pass = passwordField ? field(page, passwordField) : page.locator('input[type="password"]:visible').first();
        const user = usernameField ? field(page, usernameField) : page.locator(USERNAME_SELECTOR).first();
        const passVisible = await visible(pass);
        const userVisible = await visible(user);

        if (!passVisible && !userVisible) {
          await Promise.race([callback, page.waitForTimeout(Math.min(250, remaining))]);
          continue;
        }
        if (passVisible && passwordSubmitted) {
          const text = await page.locator('[role="alert"], [class*="error" i], [id*="error" i]').first().innerText({ timeout: 500 }).catch(() => '');
          throw wrongCredentials(settings, text.trim().slice(0, 200) || undefined);
        }
        if (!passVisible && userVisible && usernameSubmitted) {
          await Promise.race([callback, page.waitForTimeout(Math.min(250, remaining))]);
          continue;
        }

        let last: Locator | undefined;
        if (userVisible && (await user.isEditable().catch(() => false))) {
          await user.fill(credentials.username);
          last = user;
          usernameSubmitted = true;
        }
        if (passVisible) {
          await pass.fill(credentials.password);
          last = pass;
          passwordSubmitted = true;
        }
        if (!last) continue;

        const navigated = page.waitForEvent('framenavigated', { timeout: remaining }).catch(() => undefined);
        if (button) await page.getByRole('button', { name: button }).first().click({ timeout: remaining });
        else await last.press('Enter');
        await Promise.race([callback, navigated, last.waitFor({ state: 'hidden', timeout: remaining }).catch(() => undefined)]);
        await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      }
      return done;
    } finally {
      await context.close().catch(() => undefined);
    }
  };
}

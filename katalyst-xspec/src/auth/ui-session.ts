/**
 * Using a browser login session outside the browser: the role's saved UI
 * session as a Cookie header for API requests (API_AUTH_MODE=ui-session),
 * and a headless browser for logging in when no scenario browser is around.
 */
import type { Browser, BrowserContext } from '@playwright/test';
import type { UiSessionState } from '../ports/ui.port';

type Cookie = { name: string; value: string; domain?: string; path?: string; secure?: boolean; expires?: number };

function domainMatches(host: string, domain: string): boolean {
  const d = domain.replace(/^\./, '').toLowerCase();
  const h = host.toLowerCase();
  return h === d || h.endsWith(`.${d}`);
}

function pathMatches(requestPath: string, cookiePath: string): boolean {
  if (!cookiePath || cookiePath === '/') return true;
  const p = cookiePath.replace(/\/+$/, '');
  return requestPath === p || requestPath.startsWith(`${p}/`);
}

/**
 * The `Cookie` header a browser would send to `url` with this session: cookies
 * whose domain and path match, secure ones only over https, none expired.
 * Undefined if no cookie applies.
 */
export function cookieHeaderFor(state: UiSessionState, url: string, now = Date.now()): string | undefined {
  const target = new URL(url);
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  const cookies = (state.cookies as Cookie[]).filter((c) => {
    if (!c.name || c.value === undefined) return false;
    if (c.domain && !domainMatches(target.hostname, c.domain)) return false;
    if (!pathMatches(target.pathname, c.path || '/')) return false;
    if (c.secure && target.protocol !== 'https:' && !isLocal) return false;
    const expires = Number(c.expires);
    return !(expires > 0 && expires * 1000 <= now);
  });
  if (!cookies.length) return undefined;
  // Longer paths first, as browsers send them.
  cookies.sort((a, b) => (b.path || '/').length - (a.path || '/').length);
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

let sharedBrowser: Promise<Browser> | undefined;

/**
 * A browser context for logging in when the scenario has no browser (API-only
 * scenarios with API_AUTH_MODE=ui-session). The browser is shared by the
 * worker; close the context when done.
 */
export async function newLoginContext({ baseURL, ignoreHTTPSErrors = false }: { baseURL: string; ignoreHTTPSErrors?: boolean }): Promise<BrowserContext> {
  sharedBrowser ??= import('@playwright/test')
    .then(({ chromium }) => chromium.launch())
    .catch((err) => {
      sharedBrowser = undefined;
      throw new Error(
        `API_AUTH_MODE=ui-session logs in through a browser and needs Chromium: run "npx playwright install chromium" ` +
          `(${(err as Error).message.split('\n')[0]})`,
      );
    });
  return (await sharedBrowser).newContext({ baseURL, ignoreHTTPSErrors });
}

/** Close the browser used for logins outside a scenario's browser. */
export async function closeLoginBrowser(): Promise<void> {
  const b = sharedBrowser;
  sharedBrowser = undefined;
  await (await b?.catch(() => undefined))?.close();
}

type BrowserCookie = { name: string; value: string; url?: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' };

/**
 * Cookies for the browser from the API side of a scenario: the API request
 * context's cookie jar (a cookie-session API login) and a Cookie header set on
 * the scenario (API_AUTH_MODE=ui-session, or `I set header "Cookie" to ...`).
 */
export function apiSessionCookies({
  jar = [],
  cookieHeader,
  apiBaseUrl,
}: {
  jar?: BrowserCookie[];
  cookieHeader?: string;
  apiBaseUrl: string;
}): BrowserCookie[] {
  const cookies: BrowserCookie[] = jar.map((c) => ({ ...c }));
  const origin = new URL(apiBaseUrl).origin;
  for (const part of (cookieHeader || '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    if (!cookies.some((c) => c.name === name)) cookies.push({ name, value: part.slice(i + 1).trim(), url: origin });
  }
  return cookies;
}

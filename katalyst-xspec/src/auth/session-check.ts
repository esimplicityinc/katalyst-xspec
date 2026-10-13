/**
 * Telling whether a restored UI session is still logged in, and whether a URL
 * is the login page (the app's own, or the identity provider's).
 */
import type { UiSessionState } from '../ports/ui.port';

type Env = Record<string, string | undefined>;

export type SessionCheckSettings = {
  enabled: boolean;
  /** Page loaded after restoring a session; a logged-out session ends up on the login page instead. */
  path: string;
  /** If set, the session is valid only if this text appears on that page (UI_LOGIN_SUCCESS_TEXT). */
  text?: string;
  timeoutMs: number;
};

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return !/^(0|false|no|off)$/i.test(value.trim());
}

export function sessionCheckSettings(env: Env = process.env): SessionCheckSettings {
  return {
    enabled: flag(env.UI_SESSION_CHECK, true),
    path: env.UI_SESSION_CHECK_PATH || '/',
    text: env.UI_LOGIN_SUCCESS_TEXT || undefined,
    timeoutMs: Number(env.UI_LOGIN_TIMEOUT) || 10_000,
  };
}

/** UI_LOGIN_SUCCESS_URL_EXCLUDES: comma-separated URL parts that mean "still logging in" (e.g. the identity provider's `/realms/`). */
export function loginUrlExcludes(env: Env = process.env): string[] {
  return (env.UI_LOGIN_SUCCESS_URL_EXCLUDES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A predicate for "this URL is a login page": the app's UI_LOGIN_PATH, a URL
 * containing one of UI_LOGIN_SUCCESS_URL_EXCLUDES, or, when FRONTEND_URL is
 * set, any page outside the app's origin (the identity provider).
 */
export function loginPageMatcher(env: Env = process.env): (url: string) => boolean {
  const loginPath = new URL(env.UI_LOGIN_PATH || '/login', 'http://x').pathname.replace(/\/+$/, '') || '/';
  const excludes = loginUrlExcludes(env);
  const appUrl = env.FRONTEND_URL || env.BASE_URL;
  const appOrigin = appUrl ? new URL(appUrl).origin : undefined;
  return (raw) => {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return false;
    }
    if (excludes.some((part) => url.href.includes(part))) return true;
    if (appOrigin && url.origin !== appOrigin) return true;
    return (url.pathname.replace(/\/+$/, '') || '/') === loginPath;
  };
}

/** Whether any of the app's cookies in a saved session has passed its expiry date. */
export function sessionCookiesExpired(state: UiSessionState, { now = Date.now(), host }: { now?: number; host?: string } = {}): boolean {
  return state.cookies.some((c) => {
    const expires = Number(c.expires);
    if (!(expires > 0) || expires * 1000 > now) return false;
    if (!host) return true;
    const domain = String(c.domain || '').replace(/^\./, '');
    return host === domain || host.endsWith(`.${domain}`);
  });
}

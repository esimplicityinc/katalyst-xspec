/**
 * Logging in through the browser, page by page, until it's back on the app:
 * username and password (together or one after the other), a one-time code,
 * a consent page. Works for an app's own login form and for apps that send
 * the browser to an identity provider (Keycloak, login.gov, Okta, Entra ID)
 * and back, such as a backend-for-frontend's /auth/start -> /auth/callback.
 */
import type { LoginFieldKind, LoginPage } from '../ports/ui.port';
import type { Credentials } from './credentials';
import { roleEnvKeys } from './credentials';
import { otpEnvKeys } from './otp';
import { loginPageMatcher, loginUrlExcludes } from './session-check';

type Env = Record<string, string | undefined>;

export type LoginFlowSettings = {
  loginPath: string;
  usernameField: string;
  passwordField: string;
  otpField?: string;
  loginButton: string;
  otpButton?: string;
  consentButton?: string;
  successUrl?: string;
  successText?: string;
  /** Per page: how long to wait for the next page before giving up. */
  timeoutMs: number;
};

export function loginFlowSettings(env: Env = process.env): LoginFlowSettings {
  return {
    loginPath: env.UI_LOGIN_PATH || '/login',
    usernameField: env.UI_USERNAME_FIELD || 'Username',
    passwordField: env.UI_PASSWORD_FIELD || 'Password',
    otpField: env.UI_OTP_FIELD || undefined,
    loginButton: env.UI_LOGIN_BUTTON || 'Login',
    otpButton: env.UI_OTP_BUTTON || undefined,
    consentButton: env.UI_CONSENT_BUTTON || undefined,
    successUrl: env.UI_LOGIN_SUCCESS_URL || undefined,
    successText: env.UI_LOGIN_SUCCESS_TEXT || undefined,
    timeoutMs: Number(env.UI_LOGIN_TIMEOUT) || 10_000,
  };
}

export type LoginFlowOptions = {
  page: LoginPage;
  role: string;
  creds: Credentials;
  env?: Env;
  /** A fresh one-time code for the role; undefined if the role has no OTP settings. */
  oneTimeCode?: () => Promise<string>;
  pollMs?: number;
};

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

export async function runLoginFlow({ page, role, creds, env = process.env, oneTimeCode, pollMs = 250 }: LoginFlowOptions): Promise<void> {
  const s = loginFlowSettings(env);
  const keys = roleEnvKeys(role);
  const isLoginPage = loginPageMatcher(env);
  const excludes = loginUrlExcludes(env);
  // Configured fields are used on their own; unset ones are recognized by the page adapter.
  const fieldName: Record<LoginFieldKind, string | undefined> = {
    username: env.UI_USERNAME_FIELD || undefined,
    password: env.UI_PASSWORD_FIELD || undefined,
    otp: s.otpField,
  };
  const says = async () => {
    const text = await page.errorText();
    return text ? ` (the page says "${text}")` : '';
  };

  await page.goto(s.loginPath);
  const startPath = pathOf(page.url());
  let deadline = Date.now() + s.timeoutMs;
  let submits = 0;
  let usernameSubmitted = false;
  let passwordSubmitted = false;
  let otpTries = 0;
  let consentClicks = 0;

  const loggedIn = async (anyField: boolean): Promise<boolean> => {
    if (s.successText) return page.hasText(s.successText);
    if (!submits || anyField) return false;
    const url = page.url();
    if (excludes.some((part) => url.includes(part))) return false;
    if (s.successUrl) return url.includes(s.successUrl);
    return !isLoginPage(url) && pathOf(url) !== startPath;
  };

  for (;;) {
    const [username, password, otp] = await Promise.all(
      (['username', 'password', 'otp'] as const).map((k) => page.hasField(k, fieldName[k])),
    );
    const anyField = username || password || otp;
    if (await loggedIn(anyField)) return;
    const where = pathOf(page.url());

    if (Date.now() > deadline) {
      const expected = s.successText
        ? `for "${s.successText}" to appear`
        : s.successUrl
          ? `for a URL containing "${s.successUrl}"`
          : 'to leave the login page';
      throw new Error(
        `UI login as "${role}" stayed on ${where} (waited ${s.timeoutMs}ms ${expected})${await says()}. ` +
          `Check ${keys.username} / ${keys.password}. If your app doesn't navigate after login, set UI_LOGIN_SUCCESS_TEXT ` +
          `(text shown once logged in) or UI_LOGIN_SUCCESS_URL. If this is a page of the identity provider, ` +
          `set UI_LOGIN_SUCCESS_URL_EXCLUDES to part of its URL, or UI_CONSENT_BUTTON if it asks you to agree to something.`,
      );
    }

    if (otp) {
      const otpKeys = otpEnvKeys(role);
      if (!oneTimeCode) {
        throw new Error(
          `UI login as "${role}": ${where} asks for a one-time code. Set ${otpKeys.secret} (the authenticator's TOTP secret) ` +
            `in .env, or AUTH_OTP_SECRET for every role. If that field isn't a one-time code, set UI_OTP_FIELD to the right field.`,
        );
      }
      if (otpTries >= 2) {
        throw new Error(
          `UI login as "${role}": the one-time code was rejected twice on ${where}${await says()}. ` +
            `Check ${otpKeys.secret} and ${otpKeys.encoding} / ${otpKeys.digits} / ${otpKeys.period} / ${otpKeys.algorithm} ` +
            `against the provider's OTP policy, and the machine's clock.`,
        );
      }
      // A second try waits for the next code: the first may have been used already.
      const code = await oneTimeCode();
      await page.fill('otp', code, s.otpField);
      otpTries++;
      await page.submit('otp', [s.otpButton, s.loginButton].filter(Boolean) as string[], s.timeoutMs);
      submits++;
      deadline = Date.now() + s.timeoutMs;
      continue;
    }

    if (password && passwordSubmitted) {
      // Give a slow page a moment before concluding the password was refused.
      await page.wait(pollMs);
      if (!(await page.hasField('password', fieldName.password))) continue;
      if (otpTries > 0) {
        throw new Error(
          `UI login as "${role}": after the one-time code, ${where} asked for the password again${await says()}. ` +
            `The provider restarted the sign-in: check that UI_OTP_BUTTON / UI_LOGIN_BUTTON name the button that submits ` +
            `the code (unset, Enter is pressed), and that the code was accepted.`,
        );
      }
      throw new Error(`UI login as "${role}" stayed on ${where}: the password was asked for again${await says()}. Check ${keys.username} / ${keys.password}.`);
    }
    if (password && !username && !usernameSubmitted) {
      throw new Error(
        `UI login as "${role}": No username field "${s.usernameField}" on ${where} (looked for a label, placeholder or name). ` +
          `Set UI_USERNAME_FIELD to the field's label or placeholder, or UI_LOGIN_PATH to the login page.`,
      );
    }
    if (!anyField || (username && !password && usernameSubmitted)) {
      // Between pages, or a page with nothing to fill: maybe a consent page.
      if (s.consentButton && consentClicks < 3 && (await page.hasButton(s.consentButton))) {
        await page.submit(undefined, [s.consentButton], s.timeoutMs);
        consentClicks++;
        submits++;
        deadline = Date.now() + s.timeoutMs;
        continue;
      }
      await page.wait(pollMs);
      continue;
    }

    let last: LoginFieldKind | undefined;
    if (username) {
      await page.fill('username', creds.username, fieldName.username);
      usernameSubmitted = true;
      last = 'username';
    }
    if (password) {
      await page.fill('password', creds.password, fieldName.password);
      passwordSubmitted = true;
      last = 'password';
    }
    await page.submit(last, [s.loginButton], s.timeoutMs);
    submits++;
    deadline = Date.now() + s.timeoutMs;
  }
}

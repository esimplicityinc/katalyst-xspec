import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { PlaywrightUiAdapter } from '../adapters/ui/playwright-ui.adapter.js';
import { UniversalAuthAdapter, clearUiSessions } from '../adapters/auth/universal-auth.adapter.js';
import { initWorld } from '../world.js';
import { startFakeBff } from './helpers/fake-bff.js';

let browser: Browser | undefined;
let skip: string | false = false;
try {
  browser = await chromium.launch();
} catch (err) {
  skip = `chromium unavailable: ${(err as Error).message.split('\n')[0]}`;
}
after(async () => browser?.close());

const SECRET = 'logingov-local-otp-secret';
const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-login-flow-'));
after(() => fs.rmSync(sessionDir, { recursive: true, force: true }));

async function login(appBase: string, env: Record<string, string>, { reuseSession = false } = {}) {
  const context = await browser!.newContext({ baseURL: appBase });
  const page = await context.newPage();
  const auth = new UniversalAuthAdapter({ api: undefined as never, ui: new PlaywrightUiAdapter(page), env: { UI_SESSION_DIR: sessionDir, ...env } });
  try {
    await auth.uiLoginAs(initWorld(), 'pm', { reuseSession });
    return { url: page.url(), text: await page.locator('h1').innerText().catch(() => '') };
  } finally {
    await context.close();
  }
}

describe('UI login through a BFF and a Keycloak-like provider', { skip }, () => {
  let bff: Awaited<ReturnType<typeof startFakeBff>>;
  before(async () => {
    bff = await startFakeBff({ users: { 'facial@test.local': { password: 'password', otpSecret: SECRET } }, otpPeriod: 2 });
  });
  after(async () => bff.close());

  const env = (extra: Record<string, string> = {}) => ({
    FRONTEND_URL: bff.appBase,
    UI_LOGIN_PATH: '/auth/start',
    AUTH_PM_USERNAME: 'facial@test.local',
    AUTH_PM_PASSWORD: 'password',
    AUTH_PM_OTP_SECRET: SECRET,
    AUTH_OTP_ENCODING: 'latin1',
    AUTH_OTP_PERIOD: '2',
    ...extra,
  });

  it('fills username + password, then the one-time code, and ends back on the app', async () => {
    const before = { ...bff.stats };
    const result = await login(bff.appBase, env());
    assert.equal(result.url, `${bff.appBase}/home`);
    assert.equal(result.text, 'Welcome back');
    assert.equal(bff.stats.otpSubmissions - before.otpSubmissions, 1);
    assert.equal(bff.stats.logins - before.logins, 1);
  });

  it('without FRONTEND_URL, UI_LOGIN_SUCCESS_URL_EXCLUDES tells the provider pages apart', async () => {
    const { FRONTEND_URL: _, ...rest } = env({ UI_LOGIN_SUCCESS_URL_EXCLUDES: '/realms/' });
    const result = await login(bff.appBase, rest);
    assert.equal(result.text, 'Welcome back');
  });

  it('two logins in the same window: the second waits for a new code instead of reusing one', async () => {
    const before = { ...bff.stats };
    await login(bff.appBase, env());
    await login(bff.appBase, env());
    assert.equal(bff.stats.logins - before.logins, 2);
    assert.equal(bff.stats.reusedCodes - before.reusedCodes, 0, 'no code was submitted twice');
  });

  it('a wrong secret is retried once with the next code, then fails naming the settings', async () => {
    const before = { ...bff.stats };
    await assert.rejects(
      login(bff.appBase, env({ AUTH_PM_OTP_SECRET: 'not-the-secret' })),
      /one-time code was rejected twice[\s\S]*Invalid authenticator code[\s\S]*AUTH_PM_OTP_SECRET/,
    );
    assert.equal(bff.stats.otpSubmissions - before.otpSubmissions, 2);
  });

  it('a one-time code page without an OTP secret names the variable to set', async () => {
    const { AUTH_PM_OTP_SECRET: _, ...rest } = env();
    await assert.rejects(login(bff.appBase, rest), /asks for a one-time code\. Set AUTH_PM_OTP_SECRET/);
  });

  it("a wrong password fails with the provider's message", async () => {
    await assert.rejects(
      login(bff.appBase, env({ AUTH_PM_PASSWORD: 'wrong', UI_LOGIN_TIMEOUT: '3000' })),
      /stayed on \/realms\/app\/login-actions: the password was asked for again \(the page says "Invalid username or password\."\)[\s\S]*AUTH_PM_PASSWORD/,
    );
  });

  it('with session reuse, a second scenario restores the BFF session without a new code', async () => {
    clearUiSessions({ env: { UI_SESSION_DIR: sessionDir } });
    const before = { ...bff.stats };
    const reuse = env({ XSPEC_RUN_ID: 'flow-reuse', UI_SESSION_CHECK_PATH: '/home' });
    await login(bff.appBase, reuse, { reuseSession: true });
    const second = await login(bff.appBase, reuse, { reuseSession: true });
    assert.equal(second.text, 'Welcome back');
    assert.equal(bff.stats.otpSubmissions - before.otpSubmissions, 1);

    // The app forgets the session: the next scenario logs in again through the provider.
    bff.logOutEveryone();
    const third = await login(bff.appBase, reuse, { reuseSession: true });
    assert.equal(third.text, 'Welcome back');
    assert.equal(bff.stats.otpSubmissions - before.otpSubmissions, 2);
  });
});

describe('UI login on username-first pages with a consent page', { skip }, () => {
  let bff: Awaited<ReturnType<typeof startFakeBff>>;
  before(async () => {
    bff = await startFakeBff({ users: { 'pm@x.com': { password: 'pw' } }, layout: 'identifier-first', consent: true });
  });
  after(async () => bff.close());

  const env = (extra: Record<string, string> = {}) => ({
    FRONTEND_URL: bff.appBase,
    UI_LOGIN_PATH: '/auth/start',
    AUTH_PM_USERNAME: 'pm@x.com',
    AUTH_PM_PASSWORD: 'pw',
    UI_CONSENT_BUTTON: 'Agree and continue',
    UI_LOGIN_TIMEOUT: '3000',
    ...extra,
  });

  it('username, Next, password, consent, back on the app', async () => {
    const result = await login(bff.appBase, env());
    assert.equal(result.text, 'Welcome back');
  });

  it('without UI_CONSENT_BUTTON it stops on the consent page and says which setting to use', async () => {
    const { UI_CONSENT_BUTTON: _, ...rest } = env();
    await assert.rejects(login(bff.appBase, rest), /stayed on \/realms\/app\/login-actions[\s\S]*UI_CONSENT_BUTTON/);
  });

  it('a wrong password on the second page fails with its message', async () => {
    await assert.rejects(login(bff.appBase, env({ AUTH_PM_PASSWORD: 'nope' })), /password was asked for again \(the page says "Wrong password\."\)/);
  });
});

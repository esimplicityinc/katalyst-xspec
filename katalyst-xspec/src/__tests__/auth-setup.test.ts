import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { createAuthSetup } from '../auth/auth-setup.js';
import { PlaywrightUiAdapter } from '../adapters/ui/playwright-ui.adapter.js';
import { UniversalAuthAdapter } from '../adapters/auth/universal-auth.adapter.js';
import { initWorld } from '../world.js';
import { startFakeBff } from './helpers/fake-bff.js';

let browser: Browser | undefined;
let skip: string | false = false;
try {
  browser = await chromium.launch();
} catch (err) {
  skip = `chromium unavailable: ${(err as Error).message.split('\n')[0]}`;
}

describe('createAuthSetup', () => {
  it('registers one test per role and needs at least one', () => {
    const titles: string[] = [];
    createAuthSetup({ roles: ['applicant', 'admin'], test: (title) => titles.push(title) });
    assert.deepEqual(titles, ['log in as applicant', 'log in as admin']);
    assert.throws(() => createAuthSetup({ roles: [], test: () => {} }), /at least one role/);
  });
});

describe('createAuthSetup with a browser', { skip }, () => {
  let bff: Awaited<ReturnType<typeof startFakeBff>>;
  const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-auth-setup-'));
  before(async () => {
    bff = await startFakeBff({ users: { 'a@x': { password: 'pw', otpSecret: 'logingov-local-otp-secret' }, 'b@x': { password: 'pw' } } });
  });
  after(async () => {
    await bff.close();
    await browser?.close();
    fs.rmSync(sessionDir, { recursive: true, force: true });
  });
  const env = () => ({
    FRONTEND_URL: bff.appBase,
    UI_LOGIN_PATH: '/auth/start',
    UI_SESSION_DIR: sessionDir,
    XSPEC_RUN_ID: 'auth-setup',
    UI_SESSION_CHECK_PATH: '/home',
    AUTH_APPLICANT_USERNAME: 'a@x',
    AUTH_APPLICANT_PASSWORD: 'pw',
    AUTH_APPLICANT_OTP_SECRET: 'logingov-local-otp-secret',
    AUTH_OTP_ENCODING: 'latin1',
    AUTH_ADMIN_USERNAME: 'b@x',
    AUTH_ADMIN_PASSWORD: 'pw',
  });

  /** Run the registered setup tests, each with a fresh page, as Playwright would. */
  async function runSetup(options: { fresh?: boolean } = {}) {
    const bodies: Array<(args: any) => Promise<void>> = [];
    createAuthSetup({ roles: ['applicant', 'admin'], env: env(), ...options, test: (_t, body) => bodies.push(body) });
    for (const body of bodies) {
      const context = await browser!.newContext({ baseURL: bff.appBase });
      try {
        await body({ page: await context.newPage(), request: context.request });
      } finally {
        await context.close();
      }
    }
  }

  it('logs each role in once; scenarios then restore the sessions without logging in', async () => {
    const before = bff.stats.logins;
    await runSetup();
    assert.equal(bff.stats.logins - before, 2);
    assert.equal(fs.readdirSync(sessionDir).filter((f) => f.endsWith('.json')).length, 2);

    const context = await browser!.newContext({ baseURL: bff.appBase });
    const page = await context.newPage();
    try {
      await new UniversalAuthAdapter({ api: undefined as never, ui: new PlaywrightUiAdapter(page), env: env() }).uiLoginAs(initWorld(), 'applicant', {
        reuseSession: true,
      });
      assert.equal(await page.locator('h1').innerText(), 'Welcome back');
    } finally {
      await context.close();
    }
    assert.equal(bff.stats.logins - before, 2, 'the scenario reused the setup session');
  });

  it('running setup again reuses saved sessions; fresh: true logs in again', async () => {
    const before = bff.stats.logins;
    await runSetup();
    assert.equal(bff.stats.logins - before, 0);
    await runSetup({ fresh: true });
    assert.equal(bff.stats.logins - before, 2);
  });
});

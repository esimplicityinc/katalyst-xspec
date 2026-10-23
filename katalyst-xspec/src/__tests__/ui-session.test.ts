import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, request as pwRequest, type Browser } from '@playwright/test';
import { PlaywrightApiAdapter } from '../adapters/api/playwright-api.adapter.js';
import { PlaywrightUiAdapter } from '../adapters/ui/playwright-ui.adapter.js';
import { UniversalAuthAdapter } from '../adapters/auth/universal-auth.adapter.js';
import { apiSessionCookies, closeLoginBrowser, cookieHeaderFor } from '../auth/ui-session.js';
import { initWorld } from '../world.js';
import { startFakeBff } from './helpers/fake-bff.js';

describe('cookieHeaderFor', () => {
  const now = 1_000_000_000_000;
  const c = (name: string, extra: Record<string, unknown> = {}) => ({ name, value: `${name}-v`, domain: 'app.example.gov', path: '/', ...extra });

  it('sends cookies whose domain and path match the URL', () => {
    const state = {
      cookies: [c('sid'), c('parent', { domain: '.example.gov' }), c('api', { path: '/api' }), c('admin', { path: '/admin' }), c('other', { domain: 'other.gov' })],
      origins: [],
    };
    assert.equal(cookieHeaderFor(state, 'https://app.example.gov/api/users', now), 'api=api-v; sid=sid-v; parent=parent-v');
    assert.equal(cookieHeaderFor(state, 'https://api.example.gov/x', now), 'parent=parent-v');
    assert.equal(cookieHeaderFor(state, 'https://elsewhere.com/', now), undefined);
  });

  it('leaves out expired cookies, and secure ones over plain http (except localhost)', () => {
    const state = { cookies: [c('old', { expires: now / 1000 - 1 }), c('sec', { secure: true }), c('ok', { expires: now / 1000 + 60 })], origins: [] };
    assert.equal(cookieHeaderFor(state, 'http://app.example.gov/', now), 'ok=ok-v');
    assert.equal(cookieHeaderFor({ cookies: [c('sec', { secure: true, domain: 'localhost' })], origins: [] }, 'http://localhost:3000/', now), 'sec=sec-v');
  });
});

let browser: Browser | undefined;
let skip: string | false = false;
try {
  browser = await chromium.launch();
} catch (err) {
  skip = `chromium unavailable: ${(err as Error).message.split('\n')[0]}`;
}

describe('apiSessionCookies', () => {
  it('marks __Host- and __Secure- cookies secure, as browsers require for those names', () => {
    const cookies = apiSessionCookies({ cookieHeader: '__Host-ses=abc; __Secure-x=1; plain=2', apiBaseUrl: 'http://localhost:8000' });
    assert.deepEqual(cookies, [
      { name: '__Host-ses', value: 'abc', url: 'https://localhost:8000', secure: true },
      { name: '__Secure-x', value: '1', url: 'https://localhost:8000', secure: true },
      { name: 'plain', value: '2', url: 'http://localhost:8000' },
    ]);
  });

  it('a __Host- session cookie from the API can be added to a browser', { skip }, async () => {
    const context = await browser!.newContext();
    try {
      await context.addCookies(apiSessionCookies({ cookieHeader: '__Host-ses=abc', apiBaseUrl: 'http://localhost:8000/v1' }));
      assert.deepEqual((await context.cookies('http://localhost:3000')).map((c) => [c.name, c.path, c.secure]), [['__Host-ses', '/', true]]);
      // And the page actually sends it to http://localhost.
      const page = await context.newPage();
      let sent: string | undefined;
      await page.route('http://localhost:3000/**', async (route) => {
        sent = route.request().headers().cookie;
        await route.fulfill({ body: 'ok' });
      });
      await page.goto('http://localhost:3000/application/');
      assert.equal(sent, '__Host-ses=abc');
    } finally {
      await context.close();
    }
  });

  it("merges the API context's cookies and a Cookie header", () => {
    const cookies = apiSessionCookies({
      jar: [{ name: 'sid', value: 'jar', domain: 'api.local', path: '/' }],
      cookieHeader: 'sid=header; theme=dark',
      apiBaseUrl: 'http://api.local:4000/v1',
    });
    assert.deepEqual(cookies, [
      { name: 'sid', value: 'jar', domain: 'api.local', path: '/' },
      { name: 'theme', value: 'dark', url: 'http://api.local:4000' },
    ]);
  });
});


describe('API_AUTH_MODE=ui-session against a BFF', { skip }, () => {
  let bff: Awaited<ReturnType<typeof startFakeBff>>;
  const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-ui-session-'));
  const SECRET = 'logingov-local-otp-secret';
  before(async () => {
    bff = await startFakeBff({ users: { 'facial@test.local': { password: 'password', otpSecret: SECRET } } });
  });
  after(async () => {
    await bff.close();
    await closeLoginBrowser();
    await browser?.close();
    fs.rmSync(sessionDir, { recursive: true, force: true });
  });

  const env = () => ({
    API_AUTH_MODE: 'ui-session',
    FRONTEND_URL: bff.appBase,
    UI_LOGIN_PATH: '/auth/start',
    UI_SESSION_DIR: sessionDir,
    XSPEC_RUN_ID: 'ui-session-test',
    AUTH_PM_USERNAME: 'facial@test.local',
    AUTH_PM_PASSWORD: 'password',
    AUTH_PM_OTP_SECRET: SECRET,
    AUTH_OTP_ENCODING: 'latin1',
  });

  /** An API-only scenario: no browser of its own. */
  async function apiScenario() {
    const ctx = await pwRequest.newContext({ baseURL: bff.appBase });
    const api = new PlaywrightApiAdapter(ctx);
    const auth = new UniversalAuthAdapter({ api, ui: undefined as never, env: env(), apiBaseUrl: bff.appBase });
    const world = initWorld();
    try {
      await auth.apiLoginAs(world, 'pm');
      const me = await api.sendJson('GET', '/api/me', undefined, world.headers);
      return { status: me.status, world };
    } finally {
      await ctx.dispose();
    }
  }

  it('an API-only scenario logs in through a browser and calls the cookie-only API', async () => {
    const before = bff.stats.logins;
    const { status, world } = await apiScenario();
    assert.equal(status, 200);
    assert.match(world.headers.Cookie, /^app_sid=/);
    assert.equal(bff.stats.logins - before, 1);
  });

  it('later API scenarios and UI scenarios reuse the same session', async () => {
    const before = bff.stats.logins;
    assert.equal((await apiScenario()).status, 200);

    const context = await browser!.newContext({ baseURL: bff.appBase });
    const page = await context.newPage();
    try {
      const auth = new UniversalAuthAdapter({ api: undefined as never, ui: new PlaywrightUiAdapter(page), env: env() });
      await auth.uiLoginAs(initWorld(), 'pm', { reuseSession: true });
      await page.goto('/home');
      assert.equal(await page.locator('h1').innerText(), 'Welcome back');
    } finally {
      await context.close();
    }
    assert.equal(bff.stats.logins - before, 0, 'no new login');
  });

  it('a session the app has dropped is noticed without a browser and replaced', async () => {
    bff.logOutEveryone();
    const before = bff.stats.logins;
    assert.equal((await apiScenario()).status, 200);
    assert.equal(bff.stats.logins - before, 1);
  });

  it('"I use the API session in the browser": the cookies work in a page', async () => {
    const { world } = await apiScenario();
    const context = await browser!.newContext({ baseURL: bff.appBase });
    try {
      await context.addCookies(apiSessionCookies({ cookieHeader: world.headers.Cookie, apiBaseUrl: bff.appBase }));
      const page = await context.newPage();
      await page.goto('/home');
      assert.equal(await page.locator('h1').innerText(), 'Welcome back');
    } finally {
      await context.close();
    }
  });

  it('an API on another site gets a clear error', async () => {
    const ctx = await pwRequest.newContext({ baseURL: bff.appBase });
    try {
      const auth = new UniversalAuthAdapter({ api: new PlaywrightApiAdapter(ctx), ui: undefined as never, env: env(), apiBaseUrl: 'http://api.elsewhere.test' });
      await assert.rejects(auth.apiLoginAs(initWorld(), 'pm'), /no cookies for http:\/\/api\.elsewhere\.test[\s\S]*API_BASE_URL/);
    } finally {
      await ctx.dispose();
    }
  });
});

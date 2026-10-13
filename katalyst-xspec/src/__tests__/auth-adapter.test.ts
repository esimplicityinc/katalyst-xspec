import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium, request as pwRequest, type Browser, type APIRequestContext } from '@playwright/test';
import { PlaywrightApiAdapter } from '../adapters/api/playwright-api.adapter.js';
import { PlaywrightUiAdapter } from '../adapters/ui/playwright-ui.adapter.js';
import { UniversalAuthAdapter, clearUiSessions } from '../adapters/auth/universal-auth.adapter.js';
import { MissingCredentialsError } from '../auth/credentials.js';
import { initWorld } from '../world.js';

// ── A tiny app: API logins (form/json/cookie), a protected endpoint, and a
//    login page whose username field has a label but no placeholder. ────────
const USERS: Record<string, string> = { 'pm@x.com': 'pm-pass' };
let uiLoginPosts = 0;
// UI sessions the app still accepts; clearing it logs everyone out server-side.
const liveUiSessions = new Set<string>();

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c)).on('end', () => resolve(d));
  });
}
const sid = (req: http.IncomingMessage) => /sid=([^;]+)/.exec(req.headers.cookie || '')?.[1];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, 'http://x');
  const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { 'Content-Type': typeof body === 'string' ? 'text/html' : 'application/json', ...headers });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  };
  if (req.method === 'POST' && url.pathname === '/auth/login') {
    const f = new URLSearchParams(await readBody(req));
    return USERS[f.get('username')!] === f.get('password') ? send(200, { access_token: 'tok-form' }) : send(401, { error: 'bad creds' });
  }
  if (req.method === 'POST' && url.pathname === '/api/session') {
    const j = JSON.parse((await readBody(req)) || '{}');
    return USERS[j.email] === j.pass ? send(200, { data: { jwt: 'tok-json' } }) : send(401, { error: 'nope' });
  }
  if (req.method === 'POST' && url.pathname === '/cookie-login') {
    const f = new URLSearchParams(await readBody(req));
    return USERS[f.get('username')!] === f.get('password') ? send(204, '', { 'Set-Cookie': 'sid=api-session; Path=/' }) : send(401, '');
  }
  if (url.pathname === '/me') {
    const auth = req.headers.authorization;
    return auth?.startsWith('Bearer tok-') || sid(req) ? send(200, { ok: true, via: auth ? 'bearer' : 'cookie' }) : send(401, { error: 'unauthenticated' });
  }
  if (url.pathname === '/login' && req.method === 'GET') {
    return send(200, `<form method="post" action="/login">
      <label for="u">Email</label><input id="u" name="email">
      <input name="password" type="password" placeholder="Password">
      <button type="submit">Sign in</button></form>`);
  }
  if (url.pathname === '/login' && req.method === 'POST') {
    uiLoginPosts++;
    const f = new URLSearchParams(await readBody(req));
    if (USERS[f.get('email')!] !== f.get('password')) return send(303, '', { Location: '/login?error=1' });
    const id = `ui-session-${uiLoginPosts}`;
    liveUiSessions.add(id);
    return send(303, '', { Location: '/home', 'Set-Cookie': `sid=${id}; Path=/` });
  }
  if (url.pathname === '/home') {
    if (!liveUiSessions.has(sid(req) || '')) return send(303, '', { Location: '/login' });
    return send(200, `<h1>Welcome</h1><script>localStorage.setItem('prefs','dark')</script>`);
  }
  send(404, { error: 'not found' });
});

let base = '';
// Browser-backed tests skip (not fail) when Chromium isn't installed.
let browser: Browser | undefined;
let skipUi: string | false = false;
try {
  browser = await chromium.launch();
} catch (err) {
  skipUi = `chromium unavailable: ${(err as Error).message.split('\n')[0]}`;
}

before(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server.close(r));
});

const pmEnv = (extra: Record<string, string> = {}) => ({ AUTH_PM_USERNAME: 'pm@x.com', AUTH_PM_PASSWORD: 'pm-pass', ...extra });

async function apiSetup(env: Record<string, string | undefined>) {
  const ctx: APIRequestContext = await pwRequest.newContext({ baseURL: base });
  const api = new PlaywrightApiAdapter(ctx);
  const auth = new UniversalAuthAdapter({ api, ui: undefined as never, env });
  return { ctx, api, auth, world: initWorld() };
}

describe('UniversalAuthAdapter: API login', () => {
  it('form login (default) stores a bearer token for later API steps', async () => {
    const { ctx, api, auth, world } = await apiSetup(pmEnv());
    try {
      await auth.apiLoginAs(world, 'pm');
      assert.equal(world.headers.Authorization, 'Bearer tok-form');
      assert.equal((await api.sendJson('GET', '/me', undefined, world.headers)).status, 200);
    } finally {
      await ctx.dispose();
    }
  });

  it('JSON login with custom field names and token path', async () => {
    const env = pmEnv({ API_AUTH_LOGIN_PATH: '/api/session', API_AUTH_BODY: 'json', API_AUTH_USERNAME_FIELD: 'email', API_AUTH_PASSWORD_FIELD: 'pass', API_AUTH_TOKEN_PATH: 'data.jwt' });
    const { ctx, auth, world } = await apiSetup(env);
    try {
      await auth.apiLoginAs(world, 'pm');
      assert.equal(world.headers.Authorization, 'Bearer tok-json');
    } finally {
      await ctx.dispose();
    }
  });

  it('cookie session: no token needed, the request context keeps the cookie', async () => {
    const { ctx, api, auth, world } = await apiSetup(pmEnv({ API_AUTH_LOGIN_PATH: '/cookie-login' }));
    try {
      await auth.apiLoginAs(world, 'pm');
      assert.equal(world.headers.Authorization, undefined);
      const me = await api.sendJson('GET', '/me', undefined, world.headers);
      assert.deepEqual(me.json, { ok: true, via: 'cookie' });
    } finally {
      await ctx.dispose();
    }
  });

  it('wrong password fails with the status, the response and what to check', async () => {
    const { ctx, auth, world } = await apiSetup(pmEnv({ AUTH_PM_PASSWORD: 'wrong' }));
    try {
      await assert.rejects(auth.apiLoginAs(world, 'pm'), /returned 401[\s\S]*bad creds[\s\S]*AUTH_PM_USERNAME/);
    } finally {
      await ctx.dispose();
    }
  });

  it('missing credentials fail before any request, for named and legacy roles alike', async () => {
    const { ctx, auth, world } = await apiSetup({});
    try {
      await assert.rejects(auth.apiLoginAs(world, 'pm'), MissingCredentialsError);
      await assert.rejects(auth.apiLoginAsAdmin(world), /AUTH_ADMIN_USERNAME/);
    } finally {
      await ctx.dispose();
    }
  });

  it('roles can be supplied in code', async () => {
    const ctx = await pwRequest.newContext({ baseURL: base });
    try {
      const auth = new UniversalAuthAdapter({
        api: new PlaywrightApiAdapter(ctx),
        ui: undefined as never,
        env: {},
        roles: { pm: { username: 'pm@x.com', password: 'pm-pass' } },
      });
      const world = initWorld();
      await auth.apiLoginAs(world, 'pm');
      assert.equal(world.headers.Authorization, 'Bearer tok-form');
    } finally {
      await ctx.dispose();
    }
  });
});

describe('UniversalAuthAdapter: UI login', { skip: skipUi }, () => {
  const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-ui-sessions-'));
  const uiEnv = (extra: Record<string, string> = {}) =>
    pmEnv({ UI_USERNAME_FIELD: 'Email', UI_LOGIN_BUTTON: 'Sign in', UI_SESSION_DIR: sessionDir, XSPEC_RUN_ID: 'test-run', ...extra });
  beforeEach(() => {
    clearUiSessions({ env: uiEnv() });
    uiLoginPosts = 0;
  });
  after(() => fs.rmSync(sessionDir, { recursive: true, force: true }));

  async function uiSetup(env: Record<string, string>) {
    const context = await browser!.newContext({ baseURL: base });
    const page = await context.newPage();
    const ui = new PlaywrightUiAdapter(page);
    const auth = new UniversalAuthAdapter({ api: undefined as never, ui, env });
    return { context, page, auth, world: initWorld() };
  }

  it('fills fields found by label or placeholder and waits until it leaves the login page', async () => {
    const { context, page, auth, world } = await uiSetup(uiEnv());
    try {
      await auth.uiLoginAs(world, 'pm');
      assert.match(page.url(), /\/home$/);
    } finally {
      await context.close();
    }
  });

  it('wrong password fails clearly instead of continuing logged out', async () => {
    const { context, auth, world } = await uiSetup({ ...uiEnv(), AUTH_PM_PASSWORD: 'wrong', UI_LOGIN_TIMEOUT: '1500' });
    try {
      await assert.rejects(auth.uiLoginAs(world, 'pm'), /UI login as "pm" stayed on \/login[\s\S]*AUTH_PM_PASSWORD/);
    } finally {
      await context.close();
    }
  });

  it('a field that cannot be found names the setting to change', async () => {
    const { context, auth, world } = await uiSetup({ ...pmEnv(), UI_USERNAME_FIELD: 'Nope', UI_LOGIN_TIMEOUT: '1000' });
    try {
      await assert.rejects(auth.uiLoginAs(world, 'pm'), /No username field "Nope" on \/login[\s\S]*UI_USERNAME_FIELD/);
    } finally {
      await context.close();
    }
  });

  it('reuseSession logs in through the form once, then restores cookies and localStorage', async () => {
    const first = await uiSetup(uiEnv());
    try {
      await first.auth.uiLoginAs(first.world, 'pm', { reuseSession: true });
    } finally {
      await first.context.close();
    }
    const second = await uiSetup(uiEnv());
    try {
      await second.auth.uiLoginAs(second.world, 'pm', { reuseSession: true });
      await second.page.goto('/home');
      assert.match(second.page.url(), /\/home$/);
      assert.equal(await second.page.evaluate(() => localStorage.getItem('prefs')), 'dark');
      assert.equal(uiLoginPosts, 1, 'the login form should only be submitted once');
    } finally {
      await second.context.close();
    }
  });

  it('saves the session to UI_SESSION_DIR, readable only by the owner', async () => {
    const s = await uiSetup(uiEnv());
    try {
      await s.auth.uiLoginAs(s.world, 'pm', { reuseSession: true });
    } finally {
      await s.context.close();
    }
    const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith('.json'));
    assert.equal(files.length, 1);
    assert.match(files[0], /^pm-/);
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(sessionDir, files[0])).mode & 0o777, 0o600);
    assert.match(fs.readFileSync(path.join(sessionDir, files[0]), 'utf8'), /ui-session/);
  });

  it('several workers asking for the same role at once log in once', async () => {
    const workers = await Promise.all([1, 2, 3].map(() => uiSetup(uiEnv())));
    try {
      await Promise.all(workers.map((w) => w.auth.uiLoginAs(w.world, 'pm', { reuseSession: true })));
      assert.equal(uiLoginPosts, 1, 'the login form should only be submitted once');
      for (const w of workers) {
        await w.page.goto('/home');
        assert.match(w.page.url(), /\/home$/);
      }
    } finally {
      await Promise.all(workers.map((w) => w.context.close()));
    }
  });

  it('a new run logs in again (UI_SESSION_SCOPE=run); persistent scope reuses the earlier run', async () => {
    const login = async (env: Record<string, string>) => {
      const s = await uiSetup(env);
      try {
        await s.auth.uiLoginAs(s.world, 'pm', { reuseSession: true });
      } finally {
        await s.context.close();
      }
    };
    await login(uiEnv({ XSPEC_RUN_ID: 'run-a' }));
    await login(uiEnv({ XSPEC_RUN_ID: 'run-b' }));
    assert.equal(uiLoginPosts, 2);
    await login(uiEnv({ XSPEC_RUN_ID: 'run-c', UI_SESSION_SCOPE: 'persistent' }));
    assert.equal(uiLoginPosts, 2);
  });

  it('clearSavedSession makes the next login submit the form again', async () => {
    for (let i = 0; i < 2; i++) {
      const s = await uiSetup(uiEnv());
      try {
        await s.auth.uiLoginAs(s.world, 'pm', { reuseSession: true });
        if (i === 0) s.auth.clearSavedSession('pm');
      } finally {
        await s.context.close();
      }
    }
    assert.equal(uiLoginPosts, 2);
  });

  it('a failed login saves nothing and releases the lock', async () => {
    const s = await uiSetup(uiEnv({ AUTH_PM_PASSWORD: 'wrong', UI_LOGIN_TIMEOUT: '1000' }));
    try {
      await assert.rejects(s.auth.uiLoginAs(s.world, 'pm', { reuseSession: true }), /stayed on \/login/);
    } finally {
      await s.context.close();
    }
    assert.deepEqual(fs.readdirSync(sessionDir), []);
  });

  describe('expired sessions', () => {
    const login = async (env: Record<string, string>) => {
      const s = await uiSetup(env);
      try {
        await s.auth.uiLoginAs(s.world, 'pm', { reuseSession: true });
        return s.page.url();
      } finally {
        await s.context.close();
      }
    };

    it('a session the app has logged out is replaced by a fresh login', async () => {
      const env = uiEnv({ UI_SESSION_CHECK_PATH: '/home' });
      await login(env);
      liveUiSessions.clear();
      const url = await login(env);
      assert.equal(uiLoginPosts, 2, 'logged in again');
      assert.match(url, /\/home$/);
      // The new session was saved: the next scenario restores it without logging in.
      assert.match(await login(env), /\/home$/);
      assert.equal(uiLoginPosts, 2);
    });

    it('a valid session costs one page load and no login', async () => {
      const env = uiEnv({ UI_SESSION_CHECK_PATH: '/home' });
      await login(env);
      assert.match(await login(env), /\/home$/, 'left on the check page');
      assert.equal(uiLoginPosts, 1);
    });

    it('UI_LOGIN_SUCCESS_TEXT is used as the check when set', async () => {
      const env = uiEnv({ UI_SESSION_CHECK_PATH: '/home', UI_LOGIN_SUCCESS_TEXT: 'Welcome', UI_LOGIN_TIMEOUT: '1500' });
      await login(env);
      liveUiSessions.clear();
      await login(env);
      assert.equal(uiLoginPosts, 2);
    });

    it('UI_SESSION_CHECK=false restores without checking', async () => {
      const env = uiEnv({ UI_SESSION_CHECK_PATH: '/home', UI_SESSION_CHECK: 'false' });
      await login(env);
      liveUiSessions.clear();
      await login(env);
      assert.equal(uiLoginPosts, 1);
    });
  });

  it('without reuseSession every call submits the form', async () => {
    for (let i = 0; i < 2; i++) {
      const s = await uiSetup(uiEnv());
      try {
        await s.auth.uiLoginAs(s.world, 'pm');
      } finally {
        await s.context.close();
      }
    }
    assert.equal(uiLoginPosts, 2);
  });
});

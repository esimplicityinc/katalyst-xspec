import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginPageMatcher, loginUrlExcludes, sessionCheckSettings, sessionCookiesExpired } from '../auth/session-check.js';

describe('loginPageMatcher', () => {
  it("matches the app's login path, ignoring query and trailing slash", () => {
    const isLogin = loginPageMatcher({ UI_LOGIN_PATH: '/auth/login' });
    assert.ok(isLogin('http://app/auth/login'));
    assert.ok(isLogin('http://app/auth/login/?next=/home'));
    assert.ok(!isLogin('http://app/home'));
  });

  it('matches UI_LOGIN_SUCCESS_URL_EXCLUDES parts (comma-separated)', () => {
    const env = { UI_LOGIN_SUCCESS_URL_EXCLUDES: '/realms/, secure.login.gov' };
    assert.deepEqual(loginUrlExcludes(env), ['/realms/', 'secure.login.gov']);
    const isLogin = loginPageMatcher(env);
    assert.ok(isLogin('http://localhost:8080/realms/app/protocol/openid-connect/auth?x=1'));
    assert.ok(isLogin('https://secure.login.gov/'));
    assert.ok(!isLogin('http://app/dashboard'));
  });

  it('with FRONTEND_URL set, any other origin counts as the login (identity provider)', () => {
    const isLogin = loginPageMatcher({ FRONTEND_URL: 'https://app.example.gov' });
    assert.ok(isLogin('https://idp.example.gov/authorize'));
    assert.ok(!isLogin('https://app.example.gov/home'));
    assert.ok(!loginPageMatcher({})('https://idp.example.gov/authorize'), 'not without FRONTEND_URL');
  });
});

describe('sessionCookiesExpired', () => {
  const now = 1_000_000_000_000;
  const cookie = (name: string, domain: string, expires: number) => ({ name, value: 'v', domain, path: '/', expires });

  it("is true when one of the app's cookies has passed its expiry", () => {
    const state = { cookies: [cookie('sid', 'app.example.gov', now / 1000 - 1)], origins: [] };
    assert.ok(sessionCookiesExpired(state, { now, host: 'app.example.gov' }));
  });

  it('ignores session cookies (-1), future expiries and other sites', () => {
    const state = {
      cookies: [cookie('sid', 'app.example.gov', -1), cookie('keep', '.example.gov', now / 1000 + 60), cookie('ads', 'tracker.com', 1)],
      origins: [],
    };
    assert.ok(!sessionCookiesExpired(state, { now, host: 'app.example.gov' }));
    assert.ok(sessionCookiesExpired({ cookies: [cookie('c', '.example.gov', 1)], origins: [] }, { now, host: 'app.example.gov' }), 'parent-domain cookies count');
  });
});

describe('sessionCheckSettings', () => {
  it('defaults to checking "/" and reads the UI_* settings', () => {
    assert.deepEqual(sessionCheckSettings({}), { enabled: true, path: '/', text: undefined, timeoutMs: 10_000 });
    assert.deepEqual(
      sessionCheckSettings({ UI_SESSION_CHECK: 'false', UI_SESSION_CHECK_PATH: '/me', UI_LOGIN_SUCCESS_TEXT: 'Hi', UI_LOGIN_TIMEOUT: '3000' }),
      { enabled: false, path: '/me', text: 'Hi', timeoutMs: 3000 },
    );
  });
});

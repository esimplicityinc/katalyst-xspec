import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MissingCredentialsError, resolveCredentials, roleEnvKeys } from '../auth/credentials.js';
import { buildApiLoginRequest, extractToken, apiLoginErrorMessage } from '../auth/api-login.js';

describe('resolveCredentials', () => {
  it('reads AUTH_<ROLE>_USERNAME / _PASSWORD for any role name', () => {
    const env = { AUTH_PROJECT_MANAGER_USERNAME: 'pm@x.com', AUTH_PROJECT_MANAGER_PASSWORD: 'pw' };
    assert.deepEqual(resolveCredentials('project manager', { env }), { username: 'pm@x.com', password: 'pw' });
    assert.deepEqual(roleEnvKeys('project-manager'), { username: 'AUTH_PROJECT_MANAGER_USERNAME', password: 'AUTH_PROJECT_MANAGER_PASSWORD' });
  });

  it('roles passed in code win over env, matched case-insensitively', () => {
    const roles = { PM: { username: 'code-pm', password: 'c' } };
    const env = { AUTH_PM_USERNAME: 'env-pm', AUTH_PM_PASSWORD: 'e' };
    assert.deepEqual(resolveCredentials('pm', { env, roles }), { username: 'code-pm', password: 'c' });
  });

  it('admin and user still accept the older DEFAULT_* / NON_ADMIN_* names', () => {
    assert.deepEqual(resolveCredentials('admin', { env: { DEFAULT_ADMIN_EMAIL: 'a@x', DEFAULT_ADMIN_PASSWORD: 'p' } }), { username: 'a@x', password: 'p' });
    assert.deepEqual(resolveCredentials('user', { env: { NON_ADMIN_USERNAME: 'u', NON_ADMIN_PASSWORD: 'p' } }), { username: 'u', password: 'p' });
    // New names take precedence.
    assert.equal(resolveCredentials('admin', { env: { AUTH_ADMIN_USERNAME: 'new', AUTH_ADMIN_PASSWORD: 'p', DEFAULT_ADMIN_USERNAME: 'old' } }).username, 'new');
  });

  it('throws a clear error naming the variables to set', () => {
    assert.throws(
      () => resolveCredentials('pm', { env: { AUTH_PM_USERNAME: 'x' } }),
      (err: unknown) =>
        err instanceof MissingCredentialsError &&
        /No password for role "pm"/.test(err.message) &&
        /AUTH_PM_PASSWORD/.test(err.message),
    );
    assert.throws(() => resolveCredentials('admin', { env: {} }), /AUTH_ADMIN_USERNAME.*DEFAULT_ADMIN_USERNAME/s);
  });
});

describe('buildApiLoginRequest', () => {
  const creds = { username: 'ada', password: 'pw' };

  it('defaults to a form POST of username/password to /auth/login', () => {
    assert.deepEqual(buildApiLoginRequest(creds, {}), {
      path: '/auth/login',
      body: 'form',
      fields: { username: 'ada', password: 'pw' },
    });
  });

  it('is configurable: path, JSON body and field names', () => {
    const env = { API_AUTH_LOGIN_PATH: '/api/session', API_AUTH_BODY: 'json', API_AUTH_USERNAME_FIELD: 'email', API_AUTH_PASSWORD_FIELD: 'pass' };
    assert.deepEqual(buildApiLoginRequest(creds, env), { path: '/api/session', body: 'json', fields: { email: 'ada', pass: 'pw' } });
  });

  it('rejects an unknown body type', () => {
    assert.throws(() => buildApiLoginRequest(creds, { API_AUTH_BODY: 'xml' }), /API_AUTH_BODY must be "form" or "json"/);
  });
});

describe('extractToken', () => {
  it('finds common token fields by default', () => {
    assert.equal(extractToken({ access_token: 'a' }, {}), 'a');
    assert.equal(extractToken({ token: 't' }, {}), 't');
    assert.equal(extractToken({ accessToken: 'c' }, {}), 'c');
    assert.equal(extractToken({ data: { token: 'd' } }, {}), 'd');
    assert.equal(extractToken({ user: 'x' }, {}), undefined);
    assert.equal(extractToken(undefined, {}), undefined);
  });

  it('uses only API_AUTH_TOKEN_PATH when set', () => {
    assert.equal(extractToken({ result: { jwt: 'j' }, token: 'ignored' }, { API_AUTH_TOKEN_PATH: 'result.jwt' }), 'j');
    assert.equal(extractToken({ token: 't' }, { API_AUTH_TOKEN_PATH: 'result.jwt' }), undefined);
  });
});

describe('apiLoginErrorMessage', () => {
  it('explains the status and points at the settings', () => {
    const msg = apiLoginErrorMessage({ role: 'pm', path: '/auth/login', status: 401, text: '{"error":"bad creds"}' });
    assert.match(msg, /API login as "pm" failed: POST \/auth\/login returned 401/);
    assert.match(msg, /bad creds/);
    assert.match(msg, /AUTH_PM_USERNAME/);
    const noToken = apiLoginErrorMessage({ role: 'pm', path: '/auth/login', status: 200, text: '{"ok":true}', noToken: true });
    assert.match(noToken, /no token found/);
    assert.match(noToken, /API_AUTH_TOKEN_PATH/);
  });
});

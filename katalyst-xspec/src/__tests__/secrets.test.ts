import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { request as pwRequest } from '@playwright/test';
import {
  DEFAULT_SESSION_DIR,
  looksLikeJwt,
  looksSecretKey,
  maskValue,
  redactError,
  redactHeaders,
  redactSecrets,
  writeSecretFile,
} from '../auth/secrets.js';
import { PlaywrightApiAdapter } from '../adapters/api/playwright-api.adapter.js';

const PLAYWRIGHT_CALL_LOG = `apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:9
Call log:
\x1b[2m  - → GET http://127.0.0.1:9/x\x1b[22m
\x1b[2m    - accept: */*\x1b[22m
\x1b[2m    - Authorization: Bearer SECRET123\x1b[22m
\x1b[2m    - Cookie: sid=COOKIESECRET; other=2\x1b[22m
\x1b[2m    - DPoP: eyJhbGciOi.payload.sig\x1b[22m
`;

describe('redactSecrets', () => {
  it('hides header values in Playwright call logs', () => {
    const out = redactSecrets(PLAYWRIGHT_CALL_LOG, {});
    for (const secret of ['SECRET123', 'COOKIESECRET', 'eyJhbGciOi']) assert.ok(!out.includes(secret), `${secret} leaked:\n${out}`);
    assert.match(out, /Authorization: \[redacted\]/);
    assert.match(out, /Cookie: \[redacted\]\x1b\[22m/);
    assert.match(out, /accept: \*\/\*/);
    assert.match(out, /GET http:\/\/127\.0\.0\.1:9\/x/);
  });

  it('hides bearer, DPoP and basic credentials anywhere in the text', () => {
    assert.equal(redactSecrets('sent Bearer abc.def-123 to /me', {}), 'sent Bearer [redacted] to /me');
    assert.equal(redactSecrets('header was "Basic dXNlcjpwYXNz"', {}), 'header was "Basic [redacted]"');
    assert.equal(redactSecrets('use Basic authentication or a Bearer token', {}), 'use Basic authentication or a Bearer token');
  });

  it('is off with XSPEC_SHOW_SECRETS=true', () => {
    assert.equal(redactSecrets(PLAYWRIGHT_CALL_LOG, { XSPEC_SHOW_SECRETS: 'true' }), PLAYWRIGHT_CALL_LOG);
  });
});

describe('redactHeaders / redactError / maskValue', () => {
  it('replaces credential headers, case-insensitively', () => {
    const headers = { Authorization: 'Bearer x', cookie: 'sid=1', 'Set-Cookie': 'a=b', DPoP: 'p', 'X-Api-Key': 'k', Accept: 'application/json' };
    assert.deepEqual(redactHeaders(headers, {}), {
      Authorization: '[redacted]',
      cookie: '[redacted]',
      'Set-Cookie': '[redacted]',
      DPoP: '[redacted]',
      'X-Api-Key': '[redacted]',
      Accept: 'application/json',
    });
    assert.equal(headers.Authorization, 'Bearer x', 'the input is not modified');
  });

  it('redacts an error in place, keeping its type', () => {
    class PwError extends Error {}
    const err = redactError(new PwError('failed\n  - Authorization: Bearer SECRET123'), {});
    assert.ok(err instanceof PwError);
    assert.ok(!err.message.includes('SECRET123'));
    assert.ok(!err.stack!.includes('SECRET123'));
  });

  it('masks values and recognizes secret-looking keys and JWTs', () => {
    assert.equal(maskValue('abcdef', {}), '[redacted, 6 chars]');
    assert.equal(maskValue('abcdef', { XSPEC_SHOW_SECRETS: '1' }), 'abcdef');
    for (const k of ['access_token', 'oidc.user:issuer:client', 'authState', 'SESSION', 'apiKey']) assert.ok(looksSecretKey(k), k);
    for (const k of ['theme', 'locale', 'sidebarCollapsed']) assert.ok(!looksSecretKey(k), k);
    assert.ok(looksLikeJwt('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'));
    assert.ok(!looksLikeJwt('dark'));
  });
});

describe('writeSecretFile', () => {
  it('writes owner-only files in an owner-only directory, replacing atomically', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-secret-'));
    try {
      const file = path.join(root, DEFAULT_SESSION_DIR, 'pm.json');
      writeSecretFile(file, '{"a":1}');
      writeSecretFile(file, '{"a":2}');
      assert.equal(fs.readFileSync(file, 'utf8'), '{"a":2}');
      if (process.platform !== 'win32') {
        assert.equal(fs.statSync(file).mode & 0o777, 0o600);
        assert.equal(fs.statSync(path.dirname(file)).mode & 0o777, 0o700);
      }
      assert.deepEqual(fs.readdirSync(path.dirname(file)), ['pm.json'], 'no temporary files left behind');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('PlaywrightApiAdapter errors', () => {
  it("don't include the request's credentials", async () => {
    // A server that closes the connection without answering, so the request fails with a call log.
    const server = http.createServer((req) => req.socket.destroy());
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const ctx = await pwRequest.newContext({ baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}` });
    try {
      const api = new PlaywrightApiAdapter(ctx);
      await assert.rejects(
        api.sendJson('GET', '/me', undefined, { Authorization: 'Bearer SECRET123', Cookie: 'sid=COOKIESECRET' }),
        (err: Error) => !/SECRET123|COOKIESECRET/.test(err.message + err.stack) && /\[redacted\]/.test(err.message),
      );
      await assert.rejects(
        api.sendForm('POST', '/login', { a: 'b' }, { Cookie: 'sid=COOKIESECRET' }),
        (err: Error) => !/COOKIESECRET/.test(err.message + err.stack),
      );
    } finally {
      await ctx.dispose();
      server.close();
    }
  });
});

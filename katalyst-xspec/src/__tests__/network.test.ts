import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiRequestTarget } from '../network.js';

describe('resolveApiRequestTarget', () => {
  it('rewrites an http *.localhost URL to 127.0.0.1 and carries the original Host', () => {
    // macOS resolves *.localhost to ::1 first; a kind ingress bound on 0.0.0.0
    // (IPv4 only) resets those connections. Host keeps ingress routing working.
    assert.deepEqual(resolveApiRequestTarget('http://api.app.localhost:8080'), {
      baseURL: 'http://127.0.0.1:8080',
      extraHTTPHeaders: { Host: 'api.app.localhost:8080' },
    });
  });

  it('omits the port from Host when the URL uses the default port', () => {
    assert.deepEqual(resolveApiRequestTarget('http://app.localhost'), {
      baseURL: 'http://127.0.0.1',
      extraHTTPHeaders: { Host: 'app.localhost' },
    });
  });

  it('preserves the base path and its trailing-slash form', () => {
    assert.equal(resolveApiRequestTarget('http://app.localhost/api').baseURL, 'http://127.0.0.1/api');
    assert.equal(resolveApiRequestTarget('http://app.localhost/api/').baseURL, 'http://127.0.0.1/api/');
  });

  it('leaves bare localhost alone (dev servers often bind ::1 only)', () => {
    assert.deepEqual(resolveApiRequestTarget('http://localhost:3000'), { baseURL: 'http://localhost:3000' });
  });

  it('leaves https *.localhost alone (rewriting would break TLS SNI/cert matching)', () => {
    assert.deepEqual(resolveApiRequestTarget('https://app.localhost'), { baseURL: 'https://app.localhost' });
  });

  it('leaves non-localhost hosts alone', () => {
    assert.deepEqual(resolveApiRequestTarget('http://example.com'), { baseURL: 'http://example.com' });
    // Not a *.localhost subdomain, just ends with the same letters.
    assert.deepEqual(resolveApiRequestTarget('http://notlocalhost'), { baseURL: 'http://notlocalhost' });
  });

  it('returns unparseable input unchanged', () => {
    assert.deepEqual(resolveApiRequestTarget('not a url'), { baseURL: 'not a url' });
  });

  it('can be disabled with KATALYST_XSPEC_FORCE_IPV4=false', () => {
    assert.deepEqual(resolveApiRequestTarget('http://app.localhost', { KATALYST_XSPEC_FORCE_IPV4: 'false' }), {
      baseURL: 'http://app.localhost',
    });
  });

  it('still honours the legacy STACK_TESTS_FORCE_IPV4 name', () => {
    assert.deepEqual(resolveApiRequestTarget('http://app.localhost', { STACK_TESTS_FORCE_IPV4: '0' }), {
      baseURL: 'http://app.localhost',
    });
  });
});

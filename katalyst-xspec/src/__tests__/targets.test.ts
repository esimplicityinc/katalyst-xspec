import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatTargets, resolveApiBaseUrl, resolveTargets, shouldLogTargets } from '../targets.js';

describe('resolveApiBaseUrl', () => {
  const base = { projectName: 'ui', projectBaseURL: 'https://app.example.com' };

  it('API_BASE_URL wins', () => {
    assert.equal(resolveApiBaseUrl({ ...base, env: { API_BASE_URL: 'https://api.example.com' } }), 'https://api.example.com');
  });

  it('TARGET_BASE_URL is the legacy alias', () => {
    assert.equal(resolveApiBaseUrl({ ...base, env: { TARGET_BASE_URL: 'https://t.example.com' } }), 'https://t.example.com');
  });

  it('falls back to the project baseURL in ANY project, so mixed API+UI scenarios hit the app', () => {
    assert.equal(resolveApiBaseUrl({ ...base, env: {} }), 'https://app.example.com');
  });

  it('keeps TARGET_PORT ahead of a non-api project baseURL (pre-0.8 behaviour)', () => {
    assert.equal(resolveApiBaseUrl({ ...base, env: { TARGET_PORT: '4000' } }), 'http://localhost:4000');
  });

  it('an api project baseURL still beats TARGET_PORT (pre-0.8 behaviour)', () => {
    assert.equal(
      resolveApiBaseUrl({ projectName: 'api', projectBaseURL: 'https://api.local', env: { TARGET_PORT: '4000' } }),
      'https://api.local',
    );
  });

  it('defaults to localhost:3000', () => {
    assert.equal(resolveApiBaseUrl({ projectName: 'x', env: {} }), 'http://localhost:3000');
  });
});

describe('resolveTargets', () => {
  it('reports values and where they came from', () => {
    assert.deepEqual(resolveTargets({ FRONTEND_URL: 'https://app.example.com', API_BASE_URL: 'https://api.example.com' }), {
      frontendUrl: 'https://app.example.com',
      frontendSource: 'FRONTEND_URL',
      apiBaseUrl: 'https://api.example.com',
      apiSource: 'API_BASE_URL',
    });
  });

  it('BASE_URL is the legacy alias for FRONTEND_URL; API falls back to the frontend', () => {
    assert.deepEqual(resolveTargets({ BASE_URL: 'https://b.example.com' }), {
      frontendUrl: 'https://b.example.com',
      frontendSource: 'BASE_URL',
      apiBaseUrl: 'https://b.example.com',
      apiSource: 'FRONTEND_URL',
    });
  });

  it('defaults both to localhost:3000', () => {
    assert.deepEqual(resolveTargets({}), {
      frontendUrl: 'http://localhost:3000',
      frontendSource: 'default',
      apiBaseUrl: 'http://localhost:3000',
      apiSource: 'default',
    });
  });

  it('formats a one-line summary', () => {
    assert.equal(
      formatTargets(resolveTargets({ FRONTEND_URL: 'https://app.example.com' })),
      'katalyst-xspec targets: UI https://app.example.com (FRONTEND_URL) | API https://app.example.com (FRONTEND_URL)',
    );
  });
});

describe('shouldLogTargets', () => {
  it('logs in the main playwright process only', () => {
    assert.equal(shouldLogTargets({}, ['node', '/x/playwright', 'test']), true);
    assert.equal(shouldLogTargets({ TEST_WORKER_INDEX: '0' }, ['node', '/x/playwright', 'test']), false);
    assert.equal(shouldLogTargets({}, ['node', '/x/.bin/bddgen']), false);
    assert.equal(shouldLogTargets({ KATALYST_XSPEC_QUIET: 'true' }, ['node', '/x/playwright', 'test']), false);
  });
});

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkers, getCpuCount } from '../workers.js';

// Save original env to restore after each test
const originalEnv = { ...process.env };

function cleanWorkerEnv() {
  delete process.env.WORKERS;
  delete process.env.CI;
}

describe('resolveWorkers', () => {
  beforeEach(() => {
    cleanWorkerEnv();
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('default behavior (no env vars, no options)', () => {
    it('returns undefined to let Playwright decide', () => {
      const result = resolveWorkers();
      assert.equal(result, undefined);
    });
  });

  describe('WORKERS environment variable', () => {
    it('returns explicit number when WORKERS is set to a positive integer', () => {
      process.env.WORKERS = '4';
      assert.equal(resolveWorkers(), 4);
    });

    it('returns 1 when WORKERS is set to "1"', () => {
      process.env.WORKERS = '1';
      assert.equal(resolveWorkers(), 1);
    });

    it('treats WORKERS=auto same as unset (returns undefined)', () => {
      process.env.WORKERS = 'auto';
      assert.equal(resolveWorkers(), undefined);
    });

    it('treats WORKERS=AUTO (case-insensitive) same as unset', () => {
      process.env.WORKERS = 'AUTO';
      assert.equal(resolveWorkers(), undefined);
    });

    it('treats WORKERS=Auto (mixed case) same as unset', () => {
      process.env.WORKERS = 'Auto';
      assert.equal(resolveWorkers(), undefined);
    });

    it('ignores invalid WORKERS value and falls through to defaults', () => {
      process.env.WORKERS = 'foo';
      assert.equal(resolveWorkers(), undefined);
    });

    it('ignores negative WORKERS value', () => {
      process.env.WORKERS = '-2';
      assert.equal(resolveWorkers(), undefined);
    });

    it('ignores zero WORKERS value', () => {
      process.env.WORKERS = '0';
      assert.equal(resolveWorkers(), undefined);
    });

    it('ignores empty string WORKERS', () => {
      process.env.WORKERS = '';
      assert.equal(resolveWorkers(), undefined);
    });

    it('trims whitespace from WORKERS value', () => {
      process.env.WORKERS = '  8  ';
      assert.equal(resolveWorkers(), 8);
    });
  });

  describe('CI environment', () => {
    it('returns 1 when CI is set and WORKERS is not', () => {
      process.env.CI = 'true';
      assert.equal(resolveWorkers(), 1);
    });

    it('returns 1 when CI is any truthy string', () => {
      process.env.CI = '1';
      assert.equal(resolveWorkers(), 1);
    });

    it('respects explicit WORKERS even in CI', () => {
      process.env.CI = 'true';
      process.env.WORKERS = '8';
      assert.equal(resolveWorkers(), 8);
    });

    it('uses ciWorkers option to override CI default', () => {
      process.env.CI = 'true';
      assert.equal(resolveWorkers({ ciWorkers: 2 }), 2);
    });

    it('treats WORKERS=auto in CI as unset (falls through to ciWorkers)', () => {
      process.env.CI = 'true';
      process.env.WORKERS = 'auto';
      assert.equal(resolveWorkers(), 1);
    });
  });

  describe('testType: tui', () => {
    it('always returns 1 for TUI tests', () => {
      assert.equal(resolveWorkers({ testType: 'tui' }), 1);
    });

    it('returns 1 for TUI even when WORKERS is set to a higher number', () => {
      process.env.WORKERS = '8';
      assert.equal(resolveWorkers({ testType: 'tui' }), 1);
    });

    it('returns 1 for TUI even in CI with custom ciWorkers', () => {
      process.env.CI = 'true';
      assert.equal(resolveWorkers({ testType: 'tui', ciWorkers: 4 }), 1);
    });
  });

  describe('testType: non-tui types', () => {
    it('does not force workers for api testType', () => {
      assert.equal(resolveWorkers({ testType: 'api' }), undefined);
    });

    it('does not force workers for ui testType', () => {
      assert.equal(resolveWorkers({ testType: 'ui' }), undefined);
    });

    it('does not force workers for hybrid testType', () => {
      assert.equal(resolveWorkers({ testType: 'hybrid' }), undefined);
    });
  });

  describe('defaultWorkers option', () => {
    it('uses defaultWorkers when no env vars are set', () => {
      assert.equal(resolveWorkers({ defaultWorkers: 6 }), 6);
    });

    it('WORKERS env takes precedence over defaultWorkers', () => {
      process.env.WORKERS = '3';
      assert.equal(resolveWorkers({ defaultWorkers: 6 }), 3);
    });

    it('CI takes precedence over defaultWorkers', () => {
      process.env.CI = 'true';
      assert.equal(resolveWorkers({ defaultWorkers: 6 }), 1);
    });
  });

  describe('combined scenarios', () => {
    it('WORKERS env overrides CI default', () => {
      process.env.CI = 'true';
      process.env.WORKERS = '4';
      assert.equal(resolveWorkers({ ciWorkers: 2, defaultWorkers: 6 }), 4);
    });

    it('TUI overrides everything', () => {
      process.env.CI = 'true';
      process.env.WORKERS = '4';
      assert.equal(resolveWorkers({ testType: 'tui', ciWorkers: 2, defaultWorkers: 6 }), 1);
    });
  });
});

describe('getCpuCount', () => {
  it('returns a positive integer', () => {
    const count = getCpuCount();
    assert.equal(typeof count, 'number');
    assert.ok(count > 0, `Expected CPU count > 0, got ${count}`);
    assert.equal(count, Math.floor(count), 'CPU count should be an integer');
  });
});

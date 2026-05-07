import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFeatures, resolveSteps, resolveBddPaths } from '../paths.js';

const originalEnv = { ...process.env };

function cleanPathEnv() {
  delete process.env.FEATURES_DIR;
  delete process.env.CUSTOM_STEPS_DIR;
}

describe('resolveFeatures', () => {
  beforeEach(() => { cleanPathEnv(); });
  afterEach(() => { process.env = { ...originalEnv }; });

  describe('default behavior (no env var)', () => {
    it('returns "features" by default', () => {
      assert.equal(resolveFeatures(), 'features');
    });

    it('respects custom defaultDir', () => {
      assert.equal(resolveFeatures({ defaultDir: 'tests/features' }), 'tests/features');
    });
  });

  describe('FEATURES_DIR environment variable', () => {
    it('returns env var value when set', () => {
      process.env.FEATURES_DIR = '../../claims-api/tests/features';
      assert.equal(resolveFeatures(), '../../claims-api/tests/features');
    });

    it('trims whitespace from env var', () => {
      process.env.FEATURES_DIR = '  my/features  ';
      assert.equal(resolveFeatures(), 'my/features');
    });

    it('overrides defaultDir when env var is set', () => {
      process.env.FEATURES_DIR = '/absolute/path';
      assert.equal(resolveFeatures({ defaultDir: 'ignored' }), '/absolute/path');
    });

    it('falls back to default when env var is empty string', () => {
      process.env.FEATURES_DIR = '   ';
      assert.equal(resolveFeatures(), 'features');
    });
  });
});

describe('resolveSteps', () => {
  beforeEach(() => { cleanPathEnv(); });
  afterEach(() => { process.env = { ...originalEnv }; });

  describe('default behavior (no env var)', () => {
    it('returns "features/steps" by default', () => {
      assert.equal(resolveSteps(), 'features/steps');
    });

    it('respects custom defaultDir', () => {
      assert.equal(resolveSteps({ defaultDir: 'src/steps' }), 'src/steps');
    });
  });

  describe('CUSTOM_STEPS_DIR environment variable', () => {
    it('returns env var value when set', () => {
      process.env.CUSTOM_STEPS_DIR = 'custom/steps';
      assert.equal(resolveSteps(), 'custom/steps');
    });

    it('trims whitespace', () => {
      process.env.CUSTOM_STEPS_DIR = '  steps/  ';
      assert.equal(resolveSteps(), 'steps/');
    });

    it('falls back to default when env var is empty', () => {
      process.env.CUSTOM_STEPS_DIR = '';
      assert.equal(resolveSteps(), 'features/steps');
    });
  });
});

describe('resolveBddPaths', () => {
  beforeEach(() => { cleanPathEnv(); });
  afterEach(() => { process.env = { ...originalEnv }; });

  it('returns glob patterns with defaults', () => {
    const { features, steps } = resolveBddPaths();
    assert.equal(features, 'features/**/*.feature');
    assert.equal(steps, 'features/steps/**/*.ts');
  });

  it('scopes features by tag', () => {
    const { features, steps } = resolveBddPaths({ tag: 'api' });
    assert.equal(features, 'features/api/**/*.feature');
    assert.equal(steps, 'features/steps/**/*.ts');
  });

  it('respects FEATURES_DIR env var', () => {
    process.env.FEATURES_DIR = 'src/tests';
    const { features, steps } = resolveBddPaths({ tag: 'ui' });
    assert.equal(features, 'src/tests/ui/**/*.feature');
    assert.equal(steps, 'features/steps/**/*.ts');
  });

  it('respects CUSTOM_STEPS_DIR env var', () => {
    process.env.CUSTOM_STEPS_DIR = 'my-steps';
    const { features, steps } = resolveBddPaths();
    assert.equal(features, 'features/**/*.feature');
    assert.equal(steps, 'my-steps/**/*.ts');
  });

  it('respects both env vars', () => {
    process.env.FEATURES_DIR = '/abs/features';
    process.env.CUSTOM_STEPS_DIR = '/abs/steps';
    const { features, steps } = resolveBddPaths({ tag: 'api' });
    assert.equal(features, '/abs/features/api/**/*.feature');
    assert.equal(steps, '/abs/steps/**/*.ts');
  });
});

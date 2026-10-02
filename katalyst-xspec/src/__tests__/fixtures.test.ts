import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBddTest } from '../fixtures.js';

describe('createBddTest', () => {
  it('returns an object with `test` and `expect` (not a bare function)', () => {
    // Regression: createBddTest previously returned the bare Playwright test
    // function, but the documented/scaffolded usage is
    //   export const { test, expect } = createBddTest(...)
    // Destructuring `.test`/`.expect` off a function yields undefined, so
    // registerXSteps(test) registered steps on `undefined`/the base test and
    // playwright-bdd's codegen imported the base test (missing api/ui/world
    // fixtures), failing at runtime with `unknown parameter "ui"/"world"`.
    const result = createBddTest();
    assert.equal(typeof result, 'object', 'createBddTest must return an object');
    assert.notEqual(result.test, undefined, 'result.test must be defined');
    assert.notEqual(result.expect, undefined, 'result.expect must be defined');
  });

  it('returns a Playwright test that extends the playwright-bdd base (carries BDD fixtures)', () => {
    const { test } = createBddTest();
    // An extended Playwright test exposes `.extend` and `.describe`.
    assert.equal(typeof test.extend, 'function', 'test must be a Playwright test instance');
    assert.equal(typeof test.describe, 'function', 'test must expose describe');
  });
});

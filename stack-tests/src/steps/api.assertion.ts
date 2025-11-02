import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { parseExpected, selectPath } from '../utils';

export function registerApiAssertionSteps(test: any): void {
  const { Then } = createBdd(test as any) as any;

  Then('the response status should be {int}', { tags: '@api' }, async ({ world }: any, code: number) => {
    expect(world.lastStatus, `Unexpected status. Body: ${world.lastText}`).toBe(code);
  });

  Then('the response should be a JSON array', { tags: '@api' }, async ({ world }: any) => {
    expect(Array.isArray(world.lastJson), `Expected JSON array. Body: ${world.lastText}`).toBe(true);
  });

  Then('the response should be a JSON object', { tags: '@api' }, async ({ world }: any) => {
    const v = world.lastJson as any;
    expect(v !== null && typeof v === 'object' && !Array.isArray(v), `Expected JSON object. Body: ${world.lastText}`).toBe(true);
  });

  Then('the value at {string} should equal {string}', { tags: '@api' }, async ({ world }: any, path: string, expectedRaw: string) => {
    const actual = selectPath(world.lastJson, path);
    const expected = parseExpected(expectedRaw, world);
    expect(actual).toEqual(expected);
  });

  Then('I store the value at {string} as {string}', { tags: '@api' }, async ({ world, cleanup }: any, path: string, varName: string) => {
    const val = selectPath(world.lastJson, path);
    world.vars[varName] = String(val);
    cleanup.registerFromVar(world, varName, val, world.lastJson);
  });
}

import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { apiLoginAsRole } from '../auth/login-steps';
import { parseExpected, selectPath } from '../utils';
import type { World } from '../world';

function idTokenClaims(world: World): Record<string, unknown> {
  if (!world.idTokenClaims) {
    throw new Error(
      'No ID token claims: log in with API_AUTH_MODE=oidc first, with OIDC_ISSUER set (ID tokens are only accepted when they ' +
        'can be validated) and "openid" in OIDC_SCOPE.',
    );
  }
  return world.idTokenClaims;
}

export function registerApiAuthSteps(test: any): void {
  const { Given, Then } = createBdd(test as any) as any;

  // Any role: reads AUTH_<ROLE>_USERNAME / AUTH_<ROLE>_PASSWORD.
  Given('I am authenticated as {string} via API', async ({ auth, world }: any, role: string) => {
    await apiLoginAsRole(auth, world, role);
  });

  Given('I am authenticated as an admin via API', async ({ auth, world }: any) => {
    await apiLoginAsRole(auth, world, 'admin');
  });

  Given('I am authenticated as a user via API', async ({ auth, world }: any) => {
    await apiLoginAsRole(auth, world, 'user');
  });

  Given('I set bearer token from variable {string}', async ({ auth, world }: any, varName: string) => {
    const token = world.vars[varName];
    if (!token) throw new Error(`No token found in variable '${varName}'`);
    auth.apiSetBearer(world, token);
  });

  Then('the ID token claim {string} should equal {string}', async ({ world }: any, path: string, expectedRaw: string) => {
    const actual = selectPath(idTokenClaims(world), path);
    expect(actual, `ID token claim "${path}"`).toEqual(parseExpected(expectedRaw, world));
  });

  Then('I store the ID token claim {string} as {string}', async ({ world }: any, path: string, varName: string) => {
    const value = selectPath(idTokenClaims(world), path);
    if (value === undefined) throw new Error(`The ID token has no "${path}" claim.`);
    world.vars[varName] = typeof value === 'string' ? value : JSON.stringify(value);
  });
}

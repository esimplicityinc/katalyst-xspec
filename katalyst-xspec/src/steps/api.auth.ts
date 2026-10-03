import { createBdd } from 'playwright-bdd';
import { apiLoginAsRole } from '../auth/login-steps';

export function registerApiAuthSteps(test: any): void {
  const { Given } = createBdd(test as any) as any;

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
}

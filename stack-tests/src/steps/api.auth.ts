import { createBdd } from 'playwright-bdd';

export function registerApiAuthSteps(test: any): void {
  const { Given } = createBdd(test as any) as any;

  Given('I am authenticated as an admin via API', { tags: '@api' }, async ({ auth, world }: any) => {
    await auth.apiLoginAsAdmin(world);
  });

  Given('I am authenticated as a user via API', { tags: '@api' }, async ({ auth, world }: any) => {
    await auth.apiLoginAsUser(world);
  });

  Given('I set bearer token from variable {string}', { tags: '@api' }, async ({ auth, world }: any, varName: string) => {
    const token = world.vars[varName];
    if (!token) throw new Error(`No token found in variable '${varName}'`);
    auth.apiSetBearer(world, token);
  });
}

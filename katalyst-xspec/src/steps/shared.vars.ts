import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';

export function registerSharedVarSteps(test: any): void {
  const { Given } = createBdd(test as any) as any;

  Given('I set variable {string} to {string}', async ({ world }: any, name: string, value: string) => {
    world.vars[name] = value;
  });

  Given('I generate a UUID and store as {string}', async ({ world }: any, name: string) => {
    world.vars[name] = randomUUID();
  });

  Given('I set header {string} to {string}', async ({ world }: any, header: string, value: string) => {
    world.headers = { ...(world.headers || {}), [header]: value };
  });

  Given('I disable cleanup', async ({ world }: any) => {
    world.skipCleanup = true;
  });
}

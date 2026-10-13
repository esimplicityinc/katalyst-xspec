import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';
import { oneTimeCodeForRole } from '../auth/login-steps';

export function registerSharedVarSteps(test: any): void {
  const { Given } = createBdd(test as any) as any;

  Given('I set variable {string} to {string}', async ({ world }: any, name: string, value: string) => {
    world.vars[name] = value;
  });

  Given('I generate a UUID and store as {string}', async ({ world }: any, name: string) => {
    world.vars[name] = randomUUID();
  });

  // The role's current one-time code from its TOTP secret (AUTH_<ROLE>_OTP_SECRET).
  Given('I generate a one-time code for {string} as {string}', async ({ auth, world }: any, role: string, name: string) => {
    world.vars[name] = await oneTimeCodeForRole(auth, world, role);
  });

  Given('I set header {string} to {string}', async ({ world }: any, header: string, value: string) => {
    world.headers = { ...(world.headers || {}), [header]: value };
  });

  Given('I disable cleanup', async ({ world }: any) => {
    world.skipCleanup = true;
  });
}

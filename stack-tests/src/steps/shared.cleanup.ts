import { createBdd } from 'playwright-bdd';
import { interpolate, registerCleanup } from '../utils';

export function registerSharedCleanupSteps(test: any): void {
  const { Given } = createBdd(test as any) as any;

  Given('I register cleanup DELETE {string}', async ({ world }: any, pathTemplate: string) => {
    registerCleanup(world, { method: 'DELETE', path: interpolate(pathTemplate, world.vars) });
  });

  Given('I register cleanup POST {string}', async ({ world }: any, pathTemplate: string) => {
    registerCleanup(world, { method: 'POST', path: interpolate(pathTemplate, world.vars) });
  });

  Given('I register cleanup PATCH {string}', async ({ world }: any, pathTemplate: string) => {
    registerCleanup(world, { method: 'PATCH', path: interpolate(pathTemplate, world.vars) });
  });

  Given('I register cleanup PUT {string}', async ({ world }: any, pathTemplate: string) => {
    registerCleanup(world, { method: 'PUT', path: interpolate(pathTemplate, world.vars) });
  });
}

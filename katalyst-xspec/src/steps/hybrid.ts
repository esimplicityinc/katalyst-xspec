import { createBdd } from 'playwright-bdd';
import { interpolate } from '../utils';

export function registerHybridSteps(test: any): void {
  const { Given } = createBdd(test as any) as any;

  Given('I navigate to interpolated path {string}', async ({ ui, world }: any, path: string) => {
    await ui.goto(interpolate(path, world.vars));
  });
}

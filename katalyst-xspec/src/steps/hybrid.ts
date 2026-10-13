import { createBdd } from 'playwright-bdd';
import { interpolate } from '../utils';
import { apiSessionCookies } from '../auth/ui-session';

export function registerHybridSteps(test: any): void {
  const { Given } = createBdd(test as any) as any;

  Given('I navigate to interpolated path {string}', async ({ ui, world }: any, path: string) => {
    await ui.goto(interpolate(path, world.vars));
  });

  // After an API login that set a session cookie: the browser gets the same session.
  Given('I use the API session in the browser', async ({ apiRequest, apiBaseUrl, page, world }: any) => {
    const headers = world.headers || {};
    const cookieHeader = Object.entries(headers).find(([k]) => k.toLowerCase() === 'cookie')?.[1] as string | undefined;
    const { cookies: jar } = await apiRequest.storageState();
    const cookies = apiSessionCookies({ jar, cookieHeader, apiBaseUrl });
    if (!cookies.length) {
      throw new Error(
        'No API session to use in the browser: log in first with `Given I am authenticated as "<role>" via API` ' +
          '(a login that sets a session cookie, or API_AUTH_MODE=ui-session). A bearer token can\'t be moved to the browser; ' +
          'use `Given I am authenticated in UI with bearer token "..."` for that.',
      );
    }
    await page.context().addCookies(cookies);
  });
}

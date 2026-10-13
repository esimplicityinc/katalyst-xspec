/**
 * Logging roles in before the run, with a Playwright setup project. The
 * sessions are saved where `I am logged in as` and API_AUTH_MODE=ui-session
 * look for them, so scenarios start logged in.
 *
 *   // tests/auth.setup.ts
 *   import { createAuthSetup } from '@esimplicitylabs/katalyst-xspec';
 *   createAuthSetup({ roles: ['applicant', 'admin'] });
 *
 *   // playwright.config.ts
 *   projects: [
 *     { name: 'auth-setup', testMatch: /auth\.setup\.ts/ },
 *     { ...uiBdd, dependencies: ['auth-setup'] },
 *   ]
 */
import { test as playwrightTest, type APIRequestContext, type Page } from '@playwright/test';
import type { AuthPort } from '../ports/auth.port';
import type { ApiPort } from '../ports/api.port';
import type { UiPort } from '../ports/ui.port';
import { PlaywrightApiAdapter } from '../adapters/api/playwright-api.adapter';
import { PlaywrightUiAdapter } from '../adapters/ui/playwright-ui.adapter';
import { UniversalAuthAdapter } from '../adapters/auth/universal-auth.adapter';
import { initWorld } from '../world';

type Env = Record<string, string | undefined>;

type SetupTest = (title: string, body: (args: { page: Page; request: APIRequestContext }) => Promise<void>) => void;

export type AuthSetupOptions = {
  /** Roles to log in, e.g. ['applicant', 'admin']. */
  roles: string[];
  /** Log in even if a usable session is already saved. Default false. */
  fresh?: boolean;
  /** Your auth adapter, if you use a custom one (the same as createAuth in createBddTest). */
  createAuth?: (ctx: { api: ApiPort; ui: UiPort; apiBaseUrl?: string }) => AuthPort;
  env?: Env;
  /** The Playwright `test` to register with. Default: @playwright/test's. */
  test?: SetupTest;
};

/** Register one setup test per role that logs it in and saves its session. */
export function createAuthSetup({ roles, fresh = false, createAuth, env = process.env, test }: AuthSetupOptions): void {
  if (!roles.length) throw new Error('createAuthSetup: pass at least one role, e.g. { roles: ["admin"] }.');
  const register: SetupTest = test ?? (playwrightTest as unknown as SetupTest);
  for (const role of roles) {
    register(`log in as ${role}`, async ({ page, request }) => {
      const api = new PlaywrightApiAdapter(request);
      const ui = new PlaywrightUiAdapter(page);
      const auth = createAuth ? createAuth({ api, ui }) : new UniversalAuthAdapter({ api, ui, env });
      if (!auth.uiLoginAs) throw new Error("createAuthSetup: the auth adapter doesn't implement uiLoginAs(world, role, options).");
      if (fresh) auth.clearSavedSession?.(role);
      await auth.uiLoginAs(initWorld(), role, { reuseSession: true });
    });
  }
}

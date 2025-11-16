import { test as base } from 'playwright-bdd';
import type { APIRequestContext, Page, PlaywrightTestArgs, PlaywrightWorkerArgs } from '@playwright/test';
import { initWorld, type World } from './world';
import type { ApiPort } from './ports/api.port';
import type { UiPort } from './ports/ui.port';
import type { AuthPort } from './ports/auth.port';
import type { CleanupPort } from './ports/cleanup.port';
import type { TuiPort, TuiConfig } from './ports/tui.port';
import { PlaywrightApiAdapter } from './adapters/api/playwright-api.adapter';
import { PlaywrightUiAdapter } from './adapters/ui/playwright-ui.adapter';
import { UniversalAuthAdapter } from './adapters/auth/universal-auth.adapter';
import { DefaultCleanupAdapter } from './adapters/cleanup/default-cleanup.adapter';

let cachedAdminToken: string | undefined;

async function getAdminHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  if (cachedAdminToken) return { Authorization: `Bearer ${cachedAdminToken}` };

  const username = process.env.DEFAULT_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_EMAIL || 'admin@prima.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin1234';
  const loginPath = process.env.API_AUTH_LOGIN_PATH || '/auth/login';

  const body = new URLSearchParams({ username, password }).toString();
  const resp = await request.post(loginPath, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    data: body,
  });

  if (!resp.ok()) {
    console.warn(`cleanup auth failed: ${resp.status()} ${resp.statusText()}`);
    cachedAdminToken = undefined;
    return {};
  }

  const json = (await resp.json()) as any;
  const token = json?.access_token;
  if (typeof token === 'string' && token) {
    cachedAdminToken = token;
    return { Authorization: `Bearer ${token}` };
  }

  console.warn('cleanup auth missing access_token in response');
  cachedAdminToken = undefined;
  return {};
}

type CreateContext = PlaywrightTestArgs & PlaywrightWorkerArgs & { apiRequest: APIRequestContext; page: Page };

/**
 * Factory function type for creating a TUI adapter.
 * Returns undefined if TUI testing is not configured.
 */
export type TuiFactory = () => TuiPort | undefined;

export type CreateBddTestOptions = {
  createApi?: (ctx: CreateContext) => ApiPort;
  createUi?: (ctx: CreateContext) => UiPort;
  createAuth?: (ctx: CreateContext & { api: ApiPort; ui: UiPort }) => AuthPort;
  createCleanup?: (ctx: CreateContext) => CleanupPort;
  /**
   * Factory function for creating a TUI adapter.
   * Unlike other adapters, this is a simple factory that doesn't receive context,
   * as TUI testing operates independently of Playwright's browser context.
   *
   * @example
   * ```typescript
   * createTui: () => new TuiTesterAdapter({
   *   command: ['node', 'dist/cli.js'],
   *   size: { cols: 100, rows: 30 },
   * }),
   * ```
   */
  createTui?: TuiFactory;
  worldFactory?: () => World;
};

export function createBddTest(options: CreateBddTestOptions = {}) {
  const {
    createApi = ({ apiRequest }) => new PlaywrightApiAdapter(apiRequest),
    createUi = ({ page }) => new PlaywrightUiAdapter(page),
    createAuth = ({ api, ui }) => new UniversalAuthAdapter({ api, ui }),
    createCleanup = () => new DefaultCleanupAdapter(),
    createTui,
    worldFactory = initWorld,
  } = options;

  return base.extend<{
    world: World;
    api: ApiPort;
    ui: UiPort;
    auth: AuthPort;
    cleanup: CleanupPort;
    tui: TuiPort | undefined;
    apiRequest: APIRequestContext;
  }>({
    world: async ({ apiRequest }, use) => {
      const w = worldFactory();
      await use(w);

      if (w.skipCleanup) return;
      if (!w.cleanup.length) return;

      for (const item of [...w.cleanup].reverse()) {
        const adminHeaders = await getAdminHeaders(apiRequest);
        const headers = { ...adminHeaders, ...(item.headers || {}) };
        try {
          const resp = await apiRequest.fetch(item.path, {
            method: item.method,
            headers,
          });
          const status = resp.status();
          if (status === 401 || status === 403) {
            cachedAdminToken = undefined;
            console.warn(`cleanup auth expired (${status}) for ${item.method} ${item.path}`);
            continue;
          }
          if (status >= 400 && status !== 404) {
            console.warn(`cleanup ${item.method} ${item.path} failed`, status);
          }
        } catch (err) {
          console.warn('cleanup error', item.method, item.path, err);
        }
      }
    },

    apiRequest: async ({ playwright }, use, testInfo) => {
      const projectName = String(testInfo.project.name || '');
      const baseURLFromProject = testInfo.project.use?.baseURL as string | undefined;

      const baseURL =
        process.env.API_BASE_URL ||
        process.env.CONTROL_TOWER_BASE_URL ||
        (projectName.includes('api') ? baseURLFromProject : undefined) ||
        (process.env.CONTROL_TOWER_PORT ? `http://localhost:${process.env.CONTROL_TOWER_PORT}` : undefined) ||
        'http://localhost:4000';

      const ctx = await playwright.request.newContext({ baseURL });
      try {
        await use(ctx);
      } finally {
        await ctx.dispose();
      }
    },

    api: async ({ apiRequest }, use) => {
      await use(createApi({ apiRequest } as CreateContext));
    },

    cleanup: async ({ apiRequest }, use) => {
      await use(createCleanup({ apiRequest } as CreateContext));
    },

    ui: async ({ page }, use) => {
      await use(createUi({ page } as CreateContext));
    },

    auth: async ({ api, ui }, use) => {
      await use(createAuth({ api, ui } as CreateContext & { api: ApiPort; ui: UiPort }));
    },

    /**
     * TUI fixture for terminal user interface testing.
     * Automatically stops the TUI application after the test completes.
     */
    tui: async ({}, use) => {
      const tuiAdapter = createTui?.();

      await use(tuiAdapter);

      // Cleanup: stop the TUI if it's running
      if (tuiAdapter?.isRunning?.()) {
        try {
          await tuiAdapter.stop();
        } catch (error) {
          console.warn('Error stopping TUI adapter:', error);
        }
      }
    },
  });
}

export { base as baseTest };
export type { TuiConfig };

import { test as base } from 'playwright-bdd';
import { expect } from '@playwright/test';
import type { APIRequestContext, Page, PlaywrightTestArgs, PlaywrightWorkerArgs } from '@playwright/test';
import { initWorld, type World } from './world';
import { resolveApiRequestTarget } from './network';
import { resolveApiBaseUrl } from './targets';
import { buildApiLoginRequest, extractToken } from './auth/api-login';
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

/**
 * Callback type for obtaining admin auth headers for cleanup operations.
 * Consumers can provide their own implementation (e.g., Keycloak, Auth0, Okta)
 * via the `getCleanupAuth` option in createBddTest().
 */
export type CleanupAuthProvider = (request: APIRequestContext) => Promise<Record<string, string>>;

/**
 * Default cleanup auth: attempts a form-based login to the API.
 *
 * Uses the "admin" role credentials (AUTH_ADMIN_USERNAME / AUTH_ADMIN_PASSWORD,
 * or DEFAULT_ADMIN_*) and the same API_AUTH_* settings as the API login steps.
 *
 * If a static CLEANUP_AUTH_TOKEN is set, uses that directly (no login needed).
 * If credentials are not configured, returns empty headers (cleanup runs unauthenticated).
 */
async function defaultGetAdminHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  // Fast path: reuse cached token
  if (cachedAdminToken) {
    return { Authorization: `Bearer ${cachedAdminToken}` };
  }

  // Static token override -- no login required
  const staticToken = process.env.CLEANUP_AUTH_TOKEN;
  if (staticToken) {
    cachedAdminToken = staticToken;
    return { Authorization: `Bearer ${staticToken}` };
  }

  const username =
    process.env.AUTH_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.AUTH_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD;

  if (!username || !password) {
    // No credentials configured -- cleanup runs unauthenticated.
    return {};
  }

  // Same settings as the API login steps (API_AUTH_LOGIN_PATH, API_AUTH_BODY, ...).
  const req = buildApiLoginRequest({ username, password });
  const resp = await request.post(req.path, {
    headers: { Accept: 'application/json' },
    ...(req.body === 'json' ? { data: req.fields } : { form: req.fields }),
  });

  if (!resp.ok()) {
    console.warn(`cleanup auth failed: ${resp.status()} ${resp.statusText()}`);
    cachedAdminToken = undefined;
    return {};
  }

  const json = await resp.json().catch(() => undefined);
  const token = extractToken(json);
  if (token) {
    cachedAdminToken = token;
    return { Authorization: `Bearer ${token}` };
  }

  // Cookie session: the request context now carries it.
  if (resp.headers()['set-cookie']) return {};

  console.warn('cleanup auth: no token in login response (set API_AUTH_TOKEN_PATH)');
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
  /**
   * Build the auth adapter. `ui` is available to UI login methods once a step
   * requests the `ui` fixture; API login never starts a browser.
   */
  createAuth?: (ctx: CreateContext & { api: ApiPort; ui: UiPort }) => AuthPort;
  createCleanup?: (ctx: CreateContext) => CleanupPort;
  /**
   * Custom auth provider for cleanup operations.
   * Return a record of headers (e.g., { Authorization: 'Bearer ...' }) to
   * authenticate cleanup API calls.
   *
   * Use this to integrate with any auth provider (Keycloak, Auth0, Okta, etc.)
   * without coupling the framework to a specific identity provider.
   *
   * If not provided, the default provider attempts a form-based login using
   * DEFAULT_ADMIN_USERNAME / DEFAULT_ADMIN_PASSWORD env vars, or uses
   * CLEANUP_AUTH_TOKEN if set. If no credentials are configured, cleanup
   * runs unauthenticated.
   */
  getCleanupAuth?: CleanupAuthProvider;
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

/**
 * A UiPort that forwards to the scenario's real UI adapter once a step has
 * requested the `ui` fixture. Used so `auth` doesn't force a browser to start.
 */
function lazyUi(binding: { current?: UiPort }): UiPort {
  return new Proxy({} as UiPort, {
    get(_target, prop) {
      const ui = binding.current as any;
      if (!ui) {
        if (prop === 'then') return undefined; // not a thenable
        throw new Error(
          'UI login needs the browser: add `ui` to the step\'s fixtures, e.g. ' +
            "When('...', async ({ auth, ui, world }) => auth.uiLoginAs(world, 'admin')).",
        );
      }
      const value = ui[prop];
      return typeof value === 'function' ? value.bind(ui) : value;
    },
    has(_target, prop) {
      return binding.current ? prop in (binding.current as object) : false;
    },
  });
}

export function createBddTest(options: CreateBddTestOptions = {}) {
  const {
    createApi = ({ apiRequest }) => new PlaywrightApiAdapter(apiRequest),
    createUi = ({ page }) => new PlaywrightUiAdapter(page),
    createAuth = ({ api, ui }) => new UniversalAuthAdapter({ api, ui }),
    createCleanup = () => new DefaultCleanupAdapter(),
    getCleanupAuth = defaultGetAdminHeaders,
    createTui,
    worldFactory = initWorld,
  } = options;

  const test = base.extend<{
    world: World;
    api: ApiPort;
    ui: UiPort;
    auth: AuthPort;
    cleanup: CleanupPort;
    tui: TuiPort | undefined;
    apiRequest: APIRequestContext;
    uiBinding: { current?: UiPort };
  }>({
    // Lets `auth` reach the UI adapter without depending on `page`, so API-only
    // scenarios that log in never start a browser.
    uiBinding: async ({}, use) => {
      await use({});
    },

    world: async ({ apiRequest }, use) => {
      const w = worldFactory();
      await use(w);

      if (w.skipCleanup) return;
      if (!w.cleanup.length) return;

      for (const item of [...w.cleanup].reverse()) {
        const adminHeaders = await getCleanupAuth(apiRequest);
        const headers = { ...adminHeaders, ...(item.headers || {}) };
        // Add Content-Type for JSON body
        if (item.body !== undefined) {
          headers['Content-Type'] = 'application/json';
        }
        try {
          const resp = await apiRequest.fetch(item.path, {
            method: item.method,
            headers,
            data: item.body,
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
      const baseURL = resolveApiBaseUrl({
        projectName: String(testInfo.project.name || ''),
        projectBaseURL: testInfo.project.use?.baseURL as string | undefined,
      });

      // Forces IPv4 for http *.localhost targets (kind ingress); see network.ts.
      const ctx = await playwright.request.newContext(resolveApiRequestTarget(baseURL));
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

    ui: async ({ page, uiBinding }, use) => {
      const ui = createUi({ page } as CreateContext);
      uiBinding.current = ui;
      await use(ui);
    },

    auth: async ({ api, apiRequest, uiBinding }, use) => {
      await use(createAuth({ api, apiRequest, ui: lazyUi(uiBinding) } as CreateContext & { api: ApiPort; ui: UiPort }));
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

  return { test, expect };
}

export { base as baseTest };
export type { TuiConfig };

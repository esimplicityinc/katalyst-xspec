/**
 * Fetch Intercept Auth Adapter
 *
 * Provides UI authentication by intercepting fetch requests and injecting headers.
 * Useful for testing UIs that communicate with APIs using fetch.
 */

import type { Page } from '@playwright/test';

export interface FetchInterceptAuthData {
  userId: string;
  tenantId?: string;
  roles: string[];
  token?: string;
}

export interface FetchInterceptConfig {
  /**
   * URL pattern to match for header injection.
   * If not provided, headers are added to all fetch requests.
   */
  urlPattern?: string | RegExp;

  /**
   * Headers to inject. Can be static values or functions that receive auth data.
   */
  headers: Record<string, string | ((data: FetchInterceptAuthData) => string)>;

  /**
   * Key in localStorage to store auth data for UI components to read.
   */
  localStorageKey?: string;
}

/**
 * Default configuration for bypass auth mode.
 */
export const defaultBypassConfig: FetchInterceptConfig = {
  urlPattern: '/api/',
  headers: {
    'x-user-id': (data) => data.userId,
    'x-tenant-id': (data) => data.tenantId || '',
    'x-user-roles': (data) => data.roles.join(','),
  },
  localStorageKey: 'mockAuth',
};

/**
 * Default configuration for bearer token auth.
 */
export const defaultBearerConfig: FetchInterceptConfig = {
  urlPattern: '/api/',
  headers: {
    Authorization: (data) => `Bearer ${data.token || ''}`,
  },
};

/**
 * Set up fetch interception on a page.
 *
 * @param page - Playwright page
 * @param authData - Authentication data to inject
 * @param config - Configuration for interception
 */
export async function setupFetchIntercept(
  page: Page,
  authData: FetchInterceptAuthData,
  config: FetchInterceptConfig = defaultBypassConfig
): Promise<void> {
  // Build static headers from config
  const staticHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.headers)) {
    staticHeaders[key] = typeof value === 'function' ? value(authData) : value;
  }

  // Filter out empty values
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(staticHeaders)) {
    if (value) {
      headers[key] = value;
    }
  }

  const urlPattern = config.urlPattern instanceof RegExp
    ? config.urlPattern.source
    : config.urlPattern || '';

  await page.addInitScript(
    (params: { authData: FetchInterceptAuthData; headers: Record<string, string>; urlPattern: string; localStorageKey?: string }) => {
      // Store auth data in localStorage if key is provided
      if (params.localStorageKey) {
        localStorage.setItem(params.localStorageKey, JSON.stringify(params.authData));
      }

      // Intercept fetch
      const originalFetch = window.fetch;
      window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;

        // Check if URL matches pattern
        const shouldIntercept = !params.urlPattern || url.includes(params.urlPattern);

        if (shouldIntercept) {
          const modifiedInit: RequestInit = init || {};
          modifiedInit.headers = {
            ...(modifiedInit.headers || {}),
            ...params.headers,
          };
          return originalFetch.call(this, input, modifiedInit);
        }

        return originalFetch.call(this, input, init);
      };
    },
    { authData, headers, urlPattern, localStorageKey: config.localStorageKey }
  );
}

/**
 * Clear fetch interception setup (by reloading the page).
 * Note: There's no clean way to remove addInitScript, so we reload.
 */
export async function clearFetchIntercept(page: Page): Promise<void> {
  await page.reload();
}

/**
 * Helper to set up bypass auth for a page.
 */
export async function setupBypassAuth(
  page: Page,
  userId: string,
  roles: string[],
  tenantId?: string
): Promise<void> {
  await setupFetchIntercept(page, { userId, roles, tenantId }, defaultBypassConfig);
}

/**
 * Helper to set up bearer token auth for a page.
 */
export async function setupBearerAuth(page: Page, token: string): Promise<void> {
  await setupFetchIntercept(
    page,
    { userId: '', roles: [], token },
    defaultBearerConfig
  );
}

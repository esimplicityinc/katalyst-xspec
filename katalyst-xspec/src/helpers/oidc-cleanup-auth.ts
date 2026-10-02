import type { APIRequestContext } from '@playwright/test';
import type { CleanupAuthProvider } from '../fixtures';

/**
 * Configuration for OIDC-based cleanup authentication.
 *
 * Reads from env vars by default:
 * - OIDC_TOKEN_URL: Full token endpoint URL (required)
 * - OIDC_CLIENT_ID: OAuth2 client ID (required)
 * - OIDC_CLIENT_SECRET: OAuth2 client secret (optional, for confidential clients)
 * - OIDC_GRANT_TYPE: Grant type (default: 'client_credentials')
 * - OIDC_SCOPE: Requested scopes (optional)
 * - OIDC_USERNAME: Username for password grant (optional)
 * - OIDC_PASSWORD: Password for password grant (optional)
 * - OIDC_EXTRA_HEADERS: JSON object of additional headers to include (optional)
 */
export interface OidcCleanupAuthConfig {
  /** Full URL to the OIDC token endpoint. */
  tokenUrl?: string;
  /** OAuth2 client ID. */
  clientId?: string;
  /** OAuth2 client secret (for confidential clients). */
  clientSecret?: string;
  /** Grant type. Defaults to 'client_credentials'. */
  grantType?: string;
  /** Requested scopes (space-separated). */
  scope?: string;
  /** Username for 'password' grant type. */
  username?: string;
  /** Password for 'password' grant type. */
  password?: string;
  /**
   * Additional headers to include in cleanup API requests
   * (e.g., { 'x-user-roles': 'admin' }).
   */
  extraHeaders?: Record<string, string>;
}

let cachedOidcToken: string | undefined;
let cachedOidcHeaders: Record<string, string> | undefined;

/**
 * Creates an OIDC-based cleanup auth provider.
 *
 * Works with any OIDC-compliant provider (Keycloak, Auth0, Okta, Azure AD, etc.)
 * by configuring the token endpoint URL and client credentials.
 *
 * @example Keycloak with password grant:
 * ```typescript
 * import { createBddTest, createOidcCleanupAuth } from '@esimplicityinc/katalyst-xspec';
 *
 * // Set env vars: OIDC_TOKEN_URL, OIDC_CLIENT_ID, OIDC_USERNAME, OIDC_PASSWORD
 * const test = createBddTest({
 *   getCleanupAuth: createOidcCleanupAuth({
 *     grantType: 'password',
 *     extraHeaders: { 'x-user-roles': 'admin' },
 *   }),
 * });
 * ```
 *
 * @example Auth0 with client_credentials grant:
 * ```typescript
 * const test = createBddTest({
 *   getCleanupAuth: createOidcCleanupAuth({
 *     tokenUrl: 'https://your-tenant.auth0.com/oauth/token',
 *     clientId: 'your-client-id',
 *     clientSecret: 'your-secret',
 *     scope: 'delete:resources',
 *   }),
 * });
 * ```
 */
export function createOidcCleanupAuth(config: OidcCleanupAuthConfig = {}): CleanupAuthProvider {
  return async (_request: APIRequestContext): Promise<Record<string, string>> => {
    if (cachedOidcToken && cachedOidcHeaders) {
      return cachedOidcHeaders;
    }

    const tokenUrl = config.tokenUrl || process.env.OIDC_TOKEN_URL;
    const clientId = config.clientId || process.env.OIDC_CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.OIDC_CLIENT_SECRET;
    const grantType = config.grantType || process.env.OIDC_GRANT_TYPE || 'client_credentials';
    const scope = config.scope || process.env.OIDC_SCOPE;
    const username = config.username || process.env.OIDC_USERNAME;
    const password = config.password || process.env.OIDC_PASSWORD;

    if (!tokenUrl || !clientId) {
      console.warn('OIDC cleanup auth skipped: OIDC_TOKEN_URL and OIDC_CLIENT_ID are required');
      return {};
    }

    const params: Record<string, string> = {
      client_id: clientId,
      grant_type: grantType,
    };

    if (clientSecret) params.client_secret = clientSecret;
    if (scope) params.scope = scope;
    if (username) params.username = username;
    if (password) params.password = password;

    try {
      const resp = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      });

      if (!resp.ok) {
        console.warn(`OIDC cleanup auth failed: ${resp.status} ${resp.statusText}`);
        cachedOidcToken = undefined;
        cachedOidcHeaders = undefined;
        return {};
      }

      const json = (await resp.json()) as any;
      const token = json?.access_token;
      if (typeof token === 'string' && token) {
        cachedOidcToken = token;

        // Build headers: Authorization + any extra headers from config or env
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };

        // Merge extra headers from config
        if (config.extraHeaders) {
          Object.assign(headers, config.extraHeaders);
        }

        // Merge extra headers from env (JSON object)
        const envHeaders = process.env.OIDC_EXTRA_HEADERS;
        if (envHeaders) {
          try {
            const parsed = JSON.parse(envHeaders);
            if (parsed && typeof parsed === 'object') {
              Object.assign(headers, parsed);
            }
          } catch {
            // ignore invalid JSON
          }
        }

        cachedOidcHeaders = headers;
        return headers;
      }
    } catch (err) {
      console.warn('OIDC cleanup auth error:', err);
    }

    cachedOidcToken = undefined;
    cachedOidcHeaders = undefined;
    return {};
  };
}

/**
 * Reset the cached OIDC token (useful for testing or when tokens expire).
 */
export function resetOidcCleanupAuth(): void {
  cachedOidcToken = undefined;
  cachedOidcHeaders = undefined;
}

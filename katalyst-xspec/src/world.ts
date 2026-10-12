import type { APIResponse } from '@playwright/test';

export type CleanupItem = {
  method: 'DELETE' | 'POST' | 'PATCH' | 'PUT';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
};

/**
 * Per-request API auth, set by logins whose headers can't be fixed up front
 * (OIDC: refreshed tokens and DPoP proofs). The API steps call it for every
 * request; custom steps that send requests themselves should too.
 */
export interface ApiRequestAuth {
  /** Headers for one request. `url` may be a path relative to the API base URL. */
  headers(method: string, url: string): Promise<Record<string, string>>;
  /** Called with each response; return true to retry the request once (e.g. a new DPoP nonce). */
  afterResponse?(url: string, status: number, headers: Record<string, string>): boolean;
  /**
   * Whether an Authorization header value is this login's token (current or
   * earlier). Requests carrying it get `headers()` applied automatically.
   */
  matches?(authorization: string): boolean;
}

export type World = {
  vars: Record<string, string>;
  headers: Record<string, string>;
  cleanup: CleanupItem[];
  skipCleanup?: boolean;
  apiAuth?: ApiRequestAuth;
  /** Validated ID token claims from the last OIDC login. */
  idTokenClaims?: Record<string, unknown>;

  lastResponse?: APIResponse;
  lastStatus?: number;
  lastText?: string;
  lastJson?: unknown;
  lastHeaders?: Record<string, string>;
  lastContentType?: string;
};

export function initWorld(): World {
  return {
    vars: {},
    headers: {},
    cleanup: [],
  };
}

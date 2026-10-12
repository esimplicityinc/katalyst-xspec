/** Turns provider and openid-client errors into messages that name the setting to fix. */
import { roleEnvKeys, roleEnvPrefix } from '../credentials';
import type { OidcSettings } from './settings';

const withCause = (message: string, cause: unknown): Error => Object.assign(new Error(message), { cause });

type ProviderError = { error?: string; description?: string; status?: number };

function providerError(err: unknown): ProviderError | undefined {
  const e = err as {
    error?: unknown;
    error_description?: unknown;
    status?: unknown;
    cause?: unknown;
    name?: string;
  };
  if (!e || typeof e !== 'object') return undefined;
  if (typeof e.error === 'string') {
    return { error: e.error, description: typeof e.error_description === 'string' ? e.error_description : undefined, status: Number(e.status) || undefined };
  }
  // WWW-Authenticate challenge (e.g. 401 on the token endpoint)
  if (Array.isArray(e.cause)) {
    const params = (e.cause[0] as { parameters?: Record<string, string> } | undefined)?.parameters;
    if (params?.error) return { error: params.error, description: params.error_description, status: Number(e.status) || undefined };
  }
  return undefined;
}

export function oidcHint(settings: OidcSettings, error: string | undefined, status: number | undefined, description = ''): string {
  const prefix = roleEnvPrefix(settings.role);
  const keys = roleEnvKeys(settings.role);
  const clientSettings =
    settings.clientAuth === 'private_key_jwt'
      ? `OIDC_CLIENT_ID / OIDC_CLIENT_PRIVATE_KEY / OIDC_CLIENT_KEY_ID (or ${prefix}_CLIENT_*), and that the client's registered key matches`
      : settings.clientAuth === 'tls_client_auth'
        ? 'OIDC_CLIENT_ID and the client certificate (OIDC_TLS_CERT / OIDC_TLS_KEY or OIDC_TLS_PFX)'
        : `OIDC_CLIENT_ID / OIDC_CLIENT_SECRET (or ${prefix}_CLIENT_*), and OIDC_CLIENT_AUTH`;
  // Keycloak reports a bad client secret as 401 unauthorized_client rather than invalid_client.
  if (error === 'invalid_client' || (error === 'unauthorized_client' && (status === 401 || /invalid client|client authentication/i.test(description)))) {
    return `Check ${clientSettings}.`;
  }
  if (error === 'unauthorized_client' || error === 'unsupported_grant_type') {
    return (
      `The client must allow the "${settings.grantType}" grant (Keycloak: "Direct access grants" for password, ` +
      '"Service accounts" for client_credentials, "Standard flow" for authorization_code), or change OIDC_GRANT_TYPE.'
    );
  }
  if (error === 'invalid_scope') return 'Check OIDC_SCOPE.';
  if ((error === 'invalid_dpop_proof' || error === 'use_dpop_nonce') && !settings.dpop) {
    return 'The client requires DPoP-bound tokens: set OIDC_DPOP=true.';
  }
  if (error === 'invalid_dpop_proof' || error === 'use_dpop_nonce') return 'The provider rejected the DPoP proof. Check OIDC_DPOP_ALG, or set OIDC_DPOP=false.';
  if (error === 'invalid_request' && /redirect/i.test(description)) return 'Check OIDC_REDIRECT_URI: it must be registered for the client.';
  if (error === 'invalid_grant' && settings.grantType === 'authorization_code') {
    return 'The authorization code was rejected. Check OIDC_REDIRECT_URI and the client settings.';
  }
  if (settings.grantType === 'client_credentials') return `Check ${clientSettings}.`;
  return `Check ${keys.username} / ${keys.password}, and ${clientSettings}.`;
}

/** A clear Error for a failed OIDC step. `action` is e.g. `POST <token url>` or `discovery`. */
export function oidcLoginError(settings: OidcSettings, action: string, err: unknown): Error {
  const head = `OIDC login as "${settings.role}" failed`;
  const pe = providerError(err);
  if (pe) {
    const body = JSON.stringify({ error: pe.error, ...(pe.description ? { error_description: pe.description } : {}) });
    const status = pe.status ? ` returned ${pe.status}` : '';
    return withCause(`${head}: ${action}${status}.\nResponse: ${body}\n${oidcHint(settings, pe.error, pe.status, pe.description)}`, err);
  }
  const message = (err as Error)?.message || String(err);
  const code = (err as { code?: string })?.code;
  if (code === 'OAUTH_JWT_CLAIM_COMPARISON_FAILED' && /iss/.test(message)) {
    return withCause(`${head}: the ID token's issuer doesn't match OIDC_ISSUER (${settings.issuer}). Set OIDC_ISSUER to the provider's exact issuer URL.`, err);
  }
  if (code === 'OAUTH_JWT_CLAIM_COMPARISON_FAILED' || code === 'OAUTH_INVALID_RESPONSE' || /signature/i.test(message)) {
    return withCause(`${head}: ${action}: the ID token didn't validate (${message}). Set OIDC_VERIFY_ID_TOKEN=false to skip signature checks.`, err);
  }
  return withCause(`${head}: ${action}: ${message}`, err);
}

export function discoveryError(settings: OidcSettings, err: unknown): Error {
  const message = (err as Error)?.message || String(err);
  const wellKnown = `${settings.issuer?.replace(/\/+$/, '')}/.well-known/openid-configuration`;
  return withCause(`OIDC discovery failed: GET ${wellKnown}: ${message}. Check OIDC_ISSUER, or set OIDC_TOKEN_URL.`, err);
}
